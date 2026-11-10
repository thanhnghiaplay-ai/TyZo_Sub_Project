import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TimeoutError, withTimeout } from "./with-timeout.ts";

const never = () => new Promise<never>(() => undefined);

describe("withTimeout", () => {
  it("trả giá trị khi xong trước hạn", async () => {
    assert.equal(await withTimeout(Promise.resolve(7), 50), 7);
  });

  it("giữ nguyên lỗi gốc khi việc thất bại trước hạn", async () => {
    await assert.rejects(withTimeout(Promise.reject(new Error("hỏng")), 50), /hỏng/);
  });

  it("ném TimeoutError khi việc không bao giờ xong", async () => {
    await assert.rejects(withTimeout(never(), 20, "Cửa"), (error: unknown) => {
      assert.ok(error instanceof TimeoutError);
      assert.equal(error.message, "Cửa chưa trả lời.");
      return true;
    });
  });

  it("không giữ bộ đếm sau khi xong", async () => {
    const started = Date.now();
    await withTimeout(Promise.resolve(1), 60_000);
    assert.ok(Date.now() - started < 1000);
  });
});
