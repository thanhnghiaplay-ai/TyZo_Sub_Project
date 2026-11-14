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
    const markers = ["Nhận diện ngôn ngữ", "Dịch sang tiếng", "Thể loại", 'title="Video"', "{app.buttonLabel}"];
    const at = markers.map((marker) => phim.indexOf(marker));
    assert.ok(at.every((index) => index >= 0), at.join(","));
    assert.deepEqual(at, [...at].sort((a, b) => a - b));
    assert.equal(phim.includes("Ngôn ngữ lời nói"), false);
    assert.equal(phim.includes("Ngôn ngữ đích"), false);
    assert.match(phim, /Dịch sang tiếng[\s\S]*value === "Vietnamese"/);
    const lists = readFileSync(new URL("../lib/sub/text.ts", import.meta.url), "utf8");
    const src = lists.slice(lists.indexOf("export const SRC_LANGS"), lists.indexOf("export function speechLang"));
    assert.deepEqual(
      [...src.matchAll(/\["(zh|ko|ja|en|vi|th)"/g)].map((match) => match[1]),
      ["zh", "ko", "ja", "en"],
    );
    assert.equal(src.includes("Tự nhận dạng"), false);
  });

  it("thuật ngữ và gói dịch nằm ở mục Nâng cao của menu trái, không nằm trong tab Phim và Key", () => {
    assert.equal(phim.includes("Thuật ngữ thể loại"), false);
    assert.equal(phim.includes("<GlossaryEditor"), false);
    const key = source.slice(source.indexOf('id="tool-key"'), source.indexOf('id="tool-phim"'));
    assert.equal(key.includes("<TurnPackList"), false);
    const thuat = source.slice(source.indexOf('id="tool-thuatngu"'));
    assert.match(thuat, /Thuật ngữ thể loại[\s\S]*<GlossaryEditor/);
    const goi = source.slice(source.indexOf('id="tool-goi-dich"'), source.indexOf('id="tool-thuatngu"'));
    assert.match(goi, /<TurnPackList/);
    assert.match(source, /id: "nang-cao"[\s\S]{0,120}ADVANCED_TOOLS\.map/);
    assert.match(source, /hidden=\{toolTab !== "goi-dich"\}/);
    assert.match(source, /hidden=\{toolTab !== "thuatngu"\}/);
  });
});

describe("Bước 6.2 — khung Phụ đề", () => {
  it("video và bảng câu đứng ngoài tab, chỉ có một player", () => {
    const markers = ['<SideRail', 'data-product="sub"', "data-workspace", "<Stage", "Bản dịch", 'id="tool-phim"'];
    const at = markers.map((marker) => source.indexOf(marker));
    assert.ok(at.every((index) => index >= 0));
    assert.deepEqual(at, [...at].sort((a, b) => a - b));
    const workspace = source.slice(source.indexOf("data-workspace"), source.indexOf('id="tool-key"'));
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
      assert.match(source, new RegExp(`id="tool-${id}"[\\s\\S]{0,160}hidden=\\{toolTab !== "${id}"\\}`));
    }
    assert.equal(source.includes('{toolTab === "phim" &&'), false);
  });

  it("một nút Dịch tiếp, khoảng trống nằm ở Kiểm tra", () => {
    assert.equal(source.split("Dịch tiếp").length - 1, 1);
    const check = source.slice(source.indexOf('id="tool-check"'));
    assert.match(check, /Dò khoảng trống/);
    const workspace = source.slice(source.indexOf("data-workspace"), source.indexOf('id="tool-phim"'));
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
    const stageRules = (css.match(/[^{}]+\{[^{}]*\}/g) || []).filter((rule) => /studio|stage|player|video|sheet/.test(rule.split("{")[0]));
    assert.ok(stageRules.length > 0);
    for (const rule of stageRules) {
      assert.equal(rule.includes("z-index:"), false, rule);
      assert.equal(rule.includes("position: absolute"), false, rule);
    }
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
    assert.match(css, /\.admin-grid,\s*\.admin-flow\s*\{[^}]*display:\s*grid[^}]*repeat\(auto-fit,\s*minmax\(min\(100%,\s*22rem\),\s*1fr\)\)/);
    assert.match(css, /\.admin-grid > \.admin-wide\s*\{[^}]*grid-column:\s*1 \/ -1/);
    assert.match(css, /\.account-grid > \.account-wide\s*\{[^}]*column-span:\s*all/);
    assert.match(css, /\.admin-split\s*\{[^}]*display:\s*grid/);
    const adminRoute = readFileSync(new URL("../routes/admin.tsx", import.meta.url), "utf8");
    const accountRoute = readFileSync(new URL("../routes/tai-khoan.tsx", import.meta.url), "utf8");
    assert.match(adminRoute, /room-wide/);
    assert.match(accountRoute, /room-wide/);
    assert.match(readFileSync(new URL("./admin-desk.tsx", import.meta.url), "utf8"), /className="admin-grid"/);
    assert.match(readFileSync(new URL("./account-panel.tsx", import.meta.url), "utf8"), /account-grid/);
    // Bảng cài đặt phụ đề nằm trong khung video: khung phải co và cuộn, ruột không bị bóp méo.
    assert.match(css, /\.studio-video\s*\{[^}]*flex:\s*0 1 auto[^}]*overflow-y:\s*auto/);
    assert.match(css, /\.studio-video \.player-stack > \*\s*\{[^}]*flex-shrink:\s*0/);
    assert.equal(/\.studio-video\s*\{[^}]*max-height:\s*calc/.test(css), false);
  });
});

describe("Bước 7.2 — tab theo thứ tự dùng", () => {
  it("Key Sub, Phim, Nhân vật; ngữ cảnh đóng và không mất dữ liệu", () => {
    const labels = ["Key Sub", "Phim", "Nhân vật", "Nghe", "Kiểm tra"];
    const at = labels.map((label) => source.indexOf(`"${label}"`));
    assert.ok(at.every((index) => index >= 0), at.join(","));
    assert.deepEqual(at, [...at].sort((a, b) => a - b));
    assert.equal(source.includes('id="tool-chat"'), false);
    const key = source.slice(source.indexOf('id="tool-key"'), source.indexOf('id="tool-phim"'));
    assert.match(key, /Groq API key/);
    assert.match(key, /Đồng bộ key/);
    assert.match(key, /Nhận dạng giọng/);
    assert.equal(key.includes("Ngữ cảnh phim"), false);
    const cast = source.slice(source.indexOf('id="tool-cast"'), source.indexOf('id="tool-voice"'));
    const context = cast.indexOf("Ngữ cảnh phim");
    const details = cast.lastIndexOf("<details", context);
    assert.ok(context >= 0 && context < cast.indexOf("Phân tích phim"));
    assert.equal(/<details[^>]*\sopen/.test(cast.slice(details, context)), false);
    assert.match(cast, /app\.setTitle/);
    assert.match(cast, /app\.setNotes/);
    assert.match(cast, /app\.setGloss/);
    assert.match(source, /if \(!app\.reviewHold\) return;\s*setToolTab\("cast"\);\s*setSheetOpen\(true\);/);
  });
});

describe("Bước 7.3 — không giật khi chọn file và khi báo trạng thái", () => {
  it("khóa trang, nút đóng là dấu X, trạng thái đúng hai hàng", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    assert.match(css, /html,\s*body\s*\{[^}]*overflow:\s*hidden/);
    assert.match(source, /aria-label="Đóng tab"/);
    assert.match(source, /<X /);
    assert.equal(source.includes(">Đóng</button>\n        <section id=\"tool-key\""), false);
    assert.match(mediaBlock(css, SHEET_PORTRAIT), /\.studio-sheet-bar\s*\{[^}]*display:\s*flex/);
    assert.match(mediaBlock(css, SHEET_LANDSCAPE), /\.studio-sheet-bar\s*\{[^}]*display:\s*flex/);
    assert.equal(/\.studio-sheet-bar\s*\{[^}]*display:\s*flex/.test(css.slice(0, css.indexOf("@media"))), false);
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
    const card = source.slice(source.indexOf('className="studio-tool-card"'), source.indexOf('id="tool-key"'));
    assert.match(card, /aria-label="Đóng tab"/);
    assert.ok(source.indexOf('className="studio-tool-card"') < source.indexOf('id="tool-check"'));
  });
});




