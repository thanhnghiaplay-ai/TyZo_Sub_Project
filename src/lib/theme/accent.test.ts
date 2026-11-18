import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { ACCENT_KEY, ACCENT_MIN_ON_BG, accentScript, accentVars, fitAccent, hexToRgb, inkFor, parseAccent, ratio, rgbToHex } from "./accent.ts";
import { checkTheme, THEME_DEFAULT } from "./theme.ts";

const DARK = "#0e141b";
const LIGHT = "#f3f5f8";

test("parseAccent nhận #rrggbb, rrggbb, #rgb và từ chối chữ lạ", () => {
  assert.equal(parseAccent("#E7B63A"), "#e7b63a");
  assert.equal(parseAccent("e7b63a"), "#e7b63a");
  assert.equal(parseAccent("#fa0"), "#ffaa00");
  assert.equal(parseAccent(" #123456 "), "#123456");
  for (const bad of ["", "#12", "#12345g", "red", "#1234567", null, undefined, 5]) assert.equal(parseAccent(bad), null);
});

test("rgbToHex và hexToRgb đi về nhau, kẹp trong 0–255", () => {
  assert.deepEqual(hexToRgb("#102030"), [16, 32, 48]);
  assert.equal(rgbToHex(16, 32, 48), "#102030");
  assert.equal(rgbToHex(-5, 300, 12.4), "#00ff0c");
});

test("inkFor: chữ trên nút màu nhấn luôn đạt 4,5 với mọi màu (quét lưới 17³)", () => {
  const levels = Array.from({ length: 17 }, (_, i) => Math.min(255, i * 16));
  for (const r of levels) for (const g of levels) for (const b of levels) {
    const accent = rgbToHex(r, g, b);
    assert.ok(ratio(inkFor(accent), accent) >= 4.5, accent);
  }
  assert.equal(inkFor("#ffffff"), "#000000");
  assert.equal(inkFor("#000000"), "#ffffff");
});

test("fitAccent: màu đủ tách nền thì giữ nguyên", () => {
  assert.deepEqual(fitAccent("#e7b63a", DARK), { color: "#e7b63a", adjusted: false });
  assert.deepEqual(fitAccent("#1d4ed8", LIGHT), { color: "#1d4ed8", adjusted: false });
});

test("fitAccent: màu quá tối trên nền tối thì sáng lên vừa đủ, quá chói trên nền sáng thì tối đi", () => {
  const onDark = fitAccent("#101820", DARK);
  assert.equal(onDark.adjusted, true);
  assert.ok(ratio(onDark.color, DARK) >= ACCENT_MIN_ON_BG);
  const onLight = fitAccent("#fffde0", LIGHT);
  assert.equal(onLight.adjusted, true);
  assert.ok(ratio(onLight.color, LIGHT) >= ACCENT_MIN_ON_BG);
});

test("fitAccent: không bao giờ chỉnh quá tay (đen tuyền trên nền tối vẫn đạt)", () => {
  for (const hex of ["#000000", "#ffffff", "#0e141b", "#f3f5f8"]) {
    for (const bg of [DARK, LIGHT]) assert.ok(ratio(fitAccent(hex, bg).color, bg) >= ACCENT_MIN_ON_BG, hex + " " + bg);
  }
});

test("accentVars cho cả hai chế độ và đạt ngưỡng của checkTheme (chữ trên nút 4,5)", () => {
  for (const hex of ["#ff0000", "#00ff00", "#0000ff", "#e7b63a", "#101820", "#fffde0", "#808080"]) {
    const v = accentVars(hex, DARK, LIGHT);
    assert.ok(ratio(v["--ink-dark"], v["--accent-dark"]) >= 4.5);
    assert.ok(ratio(v["--ink-light"], v["--accent-light"]) >= 4.5);
    const theme = { ...THEME_DEFAULT, dark: { ...THEME_DEFAULT.dark, accent: v["--accent-dark"], ink: v["--ink-dark"] }, light: { ...THEME_DEFAULT.light, accent: v["--accent-light"], ink: v["--ink-light"] } };
    assert.deepEqual(checkTheme(theme).filter((issue) => issue.text === "Chữ trên nút chính"), []);
  }
});

function runScript(stored: string | null) {
  const style = new Map<string, string>();
  const attrs = new Map<string, string>();
  const context = {
    localStorage: { getItem: (key: string) => (key === ACCENT_KEY ? stored : null) },
    document: { documentElement: { style: { setProperty: (k: string, v: string) => style.set(k, v) }, setAttribute: (k: string, v: string) => attrs.set(k, v) } },
  };
  vm.runInNewContext(accentScript(DARK, LIGHT), context);
  return { style, attrs };
}

test("accentScript đặt đúng biến như accentVars (cùng công thức với TypeScript)", () => {
  for (const hex of ["#e7b63a", "#101820", "#fffde0", "#ff00aa", "#808080", "#000000", "#ffffff"]) {
    const { style, attrs } = runScript(hex.toUpperCase());
    const want = accentVars(hex, DARK, LIGHT);
    for (const [name, value] of Object.entries(want)) assert.equal(style.get(name), value, hex + " " + name);
    assert.equal(attrs.get("data-accent"), "user");
  }
});

test("accentScript không làm gì khi chưa chọn hoặc giá trị hỏng", () => {
  for (const stored of [null, "", "red", "#12", "#12345g", "javascript:alert(1)"]) {
    const { style, attrs } = runScript(stored);
    assert.equal(style.size, 0, String(stored));
    assert.equal(attrs.size, 0, String(stored));
  }
});

test("accentScript không ném lỗi khi localStorage bị chặn", () => {
  const context = {
    localStorage: { getItem: () => { throw new Error("blocked"); } },
    document: { documentElement: { style: { setProperty: () => undefined }, setAttribute: () => undefined } },
  };
  assert.doesNotThrow(() => vm.runInNewContext(accentScript(DARK, LIGHT), context));
});
