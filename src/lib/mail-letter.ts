export type LetterKind = "verify" | "reset" | "changed";
export type LetterLayout = "plain" | "frame" | "band";
export type LetterFont = "sans" | "serif";

export type LetterCopy = {
  subject: string;
  greeting: string;
  body: string;
  button: string;
  footer: string;
  showName: boolean;
};

export type MailFace = {
  verifyOn: boolean;
  verifyRequired: boolean;
  resetOn: boolean;
  sent: string;
  unverified: string;
  resetSent: string;
  resetDone: string;
  resetBad: string;
};

export type MailPolicy = MailFace & {
  changedOn: boolean;
  ttlMin: 15 | 60 | 1440;
  resendWait: number;
  resendHour: number;
  layout: LetterLayout;
  font: LetterFont;
  colorBg: string;
  colorInk: string;
  colorButton: string;
  letters: Record<LetterKind, LetterCopy>;
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export const MAIL_POLICY: MailPolicy = {
  verifyOn: false,
  verifyRequired: false,
  resetOn: false,
  changedOn: false,
  ttlMin: 60,
  resendWait: 60,
  resendHour: 3,
  layout: "frame",
  font: "sans",
  colorBg: "#f6f3ec",
  colorInk: "#1c1608",
  colorButton: "#e7b63a",
  sent: "Đã gửi thư xác minh. Hãy mở hộp thư, kể cả mục thư rác, rồi bấm liên kết.",
  unverified: "Email chưa được xác minh. Hãy mở thư xác minh rồi đăng nhập lại.",
  resetSent: "Nếu email này có tài khoản, thư đặt lại mật khẩu đã được gửi.",
  resetDone: "Đã đặt mật khẩu mới. Hãy đăng nhập.",
  resetBad: "Liên kết không còn dùng được. Hãy xin thư mới.",
  letters: {
    verify: {
      subject: "Xác minh email TyZo Sub",
      greeting: "Xin chào,",
      body: "Bấm nút dưới đây để xác minh email và dùng tài khoản.",
      button: "Xác minh email",
      footer: "Nếu bạn không đăng ký, hãy bỏ qua thư này.",
      showName: true,
    },
    reset: {
      subject: "Đặt lại mật khẩu TyZo Sub",
      greeting: "Xin chào,",
      body: "Bấm nút dưới đây để đặt mật khẩu mới. Liên kết này chỉ dùng một lần.",
      button: "Đặt mật khẩu mới",
      footer: "Nếu bạn không xin đặt lại mật khẩu, hãy bỏ qua thư này.",
      showName: true,
    },
    changed: {
      subject: "Mật khẩu TyZo Sub đã đổi",
      greeting: "Xin chào,",
      body: "Mật khẩu tài khoản vừa được đổi. Nếu không phải bạn, hãy đặt lại mật khẩu ngay.",
      button: "",
      footer: "Phòng không bao giờ gửi mật khẩu trong thư.",
      showName: true,
    },
  },
};

function clip(value: unknown, max: number, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, max);
}

function letter(raw: unknown, fallback: LetterCopy): LetterCopy {
  const row = raw && typeof raw === "object" ? (raw as Partial<LetterCopy>) : {};
  return {
    subject: clip(row.subject, 120, fallback.subject),
    greeting: clip(row.greeting, 80, fallback.greeting),
    body: clip(row.body, 500, fallback.body),
    button: clip(row.button, 40, fallback.button),
    footer: clip(row.footer, 240, fallback.footer),
    showName: row.showName !== false,
  };
}

export function readMailPolicy(raw: string | undefined): MailPolicy {
  let parsed: Partial<MailPolicy> = {};
  try {
    parsed = raw ? (JSON.parse(raw) as Partial<MailPolicy>) : {};
  } catch {
    parsed = {};
  }
  const ttl = parsed.ttlMin === 15 || parsed.ttlMin === 1440 ? parsed.ttlMin : 60;
  const layout = parsed.layout === "plain" || parsed.layout === "band" ? parsed.layout : "frame";
  const base = MAIL_POLICY;
  return {
    ...base,
    verifyOn: parsed.verifyOn === true,
    verifyRequired: parsed.verifyOn === true && parsed.verifyRequired === true,
    resetOn: parsed.resetOn === true,
    changedOn: parsed.changedOn === true,
    ttlMin: ttl,
    resendWait: Math.min(300, Math.max(30, Math.round(Number(parsed.resendWait) || base.resendWait))),
    resendHour: Math.min(10, Math.max(1, Math.round(Number(parsed.resendHour) || base.resendHour))),
    layout,
    font: parsed.font === "serif" ? "serif" : "sans",
    colorBg: HEX.test(parsed.colorBg ?? "") ? parsed.colorBg! : base.colorBg,
    colorInk: HEX.test(parsed.colorInk ?? "") ? parsed.colorInk! : base.colorInk,
    colorButton: HEX.test(parsed.colorButton ?? "") ? parsed.colorButton! : base.colorButton,
    sent: clip(parsed.sent, 240, base.sent),
    unverified: clip(parsed.unverified, 240, base.unverified),
    resetSent: clip(parsed.resetSent, 240, base.resetSent),
    resetDone: clip(parsed.resetDone, 240, base.resetDone),
    resetBad: clip(parsed.resetBad, 240, base.resetBad),
    letters: {
      verify: letter(parsed.letters?.verify, base.letters.verify),
      reset: letter(parsed.letters?.reset, base.letters.reset),
      changed: letter(parsed.letters?.changed, base.letters.changed),
    },
  };
}

export function mailFace(policy: MailPolicy): MailFace {
  return {
    verifyOn: policy.verifyOn,
    verifyRequired: policy.verifyRequired,
    resetOn: policy.resetOn,
    sent: policy.sent,
    unverified: policy.unverified,
    resetSent: policy.resetSent,
    resetDone: policy.resetDone,
    resetBad: policy.resetBad,
  };
}

const sentAt = new Map<string, number[]>();

/** Trần gửi thư trong một tiến trình. Không đụng cơ sở dữ liệu, nên không chặn đăng nhập. */
export function allowMailSend(key: string, waitSec: number, perHour: number, now = Date.now()) {
  const recent = (sentAt.get(key) ?? []).filter((at) => now - at < 3_600_000);
  const last = recent[recent.length - 1] ?? 0;
  if (recent.length >= perHour || (last && now - last < waitSec * 1000)) {
    sentAt.set(key, recent);
    return false;
  }
  recent.push(now);
  sentAt.set(key, recent);
  return true;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

export function renderLetter(policy: MailPolicy, kind: LetterKind, url?: string) {
  const copy = policy.letters[kind];
  const link = url && /^https?:\/\//.test(url) ? url : "";
  const button = link && copy.button ? copy.button : "";
  const text = [copy.greeting, "", copy.body, button ? `\n${button}: ${link}` : "", "", copy.footer].join("\n");
  const font = policy.font === "serif" ? "Georgia, serif" : "Arial, sans-serif";
  const name = copy.showName ? `<p style="margin:0 0 12px;font-size:13px;letter-spacing:.08em;">TYZO SUB</p>` : "";
  const action = button
    ? `<p style="margin:20px 0;"><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:${policy.colorButton};color:${policy.colorInk};font-weight:700;text-decoration:none;">${escapeHtml(button)}</a></p>`
    : "";
  const inner = `${name}<p style="margin:0 0 8px;">${escapeHtml(copy.greeting)}</p><p style="margin:0;">${escapeHtml(copy.body)}</p>${action}<p style="margin:20px 0 0;font-size:13px;opacity:.75;">${escapeHtml(copy.footer)}</p>`;
  const frame =
    policy.layout === "plain"
      ? inner
      : policy.layout === "band"
        ? `<div style="height:8px;background:${policy.colorButton};"></div><div style="padding:24px;">${inner}</div>`
        : `<div style="border:1px solid ${policy.colorButton};border-radius:16px;padding:24px;">${inner}</div>`;
  const html = `<div style="margin:0;padding:24px;background:${policy.colorBg};color:${policy.colorInk};font-family:${font};font-size:16px;line-height:1.5;">${frame}</div>`;
  return { subject: copy.subject, text, html };
}
