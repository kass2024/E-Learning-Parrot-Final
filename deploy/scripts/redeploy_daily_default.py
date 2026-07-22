#!/usr/bin/env python3
"""Redeploy PGSA Daily-default fix without touching other VPS stacks."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import paramiko

ROOT = Path(r"c:\methode\water_level\E-Learning-Parrot-Final")
DEPLOY = ROOT / "deploy"


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
        time.sleep(0.2)
    code = ch.recv_exit_status()
    print(f"\n[exit {code}]", flush=True)
    return code


def main() -> int:
    cfg = load_env(DEPLOY / "vps.env")
    user, host = cfg["VPS_HOST"].split("@", 1)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=cfg["VPS_PASSWORD"], timeout=45)

    vps = "/opt/e-learning-parrot-final"
    sftp = client.open_sftp()
    uploads = [
        (ROOT / "E-learning-parrot-backend" / "routes" / "api.php", f"{vps}/E-learning-parrot-backend/routes/api.php"),
        (ROOT / "E-learning-parrot-backend" / "docker" / "entrypoint.sh", f"{vps}/E-learning-parrot-backend/docker/entrypoint.sh"),
        (ROOT / "E-learning-parrot-frontend" / "src" / "api" / "axios.ts", f"{vps}/E-learning-parrot-frontend/src/api/axios.ts"),
        (DEPLOY / ".env.production", f"{vps}/deploy/.env.production"),
        (DEPLOY / "nginx" / "edge.conf", f"{vps}/deploy/nginx/edge.conf"),
    ]
    for local, remote in uploads:
        print(f"upload {local.name} -> {remote}", flush=True)
        sftp.put(str(local), remote)
    sftp.close()

    # Rebuild only PGSA images/services
    code = run(
        client,
        f"cd {vps}/deploy && "
        "docker compose -p pgsa -f docker-compose.prod.yml --env-file .env.production "
        "up -d --build backend frontend scheduler nginx "
        ">/tmp/pgsa-daily-redeploy.log 2>&1; echo EXIT:$? >> /tmp/pgsa-daily-redeploy.log; "
        "tail -n 50 /tmp/pgsa-daily-redeploy.log",
        timeout=7200,
    )
    if code != 0:
        return code

    time.sleep(8)
    run(client, "docker ps --filter name=pgsa_ --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
    run(client, "docker exec pgsa_backend php artisan route:list --path=meeting-settings")
    run(client, "docker exec pgsa_backend sh -c 'grep -E \"^DAILY_(INTEGRATION_ENABLED|DOMAIN)=\" .env'")
    run(
        client,
        "curl -s -w '\\nHTTP %{http_code}\\n' -X PATCH "
        "'https://api.parrotglobalstudyacademy.ca/api/admin/platform/meeting-settings"
        "?user_email=infos@parrotglobalstudyacademy.ca' "
        "-H 'Content-Type: application/json' -H 'Accept: application/json' "
        "-d '{\"main_platform_meeting_provider\":\"daily\","
        "\"user_email\":\"infos@parrotglobalstudyacademy.ca\"}'",
    )
    run(
        client,
        "docker exec pgsa_backend php artisan tinker --execute=\""
        "echo 'provider='.app(App\\\\Services\\\\PlatformSettingsService::class)"
        "->mainPlatformMeetingProvider()->value.' configured='."
        "(app(App\\\\Services\\\\DailyApiService::class)->isConfigured()?'yes':'no');\""
    )
    run(client, "docker ps --filter name=parrot_nginx --format '{{.Names}} {{.Status}} {{.Ports}}'")
    print("\nDaily default redeploy complete.", flush=True)
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
