#!/usr/bin/env python3
"""Finish PGSA deploy: compose up, apache, ssl, seed — log on remote."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import paramiko

DEPLOY = Path(r"c:\methode\water_level\E-Learning-Parrot-Final\deploy")


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 7200) -> int:
    print(f"\n$ {cmd}", flush=True)
    _, stdout, _ = client.exec_command(cmd, get_pty=True, timeout=timeout)
    channel = stdout.channel
    while True:
        while channel.recv_ready():
            sys.stdout.buffer.write(channel.recv(8192))
            sys.stdout.buffer.flush()
        while channel.recv_stderr_ready():
            sys.stdout.buffer.write(channel.recv_stderr(8192))
            sys.stdout.buffer.flush()
        if channel.exit_status_ready() and not channel.recv_ready() and not channel.recv_stderr_ready():
            break
        time.sleep(0.2)
    code = channel.recv_exit_status()
    print(f"\n[exit {code}]", flush=True)
    return code


def main() -> int:
    cfg = load_env(DEPLOY / "vps.env")
    user, host = cfg["VPS_HOST"].split("@", 1)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=cfg["VPS_PASSWORD"], timeout=45)

    vps = "/opt/e-learning-parrot-final"
    # Upload env again
    sftp = client.open_sftp()
    sftp.put(str(DEPLOY / ".env.production"), f"{vps}/deploy/.env.production")
    sftp.put(str(DEPLOY / "docker-compose.prod.yml"), f"{vps}/deploy/docker-compose.prod.yml")
    sftp.put(str(DEPLOY / "nginx" / "edge.conf"), f"{vps}/deploy/nginx/edge.conf")
    sftp.put(str(DEPLOY / "scripts" / "setup-apache-proxy.sh"), f"{vps}/deploy/scripts/setup-apache-proxy.sh")
    sftp.close()

    # Build/up with remote log to avoid stream issues
    compose = (
        f"cd {vps}/deploy && "
        f"docker compose -p pgsa -f docker-compose.prod.yml --env-file .env.production up -d --build "
        f">/tmp/pgsa-compose.log 2>&1; echo EXIT:$? >> /tmp/pgsa-compose.log"
    )
    if run(client, compose, timeout=7200) != 0:
        run(client, "tail -n 80 /tmp/pgsa-compose.log")
        return 5

    run(client, "tail -n 40 /tmp/pgsa-compose.log")
    run(client, "docker ps --filter name=pgsa_ --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

    # Wait for mysql/backend
    run(
        client,
        "for i in $(seq 1 20); do "
        "curl -sf -H 'Host: api.parrotglobalstudyacademy.ca' http://127.0.0.1:8094/up && echo UP_OK && exit 0; "
        "sleep 6; done; echo UP_WAIT; docker logs pgsa_backend --tail 40; exit 0",
        timeout=180,
    )

    run(
        client,
        "docker exec pgsa_backend php artisan migrate --force; "
        "docker exec pgsa_backend php artisan db:seed --force; "
        "docker exec pgsa_backend php artisan platform:reset-admin-password --no-interaction || true",
        timeout=600,
    )

    run(
        client,
        f"chmod +x {vps}/deploy/scripts/setup-apache-proxy.sh && "
        f"PARROT_HTTP_PORT=8094 bash {vps}/deploy/scripts/setup-apache-proxy.sh",
        timeout=120,
    )

    run(
        client,
        "certbot --apache --non-interactive --agree-tos --email infos@parrotglobalstudyacademy.ca "
        "--redirect -d parrotglobalstudyacademy.ca -d www.parrotglobalstudyacademy.ca "
        "-d api.parrotglobalstudyacademy.ca",
        timeout=300,
    )

    run(client, "curl -sI https://parrotglobalstudyacademy.ca | head -20")
    run(client, "curl -sI https://api.parrotglobalstudyacademy.ca/up | head -20")
    run(client, "docker ps --filter name=parrot_nginx --format '{{.Names}} {{.Ports}}'")
    run(client, "docker ps --filter name=pgsa_ --format '{{.Names}} {{.Status}} {{.Ports}}'")
    print("\nDeploy finished.")
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
