import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanSupportContact, contactLinks, EMPTY_CONTACT, filledFields, hasContact, NOTE_MAX, readSupportContact } from "./support-contact.ts";

describe("cleanSupportContact", () => {
  it("nhận ô trống và trả về toàn chuỗi rỗng", () => {
    assert.deepEqual(cleanSupportContact({}), EMPTY_CONTACT);
    assert.deepEqual(cleanSupportContact(null), EMPTY_CONTACT);
    assert.deepEqual(cleanSupportContact({ email: "  ", zalo: "", facebook: "" }), EMPTY_CONTACT);
  });

  it("nhận email, số Zalo, link Facebook hợp lệ và bỏ khoảng trắng thừa", () => {
    const out = cleanSupportContact({ email: " ho-tro@tyzo.vn ", zalo: "0912 345.678", facebook: "facebook.com/tyzo.sub", note: " Trả lời trong giờ hành chính " });
    assert.equal(out.email, "ho-tro@tyzo.vn");
    assert.equal(out.zalo, "0912345678");
    assert.equal(out.facebook, "https://facebook.com/tyzo.sub");
    assert.equal(out.note, "Trả lời trong giờ hành chính");
  });

  it("nhận link zalo.me và m.me", () => {
    assert.equal(cleanSupportContact({ zalo: "https://zalo.me/0912345678" }).zalo, "https://zalo.me/0912345678");
    assert.equal(cleanSupportContact({ facebook: "https://m.me/tyzo" }).facebook, "https://m.me/tyzo");
  });

  it("từ chối email sai dạng", () => {
    assert.throws(() => cleanSupportContact({ email: "khong-phai-email" }), /Email/);
    assert.throws(() => cleanSupportContact({ email: "a b@c.vn" }), /Email/);
  });

  it("từ chối Zalo không phải số hay link zalo.me", () => {
    assert.throws(() => cleanSupportContact({ zalo: "https://evil.example/zalo.me" }), /Zalo/);
    assert.throws(() => cleanSupportContact({ zalo: "javascript:alert(1)" }), /Zalo/);
    assert.throws(() => cleanSupportContact({ zalo: "abc" }), /Zalo/);
  });

  it("từ chối Facebook không phải https của Facebook", () => {
    assert.throws(() => cleanSupportContact({ facebook: "http://facebook.com/x" }), /Facebook/);
    assert.throws(() => cleanSupportContact({ facebook: "https://facebook.com.evil.example/x" }), /Facebook/);
    assert.throws(() => cleanSupportContact({ facebook: "javascript:alert(1)" }), /Facebook/);
    assert.throws(() => cleanSupportContact({ facebook: "https://example.com/facebook.com" }), /Facebook/);
  });

  it("từ chối ghi chú quá dài", () => {
    assert.throws(() => cleanSupportContact({ note: "a".repeat(NOTE_MAX + 1) }), /Ghi chú/);
    assert.equal(cleanSupportContact({ note: "a".repeat(NOTE_MAX) }).note.length, NOTE_MAX);
  });

  it("bỏ ký tự điều khiển trong ghi chú", () => {
    assert.equal(cleanSupportContact({ note: "dòng 1\u0000\u0007dòng 2" }).note, "dòng 1  dòng 2");
  });
});

describe("readSupportContact", () => {
  it("đọc chuỗi JSON đã lưu", () => {
    const out = readSupportContact(JSON.stringify({ email: "a@b.vn", zalo: "0912345678", facebook: "", note: "ok" }));
    assert.equal(out.email, "a@b.vn");
    assert.equal(out.zalo, "0912345678");
  });

  it("dữ liệu hỏng thì trả rỗng, không ném lỗi", () => {
    assert.deepEqual(readSupportContact("{không phải json"), EMPTY_CONTACT);
    assert.deepEqual(readSupportContact(undefined), EMPTY_CONTACT);
    assert.deepEqual(readSupportContact(42), EMPTY_CONTACT);
  });

  it("ô nào hỏng thì chỉ bỏ ô đó, các ô còn lại giữ", () => {
    const out = readSupportContact(JSON.stringify({ email: "a@b.vn", zalo: "javascript:alert(1)", facebook: "https://facebook.com/x" }));
    assert.equal(out.email, "a@b.vn");
    assert.equal(out.zalo, "");
    assert.equal(out.facebook, "https://facebook.com/x");
  });
});

describe("contactLinks", () => {
  it("chỉ dựng liên kết cho ô đã điền", () => {
    assert.deepEqual(contactLinks(EMPTY_CONTACT), []);
    assert.equal(hasContact(EMPTY_CONTACT), false);
  });

  it("dựng mailto và https an toàn", () => {
    const links = contactLinks({ email: "a@b.vn", zalo: "0912345678", facebook: "https://facebook.com/x", note: "" });
    assert.deepEqual(
      links.map((link) => link.href),
      ["mailto:a@b.vn", "https://zalo.me/0912345678", "https://facebook.com/x"],
    );
    for (const link of links) assert.match(link.href, /^(mailto:|https:\/\/)/);
  });

  it("Zalo dạng link giữ nguyên link", () => {
    const [link] = contactLinks({ ...EMPTY_CONTACT, zalo: "https://zalo.me/tyzo" });
    assert.equal(link.href, "https://zalo.me/tyzo");
  });
});

describe("filledFields", () => {
  it("chỉ ghi tên ô, không chép giá trị vào nhật ký", () => {
    const note = filledFields({ email: "a@b.vn", zalo: "", facebook: "https://facebook.com/x", note: "" });
    assert.equal(note, "co: email, facebook");
    assert.doesNotMatch(note, /a@b\.vn|facebook\.com/);
    assert.equal(filledFields(EMPTY_CONTACT), "xoa het");
  });
});
