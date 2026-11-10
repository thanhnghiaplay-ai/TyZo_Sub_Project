import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deskToEnv, mailDeskView } from "./mail-desk-shape.ts";

describe("bàn gửi thư", () => {
  it("đổi khóa đã lưu thành biến nhà cung cấp, không trả khóa ra màn hình", () => {
    const env = deskToEnv({ provider: "brevo", from: "TyZo <thu@tyzo.vn>", key: "khoa-dai", domain: "" });
    assert.equal(env.BREVO_API_KEY, "khoa-dai");
    assert.equal(env.MAIL_FROM, "TyZo <thu@tyzo.vn>");
    const view = mailDeskView({ provider: "brevo", from: "TyZo <thu@tyzo.vn>", key: "khoa-dai", domain: "", testedAt: 0 }, null, "a@b.vn");
    assert.equal(view.savedReady, true);
    assert.equal(view.keySet, true);
    assert.equal(JSON.stringify(view).includes("khoa-dai"), false);
  });

  it("Mailgun thiếu tên miền thì chưa gửi được", () => {
    const view = mailDeskView({ provider: "mailgun", from: "TyZo <thu@tyzo.vn>", key: "khoa-dai", domain: "", testedAt: 0 }, "resend", "a@b.vn");
    assert.equal(view.savedReady, false);
    assert.equal(view.serverName, "resend");
  });

  it("email cá nhân: tài khoản là địa chỉ gửi, Gmail đủ để gửi, đuôi lạ phải có máy chủ", () => {
    const gmail = { provider: "smtp" as const, from: "TyZo Sub <ban@gmail.com>", key: "abcdefghijklmnop", domain: "" };
    const env = deskToEnv(gmail);
    assert.equal(env.SMTP_USER, "ban@gmail.com");
    assert.equal(env.SMTP_PASS, "abcdefghijklmnop");
    assert.equal(env.SMTP_HOST, undefined);
    assert.equal(mailDeskView({ ...gmail, testedAt: 0 }, null, "a@b.vn").savedReady, true);
    const custom = { ...gmail, from: "ban@congty.vn" };
    assert.equal(mailDeskView({ ...custom, testedAt: 0 }, null, "a@b.vn").savedReady, false);
    assert.equal(mailDeskView({ ...custom, domain: "smtp.congty.vn:587", testedAt: 0 }, null, "a@b.vn").savedReady, true);
    assert.equal(JSON.stringify(mailDeskView({ ...gmail, testedAt: 0 }, null, "a@b.vn")).includes("abcdefghijklmnop"), false);
  });
});
