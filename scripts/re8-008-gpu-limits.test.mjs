/** RE8-008: chạy bộ test Python của gpu_limits.py (trần GPU Modal tính từ cau-hinh.json, không cần modal). */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("RE8-008: trần GPU nhận dạng và model chữ, kẹp giá trị xấu, modal_app dùng đúng trần", () => {
  const dir = new URL("../eval/asr/luong-ky/modal/", import.meta.url).pathname;
  const r = spawnSync("python3", ["-I", "-B", "test_gpu_limits.py", "-v"], { cwd: dir, encoding: "utf8", timeout: 60_000 });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /Ran 5 tests[\s\S]*OK/);
});
