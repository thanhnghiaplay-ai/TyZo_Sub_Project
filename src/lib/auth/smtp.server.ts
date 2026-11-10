import nodemailer from "nodemailer";
import { smtpTarget, type Mail, type MailEnv } from "./mailer.ts";

type Transport = { sendMail(options: Record<string, unknown>): Promise<unknown> };
type CreateTransport = (options: Record<string, unknown>) => Transport;

/** Gửi một thư qua SMTP của hộp thư cá nhân. Chỉ chạy trên máy chủ. `createTransport` để test thay bằng bản giả. */
export async function sendSmtp(env: MailEnv, mail: Mail, createTransport: CreateTransport = nodemailer.createTransport as CreateTransport) {
  const target = smtpTarget(env);
  if (!target) throw new Error("Chưa cấu hình email cá nhân.");
  const transport = createTransport({
    host: target.host,
    port: target.port,
    secure: target.secure,
    requireTLS: !target.secure,
    auth: { user: target.user, pass: target.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  const from = (env.MAIL_FROM ?? "").trim() || target.user;
  try {
    await transport.sendMail({ from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
  } catch (error) {
    const code = (error as { responseCode?: number; code?: string }).responseCode ?? (error as { code?: string }).code ?? "";
    // Không đưa mật khẩu hay nội dung thư vào thông báo lỗi.
    throw new Error(`Gửi thư qua email cá nhân lỗi ${code}`.trim() + ".");
  }
}
