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
};

function termsText() {
  const body = doc.slice(doc.indexOf("<article"), doc.indexOf("</article>") + "</article>".length);
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
    assert.match(doc, /9\. Giới thiệu/);
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
