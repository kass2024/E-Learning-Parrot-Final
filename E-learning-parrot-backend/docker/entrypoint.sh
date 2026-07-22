#!/bin/sh
set -e

cd /var/www/html

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

sync_env_key() {
  key="$1"
  val="$2"
  [ -z "${val}" ] && return 0
  [ ! -f .env ] && return 0
  if grep -q "^${key}=" .env 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

if [ -n "${APP_KEY:-}" ] && [ -f .env ]; then
  if grep -q '^APP_KEY=$' .env || ! grep -q '^APP_KEY=' .env; then
    sed -i "s|^APP_KEY=.*|APP_KEY=${APP_KEY}|" .env 2>/dev/null || echo "APP_KEY=${APP_KEY}" >> .env
  fi
fi

# Keep baked .env aligned with compose env_file so Daily is not left at example defaults.
sync_env_key DAILY_INTEGRATION_ENABLED "${DAILY_INTEGRATION_ENABLED:-}"
sync_env_key DAILY_API_KEY "${DAILY_API_KEY:-}"
sync_env_key DAILY_DOMAIN "${DAILY_DOMAIN:-}"
sync_env_key DAILY_API_BASE_URL "${DAILY_API_BASE_URL:-}"
sync_env_key DAILY_WEBHOOK_BASE_URL "${DAILY_WEBHOOK_BASE_URL:-}"
sync_env_key DAILY_RECORDING_ENABLED "${DAILY_RECORDING_ENABLED:-}"
sync_env_key MAIN_PLATFORM_MEETING_PROVIDER "${MAIN_PLATFORM_MEETING_PROVIDER:-daily}"

php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

exec "$@"
