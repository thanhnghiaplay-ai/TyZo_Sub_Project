#!/usr/bin/env bash
# tyzo-ai: cài và quản lý dịch vụ nhận dạng AI trên Modal (GPU tự tắt khi không có việc). Gõ «tyzo-ai» để mở menu.
# Lệnh nhanh: tyzo-ai kiem-tra [video|link] [zh] [ky] | tyzo-ai so-sanh [thư mục] [số lần] [luồng,..|all] | tyzo-ai xem-srt [clip] [luồng] | tyzo-ai cap-nhat | tyzo-ai nhat-ky | tyzo-ai dia-chi
# VPS mới, dán một dòng (thay <nhánh> bằng nhánh có code, ví dụ main):
#   bash <(curl -fsSL https://raw.githubusercontent.com/thanhnghiaplay-ai/TyZo_Sub_Project/<nhánh>/deploy/modal/tyzo-ai.sh)
# Tệp này nằm trong kho nên tự mới theo mỗi lần «Cập nhật». Không đụng web, cầu nối hay lệnh «tyzo».
set -uo pipefail

REPO_URL="https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project.git"
DIR="/opt/tyzo-ai"
CODE="$DIR/code"
VENV="$DIR/venv"
CONF="$DIR/tyzo-ai.conf"
APP_FILE="eval/asr/luong-ky/modal/modal_app.py"
CAU_HINH="eval/asr/luong-ky/modal/cau-hinh.json"
TEST_DIR_MAC_DINH="$DIR/mau-test"   # thư mục để zh.mp4 ja.mp4 ko.mp4 en.mp4 (clip thử có đáp án)
TEST_OUT="$DIR/test"               # kết quả so sánh + phụ đề từng luồng (không bị «Cập nhật» xóa)
APP_NAME="tyzo-asr"
SECRET_NAME="tyzo-asr"
NHANH_MAC_DINH="${TYZO_AI_BRANCH:-ccr-562e47af-b438ur}"
MODAL="$VENV/bin/modal"
PY="$VENV/bin/python3"

xanh() { printf '\033[32m%s\033[0m\n' "$*"; }
do_() { printf '\033[31m%s\033[0m\n' "$*"; }
vang() { printf '\033[33m%s\033[0m\n' "$*"; }
tieu_de() { printf '\n\033[1;33m== %s ==\033[0m\n' "$*"; }
cho_enter() { [ -t 0 ] && read -rp "Bấm Enter để quay lại menu..." _ || true; }
hoi_co() { local a; read -rp "$1 (c/k): " a; [ "${a,,}" = "c" ]; }
hoi_an() { local v; read -rsp "$1" v; echo >&2; printf '%s' "$v" | tr -d '[:space:]'; }

can_root() { if [ "$(id -u)" != "0" ]; then do_ "Hãy chạy bằng root (gõ: sudo -i rồi gõ lại tyzo-ai)."; exit 1; fi; }

# ---------- cấu hình trên VPS (/opt/tyzo-ai/tyzo-ai.conf, chỉ root đọc được) ----------
conf_get() { [ -f "$CONF" ] && grep "^$1=" "$CONF" | tail -1 | cut -d= -f2- || true; }
conf_set() {
  local tmp; mkdir -p "$DIR"; touch "$CONF"; tmp="$(mktemp)"
  grep -v "^$1=" "$CONF" > "$tmp" || true
  printf '%s=%s\n' "$1" "$2" >> "$tmp"; cat "$tmp" > "$CONF"; rm -f "$tmp"; chmod 600 "$CONF"
}
nhanh() { local b; b="$(conf_get BRANCH)"; echo "${b:-$NHANH_MAC_DINH}"; }
da_cai() { [ -x "$MODAL" ] && [ -d "$CODE/.git" ]; }

# ---------- cài nền ----------
cai_nen() {
  tieu_de "Cài Python và tải code"
  if ! command -v git >/dev/null || ! command -v python3 >/dev/null || ! python3 -c 'import venv, ensurepip' 2>/dev/null; then
    apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3-venv python3-pip git curl openssl >/dev/null || { do_ "Cài gói hệ thống lỗi."; return 1; }
  fi
  mkdir -p "$DIR"
  local b; b="$(nhanh)"
  if [ -d "$CODE/.git" ]; then
    git -C "$CODE" fetch -q origin "$b" && git -C "$CODE" checkout -q -B "$b" "origin/$b" && git -C "$CODE" reset -q --hard "origin/$b" || { do_ "Không tải được nhánh $b."; return 1; }
  else
    git clone -q -b "$b" "$REPO_URL" "$CODE" || { do_ "Không tải được code (nhánh $b). Kho riêng tư: khi hỏi Password hãy dán token GitHub."; return 1; }
  fi
  conf_set BRANCH "$b"
  [ -x "$PY" ] || python3 -m venv "$VENV" || return 1
  "$VENV/bin/pip" install -q -U pip modal || { do_ "Cài modal lỗi."; return 1; }
  ln -sf "$CODE/deploy/modal/tyzo-ai.sh" /usr/local/bin/tyzo-ai && chmod +x "$CODE/deploy/modal/tyzo-ai.sh"
  xanh "Xong. Từ giờ gõ: tyzo-ai"
}

da_dang_nhap() { "$MODAL" app list >/dev/null 2>&1; }

dang_nhap_modal() {
  tieu_de "Đăng nhập Modal"
  if da_dang_nhap; then xanh "Đã đăng nhập Modal."; return 0; fi
  echo " 1. Mở link (khuyên dùng): máy in một đường link, mở trên điện thoại đang đăng nhập modal.com rồi bấm Approve"
  echo " 2. Dán Token ID và Token Secret (modal.com → Settings → API Tokens → New Token)"
  local c; read -rp "Chọn [1]: " c
  if [ "${c:-1}" = "2" ]; then
    local id sec; read -rp "  Token ID (ak-...): " id; sec="$(hoi_an '  Token Secret (as-..., không hiện chữ): ')"
    "$MODAL" token set --token-id "$id" --token-secret "$sec" >/dev/null || { do_ "Sai token."; return 1; }
  else
    "$MODAL" token new || return 1
  fi
  da_dang_nhap && xanh "Đăng nhập Modal xong." || { do_ "Chưa đăng nhập được Modal."; return 1; }
}

hoi_ali() {
  tieu_de "Key Alibaba (dự phòng cho bước hợp nhất)"
  echo "Dùng chính key và ID Workspace Alibaba đang lưu ở Admin web (Cấu hình → Dịch trực tiếp)."
  echo "Bỏ trống key nếu không muốn dùng Alibaba (khi đó chỉ dùng model trên GPU Modal)."
  local k w; k="$(hoi_an '  Key Alibaba (sk-..., không hiện chữ, Enter để bỏ qua): ')"
  if [ -n "$k" ]; then
    read -rp "  ID Workspace (ws-..., Enter nếu dùng Workspace mặc định): " w
    conf_set ALI_API_KEY "$k"; conf_set ALI_WORKSPACE "$(printf '%s' "$w" | tr -d '[:space:]')"
  else
    conf_set ALI_API_KEY ""; conf_set ALI_WORKSPACE ""
  fi
}

ma_moi() { conf_set TYZO_ASR_TOKEN "$(openssl rand -hex 32)"; xanh "Đã tạo chuỗi bảo vệ mới (lưu trong $CONF, xem bằng mục «Địa chỉ và chuỗi bảo vệ»)."; }

luu_bi_mat() {
  local args=("TYZO_ASR_TOKEN=$(conf_get TYZO_ASR_TOKEN)" "TYZO_FUSE=$(conf_get TYZO_FUSE)")
  [ -n "$(conf_get ALI_API_KEY)" ] && args+=("ALI_API_KEY=$(conf_get ALI_API_KEY)")
  [ -n "$(conf_get ALI_WORKSPACE)" ] && args+=("ALI_WORKSPACE=$(conf_get ALI_WORKSPACE)")
  "$MODAL" secret create --force "$SECRET_NAME" "${args[@]}" >/dev/null || { do_ "Lưu key lên Modal lỗi."; return 1; }
  xanh "Đã lưu key và cài đặt lên Modal."
}

trien_khai() {
  tieu_de "Đưa dịch vụ lên Modal"
  vang "Lần đầu mất 5–15 phút (Modal cài thư viện). Các lần sau vài giây."
  local out
  out="$(cd "$CODE" && TYZO_ASR_WARM="$(conf_get ASR_WARM)" TYZO_LLM_WARM="$(conf_get LLM_WARM)" TYZO_QWEN_PRELOAD="$(conf_get QWEN_PRELOAD)" "$MODAL" deploy "$APP_FILE" 2>&1 | tee /dev/stderr)" || true
  local url; url="$(printf '%s\n' "$out" | grep -A2 'Asr.run' | grep -o 'https://[^ ]*\.modal\.run' | head -1)"
  # modal mới không in địa chỉ Asr.run khi app có nhiều phần: hỏi thẳng Modal, không được thì suy từ địa chỉ máy model chữ
  [ -n "$url" ] || url="$("$PY" -c "import modal; print(modal.Cls.from_name('$APP_NAME', 'Asr')().run.get_web_url() or '')" 2>/dev/null | grep -o 'https://[^ ]*\.modal\.run' | head -1)"
  [ -n "$url" ] || url="$(printf '%s\n' "$out" | grep -o 'https://[^ ]*-llm\.[^ ]*\.modal\.run' | head -1 | sed 's/-llm\./-asr-run./')"
  if [ -z "$url" ]; then do_ "Đưa lên Modal chưa xong. Đọc chữ đỏ ở trên, hoặc chụp gửi người hỗ trợ."; return 1; fi
  conf_set URL "$url"
  xanh "Dịch vụ đang ở: $url"
  vang "Máy GPU chỉ bật khi có việc. Lần gọi đầu sau khi đưa lên phải chờ máy bật và tải model."
}

chon_hop_nhat() {
  tieu_de "Cách hợp nhất (bước sửa chữ từ nhiều lần nghe)"
  echo " 1. GPU (khuyên dùng): Qwen3.8-27B chạy trên GPU Modal riêng, không tốn tiền Alibaba."
  echo "    Máy đó chưa bật xong hoặc lỗi thì tự dùng Alibaba (nếu đã nhập key)."
  echo " 2. Alibaba: Qwen4-Max, chỉ gọi khi các lần nghe lệch nhau (tốn tiền Alibaba theo token)."
  echo " 3. Không dùng model chữ: rẻ nhất, kém chính xác hơn."
  local c; read -rp "Chọn [1]: " c
  case "${c:-1}" in 2) conf_set TYZO_FUSE ali ;; 3) conf_set TYZO_FUSE khong ;; *) conf_set TYZO_FUSE gpu ;; esac
  xanh "Đã chọn: $(conf_get TYZO_FUSE)"
}

cai_dat() {
  can_root
  tieu_de "CÀI DỊCH VỤ NHẬN DẠNG AI TRÊN MODAL"
  echo "Cần: tài khoản modal.com (gói Starter tặng 30 USD mỗi tháng). Key Alibaba là tùy chọn."
  cai_nen || return 1
  dang_nhap_modal || return 1
  [ -n "$(conf_get TYZO_ASR_TOKEN)" ] || ma_moi
  [ -n "$(conf_get TYZO_FUSE)" ] || chon_hop_nhat
  if [ -z "$(conf_get ALI_SET)" ]; then hoi_ali; conf_set ALI_SET 1; fi
  luu_bi_mat && trien_khai || return 1
  if hoi_co "Chạy thử ngay bằng video mẫu 38 giây?"; then kiem_tra; fi
}

kiem_tra() { # kiem_tra [video|link] [ngôn ngữ] [luồng]
  [ -n "$(conf_get URL)" ] || { do_ "Chưa có địa chỉ dịch vụ. Chạy mục 1 trước."; return 1; }
  local f="${1:-}" l="${2:-}" p="${3:-}"
  if [ -z "$f" ] && [ -t 0 ]; then
    read -rp "Video hoặc link tải trực tiếp (Enter = video mẫu tiếng Trung 38 giây): " f
  fi
  if [ -z "$f" ]; then f="$CODE/eval/asr/luong-ky/modal/mau/zh_thu_38s.mp4"; l="${l:-zh}"; fi
  if [ -z "$l" ] && [ -t 0 ]; then read -rp "Ngôn ngữ (zh, ja, ko, en, yue, ru, cs) [zh]: " l; fi
  if [ -z "$p" ] && [ -t 0 ]; then danh_sach_luong; read -rp "Luồng (Enter = mặc định): " p; fi
  TYZO_ASR_URL="$(conf_get URL)" TYZO_ASR_TOKEN="$(conf_get TYZO_ASR_TOKEN)" "$PY" "$CODE/eval/asr/luong-ky/modal/goi_thu.py" "$f" "${l:-zh}" ${p:+"$p"}
}

danh_sach_luong() {
  "$PY" - "$CODE/$CAU_HINH" <<'EOF'
import json, sys
c = json.load(open(sys.argv[1]))
for k, v in c["luong"].items():
    print(f"  {k:10s} {'(mặc định) ' if k == c['luong_mac_dinh'] else ''}{v.get('mo_ta', '')}")
EOF
}

# ---------- so sánh test: chạy TẤT CẢ luồng trên clip thử có đáp án, chấm lỗi chữ, chỉ ra luồng tốt nhất ----------
cai_cham_diem() {
  "$PY" -c 'import jiwer, opencc, cn2an, pykakasi' 2>/dev/null && return 0
  vang "Cài thư viện chấm điểm (jiwer, opencc, cn2an, pykakasi), chỉ lần đầu..."
  "$VENV/bin/pip" install -q jiwer opencc-python-reimplemented cn2an pykakasi || { do_ "Cài thư viện chấm điểm lỗi."; return 1; }
}

nhat_ky_bat_may() { # chỉ đọc nhật ký Modal, lọc các dòng ghi thời gian bật máy chữ; không bật máy
  vang "Đọc nhật ký Modal trong 30 giây rồi lọc (Ctrl+C để dừng sớm)..."
  timeout 30 "$MODAL" app logs "$APP_NAME" 2>&1 \
    | grep -aE '\[tyzo\]|Snapshot created|Restoring Function from memory snapshot|snapshot|Loading weights|Model loading took|loading took|init engine|Starting vLLM|Warming up|torch.compile|compil(e|ation) took|Graph capturing|Resolved architecture|Downloading|Application startup complete|shutdown triggered|Started server process' \
    | tail -n 60
  return 0
}

thu_phim() { # cắt một đoạn phim trên VPS, nhận dạng và dịch sang tiếng Việt
  local d="$TEST_OUT/phim/goc" f bd dai l p
  mkdir -p "$d"
  if ! command -v ffmpeg >/dev/null; then
    hoi_co "VPS chưa có ffmpeg (cần để cắt phim, chạy CPU). Cài bằng apt-get?" || return 1
    apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ffmpeg >/dev/null || { do_ "Cài ffmpeg lỗi."; return 1; }
  fi
  echo "Tải phim lên VPS vào thư mục: $d  (ứng dụng terminal → SFTP / tải tệp lên)"
  ls -lh "$d" 2>/dev/null | tail -n +2
  read -rp "Đường dẫn hoặc tên tệp phim trong thư mục trên: " f
  [ -n "$f" ] || return 0
  [ -f "$f" ] || f="$d/$f"
  [ -f "$f" ] || { do_ "Không thấy tệp $f"; return 1; }
  read -rp "Bắt đầu từ phút:giây [10:00]: " bd; bd="${bd:-10:00}"
  bd=$(( 10#${bd%%:*} * 60 + 10#${bd##*:} ))
  read -rp "Độ dài (giây) [300]: " dai; dai="${dai:-300}"
  read -rp "Ngôn ngữ (ja, ko, zh, en) [ja]: " l; l="${l:-ja}"
  read -rp "Luồng [nhanh]: " p; p="${p:-nhanh}"
  TYZO_TEST_OUT="$TEST_OUT" TYZO_ASR_URL="$(conf_get URL)" TYZO_ASR_TOKEN="$(conf_get TYZO_ASR_TOKEN)" \
    "$PY" "$CODE/eval/asr/phim/thu_phim.py" "$f" "$bd" "$dai" "$l" "$p"
}

so_sanh_test() { # so_sanh_test [thư mục clip] [số lần] [luồng,luồng|all]
  [ -n "$(conf_get URL)" ] || { do_ "Chưa có địa chỉ dịch vụ. Chạy mục 1 trước."; return 1; }
  local d="${1:-}" n="${2:-}" p="${3:-}"
  if [ -z "$d" ]; then
    d="$(conf_get TEST_DIR)"; d="${d:-$TEST_DIR_MAC_DINH}"
    if [ -t 0 ]; then read -rp "Thư mục chứa zh.mp4 ja.mp4 ko.mp4 en.mp4 [$d]: " x; d="${x:-$d}"; fi
  fi
  if ! compgen -G "$d/zh*.*" >/dev/null && ! compgen -G "$d/ja*.*" >/dev/null && ! compgen -G "$d/ko.*" >/dev/null && ! compgen -G "$d/en.*" >/dev/null; then
    do_ "Không thấy clip nào trong $d (cần ít nhất một trong: zh, ja, ko, en; đuôi mp4/wav/mp3/m4a)."
    vang "Chép clip lên VPS, ví dụ từ máy bạn:  scp zh.mp4 ja.mp4 ko.mp4 en.mp4 root@<VPS>:$d/"
    mkdir -p "$d"; return 1
  fi
  conf_set TEST_DIR "$d"
  if [ -z "$n" ] && [ -t 0 ]; then read -rp "Mỗi luồng chạy mấy lần? (1 = nhanh, 3 = đáng tin hơn vì kết quả tự dao động) [1]: " n; fi
  n="${n:-1}"
  if [ -z "$p" ] && [ -t 0 ]; then
    echo "Các luồng hiện có:"; danh_sach_luong
    read -rp "Luồng cần so (cách nhau bằng dấu phẩy, Enter = TẤT CẢ): " p
  fi
  p="${p:-all}"
  cai_cham_diem || return 1
  mkdir -p "$TEST_OUT"
  vang "Chạy lần lượt từng luồng trên từng clip; máy GPU bật lần đầu và luồng Qwen nạp model nên có thể mất vài chục phút. Có thể bấm Ctrl+C: kết quả đã chạy vẫn được giữ."
  TYZO_ASR_URL="$(conf_get URL)" TYZO_ASR_TOKEN="$(conf_get TYZO_ASR_TOKEN)" TYZO_TEST_OUT="$TEST_OUT" \
    "$PY" "$CODE/eval/asr/luong-ky/modal/so_sanh_asr.py" "$d" "$n" "$p" 2>&1 | tee "$TEST_OUT/lan-cuoi.txt"
  xanh "Xem phụ đề từng luồng: tyzo-ai → 15 (Xem srt test). Bảng điểm lưu ở $TEST_OUT/lan-cuoi.txt"
}

xem_srt_test() { # xem_srt_test [clip] [luồng] [lần]
  [ -f "$TEST_OUT/so-sanh-test.json" ] || { do_ "Chưa có kết quả. Chạy «So sánh test» (mục 14) trước."; return 1; }
  local c="${1:-}" l="${2:-}" i="${3:-}"
  if [ -z "$c" ] && [ -t 0 ]; then
    TYZO_TEST_OUT="$TEST_OUT" "$PY" "$CODE/eval/asr/luong-ky/modal/xem_srt_test.py"
    read -rp "Xem clip nào? (zh, ja, ko, en; Enter = thoát): " c; [ -n "$c" ] || return 0
    read -rp "Luồng nào? (Enter = tất cả luồng, có kèm đáp án): " l
  fi
  [ -n "$c" ] || { TYZO_TEST_OUT="$TEST_OUT" "$PY" "$CODE/eval/asr/luong-ky/modal/xem_srt_test.py"; return 0; }
  if [ -t 1 ] && command -v less >/dev/null; then
    TYZO_TEST_OUT="$TEST_OUT" "$PY" "$CODE/eval/asr/luong-ky/modal/xem_srt_test.py" "$c" ${l:+"$l"} ${i:+"$i"} | less -R
  else
    TYZO_TEST_OUT="$TEST_OUT" "$PY" "$CODE/eval/asr/luong-ky/modal/xem_srt_test.py" "$c" ${l:+"$l"} ${i:+"$i"}
  fi
}

cap_nhat() {
  can_root
  tieu_de "Cập nhật bản mới"
  local b cu moi; b="$(nhanh)"; cu="$(git -C "$CODE" rev-parse --short HEAD 2>/dev/null)"
  git -C "$CODE" fetch -q origin "$b" || { do_ "Không tải được nhánh $b."; return 1; }
  moi="$(git -C "$CODE" rev-parse --short "origin/$b")"
  if [ "$cu" = "$moi" ]; then xanh "Code đã mới nhất ($cu)."; hoi_co "Vẫn đưa lại lên Modal?" || return 0
  else
    echo "Thay đổi mới:"; git -C "$CODE" log --oneline "HEAD..origin/$b" | head -20
    # Mỗi lần đưa lên Modal, bản chụp bộ nhớ của máy chữ bị làm lại (2–3 lần bật chậm). Chỉ đưa lên khi code chạy trên Modal đổi.
    local doi_modal; doi_modal="$(git -C "$CODE" diff --name-only HEAD "origin/$b" -- eval/asr/luong-ky)"
    git -C "$CODE" reset -q --hard "origin/$b"
    if [ -z "$doi_modal" ]; then
      chmod +x "$CODE/deploy/modal/tyzo-ai.sh"
      xanh "Chỉ đổi menu/công cụ trên VPS; code chạy trên Modal không đổi nên không đưa lại lên Modal (giữ bản chụp bộ nhớ)."
      return 0
    fi
    echo "Code chạy trên Modal đổi:"; printf '  %s\n' $doi_modal | head -20
  fi
  "$VENV/bin/pip" install -q -U modal >/dev/null 2>&1 || true
  chmod +x "$CODE/deploy/modal/tyzo-ai.sh"
  luu_bi_mat && trien_khai
}

dia_chi() {
  tieu_de "Địa chỉ và chuỗi bảo vệ"
  echo "Địa chỉ dịch vụ : $(conf_get URL)"
  echo "Nhánh code      : $(nhanh)"
  echo "Hợp nhất        : $(conf_get TYZO_FUSE)    Alibaba dự phòng: $([ -n "$(conf_get ALI_API_KEY)" ] && echo có || echo không)"
  echo "Máy luôn bật    : nhận dạng $(conf_get ASR_WARM || true) · model chữ $(conf_get LLM_WARM || true)"
  if hoi_co "Hiện chuỗi bảo vệ? (đừng chụp màn hình gửi ai)"; then echo "Chuỗi bảo vệ    : $(conf_get TYZO_ASR_TOKEN)"; fi
}

may_luon_bat() {
  tieu_de "Giữ máy luôn bật (khách khỏi chờ máy khởi động)"
  vang "Máy luôn bật tốn tiền cả lúc không có khách: nhận dạng L4 khoảng 0,8 USD/giờ, model chữ L40S khoảng 1,95 USD/giờ."
  echo " 1. Tắt hết (mặc định, rẻ nhất)"
  echo " 2. Giữ 1 máy nhận dạng"
  echo " 3. Giữ 1 máy nhận dạng + 1 máy model chữ"
  local c; read -rp "Chọn: " c
  case "$c" in 2) conf_set ASR_WARM 1; conf_set LLM_WARM 0 ;; 3) conf_set ASR_WARM 1; conf_set LLM_WARM 1 ;; *) conf_set ASR_WARM 0; conf_set LLM_WARM 0 ;; esac
  trien_khai
}

doi_nhanh() {
  tieu_de "Đổi nhánh code"
  echo "Đang dùng: $(nhanh). Bản chính thức thường là main."
  local b; read -rp "Nhánh mới: " b; [ -n "$b" ] || return 0
  git -C "$CODE" fetch -q origin "$b" || { do_ "Không có nhánh $b."; return 1; }
  conf_set BRANCH "$b"; git -C "$CODE" checkout -q -B "$b" "origin/$b"; cap_nhat
}

tat_bat() {
  tieu_de "Tạm tắt / bật lại"
  echo " 1. Tạm tắt dịch vụ (không nhận việc, chắc chắn không tốn tiền GPU)"
  echo " 2. Bật lại"
  local c; read -rp "Chọn: " c
  case "$c" in 1) "$MODAL" app stop "$APP_NAME" ;; 2) luu_bi_mat && trien_khai ;; esac
}

go_bo() {
  can_root
  tieu_de "Gỡ bỏ"
  hoi_co "Xóa dịch vụ trên Modal và thư mục $DIR trên VPS?" || return 0
  "$MODAL" app stop "$APP_NAME" || true
  hoi_co "Xóa luôn model đã tải trên Modal (lần cài sau phải tải lại)?" && { "$MODAL" volume delete tyzo-asr-cache; "$MODAL" volume delete tyzo-llm-cache; } || true
  "$MODAL" secret delete "$SECRET_NAME" || true
  rm -f /usr/local/bin/tyzo-ai; rm -rf "$DIR"
  xanh "Đã gỡ."
  exit 0
}

do_fleurs_ko() {
  local version
  read -rp "Mã phiên bản đang chạy trên Modal (giữ nguyên khi chạy tiếp): " version
  [[ "$version" =~ ^[a-zA-Z0-9._-]+$ ]] || { vang "Chưa có mã phiên bản."; return 1; }
  TYZO_ASR_URL="$(conf_get URL)" TYZO_ASR_TOKEN="$(conf_get TYZO_ASR_TOKEN)" \
    TYZO_FUSE="$(conf_get TYZO_FUSE)" "$PY" "$CODE/eval/asr/fleurs-ko/run.py" "$TEST_OUT/fleurs-ko" "$version"
}

menu() {
  while true; do
    tieu_de "TYZO AI (Modal) · nhánh $(nhanh) · hợp nhất: $(conf_get TYZO_FUSE)"
    echo " 1. Cài đặt / cài lại"
    echo " 2. Kiểm tra (chạy thử một video, in thời gian chờ và tiền)"
    echo " 3. Cập nhật bản mới"
    echo " 4. Xem các luồng nhận dạng"
    echo " 5. Đổi cách hợp nhất (GPU / Alibaba / không)"
    echo " 6. Đổi key Alibaba"
    echo " 7. Đổi chuỗi bảo vệ (khi bị lộ)"
    echo " 8. Giữ máy luôn bật (giờ cao điểm)"
    echo " 9. Nhật ký trên Modal (Ctrl+C để thoát)"
    echo "10. Địa chỉ và chuỗi bảo vệ"
    echo "11. Tạm tắt / bật lại"
    echo "12. Đổi nhánh code"
    echo "13. Gỡ bỏ"
    echo "14. So sánh test (chạy TẤT CẢ luồng trên clip thử, tìm luồng tốt nhất)"
    echo "15. Xem srt test (phụ đề từng luồng, đặt cạnh đáp án)"
    echo "16. So sánh nhanh và ky trên mẫu Anh đã rà soát (2 lượt GPU)"
    echo "17. So sánh nhanh và ky trên cùng mẫu Anh có nhạc nền (2 lượt GPU)"
    echo "18. Thử hai giọng Anh nói chồng (2 lượt GPU, chấm riêng giọng thứ hai)"
    echo "19. Chấm lại lần thử nói chồng gần nhất (không gọi GPU)"
    echo "20. So sánh nhanh và ky trên mẫu tiếng Trung (2 lượt GPU)"
    echo "21. Dịch SRT Trung của mục 20 sang tiếng Việt (Modal, dùng lại bản đã dịch)"
    echo "22. So bản dịch 21 với bản ghép câu theo ngữ cảnh (Modal)"
    echo "23. Thử phụ đề công sở và xem bản 22/23 trên điện thoại (Modal)"
    echo "24. So sánh nhanh và ky trên mẫu tiếng Nhật (2 lượt GPU)"
    echo "25. Chuẩn bị 8 mẫu Hàn FLEURS có lời tham chiếu (CPU, dùng lại dữ liệu đã tải)"
    echo "26. So nhanh và ky trên FLEURS Hàn (kiểm tra cache trước khi hỏi chạy GPU)"
    echo "27. Dịch 8 câu Hàn sang Việt (Modal chữ, dùng lại mục 26 và bản dịch đã lưu)"
    echo "28. Chấm thử khi bỏ đoạn chào ở 1662 và 1663 (CPU, đọc kết quả đã lưu)"
    echo "29. Xem ID 1673: Hàn chuẩn, bản chép nhanh/ky, bản dịch đã lưu (CPU, không gọi Modal)"
    echo "30. Dịch câu Hàn chuẩn 1673 sang Việt (1 yêu cầu Modal chữ, hỏi trước khi gửi, dùng lại bản đã lưu)"
    echo "31. Thử bộ lọc tự động câu chào bịa trên 16 phản hồi FLEURS đã lưu (CPU, không gọi Modal)"
    echo "32. So dịch Hàn → Việt: gốc / có chủ đề / thêm thuật ngữ (Modal chữ, hỏi trước khi gửi, dùng lại bản đã lưu)"
    echo "33. Đo thời gian bật máy Modal từ kết quả đã lưu (CPU, không gọi Modal)"
    echo "34. Lọc nhật ký Modal: các bước bật máy chữ và thời gian (chỉ đọc, không bật máy)"
    echo "35. Bật máy model chữ bằng 1 câu ngắn, đo thời gian rồi lọc nhật ký (tốn GPU nếu máy đang tắt, hỏi trước)"
    echo "36. So hai lượt mục 26 gần nhất theo từng ID, xem câu chào đã bỏ/còn lại (CPU, không gọi Modal)"
    echo "37. Thử bản chụp máy chữ: bật 4 lần, mỗi lần cách 3 phút để máy tự tắt (tốn GPU, hỏi trước)"
    echo "38. Thử phim thật: cắt một đoạn, nhận dạng và dịch sang tiếng Việt (tốn GPU, hỏi trước từng bước)"
    echo " 0. Thoát"
    local c; read -rp "Chọn: " c
    case "$c" in
      1) cai_dat ;;
      2) kiem_tra ;;
      3) cap_nhat; cho_enter; vang "Mở lại menu bằng bản vừa cập nhật..."; exec "$CODE/deploy/modal/tyzo-ai.sh" ;;
      4) danh_sach_luong; vang "Thêm hay sửa luồng: sửa $CAU_HINH trong kho rồi chọn 3. Cập nhật." ;;
      5) chon_hop_nhat; luu_bi_mat && trien_khai ;;
      6) hoi_ali; luu_bi_mat && trien_khai ;;
      7) ma_moi; luu_bi_mat && trien_khai ;;
      8) may_luon_bat ;;
      9) "$MODAL" app logs "$APP_NAME" ;;
      10) dia_chi ;;
      11) tat_bat ;;
      12) doi_nhanh ;;
      13) go_bo ;;
      14) so_sanh_test ;;
      15) xem_srt_test ;;
      21) TYZO_ASR_TOKEN="$(conf_get TYZO_ASR_TOKEN)" "$PY" "$CODE/eval/asr/mau-da-ra-soat/dich_zh_vi.py" ;;
      22) TYZO_ASR_TOKEN="$(conf_get TYZO_ASR_TOKEN)" "$PY" "$CODE/eval/asr/mau-da-ra-soat/dich_zh_vi.py" --ghep ;;
      23) TYZO_ASR_TOKEN="$(conf_get TYZO_ASR_TOKEN)" "$PY" "$CODE/eval/asr/mau-da-ra-soat/dich_zh_vi.py" --dien-thoai ;;
      26) do_fleurs_ko ;;
      28) "$PY" "$CODE/eval/asr/fleurs-ko/check-intro.py" "$TEST_OUT/fleurs-ko" ;;
      29) "$PY" "$CODE/eval/asr/fleurs-ko/xem-1673.py" "$TEST_OUT/fleurs-ko" ;;
      30) TYZO_ASR_TOKEN="$(conf_get TYZO_ASR_TOKEN)" "$PY" "$CODE/eval/asr/fleurs-ko/xem-1673.py" --dich-chuan "$TEST_OUT/fleurs-ko" ;;
      31) "$PY" "$CODE/eval/asr/fleurs-ko/loc-chao.py" "$TEST_OUT/fleurs-ko" ;;
      34) nhat_ky_bat_may ;;
      38) thu_phim ;;
      37) TYZO_ASR_TOKEN="$(conf_get TYZO_ASR_TOKEN)" "$PY" "$CODE/eval/asr/luong-ky/modal/bat_may_chu.py" --lap 4 180 && sleep 5 && nhat_ky_bat_may ;;
      36) "$PY" "$CODE/eval/asr/fleurs-ko/so-hai-luot.py" "$TEST_OUT/fleurs-ko" ;;
      35) TYZO_ASR_TOKEN="$(conf_get TYZO_ASR_TOKEN)" "$PY" "$CODE/eval/asr/luong-ky/modal/bat_may_chu.py" && sleep 5 && nhat_ky_bat_may ;;
      33) "$PY" "$CODE/eval/asr/luong-ky/modal/khoi_dong.py" "$TEST_OUT" "$CODE/eval/asr/mau-da-ra-soat" ;;
      32) TYZO_ASR_TOKEN="$(conf_get TYZO_ASR_TOKEN)" "$PY" "$CODE/eval/asr/fleurs-ko/dich-ngu-canh.py" "$TEST_OUT/fleurs-ko" ;;
      27) TYZO_ASR_TOKEN="$(conf_get TYZO_ASR_TOKEN)" "$PY" "$CODE/eval/asr/fleurs-ko/translate.py" "$TEST_OUT/fleurs-ko" ;;
      25) bash "$CODE/eval/asr/fleurs-ko/prepare-set.sh" "$DIR/test/fleurs-ko" ;;
      24) cai_cham_diem && "$PY" "$CODE/eval/asr/mau-da-ra-soat/so_sanh_en.py" "$CODE" --tieng-nhat ;;
      20) cai_cham_diem && "$PY" "$CODE/eval/asr/mau-da-ra-soat/so_sanh_en.py" "$CODE" --tieng-trung ;;
      19) cai_cham_diem && "$PY" "$CODE/eval/asr/mau-da-ra-soat/so_sanh_en.py" "$CODE" --xem-noi-chong ;;
      18) cai_cham_diem && "$PY" "$CODE/eval/asr/mau-da-ra-soat/so_sanh_en.py" "$CODE" --noi-chong ;;
      17) cai_cham_diem && "$PY" "$CODE/eval/asr/mau-da-ra-soat/so_sanh_en.py" "$CODE" --nhac-nen ;;
      16) cai_cham_diem && "$PY" "$CODE/eval/asr/mau-da-ra-soat/so_sanh_en.py" "$CODE" ;;
      0|q) exit 0 ;;
      *) vang "Chọn số trong menu." ;;
    esac
    cho_enter
  done
}

# Chạy từ dòng curl khi chưa cài: cài xong thì mở bản đã cài (bản này tự mới theo «Cập nhật»).
if ! da_cai; then
  can_root
  cai_dat
  da_cai && exec /usr/local/bin/tyzo-ai
  exit 1
fi

case "${1:-}" in
  kiem-tra) shift; kiem_tra "$@" ;;
  so-sanh) shift; so_sanh_test "$@" ;;
  xem-srt) shift; xem_srt_test "$@" ;;
  cap-nhat) cap_nhat ;;
  nhat-ky) "$MODAL" app logs "$APP_NAME" ;;
  dia-chi) dia_chi ;;
  cai-dat) cai_dat ;;
  *) menu ;;
esac
