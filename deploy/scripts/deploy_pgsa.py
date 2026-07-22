#!/usr/bin/env python3
"""
Deploy E-Learning-Parrot-Final to VPS without disturbing other projects.

- Path: /opt/e-learning-parrot-final (never /opt/e-learning-xander)
- Port: 127.0.0.1:8094 (never 8090/8091/8092/8093)
- Containers: pgsa_*
- Domains: parrotglobalstudyacademy.ca + api.parrotglobalstudyacademy.ca
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[2]
DEPLOY = ROOT / "deploy"
BACKEND = ROOT / "E-learning-parrot-backend"
FRONTEND = ROOT / "E-learning-parrot-frontend"
REPO = "https://github.com/kass2024/E-Learning-Parrot-Final.git"


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def parse_host(vps_host: str) -> tuple[str, str, int]:
    user, host = "root", vps_host
    port = 22
    if "@" in vps_host:
        user, host = vps_host.split("@", 1)
    if ":" in host and host.count(":") == 1:
        host, port_s = host.rsplit(":", 1)
        if port_s.isdigit():
            port = int(port_s)
    return user, host, port


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 7200) -> int:
    print(f"\n$ {cmd}", flush=True)
    _, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=timeout)
    channel = stdout.channel
    while True:
        while channel.recv_ready():
            sys.stdout.write(channel.recv(8192).decode("utf-8", errors="replace"))
            sys.stdout.flush()
        while channel.recv_stderr_ready():
            sys.stdout.write(channel.recv_stderr(8192).decode("utf-8", errors="replace"))
            sys.stdout.flush()
        if channel.exit_status_ready() and not channel.recv_ready() and not channel.recv_stderr_ready():
            break
        time.sleep(0.15)
    code = channel.recv_exit_status()
    if code != 0:
        print(f"\n[exit {code}]", flush=True)
    return code


def upload_file(client: paramiko.SSHClient, local: Path, remote: str) -> None:
    print(f"\n==> upload {local.name} -> {remote}", flush=True)
    sftp = client.open_sftp()
    try:
        remote_dir = os.path.dirname(remote)
        run(client, f"mkdir -p '{remote_dir}'")
        sftp.put(str(local), remote)
    finally:
        sftp.close()


def main() -> int:
    cfg = load_env(DEPLOY / "vps.env")
    user, host, port = parse_host(cfg["VPS_HOST"])
    password = cfg["VPS_PASSWORD"]
    vps_path = cfg.get("VPS_PATH", "/opt/e-learning-parrot-final")
    http_port = "8094"

    env_prod = DEPLOY / ".env.production"
    if not env_prod.exists():
        print("Missing deploy/.env.production", file=sys.stderr)
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=password, port=port, timeout=45)

    # Safety: never touch Xander path
    if "e-learning-xander" in vps_path or vps_path.rstrip("/") == "/opt/e-learning-xander":
        print("Refusing to deploy into Xander path", file=sys.stderr)
        return 2

    steps = [
        f"mkdir -p '{vps_path}'",
        f"if [ -d '{vps_path}/.git' ]; then cd '{vps_path}' && git fetch origin && git reset --hard origin/main; "
        f"else rm -rf '{vps_path}' && git clone {REPO} '{vps_path}'; fi",
        f"test ! -d /opt/e-learning-xander || echo 'Xander path still present (untouched)'",
        f"docker ps --format 'table {{{{.Names}}}}\\t{{{{.Ports}}}}' | head -30",
    ]
    for cmd in steps[:1]:
        if run(client, cmd) != 0:
            return 3

    # Clone / pull
    if run(client, steps[1], timeout=900) != 0:
        return 4

    upload_file(client, env_prod, f"{vps_path}/deploy/.env.production")
    upload_file(client, DEPLOY / "scripts" / "setup-apache-proxy.sh", f"{vps_path}/deploy/scripts/setup-apache-proxy.sh")
    upload_file(client, DEPLOY / "docker-compose.prod.yml", f"{vps_path}/deploy/docker-compose.prod.yml")
    upload_file(client, DEPLOY / "nginx" / "edge.conf", f"{vps_path}/deploy/nginx/edge.conf")

    compose = (
        f"cd '{vps_path}/deploy' && "
        f"docker compose -p pgsa -f docker-compose.prod.yml --env-file .env.production up -d --build"
    )
    if run(client, compose, timeout=7200) != 0:
        return 5

    # Wait for backend health-ish
    run(
        client,
        f"for i in 1 2 3 4 5 6 7 8 9 10; do "
        f"curl -sf -H 'Host: api.parrotglobalstudyacademy.ca' http://127.0.0.1:{http_port}/up && exit 0; "
        f"sleep 8; done; echo 'backend /up not ready yet'; exit 0",
        timeout=120,
    )

    # Seed platform users explicitly (idempotent)
    run(
        client,
        "docker exec pgsa_backend php artisan migrate --force 2>/dev/null || true; "
        "docker exec pgsa_backend php artisan db:seed --force 2>/dev/null || true; "
        "docker exec pgsa_backend php artisan platform:reset-admin-password --no-interaction 2>/dev/null || true",
        timeout=600,
    )

    # Apache proxy (new conf only)
    if run(
        client,
        f"chmod +x '{vps_path}/deploy/scripts/setup-apache-proxy.sh' && "
        f"PARROT_HTTP_PORT={http_port} bash '{vps_path}/deploy/scripts/setup-apache-proxy.sh'",
        timeout=120,
    ) != 0:
        return 6

    # SSL via certbot — only these domains
    run(
        client,
        "certbot --apache --non-interactive --agree-tos --email infos@parrotglobalstudyacademy.ca "
        "--redirect "
        "-d parrotglobalstudyacademy.ca "
        "-d www.parrotglobalstudyacademy.ca "
        "-d api.parrotglobalstudyacademy.ca "
        "|| certbot --apache --non-interactive --agree-tos --register-unsafely-without-email "
        "--redirect "
        "-d parrotglobalstudyacademy.ca "
        "-d www.parrotglobalstudyacademy.ca "
        "-d api.parrotglobalstudyacademy.ca",
        timeout=300,
    )

    # Verify
    run(client, "curl -sI https://parrotglobalstudyacademy.ca | head -15")
    run(client, "curl -sI https://api.parrotglobalstudyacademy.ca/up | head -15")
    run(client, "docker ps --filter name=pgsa_ --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
    run(client, "docker ps --filter name=parrot_ --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | head -10")

    client.close()
    print("\nDeploy finished.")
    print("Front: https://parrotglobalstudyacademy.ca")
    print("API:   https://api.parrotglobalstudyacademy.ca")
    print("Admin login email: infos@parrotglobalstudyacademy.ca")
    print("Admin password:    from SEED_PLATFORM_PASSWORD in deploy/.env.production")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
