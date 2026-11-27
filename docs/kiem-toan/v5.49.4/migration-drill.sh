#!/usr/bin/env bash
# Diễn tập migration 0053/0054 bằng scripts/migrate.mjs trên CSDL THỬ riêng (127.0.0.1:55439). Không đụng CSDL thật.
set -u
H="-h 127.0.0.1 -p 55439 -U postgres"
u() { echo "postgresql://postgres@127.0.0.1:55439/$1?sslmode=disable"; }
for db in mig_fresh mig_upgrade; do psql $H -qc "drop database if exists $db" >/dev/null; psql $H -qc "create database $db"; done
echo "== 1. Cài mới (mọi migration)"; DATABASE_URL="$(u mig_fresh)" node scripts/migrate.mjs | tail -3; echo "exit=$?"
echo "== 2. Lặp lại (phải không làm gì)"; DATABASE_URL="$(u mig_fresh)" node scripts/migrate.mjs | tail -2
echo "== 3. Nâng cấp: dựng tới 0052 + dữ liệu cũ, rồi chạy migrate"
tmp="$(mktemp -d)"; mkdir -p "$tmp/migrations" "$tmp/scripts"
cp scripts/migrate.mjs scripts/migration-plan.mjs scripts/migration-gate.mjs "$tmp/scripts/"; ln -s "$PWD/node_modules" "$tmp/node_modules"
for f in migrations/*.sql; do n="$(basename "$f")"; [[ "$n" < "0053" ]] && cp "$f" "$tmp/migrations/"; done
DATABASE_URL="$(u mig_upgrade)" node "$tmp/scripts/migrate.mjs" | tail -1
psql $H -d mig_upgrade -qc "insert into work_admissions (id,user_id,provider,model,lane,status) values ('old1','u','groq','m','batch','running'),('old2','u','alibaba','l','live','unknown')"
psql $H -d mig_upgrade -qc "insert into provider_spend_events (id,provider,model,base_vnd,usd_micro) values ('old-ev','alibaba','m',1.5,60)"
before="$(psql $H -d mig_upgrade -tAc "select md5(string_agg(t::text, ',' order by t::text)) from (select id,user_id,provider,model,lane,status from work_admissions) t")"
DATABASE_URL="$(u mig_upgrade)" node scripts/migrate.mjs | tail -3
after="$(psql $H -d mig_upgrade -tAc "select md5(string_agg(t::text, ',' order by t::text)) from (select id,user_id,provider,model,lane,status from work_admissions) t")"
echo "dữ liệu cũ work_admissions giữ nguyên: $([ "$before" = "$after" ] && echo CO || echo KHONG)"
psql $H -d mig_upgrade -tAc "select 'ev', count(*) from provider_spend_events; select 'ref-null', count(*) from work_admissions where ref is null; select 'fn', tyzo_admit('newid','u2','groq','m','batch','{\"enabled\":true,\"batch\":48,\"modal\":8,\"live\":48,\"perUser\":2,\"perUserModal\":3,\"perProvider\":40,\"perModel\":24,\"liveReserve\":0}'::jsonb,150,null)"
psql $H -d mig_upgrade -tAc "select 'unknown-giu-nguyen', status from work_admissions where id='old2'"
echo "== 4. Lỗi giữa migration: 0054 hỏng phải rollback cả tệp"
psql $H -qc "drop database if exists mig_fault" >/dev/null; psql $H -qc "create database mig_fault"
DATABASE_URL="$(u mig_fault)" node "$tmp/scripts/migrate.mjs" | tail -1
cp migrations/0053_live_usage_receipts.sql "$tmp/migrations/"
{ cat migrations/0054_admission_kernel.sql; echo "select 1/0;"; } > "$tmp/migrations/0054_admission_kernel.sql"
DATABASE_URL="$(u mig_fault)" node "$tmp/scripts/migrate.mjs" > "$tmp/out" 2>&1; echo "exit=$? (khác 0 là đúng)"
psql $H -d mig_fault -tAc "select 'ref-col', count(*) from information_schema.columns where table_name='work_admissions' and column_name='ref'; select 'fn', count(*) from pg_proc where proname='tyzo_admit'; select 'applied', string_agg(name, ',' order by name) from _migrations where name >= '0053'"
cp migrations/0054_admission_kernel.sql "$tmp/migrations/"
DATABASE_URL="$(u mig_fault)" node "$tmp/scripts/migrate.mjs" | tail -1
psql $H -d mig_fault -tAc "select 'after-fix applied', string_agg(name, ',' order by name) from _migrations where name >= '0053'"
for db in mig_fresh mig_upgrade mig_fault; do psql $H -qc "drop database if exists $db" >/dev/null; done
