#!/usr/bin/env bash
# Công cụ quản lý cầu nối Dịch trực tiếp trên VPS. Gõ «tyzo» để mở menu.
# Lệnh nhanh: tyzo kiem-tra | tyzo cap-nhat | tyzo nhat-ky | tyzo thiet-lap
# VPS mới, chạy một dòng:  bash <(curl -fsSL https://raw.githubusercontent.com/thanhnghiaplay-ai/TyZo_Sub_Project/main/deploy/vps/tyzo.sh)
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

buoc() { printf '\n\033[1;36m━━━ BƯỚC %s/%s: %s ━━━\033[0m\n' "$1" 10 "$2"; }

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
  cap_nhat || { do_ "✘ Cầu nối chưa chạy. Chụp màn hình gửi Claude."; return 1; }

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
  kiem_tra
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
    echo " 9. Thiết lập từng bước (VPS mới, hoặc làm lại)"
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
      9) thiet_lap; cho_enter ;;
      10) doi_bi_mat ;;
      0|q) exit 0 ;;
      *) vang "Chọn số từ 0 đến 10." ;;
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
  exec bash "$DIR/deploy/vps/tyzo.sh" "${1:-thiet-lap}"
fi
[ -x /usr/local/bin/tyzo ] || cai_lenh 2>/dev/null || true
# Chưa có cấu hình: vào thẳng thiết lập từng bước.
if [ "${1:-menu}" = "menu" ] && [ ! -f "$ENV_FILE" ]; then thiet_lap; exit $?; fi
case "${1:-menu}" in
  menu) menu ;;
  kiem-tra) kiem_tra ;;
  cap-nhat) cap_nhat ;;
  cap-nhat-tu-dong) echo "--- $(date '+%d/%m/%Y %H:%M') ---"; cap_nhat tu-dong ;;
  nhat-ky) nhat_ky ;;
  khoi-dong-lai) khoi_dong_lai ;;
  cai-dat|thiet-lap) thiet_lap ;;
  *) echo "Dùng: tyzo [kiem-tra|cap-nhat|nhat-ky|khoi-dong-lai|thiet-lap]"; exit 1 ;;
esac
}

# Gọi qua hàm rồi thoát ngay: tệp này có thể bị thay giữa lúc «cập nhật» chạy.
main "$@"; exit $?
