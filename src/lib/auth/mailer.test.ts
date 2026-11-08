import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMailRequest, mailerName, sendMail, verificationMail } from "./mailer.ts";

const mail = verificationMail("a@b.vn", "https://x.vn/v?token=1&callbackURL=/");
const from = { MAIL_FROM: "TyZo <no-reply@tyzo.vn>" };

describe("gửi thư xác minh", () => {
  it("không đủ cấu hình thì không có nhà cung cấp", () => {
    assert.equal(mailerName({}), null);
    assert.equal(mailerName({ RESEND_API_KEY: "k" }), null);
    assert.equal(mailerName({ ...from, MAILGUN_API_KEY: "k" }), null);
    assert.equal(buildMailRequest({}, mail), null);
  });

  it("chọn đúng nhà cung cấp theo biến môi trường", () => {
    assert.equal(mailerName({ ...from, RESEND_API_KEY: "k" }), "resend");
    assert.equal(mailerName({ ...from, SENDGRID_API_KEY: "k" }), "sendgrid");
    assert.equal(mailerName({ ...from, BREVO_API_KEY: "k" }), "brevo");
    assert.equal(mailerName({ ...from, MAILGUN_API_KEY: "k", MAILGUN_DOMAIN: "mg.tyzo.vn" }), "mailgun");
    assert.equal(mailerName({ ...from, POSTMARK_TOKEN: "k" }), "postmark");
    assert.equal(mailerName({ ...from, MAIL_WEBHOOK_URL: "https://h.vn/x" }), "webhook");
  });

  it("dựng đúng yêu cầu cho từng nhà cung cấp", () => {
    const resend = buildMailRequest({ ...from, RESEND_API_KEY: "rk" }, mail)!;
    assert.equal(resend.url, "https://api.resend.com/emails");
    assert.equal(resend.init.headers.authorization, "Bearer rk");
    assert.deepEqual(JSON.parse(resend.init.body).to, ["a@b.vn"]);
    const grid = JSON.parse(buildMailRequest({ ...from, SENDGRID_API_KEY: "k" }, mail)!.init.body);
    assert.deepEqual(grid.from, { email: "no-reply@tyzo.vn", name: "TyZo" });
    const brevo = buildMailRequest({ ...from, BREVO_API_KEY: "bk" }, mail)!;
    assert.equal(brevo.init.headers["api-key"], "bk");
    const mg = buildMailRequest({ ...from, MAILGUN_API_KEY: "k", MAILGUN_DOMAIN: "mg.tyzo.vn" }, mail)!;
    assert.equal(mg.url, "https://api.mailgun.net/v3/mg.tyzo.vn/messages");
    assert.match(mg.init.headers.authorization, /^Basic /);
    assert.equal(new URLSearchParams(mg.init.body).get("to"), "a@b.vn");
    const pm = JSON.parse(buildMailRequest({ ...from, POSTMARK_TOKEN: "k" }, mail)!.init.body);
    assert.equal(pm.To, "a@b.vn");
    const hook = buildMailRequest({ ...from, MAIL_WEBHOOK_URL: "https://h.vn/x", MAIL_WEBHOOK_TOKEN: "t" }, mail)!;
    assert.equal(hook.url, "https://h.vn/x");
    assert.equal(hook.init.headers.authorization, "Bearer t");
  });

  it("liên kết trong HTML được escape", () => {
    assert.match(mail.html, /token=1&amp;callbackURL/);
    assert.match(mail.text, /token=1&callbackURL/);
  });

  it("gửi lỗi thì ném lỗi, thành công thì không", async () => {
    const env = { ...from, RESEND_API_KEY: "k" };
    await sendMail(mail, env, (async () => new Response("{}", { status: 200 })) as typeof fetch);
    await assert.rejects(sendMail(mail, env, (async () => new Response("no", { status: 500 })) as typeof fetch), /500/);
    await assert.rejects(sendMail(mail, {}, fetch), /Chưa cấu hình/);
  });
});
