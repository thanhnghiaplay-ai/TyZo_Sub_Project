import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const text = readFileSync(new URL("../deploy/vps/tyzo.sh", import.meta.url), "utf8");
const fn = text.slice(text.indexOf("trang_thai_web_vps() {"), text.indexOf("\nsao_luu() ("));
const journal = text.slice(text.indexOf('NHAT_KY_CHUYEN_SUFFIX=".chuyen"'), text.indexOf("# Bước cuối Vercel"));
const compare = text.slice(text.indexOf("khop_bang_ke() {"), text.indexOf("\nnap_dump() {"));
function drill(code, { destManifest = "bang|a|1|x" } = {}) {
  const shim = `
n=0
CONF="$(mktemp)"
pg_tu_xa() { n=$((n+1)); if [ -f "$fixture_counter" ]; then echo 8; else touch "$fixture_counter"; echo 0; fi; }
do_() { echo "$*"; }
xanh() { echo "SUCCESS $*"; }
vang() { echo "WARNING $*"; }
so_bang_tep() { echo 8; }
# RE3-007: bảng kê nguồn/đích (số dòng + mã băm). Đích khác nguồn thì không được báo thành công.
bang_ke_vps() { echo "bang|a|1|x"; }
bang_ke_xa() { echo "${destManifest}"; }
dc() { :; }
docker() {
  if [ "$1" = exec ]; then echo dumpfixture; return 0; fi
  if [ "$1" = ps ]; then return 0; fi
  case " $* " in *" --exit-on-error "*) echo EXIT_ON_ERROR;; esac
  case " $* " in *" --single-transaction "*) echo SINGLE_TRANSACTION;; esac
  return ${code}
}
fixture_counter=$(mktemp)
rm -f "$fixture_counter"
${compare}
${journal}
${fn}
chep_len_neon fixture-target
rc=$?
rm -f "$fixture_counter" "$CONF" "$CONF.neon.lock" "$CONF.chuyen"
exit "$rc"
`;
  return spawnSync("bash", ["-c", shim], {
    encoding: "utf8",
    env: { PATH: process.env.PATH, TMPDIR: "/tmp" },
  });
}
test("RE2-005: restore error despite matching table counts cannot report success", () => {
  const r = drill(1);
  assert.notEqual(r.status, 0, r.stdout);
  assert.ok(!r.stdout.includes("SUCCESS"), r.stdout);
});
test("RE2-005: restore success requires atomic fail-fast flags", () => {
  const r = drill(0);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.ok(r.stdout.includes("EXIT_ON_ERROR"), r.stdout);
  assert.ok(r.stdout.includes("SINGLE_TRANSACTION"), r.stdout);
  assert.ok(r.stdout.includes("SUCCESS"), r.stdout);
});
test("RE3-007: restore exit 0 and equal table counts but different rows cannot report success", () => {
  const r = drill(0, { destManifest: "bang|a|0|-" });
  assert.notEqual(r.status, 0, r.stdout);
  assert.ok(!r.stdout.includes("SUCCESS"), r.stdout);
  assert.ok(r.stdout.includes("lệch: bang|a"), r.stdout);
});
