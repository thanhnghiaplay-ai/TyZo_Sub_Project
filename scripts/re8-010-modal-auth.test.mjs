/** RE8-010: chạy bộ test Python của header proxy Modal, cờ requires_proxy_auth và hồ sơ GPU thử nghiệm (proxy giả). */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("RE8-010: modal_auth, cờ xác thực, hồ sơ thử nghiệm/rollback, client gửi header qua 303", () => {
  const dir = new URL("../eval/asr/luong-ky/modal/", import.meta.url).pathname;
  const r = spawnSync("python3", ["-I", "-B", "-W", "ignore", "test_modal_auth.py", "-v"], { cwd: dir, encoding: "utf8", timeout: 60_000 });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /Ran 9 tests[\s\S]*OK/);
});
