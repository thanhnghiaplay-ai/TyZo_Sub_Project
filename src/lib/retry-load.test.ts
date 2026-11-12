import assert from "node:assert/strict";
import test from "node:test";
import { openAdminPlace, retryLoad, withDeadline } from "./retry-load.ts";

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

test("quá hạn thì báo máy chủ chưa trả lời, không đứng im", async () => {
  await assert.rejects(withDeadline(new Promise(() => undefined), 20), /chưa trả lời/);
  assert.equal(await withDeadline(Promise.resolve("xong"), 50), "xong");
});

test("chưa đăng nhập thì không thử lại, máy chủ lạnh thì thử lại", async () => {
  let cold = 0;
  const place = await openAdminPlace(async () => {
    cold++;
    if (cold < 2) throw new Error("Máy chủ chưa trả lời.");
    return { role: "chu" };
  });
  assert.equal(place.role, "chu");
  assert.equal(cold, 2);

  let signedOut = 0;
  await assert.rejects(
    openAdminPlace(async () => {
      signedOut++;
      throw new Error("Unauthorized");
    }),
    /Unauthorized/,
  );
  assert.equal(signedOut, 1);
});
