#!/usr/bin/env bash
# Start a production Node build separately, with loopback port 17750 and a clean env.
set -euo pipefail
run="${1:?usage: mixed-soak.sh NEW_OUTPUT_DIR}"
mkdir "$run"
app=http://127.0.0.1:17750
curl -fsS --max-time 15 "$app/gioi-thieu" -o /dev/null
export TYZO_TEST_PG_URL=postgresql://tyzo@127.0.0.1:55439/tyzo_test
export TYZO_AUDIT_WEB_BASE="$app"
export TYZO_AUDIT_WEB_DURATION=61m
{
  echo "head=$(git rev-parse HEAD)"
  echo "node=$(node --version)"
  echo "$(k6 version)"
  echo "start=$(date -u +%FT%TZ)"
} > "$run/meta.txt"
k6 run --quiet --summary-export "$run/k6-web.json" docs/kiem-toan/codex/integration-load-soak/web-load.js > "$run/k6-web.log" 2>&1 &
web_pid=$!
sleep 3
kill -0 "$web_pid"
printf '%s\n' 'UTC,pg_connections,pg_active,pg_lock_waits,pg_rss_kb,node_web_rss_kb,node_web_cpu,k6_rss_kb,k6_cpu' > "$run/runtime.csv"
(
  while kill -0 "$web_pid" 2>/dev/null; do
    pg="$(timeout 4 psql -XAt -v ON_ERROR_STOP=1 "$TYZO_TEST_PG_URL" -c "select count(*), count(*) filter (where state='active'), count(*) filter (where wait_event_type='Lock') from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid()" | tr '|' ',')" || pg=',,'
    read -r node_rss node_cpu < <(ps -eo rss=,pcpu=,args= | awk '$3=="node" && $4==".output/server/index.mjs" { print $1,$2; exit }' || true) || true
    read -r k6_rss k6_cpu < <(ps -p "$web_pid" -o rss=,pcpu= || true) || true
    pg_rss="$(ps -o rss= -C postgres | awk '{s+=$1} END {print s+0}')"
    printf '%s,%s,%s,%s,%s,%s,%s\n' "$(date -u +%FT%TZ)" "$pg" "$pg_rss" "${node_rss:-}" "${node_cpu:-}" "${k6_rss:-}" "${k6_cpu:-}" >> "$run/runtime.csv"
    sleep 10
  done
) &
sample_pid=$!
set +e
bash docs/kiem-toan/v5.49.4/soak.sh 3600 "$run/ai" > "$run/ai.log" 2>&1
ai_status=$?
wait "$web_pid"
web_status=$?
wait "$sample_pid"
printf 'ai_exit=%s\nweb_exit=%s\nend=%s\n' "$ai_status" "$web_status" "$(date -u +%FT%TZ)" | tee "$run/exit.txt"
test "$ai_status" = 0 && test "$web_status" = 0
