import paramiko, time, sys
from pathlib import Path

local_nginx = Path(r'C:\methode\water_level\E-Learning-Xander-Final\E-learning-parrot-frontend\docker\nginx.conf')
remote_tmp = '/tmp/parrot_frontend_nginx.conf'

cfg={}
for r in Path(r'C:\methode\water_level\E-Learning-Xander-Final\E-learning-parrot-backend\deploy\vps.env').read_text().splitlines():
    if r.strip() and not r.startswith('#') and '=' in r:
        k,v=r.split('=',1); cfg[k.strip()]=v.strip()

host=cfg['VPS_HOST'].split('@')[1]
user=cfg['VPS_HOST'].split('@')[0]
pwd=cfg['VPS_PASSWORD']

c=paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=user, password=pwd, timeout=30)

sftp=c.open_sftp()
sftp.put(str(local_nginx), remote_tmp)
sftp.close()

cmd = f'''
set -e
docker cp {remote_tmp} parrot_frontend:/etc/nginx/conf.d/default.conf
docker exec parrot_frontend nginx -t
docker exec parrot_frontend nginx -s reload
docker restart parrot_nginx
sleep 3
echo === verify nginx no gzip_static ===
docker exec parrot_frontend grep gzip_static /etc/nginx/conf.d/default.conf || echo "no gzip_static OK"
echo === local 8090 ===
curl -sS -D- -o /tmp/h8090.html -H 'Host: www.xanderglobalacademy.com' http://127.0.0.1:8090/ | head -15
grep -i title /tmp/h8090.html; grep script /tmp/h8090.html
echo === apache https localhost ===
curl -sk -D- -o /tmp/h443.html --resolve www.xanderglobalacademy.com:443:127.0.0.1 https://www.xanderglobalacademy.com/ | head -20
wc -c /tmp/h443.html; grep -i title /tmp/h443.html; grep script /tmp/h443.html
echo === login via apache ===
curl -sk -D- -o /tmp/login443.html --resolve www.xanderglobalacademy.com:443:127.0.0.1 https://www.xanderglobalacademy.com/login | head -15
wc -c /tmp/login443.html; grep -i title /tmp/login443.html
docker ps --filter name=parrot_ --format 'table {{.Names}}\t{{.Status}}'
'''
_,o,_=c.exec_command(cmd,get_pty=True,timeout=120)
ch=o.channel
while True:
  while ch.recv_ready():
    sys.stdout.buffer.write(ch.recv(8192)); sys.stdout.buffer.flush()
  if ch.exit_status_ready() and not ch.recv_ready(): break
  time.sleep(0.05)
print('EXIT', ch.recv_exit_status()); c.close()
