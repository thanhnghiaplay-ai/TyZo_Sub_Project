import assert from "node:assert/strict";
import { test } from "node:test";
import { putFailedText, putWithRetry, type PutSend } from "./r2-put.ts";

const noSleep = async () => {};

test("putWithRetry: lỗi mạng hai lần rồi thành công", async () => {
  let n = 0;
  const send: PutSend = async () => ({ status: ++n < 3 ? 0 : 200 });
  await putWithRetry(send, { sleep: noSleep });
  assert.equal(n, 3);
});

test("putWithRetry: 403 dừng ngay, không thử lại", async () => {
  let n = 0;
  const send: PutSend = async () => {
    n++;
    return { status: 403 };
  };
  await assert.rejects(() => putWithRetry(send, { sleep: noSleep }), (e: Error) => e.message === putFailedText(403));
  assert.equal(n, 1);
});

test("putWithRetry: 503 thử hết lượt rồi báo lỗi; ném lỗi thường tính như mất mạng", async () => {
  let n = 0;
  await assert.rejects(() => putWithRetry(async () => ({ status: ++n && 503 }), { retries: 1, sleep: noSleep }), /503/);
  assert.equal(n, 2);
  let m = 0;
  await putWithRetry(
    async () => {
      if (++m === 1) throw new Error("boom");
      return { status: 200 };
    },
    { sleep: noSleep },
  );
  assert.equal(m, 2);
});

test("putWithRetry: hủy thì dừng và giữ tên AbortError", async () => {
  const c = new AbortController();
  c.abort();
  await assert.rejects(() => putWithRetry(async () => ({ status: 200 }), { signal: c.signal }), { name: "AbortError" });
  await assert.rejects(
    () =>
      putWithRetry(async () => {
        const e = new Error("x");
        e.name = "AbortError";
        throw e;
      }),
    { name: "AbortError" },
  );
});
