#!/usr/bin/env python3
"""Upload admin-teacher PHP fixes to PGSA VPS, verify assign, leave other stacks alone."""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import paramiko

ROOT = Path(r"c:\methode\water_level\E-Learning-Parrot-Final")
DEPLOY = ROOT / "deploy"
BACKEND = ROOT / "E-learning-parrot-backend"
REMOTE_ROOT = "/opt/e-learning-parrot-final"

FILES = [
    (
        BACKEND / "app" / "Support" / "InstructorLookup.php",
        f"{REMOTE_ROOT}/E-learning-parrot-backend/app/Support/InstructorLookup.php",
        "/var/www/html/app/Support/InstructorLookup.php",
    ),
    (
        BACKEND / "app" / "Http" / "Controllers" / "Api" / "CourseController.php",
        f"{REMOTE_ROOT}/E-learning-parrot-backend/app/Http/Controllers/Api/CourseController.php",
        "/var/www/html/app/Http/Controllers/Api/CourseController.php",
    ),
    (
        BACKEND
        / "app"
        / "Http"
        / "Controllers"
        / "Api"
        / "InstructorDashboardController.php",
        f"{REMOTE_ROOT}/E-learning-parrot-backend/app/Http/Controllers/Api/InstructorDashboardController.php",
        "/var/www/html/app/Http/Controllers/Api/InstructorDashboardController.php",
    ),
]


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 300) -> tuple[int, str]:
    print(f"\n$ {cmd}", flush=True)
    _, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=timeout)
    ch = stdout.channel
    buf = bytearray()
    while True:
        while ch.recv_ready():
            chunk = ch.recv(8192)
            buf.extend(chunk)
            sys.stdout.buffer.write(chunk)
            sys.stdout.buffer.flush()
        while ch.recv_stderr_ready():
            chunk = ch.recv_stderr(8192)
            buf.extend(chunk)
            sys.stdout.buffer.write(chunk)
            sys.stdout.buffer.flush()
        if ch.exit_status_ready() and not ch.recv_ready() and not ch.recv_stderr_ready():
            break
        time.sleep(0.1)
    code = ch.recv_exit_status()
    print(f"\n[exit {code}]", flush=True)
    return code, buf.decode("utf-8", errors="replace")


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
    sftp = client.open_sftp()

    for local, remote_host, _ in FILES:
        print(f"upload {local.name} -> {remote_host}", flush=True)
        # ensure remote dir exists
        remote_dir = str(Path(remote_host).as_posix().rsplit("/", 1)[0])
        run(client, f"mkdir -p {remote_dir}")
        sftp.put(str(local), remote_host)

    sftp.close()

    for _, remote_host, container_path in FILES:
        run(
            client,
            f"docker cp {remote_host} pgsa_backend:{container_path}",
        )

    run(
        client,
        "docker exec pgsa_backend php artisan cache:clear && "
        "docker exec pgsa_backend php artisan route:clear && "
        "docker exec pgsa_backend sh -c 'kill -USR2 1 2>/dev/null || true'",
    )

    # Prove production message changed + teachable includes admin
    run(
        client,
        "docker exec pgsa_backend grep -n \"cannot be assigned as a course teacher\" "
        "/var/www/html/app/Http/Controllers/Api/CourseController.php | head -3",
    )
    run(
        client,
        "docker exec pgsa_backend grep -n \"TEACHABLE_ROLES\" "
        "/var/www/html/app/Support/InstructorLookup.php | head -5",
    )

    code, out = run(
        client,
        "docker exec pgsa_backend php artisan tinker --execute=\""
        "\\$admin=App\\\\Models\\\\User::where('email','infos@parrotglobalstudyacademy.ca')->first();"
        "echo 'admin_id='.\\$admin->id.' role='.\\$admin->role.' teachable='."
        "(App\\\\Support\\\\InstructorLookup::isTeachable(\\$admin)?'yes':'no').PHP_EOL;"
        "\\$c=App\\\\Models\\\\Course::query()->where('title','like','%DELF%')->first();"
        "if(!\\$c){\\$c=App\\\\Models\\\\Course::query()->whereNull('platform_institution_id')->first();}"
        "echo 'course_id='.\\$c->id.' title='.\\$c->title.PHP_EOL;"
        "echo json_encode(['course_id'=>\\$c->id,'user_id'=>\\$admin->id]);"
        "\"",
    )
    if code != 0:
        client.close()
        return code

    course_id = None
    user_id = None
    for line in out.splitlines():
        line = line.strip()
        if line.startswith("{") and "course_id" in line:
            try:
                payload = json.loads(line)
                course_id = payload.get("course_id")
                user_id = payload.get("user_id")
            except json.JSONDecodeError:
                pass
    if not course_id or not user_id:
        print("Could not resolve course/user ids", flush=True)
        client.close()
        return 1

    run(
        client,
        "curl -s -w '\\nHTTP %{http_code}\\n' -X POST "
        "-H 'Host: api.parrotglobalstudyacademy.ca' "
        "-H 'Content-Type: application/json' -H 'Accept: application/json' "
        f"'http://127.0.0.1:8094/api/admin/courses/{course_id}/assign"
        f"?user_email=infos@parrotglobalstudyacademy.ca' "
        f"-d '{{\"user_id\":{user_id},\"user_email\":\"infos@parrotglobalstudyacademy.ca\"}}'",
    )

    run(
        client,
        "curl -s -w '\\nHTTP %{http_code}\\n' -X POST "
        "-H 'Content-Type: application/json' -H 'Accept: application/json' "
        f"'https://api.parrotglobalstudyacademy.ca/api/admin/courses/{course_id}/assign"
        f"?user_email=infos@parrotglobalstudyacademy.ca' "
        f"-d '{{\"user_id\":{user_id},\"user_email\":\"infos@parrotglobalstudyacademy.ca\"}}'",
    )

    run(client, "docker ps --filter name=pgsa_ --format 'table {{.Names}}\t{{.Status}}'")
    run(client, "docker ps --filter name=parrot_nginx --format '{{.Names}} {{.Status}}'")
    print("\nAdmin-teacher deploy verified.", flush=True)
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
