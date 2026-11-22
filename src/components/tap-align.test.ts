import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * Chữ lệch trong nút (Chủ báo nhiều lần, 22/11/2026: «làm cho dứt điểm»).
 * `min-tap` chỉ đặt chiều cao tối thiểu. <button> tự căn chữ giữa, nhưng đường dẫn (<a>, <Link>) và khối (<div>, <span>, <label>)
 * thì chữ dính lên trên hoặc chiều cao không ăn (thẻ inline). Mọi thẻ không phải điều khiển biểu mẫu mà dùng min-tap
 * phải có flex/inline-flex/grid để căn giữa. <summary> được miễn: styles.css cho min-tap «align-content: center».
 */
const root = new URL("../", import.meta.url).pathname;
const CONTROLS = new Set(["button", "select", "input", "textarea", "summary"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".tsx") && !name.includes(".test.")) out.push(full);
  }
  return out;
}

describe("nút căn chữ giữa", () => {
  it("styles.css: min-tap tự căn giữa theo chiều dọc", () => {
    const css = readFileSync(join(root, "styles.css"), "utf8");
    assert.match(css, /@utility min-tap \{[^}]*min-height: 2\.75rem;[^}]*align-content: center;/);
  });

  it("đường dẫn hay khối dùng min-tap đều có flex/inline-flex/grid", () => {
    const bad: string[] = [];
    for (const file of walk(root)) {
      const text = readFileSync(file, "utf8");
      let i = -1;
      while ((i = text.indexOf("min-tap", i + 1)) !== -1) {
        const lt = text.lastIndexOf("<", i);
        const gt = text.lastIndexOf(">", i);
        // Chuỗi lớp gán cho biến (không nằm trong thẻ) thì bỏ qua: dùng cho ô nhập.
        if (lt < 0 || gt > lt) continue;
        const tag = /^<([A-Za-z][\w.]*)/.exec(text.slice(lt))?.[1];
        if (!tag || CONTROLS.has(tag)) continue;
        const start = Math.max(text.lastIndexOf('"', i), text.lastIndexOf("`", i), text.lastIndexOf("'", i)) + 1;
        const rest = text.slice(i).search(/["`']/);
        const cls = text.slice(start, i + (rest < 0 ? 0 : rest));
        if (/\b(inline-flex|flex|grid|inline-grid)\b/.test(cls)) continue;
        bad.push(`${file.slice(root.length)}:${text.slice(0, i).split("\n").length} <${tag}> ${cls}`);
      }
    }
    assert.deepEqual(bad, [], `Thêm «inline-flex items-center justify-center» (hoặc flex) cho:\n${bad.join("\n")}`);
  });
});
