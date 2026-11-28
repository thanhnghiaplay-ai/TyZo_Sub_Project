/** RE6-004: chạy bộ test Python của do-modal.py (Modal giả trên loopback). */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("RE6-004: do-modal giữ ngân sách, chi phí không rõ, hạn chót và chuyển hướng, RE7-001/002", () => {
  const dir = new URL("../deploy/vps/do-modal/", import.meta.url).pathname;
  const r = spawnSync("python3", ["-I", "-B", "test_do_modal.py", "-v"], { cwd: dir, encoding: "utf8", timeout: 60_000 });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /Ran 12 tests[\s\S]*OK/);
});
