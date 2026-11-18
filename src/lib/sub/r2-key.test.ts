import assert from "node:assert/strict";
import { test } from "node:test";
import { R2_MAX_BYTES, r2ExtFor, r2KeyOwnedBy, r2ObjectKey, r2UploadProblem } from "./r2-key.ts";

test("r2ExtFor đọc loại âm thanh, bỏ phần ;codecs", () => {
  assert.equal(r2ExtFor("audio/webm;codecs=opus"), "webm");
  assert.equal(r2ExtFor("AUDIO/WAV"), "wav");
  assert.equal(r2ExtFor("video/mp4"), null);
});

test("r2UploadProblem chặn loại lạ, rỗng và quá lớn", () => {
  assert.equal(r2UploadProblem({ size: 1000, contentType: "audio/webm" }), null);
  assert.ok(r2UploadProblem({ size: 1000, contentType: "text/html" }));
  assert.ok(r2UploadProblem({ size: 0, contentType: "audio/wav" }));
  assert.ok(r2UploadProblem({ size: R2_MAX_BYTES + 1, contentType: "audio/wav" }));
});

test("r2ObjectKey và r2KeyOwnedBy: chỉ chủ tệp được xóa", () => {
  const key = r2ObjectKey("user_1", "abcdef0123456789abcdef", "webm");
  assert.equal(key, "u/user_1/abcdef0123456789abcdef.webm");
  assert.ok(r2KeyOwnedBy(key, "user_1"));
  assert.ok(!r2KeyOwnedBy(key, "user_2"));
  assert.ok(!r2KeyOwnedBy("u/user_1/../x.webm", "user_1"));
  assert.ok(!r2KeyOwnedBy("u/user_1/short.webm", "user_1"));
  assert.throws(() => r2ObjectKey("user_1", "short", "webm"));
});
