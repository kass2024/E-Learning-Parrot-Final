# Deploy Parrot-Learning to cPanel

**Domains (production)**

| App | URL | cPanel |
|-----|-----|--------|
| Frontend | https://parrotglobalstudyacademy.ca | Main domain document root |
| API | https://api.parrotglobalstudyacademy.ca | Subdomain document root → `public` folder |

---

## 1. Build packages locally

From `Parrot-Learning` folder in PowerShell:

```powershell
.\deploy\prepare-cpanel.ps1
```

This creates:

- `deploy/output/parrot-frontend-YYYYMMDD-HHMM.zip` — upload to **main domain**
- `deploy/output/parrot-api-YYYYMMDD-HHMM.zip` — upload to **API subdomain**

---

## 2. Frontend (parrotglobalstudyacademy.ca)

1. cPanel → **File Manager** → `public_html` (or domain root).
2. Delete old `assets` folder and `index.html` (keep backups if needed).
3. Upload **contents** of `parrot-frontend-*.zip` (not the zip itself inside another folder).
4. Confirm `.htaccess` is present (SPA routing + Zoom screen-share headers).

**Verify:** open https://parrotglobalstudyacademy.ca — login page loads.

---

## 3. API (api.parrotglobalstudyacademy.ca)

### Subdomain document root

cPanel → **Domains** → `api.parrotglobalstudyacademy.ca` → **Document Root** must end with:

```text
.../api.parrotglobalstudyacademy.ca/public
```

(Laravel `public` folder is the web root — not the project root.)

### Upload & install

1. Upload `parrot-api-*.zip` to the API subdomain folder (parent of `public`).
2. Extract so you have: `app/`, `bootstrap/`, `config/`, `public/`, `routes/`, etc.
3. **Terminal** (cPanel → Terminal or SSH):

```bash
cd ~/api.parrotglobalstudyacademy.ca   # adjust to your path
cp .env.cpanel .env
nano .env   # fill APP_KEY, DB_*, Zoom, Stripe, pCloud, MAIL_PASSWORD
```

Generate `APP_KEY` if empty:

```bash
php artisan key:generate
```

Install PHP dependencies (PHP **8.2+**):

```bash
composer install --no-dev --optimize-autoloader
```

Permissions:

```bash
chmod -R 775 storage bootstrap/cache
```

# After uploading API — cPanel Terminal:
php artisan migrate --force
php artisan db:seed --class=PlatformInstitutionSeeder --force
php artisan courses:assign-programs --program=General --force
php artisan route:clear
php artisan config:cache

# Or one HTTP call (after new API is uploaded):
# POST https://api.parrotglobalstudyacademy.ca/api/admin/system/setup-programs?force=1

### `.env` production checklist

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.parrotglobalstudyacademy.ca
FRONTEND_URL=https://parrotglobalstudyacademy.ca
# true on first deploy (or use POST /api/admin/system/migrate with MIGRATE_TOKEN)
AUTO_MIGRATE=true
AUTO_SEED_DEMO=true
SEED_PARTNER_PASSWORD=Partner@2026
MAIL_VERIFY_PEER=true
```

### Partner institutions (auto DB on deploy)

When `AUTO_MIGRATE=true`, the API runs pending migrations on boot, including:

- `platform_institutions` (+ per-institution SMTP columns)
- `institution_promo_codes`, `institution_payments`
- `platform_institution_id` on `users`, `students`, `course_payments`

When `AUTO_SEED_DEMO=true`, sample partner logins are created if missing:

| Institution | Email | Password |
|-------------|-------|----------|
| Acme Language Academy (active, paid) | `partner@acme-language.demo` | `Partner@2026` or `SEED_PARTNER_PASSWORD` |
| Global Scholars Partner (active, unpaid) | `partner@global-scholars.demo` | same |
| Demo promo code | `PARTNER-DEMO-2026` | |

**Manual alternative** (cPanel Terminal):

```bash
php artisan migrate --force
php artisan db:seed --class=PlatformInstitutionSeeder --force
```

**HTTP migrate** (after setting `MIGRATE_TOKEN` in `.env`):

```bash
curl -X POST "https://api.parrotglobalstudyacademy.ca/api/admin/system/migrate" \
  -H "X-Migrate-Token: YOUR_TOKEN"
```

Main admin: **Dashboard → Partner Institutions** — approve sign-ups, set per-institution SMTP (or use platform `.env` mail), upload logos.

Partner admins: **Settings → Institution** tab — update branding/logo.

Public signup: https://parrotglobalstudyacademy.ca/institution-signup

---

## 4. MySQL database

1. cPanel → **MySQL Databases** → create DB + user → assign **ALL PRIVILEGES**.
2. Put credentials in API `.env`:

```env
DB_HOST=localhost
DB_DATABASE=youruser_parrot
DB_USERNAME=youruser_parrot
DB_PASSWORD=...
```

---

## 5. Cron (meeting reminders)

cPanel → **Cron Jobs** — every minute:

```bash
cd /home/YOURUSER/api.parrotglobalstudyacademy.ca && php artisan schedule:run >> /dev/null 2>&1
```

---

## 6. Zoom screen share on production

The frontend `.htaccess` sets:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: credentialless`

After deploy, open a live meeting and run in browser console:

```javascript
window.crossOriginIsolated  // must be true
```

If `false`, ask hosting to enable `mod_headers` or add the same headers in cPanel → **Domains** → **Headers**.

---

## 7. Smoke test

- [ ] https://parrotglobalstudyacademy.ca loads
- [ ] Login works (API reachable)
- [ ] Partner institution sample login (`partner@acme-language.demo`)
- [ ] Main admin → Partner Institutions → edit SMTP / logo
- [ ] Live cohort join + screen share (`crossOriginIsolated === true`)
- [ ] Test email from admin settings

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API 404 | Document root must be `public/`, not Laravel root |
| API 500 | Check `storage/logs/laravel.log`, permissions on `storage/` |
| CORS / login fails | `FRONTEND_URL` and `APP_URL` must match live HTTPS URLs |
| Screen share black | `crossOriginIsolated` false → COOP/COEP headers missing on frontend |
