#!/bin/bash
# Add ONE Apache vhost for parrotglobalstudyacademy.ca → Docker on 127.0.0.1:8094
# Safe with existing /var/www and Xander (8090): does NOT touch other DocumentRoots.
set -euo pipefail

PORT="${PARROT_HTTP_PORT:-8094}"
CONF="/etc/apache2/sites-available/parrotglobalstudyacademy.conf"

echo "==> Existing /var/www (left unchanged):"
ls -la /var/www 2>/dev/null || true

echo "==> Existing Docker (left unchanged):"
docker ps --format 'table {{.Names}}\t{{.Ports}}' 2>/dev/null || true

sudo tee "$CONF" > /dev/null <<EOF
# parrotglobalstudyacademy.ca — reverse proxy only (Docker on 127.0.0.1:${PORT})
# Does not use /var/www — existing Apache projects stay as DocumentRoot sites.
# Does not touch Xander (/opt/e-learning-xander on :8090) or XanderTech (:8092).
<VirtualHost *:80>
    ServerName parrotglobalstudyacademy.ca
    ServerAlias www.parrotglobalstudyacademy.ca api.parrotglobalstudyacademy.ca

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:${PORT}/
    ProxyPassReverse / http://127.0.0.1:${PORT}/

    ErrorLog \${APACHE_LOG_DIR}/pgsa-elearning-error.log
    CustomLog \${APACHE_LOG_DIR}/pgsa-elearning-access.log combined
</VirtualHost>
EOF

sudo a2enmod proxy proxy_http headers rewrite
sudo a2ensite parrotglobalstudyacademy.conf
sudo apache2ctl configtest
sudo systemctl reload apache2

echo "OK: only new site parrotglobalstudyacademy.conf added."
echo "Apache still owns 80/443; Docker stays on 127.0.0.1:${PORT}."
echo "Existing /var/www and other Docker projects are untouched."
echo "HTTPS: sudo certbot --apache -d parrotglobalstudyacademy.ca -d www.parrotglobalstudyacademy.ca -d api.parrotglobalstudyacademy.ca"
