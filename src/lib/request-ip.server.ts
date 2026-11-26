import { isIP } from "node:net";

/** Only trust a header overwritten by the configured ingress. A missing or
 * malformed trusted value never falls back to another client-controlled header.
 * Direct public access to the origin must be blocked by deployment networking.
 */
export function trustedClientIp(request: Pick<Request, "headers"> | null | undefined, configured = process.env.TRUSTED_IP_HEADER ?? "x-forwarded-for"): string {
  const header = configured.trim().toLowerCase();
  if (!["x-forwarded-for", "cf-connecting-ip", "x-real-ip"].includes(header)) return "";
  const raw = request?.headers.get(header) ?? "";
  const ip = (header === "x-forwarded-for" ? raw.split(",")[0] : raw).trim();
  const version = isIP(ip);
  if (!version) return "";
  // Canonical IPv6 prevents alternate textual forms creating separate rate keys.
  return version === 6 ? new URL(`http://[${ip}]/`).hostname.slice(1, -1) : ip;
}
