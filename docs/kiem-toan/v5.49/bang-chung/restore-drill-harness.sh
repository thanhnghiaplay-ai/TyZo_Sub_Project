#!/bin/bash
# Diễn tập khôi phục: docker giả chạy lệnh Postgres trên máy thử cục bộ (CSDL thử, không phải dữ liệu thật).
export PGHOST=127.0.0.1 PGPASSWORD=thu
SCRIPT="$1"; shift
docker() {
  case "$1" in
    exec) shift; [ "$1" = "-i" ] && shift; shift; "$@" ;;
    *) return 0 ;;
  esac
}
dc() { :; }
export -f docker
eval "$(sed '$d' "$SCRIPT")"
BACKUP_DIR="$(dirname "$0")/backup"
"$@"
