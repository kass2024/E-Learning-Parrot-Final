#!/usr/bin/env python3
"""Fix nginx hash bucket, restart edge, seed admin login."""
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


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 600) -> int:
    print(f"\n$ {cmd}", flush=True)
    _, stdout, _ = client.exec_command(cmd, get_pty=True, timeout=timeout)
    ch = stdout.channel
    while True:
        while ch.recv_ready():
            sys.stdout.buffer.write(ch.recv(8192))
            sys.stdout.buffer.flush()
        while ch.recv_stderr_ready():
            sys.stdout.buffer.write(ch.recv_stderr(8192))
            sys.stdout.buffer.flush()
        if ch.exit_status_ready() and not ch.recv_ready() and not ch.recv_stderr_ready():
            break
        time.sleep(0.15)
    code = ch.recv_exit_status()
    print(f"\n[exit {code}]", flush=True)
    return code


def main() -> int:
    cfg = load_env(DEPLOY / "vps.env")
    user, host = cfg["VPS_HOST"].split("@", 1)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=cfg["VPS_PASSWORD"], timeout=45)

    sftp = client.open_sftp()
    sftp.put(str(DEPLOY / "nginx" / "edge.conf"), "/opt/e-learning-parrot-final/deploy/nginx/edge.conf")
    sftp.close()

    run(
        client,
        "cd /opt/e-learning-parrot-final/deploy && "
        "docker compose -p pgsa -f docker-compose.prod.yml --env-file .env.production up -d nginx",
    )
    time.sleep(3)
    run(client, "docker ps --filter name=pgsa_nginx --format '{{.Names}} {{.Status}} {{.Ports}}'")
    run(client, "curl -sI -H 'Host: parrotglobalstudyacademy.ca' http://127.0.0.1:8094/ | head -15")
    run(client, "curl -sI -H 'Host: api.parrotglobalstudyacademy.ca' http://127.0.0.1:8094/up | head -15")
    run(client, "curl -sI https://parrotglobalstudyacademy.ca | head -15")
    run(client, "curl -sI https://api.parrotglobalstudyacademy.ca/up | head -15")

    # Correct artisan command for admin password
    run(
        client,
        "docker exec pgsa_backend php artisan users:reset-admin-password --no-interaction "
        "|| docker exec pgsa_backend php artisan users:reset-admin-password "
        "|| docker exec pgsa_backend php artisan list | grep -i reset",
        timeout=120,
    )
    run(
        client,
        "docker exec pgsa_backend php artisan tinker --execute=\""
        "echo App\\\\Models\\\\User::where('role','admin')->orWhere('email','like','%parrot%')->get(['id','email','role','name'])->toJson();"
        "\"",
        timeout=60,
    )
    print("\nFix complete.")
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
