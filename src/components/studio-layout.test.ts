import { TOOL_NAME } from "../lib/customer-menu.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { STUDIO_SHEET_QUERY } from "../lib/studio-layout.ts";

const source = readFileSync(new URL("./studio.tsx", import.meta.url), "utf8");

const [SHEET_PORTRAIT, SHEET_LANDSCAPE] = [
  "(max-width: 699px) and (orientation: portrait), (max-height: 520px) and (orientation: portrait)",
  "(orientation: landscape) and (max-height: 720px)",
];

/** Text of one top-level @media block, from its header to the next top-level @media. */
function mediaBlock(css: string, query: string): string {
  const header = `@media ${query}`;
  const start = css.indexOf(header);
  if (start < 0) return "";
  const next = css.indexOf("\n@media", start + header.length);
  return css.slice(start, next < 0 ? css.length : next);
}
const phim = source.slice(source.indexOf('id="tool-phim"'), source.indexOf('id="tool-cast"'));

describe("Bước 6.1 — thứ tự trong thẻ Phim", () => {
  it("ngôn ngữ, thể loại, file và nút chạy đứng trước phần thu gọn", () => {
    const markers = [
      "Nhận diện ngôn ngữ",
      "Dịch sang tiếng",
      "Thể loại",
      'title="Video"',
      "{app.buttonLabel}",
    ];
    const at = markers.map((marker) => phim.indexOf(marker));
    assert.ok(
      at.every((index) => index >= 0),
      at.join(","),
    );
    assert.deepEqual(
      at,
      [...at].sort((a, b) => a - b),
    );
    assert.equal(phim.includes("Ngôn ngữ lời nói"), false);
    assert.equal(phim.includes("Ngôn ngữ đích"), false);
    assert.match(phim, /Dịch sang tiếng[\s\S]*value === "Vietnamese"/);
    const lists = readFileSync(new URL("../lib/sub/text.ts", import.meta.url), "utf8");
    const src = lists.slice(
      lists.indexOf("export const SRC_LANGS"),
      lists.indexOf("export function speechLang"),
    );
    assert.deepEqual(
      [...src.matchAll(/\["(zh|ko|ja|en|vi|th)"/g)].map((match) => match[1]),
      ["zh", "ko", "ja", "en"],
    );
    assert.equal(src.includes("Tự nhận dạng"), false);
  });

  it("tab Phim gọn: video và link ở ngoài, Âm thanh riêng và file lớn gập trong «Tùy chọn thêm», nút chạy sau cùng", () => {
    const more = phim.indexOf("Tùy chọn thêm: âm thanh riêng, file lớn");
    assert.ok(more > phim.indexOf('title="Video"'));
    assert.ok(more > phim.indexOf("Hoặc link file trực tiếp"));
    assert.ok(phim.indexOf('title="Âm thanh riêng"') > more);
    assert.ok(phim.indexOf("studio-run-bar") > phim.indexOf('title="Âm thanh riêng"'));
    assert.match(phim, /<details[^>]*open=\{app\.audioFile \? true : undefined\}/);
  });

  it("cách trả và gói trả theo lượt nằm trong Cài đặt dịch (Menu), Thuật ngữ cùng nhóm Dịch bình thường", () => {
    assert.equal(phim.includes("Thuật ngữ thể loại"), false);
    assert.equal(phim.includes("<GlossaryEditor"), false);
    const key = source.slice(source.indexOf('id="tool-key"'), source.indexOf('id="tool-phim"'));
    assert.match(key, /Cách trả/);
    assert.match(key, /<TurnPackList/);
    assert.equal(source.includes('id="tool-goi-dich"'), false);
    const ngucanh = source.slice(
      source.indexOf('id="tool-cast"'),
      source.indexOf('id="tool-voice"'),
    );
    assert.match(ngucanh, /Thuật ngữ thể loại[\s\S]*<GlossaryEditor/);
    assert.equal(source.includes('id="tool-thuatngu"'), false);
    assert.match(source, /label: MENU_GROUP\.normal[\s\S]{0,400}MENU_TOOL_ORDER/);
    assert.match(key, /Nâng cao: model và nhận dạng/);
    assert.equal(source.includes('id: "nang-cao"'), false);
    assert.match(source, /hidden=\{ctxView !== "terms"\}/);
  });
});

describe("Bước 6.2 — khung Phụ đề", () => {
  it("video và bảng câu đứng ngoài tab, chỉ có một player", () => {
    const markers = [
      "<SideRail",
      'data-product="sub"',
      "data-workspace",
      "<Stage",
      "Bản dịch",
      'id="tool-phim"',
    ];
    const at = markers.map((marker) => source.indexOf(marker));
    assert.ok(at.every((index) => index >= 0));
    assert.deepEqual(
      at,
      [...at].sort((a, b) => a - b),
    );
    const workspace = source.slice(
      source.indexOf("data-workspace"),
      source.indexOf('id="tool-key"'),
    );
    assert.match(workspace, /<Stage/);
    assert.match(workspace, /Bản dịch/);
    assert.equal(workspace.includes("Groq API key"), false);
    assert.equal(source.split("<Stage").length - 1, 1);
  });

  it("mỗi tab trỏ tới một vùng, không dựng player theo tab", () => {
    for (const id of ["tool-key", "tool-phim", "tool-cast", "tool-voice", "tool-check"]) {
      assert.match(source, new RegExp(`id="${id}"`));
    }
    assert.equal(/toolTab === [\s\S]{0,80}<Stage/.test(source), false);
  });
});

describe("Bước 6.3 — mỗi tab một phần", () => {
  it("năm tab ẩn lẫn nhau và vẫn gắn trong cây", () => {
    for (const id of ["key", "phim", "cast", "voice", "check"]) {
      assert.match(
        source,
        new RegExp(`id="tool-${id}"[\\s\\S]{0,160}hidden=\\{toolTab !== "${id}"\\}`),
      );
    }
    assert.equal(source.includes('{toolTab === "phim" &&'), false);
  });

  it("một nút Dịch tiếp, khoảng trống nằm ở Kiểm tra", () => {
    assert.equal(source.split("Dịch tiếp").length - 1, 1);
    const check = source.slice(source.indexOf('id="tool-check"'));
    assert.match(check, /Dò khoảng trống/);
    const workspace = source.slice(
      source.indexOf("data-workspace"),
      source.indexOf('id="tool-phim"'),
    );
    assert.equal(workspace.includes("Dò khoảng trống"), false);
  });
});

describe("Bước 6.4 — ba cỡ màn hình", () => {
  it("video bị giới hạn chiều cao, chừa tai thỏ, ô chữ 16px, nút 44px", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    assert.match(css, /safe-area-inset-top/);
    assert.match(css, /max-width: 699px/);
    assert.match(css, /min-width: 700px/);
    assert.match(css, /min-width: 1024px/);
    // Chiều cao video tính theo biến --vh (dvh, lùi về vh), mỗi chế độ một cỡ.
    assert.match(css, /--video-h:\s*calc\(33 \* var\(--vh\)\)/);
    assert.match(css, /--video-h:\s*calc\(32 \* var\(--vh\)\)/);
    assert.match(css, /--video-h:\s*calc\(24 \* var\(--vh\)\)/);
    assert.match(source, /studio-shell/);
    assert.match(source, /text-base/);
    assert.match(css, /min-height: 2\.75rem/);
  });
});

describe("Bước 6.5 — chuyển tab", () => {
  it("animation ngắn, tắt khi giảm chuyển động, và chọn từ menu trái", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    assert.match(css, /@keyframes studio-tab-in/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    const reduced = css.slice(css.indexOf("prefers-reduced-motion"));
    assert.match(reduced, /animation:\s*none/);
    assert.match(reduced, /transition:\s*none/);
    // Công cụ nay nằm trong menu trượt trái (nút bấm thường, Tab và Enter), không còn hàng tab dùng phím mũi tên.
    assert.match(source, /<SideRail/);
  });
});

describe("Bước 6.6 — không API một hãng", () => {
  it("dvh và vùng tai thỏ có đường lùi, không có tiền tố một hãng", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    assert.match(css, /--vh:\s*1vh;/);
    assert.match(css, /@supports \(height: 1dvh\)[\s\S]{0,40}--vh:\s*1dvh;/);
    assert.match(css, /height:\s*calc\(100 \* var\(--vh\)\);/);
    assert.match(css, /env\(safe-area-inset-top,\s*0px\)/);
    assert.equal(/-webkit-|-moz-|-ms-/.test(css), false);
    assert.equal(source.includes("Hãy dùng Chrome"), false);
  });

  it("ghi máy đã chạy và máy chưa chạy", () => {
    const status = readFileSync(new URL("../../PROJECT_STATUS.md", import.meta.url), "utf8");
    assert.match(status, /Chromium/);
    assert.match(status, /Firefox/);
    assert.match(status, /Safari iPhone/);
    assert.match(status, /Chưa chạy/);
  });
});

describe("Bước 7.1 — không chồng khung", () => {
  it("video không nổi lên tab, màn thấp không dùng tấm phủ", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    // Chuông, thông báo, huy hiệu vai trò và nhật ký phiên bản là lớp nổi riêng, không thuộc khung video.
    const stageRules = (css.match(/[^{}]+\{[^{}]*\}/g) || []).filter((rule) =>
      /studio|stage|player|video|sheet/.test(rule.split("{")[0]),
    );
    assert.ok(stageRules.length > 0);
    // Ngoại lệ duy nhất: tab công cụ 80% (`.studio-tools.is-open`) và thanh đầu của nó nổi lên phía trên thanh dưới.
    const floatingTab = (rule: string) =>
      /(\.studio-tools\.is-open(\s+\.studio-(sheet-bar|run-bar))?|\.studio-wallet-tab)\s*$/.test(
        rule.split("{")[0],
      );
    for (const rule of stageRules) {
      if (floatingTab(rule)) continue;
      assert.equal(rule.includes("z-index:"), false, rule);
      assert.equal(rule.includes("position: absolute"), false, rule);
    }
    const tab = mediaBlock(css, SHEET_PORTRAIT);
    assert.match(tab, /\.studio-tools\.is-open\s*\{[^}]*position:\s*fixed/);
    assert.match(tab, /\.studio-tools\.is-open\s*\{[^}]*calc\(80 \* var\(--vh\)\)/);
    assert.match(css, /max-height:\s*520px/);
    assert.match(source, /studio-stage/);
    assert.match(source, /is-sheet/);
    // Chuỗi điều kiện của CSS và của mã (isStudioSheet) phải là một.
    assert.equal(STUDIO_SHEET_QUERY, `${SHEET_PORTRAIT}, ${SHEET_LANDSCAPE}`);
    const portrait = mediaBlock(css, SHEET_PORTRAIT);
    const landscape = mediaBlock(css, SHEET_LANDSCAPE);
    assert.match(portrait, /\.studio-tools:not\(\.is-open\)\s*\{[^}]*display:\s*none/);
    assert.match(landscape, /\.studio-tools:not\(\.is-open\)\s*\{[^}]*display:\s*none/);
    assert.match(landscape, /display:\s*grid/);
    assert.match(portrait, /\.is-sheet \.studio-cues\s*\{[^}]*display:\s*none/);
    // Mỗi cỡ màn hình rơi vào đúng một chế độ: không còn khối điều kiện chồng lên nhau.
    assert.equal(css.includes("@media (min-width: 1024px) and (max-height: 700px)"), false);
    assert.equal(css.includes("@media (max-width: 699px) {\n  .studio-tools"), false);
    // Mọi mức tối thiểu cộng vào min-height của khung, để thiếu chỗ thì cuộn chứ không chồng.
    assert.match(css, /\.studio-stage\s*\{[^}]*min-height:\s*calc\(/);
    assert.match(css, /\.studio-shell\s*\{[^}]*overflow-y:\s*auto/);
    // Trang rộng: admin và tài khoản xếp thẻ theo cột tự tăng, thẻ rộng chiếm cả hàng.
    assert.match(css, /\.account-grid\s*\{[^}]*column-width:\s*22rem/);
    assert.match(
      css,
      /\.admin-grid,\s*\.admin-flow\s*\{[^}]*display:\s*grid[^}]*repeat\(auto-fit,\s*minmax\(min\(100%,\s*22rem\),\s*1fr\)\)/,
    );
    assert.match(css, /\.admin-grid > \.admin-wide\s*\{[^}]*grid-column:\s*1 \/ -1/);
    assert.match(css, /\.account-grid > \.account-wide\s*\{[^}]*column-span:\s*all/);
    assert.match(css, /\.admin-split\s*\{[^}]*display:\s*grid/);
    const adminRoute = readFileSync(new URL("../routes/admin.tsx", import.meta.url), "utf8");
    const accountRoute = readFileSync(new URL("../routes/tai-khoan.tsx", import.meta.url), "utf8");
    assert.match(adminRoute, /room-wide/);
    assert.match(accountRoute, /room-wide/);
    assert.match(
      readFileSync(new URL("./admin-desk.tsx", import.meta.url), "utf8"),
      /className="admin-grid"/,
    );
    assert.match(
      readFileSync(new URL("./account-panel.tsx", import.meta.url), "utf8"),
      /account-grid/,
    );
    // Bảng cài đặt phụ đề nằm trong khung video: khung phải co và cuộn, ruột không bị bóp méo.
    assert.match(css, /\.studio-video\s*\{[^}]*flex:\s*0 1 auto[^}]*overflow-y:\s*auto/);
    assert.match(css, /\.studio-video \.player-stack > \*\s*\{[^}]*flex-shrink:\s*0/);
    assert.equal(/\.studio-video\s*\{[^}]*max-height:\s*calc/.test(css), false);
  });
});

describe("Bước 7.2 — tab theo thứ tự dùng", () => {
  it("Cài đặt dịch, Phim, Ngữ cảnh (3 nhánh); các ô nhập vẫn nằm trong trang, không mất dữ liệu", () => {
    assert.deepEqual(
      [TOOL_NAME.key, TOOL_NAME.phim, TOOL_NAME.cast, TOOL_NAME.voice, TOOL_NAME.check],
      ["Cài đặt dịch", "Phim", "Ngữ cảnh", "Thuyết minh", "Kiểm tra"],
    );
    const keys = ["key", "phim", "cast", "voice", "check"];
    const at = keys.map((key) => source.indexOf(`["${key}", TOOL_NAME.`));
    assert.ok(
      at.every((index) => index >= 0),
      at.join(","),
    );
    assert.deepEqual(
      at,
      [...at].sort((a, b) => a - b),
    );
    assert.equal(source.includes('id="tool-chat"'), false);
    const key = source.slice(source.indexOf('id="tool-key"'), source.indexOf('id="tool-phim"'));
    assert.match(key, /Groq API key/);
    assert.match(key, /Đồng bộ key/);
    assert.match(key, /Nhận dạng giọng/);
    assert.equal(key.includes("Ngữ cảnh phim"), false);
    const cast = source.slice(source.indexOf('id="tool-cast"'), source.indexOf('id="tool-voice"'));
    assert.match(cast, /role="tablist" aria-label="Ngữ cảnh phim"/);
    assert.ok(cast.indexOf('role="tablist"') < cast.indexOf("Phân tích phim"));
    assert.match(source, /useState<"cast" \| "terms" \| "note">\("cast"\)/);
    assert.match(cast, /hidden=\{ctxView !== "note"\}/);
    assert.match(cast, /app\.setTitle/);
    assert.match(cast, /app\.setNotes/);
    assert.match(cast, /app\.setGloss/);
    assert.match(
      source,
      /if \(!app\.reviewHold\) return;\s*setToolTab\("cast"\);\s*setCtxView\("cast"\);\s*setSheetOpen\(true\);/,
    );
  });
});

describe("Bước 7.3 — không giật khi chọn file và khi báo trạng thái", () => {
  it("khóa trang, nút đóng là dấu X, trạng thái đúng hai hàng", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    assert.match(css, /html,\s*body\s*\{[^}]*overflow:\s*hidden/);
    assert.match(source, /aria-label="Đóng tab"/);
    assert.match(source, /aria-label="Đóng tab"[\s\S]{0,200}slot="act.close"/);
    assert.equal(source.includes('>Đóng</button>\n        <section id="tool-key"'), false);
    assert.match(mediaBlock(css, SHEET_PORTRAIT), /\.studio-sheet-bar\s*\{[^}]*display:\s*flex/);
    assert.match(mediaBlock(css, SHEET_LANDSCAPE), /\.studio-sheet-bar\s*\{[^}]*display:\s*flex/);
    assert.equal(
      /\.studio-sheet-bar\s*\{[^}]*display:\s*flex/.test(css.slice(0, css.indexOf("@media"))),
      false,
    );
    assert.match(source, /role="status"/);
    assert.match(source, /line-clamp-2 h-10/);
    assert.match(source, /showModal\(\)/);
    assert.match(source, /currentTarget\.blur\(\)/);
    assert.match(source, /scrollTo\(0, 0\)/);
    assert.equal(source.includes('className="sr-only" type="file"'), false);
  });
});

describe("Bước 7.4 — số thuật ngữ nổi, nút X nằm trong khung", () => {
  it("viên vàng chữ đen, và nút đóng nằm trong khung tab", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    const count = css.slice(css.indexOf(".studio-count"), css.indexOf(".studio-note"));
    assert.match(count, /background:\s*var\(--color-accent\)/);
    assert.match(count, /color:\s*var\(--color-ink\)/);
    assert.equal(source.includes('className="text-ink">{app.glossaryInfo.count}'), false);
    assert.equal(source.split("studio-count").length - 1, 3);
    const card = source.slice(
      source.indexOf('className="studio-tool-card"'),
      source.indexOf('id="tool-key"'),
    );
    assert.match(card, /aria-label="Đóng tab"/);
    assert.ok(source.indexOf('className="studio-tool-card"') < source.indexOf('id="tool-check"'));
  });
});

describe("Bố cục mới B4 — Tải và dịch trong tab Phim, chip Trả bằng", () => {
  it("mở lên tab Phim, nút chạy dính đáy tab, chip Cách trả ở đầu tab Phim", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    assert.match(source, /useState<ToolId>\("phim"\)/);
    const phimTab = source.slice(
      source.indexOf('id="tool-phim"'),
      source.indexOf('id="tool-cast"'),
    );
    assert.match(phimTab, /studio-pay-chip/);
    assert.match(phimTab, /Trả bằng:/);
    assert.ok(phimTab.indexOf("studio-pay-chip") < phimTab.indexOf("Nhận diện ngôn ngữ"));
    assert.match(phimTab, /studio-run-bar[\s\S]{0,200}data-tour="run"/);
    assert.match(
      mediaBlock(css, SHEET_PORTRAIT),
      /\.studio-run-bar\s*\{[^}]*position:\s*sticky[^}]*bottom:\s*0/,
    );
  });
});

describe("Bố cục mới B5a — Ví mở cùng kiểu tab 80%", () => {
  it("trang khách đứng: Ví là tab nổi, màn công cụ vẫn ở phía sau; chỗ khác Ví thay cả trang", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    assert.match(source, /product === "account" \? "product-covered" : "contents"/);
    assert.match(source, /studio-wallet-tab[\s\S]{0,400}<AccountPanel \/>/);
    assert.match(css, /\n\.product-covered\s*\{[^}]*display:\s*none/);
    const portrait = mediaBlock(css, SHEET_PORTRAIT);
    assert.match(portrait, /\.product-covered\s*\{[^}]*display:\s*contents/);
    assert.match(
      portrait,
      /\.studio-wallet-tab\s*\{[^}]*position:\s*fixed[^}]*calc\(80 \* var\(--vh\)\)/,
    );
  });
});

describe("Bố cục mới B5c — màn lớn có cột công cụ bên phải", () => {
  it("từ 1024px: video và bản dịch bên trái, công cụ chiếm cột phải", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    const block = mediaBlock(css, "(min-width: 1024px) and (min-height: 721px)");
    assert.match(block, /\.studio-cues\s*\{[^}]*grid-column:\s*1[^}]*grid-row:\s*2/);
    assert.match(block, /\.studio-tools\s*\{[^}]*grid-column:\s*2[^}]*grid-row:\s*1 \/ -1/);
  });
});
