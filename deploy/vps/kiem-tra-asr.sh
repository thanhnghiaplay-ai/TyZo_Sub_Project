#!/usr/bin/env bash
# Chạy bộ kiểm tra ASR trên VPS TyZo. Không sửa dữ liệu web, không in API key.
# Dùng: GROQ_API_KEY='...' bash deploy/vps/kiem-tra-asr.sh
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

fail=0
need() { command -v "$1" >/dev/null 2>&1 || { echo "✘ Thiếu lệnh: $1"; fail=1; }; }
need node
need npm
need ffmpeg
if [ "$fail" -ne 0 ]; then
  echo "Hãy cài các lệnh còn thiếu rồi chạy lại."; exit 2
fi
if [ -z "${GROQ_API_KEY:-}" ]; then
  echo "✘ Chưa có GROQ_API_KEY. Ví dụ: GROQ_API_KEY='...' bash deploy/vps/kiem-tra-asr.sh"
  exit 2
fi

mkdir -p eval/asr/out
if [ ! -d node_modules ]; then
  echo "Đang cài thư viện Node..."
  npm ci --omit=optional
fi

# Chỉ chạy các file có sẵn; đáp án chưa duyệt chỉ được gắn nhãn, không dùng kết luận production.
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="eval/asr/out/vps-${STAMP}.log"
{
  echo "TyZo ASR VPS test"
  echo "time=$STAMP"
  echo "host=$(hostname)"
  echo "node=$(node --version)"
  echo "ffmpeg=$(ffmpeg -version | head -n1)"
  echo
  echo "== health file checks =="
  test -s eval/asr/cases.json && echo "cases.json: OK" || { echo "cases.json: FAIL"; exit 1; }
  echo
  echo "== Groq benchmark =="
  /usr/bin/time -f 'elapsed_seconds=%e' npm run asr:bench -- \
    --models "${ASR_MODELS:-whisper-large-v3,whisper-large-v3-turbo}" \
    --variants "${ASR_VARIANTS:-default,noprompt,noguard}" \
    --repeat "${ASR_REPEAT:-1}"
} 2>&1 | tee "$OUT"

status=${PIPESTATUS[0]}
echo
echo "Báo cáo log: $ROOT/$OUT"
if [ "$status" -ne 0 ]; then
  echo "✘ Benchmark có lỗi hoặc biến thể default bị lỗi."
  exit "$status"
fi
echo "✔ Benchmark hoàn tất. Chỉ dùng clip có referenceStatus=approved để xếp hạng model."
