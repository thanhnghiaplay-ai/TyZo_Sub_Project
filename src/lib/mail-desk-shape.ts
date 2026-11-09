import { mailerName, type MailEnv, type MailerName } from "./auth/mailer.ts";

export const MAIL_PROVIDERS = ["resend", "brevo", "sendgrid", "mailgun", "postmark"] as const;
export type MailProvider = (typeof MAIL_PROVIDERS)[number];

export type MailDeskView = {
  provider: MailProvider;
  from: string;
  domain: string;
  keySet: boolean;
  savedReady: boolean;
  serverName: MailerName | null;
  email: string;
};

export type MailStored = { provider: MailProvider; from: string; key: string; domain: string; testedAt: number };

export function isMailProvider(value: string): value is MailProvider {
  return (MAIL_PROVIDERS as readonly string[]).includes(value);
}

export function readMailStored(raw: string | undefined): MailStored | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MailStored>;
    const provider = parsed.provider ?? "";
    if (!isMailProvider(provider) || !parsed.from || !parsed.key) return null;
    return {
      provider,
      from: parsed.from,
      key: parsed.key,
      domain: parsed.domain ?? "",
      testedAt: Number(parsed.testedAt) || 0,
    };
  } catch {
    return null;
  }
}

export function deskToEnv(desk: { provider: MailProvider; from: string; key: string; domain: string }): MailEnv {
  const env: MailEnv = { MAIL_FROM: desk.from };
  if (desk.provider === "resend") env.RESEND_API_KEY = desk.key;
  if (desk.provider === "brevo") env.BREVO_API_KEY = desk.key;
  if (desk.provider === "sendgrid") env.SENDGRID_API_KEY = desk.key;
  if (desk.provider === "mailgun") {
    env.MAILGUN_API_KEY = desk.key;
    env.MAILGUN_DOMAIN = desk.domain;
  }
  if (desk.provider === "postmark") env.POSTMARK_TOKEN = desk.key;
  return env;
}

export function mailDeskView(stored: MailStored | null, serverName: MailerName | null, email: string): MailDeskView {
  const savedReady = stored ? mailerName(deskToEnv(stored)) === stored.provider : false;
  return {
    provider: stored?.provider ?? "resend",
    from: stored?.from ?? "",
    domain: stored?.domain ?? "",
    keySet: Boolean(stored?.key),
    savedReady,
    serverName,
    email,
  };
}
