import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DARK_DEFAULT,
  LIGHT_DEFAULT,
  PALETTE_KEYS,
  THEME_DEFAULT,
  checkTheme,
  contrast,
  defaultUserDensity,
  densityScript,
  densityValue,
  fontHref,
  modeScript,
  parseTheme,
  pickUserDensity,
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

/** Chạy script đầu trang trên DOM giả. Trả về data-theme, data-density và --density sau khi chạy. */
function runHeadScript(script: string, opts: { saved?: Record<string, string>; osLight?: boolean; storageThrows?: boolean }) {
  const attrs: Record<string, string> = {};
  const vars: Record<string, string> = {};
  const documentElement = {
    setAttribute: (k: string, v: string) => {
      attrs[k] = v;
    },
    style: {
      setProperty: (k: string, v: string) => {
        vars[k] = v;
      },
    },
  };
  const localStorage = {
    getItem: (k: string) => {
      if (opts.storageThrows) throw new Error("blocked");
      return opts.saved?.[k] ?? null;
    },
  };
  const window = { matchMedia: () => ({ matches: Boolean(opts.osLight) }) };
  new Function("document", "localStorage", "window", script)({ documentElement }, localStorage, window);
  return { theme: attrs["data-theme"], density: attrs["data-density"], densityVar: vars["--density"] };
}

test("modeScript: lựa chọn khách đã lưu luôn thắng mặc định Admin", () => {
  for (const admin of ["dark", "light", "auto"] as const) {
    assert.equal(runHeadScript(modeScript(admin), { saved: { tyzo_mode: "light" } }).theme, "light", admin);
    assert.equal(runHeadScript(modeScript(admin), { saved: { tyzo_mode: "dark" }, osLight: true }).theme, "dark", admin);
  }
});

test("modeScript: khách chưa chọn thì theo mặc định Admin, «auto» thì theo màu hệ thống", () => {
  assert.equal(runHeadScript(modeScript("dark"), { osLight: true }).theme, "dark");
  assert.equal(runHeadScript(modeScript("light"), { osLight: false }).theme, "light");
  assert.equal(runHeadScript(modeScript("auto"), { osLight: true }).theme, "light");
  assert.equal(runHeadScript(modeScript("auto"), { osLight: false }).theme, "dark");
});

test("modeScript: giá trị lưu lạ hoặc máy chặn localStorage thì lấy mặc định, không ném lỗi", () => {
  assert.equal(runHeadScript(modeScript("light"), { saved: { tyzo_mode: "xanh" } }).theme, "light");
  assert.equal(runHeadScript(modeScript("dark"), { storageThrows: true }).theme, "dark");
  assert.equal(runHeadScript(modeScript("auto"), { storageThrows: true, osLight: true }).theme, "light");
});

test("densityScript: lựa chọn khách thắng Admin, chưa chọn thì theo Admin", () => {
  assert.deepEqual(runHeadScript(densityScript("roomy"), { saved: { tyzo_density: "compact" } }), {
    theme: undefined,
    density: "compact",
    densityVar: "0.85",
  });
  assert.deepEqual(runHeadScript(densityScript("roomy"), {}), { theme: undefined, density: "comfortable", densityVar: "1.15" });
  assert.deepEqual(runHeadScript(densityScript("cozy"), {}), { theme: undefined, density: "comfortable", densityVar: "1" });
  assert.deepEqual(runHeadScript(densityScript("compact"), { storageThrows: true }), {
    theme: undefined,
    density: "compact",
    densityVar: "0.85",
  });
});

test("CSS mật độ: luật nằm ngoài @layer phải độ ưu tiên 0 và loại phần tử có lớp khoảng cách khác", () => {
  const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
  const block = css.slice(css.indexOf("/* ===== Mật độ khoảng cách"));
  assert.ok(block.length > 200, "không thấy khối mật độ trong styles.css");
  // Mỗi lớp tiện ích bị co giãn cần loại những lớp cùng loại mà Tailwind đã tính (xem lỗi v3.29.0).
  const need: Record<string, string[]> = {
    gap: ["gap-x-", "gap-y-", ":gap-"],
    p: ["px-", "py-", "pt-", "pr-", "pb-", "pl-", ":p-"],
    py: ["pt-", "pb-", ":py-"],
    pt: [":pt-"],
    px: ["pl-", "pr-", ":px-"],
  };
  const lines = block.split("\n").filter((line) => /\.(gap|p|py|pt|px)-\d\b/.test(line) && line.includes("data-density"));
  assert.ok(lines.length >= 12, `chỉ thấy ${lines.length} luật`);
  for (const line of lines) {
    const m = line.match(/^:where\(html\[data-density\] \.(gap|p|py|pt|px)-\d(.*)\) \{/);
    assert.ok(m, `luật phải bọc trong :where() để độ ưu tiên bằng 0: ${line.slice(0, 70)}`);
    for (const piece of need[m[1]]) {
      assert.ok(m[2].includes(`[class*="${piece}"]`), `luật .${m[1]}-N thiếu loại trừ «${piece}»: ${line.slice(0, 70)}`);
    }
  }
});

test("icons: chỉ giữ chỗ đặt hợp lệ, khóa đúng dạng, và khác mặc định", () => {
  const t = parseTheme({ icons: { "nav.home": "Cube", "nav.source": "FilmStrip", "khong.co": "Cube", "act.add": "x<y" } });
  assert.deepEqual(t.icons, { "nav.home": "Cube" });
});

test("mật độ khách chọn: gọn là 0.85, thoải mái không chật hơn mức vừa", () => {
  assert.equal(densityValue("compact", "cozy"), 0.85);
  assert.equal(densityValue("comfortable", "cozy"), 1);
  assert.equal(densityValue("comfortable", "roomy"), 1.15);
  assert.equal(densityValue("comfortable", "compact"), 1);
});

test("mật độ mặc định theo Admin, giá trị lạ thì lấy mặc định", () => {
  assert.equal(defaultUserDensity("compact"), "compact");
  assert.equal(defaultUserDensity("cozy"), "comfortable");
  assert.equal(defaultUserDensity("roomy"), "comfortable");
  assert.equal(pickUserDensity("compact", "roomy"), "compact");
  assert.equal(pickUserDensity("x", "compact"), "compact");
  assert.equal(pickUserDensity(null, "cozy"), "comfortable");
});

test("densityScript: đọc tyzo_density, đặt data-density và --density, có mặc định theo Admin", () => {
  const script = densityScript("roomy");
  assert.match(script, /tyzo_density/);
  assert.match(script, /data-density/);
  assert.match(script, /--density/);
  assert.match(script, /1\.15/);
  assert.match(densityScript("compact"), /"compact"/);
});
