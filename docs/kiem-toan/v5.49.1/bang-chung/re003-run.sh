#!/bin/bash
S="$1"; cd "$2"
export PGHOST=127.0.0.1 PGPASSWORD=thu
state() { echo "   [tyzo] t1=$(psql -U tyzo -d tyzo -tAc 'select count(*) from t1' 2>&1|head -1) con=$(psql -U tyzo -d tyzo -tAc 'select count(*) from con' 2>&1|head -1) | CSDL: $(psql -U tyzo -d postgres -tAc "select string_agg(regexp_replace(datname,'_[0-9]{8}_[0-9]{6}$','_<giờ>'),',' order by datname) from pg_database where datname='tyzo' or datname like 'tyzo_cu_%' or datname like 'tyzo_hong_%' or datname='tyzo_moi'")"; }
clean() { for d in $(psql -U tyzo -d postgres -tAc "select datname from pg_database where datname like 'tyzo_cu_%' or datname like 'tyzo_hong_%' or datname='tyzo_moi'"); do psql -U tyzo -d postgres -qc "drop database $d"; done; }
mkcur() { psql -U tyzo -d postgres -qc "drop database if exists tyzo" -c "create database tyzo"; psql -U tyzo -d tyzo -q -c "create table t1 (id int); insert into t1 select generate_series(1,7)" -c "create table con (id int); insert into con values (1)"; }
run() { # run <nhãn> <script> <tệp> [KEY=VAL]
  local label="$1" sc="$2" f="$3" extra="${4:-}"
  echo "=== $label"; mkcur; clean; state
  if [ -n "$extra" ]; then echo "dong-y" | env "$extra" "$S/drill2/harness.sh" "$sc" nap_dump "$f"; else echo "dong-y" | "$S/drill2/harness.sh" "$sc" nap_dump "$f"; fi > /tmp/drill-out.txt 2>&1
  local ma=$?
  sed 's/\x1b\[[0-9;]*m//g' /tmp/drill-out.txt | grep -v "^NOTICE\|^DETAIL\|drop cascades" | sed "s#$S#<scratchpad>#g; s/_[0-9]\{8\}_[0-9]\{6\}/_<giờ>/g" | sed 's/^/   /'
  echo "   exit=$ma"; state
}
run "TRƯỚC (93bee64): tệp có khóa ngoại lỗi, người dùng gõ dong-y" "$S/drill2/tyzo-old.sh" "$S/drill2/fk.dump"
run "TRƯỚC (93bee64): tệp cụt 60%, người dùng gõ dong-y" "$S/drill2/tyzo-old.sh" "$S/drill2/cut.dump"
run "SAU: tệp có khóa ngoại lỗi" deploy/vps/tyzo.sh "$S/drill2/fk.dump"
run "SAU: tệp cụt 60%" deploy/vps/tyzo.sh "$S/drill2/cut.dump"
run "SAU: tệp hỏng mục lục" deploy/vps/tyzo.sh "$S/drill2/broken.dump"
run "SAU: tệp trống" deploy/vps/tyzo.sh "$S/drill2/empty.dump"
run "SAU: ổ đĩa gần đầy (giả còn 100 KB)" deploy/vps/tyzo.sh "$S/drill2/good.dump" DRILL_DF_KB=100
run "SAU: đổi tên lỗi (giả lập)" deploy/vps/tyzo.sh "$S/drill2/good.dump" DRILL_RENAME_FAIL=1
run "SAU: tệp tốt" deploy/vps/tyzo.sh "$S/drill2/good.dump"
