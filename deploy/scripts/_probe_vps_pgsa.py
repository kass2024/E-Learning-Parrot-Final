#!/usr/bin/env python3
"""Probe VPS layout for Parrot Final deploy (read-only)."""
from __future__ import annotations

from pathlib import Path

import paramiko

VPS_ENV = Path(r"c:\methode\water_level\E-Learning-Parrot-Final\E-learning-parrot-backend\deploy\vps.env")


def load_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def main() -> None:
    cfg = load_env(VPS_ENV)
    vps_host = cfg["VPS_HOST"]
    user, host = vps_host.split("@", 1)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=cfg["VPS_PASSWORD"], timeout=30)

    cmds = [
        'docker ps --format "table {{.Names}}\t{{.Ports}}" 2>/dev/null | head -40',
        "ls -d /opt/e-learning* 2>/dev/null; ls /etc/apache2/sites-enabled 2>/dev/null | head -40",
        "ss -tlnp | grep -E '809[0-9]|:80 |:443 ' | head -20",
        "grep -Ril parrotglobalstudyacademy /etc/apache2/sites-enabled /etc/nginx 2>/dev/null | head -20",
        "getent hosts parrotglobalstudyacademy.ca api.parrotglobalstudyacademy.ca || true",
        "apache2ctl -S 2>/dev/null | grep -i parrot || true",
    ]
    for cmd in cmds:
        print("====", cmd)
        _, stdout, stderr = client.exec_command(cmd, timeout=60)
        print(stdout.read().decode("utf-8", errors="replace"))
        err = stderr.read().decode("utf-8", errors="replace")
        if err.strip():
            print(err)
    client.close()


if __name__ == "__main__":
    main()
