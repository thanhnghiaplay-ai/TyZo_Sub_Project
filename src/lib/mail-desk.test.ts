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
});
