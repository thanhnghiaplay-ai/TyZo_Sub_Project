export type PayHit = { ref: string; amount: number; text: string };

const CODE = /^TZ[A-Z0-9]{6}$/;

export function makePayCode(seed: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "TZ";
  for (let i = 0; i < 6; i += 1) {
    const n = seed.charCodeAt(i % seed.length) + i * 17;
    out += alphabet[Math.abs(n) % alphabet.length];
  }
  return out;
}

export function isPayCode(value: string) {
  return CODE.test(value);
}

export function codesIn(text: string) {
  const found = text.toUpperCase().match(/TZ[A-Z0-9]{6}/g) ?? [];
  return [...new Set(found)];
}

export function sepayHit(body: unknown): PayHit | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  if (String(row.transferType ?? "in").toLowerCase() === "out") return null;
  const amount = Number(row.transferAmount ?? row.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const text = [row.code, row.content, row.description].filter((item) => item != null).join(" ");
  const ref = String(row.id ?? row.referenceCode ?? "");
  if (!ref) return null;
  return { ref, amount: Math.round(amount), text };
}

export function cassoHits(body: unknown): PayHit[] {
  if (!body || typeof body !== "object") return [];
  const data = (body as { data?: unknown }).data;
  const rows = Array.isArray(data) ? data : [body];
  const hits: PayHit[] = [];
  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const amount = Number(row.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const ref = String(row.id ?? row.tid ?? "");
    if (!ref) continue;
    hits.push({
      ref,
      amount: Math.round(amount),
      text: String(row.description ?? row.content ?? ""),
    });
  }
  return hits;
}

export function sameSecret(given: string, expected: string) {
  if (!expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i += 1) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
