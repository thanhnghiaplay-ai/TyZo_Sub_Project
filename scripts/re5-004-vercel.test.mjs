/**
 * RE5-004: đưa web lên Vercel khi chuyển nguồn. Chạy đúng chay_vercel_sh / buoc_vercel / ghi_chuyen / chuyen_dang_do
 * trong deploy/vps/tyzo.sh với một «npx» giả lưu env vào tệp và chèn lỗi theo FAKE_FAULT. Không gọi Vercel thật.
 */
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const root = new URL("..", import.meta.url).pathname;
const text = readFileSync(join(root, "deploy/vps/tyzo.sh"), "utf8");
const lib = text.slice(0, text.lastIndexOf('main "$@"; exit $?'));

// npx giả: «vercel env add K --environment production [--force]» đọc giá trị từ stdin; không --force mà đã có thì lỗi.
const fakeNpx = `#!/usr/bin/env bash
F="$FAKE_DIR"; echo "$*" >> "$F/calls.log"
fault() { [[ ",\${FAKE_FAULT:-}," == *",$1,"* ]]; }
args=("$@"); i=0; while [[ "\${args[$i]}" != vercel@* ]]; do i=$((i+1)); done
[ "\${args[$i]}" = "vercel@$EXPECT_VERSION" ] || { echo "sai phiên bản \${args[$i]}" >&2; exit 9; }
rest=("\${args[@]:$((i+1))}")
sub=""; for a in "\${rest[@]}"; do case "$a" in link|env|deploy|inspect|domains) sub="$a"; break ;; esac; done
case "$sub" in
  link) exit 0 ;;
  env)
    act=""; k=""; force=0; take=0
    for a in "\${rest[@]}"; do
      if [ "$take" = 1 ]; then k="$a"; take=0; continue; fi
      case "$a" in add|rm) act="$a"; take=1 ;; --force) force=1 ;; esac
    done
    if [ "$act" = rm ]; then rm -f "$F/env/$k"; exit 0; fi
    val="$(cat)"
    if fault "add-fail-$k"; then exit 1; fi
    if [ -f "$F/env/$k" ] && [ "$force" != 1 ]; then echo "exists" >&2; exit 1; fi
    printf '%s' "$val" > "$F/env/$k"; exit 0 ;;
  deploy)
    if fault deploy-lost; then exit 1; fi
    cp -r "$F/env" "$F/deployed-env"; echo "Building..."; echo "https://tyzo-abc.vercel.app"; exit 0 ;;
  inspect) if fault not-ready; then echo "status ● Error"; else echo "status ● Ready"; fi; exit 0 ;;
  domains) exit 0 ;;
esac
exit 2
`;

function run(fault = "", { journal = "" } = {}) {
  const work = mkdtempSync(join(tmpdir(), "re5-004-"));
  mkdirSync(join(work, "bin")); mkdirSync(join(work, "env"));
  writeFileSync(join(work, "bin", "npx"), fakeNpx); chmodSync(join(work, "bin", "npx"), 0o755);
  // Vercel đang có giá trị cũ cho mọi biến.
  for (const k of ["DATABASE_URL", "BETTER_AUTH_SECRET", "LIVE_BRIDGE_URL"]) writeFileSync(join(work, "env", k), `old-${k}`);
  writeFileSync(join(work, "vars"), "DATABASE_URL=postgres://neon/new\nBETTER_AUTH_SECRET=new-secret\nLIVE_BRIDGE_URL=wss://x/live\n");
  if (journal) writeFileSync(join(work, "tyzo.conf.chuyen"), journal);
  const script = `source "${join(work, "lib.sh")}"
CONF="${work}/tyzo.conf"
chay_vercel_sh > "${work}/chay.sh"
ghi_chuyen vercel-bat-dau tyzo-sub
VERCEL_CLI_VERSION="$VERCEL_CLI_VERSION" ENVF="${work}/vars" TOK=t PROJ=tyzo-sub SCOPE= DOM= bash "${work}/chay.sh" > "${work}/ra.txt" 2>&1
kq=$?
b="$(buoc_vercel "${work}/ra.txt")"
ghi_chuyen "$([ "$kq" = 0 ] && [ "$b" = xong ] && echo xong || echo "loi-$b")" tyzo-sub
echo "kq=$kq buoc=$b"
if chuyen_dang_do; then echo dang-do; else echo da-ket-thuc; fi`;
  writeFileSync(join(work, "lib.sh"), lib);
  const r = spawnSync("bash", ["-c", script], {
    encoding: "utf8",
    env: { PATH: `${work}/bin:${process.env.PATH}`, HOME: work, TMPDIR: work, FAKE_DIR: work, FAKE_FAULT: fault, EXPECT_VERSION: /VERCEL_CLI_VERSION="([^"]+)"/.exec(text)[1] },
    timeout: 60_000,
  });
  const env = (k) => readFileSync(join(work, "env", k), "utf8");
  return { r, work, env, calls: readFileSync(join(work, "calls.log"), "utf8"), journal: readFileSync(join(work, "tyzo.conf.chuyen"), "utf8") };
}

test("RE5-004: CLI ghim phiên bản, không còn env rm, ghi đè bằng --force qua stdin", () => {
  assert.match(text, /^VERCEL_CLI_VERSION="\d+\.\d+\.\d+"$/m);
  assert.doesNotMatch(text, /vercel@latest/);
  const { r, env, calls, journal } = run();
  assert.match(r.stdout, /kq=0 buoc=xong/);
  assert.match(r.stdout, /da-ket-thuc/);
  assert.doesNotMatch(calls, /\benv rm\b/);
  assert.equal(env("DATABASE_URL"), "postgres://neon/new");
  assert.doesNotMatch(calls, /postgres:\/\/neon\/new|new-secret/, "giá trị bí mật không nằm trên dòng lệnh");
  assert.match(journal, /vercel-bat-dau tyzo-sub\n.* xong tyzo-sub\n$/);
});

test("RE5-004: thêm biến lỗi giữa chừng → biến cũ vẫn còn (không mất biến), không deploy, nhật ký dở dang", () => {
  const { r, env, calls, journal, work } = run("add-fail-BETTER_AUTH_SECRET");
  assert.match(r.stdout, /kq=1 buoc=env-do-dang/);
  assert.match(r.stdout, /dang-do/);
  assert.equal(env("DATABASE_URL"), "postgres://neon/new");
  assert.equal(env("BETTER_AUTH_SECRET"), "old-BETTER_AUTH_SECRET", "biến lỗi giữ giá trị cũ, không bị xóa");
  assert.equal(env("LIVE_BRIDGE_URL"), "old-LIVE_BRIDGE_URL");
  assert.doesNotMatch(calls, / deploy /);
  assert.equal(existsSync(join(work, "deployed-env")), false);
  assert.match(journal, / loi-env-do-dang tyzo-sub\n$/);
});

test("RE5-004: mất kết nối lúc deploy → không rõ kết quả, nhật ký giữ dở dang", () => {
  const { r, journal } = run("deploy-lost");
  assert.match(r.stdout, /kq=3 buoc=deploy-chua-ro/);
  assert.match(r.stdout, /dang-do/);
  assert.match(journal, / loi-deploy-chua-ro /);
});

test("RE5-004: deploy trả địa chỉ nhưng bản dựng chưa Ready → không coi là xong", () => {
  const { r } = run("not-ready");
  assert.match(r.stdout, /kq=3 buoc=deploy-chua-ro/);
});

test("RE5-004: nhật ký dở dang từ lần trước (mất SSH/kill) được nhận ra; «da-mo-lai» hoặc «xong» kết thúc", () => {
  const work = mkdtempSync(join(tmpdir(), "re5-004j-"));
  writeFileSync(join(work, "lib.sh"), lib);
  const probe = (j) => {
    writeFileSync(join(work, "tyzo.conf.chuyen"), j);
    return spawnSync("bash", ["-c", `source "${work}/lib.sh"; CONF="${work}/tyzo.conf"; chuyen_dang_do && echo dang-do || echo da-ket-thuc`], { encoding: "utf8" }).stdout.trim();
  };
  assert.equal(probe("2026-11-27T00:00:00Z khoa-nguon neon-khop\n"), "dang-do");
  assert.equal(probe("2026-11-27T00:00:00Z khoa-nguon neon-khop\n2026-11-27T00:01:00Z vercel-bat-dau p\n"), "dang-do");
  assert.equal(probe("2026-11-27T00:00:00Z khoa-nguon x\n2026-11-27T00:02:00Z xong p\n"), "da-ket-thuc");
  assert.equal(probe("2026-11-27T00:00:00Z khoa-nguon x\n2026-11-27T00:02:00Z da-mo-lai nguon-vps\n"), "da-ket-thuc");
  // khoa_va_doi_soat_chuyen phải từ chối trước khi đụng dịch vụ/CSDL khi nhật ký dở dang.
  writeFileSync(join(work, "tyzo.conf.chuyen"), "2026-11-27T00:00:00Z loi-deploy-chua-ro p\n");
  const r = spawnSync("bash", ["-c", `source "${work}/lib.sh"; CONF="${work}/tyzo.conf"; printf 'MODE=full\\nDB=local\\n' > "$CONF"
pg_sys() { echo "PG_DUNG" >&2; echo t; }; dung_web_vps() { echo "DUNG_WEB" >&2; }
khoa_va_doi_soat_chuyen postgres://x </dev/null; echo "kq=$?"`], { encoding: "utf8" });
  assert.match(r.stdout, /kq=1/);
  assert.doesNotMatch(r.stderr + r.stdout, /PG_DUNG|DUNG_WEB/);
});
