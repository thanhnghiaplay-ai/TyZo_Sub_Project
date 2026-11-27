#!/usr/bin/env bash
# So độ trễ Dịch trực tiếp theo model/tham số, nối thẳng Alibaba từ container cầu nối. Chạy: bash /opt/tyzo/deploy/vps/do-live/chay-direct.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."
docker ps --format '{{.Names}}' | grep -qx tyzo-bridge || { echo "✘ Cầu nối tyzo-bridge chưa chạy"; exit 1; }
docker exec tyzo-bridge mkdir -p /app/deploy/vps
docker cp deploy/vps/do-live tyzo-bridge:/app/deploy/vps/ >/dev/null
docker cp deploy/vps/do-modal tyzo-bridge:/app/deploy/vps/ >/dev/null
echo "Đo 5 cấu hình × 4 đoạn (khoảng 12 phút)…"
docker exec tyzo-bridge node --no-warnings --experimental-strip-types --import ./scripts/register-ts.mjs deploy/vps/do-live/do-live-direct.ts
docker exec tyzo-bridge rm -rf /app/deploy/vps/do-live /app/deploy/vps/do-modal
