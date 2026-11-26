#!/usr/bin/env bash
# Công cụ quản lý cầu nối Dịch trực tiếp trên VPS. Gõ «tyzo» để mở menu.
# Lệnh nhanh: tyzo kiem-tra | tyzo cap-nhat | tyzo nhat-ky | tyzo thiet-lap
# VPS mới, chạy một dòng:  bash <(curl -fsSL https://raw.githubusercontent.com/thanhnghiaplay-ai/TyZo_Sub_Project/main/deploy/vps/tyzo.sh)
# Tệp này nằm trong kho (deploy/vps/tyzo.sh) nên tự mới theo mỗi lần cập nhật.
set -uo pipefail

REPO_URL="https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project.git"
DIR="/opt/tyzo"
BRIDGE_ENV="/opt/bridge.env"
WEB_ENV="/opt/tyzo-web.env"
CONF="/opt/tyzo.conf"
BACKUP_DIR="/opt/tyzo-backup"
BACKUP_CRON="/etc/cron.d/tyzo-sao-luu"
TRANSFER_FORMAT="1"
COMPOSE_FILE="/opt/tyzo/deploy/vps/compose.yml"
ENV_FILE="$BRIDGE_ENV"
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
kiem_tra_cau_noi() {
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
  echo "   Thời gian chờ im lặng Qwen 3.5: ${s:-500 (mặc định)} ms · độ nhạy nhận tiếng: $(doc_bien LIVE_VAD_THRESHOLD | grep . || echo "0.2 (mặc định)")"
  if [ -d "$DIR/.git" ]; then
    echo "   Bản mã: $(git -C "$DIR" log -1 --format='%h %cd' --date=format:'%d/%m/%Y %H:%M')"
  fi
  [ -f "$CRON_FILE" ] && echo "   Tự cập nhật mỗi đêm: BẬT" || echo "   Tự cập nhật mỗi đêm: tắt (bật ở mục 8)"
  [ -f /etc/cron.d/tyzo-quet-rui-ro ] && echo "   Quét vi phạm mỗi đêm: BẬT" || echo "   Quét vi phạm mỗi đêm: tắt (bật ở mục 16)"
  echo "   Ổ đĩa còn trống: $(df -h / | awk 'NR==2 {print $4}') · RAM còn: $(free -h | awk '/^Mem/ {print $7}')"
  [ "$loi" = 0 ] && xanh "Tất cả đều ổn." || vang "Có mục chưa ổn, xem các dòng ✘ ở trên."
  return "$loi"
}

# ---------- Cập nhật (có tự quay về bản cũ khi lỗi) ----------
cap_nhat_cau_noi() {
  local tu_dong="${1:-}"
  tieu_de "Cập nhật cầu nối"
  [ -d "$DIR/.git" ] || { do_ "Chưa có mã ở $DIR. Chọn mục 9 (Thiết lập từng bước)."; return 1; }
  [ -f "$ENV_FILE" ] || { do_ "Chưa có $ENV_FILE. Chọn mục 9 (Thiết lập từng bước)."; return 1; }
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
nhat_ky_cau_noi() {
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
  tieu_de "Ngắt câu (Qwen 3.5): thời gian chờ im lặng và độ nhạy nhận tiếng"
  local cu doi=0; cu="$(doc_bien LIVE_SILENCE_MS)"
  echo "1) Chờ im lặng: hiện ${cu:-500 (mặc định)} ms. Nhỏ = chữ ra nhanh hơn nhưng câu dễ vụn. Cho phép 200–6000."
  echo "   Gợi ý: 300 (nhanh), 500 (vừa), 800 (câu trọn hơn)."
  read -rp "   Nhập số mới (bỏ trống để giữ nguyên): " v
  if [ -n "$v" ]; then
    if ! [[ "$v" =~ ^[0-9]+$ ]] || [ "$v" -lt 200 ] || [ "$v" -gt 6000 ]; then do_ "Số không hợp lệ."; return 1; fi
    dat_bien LIVE_SILENCE_MS "$v"; xanh "   Đã đặt $v ms."; doi=1
  fi
  cu="$(doc_bien LIVE_VAD_THRESHOLD)"
  echo "2) Độ nhạy nhận tiếng: hiện ${cu:-0.2 (mặc định)}. Thấp = nhạy, nhạc nền cũng bị coi là đang nói nên câu dài,"
  echo "   khó chốt. Cao = chỉ giọng rõ mới tính, câu chốt đúng lúc hơn, có thể sót giọng rất nhỏ. Cho phép 0.1–0.9."
  echo "   Gợi ý: 0.5 cho phim, video có nhạc nền; 0.2 cho giọng nói nhỏ, ít nhạc."
  read -rp "   Nhập số mới (vd. 0.5, bỏ trống để giữ nguyên): " v
  if [ -n "$v" ]; then
    v="${v/,/.}"
    if ! [[ "$v" =~ ^0\.[1-9]$ ]]; then do_ "Số không hợp lệ (0.1–0.9)."; return 1; fi
    dat_bien LIVE_VAD_THRESHOLD "$v"; xanh "   Đã đặt $v."; doi=1
  fi
  [ "$doi" = 1 ] && khoi_dong_lai || echo "Không đổi gì."
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
  khoi_dong_lai_cau_noi
  read -rp "Chép xong bấm Enter để xóa màn hình..." _; clear
}

khoi_dong_lai_cau_noi() {
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

# ---------- Thiết lập từng bước (có hướng dẫn) ----------
# Dẫn người không biết lập trình đi từ VPS trống tới khi web dùng được cầu nối.
# Bước nào đã xong thì tự bỏ qua, nên chạy lại bao nhiêu lần cũng được.

hoi_co() { # hoi_co "câu hỏi" → 0 khi trả lời c
  local a
  while true; do
    read -rp "$1 (c = có / k = không): " a
    case "$a" in c|C|co|có) return 0 ;; k|K|khong|không) return 1 ;; esac
    vang "Gõ chữ c hoặc chữ k rồi bấm Enter."
  done
}

doi_enter() { read -rp "$1 Xong thì bấm Enter..." _; }

TONG=10
buoc() { printf '\n\033[1;36m━━━ BƯỚC %s/%s: %s ━━━\033[0m\n' "$1" "$TONG" "$2"; }

ip_vps() { curl -4 -fsS --max-time 8 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}'; }

thiet_lap() {
  clear 2>/dev/null || true
  printf '\033[1;33mTHIẾT LẬP CẦU NỐI DỊCH TRỰC TIẾP — TỪNG BƯỚC\033[0m\n'
  cat <<'TXT'
Mất khoảng 20 phút. Cần chuẩn bị:
  • Tên miền đã trỏ về Cloudflare (vd tyzo.site)
  • Đăng nhập được Neon (console.neon.tech) và Vercel (vercel.com) trên điện thoại hoặc máy tính
Máy sẽ tự làm phần cài đặt. Chỗ nào cần bạn làm ở trang khác, máy ghi rõ bấm vào đâu.
Đang làm dở mà thoát cũng không sao: gõ «tyzo» rồi chọn lại mục này, bước đã xong sẽ được bỏ qua.
TXT
  hoi_co "Bắt đầu?" || return 0
  TONG=10
  if [ "$(conf_get MODE)" = "full" ]; then
    vang "VPS này đang chạy WEB ĐẦY ĐỦ (cầu nối đã nằm trong đó). Thiết lập chỉ cầu nối sẽ không dùng nữa."
    hoi_co "Vẫn chuyển VPS này về chỉ chạy cầu nối?" || return 0
    tat_web_day_du
  fi
  conf_set MODE bridge; ENV_FILE="$BRIDGE_ENV"

  # 1. Phần mềm
  buoc 1 "Cài phần mềm cần thiết (máy tự làm)"
  echo "Đang cài, có thể mất 2–5 phút. Nếu thấy chữ «Could not get lock» thì máy đang tự cập nhật, chờ chút sẽ tiếp."
  local i
  for i in 1 2 3 4 5 6; do
    if apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq curl git gnupg ufw nano openssl cron ca-certificates >/dev/null 2>&1; then break; fi
    vang "Máy đang bận cập nhật, thử lại sau 20 giây ($i/6)..."; sleep 20
  done
  co_lenh docker || { curl -fsSL https://get.docker.com | sh >/dev/null 2>&1; }
  systemctl enable --now docker >/dev/null 2>&1 || true
  if co_lenh docker && systemctl is-active --quiet docker; then xanh "✔ Đã có Docker"; else do_ "✘ Chưa cài được Docker. Chụp màn hình gửi Claude."; return 1; fi
  ufw allow 22 >/dev/null 2>&1; ufw allow 80 >/dev/null 2>&1; ufw allow 443 >/dev/null 2>&1; ufw --force enable >/dev/null 2>&1
  xanh "✔ Đã mở cổng 22, 80, 443"

  # 2. Mã
  buoc 2 "Tải mã của web (máy tự làm)"
  if [ -d "$DIR/.git" ]; then git -C "$DIR" fetch -q origin main && git -C "$DIR" reset -q --hard origin/main; else git clone -q "$REPO_URL" "$DIR"; fi
  [ -f "$DIR/Dockerfile" ] && xanh "✔ Đã có mã ở $DIR" || { do_ "✘ Không tải được mã. Kiểm mạng rồi chạy lại."; return 1; }
  cai_lenh

  # 3. Tên miền
  buoc 3 "Trỏ tên miền phụ về VPS (bạn làm trên Cloudflare)"
  local ip dom thay
  ip="$(ip_vps)"
  dom="$(ten_mien)"; [ "$dom" = ":80" ] && dom=""
  if [ -n "$dom" ]; then
    echo "Tên miền đang dùng: $dom"
    hoi_co "Giữ tên miền này?" || dom=""
  fi
  while [ -z "$dom" ]; do
    read -rp "Gõ tên miền phụ cho cầu nối (vd realtimehub.tyzo.site): " dom
    dom="$(echo "$dom" | tr 'A-Z' 'a-z' | sed 's#^https\?://##; s#/.*##; s/ //g')"
    [[ "$dom" =~ ^[a-z0-9.-]+\.[a-z]{2,}$ ]] || { vang "Tên miền chưa đúng dạng."; dom=""; }
  done
  cat <<TXT
Làm trên Cloudflare (dash.cloudflare.com):
  1. Chọn tên miền chính (${dom#*.}) → menu DNS → Records → bấm «Add record»
  2. Type: A
  3. Name: ${dom%%.*}
  4. IPv4 address: $ip
  5. Proxy status: bấm cho đám mây chuyển sang MÀU XÁM (DNS only)
  6. Bấm Save. Nếu đã có bản ghi ${dom%%.*} thì bấm Edit và sửa IP như trên.
TXT
  while true; do
    thay="$(getent ahostsv4 "$dom" 2>/dev/null | awk 'NR==1 {print $1}')"
    if [ "$thay" = "$ip" ]; then xanh "✔ $dom đã trỏ đúng về VPS ($ip)"; break; fi
    if [ -z "$thay" ]; then vang "Chưa thấy $dom. Làm theo hướng dẫn trên rồi chờ 1–2 phút."
    else vang "$dom đang trỏ về $thay, chưa phải $ip. Kiểm lại IP, và đám mây phải màu XÁM."; fi
    hoi_co "Kiểm lại lần nữa?" || { vang "Bỏ qua bước kiểm tên miền (https có thể chưa chạy)."; break; }
    sleep 5
  done

  # 4. Cơ sở dữ liệu
  buoc 4 "Chuỗi kết nối cơ sở dữ liệu (bạn lấy ở Neon)"
  if [ -n "$(doc_bien DATABASE_URL)" ] && ! hoi_co "Đã có DATABASE_URL. Muốn nhập lại?"; then
    xanh "✔ Giữ DATABASE_URL cũ"
  else
    cat <<'TXT'
Làm trên Neon (console.neon.tech):
  1. Mở project → bấm «Connect»
  2. Giữ nguyên Role «neondb_owner», bật «Connection pooling»
  3. Bấm «Show password» rồi «Copy snippet»
  4. KHÔNG bấm «Reset password» (web sẽ mất kết nối)
Quay lại đây, giữ lâu màn hình chọn Paste. Chữ dán vào sẽ KHÔNG hiện ra, đó là bình thường.
TXT
    local db=""
    while true; do
      read -rsp "Dán DATABASE_URL rồi bấm Enter: " db; echo
      db="$(echo "$db" | tr -d '[:space:]')"
      [[ "$db" == postgres://* || "$db" == postgresql://* ]] && break
      vang "Chuỗi phải bắt đầu bằng postgresql://. Thử dán lại."
    done
    dat_bien DATABASE_URL "$db"
    xanh "✔ Đã lưu DATABASE_URL (không in ra màn hình)"
  fi
  [ -n "$(doc_bien PORT)" ] || dat_bien PORT 8080

  # 5. Chuỗi bí mật
  buoc 5 "Chuỗi bí mật nối web với cầu nối"
  local moi=""
  if [ -n "$(doc_bien LIVE_BRIDGE_SECRET)" ]; then
    xanh "✔ Đã có LIVE_BRIDGE_SECRET, giữ nguyên"
  elif hoi_co "Bạn có sẵn chuỗi LIVE_BRIDGE_SECRET đang dùng trên Vercel (trong ghi chú)?"; then
    local sec=""
    while true; do
      read -rsp "Dán chuỗi rồi bấm Enter (chữ sẽ không hiện): " sec; echo
      sec="$(echo "$sec" | tr -d '[:space:]')"
      [ "${#sec}" -ge 24 ] && break
      vang "Chuỗi quá ngắn (cần ít nhất 24 ký tự). Thử lại."
    done
    dat_bien LIVE_BRIDGE_SECRET "$sec"
    xanh "✔ Đã lưu chuỗi cũ. Không cần sửa trên Vercel."
  else
    moi="$(openssl rand -hex 32)"
    dat_bien LIVE_BRIDGE_SECRET "$moi"
    xanh "✔ Đã tạo chuỗi mới. Bước 9 sẽ hướng dẫn dán lên Vercel."
  fi

  # 6. https
  buoc 6 "Bật https cho tên miền (máy tự làm)"
  if ! co_lenh caddy; then
    apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https >/dev/null 2>&1
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq caddy >/dev/null 2>&1
  fi
  printf '%s {\n  reverse_proxy 127.0.0.1:8080\n}\n' "$dom" > "$CADDYFILE"
  systemctl enable caddy >/dev/null 2>&1; systemctl restart caddy
  systemctl is-active --quiet caddy && xanh "✔ Caddy đang chạy" || { do_ "✘ Caddy chưa chạy. Chụp màn hình gửi Claude."; journalctl -u caddy --no-pager -n 15; return 1; }

  # 7. Cầu nối
  buoc 7 "Dựng và chạy cầu nối (máy tự làm, khoảng 3–5 phút)"
  cap_nhat_cau_noi || { do_ "✘ Cầu nối chưa chạy. Chụp màn hình gửi Claude."; return 1; }

  # 8. Kiểm từ ngoài vào
  buoc 8 "Kiểm tra từ Internet vào"
  local ok=""
  for i in $(seq 1 24); do
    if [ "$(curl -fsS --max-time 8 "https://$dom/health" 2>/dev/null)" = "ok" ]; then ok=1; break; fi
    [ "$i" = 1 ] && echo "Đang chờ chứng chỉ https (tối đa 2 phút)..."
    sleep 5
  done
  if [ -n "$ok" ]; then xanh "✔ https://$dom/health trả ok"
  else do_ "✘ Chưa mở được https://$dom/health. Kiểm đám mây Cloudflare màu XÁM rồi chạy lại mục này."; fi

  # 9. Vercel
  buoc 9 "Cho web dùng cầu nối này (bạn làm trên Vercel)"
  cat <<TXT
Làm trên Vercel (vercel.com) → mở project của web → Settings → Environment Variables:
  1. LIVE_BRIDGE_URL  (bấm ⋯ → Edit, chưa có thì Add New)
     Giá trị:  wss://$dom/live
     Tích Production → Save
TXT
  if [ -n "$moi" ]; then
    cat <<TXT
  2. LIVE_BRIDGE_SECRET  (bấm ⋯ → Edit)
     Giá trị là chuỗi dưới đây. Chép vào ghi chú riêng nữa. KHÔNG chụp màn hình gửi ai.
TXT
    printf '     \033[1m%s\033[0m\n' "$moi"
    echo "     Tích Production → Save"
  else
    echo "  2. LIVE_BRIDGE_SECRET: KHÔNG cần sửa (đang dùng chuỗi cũ)."
  fi
  cat <<'TXT'
  3. Bấm «Deployments» → dòng trên cùng → ⋯ → Redeploy → Redeploy. Chờ hiện «Ready».
TXT
  doi_enter "Làm xong trên Vercel."
  [ -n "$moi" ] && clear 2>/dev/null

  # 10. Hoàn tất
  buoc 10 "Hoàn tất"
  if [ ! -f "$CRON_FILE" ] && hoi_co "Bật tự cập nhật mỗi đêm (nên bật)?"; then
    printf 'SHELL=/bin/bash\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n17 3 * * * root /usr/local/bin/tyzo cap-nhat-tu-dong >> %s 2>&1\n' "$LOG_FILE" > "$CRON_FILE"
    chmod 644 "$CRON_FILE"; xanh "✔ Đã bật tự cập nhật"
  fi
  if [ ! -f /etc/cron.d/tyzo-quet-rui-ro ] && hoi_co "Bật quét vi phạm mỗi đêm (nên bật; cần địa chỉ web)?"; then
    if [ -n "$(web_url)" ]; then
      printf 'SHELL=/bin/bash\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n37 1 * * * root /usr/local/bin/tyzo quet-rui-ro >> /var/log/tyzo-quet-rui-ro.log 2>&1\n' > /etc/cron.d/tyzo-quet-rui-ro
      chmod 644 /etc/cron.d/tyzo-quet-rui-ro; xanh "✔ Đã bật quét vi phạm mỗi đêm"
    fi
  fi
  kiem_tra_cau_noi
  cat > /opt/tyzo-ghi-chu.txt <<TXT
Cầu nối Dịch trực tiếp — thiết lập ngày $(date '+%d/%m/%Y')
Tên miền: $dom   (IP VPS: $ip)
Trên Vercel: LIVE_BRIDGE_URL = wss://$dom/live
Quản lý: gõ «tyzo» trên VPS. Kiểm tra = mục 1, cập nhật = mục 2.
Bí mật nằm ở $ENV_FILE (không in ra đây).
TXT
  cat <<TXT

Thử ngay: mở web → Dịch trực tiếp → chọn Micro → Bắt đầu → nói vài câu.
Nếu web chưa dịch được: gõ «tyzo», chọn 3 (nhật ký), chụp màn hình gửi Claude.
Ghi chú thiết lập lưu ở /opt/tyzo-ghi-chu.txt
TXT
  xanh "XONG. Từ nay chỉ cần nhớ một chữ: tyzo"
}


# =====================================================================
# Cấu hình chung (/opt/tyzo.conf): MODE (bridge | full), DOMAIN, DB (neon | local), EDGE (caddy | tunnel), DB_PASSWORD
# =====================================================================
conf_get() { [ -f "$CONF" ] && grep "^$1=" "$CONF" | tail -1 | cut -d= -f2- || true; }
conf_set() {
  local tmp; touch "$CONF"; tmp="$(mktemp)"
  grep -v "^$1=" "$CONF" > "$tmp" || true
  printf '%s=%s\n' "$1" "$2" >> "$tmp"; cat "$tmp" > "$CONF"; rm -f "$tmp"; chmod 600 "$CONF"
}
che_do() {
  local m; m="$(conf_get MODE)"
  if [ -z "$m" ] && [ -f "$BRIDGE_ENV" ]; then m=bridge; fi
  echo "$m"
}
chon_env() { if [ "$(che_do)" = "full" ]; then ENV_FILE="$WEB_ENV"; else ENV_FILE="$BRIDGE_ENV"; fi; }

dc() { # docker compose của chế độ web đầy đủ
  local prof=()
  [ "$(conf_get DB)" = "local" ] && prof=(--profile db)
  docker compose -f "$COMPOSE_FILE" --env-file "$CONF" -p tyzo "${prof[@]}" "$@"
}

web_ok() { [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 http://127.0.0.1:3000/ 2>/dev/null)" = "200" ]; }

cho_web_ok() {
  local i
  for i in $(seq 1 "${1:-180}"); do
    web_ok && [ "$(suc_khoe)" = "ok" ] && return 0
    sleep 1
  done
  return 1
}

# =====================================================================
# Nền: phần mềm, Docker (2 đường), Compose, bộ nhớ đệm, tường lửa
# =====================================================================
apt_cai() {
  local i
  for i in 1 2 3 4 5 6; do
    if apt-get update -qq >/dev/null 2>&1 && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$@" >/dev/null 2>&1; then return 0; fi
    vang "Máy đang bận cập nhật, thử lại sau 20 giây ($i/6)..."; sleep 20
  done
  return 1
}

cai_nen() {
  echo "Cài phần mềm cần thiết (2–5 phút)..."
  apt_cai curl git gnupg ufw nano openssl cron ca-certificates jq || vang "Một số gói chưa cài được, vẫn thử tiếp."
  if ! co_lenh docker; then
    echo "Cài Docker (đường chính: bộ cài chính thức)..."
    curl -fsSL https://get.docker.com | sh >/dev/null 2>&1 || true
  fi
  if ! co_lenh docker; then
    vang "Đường chính lỗi, thử đường dự phòng (gói docker.io của Ubuntu)..."
    apt_cai docker.io || true
  fi
  systemctl enable --now docker >/dev/null 2>&1 || true
  if ! docker compose version >/dev/null 2>&1; then
    apt_cai docker-compose-plugin || apt_cai docker-compose-v2 || true
  fi
  if co_lenh docker && systemctl is-active --quiet docker; then xanh "✔ Docker đang chạy"; else do_ "✘ Chưa cài được Docker. Chụp màn hình gửi Claude."; return 1; fi
  docker compose version >/dev/null 2>&1 && xanh "✔ Có Docker Compose" || { do_ "✘ Thiếu Docker Compose."; return 1; }
  # VPS ít RAM: thêm bộ nhớ đệm để đóng gói web không bị tràn bộ nhớ.
  local ram; ram="$(free -m | awk '/^Mem/ {print $2}')"
  if [ "${ram:-0}" -lt 3500 ] && ! swapon --show 2>/dev/null | grep -q .; then
    echo "RAM ${ram} MB, thêm 4 GB bộ nhớ đệm (swap)..."
    { fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none; } && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile && \
      { grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab; } && xanh "✔ Đã thêm bộ nhớ đệm"
  fi
  ufw allow 22 >/dev/null 2>&1; ufw allow 80 >/dev/null 2>&1; ufw allow 443 >/dev/null 2>&1; ufw --force enable >/dev/null 2>&1
  xanh "✔ Tường lửa: mở 22, 80, 443"
}

lay_ma() {
  if [ -d "$DIR/.git" ]; then git -C "$DIR" fetch -q origin main && git -C "$DIR" reset -q --hard origin/main; else git clone -q "$REPO_URL" "$DIR"; fi
  [ -f "$COMPOSE_FILE" ] && xanh "✔ Đã có mã ở $DIR" || { do_ "✘ Không tải được mã. Kiểm mạng rồi chạy lại."; return 1; }
  cai_lenh
}

# =====================================================================
# https: Caddy (Let's Encrypt, tự chuyển ZeroSSL khi lỗi) hoặc Cloudflare Tunnel
# =====================================================================
cai_caddy() {
  co_lenh caddy && return 0
  apt_cai debian-keyring debian-archive-keyring apt-transport-https || true
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt_cai caddy
}

viet_caddyfile() { # viet_caddyfile <tên miền> <bridge|full> <caddy|tunnel>
  local dom="$1" kind="$2" edge="$3" site="$1"
  [ "$edge" = "tunnel" ] && site="http://$dom"
  {
    # Sau Cloudflare Tunnel: tin tiêu đề https do cloudflared (chạy trên máy) gửi tới.
    [ "$edge" = "tunnel" ] && printf '{\n  servers {\n    trusted_proxies static private_ranges\n  }\n}\n\n'
    if [ "$kind" = "full" ]; then
      printf '%s {\n  encode zstd gzip\n  handle /live* {\n    reverse_proxy 127.0.0.1:8080\n  }\n  handle {\n    reverse_proxy 127.0.0.1:3000\n  }\n}\n' "$site"
    else
      printf '%s {\n  reverse_proxy 127.0.0.1:8080\n}\n' "$site"
    fi
  } > "$CADDYFILE"
  systemctl enable caddy >/dev/null 2>&1; systemctl restart caddy
  systemctl is-active --quiet caddy && xanh "✔ Caddy đang chạy" || { do_ "✘ Caddy chưa chạy:"; journalctl -u caddy --no-pager -n 15; return 1; }
}

cai_tunnel() {
  cat <<'TXT'
Cloudflare Tunnel: không cần mở cổng, dùng khi https thường không chạy (nhà mạng chặn cổng 80/443).
Làm trên Cloudflare:
  1. dash.cloudflare.com → Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared → đặt tên → Save
  2. Ở trang cài đặt, chép chuỗi token (đoạn dài sau chữ «install» trong lệnh mẫu)
  3. Tab Public hostname → Add: Subdomain + Domain = tên miền của bạn; Service: HTTP, URL: localhost:80 → Save
     (Nếu tên miền đã có bản ghi A, xóa bản ghi A đó trước.)
TXT
  local tok arch
  read -rsp "Dán token tunnel rồi bấm Enter (chữ không hiện): " tok; echo
  tok="$(echo "$tok" | tr -d '[:space:]')"; tok="${tok##*install}"
  [ -n "$tok" ] || { do_ "Chưa có token."; return 1; }
  if ! co_lenh cloudflared; then
    arch="$(dpkg --print-architecture 2>/dev/null || echo amd64)"
    curl -fsSL -o /tmp/cloudflared.deb "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${arch}.deb" && dpkg -i /tmp/cloudflared.deb >/dev/null 2>&1
    rm -f /tmp/cloudflared.deb
  fi
  co_lenh cloudflared || { do_ "✘ Không cài được cloudflared."; return 1; }
  cloudflared service uninstall >/dev/null 2>&1 || true
  cloudflared service install "$tok" >/dev/null 2>&1
  sleep 5
  systemctl is-active --quiet cloudflared && xanh "✔ Tunnel đang chạy" || { do_ "✘ Tunnel chưa chạy (kiểm token)."; return 1; }
}

ip_dung() { # kiểm tên miền trỏ về IP VPS (bỏ qua khi dùng tunnel)
  local dom="$1" ip="$2" thay
  while true; do
    thay="$(getent ahostsv4 "$dom" 2>/dev/null | awk 'NR==1 {print $1}')"
    [ "$thay" = "$ip" ] && { xanh "✔ $dom trỏ đúng về VPS ($ip)"; return 0; }
    if [ -z "$thay" ]; then vang "Chưa thấy $dom. Làm theo hướng dẫn rồi chờ 1–2 phút."
    else vang "$dom đang trỏ về $thay, chưa phải $ip. Kiểm IP, và đám mây phải XÁM."; fi
    hoi_co "Kiểm lại?" || { vang "Bỏ qua kiểm tên miền."; return 1; }
    sleep 5
  done
}

hoi_ten_mien() { # in tên miền đã chuẩn hóa
  local dom=""
  while [ -z "$dom" ]; do
    read -rp "$1" dom
    dom="$(echo "$dom" | tr 'A-Z' 'a-z' | sed 's#^https\?://##; s#/.*##; s/ //g')"
    [[ "$dom" =~ ^[a-z0-9.-]+\.[a-z]{2,}$ ]] || { vang "Tên miền chưa đúng dạng." >&2; dom=""; }
  done
  echo "$dom"
}

huong_dan_dns() { # huong_dan_dns <tên miền> <ip>
  local dom="$1" ip="$2" name
  name="${dom%%.*}"
  # Tên miền chính (vd tyzo.site) thì Name là @.
  [ "$(echo "$dom" | tr -cd '.' | wc -c)" -le 1 ] && name="@"
  cat <<TXT
Làm trên Cloudflare (dash.cloudflare.com) → chọn tên miền → DNS → Records:
  • Đã có bản ghi tên «$name» (vd đang trỏ về Vercel) → bấm Edit. Chưa có → Add record.
  • Type: A    Name: $name    IPv4 address: $ip
  • Proxy status: đám mây MÀU XÁM (DNS only)    → Save
TXT
}

# =====================================================================
# Dữ liệu: Postgres trên VPS, chép từ/đến Neon, sao lưu, khôi phục
# =====================================================================
db_len() {
  dc up -d db >/dev/null 2>&1
  local i
  for i in $(seq 1 60); do
    docker exec tyzo-db pg_isready -U tyzo -d tyzo >/dev/null 2>&1 && return 0
    sleep 2
  done
  do_ "✘ Postgres trên VPS không lên."; return 1
}

dem_bang() { # số bảng trong cơ sở dữ liệu trên VPS
  docker exec tyzo-db psql -U tyzo -d tyzo -tAc "select count(*) from information_schema.tables where table_schema='public'" 2>/dev/null | tr -d '[:space:]'
}

pg_tu_xa() { # chạy công cụ Postgres với máy chủ ngoài (Neon); thử bản 17 rồi 18
  local img
  for img in postgres:17 postgres:18; do
    if docker run --rm --network host "$img" "$@" 2>/tmp/tyzo-pg.err; then return 0; fi
    grep -qi "version mismatch\|server version" /tmp/tyzo-pg.err || break
  done
  sed 's/^/   /' /tmp/tyzo-pg.err | tail -5
  return 1
}

chep_tu_neon() { # chep_tu_neon <url Neon>: chép toàn bộ dữ liệu Neon về Postgres trên VPS (Neon chỉ bị đọc)
  local url="$1" n
  db_len || return 1
  n="$(dem_bang)"
  if [ "${n:-0}" != "0" ]; then
    vang "Cơ sở dữ liệu trên VPS đang có $n bảng. Chép từ Neon sẽ XÓA dữ liệu trên VPS (Neon không bị đụng)."
    read -rp "Gõ dong-y để tiếp tục: " a; [ "$a" = "dong-y" ] || { echo "Đã hủy."; return 1; }
    dc stop web bridge >/dev/null 2>&1 || true
    docker exec tyzo-db psql -U tyzo -d tyzo -qc "drop schema public cascade; create schema public;" >/dev/null
  fi
  echo "Đang đọc dữ liệu từ Neon (chỉ đọc, không sửa gì ở Neon)..."
  pg_tu_xa pg_dump --no-owner --no-privileges -Fc "$url" > /tmp/tyzo-neon.dump || { do_ "✘ Không đọc được Neon. Kiểm chuỗi kết nối."; rm -f /tmp/tyzo-neon.dump; return 1; }
  echo "Đang chép vào VPS..."
  docker exec -i tyzo-db pg_restore -U tyzo -d tyzo --no-owner --no-privileges < /tmp/tyzo-neon.dump 2>/tmp/tyzo-restore.err || true
  rm -f /tmp/tyzo-neon.dump
  n="$(dem_bang)"
  if [ "${n:-0}" -gt 5 ]; then xanh "✔ Đã chép xong ($n bảng)"; else do_ "✘ Chép chưa được:"; tail -5 /tmp/tyzo-restore.err; return 1; fi
}

chep_len_neon() { # chép dữ liệu trên VPS lên một Neon TRỐNG (khi quay lại Vercel)
  local url="$1" n
  n="$(pg_tu_xa psql "$url" -tAc "select count(*) from information_schema.tables where table_schema='public'" | tr -d '[:space:]')"
  [ -n "$n" ] || { do_ "✘ Không kết nối được Neon."; return 1; }
  [ "$n" = "0" ] || { do_ "✘ Neon đích đang có $n bảng. Chỉ chép vào Neon TRỐNG (tạo project/branch mới trên Neon) để khỏi ghi đè."; return 1; }
  echo "Đang chép từ VPS lên Neon..."
  docker exec tyzo-db pg_dump -U tyzo --no-owner --no-privileges -Fc tyzo > /tmp/tyzo-vps.dump || { do_ "✘ Không đọc được dữ liệu trên VPS."; return 1; }
  docker run --rm -i --network host postgres:17 pg_restore --no-owner --no-privileges -d "$url" < /tmp/tyzo-vps.dump 2>/tmp/tyzo-restore.err || true
  rm -f /tmp/tyzo-vps.dump
  n="$(pg_tu_xa psql "$url" -tAc "select count(*) from information_schema.tables where table_schema='public'" | tr -d '[:space:]')"
  [ "${n:-0}" -gt 5 ] && xanh "✔ Đã chép lên Neon ($n bảng)" || { do_ "✘ Chép chưa được:"; tail -5 /tmp/tyzo-restore.err; return 1; }
}

sao_luu() {
  [ "$(conf_get DB)" = "local" ] || { echo "Dữ liệu đang ở Neon: Neon tự sao lưu, không cần làm ở đây."; return 0; }
  mkdir -p "$BACKUP_DIR"; chmod 700 "$BACKUP_DIR"
  local f; f="$BACKUP_DIR/tyzo-$(date '+%Y%m%d-%H%M').dump"
  if docker exec tyzo-db pg_dump -U tyzo -Fc tyzo > "$f" 2>/dev/null && [ -s "$f" ]; then
    chmod 600 "$f"; xanh "✔ Đã sao lưu: $f ($(du -h "$f" | cut -f1))"
    ls -1t "$BACKUP_DIR"/tyzo-*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f
  else
    rm -f "$f"; do_ "✘ Sao lưu lỗi."; return 1
  fi
}

khoi_phuc() {
  local files f a
  mapfile -t files < <(ls -1t "$BACKUP_DIR"/tyzo-*.dump 2>/dev/null)
  [ "${#files[@]}" -gt 0 ] || { vang "Chưa có bản sao lưu nào."; return 0; }
  echo "Các bản sao lưu (mới nhất trước):"
  local i=1; for f in "${files[@]}"; do echo " $i. $(basename "$f") ($(du -h "$f" | cut -f1))"; i=$((i+1)); done
  read -rp "Chọn số bản muốn khôi phục (bỏ trống để hủy): " a
  [[ "$a" =~ ^[0-9]+$ ]] && [ "$a" -ge 1 ] && [ "$a" -le "${#files[@]}" ] || { echo "Đã hủy."; return 0; }
  f="${files[$((a-1))]}"
  vang "Khôi phục sẽ THAY toàn bộ dữ liệu hiện tại bằng bản $(basename "$f"). Máy sao lưu bản hiện tại trước."
  read -rp "Gõ dong-y để tiếp tục: " a; [ "$a" = "dong-y" ] || { echo "Đã hủy."; return 0; }
  sao_luu || return 1
  dc stop web bridge >/dev/null 2>&1
  docker exec tyzo-db psql -U tyzo -d tyzo -qc "drop schema public cascade; create schema public;" >/dev/null
  docker exec -i tyzo-db pg_restore -U tyzo -d tyzo --no-owner --no-privileges < "$f" 2>/dev/null || true
  dc up -d --no-build >/dev/null 2>&1
  cho_web_ok 180 && xanh "✔ Đã khôi phục, web chạy lại." || do_ "✘ Web chưa lên. Xem nhật ký."
}

bat_sao_luu_dem() {
  printf 'SHELL=/bin/bash\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n47 2 * * * root /usr/local/bin/tyzo sao-luu >> /var/log/tyzo-sao-luu.log 2>&1\n' > "$BACKUP_CRON"
  chmod 644 "$BACKUP_CRON"; xanh "✔ Sao lưu tự động mỗi đêm (giữ 14 bản gần nhất ở $BACKUP_DIR)"
}

hoi_mat_khau_chuyen() {
  local lan_hai
  MAT_KHAU_CHUYEN=""
  while [ "${#MAT_KHAU_CHUYEN}" -lt 12 ]; do
    read -rsp "Đặt mật khẩu cho tệp (ít nhất 12 ký tự, chữ không hiện): " MAT_KHAU_CHUYEN; echo
    [ "${#MAT_KHAU_CHUYEN}" -ge 12 ] || vang "Mật khẩu cần ít nhất 12 ký tự."
  done
  read -rsp "Gõ lại mật khẩu: " lan_hai; echo
  [ "$MAT_KHAU_CHUYEN" = "$lan_hai" ] || { do_ "Hai lần nhập không giống nhau."; MAT_KHAU_CHUYEN=""; return 1; }
}

chep_neu_co() { # chep_neu_co <nguồn> <đích trong thư mục tạm>
  [ -e "$1" ] || return 0
  mkdir -p "$(dirname "$2")"
  cp -aL "$1" "$2"
}

tao_ban_chuyen_vps() (
  tieu_de "Tạo bản sao lưu để chuyển VPS"
  co_lenh openssl && co_lenh tar && co_lenh sha256sum || { do_ "✘ Thiếu openssl, tar hoặc sha256sum."; return 1; }
  hoi_mat_khau_chuyen || return 1
  mkdir -p "$BACKUP_DIR"; chmod 700 "$BACKUP_DIR"
  local tmp noi_dung pass_file out db_kind mode
  tmp="$(mktemp -d)"; noi_dung="$tmp/noi-dung"; pass_file="$tmp/mat-khau"
  mkdir -p "$noi_dung/cau-hinh"; chmod 700 "$tmp" "$noi_dung"
  printf '%s' "$MAT_KHAU_CHUYEN" > "$pass_file"; chmod 600 "$pass_file"; MAT_KHAU_CHUYEN=""
  trap 'rm -rf -- "$tmp"' EXIT INT TERM

  mode="$(che_do)"; db_kind="$(conf_get DB)"
  [ -n "$mode" ] || { do_ "✘ VPS này chưa được thiết lập bằng tyzo."; return 1; }
  printf 'FORMAT=%s\nCREATED=%s\nMODE=%s\nDB=%s\n' \
    "$TRANSFER_FORMAT" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$mode" "${db_kind:-neon}" > "$noi_dung/thong-tin"

  chep_neu_co "$CONF" "$noi_dung/cau-hinh/tyzo.conf"
  [ -f "$noi_dung/cau-hinh/tyzo.conf" ] || printf 'MODE=%s\nDB=%s\n' "$mode" "${db_kind:-neon}" > "$noi_dung/cau-hinh/tyzo.conf"
  chep_neu_co "$WEB_ENV" "$noi_dung/cau-hinh/tyzo-web.env"
  chep_neu_co "$BRIDGE_ENV" "$noi_dung/cau-hinh/bridge.env"
  chep_neu_co /opt/tyzo-vercel.env "$noi_dung/cau-hinh/tyzo-vercel.env"
  chep_neu_co /opt/tyzo-ghi-chu.txt "$noi_dung/cau-hinh/tyzo-ghi-chu.txt"
  # Menu tyzo-ai (nhận dạng TyZo trên Modal): chuỗi bảo vệ, địa chỉ, key Alibaba và phiên đăng nhập Modal.
  # Thiếu tệp này thì cài lại tyzo-ai sẽ tạo chuỗi bảo vệ mới và web không gọi được Modal nữa.
  chep_neu_co /opt/tyzo-ai/tyzo-ai.conf "$noi_dung/cau-hinh/tyzo-ai.conf"
  chep_neu_co /root/.modal.toml "$noi_dung/cau-hinh/modal.toml"
  chep_neu_co "$CADDYFILE" "$noi_dung/cau-hinh/Caddyfile"
  chep_neu_co /opt/tyzo-android-key "$noi_dung/cau-hinh/tyzo-android-key"
  chep_neu_co /etc/cloudflared "$noi_dung/cau-hinh/cloudflared"
  chep_neu_co /etc/systemd/system/cloudflared.service "$noi_dung/cau-hinh/cloudflared.service"
  chep_neu_co "$CRON_FILE" "$noi_dung/cau-hinh/tyzo-tu-cap-nhat"
  chep_neu_co "$BACKUP_CRON" "$noi_dung/cau-hinh/tyzo-sao-luu"
  chep_neu_co /etc/cron.d/tyzo-quet-rui-ro "$noi_dung/cau-hinh/tyzo-quet-rui-ro"

  if [ "$db_kind" = "local" ]; then
    echo "Đang xuất Postgres..."
    db_len || return 1
    docker exec tyzo-db pg_dump -U tyzo --no-owner --no-privileges -Fc tyzo > "$noi_dung/postgres.dump" 2>/dev/null
    [ -s "$noi_dung/postgres.dump" ] || { do_ "✘ Không xuất được Postgres."; return 1; }
  fi

  (cd "$noi_dung" && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
  out="$BACKUP_DIR/tyzo-chuyen-vps-$(date '+%Y%m%d-%H%M%S').tar.enc"
  if tar -C "$noi_dung" -cf - . | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -pass file:"$pass_file" -out "$out"; then
    chmod 600 "$out"
  else
    rm -f "$out"; do_ "✘ Không tạo được tệp sao lưu."; return 1
  fi
  rm -rf -- "$tmp"; trap - EXIT INT TERM
  xanh "✔ Đã tạo: $out ($(du -h "$out" | cut -f1))"
  cat <<TXT
Tệp đã được mã hóa. Hãy giữ mật khẩu riêng, mất mật khẩu thì không mở được.
Chép tệp này sang thư mục /root trên VPS mới, rồi chạy đúng một lệnh:
  bash <(curl -fsSL https://raw.githubusercontent.com/thanhnghiaplay-ai/TyZo_Sub_Project/main/deploy/vps/tyzo.sh) khoi-phuc-vps /root/$(basename "$out")
TXT
)

doc_thong_tin() { [ -f "$1" ] && grep "^$2=" "$1" | tail -1 | cut -d= -f2- || true; }

cai_cloudflared_khong_hoi() {
  co_lenh cloudflared && return 0
  local arch; arch="$(dpkg --print-architecture 2>/dev/null || echo amd64)"
  curl -fsSL -o /tmp/cloudflared.deb "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${arch}.deb" && \
    dpkg -i /tmp/cloudflared.deb >/dev/null 2>&1
  rm -f /tmp/cloudflared.deb
  co_lenh cloudflared
}

khoi_phuc_vps() ( # khoi_phuc_vps <tệp tyzo-chuyen-vps-*.tar.enc>
  local tep="${1:-}" tmp pass_file archive noi_dung format mode db_kind dom dong_y n
  [ -f "$tep" ] || { do_ "✘ Không thấy tệp: ${tep:-chưa nhập đường dẫn}"; return 1; }
  tieu_de "Khôi phục sang VPS này"
  vang "Lệnh này sẽ ghi cấu hình TyZo và dữ liệu Postgres trong bản sao lên VPS này."
  read -rp "Gõ dong-y để tiếp tục: " dong_y
  [ "$dong_y" = "dong-y" ] || { echo "Đã hủy."; return 0; }
  read -rsp "Mật khẩu của tệp (chữ không hiện): " MAT_KHAU_CHUYEN; echo
  tmp="$(mktemp -d)"; pass_file="$tmp/mat-khau"; archive="$tmp/ban-sao.tar"; noi_dung="$tmp/noi-dung"
  chmod 700 "$tmp"; printf '%s' "$MAT_KHAU_CHUYEN" > "$pass_file"; chmod 600 "$pass_file"; MAT_KHAU_CHUYEN=""
  trap 'rm -rf -- "$tmp"' EXIT INT TERM
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass file:"$pass_file" -in "$tep" -out "$archive" 2>/dev/null || \
    { do_ "✘ Sai mật khẩu hoặc tệp bị hỏng."; return 1; }
  tar -tf "$archive" | awk '$0 ~ /^\// || $0 ~ /(^|\/)\.\.(\/|$)/ { loi=1 } END { exit loi }' || \
    { do_ "✘ Tệp có đường dẫn không an toàn."; return 1; }
  tar -tvf "$archive" | awk 'substr($1,1,1) == "l" || substr($1,1,1) == "h" { loi=1 } END { exit loi }' || \
    { do_ "✘ Tệp chứa liên kết không an toàn."; return 1; }
  mkdir -p "$noi_dung"; tar --no-same-owner --no-same-permissions -xf "$archive" -C "$noi_dung"
  awk 'NF != 2 || length($1) != 64 || $2 !~ /^\.\// || $2 ~ /(^|\/)\.\.(\/|$)/ { loi=1 } END { exit loi }' "$noi_dung/SHA256SUMS" || \
    { do_ "✘ Danh sách kiểm tra trong tệp không hợp lệ."; return 1; }
  (cd "$noi_dung" && sha256sum -c SHA256SUMS >/dev/null) || { do_ "✘ Tệp bị thiếu hoặc sai nội dung."; return 1; }
  format="$(doc_thong_tin "$noi_dung/thong-tin" FORMAT)"
  mode="$(doc_thong_tin "$noi_dung/thong-tin" MODE)"
  db_kind="$(doc_thong_tin "$noi_dung/thong-tin" DB)"
  [ "$format" = "$TRANSFER_FORMAT" ] && [[ "$mode" = bridge || "$mode" = full ]] || \
    { do_ "✘ Bản sao lưu không đúng định dạng TyZo."; return 1; }
  [ "$db_kind" != local ] || [ -s "$noi_dung/postgres.dump" ] || { do_ "✘ Bản sao thiếu dữ liệu Postgres."; return 1; }

  echo "Đang cài phần mềm và lấy mã mới nhất..."
  cai_nen || return 1
  lay_ma || return 1
  install -m 600 "$noi_dung/cau-hinh/tyzo.conf" "$CONF"
  [ -f "$noi_dung/cau-hinh/tyzo-web.env" ] && install -m 600 "$noi_dung/cau-hinh/tyzo-web.env" "$WEB_ENV"
  [ -f "$noi_dung/cau-hinh/bridge.env" ] && install -m 600 "$noi_dung/cau-hinh/bridge.env" "$BRIDGE_ENV"
  [ -f "$noi_dung/cau-hinh/tyzo-vercel.env" ] && install -m 600 "$noi_dung/cau-hinh/tyzo-vercel.env" /opt/tyzo-vercel.env
  [ -f "$noi_dung/cau-hinh/tyzo-ghi-chu.txt" ] && install -m 600 "$noi_dung/cau-hinh/tyzo-ghi-chu.txt" /opt/tyzo-ghi-chu.txt
  if [ -f "$noi_dung/cau-hinh/tyzo-ai.conf" ]; then
    mkdir -p /opt/tyzo-ai && chmod 700 /opt/tyzo-ai
    install -m 600 "$noi_dung/cau-hinh/tyzo-ai.conf" /opt/tyzo-ai/tyzo-ai.conf
  fi
  [ -f "$noi_dung/cau-hinh/modal.toml" ] && install -m 600 "$noi_dung/cau-hinh/modal.toml" /root/.modal.toml
  if [ -d "$noi_dung/cau-hinh/tyzo-android-key" ]; then
    mkdir -p /opt/tyzo-android-key; cp -a "$noi_dung/cau-hinh/tyzo-android-key/." /opt/tyzo-android-key/
    find /opt/tyzo-android-key -type d -exec chmod 700 {} +
    find /opt/tyzo-android-key -type f -exec chmod 600 {} +
  fi
  chon_env

  if [ "$mode" = full ] && [ "$db_kind" = local ]; then
    mkdir -p /opt/tyzo-pg
    db_len || return 1
    dc stop web bridge >/dev/null 2>&1 || true
    docker exec tyzo-db psql -U tyzo -d tyzo -qc "drop schema public cascade; create schema public;" >/dev/null
    docker exec -i tyzo-db pg_restore -U tyzo -d tyzo --no-owner --no-privileges < "$noi_dung/postgres.dump" 2>/tmp/tyzo-restore.err || true
    n="$(dem_bang)"
    [ "${n:-0}" -gt 5 ] || { do_ "✘ Khôi phục Postgres chưa thành công:"; tail -5 /tmp/tyzo-restore.err; return 1; }
  fi

  cai_caddy || { do_ "✘ Không cài được Caddy."; return 1; }
  [ -f "$noi_dung/cau-hinh/Caddyfile" ] && install -m 644 "$noi_dung/cau-hinh/Caddyfile" "$CADDYFILE"
  systemctl enable --now caddy >/dev/null 2>&1 || true
  if [ -f "$noi_dung/cau-hinh/cloudflared.service" ]; then
    cai_cloudflared_khong_hoi || { do_ "✘ Không cài được Cloudflare Tunnel."; return 1; }
    if [ -d "$noi_dung/cau-hinh/cloudflared" ]; then
      mkdir -p /etc/cloudflared; cp -a "$noi_dung/cau-hinh/cloudflared/." /etc/cloudflared/
      find /etc/cloudflared -type d -exec chmod 700 {} +
      find /etc/cloudflared -type f -exec chmod 600 {} +
    fi
    install -m 600 "$noi_dung/cau-hinh/cloudflared.service" /etc/systemd/system/cloudflared.service
    systemctl daemon-reload; systemctl enable --now cloudflared >/dev/null 2>&1 || true
  fi

  if [ "$mode" = full ]; then cap_nhat_web || return 1; else cap_nhat_cau_noi || return 1; fi
  [ -f "$noi_dung/cau-hinh/tyzo-tu-cap-nhat" ] && install -m 644 "$noi_dung/cau-hinh/tyzo-tu-cap-nhat" "$CRON_FILE"
  [ -f "$noi_dung/cau-hinh/tyzo-sao-luu" ] && install -m 644 "$noi_dung/cau-hinh/tyzo-sao-luu" "$BACKUP_CRON"
  [ -f "$noi_dung/cau-hinh/tyzo-quet-rui-ro" ] && install -m 644 "$noi_dung/cau-hinh/tyzo-quet-rui-ro" /etc/cron.d/tyzo-quet-rui-ro
  rm -rf -- "$tmp"; trap - EXIT INT TERM
  dom="$(conf_get DOMAIN)"; [ -n "$dom" ] || dom="$(ten_mien)"
  xanh "✔ Đã khôi phục xong trên VPS mới."
  if [ "$(conf_get EDGE)" != tunnel ] && [ -n "$dom" ]; then
    vang "Việc cuối: đổi bản ghi A của $dom trên Cloudflare sang IP mới: $(ip_vps)"
  fi
)

menu_du_lieu() {
  tieu_de "Sao lưu / Chuyển VPS"
  echo "Dữ liệu đang ở: $( [ "$(conf_get DB)" = "local" ] && echo "Postgres trên VPS" || echo "Neon")"
  echo " 1. Sao lưu ngay"
  echo " 2. Khôi phục từ bản sao lưu"
  echo " 3. Chép dữ liệu từ Neon về VPS (Neon chỉ bị đọc)"
  echo " 4. Chép dữ liệu từ VPS lên một Neon trống (khi quay lại Vercel)"
  echo " 5. Tạo tệp có mật khẩu để chuyển toàn bộ sang VPS mới"
  echo " 6. Khôi phục tệp chuyển VPS trên máy này"
  echo " 0. Quay lại"
  read -rp "Chọn số: " c
  case "$c" in
    1) sao_luu ;;
    2) khoi_phuc ;;
    3) [ "$(conf_get DB)" = "local" ] || { vang "Chỉ dùng khi dữ liệu đặt trên VPS."; return 0; }
       local u; read -rsp "Dán chuỗi kết nối Neon (chữ không hiện): " u; echo; chep_tu_neon "$(echo "$u" | tr -d '[:space:]')" && dc up -d --no-build >/dev/null 2>&1 ;;
    4) [ "$(conf_get DB)" = "local" ] || { vang "Dữ liệu đang ở Neon sẵn rồi."; return 0; }
       local u; read -rsp "Dán chuỗi kết nối Neon TRỐNG (chữ không hiện): " u; echo; chep_len_neon "$(echo "$u" | tr -d '[:space:]')" ;;
    5) tao_ban_chuyen_vps ;;
    6) local f; read -rp "Đường dẫn tệp .tar.enc: " f; khoi_phuc_vps "$f" ;;
  esac
}

# =====================================================================
# Biến của web: hỏi từng nhóm, ghi vào tệp, không in giá trị
# =====================================================================
hoi_an() { # hoi_an "câu hỏi" → đọc ẩn, in giá trị đã bỏ khoảng trắng
  local v; read -rsp "$1" v; echo >&2; echo "$v" | tr -d '[:space:]'
}

hoi_bien_web() { # hoi_bien_web <tệp>: hỏi các biến tùy chọn
  local f="$1" v
  ENV_FILE="$f"
  if [ -z "$(doc_bien ADMIN_EMAIL)" ]; then
    read -rp "Email tài khoản Admin (đúng email Chủ đăng nhập web): " v
    [ -n "$v" ] && dat_bien ADMIN_EMAIL "$(echo "$v" | tr -d '[:space:]')"
  fi
  cat <<'TXT'
Gửi thư (xác minh, quên mật khẩu): nếu đã lưu ở Admin → Thư thì dữ liệu chép sang đã có, bỏ qua được.
TXT
  if hoi_co "Nhập cách gửi thư bằng biến môi trường?"; then
    read -rp "  MAIL_FROM (vd TyZo <no-reply@tyzo.site>): " v; [ -n "$v" ] && dat_bien MAIL_FROM "$v"
    echo "  Chọn nhà: 1 Resend  2 SendGrid  3 Brevo  4 Mailgun  5 Postmark  6 SMTP (vd Gmail)"
    read -rp "  Số: " v
    case "$v" in
      1) dat_bien RESEND_API_KEY "$(hoi_an '  RESEND_API_KEY: ')" ;;
      2) dat_bien SENDGRID_API_KEY "$(hoi_an '  SENDGRID_API_KEY: ')" ;;
      3) dat_bien BREVO_API_KEY "$(hoi_an '  BREVO_API_KEY: ')" ;;
      4) dat_bien MAILGUN_API_KEY "$(hoi_an '  MAILGUN_API_KEY: ')"; read -rp "  MAILGUN_DOMAIN: " v; dat_bien MAILGUN_DOMAIN "$v" ;;
      5) dat_bien POSTMARK_TOKEN "$(hoi_an '  POSTMARK_TOKEN: ')" ;;
      6) read -rp "  SMTP_HOST (vd smtp.gmail.com): " v; dat_bien SMTP_HOST "$v"
         read -rp "  SMTP_PORT (vd 465): " v; dat_bien SMTP_PORT "$v"
         read -rp "  SMTP_USER: " v; dat_bien SMTP_USER "$v"
         dat_bien SMTP_PASS "$(hoi_an '  SMTP_PASS (mật khẩu ứng dụng): ')" ;;
    esac
  fi
  if hoi_co "Có dùng Cloudflare R2 (dán link file lớn) qua biến môi trường?"; then
    read -rp "  R2_ACCOUNT_ID: " v; dat_bien R2_ACCOUNT_ID "$v"
    read -rp "  R2_ACCESS_KEY_ID: " v; dat_bien R2_ACCESS_KEY_ID "$v"
    dat_bien R2_SECRET_ACCESS_KEY "$(hoi_an '  R2_SECRET_ACCESS_KEY: ')"
    read -rp "  R2_BUCKET: " v; dat_bien R2_BUCKET "$v"
  fi
  read -rp "Workspace ID Alibaba (vd ws-...; bỏ trống nếu đã nhập ở Admin): " v
  [ -n "$v" ] && dat_bien ALIBABA_WORKSPACE_ID "$(echo "$v" | tr -d '[:space:]')"
  read -rp "Đường tải tệp cài Android https (bỏ trống nếu chưa có): " v
  [ -n "$v" ] && dat_bien ANDROID_APK_URL "$(echo "$v" | tr -d '[:space:]')"
  xanh "✔ Đã lưu các biến (không in giá trị)"
}

hoi_bi_mat_dang_nhap() { # BETTER_AUTH_SECRET: dán bản cũ (khách khỏi đăng nhập lại) hoặc tạo mới
  [ -n "$(doc_bien BETTER_AUTH_SECRET)" ] && { xanh "✔ Đã có BETTER_AUTH_SECRET"; return 0; }
  echo "BETTER_AUTH_SECRET: chuỗi ký phiên đăng nhập. Dùng chuỗi mới thì khách đăng nhập lại một lần (mật khẩu không đổi)."
  if hoi_co "Bạn có chuỗi BETTER_AUTH_SECRET cũ trong ghi chú?"; then
    local v=""; while [ "${#v}" -lt 16 ]; do v="$(hoi_an 'Dán chuỗi (chữ không hiện): ')"; done
    dat_bien BETTER_AUTH_SECRET "$v"
  else
    dat_bien BETTER_AUTH_SECRET "$(openssl rand -hex 32)"
    vang "Đã tạo chuỗi mới. Khách đăng nhập lại một lần."
  fi
}

# =====================================================================
# Thiết lập WEB ĐẦY ĐỦ (và chế độ CHẠY THỬ)
# =====================================================================
thiet_lap_web() { # thiet_lap_web [thu]
  local thu="${1:-}" ip dom edge db url
  TONG=10
  clear 2>/dev/null || true
  if [ "$thu" = "thu" ]; then
    printf '\033[1;33mCHẠY THỬ WEB ĐẦY ĐỦ TRÊN VPS NÀY\033[0m\n'
    cat <<'TXT'
Dựng một bản web hoàn chỉnh trên VPS này để thử, KHÔNG đụng web thật:
  • Dữ liệu: chép từ Neon về VPS (Neon chỉ bị đọc), hoặc dùng cơ sở dữ liệu trống
  • Tên miền: dùng tên miền phụ riêng cho bản thử, vd thu.tyzo.site
  • Web thật trên Vercel vẫn chạy như cũ. Thử xong có thể hủy VPS này.
Lưu ý: bản thử có dữ liệu thật (tài khoản, key Alibaba của phòng). Chỉ mình bạn dùng; dịch thử vẫn tốn tiền Alibaba như thật.
TXT
  else
    printf '\033[1;33mTHIẾT LẬP WEB ĐẦY ĐỦ TRÊN VPS (không cần Vercel)\033[0m\n'
    cat <<'TXT'
Web, cầu nối Dịch trực tiếp (và cơ sở dữ liệu nếu chọn) chạy hết trên VPS này. Khoảng 30–40 phút.
Nên chạy THỬ trước (menu mục 12) trên một VPS khác.
Nên dùng VPS RAM từ 2 GB, ổ từ 25 GB. Ít hơn vẫn chạy được nhưng đóng gói chậm.
TXT
  fi
  hoi_co "Bắt đầu?" || return 0

  buoc 1 "Cài phần mềm (máy tự làm)"
  cai_nen || return 1

  buoc 2 "Tải mã của web (máy tự làm)"
  lay_ma || return 1
  if [ "$(che_do)" = "bridge" ] && docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
    vang "VPS này đang chạy chỉ cầu nối. Chuyển sang web đầy đủ (cầu nối nằm trong đó)."
    docker rm -f "$NAME" >/dev/null 2>&1 || true
  fi
  conf_set MODE full; ENV_FILE="$WEB_ENV"; touch "$WEB_ENV"; chmod 600 "$WEB_ENV"

  buoc 3 "Chọn cách bật https"
  echo " 1. Caddy (khuyên dùng): tên miền trỏ thẳng về VPS, đám mây xám"
  echo " 2. Cloudflare Tunnel: không cần mở cổng, dùng khi cách 1 không chạy"
  read -rp "Chọn 1 hoặc 2 [1]: " edge
  [ "$edge" = "2" ] && edge=tunnel || edge=caddy
  conf_set EDGE "$edge"

  buoc 4 "Tên miền của web"
  dom="$(conf_get DOMAIN)"
  if [ -n "$dom" ] && hoi_co "Dùng tên miền $dom?"; then :; else
    if [ "$thu" = "thu" ]; then dom="$(hoi_ten_mien 'Tên miền cho bản THỬ (vd thu.tyzo.site): ')"
    else dom="$(hoi_ten_mien 'Tên miền của web (vd tyzo.site hoặc app.tyzo.site): ')"; fi
  fi
  conf_set DOMAIN "$dom"
  cai_caddy || { do_ "✘ Không cài được Caddy."; return 1; }
  ip="$(ip_vps)"
  if [ "$edge" = "tunnel" ]; then
    viet_caddyfile "$dom" full tunnel || return 1
    cai_tunnel || return 1
  else
    huong_dan_dns "$dom" "$ip"
    [ "$thu" != "thu" ] && vang "Đổi bản ghi này là khách bắt đầu vào web trên VPS. Làm khi bước 8 đã xong cũng được: chọn k ở câu hỏi kiểm."
    ip_dung "$dom" "$ip"
    viet_caddyfile "$dom" full caddy || return 1
  fi

  buoc 5 "Cơ sở dữ liệu"
  db="$(conf_get DB)"
  if [ -n "$db" ] && [ -n "$(doc_bien DATABASE_URL)" ] && hoi_co "Giữ cơ sở dữ liệu đang dùng ($db)?"; then :; else
    if [ "$thu" = "thu" ]; then
      echo " 1. Chép dữ liệu thật từ Neon về VPS (khuyên dùng để thử đúng như thật; Neon chỉ bị đọc)"
      echo " 2. Cơ sở dữ liệu trống (tự đăng ký tài khoản mới)"
      read -rp "Chọn 1 hoặc 2 [1]: " c; [ "$c" = "2" ] && c=trong || c=chep
    else
      echo " 1. Giữ trên Neon (khuyên dùng): không chuyển dữ liệu, Neon tự sao lưu"
      echo " 2. Đặt trên VPS, chép dữ liệu từ Neon (tự sao lưu mỗi đêm trên VPS)"
      echo " 3. Đặt trên VPS, cơ sở dữ liệu trống"
      read -rp "Chọn 1, 2 hoặc 3 [1]: " c
      case "$c" in 2) c=chep ;; 3) c=trong ;; *) c=neon ;; esac
    fi
    if [ "$c" = "neon" ]; then
      cat <<'TXT'
Neon (console.neon.tech) → project → Connect → Role neondb_owner, bật Connection pooling → Show password → Copy snippet.
KHÔNG bấm Reset password.
TXT
      url=""; while [[ "$url" != postgres://* && "$url" != postgresql://* ]]; do url="$(hoi_an 'Dán DATABASE_URL (chữ không hiện): ')"; done
      dat_bien DATABASE_URL "$url"; conf_set DB neon
    else
      conf_set DB local
      [ -n "$(conf_get DB_PASSWORD)" ] || conf_set DB_PASSWORD "$(openssl rand -hex 24)"
      dat_bien DATABASE_URL "postgres://tyzo:$(conf_get DB_PASSWORD)@db:5432/tyzo?sslmode=disable"
      mkdir -p /opt/tyzo-pg
      if [ "$c" = "chep" ]; then
        if [ "$thu" != "thu" ]; then
          vang "Để không mất đơn hay tài khoản mới phát sinh trong lúc chép: trên web cũ vào Admin → bật Bảo trì TOÀN WEB trước."
          doi_enter "Bật bảo trì (hoặc bỏ qua nếu chấp nhận)."
        fi
        echo "Lấy chuỗi kết nối Neon: Neon → Connect → Show password → Copy snippet."
        url=""; while [[ "$url" != postgres://* && "$url" != postgresql://* ]]; do url="$(hoi_an 'Dán chuỗi kết nối Neon (chữ không hiện): ')"; done
        chep_tu_neon "$url" || { do_ "Chép dữ liệu lỗi. Chụp màn hình gửi Claude, hoặc chạy lại mục này."; return 1; }
      else
        db_len || return 1
      fi
    fi
  fi

  buoc 6 "Chuỗi bí mật và Admin"
  hoi_bi_mat_dang_nhap
  [ -n "$(doc_bien LIVE_BRIDGE_SECRET)" ] || dat_bien LIVE_BRIDGE_SECRET "$(openssl rand -hex 32)"
  dat_bien LIVE_BRIDGE_URL "wss://$dom/live"
  dat_bien BETTER_AUTH_URL "https://$dom"
  dat_bien VITE_AUTH_ENABLED true
  dat_bien VITE_PUBLIC_HOSTNAME "$dom"
  xanh "✔ Chuỗi bí mật và địa chỉ web đã đặt"

  buoc 7 "Các tùy chọn (thư, R2, Alibaba, Android)"
  hoi_bien_web "$WEB_ENV"

  buoc 8 "Đóng gói và chạy web (máy tự làm, 5–15 phút)"
  cap_nhat_web || { do_ "✘ Web chưa chạy. Chọn 3 (nhật ký) và chụp màn hình gửi Claude."; return 1; }

  buoc 9 "Kiểm tra từ Internet vào"
  local ok="" i
  for i in $(seq 1 36); do
    [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "https://$dom/" 2>/dev/null)" = "200" ] && { ok=1; break; }
    [ "$i" = 1 ] && echo "Đang chờ https (tối đa 3 phút)..."
    sleep 5
  done
  if [ -n "$ok" ]; then xanh "✔ https://$dom mở được"
  else
    do_ "✘ Chưa mở được https://$dom."
    [ "$edge" = "caddy" ] && vang "Kiểm bản ghi Cloudflare (đám mây XÁM, đúng IP). Vẫn không được thì chạy lại mục này và chọn 2 (Cloudflare Tunnel) ở bước 3."
  fi

  buoc 10 "Hoàn tất"
  [ -f "$CRON_FILE" ] || { printf 'SHELL=/bin/bash\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n17 3 * * * root /usr/local/bin/tyzo cap-nhat-tu-dong >> %s 2>&1\n' "$LOG_FILE" > "$CRON_FILE"; chmod 644 "$CRON_FILE"; xanh "✔ Tự cập nhật mỗi đêm"; }
  [ "$(conf_get DB)" = "local" ] && { bat_sao_luu_dem; sao_luu; }
  printf 'SHELL=/bin/bash\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n37 1 * * * root /usr/local/bin/tyzo quet-rui-ro >> /var/log/tyzo-quet-rui-ro.log 2>&1\n' > /etc/cron.d/tyzo-quet-rui-ro
  chmod 644 /etc/cron.d/tyzo-quet-rui-ro; xanh "✔ Quét vi phạm mỗi đêm"
  kiem_tra_web
  cat > /opt/tyzo-ghi-chu.txt <<TXT
Web đầy đủ trên VPS — thiết lập ngày $(date '+%d/%m/%Y') $( [ "$thu" = "thu" ] && echo "(BẢN THỬ)")
Web: https://$dom    IP VPS: $ip    https: $edge    Dữ liệu: $(conf_get DB)
Cầu nối Dịch trực tiếp: wss://$dom/live (nằm sẵn trong VPS, không cần Fly)
Cổng thanh toán (đổi ở trang Sepay/Casso khi chuyển web thật): https://$dom/api/pay/sepay · https://$dom/api/pay/casso
Ứng dụng Android: ô «Địa chỉ web» gõ $dom
Quản lý: gõ «tyzo». Bí mật ở $WEB_ENV và $CONF (không in ra đây).
TXT
  echo; cat /opt/tyzo-ghi-chu.txt
  if [ "$thu" = "thu" ]; then
    cat <<TXT

THỬ NGAY trên điện thoại hoặc máy tính:
  1. Mở https://$dom → đăng nhập bằng tài khoản thật (dữ liệu đã chép) hoặc đăng ký mới
  2. Vào Tài khoản, Dịch trực tiếp, Admin… xem mọi thứ như web thật
  3. Ứng dụng Android: gỡ liên kết, gõ địa chỉ $dom, lấy mã ở Tài khoản của bản thử
Thử xong mọi thứ ổn: trên VPS chính thức chạy «tyzo» → mục 11.
TXT
  else
    cat <<TXT

Việc còn lại để chuyển hẳn:
  1. Sepay/Casso: đổi địa chỉ nhận báo chuyển khoản theo dòng «Cổng thanh toán» ở trên
  2. Web cũ trên Vercel: vào Admin tắt Bảo trì (nếu đã bật) KHÔNG cần — khách đã sang VPS; để Vercel chạy vài ngày rồi xóa
  3. Ứng dụng Android: địa chỉ web đổi thì khách gõ lại địa chỉ mới
TXT
  fi
  xanh "XONG. Từ nay chỉ cần nhớ: tyzo"
}

tat_web_day_du() {
  dc down >/dev/null 2>&1 || true
  rm -f "$BACKUP_CRON"
}

cap_nhat_web() { # cap_nhat_web [tu-dong]
  local tu_dong="${1:-}" truoc sau
  tieu_de "Cập nhật web"
  [ -d "$DIR/.git" ] || { do_ "Chưa có mã. Chọn mục 11."; return 1; }
  truoc="$(git -C "$DIR" rev-parse HEAD)"
  git -C "$DIR" fetch -q origin main && git -C "$DIR" reset -q --hard origin/main || { do_ "Không tải được mã mới (kiểm mạng)."; return 1; }
  sau="$(git -C "$DIR" rev-parse HEAD)"
  if [ "$tu_dong" = "tu-dong" ] && [ "$truoc" = "$sau" ] && web_ok && [ "$(suc_khoe)" = "ok" ]; then
    echo "Không có bản mới, web vẫn chạy tốt."; return 0
  fi
  [ "$(conf_get DB)" = "local" ] && [ "$tu_dong" = "tu-dong" ] && sao_luu >/dev/null
  local img
  for img in tyzo-web tyzo-bridge; do docker image inspect "$img:latest" >/dev/null 2>&1 && docker tag "$img:latest" "$img:cu"; done
  echo "Đang đóng gói (5–15 phút, VPS yếu thì lâu hơn)..."
  if ! dc build > /tmp/tyzo-build.log 2>&1; then
    tail -n 20 /tmp/tyzo-build.log | sed 's/^/   /'
    do_ "Đóng gói lỗi (dòng trên là lý do). Bản đang chạy giữ nguyên."; return 1
  fi
  dc up -d --no-build >/dev/null 2>&1
  if cho_web_ok 240; then
    xanh "✔ Web và cầu nối chạy, trả lời ok."
    docker image prune -f >/dev/null 2>&1 || true
    return 0
  fi
  do_ "✘ Bản mới không chạy lên. Đang quay về bản cũ..."
  docker logs --tail 25 tyzo-web 2>&1 | sed 's/^/   /'
  for img in tyzo-web tyzo-bridge; do docker image inspect "$img:cu" >/dev/null 2>&1 && docker tag "$img:cu" "$img:latest"; done
  dc up -d --no-build >/dev/null 2>&1
  cho_web_ok 180 && vang "Đã quay về bản cũ. Chụp các dòng lỗi phía trên gửi Claude." || do_ "Bản cũ cũng không chạy. Xem nhật ký (mục 3)."
  return 1
}

kiem_tra_web() {
  tieu_de "Kiểm tra (web đầy đủ)"
  local loi=0 dom c
  dom="$(conf_get DOMAIN)"
  co_lenh docker && systemctl is-active --quiet docker && xanh "✔ Docker đang chạy" || { do_ "✘ Docker chưa chạy"; loi=1; }
  for c in tyzo-web tyzo-bridge $( [ "$(conf_get DB)" = "local" ] && echo tyzo-db ); do
    docker ps --format '{{.Names}}' | grep -qx "$c" && xanh "✔ $c đang chạy" || { do_ "✘ $c không chạy (mục 6 Khởi động lại)"; loi=1; }
  done
  web_ok && xanh "✔ Web trả lời" || { do_ "✘ Web không trả lời (mục 3 nhật ký)"; loi=1; }
  [ "$(suc_khoe)" = "ok" ] && xanh "✔ Cầu nối trả lời ok" || { do_ "✘ Cầu nối không trả lời"; loi=1; }
  systemctl is-active --quiet caddy && xanh "✔ Caddy đang chạy" || { do_ "✘ Caddy chưa chạy"; loi=1; }
  [ "$(conf_get EDGE)" = "tunnel" ] && { systemctl is-active --quiet cloudflared && xanh "✔ Cloudflare Tunnel đang chạy" || { do_ "✘ Tunnel chưa chạy"; loi=1; }; }
  if [ -n "$dom" ]; then
    [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$dom/" 2>/dev/null)" = "200" ] && xanh "✔ https://$dom mở được" || { do_ "✘ https://$dom chưa mở được"; loi=1; }
  fi
  ENV_FILE="$WEB_ENV"
  for c in DATABASE_URL BETTER_AUTH_SECRET BETTER_AUTH_URL LIVE_BRIDGE_SECRET ADMIN_EMAIL; do
    [ -n "$(doc_bien "$c")" ] && xanh "✔ Có $c" || { do_ "✘ Thiếu $c (mục 4)"; loi=1; }
  done
  if [ "$(conf_get DB)" = "local" ]; then
    local moi; moi="$(ls -1t "$BACKUP_DIR"/tyzo-*.dump 2>/dev/null | head -1)"
    [ -n "$moi" ] && echo "   Bản sao lưu mới nhất: $(basename "$moi")" || vang "   Chưa có bản sao lưu (mục 13)"
  fi
  [ -f "$CRON_FILE" ] && echo "   Tự cập nhật mỗi đêm: BẬT" || echo "   Tự cập nhật mỗi đêm: tắt (mục 8)"
  [ -f /etc/cron.d/tyzo-quet-rui-ro ] && echo "   Quét vi phạm mỗi đêm: BẬT" || echo "   Quét vi phạm mỗi đêm: tắt (mục 16)"
  echo "   Bản mã: $(git -C "$DIR" log -1 --format='%h %cd' --date=format:'%d/%m/%Y %H:%M' 2>/dev/null)"
  echo "   Ổ đĩa còn trống: $(df -h / | awk 'NR==2 {print $4}') · RAM còn: $(free -h | awk '/^Mem/ {print $7}')"
  [ "$loi" = 0 ] && xanh "Tất cả đều ổn." || vang "Có mục chưa ổn, xem các dòng ✘ ở trên."
  return "$loi"
}

# =====================================================================
# Đưa web lên một tài khoản Vercel (mới hoặc khác)
# =====================================================================
dua_len_vercel() {
  tieu_de "Đưa web lên tài khoản Vercel"
  cat <<'TXT'
Dùng khi muốn chuyển web sang tài khoản Vercel khác (hoặc quay lại Vercel từ VPS).
Cần: Docker trên VPS này (máy tự cài), mã truy cập Vercel, cơ sở dữ liệu Neon (Vercel không dùng được Postgres trên VPS).
Lấy mã truy cập: vercel.com (đăng nhập tài khoản đích) → ảnh đại diện → Account Settings → Tokens → Create → chép.
TXT
  hoi_co "Tiếp tục?" || return 0
  co_lenh docker || cai_nen || return 1
  [ -d "$DIR/.git" ] || lay_ma || return 1
  git -C "$DIR" fetch -q origin main && git -C "$DIR" reset -q --hard origin/main
  local tok proj scope dom f v
  tok="$(hoi_an 'Dán mã truy cập Vercel (chữ không hiện): ')"
  [ -n "$tok" ] || { do_ "Chưa có mã."; return 1; }
  read -rp "Tên project trên Vercel [tyzo-sub]: " proj; proj="${proj:-tyzo-sub}"
  read -rp "Tên nhóm (team) trên Vercel, bỏ trống nếu là tài khoản cá nhân: " scope
  read -rp "Tên miền riêng cho web (bỏ trống để dùng tên .vercel.app): " dom
  dom="$(echo "$dom" | tr 'A-Z' 'a-z' | sed 's#^https\?://##; s#/.*##; s/ //g')"

  f="/opt/tyzo-vercel.env"; touch "$f"; chmod 600 "$f"
  if [ -s "$WEB_ENV" ] && hoi_co "Dùng lại các biến đã có ở web trên VPS này?"; then
    grep -v '^\(LIVE_BRIDGE_URL\|BETTER_AUTH_URL\|VITE_PUBLIC_HOSTNAME\|DATABASE_URL\)=' "$WEB_ENV" > "$f"
  fi
  ENV_FILE="$f"
  echo "Cơ sở dữ liệu cho Vercel phải là Neon (Neon → Connect → Show password → Copy snippet)."
  v=""; while [[ "$v" != postgres://* && "$v" != postgresql://* ]] || [[ "$v" == *"@db:"* ]]; do v="$(hoi_an 'Dán DATABASE_URL của Neon (chữ không hiện): ')"; done
  dat_bien DATABASE_URL "$v"
  hoi_bi_mat_dang_nhap
  dat_bien VITE_AUTH_ENABLED true
  if [ -n "$dom" ]; then dat_bien BETTER_AUTH_URL "https://$dom"; else
    # Không có tên miền riêng: Better Auth tự nhận địa chỉ *.vercel.app.
    grep -v '^BETTER_AUTH_URL=' "$f" > "$f.tmp"; cat "$f.tmp" > "$f"; rm -f "$f.tmp"
  fi
  # Cầu nối Dịch trực tiếp: dùng cầu nối trên VPS này nếu có.
  local cau=""
  if [ "$(che_do)" = "full" ]; then cau="$(conf_get DOMAIN)"; ENV_FILE="$WEB_ENV"; v="$(doc_bien LIVE_BRIDGE_SECRET)"; ENV_FILE="$f"
  elif [ -f "$BRIDGE_ENV" ]; then cau="$(ten_mien)"; ENV_FILE="$BRIDGE_ENV"; v="$(doc_bien LIVE_BRIDGE_SECRET)"; ENV_FILE="$f"; fi
  if [ -n "$cau" ] && [ -n "$v" ] && hoi_co "Dùng cầu nối Dịch trực tiếp trên VPS này (wss://$cau/live)?"; then
    dat_bien LIVE_BRIDGE_URL "wss://$cau/live"; dat_bien LIVE_BRIDGE_SECRET "$v"
  else
    read -rp "LIVE_BRIDGE_URL (vd wss://realtimehub.tyzo.site/live, bỏ trống nếu chưa có): " v
    [ -n "$v" ] && { dat_bien LIVE_BRIDGE_URL "$v"; dat_bien LIVE_BRIDGE_SECRET "$(hoi_an 'LIVE_BRIDGE_SECRET của cầu nối đó (chữ không hiện): ')"; }
  fi
  hoi_bien_web "$f"

  echo "Đang đưa lên Vercel (5–10 phút)..."
  mkdir -p /tmp/tyzo-vc; chmod 700 /tmp/tyzo-vc
  cp "$f" /tmp/tyzo-vc/env
  cat > /tmp/tyzo-vc/chay.sh <<'SH'
set -u
V="npx -y vercel@latest --token $TOK ${SCOPE:+--scope $SCOPE}"
$V link --yes --project "$PROJ" >/dev/null 2>&1 || { echo "LOI: không tạo hoặc nối được project (kiểm mã truy cập, tên nhóm)"; exit 1; }
while IFS= read -r line; do
  [ -z "$line" ] && continue
  k="${line%%=*}"; val="${line#*=}"
  $V env rm "$k" production --yes >/dev/null 2>&1 || true
  printf '%s' "$val" | $V env add "$k" production >/dev/null 2>&1 && echo "  đã đặt $k" || echo "  LOI khi đặt $k"
done < /x/env
$V deploy --prod --yes 2>&1 | tail -n 5
if [ -n "${DOM:-}" ]; then $V domains add "$DOM" "$PROJ" 2>&1 | tail -n 3; fi
SH
  docker run --rm -v "$DIR":/app -v /tmp/tyzo-vc:/x -w /app -e TOK="$tok" -e PROJ="$proj" -e SCOPE="$scope" -e DOM="$dom" node:22 bash /x/chay.sh
  local kq=$?
  rm -rf /tmp/tyzo-vc
  if [ "$kq" != 0 ]; then do_ "✘ Chưa đưa lên được. Chụp màn hình gửi Claude."; return 1; fi
  cat <<TXT

Xong phần máy làm. Việc còn lại:
  1. Vào vercel.com → project «$proj» → Deployments: dòng mới nhất phải «Ready».
  2. Settings → Functions (hoặc General) → Region: Singapore (sin1) nếu chưa đúng (đã ghi trong vercel.json).
TXT
  [ -n "$dom" ] && cat <<TXT
  3. Cloudflare → DNS: bản ghi cho $dom → Type CNAME, Target cname.vercel-dns.com (tên miền chính thì A 76.76.21.21), đám mây XÁM.
     Vercel → Settings → Domains phải hiện «Valid Configuration».
TXT
  cat <<'TXT'
  4. Muốn mỗi lần sửa mã tự lên Vercel: Settings → Git → Connect Git Repository → chọn kho TyZo_Sub_Project.
     Không nối Git thì chạy lại mục này để đưa bản mới lên.
  5. Sepay/Casso: đổi địa chỉ nhận báo chuyển khoản sang https://<tên miền>/api/pay/sepay (hoặc /casso).
TXT
  echo "Mã truy cập Vercel không được lưu trên VPS. Nên xóa token đó trên Vercel nếu không dùng nữa."
}

# =====================================================================
# Khóa ký ứng dụng Android (để bản mới cài đè được bản cũ, và để GitHub tự đăng bản phát hành)
# =====================================================================
KEY_DIR="/opt/tyzo-android-key"
REPO_SLUG="thanhnghiaplay-ai/TyZo_Sub_Project"

cai_gh() {
  co_lenh gh && return 0
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /usr/share/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list
  apt_cai gh
}

tao_khoa_android() {
  tieu_de "Khóa ký ứng dụng Android"
  cat <<'TXT'
Khóa ký giúp mọi bản ứng dụng sau cài đè lên bản cũ (khách khỏi gỡ, khỏi liên kết lại),
và cho GitHub tự đăng tệp cài để web hiện nút tải và ứng dụng tự báo cập nhật.
Chỉ tạo MỘT lần. Tạo khóa khác về sau thì khách phải gỡ ứng dụng cài lại.
TXT
  co_lenh docker || cai_nen || return 1
  mkdir -p "$KEY_DIR"; chmod 700 "$KEY_DIR"
  local pass
  if [ -f "$KEY_DIR/tyzo.jks" ] && [ -f "$KEY_DIR/matkhau" ]; then
    xanh "✔ Đã có khóa ký trên VPS này ($KEY_DIR), dùng lại khóa đó."
    pass="$(cat "$KEY_DIR/matkhau")"
  else
    hoi_co "Tạo khóa ký mới?" || return 0
    pass="$(openssl rand -hex 16)"
    docker run --rm -v "$KEY_DIR":/k eclipse-temurin:17-jre keytool -genkeypair -keystore /k/tyzo.jks -storetype PKCS12 \
      -alias tyzo -keyalg RSA -keysize 2048 -validity 10000 -storepass "$pass" -keypass "$pass" \
      -dname "CN=TyZo Sub, O=TyZo, C=VN" >/dev/null 2>&1
    [ -s "$KEY_DIR/tyzo.jks" ] || { do_ "✘ Không tạo được khóa."; return 1; }
    printf '%s' "$pass" > "$KEY_DIR/matkhau"; chmod 600 "$KEY_DIR"/*
    xanh "✔ Đã tạo khóa ký, cất ở $KEY_DIR (chỉ root đọc được)"
  fi
  echo
  echo "Nạp khóa vào GitHub:"
  echo " 1. Tự động (khuyên dùng): dán một mã GitHub, máy tự nạp 4 bí mật và chạy đóng gói"
  echo " 2. Tay: máy in 4 giá trị để bạn tự dán ở GitHub (chuỗi dài, khó chép trên điện thoại)"
  read -rp "Chọn 1 hoặc 2 [1]: " c
  if [ "$c" = "2" ]; then
    cat <<'TXT'
GitHub → kho TyZo_Sub_Project → Settings → Secrets and variables → Actions → New repository secret.
Tạo 4 bí mật với tên và giá trị dưới đây. KHÔNG chụp màn hình gửi ai.
TXT
    echo "ANDROID_KEY_ALIAS = tyzo"
    echo "ANDROID_KEYSTORE_PASSWORD = $pass"
    echo "ANDROID_KEY_PASSWORD = $pass"
    echo "ANDROID_KEYSTORE_BASE64 = (cả khối dưới, liền một dòng)"
    base64 -w0 "$KEY_DIR/tyzo.jks"; echo
    doi_enter "Dán xong ở GitHub."
    clear 2>/dev/null
  else
    cat <<'TXT'
Tạo mã GitHub (dùng một lần rồi xóa):
  github.com → ảnh đại diện → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token
  • Repository access: Only select repositories → TyZo_Sub_Project
  • Permissions → Repository permissions: Secrets = Read and write; Actions = Read and write
  • Generate token → chép
TXT
    local tok; tok="$(hoi_an 'Dán mã GitHub (chữ không hiện): ')"
    [ -n "$tok" ] || { do_ "Chưa có mã."; return 1; }
    cai_gh || { do_ "✘ Không cài được công cụ GitHub. Chọn cách 2 (tay)."; return 1; }
    local ok=1
    printf '%s' "tyzo" | GH_TOKEN="$tok" gh secret set ANDROID_KEY_ALIAS -R "$REPO_SLUG" >/dev/null 2>&1 || ok=0
    printf '%s' "$pass" | GH_TOKEN="$tok" gh secret set ANDROID_KEYSTORE_PASSWORD -R "$REPO_SLUG" >/dev/null 2>&1 || ok=0
    printf '%s' "$pass" | GH_TOKEN="$tok" gh secret set ANDROID_KEY_PASSWORD -R "$REPO_SLUG" >/dev/null 2>&1 || ok=0
    base64 -w0 "$KEY_DIR/tyzo.jks" | GH_TOKEN="$tok" gh secret set ANDROID_KEYSTORE_BASE64 -R "$REPO_SLUG" >/dev/null 2>&1 || ok=0
    if [ "$ok" = 1 ]; then xanh "✔ Đã nạp 4 bí mật vào GitHub"; else do_ "✘ Chưa nạp được (kiểm quyền Secrets của mã). Chọn cách 2 (tay)."; return 1; fi
    if GH_TOKEN="$tok" gh workflow run android-thu.yml -R "$REPO_SLUG" --ref main >/dev/null 2>&1; then
      xanh "✔ Đã cho GitHub đóng gói và đăng bản phát hành (khoảng 3 phút)"
    else
      vang "Chưa tự chạy đóng gói được. Vào GitHub → Actions → Android thử → Run workflow (nhánh main)."
    fi
    vang "Xóa mã GitHub vừa dùng: github.com → Settings → Developer settings → Fine-grained tokens → Delete."
  fi
  cat <<'TXT'

Sau khi GitHub đóng gói xong (Actions → Android thử, dấu tích xanh):
  • Trang Tài khoản trên web hiện nút «Tải tệp cài».
  • Ứng dụng đang cài hiện thẻ «Có bản mới» → Cập nhật ngay.
    Lần ĐẦU đổi sang khóa này: máy báo không cài đè được → gỡ ứng dụng, cài bản mới, liên kết lại (chỉ một lần).
Giữ khóa: tệp ở /opt/tyzo-android-key trên VPS này. Đổi VPS thì chép thư mục đó sang VPS mới để dùng lại.
TXT
}

# =====================================================================
# Quét vi phạm mỗi đêm (gọi web /api/risk-sweep, ký bằng LIVE_BRIDGE_SECRET)
# =====================================================================
RISK_CRON="/etc/cron.d/tyzo-quet-rui-ro"

web_url() { # địa chỉ web để gọi quét
  if [ "$(che_do)" = "full" ]; then echo "http://127.0.0.1:3000"; return 0; fi
  local w; w="$(conf_get WEB_URL)"
  if [ -z "$w" ] && [ -t 0 ]; then
    read -rp "Địa chỉ web (vd https://tyzo-sub.vercel.app hoặc https://tyzo.site): " w
    w="$(echo "$w" | tr -d '[:space:]' | sed 's#/*$##')"
    [[ "$w" == http*://* ]] || w="https://$w"
    conf_set WEB_URL "$w"
  fi
  echo "$w"
}

quet_rui_ro() { # gọi quét tới hết, in kết quả; dùng cho cron và chạy tay
  chon_env
  local secret web t sign after="" body out checked=0 made=0 i
  secret="$(doc_bien LIVE_BRIDGE_SECRET)"
  [ -n "$secret" ] || { do_ "✘ Thiếu LIVE_BRIDGE_SECRET trong $ENV_FILE."; return 1; }
  web="$(web_url)"
  [ -n "$web" ] || { do_ "✘ Chưa có địa chỉ web."; return 1; }
  for i in $(seq 1 60); do
    t="$(date +%s)"
    sign="$(printf 'risk-sweep:%s' "$t" | openssl dgst -sha256 -hmac "$secret" -hex | awk '{print $NF}')"
    body="{}"; [ -n "$after" ] && body="{\"after\":\"$after\"}"
    out="$(curl -s --max-time 60 -X POST "$web/api/risk-sweep" -H "content-type: application/json" -H "x-tyzo-time: $t" -H "x-tyzo-sign: $sign" -d "$body")"
    if ! echo "$out" | grep -q '"checked"'; then
      do_ "✘ Quét lỗi: $(echo "$out" | head -c 300)"
      return 1
    fi
    checked=$((checked + $(echo "$out" | sed -n 's/.*"checked":\([0-9]*\).*/\1/p')))
    made=$((made + $(echo "$out" | sed -n 's/.*"made":\([0-9]*\).*/\1/p')))
    after="$(echo "$out" | sed -n 's/.*"next":"\([^"]*\)".*/\1/p')"
    [ -z "$after" ] && break
  done
  xanh "✔ Quét xong: $checked tài khoản, $made cờ mới. Xem ở Admin → Rủi ro."
}

bat_quet_dem() {
  tieu_de "Quét vi phạm mỗi đêm"
  echo "Mỗi đêm 1 giờ 37 sáng, VPS nhờ web kiểm mọi tài khoản có hoạt động 7 ngày qua theo các luật ở Admin → Rủi ro."
  if [ -f "$RISK_CRON" ]; then
    echo "Đang BẬT. Nhật ký: /var/log/tyzo-quet-rui-ro.log"
    if hoi_co "Tắt quét đêm?"; then rm -f "$RISK_CRON"; xanh "Đã tắt."; return 0; fi
  else
    if hoi_co "Bật quét đêm?"; then
      [ -n "$(web_url)" ] || return 1
      printf 'SHELL=/bin/bash\nPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\n37 1 * * * root /usr/local/bin/tyzo quet-rui-ro >> /var/log/tyzo-quet-rui-ro.log 2>&1\n' > "$RISK_CRON"
      chmod 644 "$RISK_CRON"; xanh "✔ Đã bật."
    fi
  fi
  if hoi_co "Chạy thử một lần ngay bây giờ?"; then quet_rui_ro; fi
}

# =====================================================================
# Lệnh chung: chọn theo chế độ đang chạy
# =====================================================================
kiem_tra() { if [ "$(che_do)" = "full" ]; then kiem_tra_web; else kiem_tra_cau_noi; fi; }
cap_nhat() { if [ "$(che_do)" = "full" ]; then cap_nhat_web "$@"; else cap_nhat_cau_noi "$@"; fi; }
khoi_dong_lai() {
  if [ "$(che_do)" = "full" ]; then
    tieu_de "Khởi động lại"
    # Dựng lại dịch vụ để nhận cấu hình mới trong tệp biến (restart thường không đọc lại).
    dc up -d --no-build --force-recreate >/dev/null 2>&1
    cho_web_ok 180 && xanh "✔ Web và cầu nối chạy lại." || do_ "✘ Chưa lên. Xem nhật ký (mục 3)."
    systemctl restart caddy 2>/dev/null || true
  else khoi_dong_lai_cau_noi; fi
}
nhat_ky() {
  if [ "$(che_do)" = "full" ]; then
    tieu_de "Nhật ký"
    echo " 1. Web   2. Cầu nối   3. Cơ sở dữ liệu   4. Caddy (https)"
    read -rp "Chọn số [1]: " c
    case "$c" in
      2) docker logs --tail 60 tyzo-bridge 2>&1 ;;
      3) docker logs --tail 60 tyzo-db 2>&1 ;;
      4) journalctl -u caddy --no-pager -n 40 ;;
      *) docker logs --tail 60 tyzo-web 2>&1 ;;
    esac
  else nhat_ky_cau_noi; fi
}

cai_lenh() {
  ln -sf "$DIR/deploy/vps/tyzo.sh" /usr/local/bin/tyzo
  chmod +x "$DIR/deploy/vps/tyzo.sh"
}

chao_lan_dau() {
  printf '\n\033[1;33mTYZO SUB · VPS mới\033[0m\n'
  echo "Bạn muốn VPS này làm gì?"
  echo " 1. Chỉ cầu nối Dịch trực tiếp (web vẫn ở Vercel)"
  echo " 2. CHẠY THỬ web đầy đủ (dữ liệu chép, không đụng web thật)"
  echo " 3. Web đầy đủ chính thức (không cần Vercel)"
  echo " 4. Đưa web lên một tài khoản Vercel (mới hoặc khác)"
  echo " 0. Thoát"
  read -rp "Chọn số: " c
  case "$c" in
    1) thiet_lap ;;
    2) thiet_lap_web thu ;;
    3) thiet_lap_web ;;
    4) dua_len_vercel ;;
  esac
}

menu() {
  while true; do
    chon_env
    local m; m="$(che_do)"
    printf '\n\033[1;33mTYZO SUB · %s\033[0m\n' "$( [ "$m" = "full" ] && echo "Web đầy đủ trên VPS ($(conf_get DOMAIN))" || echo "Cầu nối Dịch trực tiếp")"
    echo " 1. Kiểm tra mọi thứ"
    echo " 2. Cập nhật bản mới (lỗi thì tự quay về bản cũ)"
    echo " 3. Xem nhật ký"
    echo " 4. Sửa cấu hình"
    echo " 5. Ngắt câu Qwen 3.5 (chờ im lặng, độ nhạy nhận tiếng)"
    echo " 6. Khởi động lại"
    echo " 7. Dọn dung lượng"
    echo " 8. Bật/tắt tự cập nhật mỗi đêm"
    echo " 9. Thiết lập CHỈ CẦU NỐI (web ở Vercel)"
    echo "10. Tạo lại LIVE_BRIDGE_SECRET (chế độ chỉ cầu nối)"
    echo "11. Thiết lập WEB ĐẦY ĐỦ trên VPS này"
    echo "12. CHẠY THỬ web đầy đủ (không đụng web thật)"
    echo "13. Sao lưu / Chuyển VPS"
    echo "14. Đưa web lên tài khoản Vercel (mới hoặc khác)"
    echo "15. Khóa ký ứng dụng Android (tự cập nhật ứng dụng)"
    echo "16. Quét vi phạm mỗi đêm (bật/tắt, chạy thử)"
    echo " 0. Thoát"
    read -rp "Chọn số: " c
    case "$c" in
      1) kiem_tra; cho_enter ;;
      2) cap_nhat; cho_enter ;;
      3) nhat_ky; cho_enter ;;
      4) sua_cau_hinh ;;
      5) doi_im_lang; cho_enter ;;
      6) khoi_dong_lai; cho_enter ;;
      7) don_dep; cho_enter ;;
      8) tu_cap_nhat ;;
      9) thiet_lap; cho_enter ;;
      10) [ "$m" = "full" ] && vang "Chế độ web đầy đủ: chuỗi này nằm trong VPS, không cần đổi." || doi_bi_mat ;;
      11) thiet_lap_web; cho_enter ;;
      12) thiet_lap_web thu; cho_enter ;;
      13) menu_du_lieu; cho_enter ;;
      14) dua_len_vercel; cho_enter ;;
      15) tao_khoa_android; cho_enter ;;
      16) bat_quet_dem; cho_enter ;;
      0|q) exit 0 ;;
      *) vang "Chọn số từ 0 đến 16." ;;
    esac
  done
}

main() {
can_root
# Chạy bằng một dòng tải về (VPS mới): tự lấy mã rồi chạy bản nằm trong kho.
if [ ! -f "$DIR/deploy/vps/tyzo.sh" ]; then
  echo "VPS chưa có mã, đang tải về..."
  (apt-get update -qq && apt-get install -y -qq git) >/dev/null 2>&1 || true
  git clone -q "$REPO_URL" "$DIR" || { do_ "Không tải được mã. Kiểm mạng rồi chạy lại."; exit 1; }
  cai_lenh
  exec bash "$DIR/deploy/vps/tyzo.sh" "$@"
fi
[ -x /usr/local/bin/tyzo ] || cai_lenh 2>/dev/null || true
chon_env
# VPS chưa thiết lập gì: hỏi muốn làm gì.
if [ "${1:-menu}" = "menu" ] && [ -z "$(che_do)" ]; then chao_lan_dau; exit $?; fi
case "${1:-menu}" in
  menu) menu ;;
  kiem-tra) kiem_tra ;;
  cap-nhat) cap_nhat ;;
  cap-nhat-tu-dong) echo "--- $(date '+%d/%m/%Y %H:%M') ---"; cap_nhat tu-dong ;;
  nhat-ky) nhat_ky ;;
  khoi-dong-lai) khoi_dong_lai ;;
  sao-luu) echo "--- $(date '+%d/%m/%Y %H:%M') ---"; sao_luu ;;
  tao-ban-chuyen-vps) tao_ban_chuyen_vps ;;
  khoi-phuc-vps) khoi_phuc_vps "${2:-}" ;;
  thiet-lap|cai-dat) thiet_lap ;;
  web) thiet_lap_web ;;
  thu) thiet_lap_web thu ;;
  vercel) dua_len_vercel ;;
  khoa-android) tao_khoa_android ;;
  quet-rui-ro) echo "--- $(date '+%d/%m/%Y %H:%M') ---"; quet_rui_ro ;;
  *) echo "Dùng: tyzo [kiem-tra|cap-nhat|nhat-ky|khoi-dong-lai|sao-luu|tao-ban-chuyen-vps|khoi-phuc-vps TEP|thiet-lap|web|thu|vercel|khoa-android|quet-rui-ro]"; exit 1 ;;
esac
}

# Gọi qua hàm rồi thoát ngay: tệp này có thể bị thay giữa lúc «cập nhật» chạy.
main "$@"; exit $?
