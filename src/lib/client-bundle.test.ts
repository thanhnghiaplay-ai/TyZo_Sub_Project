import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

describe("gói trình duyệt không kéo module của Node", () => {
  it("file có createServerFn (không phải .server) không import node:* ở đầu file", () => {
    // Bản dev của Vite đọc tên import ngay đầu module dù thân hàm server đã bị cắt, nên trang khách báo
    // «Module node:crypto has been externalized» (gặp ở pay-store.ts 18/11/2026). Nạp bằng await import() trong hàm.
    const root = new URL("../", import.meta.url).pathname;
    const bad: string[] = [];
    for (const file of walk(root)) {
      if (/\.server\.tsx?$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      if (!text.includes("createServerFn")) continue;
      if (/^import\s[^;]*from\s+["']node:[a-z/_]+["'];?\s*$/m.test(text)) bad.push(file.slice(root.length));
    }
    assert.deepEqual(bad, [], `import node:* ở đầu file: ${bad.join(", ")}`);
  });
});
