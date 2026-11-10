/**
 * Gửi thư qua HTTP, không thêm thư viện. Chọn nhà cung cấp theo biến môi trường đã đặt,
 * theo thứ tự: Resend, SendGrid, Brevo, Mailgun, Postmark, email cá nhân qua SMTP, rồi webhook chung.
 * Luôn cần MAIL_FROM, ví dụ "TyZo <no-reply@ten-mien-cua-ban.vn>".
 * Email cá nhân (Gmail, Yahoo...) không cần tên miền: cần SMTP_USER và SMTP_PASS (mật khẩu ứng dụng),
 * máy chủ tự nhận theo đuôi email hoặc đặt SMTP_HOST ("host" hoặc "host:cổng").
 * Không có nhà cung cấp nào thì mailerName() trả null và không bật bắt buộc xác minh email.
 */
export type Mail = { to: string; subject: string; text: string; html: string };
export type MailEnv = Record<string, string | undefined>;
export type MailRequest = { url: string; init: { method: "POST"; headers: Record<string, string>; body: string } };

export type MailerName = "resend" | "sendgrid" | "brevo" | "mailgun" | "postmark" | "smtp" | "webhook";

const clean = (value: string | undefined) => (value && value.trim() ? value.trim() : "");

/** Máy chủ SMTP của các hộp thư cá nhân hay dùng, tra theo đuôi email. */
const SMTP_PRESETS: Record<string, { host: string; port: number }> = {
  "gmail.com": { host: "smtp.gmail.com", port: 465 },
  "googlemail.com": { host: "smtp.gmail.com", port: 465 },
  "yahoo.com": { host: "smtp.mail.yahoo.com", port: 465 },
  "yahoo.com.vn": { host: "smtp.mail.yahoo.com", port: 465 },
  "ymail.com": { host: "smtp.mail.yahoo.com", port: 465 },
};

export type SmtpTarget = { host: string; port: number; secure: boolean; user: string; pass: string };

/** Cổng 465 nối TLS ngay, cổng khác (thường 587) nâng lên TLS sau khi chào. */
export function smtpTarget(env: MailEnv): SmtpTarget | null {
  const user = clean(env.SMTP_USER);
  const pass = clean(env.SMTP_PASS).replace(/\s+/g, "");
  if (!user || !pass) return null;
  let host = "";
  let port = Number(clean(env.SMTP_PORT)) || 0;
  const given = clean(env.SMTP_HOST);
  if (given) {
    const [name, rawPort] = given.split(":");
    host = name.toLowerCase();
    if (rawPort) port = Number(rawPort) || 0;
  } else {
    const preset = SMTP_PRESETS[user.split("@")[1]?.toLowerCase() ?? ""];
    if (!preset) return null;
    host = preset.host;
    port = port || preset.port;
  }
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return null;
  if (!port) port = 465;
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { host, port, secure: port === 465, user, pass };
}

export function mailerName(env: MailEnv): MailerName | null {
  if (!clean(env.MAIL_FROM)) return null;
  if (clean(env.RESEND_API_KEY)) return "resend";
  if (clean(env.SENDGRID_API_KEY)) return "sendgrid";
  if (clean(env.BREVO_API_KEY)) return "brevo";
  if (clean(env.MAILGUN_API_KEY) && clean(env.MAILGUN_DOMAIN)) return "mailgun";
  if (clean(env.POSTMARK_TOKEN)) return "postmark";
  if (smtpTarget(env)) return "smtp";
  if (clean(env.MAIL_WEBHOOK_URL)) return "webhook";
  return null;
}

function parseFrom(from: string) {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { name: match[1].replace(/^"|"$/g, ""), email: match[2] } : { name: "", email: from.trim() };
}

export function buildMailRequest(env: MailEnv, mail: Mail): MailRequest | null {
  const name = mailerName(env);
  if (!name || name === "smtp") return null;
  const from = clean(env.MAIL_FROM);
  const json = { "content-type": "application/json" };
  if (name === "resend") {
    return {
      url: "https://api.resend.com/emails",
      init: { method: "POST", headers: { ...json, authorization: `Bearer ${clean(env.RESEND_API_KEY)}` }, body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, html: mail.html, text: mail.text }) },
    };
  }
  if (name === "sendgrid") {
    const f = parseFrom(from);
    return {
      url: "https://api.sendgrid.com/v3/mail/send",
      init: {
        method: "POST",
        headers: { ...json, authorization: `Bearer ${clean(env.SENDGRID_API_KEY)}` },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: mail.to }] }],
          from: f.name ? { email: f.email, name: f.name } : { email: f.email },
          subject: mail.subject,
          content: [{ type: "text/plain", value: mail.text }, { type: "text/html", value: mail.html }],
        }),
      },
    };
  }
  if (name === "brevo") {
    const f = parseFrom(from);
    return {
      url: "https://api.brevo.com/v3/smtp/email",
      init: {
        method: "POST",
        headers: { ...json, "api-key": clean(env.BREVO_API_KEY) },
        body: JSON.stringify({ sender: f.name ? { email: f.email, name: f.name } : { email: f.email }, to: [{ email: mail.to }], subject: mail.subject, htmlContent: mail.html, textContent: mail.text }),
      },
    };
  }
  if (name === "mailgun") {
    const base = clean(env.MAILGUN_BASE_URL) || "https://api.mailgun.net";
    const form = new URLSearchParams({ from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
    return {
      url: `${base.replace(/\/$/, "")}/v3/${clean(env.MAILGUN_DOMAIN)}/messages`,
      init: {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", authorization: `Basic ${Buffer.from(`api:${clean(env.MAILGUN_API_KEY)}`).toString("base64")}` },
        body: form.toString(),
      },
    };
  }
  if (name === "postmark") {
    return {
      url: "https://api.postmarkapp.com/email",
      init: { method: "POST", headers: { ...json, "x-postmark-server-token": clean(env.POSTMARK_TOKEN) }, body: JSON.stringify({ From: from, To: mail.to, Subject: mail.subject, HtmlBody: mail.html, TextBody: mail.text }) },
    };
  }
  const token = clean(env.MAIL_WEBHOOK_TOKEN);
  return {
    url: clean(env.MAIL_WEBHOOK_URL),
    init: { method: "POST", headers: { ...json, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ from, ...mail }) },
  };
}

export type SmtpSender = (env: MailEnv, mail: Mail) => Promise<void>;

async function defaultSmtpSend(env: MailEnv, mail: Mail) {
  const { sendSmtp } = await import("./smtp.server.ts");
  await sendSmtp(env, mail);
}

export async function sendMail(mail: Mail, env: MailEnv = process.env, doFetch: typeof fetch = fetch, smtpSend: SmtpSender = defaultSmtpSend) {
  if (mailerName(env) === "smtp") return smtpSend(env, mail);
  const request = buildMailRequest(env, mail);
  if (!request) throw new Error("Chưa cấu hình nhà cung cấp gửi thư.");
  const response = await doFetch(request.url, { ...request.init, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Gửi thư lỗi ${response.status}.`);
}

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function verificationMail(to: string, url: string): Mail {
  return {
    to,
    subject: "Xác minh email tài khoản TyZo",
    text: `Bấm vào liên kết để xác minh email và dùng tài khoản:\n${url}\n\nNếu bạn không đăng ký, hãy bỏ qua thư này.`,
    html: `<p>Bấm vào liên kết dưới đây để xác minh email và dùng tài khoản TyZo:</p><p><a href="${escapeHtml(url)}">Xác minh email</a></p><p>Nếu bạn không đăng ký, hãy bỏ qua thư này.</p>`,
  };
}
