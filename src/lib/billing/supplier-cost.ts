/** Supplier expense is computed before currency/debit rounding. Never use this value to change customer Token rules. */
import type { PriceBook } from "./run-bill.ts";
export function supplierBaseCost(
  book: PriceBook,
  model: string,
  kind: "asr" | "chat" | "speech",
  usage: { seconds?: number; inn?: number; out?: number; chars?: number },
  provider = "groq",
): number | null {
  const row = book.rows.find((r) => r.id === model);
  if (!row || !Number.isFinite(book.rate) || book.rate <= 0) return null;
  const price = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0;
  const count = (n: number | undefined) => typeof n === "number" && Number.isFinite(n) && n >= 0;
  if (kind === "asr") {
    if (!price(row.usdPerHour) || !count(usage.seconds)) return null;
    // Groq's documented minimum applies to its own calls; other providers report billable duration.
    return (
      ((row.usdPerHour! * Math.max(provider === "groq" ? 10 : 0, usage.seconds!)) / 3600) *
      book.rate
    );
  }
  if (kind === "speech") {
    if (!price(row.usdPerMillionChars) || !count(usage.chars)) return null;
    return ((row.usdPerMillionChars! * usage.chars!) / 1_000_000) * book.rate;
  }
  if (!price(row.usdIn) || !price(row.usdOut) || !count(usage.inn) || !count(usage.out))
    return null;
  return ((row.usdIn! * usage.inn! + row.usdOut! * usage.out!) / 1_000_000) * book.rate;
}
