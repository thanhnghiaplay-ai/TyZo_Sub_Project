import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * Hộp thoại mặc định của trình duyệt (alert, confirm, prompt) lệch giao diện web nên bị cấm trong src.
 * Hỏi lại trước việc khó hoàn tác: askConfirm (lib/confirm.ts). Báo tin: pushToast (components/toast.tsx).
 */
const ROOT = new URL("..", import.meta.url).pathname; // .../src

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : files(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name) && !/\.gen\.ts$/.test(name) ? [path] : [];
  });
}

/** Bỏ chú thích để câu giải thích như «không dùng confirm(...)» không bị tính là gọi thật. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

// Gọi trần hoặc qua window/globalThis/self. `askConfirm(` và `x.confirm(` không bị bắt.
const NATIVE = /(?:^|[^\w$.])(?:window\.|globalThis\.|self\.)?(alert|confirm|prompt)\s*\(/g;

describe("không dùng hộp thoại mặc định của trình duyệt", () => {
  it("nhận ra đúng các kiểu gọi", () => {
    const hit = (code: string) => [...stripComments(code).matchAll(NATIVE)].length;
    assert.equal(hit('if (!window.confirm("x")) return;'), 1);
    assert.equal(hit('if (!confirm("x")) return;'), 1);
    assert.equal(hit('alert("x"); prompt("y")'), 2);
    assert.equal(hit('globalThis.alert("x")'), 1);
    assert.equal(hit("await askConfirm({ text: 'x' })"), 0);
    assert.equal(hit("dialog.confirm('x')"), 0);
    assert.equal(hit("// không dùng confirm(...) ở đây"), 0);
    assert.equal(hit("/* alert('x') */ const a = 1;"), 0);
  });

  it("src không còn alert, confirm, prompt mặc định (dùng askConfirm hoặc pushToast)", () => {
    const bad: string[] = [];
    for (const file of files(ROOT)) {
      const code = stripComments(readFileSync(file, "utf8"));
      for (const match of code.matchAll(NATIVE)) {
        const line = code.slice(0, match.index).split("\n").length;
        bad.push(`${file.slice(ROOT.length)}:${line} ${match[1]}()`);
      }
    }
    assert.deepEqual(bad, [], "Dùng askConfirm (lib/confirm.ts) hoặc pushToast thay cho hộp thoại mặc định.");
  });
});
