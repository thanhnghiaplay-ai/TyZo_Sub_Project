#!/bin/bash
# Diễn tập: CSDL đã chạy BẢN ĐẦU của 0037 (f5ebf7c, thiếu run_modal_parts) giống VPS, rồi chạy 0038.
export PGHOST=127.0.0.1 PGPASSWORD=thu
q() { psql -U tyzo -d tyzo_mig -v ON_ERROR_STOP=1 -q "$@"; }
psql -U tyzo -d postgres -qc "drop database if exists tyzo_mig" -c "create database tyzo_mig"
q -c "create table _migrations (name text primary key, applied_at timestamptz not null default now())"
for f in $(ls migrations/0*.sql | sort); do
  n=$(basename "$f"); [[ "$n" > "0036_live_history.sql" ]] && break
  q -f "$f" >/dev/null || { echo "lỗi $n"; exit 1; }; q -c "insert into _migrations(name) values ('$n')"
done
git show f5ebf7c:migrations/0037_modal_price.sql | q && q -c "insert into _migrations(name) values ('0037_modal_price.sql')"
echo "trước: run_modal_parts có = $(q -tAc "select to_regclass('run_modal_parts') is not null")"
echo "== 0038 CŨ (9ec8e65):"; git show 9ec8e65:migrations/0038_modal_reserve.sql | q --single-transaction 2>&1 | tail -1
echo "== 0038/0039 MỚI qua scripts/migrate.mjs:"
DATABASE_URL="postgres://tyzo:thu@127.0.0.1:5432/tyzo_mig?sslmode=disable" node scripts/migrate.mjs 2>&1 | tail -3; echo "exit ${PIPESTATUS[0]}"
echo "sau: $(q -tAc "select string_agg(name, ',' order by name) from _migrations where name >= '0037'")"
echo "run_modal_parts cột: $(q -tAc "select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_name='run_modal_parts'")"
echo "run_tickets cột mới: $(q -tAc "select string_agg(column_name, ',' order by column_name) from information_schema.columns where table_name='run_tickets' and (column_name like 'modal%' or column_name like 'close_%')")"
echo "== chạy lại migrate lần 2 (không làm gì):"; DATABASE_URL="postgres://tyzo:thu@127.0.0.1:5432/tyzo_mig?sslmode=disable" node scripts/migrate.mjs 2>&1 | tail -1
echo "== CSDL đủ 0037 (bản mới) chạy 0038 mới:"
psql -U tyzo -d postgres -qc "drop database if exists tyzo_mig2" -c "create database tyzo_mig2"
DATABASE_URL="postgres://tyzo:thu@127.0.0.1:5432/tyzo_mig2?sslmode=disable" node scripts/migrate.mjs 2>&1 | tail -1; echo "exit ${PIPESTATUS[0]}"
