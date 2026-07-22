# Deploy E-Learning Xander on Linux VPS (Docker)

**No cPanel static upload** — frontend and backend run as Docker containers.  
Nginx inside Docker serves the React app and Laravel API; Apache on the host (if present) proxies HTTPS to `127.0.0.1:8090`.

| App | URL | GitHub |
|-----|-----|--------|
| Frontend | https://xanderglobalscholars.com | https://github.com/kass2024/E-earning-Xander-front-end |
| API | https://api.xanderglobalscholars.com | https://github.com/kass2024/E-earning-Xander-Backend |

---

## Do not disturb existing Apache sites

Your VPS already has apps under `/var/www` (e.g. `html`, `Marketing`, `parrot-moc`, `whatsap`, `xanderbot`, `xandermock`).

**This deploy must never touch them:**

| Rule | Detail |
|------|--------|
| Install path | Only `/opt/e-learning-xander` — **never** `/var/www/...` |
| Ports | Docker binds **`127.0.0.1:8090` only** — never public `:80` or `:443` |
| Apache | Add **one new** vhost (`parrot-elearning.conf`) for e-learning domains only |
| Do not | Edit/delete existing DocumentRoots, disable other sites, or stop Apache |

After deploy, `ls /var/www` must still show the same folders unchanged.

---

## 1. DNS

| Host | Type | Value |
|------|------|--------|
| `@` | A | VPS IP |
| `www` | A | VPS IP |
| `api` | A | VPS IP |

---

## 2. VPS one-time setup

```bash
sudo apt update && sudo apt install -y git curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
```

---

## 3. Clone repos

```bash
sudo mkdir -p /opt/e-learning-xander
sudo chown $USER:$USER /opt/e-learning-xander
cd /opt/e-learning-xander

git clone https://github.com/kass2024/E-earning-Xander-front-end.git E-learning-parrot-frontend
git clone https://github.com/kass2024/E-earning-Xander-Backend.git E-learning-parrot-backend

# Copy deploy folder from your local machine, or clone if you add it to a repo:
# scp -r deploy/ user@VPS:/opt/e-learning-xander/deploy
```

Expected layout:

```text
/opt/e-learning-xander/
  E-learning-parrot-frontend/
  E-learning-parrot-backend/
  deploy/
    docker-compose.prod.yml
    nginx/edge.conf
    .env.production
```

---

## 4. Configure environment

```bash
cd /opt/e-learning-xander/deploy
cp .env.production.example .env.production
nano .env.production
```

**Required changes:**

- `MYSQL_ROOT_PASSWORD`, `DB_PASSWORD` — strong passwords
- `APP_KEY` — generate locally: `php artisan key:generate --show` (or run once in backend container)
- `VITE_API_URL` — must match live API URL
- Zoom, Stripe, pCloud, mail credentials

Generate `APP_KEY` on VPS if empty:

```bash
docker compose -f docker-compose.prod.yml run --rm backend php artisan key:generate --show
# paste output into APP_KEY in .env.production
```

---

## 5. First deploy

```bash
cd /opt/e-learning-xander/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Services:

| Container | Role |
|-----------|------|
| `parrot_mysql` | MySQL 8 |
| `parrot_backend` | Laravel API (PHP-FPM + nginx) |
| `parrot_scheduler` | `php artisan schedule:work` (meeting/quiz reminders) |
| `parrot_frontend` | Vite build served by nginx |
| `parrot_nginx` | Edge proxy on **127.0.0.1:8090** |

Verify:

```bash
curl -I http://127.0.0.1:8090/ -H "Host: xanderglobalscholars.com"
curl http://127.0.0.1:8090/up -H "Host: api.xanderglobalscholars.com"
docker compose -f docker-compose.prod.yml ps
```

---

## 6. Apache reverse proxy (shared VPS)

If Apache already owns ports 80/443 (Parrot, Xander AI, etc.):

```bash
cd /opt/e-learning-xander/deploy
chmod +x scripts/setup-apache-proxy.sh
PARROT_HTTP_PORT=8090 sudo -E bash scripts/setup-apache-proxy.sh
```

Then HTTPS:

```bash
sudo certbot --apache -d xanderglobalscholars.com -d www.xanderglobalscholars.com -d api.xanderglobalscholars.com
```

**Never bind Docker to public :80** if Apache is running — keep `127.0.0.1:8090` only.

---

## 7. Update after git push

```bash
cd /opt/e-learning-xander/E-learning-parrot-frontend && git pull
cd /opt/e-learning-xander/E-learning-parrot-backend && git pull
cd /opt/e-learning-xander/deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Rebuild frontend only (after UI changes):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache frontend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d frontend nginx
```

---

## 8. Smoke test

- [ ] https://xanderglobalscholars.com loads login
- [ ] Login works (API reachable)
- [ ] https://api.xanderglobalscholars.com/up returns healthy
- [ ] Live cohort / Daily meetings work
- [ ] Test email from admin settings

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API 502 | `docker logs parrot_backend --tail 80` |
| DB connection failed | `DB_HOST=mysql` in `.env.production`; passwords match `MYSQL_*` vars |
| Frontend shows old UI | Rebuild frontend image (`--no-cache`); bump `VITE_APP_BUILD_ID` |
| Migrations | `AUTO_MIGRATE=true` runs on API boot; or `docker compose ... exec backend php artisan migrate --force` |
| Scheduler not running | `docker logs parrot_scheduler` |
| Apache conflict on :80 | Docker must use `127.0.0.1:8090` only |

---

## cPanel vs VPS

| cPanel (old) | VPS Docker (this guide) |
|--------------|-------------------------|
| Upload `dist/` zip to `public_html` | Frontend container builds & serves via nginx |
| Upload Laravel zip + `composer install` on host | Backend container with PHP 8.2 + composer |
| cPanel cron for `schedule:run` | `parrot_scheduler` container |
| Manual `.htaccess` on static files | nginx configs in `docker/` |
