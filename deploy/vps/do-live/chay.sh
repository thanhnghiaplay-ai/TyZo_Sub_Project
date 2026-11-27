#!/usr/bin/env bash
# Đo Dịch trực tiếp thật trên VPS. Chạy: bash /opt/tyzo/deploy/vps/do-live/chay.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."
docker ps --format '{{.Names}}' | grep -qx tyzo-bridge || { echo "✘ Cầu nối tyzo-bridge chưa chạy"; exit 1; }
read -rp "Email tài khoản TyZo dùng để thử (bị trừ Token như dùng thật): " email
[ -n "$email" ] || { echo "✘ Chưa có email"; exit 1; }
docker exec tyzo-bridge mkdir -p /app/deploy/vps
docker cp deploy/vps/do-live tyzo-bridge:/app/deploy/vps/
docker cp deploy/vps/do-modal tyzo-bridge:/app/deploy/vps/
docker exec tyzo-bridge node --experimental-strip-types --import ./scripts/register-ts.mjs deploy/vps/do-live/do-live.ts "$email" "${1:-wss://realtimehub.tyzo.site/live}"
docker exec tyzo-bridge rm -rf /app/deploy/vps/do-live /app/deploy/vps/do-modal
