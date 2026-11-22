#!/usr/bin/env bash
# Công cụ quản lý cầu nối Dịch trực tiếp trên VPS. Gõ «tyzo» để mở menu.
# Lệnh nhanh: tyzo kiem-tra | tyzo cap-nhat | tyzo nhat-ky | tyzo cai-dat
# Tệp này nằm trong kho (deploy/vps/tyzo.sh) nên tự mới theo mỗi lần cập nhật.
set -uo pipefail

REPO_URL="https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project.git"
DIR="/opt/tyzo"
ENV_FILE="/opt/bridge.env"
CADDYFILE="/etc/caddy/Caddyfile"
NAME="tyzo-bridge"
IMAGE="tyzo-bridge"
LOG_FILE="/var/log/tyzo-cap-nhat.log"
CRON_FILE="/etc/cron.d/tyzo-tu-cap-nhat"

xanh() { printf '\033[32m%s\033[0m\n' "$*"; }
do_() { printf '\033[31m%s\033[0m\n' "$*"; }
vang() { printf '\033[33m%s\033[0m\n' "$*"; }
tieu_de() { printf '\n\033[1;33m== %s ==\033[0m\n' "$*"; }
co_lenh() { command -v "$1" >/dev/null 2>&1; }
cho_enter() { [ -t 0 ] && read -rp "Bấm Enter để quay lại menu..." _ || true; }

can_root() {
  if [ "$(id -u)" != "0" ]; then do_ "Hãy chạy bằng root (gõ: sudo -i rồi gõ lại tyzo)."; exit 1; fi
}

ten_mien() {
  [ -f "$CADDYFILE" ] && awk 'NF && $1 !~ /^#/ { gsub("{", "", $1); print $1; exit }' "$CADDYFILE"
}

# Ghi KEY=VALUE vào tệp cấu hình (thay dòng cũ nếu có). Không in giá trị ra màn hình.
dat_bien() {
  local key="$1" value="$2" tmp
  touch "$ENV_FILE"
  tmp="$(mktemp)"
  grep -v "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  cat "$tmp" > "$ENV_FILE"
  rm -f "$tmp"
  chmod 600 "$ENV_FILE"
}

doc_bien() { [ -f "$ENV_FILE" ] && grep "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- || true; }

suc_khoe() { curl -fsS --max-time 5 http://127.0.0.1:8080/health 2>/dev/null; }

# Chờ cầu nối trả «ok», tối đa $1 giây.
cho_ok() {
  local i
  for i in $(seq 1 "${1:-60}"); do
    [ "$(suc_khoe)" = "ok" ] && return 0
    sleep 1
  done
  return 1
}

chay_container() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker run -d --name "$NAME" --restart unless-stopped \
    --env-file "$ENV_FILE" -p 127.0.0.1:8080:8080 "$1" >/dev/null
}

# ---------- Kiểm tra ----------
kiem_tra() {
  tieu_de "Kiểm tra"
  local loi=0 dom
  if co_lenh docker && systemctl is-active --quiet docker; then xanh "✔ Docker đang chạy"; else do_ "✘ Docker chưa chạy"; loi=1; fi
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$NAME"; then
    xanh "✔ Cầu nối đang chạy ($(docker ps --format '{{.Status}}' --filter "name=^${NAME}$"))"
  else
    do_ "✘ Cầu nối không chạy. Chọn mục 2 (Cập nhật) hoặc 6 (Khởi động lại)."; loi=1
  fi
  if [ "$(suc_khoe)" = "ok" ]; then xanh "✔ Cầu nối trả lời ok"; else do_ "✘ Cầu nối không trả lời. Xem nhật ký (mục 3)."; loi=1; fi
  if systemctl is-active --quiet caddy 2>/dev/null; then xanh "✔ Caddy (https) đang chạy"; else do_ "✘ Caddy chưa chạy"; loi=1; fi
  dom="$(ten_mien)"
  if [ -n "$dom" ]; then
    if [ "$(curl -fsS --max-time 10 "https://$dom/health" 2>/dev/null)" = "ok" ]; then
      xanh "✔ https://$dom/health trả ok"
      echo "   Trên Vercel, LIVE_BRIDGE_URL phải là: wss://$dom/live"
    else
      do_ "✘ https://$dom/health không trả ok (kiểm Cloudflare đám mây xám, cổng 80/443)"; loi=1
    fi
  fi
  for k in DATABASE_URL LIVE_BRIDGE_SECRET; do
    if [ -n "$(doc_bien "$k")" ]; then xanh "✔ Có $k trong cấu hình"; else do_ "✘ Thiếu $k trong $ENV_FILE"; loi=1; fi
  done
  local s; s="$(doc_bien LIVE_SILENCE_MS)"
  echo "   Thời gian chờ im lặng Qwen 3.5: ${s:-500 (mặc định)} ms"
  if [ -d "$DIR/.git" ]; then
    echo "   Bản mã: $(git -C "$DIR" log -1 --format='%h %cd' --date=format:'%d/%m/%Y %H:%M')"
  fi
  [ -f "$CRON_FILE" ] && echo "   Tự cập nhật mỗi đêm: BẬT" || echo "   Tự cập nhật mỗi đêm: tắt (bật ở mục 8)"
  echo "   Ổ đĩa còn trống: $(df -h / | awk 'NR==2 {print $4}') · RAM còn: $(free -h | awk '/^Mem/ {print $7}')"
  [ "$loi" = 0 ] && xanh "Tất cả đều ổn." || vang "Có mục chưa ổn, xem các dòng ✘ ở trên."
  return "$loi"
}

# ---------- Cập nhật (có tự quay về bản cũ khi lỗi) ----------
cap_nhat() {
  local tu_dong="${1:-}"
  tieu_de "Cập nhật cầu nối"
  [ -d "$DIR/.git" ] || { do_ "Chưa có mã ở $DIR. Chọn mục 9 (Cài đặt từ đầu)."; return 1; }
  [ -f "$ENV_FILE" ] || { do_ "Chưa có $ENV_FILE. Chọn mục 9 (Cài đặt từ đầu)."; return 1; }
  local truoc sau
  truoc="$(git -C "$DIR" rev-parse HEAD)"
  git -C "$DIR" fetch -q origin main && git -C "$DIR" reset -q --hard origin/main || { do_ "Không tải được mã mới (kiểm mạng)."; return 1; }
  sau="$(git -C "$DIR" rev-parse HEAD)"
  if [ "$tu_dong" = "tu-dong" ] && [ "$truoc" = "$sau" ] && [ "$(suc_khoe)" = "ok" ]; then
    echo "Không có bản mới, cầu nối vẫn chạy tốt."; return 0
  fi
  [ "$truoc" = "$sau" ] && echo "Mã đã là bản mới nhất, vẫn dựng lại cho chắc." || echo "Có bản mới: ${sau:0:7}"
  # Giữ bản đang chạy để quay về nếu bản mới lỗi.
  docker image inspect "$IMAGE:latest" >/dev/null 2>&1 && docker tag "$IMAGE:latest" "$IMAGE:cu"
  echo "Đang dựng (khoảng 3 phút)..."
  if ! docker build -t "$IMAGE:latest" "$DIR" > /tmp/tyzo-build.log 2>&1; then
    tail -n 15 /tmp/tyzo-build.log | sed 's/^/   /'
    do_ "Dựng bản mới lỗi (dòng trên là lý do). Cầu nối cũ vẫn chạy, không đổi gì."; return 1
  fi
  chay_container "$IMAGE:latest"
  if cho_ok 90; then
    xanh "✔ Cập nhật xong, cầu nối trả lời ok."
    docker image prune -f >/dev/null 2>&1 || true
    return 0
  fi
  do_ "✘ Bản mới không chạy lên. Đang quay về bản cũ..."
  docker logs --tail 20 "$NAME" 2>&1 | sed 's/^/   /'
  if docker image inspect "$IMAGE:cu" >/dev/null 2>&1; then
    chay_container "$IMAGE:cu"
    cho_ok 60 && vang "Đã quay về bản cũ, cầu nối chạy lại. Chụp các dòng lỗi phía trên gửi Claude." || do_ "Bản cũ cũng không chạy. Xem nhật ký (mục 3)."
  fi
  return 1
}

# ---------- Nhật ký ----------
nhat_ky() {
  tieu_de "Nhật ký cầu nối (50 dòng cuối)"
  docker logs --tail 50 "$NAME" 2>&1 || do_ "Cầu nối chưa chạy."
  if [ -t 0 ]; then
    read -rp "Xem tiếp trực tiếp? (c/k): " a
    [ "$a" = "c" ] && { echo "Bấm Ctrl+C để dừng xem."; docker logs -f --tail 0 "$NAME"; }
  fi
}

# ---------- Sửa cấu hình ----------
sua_cau_hinh() {
  tieu_de "Sửa cấu hình ($ENV_FILE)"
  echo "Tên các biến đang có (không hiện giá trị):"
  cut -d= -f1 "$ENV_FILE" 2>/dev/null | sed 's/^/   /'
  echo "Mở bằng nano. Lưu: ctrl+o rồi Enter. Thoát: ctrl+x."
  read -rp "Mở để sửa? (c/k): " a
  [ "$a" = "c" ] || return 0
  nano "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  read -rp "Khởi động lại cầu nối để nhận cấu hình mới? (c/k): " a
  [ "$a" = "c" ] && khoi_dong_lai
}

doi_im_lang() {
  tieu_de "Thời gian chờ im lặng (Qwen 3.5)"
  local cu; cu="$(doc_bien LIVE_SILENCE_MS)"
  echo "Hiện tại: ${cu:-500 (mặc định)} ms. Nhỏ = chữ ra nhanh hơn nhưng câu dễ vụn. Cho phép 200–6000."
  echo "Gợi ý: 300 (nhanh), 500 (vừa), 800 (câu trọn hơn)."
  read -rp "Nhập số mới (bỏ trống để giữ nguyên): " v
  [ -z "$v" ] && return 0
  if ! [[ "$v" =~ ^[0-9]+$ ]] || [ "$v" -lt 200 ] || [ "$v" -gt 6000 ]; then do_ "Số không hợp lệ."; return 1; fi
  dat_bien LIVE_SILENCE_MS "$v"
  xanh "Đã đặt $v ms."
  khoi_dong_lai
}

doi_bi_mat() {
  tieu_de "Tạo lại LIVE_BRIDGE_SECRET"
  vang "Sau khi tạo lại, PHẢI dán chuỗi mới vào LIVE_BRIDGE_SECRET trên Vercel rồi Redeploy, nếu không khách không dịch được."
  read -rp "Chắc chắn tạo lại? (gõ dong-y): " a
  [ "$a" = "dong-y" ] || { echo "Đã hủy."; return 0; }
  local s; s="$(openssl rand -hex 32)"
  dat_bien LIVE_BRIDGE_SECRET "$s"
  echo "Chuỗi mới (chép vào ghi chú riêng, KHÔNG chụp màn hình gửi ai):"
  echo "$s"
  khoi_dong_lai
  read -rp "Chép xong bấm Enter để xóa màn hình..." _; clear
}

khoi_dong_lai() {
  tieu_de "Khởi động lại"
  if docker image inspect "$IMAGE:latest" >/dev/null 2>&1; then
    chay_container "$IMAGE:latest"
    cho_ok 60 && xanh "✔ Cầu nối chạy lại, trả lời ok." || do_ "✘ Cầu nối không lên. Xem nhật ký (mục 3)."
  else
    do_ "Chưa có bản dựng. Chọn mục 2 (Cập nhật)."
  fi
  systemctl restart caddy 2>/dev/null && xanh "✔ Caddy chạy lại." || true
}

don_dep() {
  tieu_de "Dọn dung lượng"
  docker image prune -af --filter "until=72h" >/dev/null 2>&1 || true
  docker builder prune -af >/dev/null 2>&1 || true
  journalctl --vacuum-time=14d >/dev/null 2>&1 || true
  xanh "Đã dọn. Ổ đĩa còn trống: $(df -h / | awk 'NR==2 {print $4}')"
}

tu_cap_nhat() {
  tieu_de "Tự cập nhật mỗi đêm"
  if [ -f "$CRON_FILE" ]; then
    echo "Đang BẬT (3 giờ 17 sáng mỗi ngày, chỉ dựng lại khi có bản mới, lỗi thì tự quay về bản cũ)."
    read -rp "Tắt? (c/k): " a
    [ "$a" = "c" ] && rm -f "$CRON_FILE" && xanh "Đã tắt."
  else
    echo "Mỗi đêm 3 giờ 17 sáng (giờ VPS), tự lấy bản mới từ GitHub; không có bản mới thì không làm gì."
    read -rp "Bật? (c/k): " a
    if [ "$a" = "c" ]; then
      printf 'SHELL=/bin/bash\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n17 3 * * * root /usr/local/bin/tyzo cap-nhat-tu-dong >> %s 2>&1\n' "$LOG_FILE" > "$CRON_FILE"
      chmod 644 "$CRON_FILE"
      xanh "Đã bật. Kết quả ghi ở $LOG_FILE."
    fi
  fi
}

# ---------- Cài đặt từ đầu (VPS mới) ----------
cai_dat() {
  tieu_de "Cài đặt từ đầu"
  echo "Dùng cho VPS mới. VPS đang chạy rồi thì không cần."
  read -rp "Tiếp tục? (c/k): " a; [ "$a" = "c" ] || return 0
  apt-get update -qq && apt-get install -y -qq curl git gnupg ufw nano openssl cron >/dev/null
  co_lenh docker || curl -fsSL https://get.docker.com | sh
  ufw allow 22 >/dev/null; ufw allow 80 >/dev/null; ufw allow 443 >/dev/null; ufw --force enable >/dev/null
  [ -d "$DIR/.git" ] || git clone -q "$REPO_URL" "$DIR"
  if [ -z "$(doc_bien DATABASE_URL)" ]; then
    echo "Dán DATABASE_URL (lấy ở Neon: Connect → Show password → Copy). Chữ dán vào sẽ không hiện:"
    read -rs db; echo
    [ -n "$db" ] && dat_bien DATABASE_URL "$db"
  fi
  if [ -z "$(doc_bien LIVE_BRIDGE_SECRET)" ]; then
    local s; s="$(openssl rand -hex 32)"; dat_bien LIVE_BRIDGE_SECRET "$s"
    echo "LIVE_BRIDGE_SECRET mới (dán vào Vercel, không gửi ai): $s"
  fi
  [ -n "$(doc_bien PORT)" ] || dat_bien PORT 8080
  if ! co_lenh caddy; then
    apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https >/dev/null
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq && apt-get install -y -qq caddy >/dev/null
  fi
  local dom; dom="$(ten_mien)"
  if [ -z "$dom" ] || [ "$dom" = ":80" ]; then
    read -rp "Tên miền cho cầu nối (vd realtimehub.tyzo.site): " dom
    printf '%s {\n  reverse_proxy 127.0.0.1:8080\n}\n' "$dom" > "$CADDYFILE"
  fi
  systemctl restart caddy
  cap_nhat
  kiem_tra
}

cai_lenh() {
  ln -sf "$DIR/deploy/vps/tyzo.sh" /usr/local/bin/tyzo
  chmod +x "$DIR/deploy/vps/tyzo.sh"
}

menu() {
  while true; do
    printf '\n\033[1;33mTYZO SUB · Cầu nối Dịch trực tiếp\033[0m\n'
    echo " 1. Kiểm tra mọi thứ"
    echo " 2. Cập nhật bản mới (lỗi thì tự quay về bản cũ)"
    echo " 3. Xem nhật ký"
    echo " 4. Sửa cấu hình"
    echo " 5. Đổi thời gian chờ im lặng (Qwen 3.5)"
    echo " 6. Khởi động lại"
    echo " 7. Dọn dung lượng"
    echo " 8. Bật/tắt tự cập nhật mỗi đêm"
    echo " 9. Cài đặt từ đầu (VPS mới)"
    echo "10. Tạo lại LIVE_BRIDGE_SECRET"
    echo " 0. Thoát"
    read -rp "Chọn số: " c
    case "$c" in
      1) kiem_tra; cho_enter ;;
      2) cap_nhat; cho_enter ;;
      3) nhat_ky ;;
      4) sua_cau_hinh ;;
      5) doi_im_lang; cho_enter ;;
      6) khoi_dong_lai; cho_enter ;;
      7) don_dep; cho_enter ;;
      8) tu_cap_nhat ;;
      9) cai_dat; cho_enter ;;
      10) doi_bi_mat ;;
      0|q) exit 0 ;;
      *) vang "Chọn số từ 0 đến 10." ;;
    esac
  done
}

main() {
can_root
[ -x /usr/local/bin/tyzo ] || cai_lenh 2>/dev/null || true
case "${1:-menu}" in
  menu) menu ;;
  kiem-tra) kiem_tra ;;
  cap-nhat) cap_nhat ;;
  cap-nhat-tu-dong) echo "--- $(date '+%d/%m/%Y %H:%M') ---"; cap_nhat tu-dong ;;
  nhat-ky) nhat_ky ;;
  khoi-dong-lai) khoi_dong_lai ;;
  cai-dat) cai_dat ;;
  *) echo "Dùng: tyzo [kiem-tra|cap-nhat|nhat-ky|khoi-dong-lai|cai-dat]"; exit 1 ;;
esac
}

# Gọi qua hàm rồi thoát ngay: tệp này có thể bị thay giữa lúc «cập nhật» chạy.
main "$@"; exit $?
