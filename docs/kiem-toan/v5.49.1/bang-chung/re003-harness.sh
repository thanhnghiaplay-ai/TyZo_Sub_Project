#!/bin/bash
# Diễn tập khôi phục (RE-003): «docker» giả chạy lệnh Postgres trên máy thử cục bộ (CSDL thử). Không đụng dữ liệu thật.
#   DRILL_DF_KB=<số>   giả ổ đĩa còn trống bao nhiêu KB
#   DRILL_RENAME_FAIL=1 giả lỗi lúc đổi tên CSDL
export PGHOST=127.0.0.1 PGPASSWORD=thu
SCRIPT="$1"; shift
docker() {
  case "$1" in
    exec) shift; [ "$1" = "-i" ] && shift; shift
      if [ "$1" = "df" ]; then
        if [ -n "${DRILL_DF_KB:-}" ]; then printf 'Filesystem 1024-blocks Used Available Capacity Mounted\nx 1 1 %s 1%% /\n' "$DRILL_DF_KB"; else df -Pk /; fi
        return
      fi
      "$@" ;;
    *) return 0 ;;
  esac
}
dc() { :; }
export -f docker
eval "$(sed '$d' "$SCRIPT")"
if [ -n "${DRILL_RENAME_FAIL:-}" ]; then
  eval "pg_sys_that() $(declare -f pg_sys | tail -n +2)"
  pg_sys() { case "$1" in *"rename to tyzo_cu_"*) echo "ERROR: giả lập đổi tên lỗi" >&2; return 1 ;; esac; pg_sys_that "$@"; }
fi
BACKUP_DIR="$(dirname "$0")/backup"
"$@"
