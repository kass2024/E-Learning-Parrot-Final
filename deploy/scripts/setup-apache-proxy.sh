#!/bin/bash
# Add ONE Apache vhost for e-learning.school → Docker on 127.0.0.1:8094
# Safe with existing /var/www and Xander (8090): does NOT touch other DocumentRoots.
set -euo pipefail

PORT="${PARROT_HTTP_PORT:-8094}"
CONF="/etc/apache2/sites-available/e-learning-school.conf"

echo "==> Existing /var/www (left unchanged):"
ls -la /var/www 2>/dev/null || true

echo "==> Existing Docker (left unchanged):"
docker ps --format 'table {{.Names}}\t{{.Ports}}' 2>/dev/null || true

sudo tee "$CONF" > /dev/null <<EOF
# e-learning.school — reverse proxy only (Docker on 127.0.0.1:${PORT})
# Does not use /var/www — existing Apache projects stay as DocumentRoot sites.
# Does not touch Xander (/opt/e-learning-xander on :8090) or XanderTech (:8092).
<VirtualHost *:80>
    ServerName e-learning.school
    ServerAlias www.e-learning.school api.e-learning.school
    ServerAlias parrotglobalstudyacademy.ca www.parrotglobalstudyacademy.ca api.parrotglobalstudyacademy.ca

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:${PORT}/
    ProxyPassReverse / http://127.0.0.1:${PORT}/

    ErrorLog \${APACHE_LOG_DIR}/elearning-school-error.log
    CustomLog \${APACHE_LOG_DIR}/elearning-school-access.log combined
</VirtualHost>
EOF

sudo a2enmod proxy proxy_http headers rewrite
sudo a2ensite e-learning-school.conf
# Keep old site enabled if present so existing certs/aliases still resolve during cutover.
if [ -f /etc/apache2/sites-available/parrotglobalstudyacademy.conf ]; then
  sudo a2ensite parrotglobalstudyacademy.conf || true
fi
sudo apache2ctl configtest
sudo systemctl reload apache2

echo "OK: site e-learning-school.conf added/updated."
echo "Apache still owns 80/443; Docker stays on 127.0.0.1:${PORT}."
echo "Existing /var/www and other Docker projects are untouched."
echo "HTTPS: sudo certbot --apache -d e-learning.school -d www.e-learning.school -d api.e-learning.school"
