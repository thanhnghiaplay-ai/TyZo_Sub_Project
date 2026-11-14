/**
 * TAB "TẢI VIDEO" — MODULE RỜI. Gỡ: xem ghi chú đầu src/routes/tai-video.tsx.
 *
 * Việc duy nhất: nhận link một trang web, tải HTML về phía máy chủ và tìm link
 * video (.mp4 / .webm / .m3u8 / .mpd) cùng các khung nhúng (iframe).
 * Không tải video qua máy chủ, không cần ffmpeg hay yt-dlp (Vercel không có).
 * Chặn địa chỉ nội bộ để máy chủ không bị dùng dò mạng riêng (SSRF).
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type MediaKind = "mp4" | "webm" | "hls" | "dash";
export type FoundMedia = { url: string; kind: MediaKind };
export type ScanResult = { page: string; media: FoundMedia[]; frames: string[] };

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 10_000;
const MAX_MEDIA = 30;
const MAX_FRAMES = 10;

export class ScanError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ScanError";
    this.status = status;
  }
}

function privateV4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** true = không phải địa chỉ công cộng, không được gọi tới. */
export function isBlockedIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return privateV4(ip);
  if (kind === 6) {
    const low = ip.toLowerCase();
    if (low === "::" || low === "::1") return true;
    const mapped = low.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return privateV4(mapped[1]!);
    if (low.startsWith("::ffff:")) return true;
    return /^(fc|fd|fe[89ab])/.test(low) || low.startsWith("ff");
  }
  return true;
}

/** Kiểm tra link: chỉ http/https, cổng 80/443, tên miền phân giải ra địa chỉ công cộng. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ScanError("Link không hợp lệ.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new ScanError("Chỉ nhận link http hoặc https.");
  if (url.username || url.password) throw new ScanError("Link không được chứa thông tin đăng nhập.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new ScanError("Chỉ nhận cổng 80 hoặc 443.");
  if (!url.hostname || url.hostname === "localhost" || url.hostname.endsWith(".local")) {
    throw new ScanError("Không cho phép địa chỉ nội bộ.");
  }
  if (isIP(url.hostname)) {
    if (isBlockedIp(url.hostname)) throw new ScanError("Không cho phép địa chỉ nội bộ.");
  } else {
    let addresses;
    try {
      addresses = await lookup(url.hostname, { all: true, verbatim: true });
    } catch {
      throw new ScanError("Không phân giải được tên miền.", 400);
    }
    if (addresses.length === 0) throw new ScanError("Không phân giải được tên miền.", 400);
    for (const { address } of addresses) {
      if (isBlockedIp(address)) throw new ScanError("Tên miền trỏ tới địa chỉ nội bộ, bị chặn.");
    }
  }
  return url;
}

async function fetchPage(start: URL): Promise<{ html: string; finalUrl: URL }> {
  let current = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; TyZoBot/1.0; +https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project)",
          accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timer);
      if (response.status >= 300 && response.status < 400) {
        const loc = response.headers.get("location");
        if (!loc) throw new ScanError("Redirect không có Location.", 502);
        current = await assertPublicUrl(new URL(loc, current).toString());
        continue;
      }
      if (!response.ok) throw new ScanError(`Trang trả về ${response.status}.`, response.status >= 500 ? 502 : 400);
      const buf = await response.arrayBuffer();
      if (buf.byteLength > MAX_HTML_BYTES) throw new ScanError("Trang quá lớn.", 413);
      const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      return { html, finalUrl: current };
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof ScanError) throw error;
      if ((error as Error).name === "AbortError") throw new ScanError("Hết thời gian chờ trang.", 504);
      throw new ScanError("Không tải được trang.", 502);
    }
  }
  throw new ScanError("Quá nhiều lần chuyển hướng.", 502);
}

function kindOf(url: string): MediaKind | null {
  const path = url.split("?")[0]!.toLowerCase();
  if (path.endsWith(".mp4")) return "mp4";
  if (path.endsWith(".webm")) return "webm";
  if (path.endsWith(".m3u8")) return "hls";
  if (path.endsWith(".mpd")) return "dash";
  return null;
}

/** Bỏ ký tự thoát hay gặp trong JSON/JS nhúng: \\/ , \\u002f , & */
function unescapeText(text: string): string {
  return text
    .replace(/\\u002[fF]/g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&/g, "&");
}

function absolute(raw: string, base: URL): string | null {
  try {
    const url = new URL(raw.startsWith("//") ? `${base.protocol}${raw}` : raw, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Hàm thuần, không gọi mạng: tìm link video và iframe trong HTML. */
export function extractMedia(html: string, base: URL): { media: FoundMedia[]; frames: string[] } {
  const text = unescapeText(html);
  const seen = new Set<string>();
  const media: FoundMedia[] = [];
  const add = (raw: string) => {
    const url = absolute(raw.trim(), base);
    if (!url || seen.has(url)) return;
    const kind = kindOf(url);
    if (!kind) return;
    seen.add(url);
    media.push({ url, kind });
  };

  // Thẻ <video src>, <source src>, og:video, và thuộc tính data-src/data-url/file.
  for (const m of text.matchAll(/<(?:video|source)\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) add(m[1]!);
  for (const m of text.matchAll(/<meta\b[^>]*?(?:og:video(?::url|:secure_url)?|twitter:player:stream)[^>]*?content\s*=\s*["']([^"']+)["']/gi)) add(m[1]!);
  for (const m of text.matchAll(/\b(?:data-src|data-url|data-video|file|src|source|url)\s*[:=]\s*["']([^"']+\.(?:mp4|webm|m3u8|mpd)(?:\?[^"']*)?)["']/gi)) add(m[1]!);
  // Bất kỳ link tuyệt đối nào kết thúc bằng đuôi video (nằm trong script/JSON).
  for (const m of text.matchAll(/(?:https?:)?\/\/[^\s"'<>\\)]+?\.(?:mp4|webm|m3u8|mpd)(?:\?[^\s"'<>\\)]*)?/gi)) add(m[0]);

  const frames: string[] = [];
  const frameSeen = new Set<string>();
  for (const m of text.matchAll(/<iframe\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    const url = absolute(m[1]!, base);
    if (url && !frameSeen.has(url)) {
      frameSeen.add(url);
      frames.push(url);
    }
  }
  return { media: media.slice(0, MAX_MEDIA), frames: frames.slice(0, MAX_FRAMES) };
}

export async function scanPage(rawUrl: string): Promise<ScanResult> {
  const start = await assertPublicUrl(rawUrl);
  const { html, finalUrl } = await fetchPage(start);
  const { media, frames } = extractMedia(html, finalUrl);
  return { page: finalUrl.toString(), media, frames };
}
