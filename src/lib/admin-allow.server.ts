import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const bundledOwners = ["thanhnghiaplay@gmail.com"];

function fromFile() {
  try {
    const raw = readFileSync(join(process.cwd(), ".grok/admin.json"), "utf8");
    const parsed = JSON.parse(raw) as { owners?: unknown };
    if (!Array.isArray(parsed.owners)) return [];
    return parsed.owners.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

/** Email Chủ, chỉ đọc trên máy chủ. Không đưa vào trang người dùng. */
export function ownerEmails() {
  const found = new Set<string>();
  const fromEnv = process.env.ADMIN_EMAIL?.trim();
  if (fromEnv) found.add(fromEnv.toLowerCase());
  for (const item of bundledOwners) found.add(item.toLowerCase());
  for (const item of fromFile()) {
    const email = item.trim().toLowerCase();
    if (email.includes("@")) found.add(email);
  }
  return [...found];
}

export function emailIsOwner(email: string) {
  return ownerEmails().includes(email.trim().toLowerCase());
}

export function writeOwnerEmails(emails: string[]) {
  const clean = [...new Set(emails.map((item) => item.trim().toLowerCase()))].filter((item) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item),
  );
  if (!clean.length) throw new Error("Phải còn ít nhất một email Chủ.");
  writeFileSync(join(process.cwd(), ".grok/admin.json"), JSON.stringify({ owners: clean }, null, 2) + "\n", { mode: 0o600 });
  return clean;
}
