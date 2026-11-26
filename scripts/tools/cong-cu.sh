#!/usr/bin/env bash
# Bộ công cụ phát triển TyZo (xem docs/CONG-CU.md). Chỉ ĐỌC và BÁO CÁO, không sửa code, không đẩy, không đụng database thật.
#   bash scripts/tools/cong-cu.sh cai      # cài/kiểm các công cụ dòng lệnh (phiên mới)
#   bash scripts/tools/cong-cu.sh bi-mat   # gitleaks: tìm key/mật khẩu lộ (che giá trị)
#   bash scripts/tools/cong-cu.sh bao-mat  # semgrep: quét mẫu mã không an toàn
#   bash scripts/tools/cong-cu.sh phu-thuoc # dependency-cruiser: vòng import, import sai tầng
#   bash scripts/tools/cong-cu.sh so-do    # graphify: dựng lại sơ đồ code (không gọi AI)
#   bash scripts/tools/cong-cu.sh tat-ca   # chạy 4 việc trên
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
OUT="${TYZO_TOOLS_OUT:-/tmp/tyzo-cong-cu}"; mkdir -p "$OUT"
# Phiên bản đã chọn (cũ hơn ~2 tuần so với lúc cài, nguồn chính thức). Đổi ở đây khi nâng cấp.
SEMGREP_VER=1.185.0
SEMGREP_RULES_REF=a5ad1714f00c9f7fde980cab0ea1d6dc6d414fd2   # github.com/semgrep/semgrep-rules
GITLEAKS_VER=v8.30.0                                           # github.com/gitleaks/gitleaks (dựng từ mã nguồn)
DEPCRUISE_VER=18.7.2
GRAPHIFY_VER=0.9.119
PGMCP_REF=7136a30   # github.com/crystaldba/postgres-mcp: bản sửa pglast (bản 0.3.0 trên PyPI không cài được nữa)
export PATH="$HOME/.local/bin:/usr/local/go/bin:$HOME/go/bin:$PATH"

cai() {
  command -v semgrep >/dev/null || uv tool install -q "semgrep==$SEMGREP_VER"
  command -v postgres-mcp >/dev/null || uv tool install -q --python 3.12 "git+https://github.com/crystaldba/postgres-mcp@$PGMCP_REF"
  command -v gitleaks >/dev/null || GOBIN=/usr/local/bin go install "github.com/zricethezav/gitleaks/v8@$GITLEAKS_VER"
  command -v graphify >/dev/null || uv tool install -q "graphifyy==$GRAPHIFY_VER"
  for t in semgrep gitleaks postgres-mcp graphify; do printf '%-14s %s\n' "$t" "$(command -v "$t" || echo THIẾU)"; done
}

bi_mat() {
  gitleaks git . --redact --no-banner --report-format json --report-path "$OUT/gitleaks-lich-su.json"; local a=$?
  gitleaks dir . --redact --no-banner --report-format json --report-path "$OUT/gitleaks-hien-tai.json"; local b=$?
  echo "Báo cáo (đã che giá trị): $OUT/gitleaks-*.json"; [ $a -eq 0 ] && [ $b -eq 0 ]
}

bao_mat() {
  local r="$OUT/semgrep-rules"
  if [ ! -d "$r/.git" ]; then
    git clone -q --filter=blob:none --sparse https://github.com/semgrep/semgrep-rules "$r"
    git -C "$r" sparse-checkout set typescript javascript generic/secrets
  fi
  # Kiểm toán NEW-007: luật phải đúng commit đã ghim; không lấy được thì DỪNG (trước đây lỗi bị bỏ qua, quét bằng luật khác).
  git -C "$r" fetch -q --depth 1 origin "$SEMGREP_RULES_REF" 2>/dev/null || true
  git -C "$r" checkout -q "$SEMGREP_RULES_REF" 2>/dev/null || { echo "✘ Không lấy được luật semgrep $SEMGREP_RULES_REF" >&2; return 2; }
  [ "$(git -C "$r" rev-parse HEAD)" = "$SEMGREP_RULES_REF" ] || { echo "✘ Luật semgrep không đúng commit đã ghim" >&2; return 2; }
  # NEW-002: --error để có phát hiện mức ERROR/WARNING thì trả mã khác 0; giữ mã của semgrep, không để echo che.
  semgrep scan --metrics=off --disable-version-check --error \
    --config "$r/typescript" --config "$r/javascript" --config "$r/generic/secrets" \
    --exclude '*.test.ts' --exclude 'routeTree.gen.ts' --severity ERROR --severity WARNING \
    --json -o "$OUT/semgrep.json" src server scripts deploy
  local ma=$?
  echo "Báo cáo: $OUT/semgrep.json (bỏ mức INFO; xem phân loại đúng/sai ở docs/CONG-CU.md). Mã thoát: $ma"
  return $ma
}

phu_thuoc() { npx -y "dependency-cruiser@$DEPCRUISE_VER" src --config .dependency-cruiser.cjs --output-type err; }

so_do() { graphify update . --force; }

case "${1:-}" in
  cai) cai ;;
  bi-mat) bi_mat ;;
  bao-mat) bao_mat ;;
  phu-thuoc) phu_thuoc ;;
  so-do) so_do ;;
  # NEW-001: chạy đủ 4 việc, nhưng mã thoát là lỗi đầu tiên gặp (trước đây chỉ theo việc cuối cùng).
  tat-ca) ma=0; for viec in bi_mat bao_mat phu_thuoc so_do; do "$viec"; m=$?; [ "$ma" -eq 0 ] && ma=$m; done; exit "$ma" ;;
  *) sed -n '2,9p' "$0" ;;
esac
