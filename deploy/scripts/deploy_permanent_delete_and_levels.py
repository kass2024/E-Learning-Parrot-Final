#!/usr/bin/env python3
"""Deploy permanent delete + Français signup levels to PGSA VPS."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import paramiko

ROOT = Path(r"c:\methode\water_level\E-Learning-Parrot-Final")
DEPLOY = ROOT / "deploy"
REMOTE = "/opt/e-learning-parrot-final"
BACKEND = ROOT / "E-learning-parrot-backend"
FRONTEND = ROOT / "E-learning-parrot-frontend"


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 3600) -> int:
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
        time.sleep(0.12)
    code = ch.recv_exit_status()
    print(f"\n[exit {code}]", flush=True)
    return code


def upload(sftp: paramiko.SFTPClient, client: paramiko.SSHClient, local: Path, remote: str) -> None:
    data = local.read_bytes().replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    run(client, f"mkdir -p {remote.rsplit('/', 1)[0]}", timeout=60)
    with sftp.file(remote, "wb") as fh:
        fh.write(data)
    print(f"uploaded {local.relative_to(ROOT)}", flush=True)


def main() -> int:
    cfg = load_env(DEPLOY / "vps.env")
    user, host = cfg["VPS_HOST"].split("@", 1)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        host,
        username=user,
        password=cfg["VPS_PASSWORD"],
        timeout=120,
        banner_timeout=120,
        auth_timeout=120,
    )
    sftp = client.open_sftp()

    uploads = [
        (BACKEND / "app" / "Support" / "HardDeleteUser.php", f"{REMOTE}/E-learning-parrot-backend/app/Support/HardDeleteUser.php"),
        (BACKEND / "app" / "Services" / "InstitutionSignupService.php", f"{REMOTE}/E-learning-parrot-backend/app/Services/InstitutionSignupService.php"),
        (BACKEND / "app" / "Services" / "DatabaseSchemaService.php", f"{REMOTE}/E-learning-parrot-backend/app/Services/DatabaseSchemaService.php"),
        (BACKEND / "app" / "Http" / "Controllers" / "Api" / "PlatformInstitutionController.php", f"{REMOTE}/E-learning-parrot-backend/app/Http/Controllers/Api/PlatformInstitutionController.php"),
        (BACKEND / "app" / "Http" / "Controllers" / "Api" / "UserController.php", f"{REMOTE}/E-learning-parrot-backend/app/Http/Controllers/Api/UserController.php"),
        (BACKEND / "routes" / "api.php", f"{REMOTE}/E-learning-parrot-backend/routes/api.php"),
        (BACKEND / "config" / "app.php", f"{REMOTE}/E-learning-parrot-backend/config/app.php"),
        (BACKEND / "database" / "seeders" / "DatabaseSeeder.php", f"{REMOTE}/E-learning-parrot-backend/database/seeders/DatabaseSeeder.php"),
        (BACKEND / "database" / "seeders" / "LearningHubDemoSeeder.php", f"{REMOTE}/E-learning-parrot-backend/database/seeders/LearningHubDemoSeeder.php"),
        (BACKEND / "database" / "seeders" / "PlatformInstitutionSeeder.php", f"{REMOTE}/E-learning-parrot-backend/database/seeders/PlatformInstitutionSeeder.php"),
        (FRONTEND / "src" / "api" / "axios.ts", f"{REMOTE}/E-learning-parrot-frontend/src/api/axios.ts"),
        (FRONTEND / "src" / "lib" / "dashboardCache.ts", f"{REMOTE}/E-learning-parrot-frontend/src/lib/dashboardCache.ts"),
        (FRONTEND / "src" / "pages" / "Signup.tsx", f"{REMOTE}/E-learning-parrot-frontend/src/pages/Signup.tsx"),
        (FRONTEND / "src" / "pages" / "dashboard" / "AdminInstitutionManagement.tsx", f"{REMOTE}/E-learning-parrot-frontend/src/pages/dashboard/AdminInstitutionManagement.tsx"),
        (FRONTEND / "src" / "pages" / "dashboard" / "InstructorManagement.tsx", f"{REMOTE}/E-learning-parrot-frontend/src/pages/dashboard/InstructorManagement.tsx"),
    ]
    for local, remote in uploads:
        upload(sftp, client, local, remote)
    sftp.close()

    # Prefer git sync when remote tracks the repo; still keep uploaded files as source of truth.
    run(
        client,
        f"cd {REMOTE} && git fetch origin && git reset --hard origin/main || true",
        timeout=180,
    )
    # Re-upload after reset so uncommitted-local-only is not an issue if push lags.
    sftp = client.open_sftp()
    for local, remote in uploads:
        upload(sftp, client, local, remote)
    sftp.close()

    for rel in [
        "app/Support/HardDeleteUser.php",
        "app/Services/InstitutionSignupService.php",
        "app/Services/DatabaseSchemaService.php",
        "app/Http/Controllers/Api/PlatformInstitutionController.php",
        "app/Http/Controllers/Api/UserController.php",
        "routes/api.php",
        "config/app.php",
        "database/seeders/DatabaseSeeder.php",
        "database/seeders/LearningHubDemoSeeder.php",
        "database/seeders/PlatformInstitutionSeeder.php",
    ]:
        run(
            client,
            f"docker cp {REMOTE}/E-learning-parrot-backend/{rel} "
            f"pgsa_backend:/var/www/html/{rel}",
            timeout=60,
        )

    run(
        client,
        f"sed -i 's/^AUTO_SEED_DEMO=.*/AUTO_SEED_DEMO=false/' {REMOTE}/deploy/.env.production && "
        f"grep '^AUTO_SEED_DEMO=' {REMOTE}/deploy/.env.production || "
        f"echo AUTO_SEED_DEMO=false >> {REMOTE}/deploy/.env.production",
        timeout=60,
    )

    run(
        client,
        "docker exec pgsa_backend sh -c '"
        "mkdir -p /var/www/html/storage/app/demo_seed_markers && "
        "date -Iseconds > /var/www/html/storage/app/demo_seed_markers/institutions.flag && "
        "date -Iseconds > /var/www/html/storage/app/demo_seed_markers/instructors.flag && "
        "chown -R www-data:www-data /var/www/html/storage/app/demo_seed_markers && "
        "ls -la /var/www/html/storage/app/demo_seed_markers'",
        timeout=60,
    )

    run(
        client,
        "docker exec pgsa_backend php artisan route:clear && "
        "docker exec pgsa_backend php artisan config:clear && "
        "docker exec pgsa_backend php artisan cache:clear",
        timeout=120,
    )

    code = run(
        client,
        f"cd {REMOTE}/deploy && "
        "docker compose -p pgsa --env-file .env.production "
        "-f docker-compose.prod.yml build frontend && "
        "docker compose -p pgsa --env-file .env.production "
        "-f docker-compose.prod.yml up -d --force-recreate backend frontend nginx",
        timeout=3600,
    )

    # Re-apply PHP + markers after recreate (image may reset app files).
    for rel in [
        "app/Support/HardDeleteUser.php",
        "app/Services/InstitutionSignupService.php",
        "app/Services/DatabaseSchemaService.php",
        "app/Http/Controllers/Api/PlatformInstitutionController.php",
        "app/Http/Controllers/Api/UserController.php",
        "routes/api.php",
        "config/app.php",
        "database/seeders/DatabaseSeeder.php",
        "database/seeders/LearningHubDemoSeeder.php",
        "database/seeders/PlatformInstitutionSeeder.php",
    ]:
        run(
            client,
            f"docker cp {REMOTE}/E-learning-parrot-backend/{rel} "
            f"pgsa_backend:/var/www/html/{rel}",
            timeout=60,
        )

    run(
        client,
        "docker exec pgsa_backend sh -c '"
        "mkdir -p /var/www/html/storage/app/demo_seed_markers && "
        "date -Iseconds > /var/www/html/storage/app/demo_seed_markers/institutions.flag && "
        "date -Iseconds > /var/www/html/storage/app/demo_seed_markers/instructors.flag && "
        "chown -R www-data:www-data /var/www/html/storage/app/demo_seed_markers' && "
        "docker exec pgsa_backend php artisan config:clear && "
        "docker exec pgsa_backend php artisan route:clear && "
        "docker exec pgsa_backend php artisan cache:clear && "
        "docker exec pgsa_backend printenv AUTO_SEED_DEMO",
        timeout=180,
    )

    # Verify key strings landed
    run(
        client,
        "docker exec pgsa_backend grep -n 'destroyInstitutionCompletely\\|lockDemoSeeds\\|demo_auto_seed_disabled' "
        "/var/www/html/app/Services/DatabaseSchemaService.php "
        "/var/www/html/app/Http/Controllers/Api/PlatformInstitutionController.php | head -n 40; "
        "docker exec pgsa_frontend sh -c \"grep -n 'Débutant\\|cacheGenerations\\|removeFromList' "
        "/usr/share/nginx/html/assets/*.js 2>/dev/null | head -n 20 || "
        "grep -RIn 'Débutant\\|Permanently delete' /usr/share/nginx/html 2>/dev/null | head -n 20 || true\"",
        timeout=120,
    )

    client.close()
    return code


if __name__ == "__main__":
    raise SystemExit(main())
