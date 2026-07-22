#!/usr/bin/env python3
"""Diagnose + fix meeting-settings 404 (API host routing / routes / Daily default)."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import paramiko

ROOT = Path(r"c:\methode\water_level\E-Learning-Parrot-Final")
DEPLOY = ROOT / "deploy"

EDGE = """# Edge reverse proxy — Apache on the host forwards 80/443 here (127.0.0.1:8094)
# Isolated from Xander (8090), XanderTech (8092), F&R (8093).

server_names_hash_bucket_size 128;

upstream pgsa_frontend {
    server frontend:80;
}

upstream pgsa_backend {
    server backend:80;
}

server {
    listen 80 default_server;
    server_name parrotglobalstudyacademy.ca www.parrotglobalstudyacademy.ca _;

    location / {
        proxy_pass http://pgsa_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.parrotglobalstudyacademy.ca;

    client_max_body_size 100M;

    location / {
        proxy_pass http://pgsa_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600;
    }
}
"""


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
        time.sleep(0.1)
    code = ch.recv_exit_status()
    print(f"\n[exit {code}]", flush=True)
    return code


def main() -> int:
    cfg = load_env(DEPLOY / "vps.env")
    user, host = cfg["VPS_HOST"].split("@", 1)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        host,
        username=user,
        password=cfg["VPS_PASSWORD"],
        timeout=90,
        banner_timeout=90,
        auth_timeout=90,
    )

    run(client, "docker ps --filter name=pgsa --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

    # Write clean LF edge.conf
    local_edge = DEPLOY / "nginx" / "edge.conf"
    local_edge.write_text(EDGE.replace("\r\n", "\n"), encoding="utf-8", newline="\n")
    sftp = client.open_sftp()
    sftp.put(str(local_edge), "/opt/e-learning-parrot-final/deploy/nginx/edge.conf")
    # Ensure routes file has meeting-settings
    sftp.put(
        str(ROOT / "E-learning-parrot-backend" / "routes" / "api.php"),
        "/opt/e-learning-parrot-final/E-learning-parrot-backend/routes/api.php",
    )
    sftp.close()
    run(client, "sed -i 's/\\r$//' /opt/e-learning-parrot-final/deploy/nginx/edge.conf")

    # Healthy stack with correct names
    run(
        client,
        "cd /opt/e-learning-parrot-final/deploy && "
        "docker compose -p pgsa -f docker-compose.prod.yml --env-file .env.production "
        "up -d mysql backend frontend nginx scheduler",
        timeout=300,
    )
    time.sleep(8)

    # Copy routes into running backend (in case image is stale)
    run(
        client,
        "docker cp /opt/e-learning-parrot-final/E-learning-parrot-backend/routes/api.php "
        "pgsa_backend:/var/www/html/routes/api.php && "
        "docker exec pgsa_backend php artisan route:clear && "
        "docker exec pgsa_backend php artisan cache:clear && "
        "docker exec pgsa_backend php artisan route:list --path=meeting-settings",
    )

    # Recreate nginx to pick edge.conf
    run(
        client,
        "cd /opt/e-learning-parrot-final/deploy && "
        "docker compose -p pgsa -f docker-compose.prod.yml --env-file .env.production "
        "up -d --force-recreate --no-deps nginx",
        timeout=180,
    )
    time.sleep(4)

    run(client, "curl -sI -H 'Host: api.parrotglobalstudyacademy.ca' http://127.0.0.1:8094/up | head -12")
    run(client, "curl -sI -H 'Host: parrotglobalstudyacademy.ca' http://127.0.0.1:8094/ | head -10")

    # PATCH Daily via localhost and public HTTPS
    email = "infos@parrotglobalstudyacademy.ca"
    payload = (
        '{"main_platform_meeting_provider":"daily",'
        f'"user_email":"{email}"}}'
    )
    run(
        client,
        "curl -s -w '\\nHTTP %{http_code}\\n' -X PATCH "
        f"-H 'Host: api.parrotglobalstudyacademy.ca' "
        "-H 'Content-Type: application/json' -H 'Accept: application/json' "
        f"'http://127.0.0.1:8094/api/admin/platform/meeting-settings?user_email={email}' "
        f"-d '{payload}'",
    )
    run(
        client,
        "curl -s -w '\\nHTTP %{http_code}\\n' -X PUT "
        f"-H 'Host: api.parrotglobalstudyacademy.ca' "
        "-H 'Content-Type: application/json' -H 'Accept: application/json' "
        f"'http://127.0.0.1:8094/api/admin/platform/meeting-settings?user_email={email}' "
        f"-d '{payload}'",
    )
    run(
        client,
        "curl -s -w '\\nHTTP %{http_code}\\n' -X PATCH "
        f"'https://api.parrotglobalstudyacademy.ca/api/admin/platform/meeting-settings?user_email={email}' "
        "-H 'Content-Type: application/json' -H 'Accept: application/json' "
        f"-d '{payload}'",
    )
    run(
        client,
        "docker exec pgsa_backend php artisan tinker --execute=\""
        "echo app(App\\\\Services\\\\PlatformSettingsService::class)"
        "->mainPlatformMeetingProvider()->value;"
        "\"",
    )
    run(client, "docker ps --filter name=parrot_nginx --format '{{.Names}} {{.Status}} {{.Ports}}'")
    print("\nMeeting-settings fix deployed.", flush=True)
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
