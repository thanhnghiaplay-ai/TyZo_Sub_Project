// Kiểm toán AZ-010: mọi tệp src/**/*.test.ts phải nằm trong lệnh `npm test` (danh sách ghi tay dễ sót tệp mới).
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".test.ts")) out.push(path.replaceAll("\\", "/"));
  }
  return out;
}

test("npm test chạy đủ mọi tệp test trong src", () => {
  const root = new URL("..", import.meta.url).pathname;
  const script = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts.test;
  const missing = walk(join(root, "src")).map((p) => p.slice(root.length)).filter((p) => !script.includes(p));
  assert.deepEqual(missing, []);
});
