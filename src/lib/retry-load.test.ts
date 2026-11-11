import assert from "node:assert/strict";
import test from "node:test";
import { retryLoad } from "./retry-load.ts";

const noWait = () => Promise.resolve();

test("lỗi tạm thời rồi thành công thì trả kết quả", async () => {
  let calls = 0;
  const value = await retryLoad(
    async () => {
      calls++;
      if (calls < 3) throw new Error("tạm thời");
      return "ok";
    },
    [1, 1],
    noWait,
  );
  assert.equal(value, "ok");
  assert.equal(calls, 3);
});

test("hết lượt thì ném lỗi cuối", async () => {
  let calls = 0;
  await assert.rejects(
    retryLoad(
      async () => {
        calls++;
        throw new Error("lỗi " + calls);
      },
      [1, 1],
      noWait,
    ),
    /lỗi 3/,
  );
  assert.equal(calls, 3);
});

test("thành công ngay thì chỉ gọi một lần", async () => {
  let calls = 0;
  await retryLoad(async () => ++calls, [1, 1], noWait);
  assert.equal(calls, 1);
});
