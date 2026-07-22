import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ssh_deploy as d
import paramiko

cfg = d.load_env(d.DEPLOY / "vps.env")
user, host, port = d.parse_host(cfg["VPS_HOST"])
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, port=port, username=user, password=cfg["VPS_PASSWORD"], timeout=60)
cmd = r"""
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | head -40
cd /opt/e-learning-xander/E-learning-parrot-backend/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production ps 2>/dev/null | head -30
ls /opt/e-learning-xander/E-learning-parrot-frontend/dist/assets/Dashboard*.js 2>/dev/null | head -5
"""
raise SystemExit(d.run(client, cmd, timeout=90))
