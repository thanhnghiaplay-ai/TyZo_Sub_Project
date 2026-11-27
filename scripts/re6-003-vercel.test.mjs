/**
 * RE6-003: xác minh Vercel có cấu trúc (REST API JSON), danh tính deployment, project/target, mã phiên bản, env đã ghi,
 * tên miền production, trang trả lời, giới hạn thời gian và dữ liệu phục hồi không lộ bí mật. Chỉ dùng Vercel giả.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { run, SECRETS, SHA, text } from "./vercel-fake-harness.mjs";

const noLeak = (res) => {
  for (const s of SECRETS) {
    assert.ok(!res.out.includes(s), `đầu ra lộ ${s}`);
    assert.ok(!res.journal.includes(s), `nhật ký lộ ${s}`);
    assert.ok(!res.r.stdout.includes(s), `stdout lộ ${s}`);
  }
  assert.ok(!res.calls.includes("postgres://neon/new") && !res.calls.includes("new-secret"), "giá trị env không nằm trên dòng lệnh");
};

test("RE6-003: không còn đọc chữ ready từ CLI", () => {
  assert.doesNotMatch(text, /grep -qi 'ready'/);
  assert.doesNotMatch(text, /\$V inspect/);
});

test("RE6-003: lượt đúng → kiểm env theo băm, deployment đúng ID/project/target/mã, tên miền, trang trả lời", async () => {
  const res = await run();
  assert.match(res.r.stdout, /kq=0 buoc=xong dep=dpl_1/);
  assert.match(res.r.stdout, /da-ket-thuc/);
  assert.match(res.out, /khớp DATABASE_URL/);
  assert.match(res.out, /^BUOC deploy-id dpl_1$/m);
  assert.match(res.out, new RegExp(`^BUOC kiem-xong dpl_1 ${SHA}$`, "m"));
  assert.match(res.calls, new RegExp(`--meta tyzo_sha=${SHA}`));
  assert.match(res.journal, new RegExp(` xong tyzo-sub dpl_1 ${SHA}\\n$`));
  noLeak(res);
});

for (const [fault, why] of [
  ["not-ready", /hết giờ chờ deployment \(BUILDING\)/],
  ["error", /dpl_1 ERROR/],
  ["wrong-project", /sai project/],
  ["wrong-target", /sai project, target/],
  ["wrong-sha", /mã phiên bản/],
  ["wrong-url", /deployment khác/],
  ["alias-other", /chưa trỏ tới dpl_1/],
  ["api-down-after-deploy", /hết giờ chờ deployment \(API 500\)/],
]) {
  test(`RE6-003: ${fault} → deploy-chua-ro, nguồn cũ vẫn khóa, có dữ liệu phục hồi`, async () => {
    const res = await run(fault);
    assert.match(res.r.stdout, /kq=3 buoc=deploy-chua-ro/);
    assert.match(res.r.stdout, /dang-do/);
    assert.match(res.out, why);
    assert.match(res.out, /^TIM (dpl_1 |khong-ro|khong-thay)/m);
    assert.match(res.journal, / loi-deploy-chua-ro tyzo-sub /);
    noLeak(res);
  });
}

test("RE6-003: deploy mất kết nối → tra theo tyzo_run tìm ra deployment, ghi ID vào nhật ký", async () => {
  const res = await run("deploy-lost");
  assert.match(res.r.stdout, /kq=3 buoc=deploy-chua-ro dep=dpl_1/);
  assert.match(res.out, /^TIM dpl_1 READY https:\/\/tyzo-abc\.vercel\.app$/m);
  assert.match(res.journal, / loi-deploy-chua-ro tyzo-sub dpl_1 /);
  noLeak(res);
});

test("RE6-003: deploy treo → cắt theo giới hạn thời gian, không coi là xong", async () => {
  const res = await run("deploy-hang");
  assert.match(res.r.stdout, /kq=3 buoc=deploy-chua-ro dep=dpl_1/);
  assert.ok(res.ms < 20_000, `mất ${res.ms}ms`);
});

for (const [fault, why] of [
  ["env-drop-DATABASE_URL", /LOI kiểm DATABASE_URL: giá trị không khớp/],
  ["sensitive-BETTER_AUTH_SECRET", /LOI kiểm BETTER_AUTH_SECRET: không đọc lại được/],
  ["dup-DATABASE_URL", /LOI kiểm DATABASE_URL: nhiều bản production/],
  ["add-hang-LIVE_BRIDGE_URL", /LOI khi đặt LIVE_BRIDGE_URL/],
  ["link-noid", /không có định danh project/],
  ["api-down", /không kiểm được qua API \(API 500\)/],
]) {
  test(`RE6-003: ${fault} → dừng trước deploy`, async () => {
    const res = await run(fault);
    assert.match(res.r.stdout, /kq=1 buoc=(env-do-dang|chua-doi-vercel)/);
    assert.match(res.out, why);
    assert.doesNotMatch(res.calls, / deploy /);
    assert.equal(existsSync(join(res.work, "deployed-env")), false);
    noLeak(res);
  });
}

test("RE6-003: Ready và đã nhận tên miền nhưng trang không trả lời → kiem-chua-dat, giữ dở dang", async () => {
  const res = await run("site-down");
  assert.match(res.r.stdout, /buoc=kiem-chua-dat dep=dpl_1/);
  assert.match(res.r.stdout, /dang-do/);
  assert.match(res.out, /^BUOC deploy-xong https:\/\/tyzo-abc\.vercel\.app dpl_1$/m);
  assert.match(res.journal, / loi-kiem-chua-dat tyzo-sub dpl_1 /);
  noLeak(res);
});
