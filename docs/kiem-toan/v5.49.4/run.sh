#!/usr/bin/env bash
# Chạy một lệnh kiểm thử và lưu bằng chứng: bang-chung/<nhãn>.log (+ exit, thời gian, HEAD, fingerprint).
# Nhãn đã tồn tại thì từ chối (không ghi đè bằng chứng, kể cả bằng chứng thất bại).
set -u
dir="$(cd "$(dirname "$0")" && pwd)/bang-chung"; label="$1"; shift
out="$dir/$label.log"
[ -e "$out" ] && { echo "Nhãn $label đã có; dùng nhãn mới." >&2; exit 97; }
root="$(git rev-parse --show-toplevel)"
fp="$(cd "$root" && git ls-files -z src scripts migrations server package.json package-lock.json | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)"
{
  echo "# label=$label"; echo "# head=$(git rev-parse HEAD) dirty=$(git status --porcelain | wc -l)"
  echo "# fingerprint(src,scripts,migrations,server,package*)=$fp"
  echo "# start=$(date -u +%FT%TZ)"; echo "# cmd=$*"
} > "$out"
start=$(date +%s)
# Môi trường sạch: không mang DATABASE_URL hay key nhà cung cấp; chỉ CSDL thử riêng.
env -i PATH="$PATH" HOME="$HOME" TYZO_TEST_PG_URL="${TYZO_TEST_PG_URL:-}" NODE_OPTIONS="${NODE_OPTIONS:-}" "$@" >> "$out" 2>&1
code=$?
echo "# exit=$code seconds=$(( $(date +%s) - start )) end=$(date -u +%FT%TZ)" >> "$out"
tail -5 "$out"; exit $code
