#!/usr/bin/env bash
# Soak liên tục: lặp (1) cầu nối live WebSocket thật + PostgreSQL thật quyết toán (re2-live-bench, 1..300),
# (2) cửa nhận việc 25/50/100/200 + đợt 300 (admission-bench 3 s/nhóm). Dừng ngay ở lần lỗi đầu (FAILED), không cộng dồn.
# Đối số: <giây> <thư mục kết quả>. Chỉ CSDL thử 127.0.0.1:55439. Upstream giả; không GPU/nhà thật.
set -u
dur="$1"; out="$2"; mkdir -p "$out"
start=$(date +%s); i=0; status=PASS
echo "{\"start\":\"$(date -u +%FT%TZ)\",\"seconds\":$dur,\"head\":\"$(git rev-parse HEAD)\"}" > "$out/meta.json"
while [ $(( $(date +%s) - start )) -lt "$dur" ]; do
  i=$((i+1))
  t0=$(date +%s%N)
  TYZO_BENCH_OUT="$out/live-$i.json" node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/re2-live-bench.ts > "$out/live-$i.log" 2>&1; a=$?
  node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/admission-bench.ts 3 > "$out/adm-$i.json" 2> "$out/adm-$i.log"; b=$?
  rss=$(ps -o rss= -C postgres | awk '{s+=$1} END {print s+0}')
  echo "{\"iter\":$i,\"t\":$(( $(date +%s) - start )),\"ms\":$(( ($(date +%s%N) - t0) / 1000000 )),\"live_exit\":$a,\"adm_exit\":$b,\"pg_rss_kb\":$rss}" >> "$out/iterations.jsonl"
  if [ $a != 0 ] || [ $b != 0 ]; then status=FAILED; break; fi
done
echo "{\"end\":\"$(date -u +%FT%TZ)\",\"elapsed\":$(( $(date +%s) - start )),\"iterations\":$i,\"status\":\"$status\"}" > "$out/result.json"
cat "$out/result.json"; [ "$status" = PASS ]
