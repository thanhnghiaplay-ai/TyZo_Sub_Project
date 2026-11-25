#!/usr/bin/env bash
# Chạy benchmark trực tiếp qua endpoint GPU Modal của TyZo.
# Không cần Groq. Chạy tại thư mục repo hoặc truyền TYZO_REPO.
set -Eeuo pipefail

REPO="${TYZO_REPO:-$(cd "$(dirname "$0")/../.." && pwd)}"
TEST_DIR="${TYZO_TEST_DIR:-$REPO/eval/asr/luong-ky/mau-test}"
OUT_DIR="${TYZO_TEST_OUT:-$REPO/eval/asr/luong-ky/ket-qua-gpu}"
RUNS="${ASR_REPEAT:-3}"
PROFILES="${ASR_PROFILES:-ky,can-bang,nhanh,qwen,qwen-nhanh,qwen-0.6b-nhanh}"

red(){ printf '\033[31m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$*"; }
green(){ printf '\033[32m%s\033[0m\n' "$*"; }
die(){ red "$*"; exit 1; }

[ -f "$REPO/eval/asr/luong-ky/modal/so_sanh_asr.py" ] || die "Không tìm thấy mã benchmark trong $REPO"
[ -d "$TEST_DIR" ] || die "Không tìm thấy thư mục test: $TEST_DIR"
command -v python3 >/dev/null || die "VPS thiếu python3"

# Không để endpoint/token rơi vào log hoặc tham số process.
if [ -z "${TYZO_ASR_URL:-}" ] && [ -f /opt/tyzo-ai/tyzo-ai.conf ]; then
  # so_sanh_asr.py tự đọc file cấu hình; chỉ kiểm tra tồn tại ở đây.
  :
fi
[ -n "${TYZO_ASR_URL:-}" ] || grep -q '^URL=' /opt/tyzo-ai/tyzo-ai.conf 2>/dev/null || die "Thiếu URL Modal: đặt TYZO_ASR_URL hoặc cấu hình tyzo-ai."
[ -n "${TYZO_ASR_TOKEN:-}" ] || grep -q '^TYZO_ASR_TOKEN=' /opt/tyzo-ai/tyzo-ai.conf 2>/dev/null || die "Thiếu token Modal: đặt TYZO_ASR_TOKEN hoặc cấu hình tyzo-ai."

mkdir -p "$OUT_DIR"
export TYZO_TEST_OUT="$OUT_DIR"

# Đảm bảo test có đáp án tương ứng. Không chạy nếu dùng nhầm audio không có đáp án.
for lang in zh ja ko en; do
  found=0
  for ext in mp4 wav mp3 m4a; do [ -f "$TEST_DIR/$lang.$ext" ] && found=1; done
  [ "$found" = 0 ] && { [ "$lang" = zh -o "$lang" = ja ] && for ext in mp4 wav mp3 m4a; do [ -f "$TEST_DIR/${lang}2.$ext" ] && found=1; done; }
  [ "$found" = 1 ] || yellow "Bỏ qua $lang: chưa có audio test"
done

printf '\n'; green "Benchmark GPU Modal — không dùng Groq"
echo "Repo: $REPO"
echo "Test: $TEST_DIR"
echo "Số lần/luồng: $RUNS"
echo "Luồng: $PROFILES"
echo "Kết quả: $OUT_DIR"
yellow "Lần đầu có thể chờ cold-start và nạp model. Không bấm Ctrl+C nếu muốn chạy đủ; kết quả được lưu dần."

cd "$REPO/eval/asr/luong-ky/modal"
python3 so_sanh_asr.py "$TEST_DIR" "$RUNS" "$PROFILES"

printf '\n'; green "Đã xong. Xem xếp hạng:"
python3 - <<'PY'
import json, os
p=os.environ['TYZO_TEST_OUT']+'/so-sanh-test-xep-hang.json'
if os.path.exists(p):
 d=json.load(open(p)); print(json.dumps(d, ensure_ascii=False, indent=2))
else: print('Chưa có xếp hạng đầy đủ (có thể một luồng bị lỗi).')
PY
