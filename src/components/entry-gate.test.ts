import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const gate = read("./entry-gate.tsx");
const doc = read("./terms-document.tsx");
const terms = read("../lib/terms.ts");
const home = read("../routes/index.tsx");
const page = read("../routes/dieu-khoan.tsx");
const login = read("../routes/login.tsx");
const account = read("../routes/tai-khoan.tsx");
const guide = read("./guide-page.tsx");
const rail = read("./side-rail.tsx");
const css = read("../styles.css");

/** Dấu vân tay chữ của điều khoản, bỏ khoảng trắng. Đổi chữ thì phải nâng TERMS_VERSION rồi thêm dòng mới ở đây. */
const TERMS_TEXT_HASH: Record<string, string> = {
  "2026-11-13.4": "a31fe1df344c120bdc47be53a1d26b86be721250ae28d63609c6ff751bcb78d2",
  "2026-11-15.1": "603f8b2428d5ffc05f338960cbea8d66ed755351d36067eb351115be17a51b79",
  "2026-11-16.1": "91f1a92ce2709e78af47072c9ecf13135cdbbaeae89a501d838ec6bb7ee96016",
  "2026-11-16.2": "f78f05bc80a9227a1cdb849b0e0c0676aa364bd4c9cc4f11d376a8ab8c9f852a",
  "2026-11-16.3": "bda4fbae11af81413357a9bca25413853b9ed500bef459958c9eebd24bd5d61b",
  "2026-11-16.4": "4d989f204611bd3608a74c948ad2ad2322d4776a0d8b908929f6f8a9b161070b",
  "2026-11-17.1": "6e5989c2f08034ac3e5389228a41904af63e29eece50158e34ea526ee3cfe002",
  "2026-11-17.2": "1609023d7f3e578cd5c4cdc5545844adf135dd250f39628e613d526121f0ecf6",
  "2026-11-18.1": "c39da2f89e9332945960ca08d1a7de9c588216f628da078803a076ccaa346f71",
  "2026-11-20.1": "bb08b96ead61ca726250ce8f62d63d7ab40786498e1f9d053ab6a7d8bbd00a7e",
  "2026-11-21.1": "7d0f2d2874159d90726b4627e606fe4cdd1f8ddbe69abd313c6d188d1b25b77d",
  "2026-11-21.2": "07be2fd703288d626aeed6c3975abc753d532ac5db48a9526c44db047881512a",
  "2026-11-21.3": "9830c6719708a0995660811e0876954843763af4c5cc48f383c79e208ba077c4",
};

function termsText() {
  const body = doc
    .slice(doc.indexOf("<article"), doc.indexOf("</article>") + "</article>".length)
    // Bảng giá đọc giá Chủ đang bán (useRoomPlans) thay vì hằng ROOM_PLANS: cùng một bảng, chữ khách thấy không đổi
    // khi giá là mặc định. Quy về tên cũ để đổi cách lấy giá không bị tính là đổi chữ điều khoản (khỏi ép khách
    // đồng ý lại). Mọi thay đổi chữ khác trong <article> vẫn làm hash lệch.
    .replace(/(?<![A-Za-z_])plans\.map\(/g, "ROOM_PLANS.map(");
  return createHash("sha256").update(body.replace(/\s+/g, " ").trim()).digest("hex");
}

describe("Cửa vào điều khoản", () => {
  it("màn chờ, rồi đã đồng ý thì vào, chưa có tài khoản thì sang /login, đã có tài khoản mà điều khoản đổi thì hỏi lại", () => {
    assert.match(terms, /export const TERMS_VERSION = "\d{4}-\d{2}-\d{2}\.\d+";/);
    assert.match(gate, /termsGate\(\{ accepted: hasAcceptedTerms\(\)/);
    assert.match(gate, /navigate\(\{ to: "\/login" \}\)/);
    assert.match(gate, /Đồng ý và tiếp tục/);
    assert.match(gate, /Không đồng ý/);
    assert.match(gate, /disabled=\{!read\}/);
    assert.match(gate, /Chưa vào phòng/);
    assert.match(gate, /<TermsDocument \/>/);
    assert.match(home, /<EntryGate>\s*<Studio \/>\s*<\/EntryGate>/);
    assert.match(css, /\.studio-shell \{/);
    assert.match(css, /\.gate-screen \{/);
    assert.match(css, /prefers-reduced-motion: reduce/);
  });

  it("nội dung điều khoản ở một chỗ, chữ đổi thì phải nâng TERMS_VERSION", () => {
    assert.match(doc, /Bảng giá/);
    assert.match(doc, /11\. Giới thiệu/);
    assert.doesNotMatch(gate, /Bảng giá/);
    const version = /TERMS_VERSION = "([^"]+)"/.exec(terms)?.[1] ?? "";
    assert.equal(
      TERMS_TEXT_HASH[version],
      termsText(),
      `Chữ điều khoản đã đổi hoặc TERMS_VERSION ${version} chưa có dấu vân tay. Nâng TERMS_VERSION rồi ghi dấu vân tay mới.`,
    );
  });
});

describe("Trang điều khoản và ô tích đồng ý", () => {
  it("trang /dieu-khoan đọc được bất cứ lúc nào, không qua cửa hỏi", () => {
    assert.match(page, /createFileRoute\("\/dieu-khoan"\)/);
    assert.match(page, /<TermsDocument \/>/);
    assert.doesNotMatch(page, /EntryGate/);
  });

  it("Đăng nhập và Đăng ký có ô tích, chưa tích thì không gọi đăng nhập", () => {
    assert.match(login, /Tôi đồng ý/);
    assert.match(login, /<TermsLink newTab/);
    assert.match(login, /if \(!agreed\) \{\s*setNotice\(TERMS_NEEDED\);\s*return;\s*\}/);
    assert.ok(login.indexOf("if (!agreed)") < login.indexOf("authClient.signUp.email"));
    assert.ok(login.indexOf("rememberTermsAccepted()") < login.indexOf("authClient.signUp.email"));
    // Không còn đá về trang chủ để hiện điều khoản (sẽ vòng lặp với cửa vào).
    assert.doesNotMatch(login, /router\.navigate\(\{ to: "\/" \}\);\s*\n\s*try \{\s*\n\s*const savedEmail/);
    assert.doesNotMatch(login, /getItem\("gterms"\)/);
  });

  it("liên kết điều khoản chỉ còn ba chỗ: ô tích đăng nhập/đăng ký, menu trái, trang Tài khoản", () => {
    assert.match(login, /<TermsLink newTab/);
    assert.match(rail, /to="\/dieu-khoan"/);
    assert.match(account, /<TermsLink \/>/);
    // Bỏ chân trang đăng nhập và cuối Hướng dẫn.
    assert.equal((login.match(/<TermsLink/g) ?? []).length, 1);
    assert.doesNotMatch(login, /<footer/);
    assert.doesNotMatch(guide, /TermsLink/);
  });
});
