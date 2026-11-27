#!/usr/bin/env bash
# Đóng một bộ hồ sơ kết quả duy nhất cho kiểm toán độc lập. Đối số: <tệp zip đích>.
set -euo pipefail
dst="$1"; root="$(git rev-parse --show-toplevel)"; cd "$root"
[ -z "$(git status --porcelain)" ] || { echo "Cây chưa sạch; commit trước khi đóng gói." >&2; exit 1; }
head="$(git rev-parse HEAD)"; tmp="$(mktemp -d)"; pkg="$tmp/TyZo_v5.49.4_Claude_Result"; mkdir -p "$pkg"
cp -r docs/kiem-toan/v5.49.4 "$pkg/v5.49.4"
git ls-files -z | xargs -0 sha256sum | python3 -c "
import sys,json,os
rows=[{'path':l[66:].rstrip('\n'),'sha256':l[:64],'bytes':os.path.getsize(l[66:].rstrip('\n'))} for l in sys.stdin]
json.dump(rows,open(sys.argv[1],'w'),indent=1)" "$pkg/SOURCE_MANIFEST.json"
git log --format='%H %ad %s' --date=iso 6d906ba07f12e4f6938c3f493fe29f08472313f3..HEAD > "$pkg/COMMITS.txt"
git diff --stat 6d906ba07f12e4f6938c3f493fe29f08472313f3 HEAD > "$pkg/DIFFSTAT.txt"
git diff 6d906ba07f12e4f6938c3f493fe29f08472313f3 HEAD -- src scripts migrations deploy package.json .gitignore .gitleaksignore > "$pkg/SOURCE_DIFF.patch"
cat > "$pkg/00_START_HERE.md" <<TXT
# TyZo v5.49.4 — hồ sơ kết quả (Claude) cho kiểm toán độc lập
Repo thanhnghiaplay-ai/TyZo_Sub_Project, nhánh ccr-20605d15-2nil6k, HEAD đóng gói ${head}, gốc 6d906ba07f12e4f6938c3f493fe29f08472313f3.
Mã sản phẩm khóa tại c5c39c7 (sau đó chỉ tài liệu/bằng chứng/graph). SOURCE_MANIFEST.json = sha256 mọi tệp được theo dõi tại HEAD đóng gói.
Đọc: v5.49.4/BAO_CAO_KET_QUA.md → RE3_KET_QUA.json, RE2_KET_QUA.json, DOI_CHIEU_80.json → từng RE3-*.md → bang-chung/*.log (mỗi log ghi HEAD/fingerprint/lệnh/mã thoát).
SOURCE_DIFF.patch: toàn bộ thay đổi mã so với gốc. COMMITS.txt: các checkpoint.
Không merge main, không deploy, không GPU, không CSDL khách. PASS cục bộ ≠ production. Mục PARTIAL/BLOCKED ghi rõ trong báo cáo.
TXT
( cd "$tmp" && zip -qr "$root/$dst" TyZo_v5.49.4_Claude_Result )
rm -rf "$tmp"; sha256sum "$dst"; unzip -l "$dst" | tail -1
