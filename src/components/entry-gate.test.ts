import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const gate = readFileSync(new URL("./entry-gate.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../routes/index.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("Cửa vào điều khoản", () => {
  it("màn chờ rồi mới tới phòng, chưa đồng ý thì không vào", () => {
    assert.match(gate, /export const TERMS_VERSION = "2026-11-05.4"/);
    assert.match(gate, /localStorage\.getItem\(TERMS_KEY\)/);
    assert.match(gate, /saved === TERMS_VERSION \? "app" : "terms"/);
    assert.match(gate, /Bảng giá/);
    assert.match(gate, /Đồng ý và tiếp tục/);
    assert.match(gate, /navigate\(\{ to: "\/login" \}\)/);
    assert.match(gate, /Không đồng ý/);
    assert.match(gate, /disabled=\{!read\}/);
    assert.match(gate, /Chưa vào phòng/);
    assert.match(home, /<EntryGate>\s*<Studio \/>\s*<\/EntryGate>/);
    assert.match(css, /\.studio-shell \{/);
    assert.match(css, /\.gate-screen \{/);
    assert.match(css, /prefers-reduced-motion: reduce/);
  });
});
