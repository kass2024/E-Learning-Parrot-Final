import paramiko, time, sys
from pathlib import Path
cfg={}
for r in Path(r'C:\methode\water_level\E-Learning-Xander-Final\E-learning-parrot-backend\deploy\vps.env').read_text().splitlines():
    if r.strip() and not r.startswith('#') and '=' in r:
        k,v=r.split('=',1); cfg[k.strip()]=v.strip()
c=paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg['VPS_HOST'].split('@')[1], username=cfg['VPS_HOST'].split('@')[0], password=cfg['VPS_PASSWORD'], timeout=30)
cmd = r'''
docker restart parrot_frontend
sleep 2
docker ps -a --filter name=parrot_ --format 'table {{.Names}}\t{{.Status}}'
echo === script tags only ===
docker exec parrot_frontend cat /usr/share/nginx/html/index.html | grep -i '<script'
echo === modulepreload ===
docker exec parrot_frontend cat /usr/share/nginx/html/index.html | grep modulepreload || true
apache2ctl configtest 2>&1 | tail -3
curl -sk --resolve www.xanderglobalacademy.com:443:127.0.0.1 https://www.xanderglobalacademy.com/ | grep -i '<script'
'''
_,o,_=c.exec_command(cmd,get_pty=True,timeout=90)
ch=o.channel
while True:
  while ch.recv_ready():
    sys.stdout.buffer.write(ch.recv(8192)); sys.stdout.buffer.flush()
  if ch.exit_status_ready() and not ch.recv_ready(): break
  time.sleep(0.05)
print('EXIT', ch.recv_exit_status()); c.close()
