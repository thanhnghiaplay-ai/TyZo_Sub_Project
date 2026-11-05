export const COMMON_DOMAINS = ["gmail.com", "icloud.com", "outlook.com", "yahoo.com", "hotmail.com", "live.com", "me.com"];

const TEMP_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "dispostable.com",
  "sharklasers.com",
  "maildrop.cc",
  "temp-mail.org",
  "fakeinbox.com",
  "throwawaymail.com",
  "emailondeck.com",
  "moakt.com",
  "minuteinbox.com",
  "guerrillamailblock.com",
];

export function withDomain(value: string, domain: string) {
  const local = value.trim().split("@")[0]?.trim() || "";
  return local ? `${local}@${domain}` : "";
}

export function mailProblem(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] || "";
  if (!domain || domain.includes("@") || !email.includes("@")) return "Email không đúng.";
  if (TEMP_DOMAINS.includes(domain)) return "Không nhận email tạm. Hãy dùng Gmail, iCloud, Outlook hoặc Yahoo.";
  return null;
}
