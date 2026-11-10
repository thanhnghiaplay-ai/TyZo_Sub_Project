import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMailRequest, mailerName, sendMail, smtpTarget, verificationMail } from "./mailer.ts";
import { sendSmtp } from "./smtp.server.ts";

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

describe("email cá nhân qua SMTP", () => {
  const gmail = { MAIL_FROM: "TyZo <ban@gmail.com>", SMTP_USER: "ban@gmail.com", SMTP_PASS: "abcd efgh ijkl mnop" };

  it("Gmail và Yahoo tự nhận máy chủ, bỏ khoảng trắng trong mật khẩu ứng dụng", () => {
    assert.deepEqual(smtpTarget(gmail), { host: "smtp.gmail.com", port: 465, secure: true, user: "ban@gmail.com", pass: "abcdefghijklmnop" });
    assert.equal(smtpTarget({ ...gmail, SMTP_USER: "ban@yahoo.com" })?.host, "smtp.mail.yahoo.com");
    assert.equal(mailerName(gmail), "smtp");
  });

  it("đuôi lạ thì cần máy chủ, có máy chủ và cổng 587 thì nâng TLS sau", () => {
    const other = { ...gmail, SMTP_USER: "ban@congty.vn" };
    assert.equal(smtpTarget(other), null);
    assert.equal(mailerName(other), null);
    assert.deepEqual(smtpTarget({ ...other, SMTP_HOST: "SMTP.congty.vn:587" }), { host: "smtp.congty.vn", port: 587, secure: false, user: "ban@congty.vn", pass: "abcdefghijklmnop" });
  });

  it("thiếu tài khoản, mật khẩu hoặc máy chủ sai thì không bật", () => {
    assert.equal(smtpTarget({ SMTP_USER: "ban@gmail.com" }), null);
    assert.equal(smtpTarget({ SMTP_PASS: "x" }), null);
    assert.equal(smtpTarget({ ...gmail, SMTP_HOST: "khong hop le" }), null);
    assert.equal(smtpTarget({ ...gmail, SMTP_HOST: "smtp.a.vn:99999" }), null);
    assert.equal(mailerName({ SMTP_USER: gmail.SMTP_USER, SMTP_PASS: gmail.SMTP_PASS }), null);
  });

  it("nhà cung cấp HTTP vẫn được ưu tiên và SMTP không dựng yêu cầu HTTP", () => {
    assert.equal(mailerName({ ...gmail, RESEND_API_KEY: "k" }), "resend");
    assert.equal(buildMailRequest(gmail, mail), null);
  });

  it("sendMail đi đường SMTP, không gọi fetch", async () => {
    const sent: unknown[] = [];
    const noFetch = (async () => {
      throw new Error("không được gọi fetch");
    }) as typeof fetch;
    await sendMail(mail, gmail, noFetch, async (env, m) => {
      sent.push([env.SMTP_USER, m.to]);
    });
    assert.deepEqual(sent, [["ban@gmail.com", "a@b.vn"]]);
  });

  it("sendSmtp dựng đúng cấu hình và không lộ mật khẩu khi lỗi", async () => {
    let options: Record<string, unknown> = {};
    let message: Record<string, unknown> = {};
    await sendSmtp(gmail, mail, (o) => {
      options = o;
      return { sendMail: async (m) => void (message = m) };
    });
    assert.equal(options.host, "smtp.gmail.com");
    assert.equal(options.secure, true);
    assert.deepEqual(options.auth, { user: "ban@gmail.com", pass: "abcdefghijklmnop" });
    assert.equal(message.from, "TyZo <ban@gmail.com>");
    assert.equal(message.to, "a@b.vn");
    assert.equal(message.subject, mail.subject);
    const failing = () => ({ sendMail: async () => Promise.reject(Object.assign(new Error("535 abcdefghijklmnop sai"), { responseCode: 535 })) });
    await assert.rejects(sendSmtp(gmail, mail, failing), (error: Error) => /535/.test(error.message) && !error.message.includes("abcdefghijklmnop"));
    await assert.rejects(sendSmtp({}, mail, failing), /Chưa cấu hình/);
  });
});
