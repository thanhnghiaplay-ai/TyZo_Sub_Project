#!/usr/bin/env bash
# CPU only. Download each immutable source once and verify cached clips on reuse.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
cache=${1:?Chỉ định thư mục lưu FLEURS}
mkdir -p "$cache"
exec 9>"$cache/prepare.lock"
flock 9
tmp=$(mktemp -d "$cache/.prepare-XXXXXXXX")
trap 'rm -rf "$tmp"' EXIT
if [[ ! -s "$cache/revision" ]]; then
  curl -fsSL --retry 2 https://huggingface.co/api/datasets/google/fleurs/revision/main -o "$tmp/info.json"
  python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["sha"])' "$tmp/info.json" > "$tmp/revision"
  grep -Eq '^[a-f0-9]{40}$' "$tmp/revision"
  mv "$tmp/revision" "$cache/revision"
fi
rev=$(cat "$cache/revision")
[[ $rev =~ ^[a-f0-9]{40}$ ]] || { echo 'Revision FLEURS không hợp lệ' >&2; exit 1; }
out="$cache/set-$rev"
if [[ ! -d "$out" ]]; then
  base="https://huggingface.co/datasets/google/fleurs/resolve/$rev/data/ko_kr"
  for file in test.tsv audio/test.tar.gz; do
    dest="$cache/$rev-${file##*/}"
    if [[ ! -s "$dest" ]]; then
      curl -fL --retry 2 "$base/$file" -o "$tmp/download"
      mv "$tmp/download" "$dest"
    fi
  done
  python3 "$here/prepare.py" "$cache/$rev-test.tsv" "$cache/$rev-test.tar.gz" "$out" "$rev"
fi
python3 - "$out" "$rev" <<'PY'
import hashlib, json, sys
from pathlib import Path
root = Path(sys.argv[1])
manifest = json.loads((root / 'manifest.json').read_text())
clips = manifest['clips']
if (manifest['revision'], manifest['config'], manifest['split']) != (sys.argv[2], 'ko_kr', 'test'):
    sys.exit('Manifest không đúng phiên bản/tập test')
if len(clips) != 8 or len({clip['id'] for clip in clips}) != 8:
    sys.exit('Manifest thiếu câu hoặc trùng ID')
for clip in clips:
    name = clip['wav']
    if Path(name).name != name or hashlib.sha256((root / name).read_bytes()).hexdigest() != clip['sha256']:
        sys.exit(f'WAV không khớp manifest: {name}')
print(f"Đã kiểm tra 8 WAV · {sum(c['samples'] for c in clips)/16000:.1f} giây · {root}/manifest.json")
PY
