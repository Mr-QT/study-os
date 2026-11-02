#!/bin/sh
set -e

export PORT="${PORT:-10000}"
export API_HOST=127.0.0.1
export API_PORT=4000

envsubst '${PORT}' < /etc/nginx/template.conf > /etc/nginx/conf.d/default.conf

echo "[start] applying database migrations"
attempt=0
until pnpm --filter @study-os/db db:migrate; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 15 ]; then
    echo "[start] migrations failed after $attempt attempts"
    exit 1
  fi
  echo "[start] database not ready, retrying in 3s"
  sleep 3
done

echo "[start] starting API on 4000"
node apps/api/dist/index.js &
API_PID=$!

echo "[start] starting web on 3000"
(cd apps/web && ./node_modules/.bin/next start --port 3000 --hostname 127.0.0.1) &
WEB_PID=$!

cleanup() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
  nginx -s stop 2>/dev/null || true
}
trap cleanup INT TERM

for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:4000/health >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "[start] starting nginx on $PORT"
nginx -g 'daemon off;'
