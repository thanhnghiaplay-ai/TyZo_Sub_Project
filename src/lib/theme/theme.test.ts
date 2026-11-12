import test from "node:test";
import assert from "node:assert/strict";
import {
  DARK_DEFAULT,
  LIGHT_DEFAULT,
  PALETTE_KEYS,
  THEME_DEFAULT,
  checkTheme,
  contrast,
  fontHref,
  modeScript,
  parseTheme,
  safeUrl,
  themeToCss,
} from "./theme.ts";

test("parseTheme: rỗng hoặc rác thì ra mặc định hợp lệ", () => {
  assert.deepEqual(parseTheme(null), THEME_DEFAULT);
  assert.deepEqual(parseTheme("x"), THEME_DEFAULT);
  assert.deepEqual(parseTheme({ font: "<script>", dark: { bg: "red", fg: 5 } }), THEME_DEFAULT);
});

test("parseTheme: nhận màu 3 và 6 ký tự, ép về chữ thường", () => {
  const t = parseTheme({ dark: { bg: "#ABC", fg: "#FFFFFF" } });
  assert.equal(t.dark.bg, "#aabbcc");
  assert.equal(t.dark.fg, "#ffffff");
  assert.equal(t.dark.card, DARK_DEFAULT.card);
});

test("parseTheme: kẹp số về khoảng cho phép", () => {
  const t = parseTheme({ fontScale: 9, radius: -4, density: "x", iconWeight: "nope", mode: "x" });
  assert.equal(t.fontScale, 1.25);
  assert.equal(t.radius, 0);
  assert.equal(t.density, "cozy");
  assert.equal(t.iconWeight, "duotone");
  assert.equal(t.mode, "dark");
});

test("safeUrl: chỉ https hoặc đường dẫn gốc, không ký tự nguy hiểm", () => {
  assert.equal(safeUrl("https://a.com/x.png"), "https://a.com/x.png");
  assert.equal(safeUrl("/logo.svg"), "/logo.svg");
  assert.equal(safeUrl("//evil.com/x"), "");
  assert.equal(safeUrl("http://a.com/x"), "");
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl('https://a.com/x");a{'), "");
  assert.equal(safeUrl("https://a.com/a b"), "");
});

test("themeToCss: có cả hai chế độ, đủ mọi biến, không lọt chuỗi lạ", () => {
  const css = themeToCss(parseTheme({ font: "inter", brandName: "</style><script>" }));
  assert.match(css, /html\[data-theme="dark"\]\{/);
  assert.match(css, /html\[data-theme="light"\]\{/);
  assert.match(css, /--font-sans:"Inter"/);
  for (const [, variable] of PALETTE_KEYS) assert.ok(css.includes(variable + ":"), variable);
  assert.ok(!css.includes("<"));
});

test("contrast: đen/trắng là 21, cùng màu là 1", () => {
  assert.equal(contrast("#000000", "#ffffff"), 21);
  assert.equal(contrast("#123456", "#123456"), 1);
});

test("checkTheme: bảng mặc định sáng và tối đều đạt", () => {
  assert.deepEqual(checkTheme(THEME_DEFAULT), []);
  assert.ok(LIGHT_DEFAULT.bg !== DARK_DEFAULT.bg);
});

test("checkTheme: chữ trắng trên nền trắng bị chặn", () => {
  const bad = parseTheme({ light: { fg: "#ffffff", bg: "#ffffff", card: "#ffffff" } });
  const issues = checkTheme(bad);
  assert.ok(issues.some((i) => i.mode === "light" && i.text.includes("Chữ chính")));
  assert.ok(!issues.some((i) => i.mode === "dark"));
});

test("fontHref: phông hệ thống không tải gì, phông khác có link Google", () => {
  assert.equal(fontHref("system"), null);
  assert.match(fontHref("inter") || "", /^https:\/\/fonts\.googleapis\.com\/css2\?family=Inter/);
});

test("modeScript: chế độ cố định thì không đọc localStorage", () => {
  assert.ok(!modeScript("dark").includes("localStorage"));
  assert.ok(modeScript("auto").includes("localStorage"));
  assert.ok(modeScript("light").includes('"light"'));
});

test("icons: chỉ giữ chỗ đặt hợp lệ, khóa đúng dạng, và khác mặc định", () => {
  const t = parseTheme({ icons: { "nav.home": "Cube", "nav.source": "FilmStrip", "khong.co": "Cube", "act.add": "x<y" } });
  assert.deepEqual(t.icons, { "nav.home": "Cube" });
});
