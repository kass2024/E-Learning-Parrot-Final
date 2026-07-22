import paramiko, time, sys
from pathlib import Path
cfg={}
for r in Path(r'C:\methode\water_level\E-Learning-Xander-Final\E-learning-parrot-backend\deploy\vps.env').read_text().splitlines():
    if r.strip() and not r.startswith('#') and '=' in r:
        k,v=r.split('=',1); cfg[k.strip()]=v.strip()
c=paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg['VPS_HOST'].split('@')[1], username=cfg['VPS_HOST'].split('@')[0], password=cfg['VPS_PASSWORD'], timeout=30)
cmd = r'''
echo === https curl verbose ===
curl -skv --max-time 15 https://www.xanderglobalacademy.com/ -o /tmp/h2.html 2>&1 | tail -25
echo status:$?; wc -c /tmp/h2.html 2>&1
grep -i title /tmp/h2.html || true
grep script /tmp/h2.html || true
echo === login ===
curl -sk -D- -o /tmp/login.html --max-time 15 https://www.xanderglobalacademy.com/login 2>&1 | head -20
wc -c /tmp/login.html; grep -i title /tmp/login.html || true
echo === frontend full default.conf ===
docker exec parrot_frontend cat /etc/nginx/conf.d/default.conf
echo === index in container ===
docker exec parrot_frontend cat /usr/share/nginx/html/index.html
'''
_,o,_=c.exec_command(cmd,get_pty=True,timeout=120)
ch=o.channel
while True:
  while ch.recv_ready():
    sys.stdout.buffer.write(ch.recv(8192)); sys.stdout.buffer.flush()
  if ch.exit_status_ready() and not ch.recv_ready(): break
  time.sleep(0.05)
print('EXIT', ch.recv_exit_status()); c.close()
