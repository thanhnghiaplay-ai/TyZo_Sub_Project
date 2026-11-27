/**
 * RE5-004: đưa web lên Vercel khi chuyển nguồn. Chạy đúng chay_vercel_sh / buoc_vercel / ghi_chuyen / chuyen_dang_do
 * trong deploy/vps/tyzo.sh với một «npx» giả lưu env vào tệp và chèn lỗi theo FAKE_FAULT. Không gọi Vercel thật.
 */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { lib, run, text } from "./vercel-fake-harness.mjs";

test("RE5-004: CLI ghim phiên bản, không còn env rm, ghi đè bằng --force qua stdin", async () => {
  assert.match(text, /^VERCEL_CLI_VERSION="\d+\.\d+\.\d+"$/m);
  assert.doesNotMatch(text, /vercel@latest/);
  const { r, env, calls, journal } = await run();
  assert.match(r.stdout, /kq=0 buoc=xong/);
  assert.match(r.stdout, /da-ket-thuc/);
  assert.doesNotMatch(calls, /\benv rm\b/);
  assert.equal(env("DATABASE_URL"), "postgres://neon/new");
  assert.doesNotMatch(calls, /postgres:\/\/neon\/new|new-secret/, "giá trị bí mật không nằm trên dòng lệnh");
  assert.match(journal, /vercel-bat-dau tyzo-sub\n.* xong tyzo-sub dpl_1 a{40}\n$/);
});

test("RE5-004: thêm biến lỗi giữa chừng → biến cũ vẫn còn (không mất biến), không deploy, nhật ký dở dang", async () => {
  const { r, env, calls, journal, work } = await run("add-fail-BETTER_AUTH_SECRET");
  assert.match(r.stdout, /kq=1 buoc=env-do-dang/);
  assert.match(r.stdout, /dang-do/);
  assert.equal(env("DATABASE_URL"), "postgres://neon/new");
  assert.equal(env("BETTER_AUTH_SECRET"), "old-BETTER_AUTH_SECRET", "biến lỗi giữ giá trị cũ, không bị xóa");
  assert.equal(env("LIVE_BRIDGE_URL"), "old-LIVE_BRIDGE_URL");
  assert.doesNotMatch(calls, / deploy /);
  assert.equal(existsSync(join(work, "deployed-env")), false);
  assert.match(journal, / loi-env-do-dang tyzo-sub - a{40}\n$/);
});

test("RE5-004: mất kết nối lúc deploy → không rõ kết quả, nhật ký giữ dở dang", async () => {
  const { r, journal } = await run("deploy-lost");
  assert.match(r.stdout, /kq=3 buoc=deploy-chua-ro/);
  assert.match(r.stdout, /dang-do/);
  assert.match(journal, / loi-deploy-chua-ro /);
});

test("RE5-004: deploy trả địa chỉ nhưng bản dựng chưa Ready → không coi là xong", async () => {
  const { r } = await run("not-ready");
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
