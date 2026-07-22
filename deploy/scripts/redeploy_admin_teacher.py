#!/usr/bin/env python3
"""Deploy admin-as-teacher fix and assign hub courses to platform admin."""
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
    uploads = [
        (
            ROOT / "E-learning-parrot-backend" / "app" / "Http" / "Controllers" / "Api" / "CourseController.php",
            f"{vps}/E-learning-parrot-backend/app/Http/Controllers/Api/CourseController.php",
        ),
        (
            ROOT
            / "E-learning-parrot-backend"
            / "app"
            / "Http"
            / "Controllers"
            / "Api"
            / "InstructorDashboardController.php",
            f"{vps}/E-learning-parrot-backend/app/Http/Controllers/Api/InstructorDashboardController.php",
        ),
        (
            ROOT / "E-learning-parrot-backend" / "app" / "Support" / "InstructorLookup.php",
            f"{vps}/E-learning-parrot-backend/app/Support/InstructorLookup.php",
        ),
        (
            ROOT / "E-learning-parrot-frontend" / "src" / "pages" / "dashboard" / "CourseManagement.tsx",
            f"{vps}/E-learning-parrot-frontend/src/pages/dashboard/CourseManagement.tsx",
        ),
    ]
    sftp = client.open_sftp()
    for local, remote in uploads:
        print(f"upload {local.name}", flush=True)
        sftp.put(str(local), remote)
    sftp.close()

    code = run(
        client,
        f"cd {vps}/deploy && "
        "docker compose -p pgsa -f docker-compose.prod.yml --env-file .env.production "
        "up -d --build backend frontend scheduler "
        ">/tmp/pgsa-admin-teacher.log 2>&1; echo EXIT:$? >> /tmp/pgsa-admin-teacher.log; "
        "tail -n 40 /tmp/pgsa-admin-teacher.log",
        timeout=7200,
    )
    if code != 0:
        return code

    time.sleep(12)
    run(client, "docker ps --filter name=pgsa_ --format 'table {{.Names}}\t{{.Status}}'")
    run(
        client,
        "docker exec pgsa_backend php artisan tinker --execute=\""
        "\\$admin=App\\\\Models\\\\User::where('email','infos@parrotglobalstudyacademy.ca')->first();"
        "echo 'teachable='.(App\\\\Support\\\\InstructorLookup::isTeachable(\\$admin)?'yes':'no').PHP_EOL;"
        "foreach(App\\\\Models\\\\Course::query()->whereNull('platform_institution_id')->get() as \\$c){"
        "  \\$c->instructors()->sync([\\$admin->id]);"
        "  if(strcasecmp(trim((string)\\$c->status),'Pending')===0){\\$c->status='Active';\\$c->save();}"
        "  echo 'assigned '.\\$c->id.' '.\\$c->title.PHP_EOL;"
        "}"
        "echo 'count='.\\$admin->fresh()->assignedCourses()->count();"
        "\"",
    )
    run(
        client,
        "curl -s -w '\\nHTTP %{http_code}\\n' -X POST "
        "-H 'Host: api.parrotglobalstudyacademy.ca' "
        "-H 'Content-Type: application/json' -H 'Accept: application/json' "
        "'http://127.0.0.1:8094/api/admin/courses/1/assign?user_email=infos@parrotglobalstudyacademy.ca' "
        "-d '{\"user_id\":1,\"user_email\":\"infos@parrotglobalstudyacademy.ca\"}'",
    )
    run(
        client,
        "curl -s -H 'Host: api.parrotglobalstudyacademy.ca' "
        "'http://127.0.0.1:8094/api/admin/instructor-assigned-courses"
        "?email=infos@parrotglobalstudyacademy.ca&user_email=infos@parrotglobalstudyacademy.ca' | head -c 600; echo",
    )
    run(client, "docker ps --filter name=parrot_nginx --format '{{.Names}} {{.Status}}'")
    print("\nAdmin teacher deploy complete.", flush=True)
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
