/**
 * Ký link tạm (AWS Signature V4, kiểu query) cho Cloudflare R2. Thuần, không phụ thuộc thư viện ngoài:
 * chỉ dùng WebCrypto có sẵn ở Node và trình duyệt. Test đối chiếu với ví dụ chính thức của AWS.
 */

export type R2Target = {
  /** Ví dụ "abc123.r2.cloudflarestorage.com" (không có https://). */
  host: string;
  /** Đường dẫn đã gồm tên bucket nếu dùng kiểu path, ví dụ "/tyzo-audio/u/123/a.webm". */
  path: string;
  region: string;
  service: string;
};

export type R2Creds = { accessKeyId: string; secretAccessKey: string };

const encoder = new TextEncoder();

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text: string): Promise<string> {
  return hex(await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const imported = await globalThis.crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return globalThis.crypto.subtle.sign("HMAC", imported, encoder.encode(data));
}

/** Mã hóa phần trăm theo đúng luật SigV4 (chỉ giữ A-Z a-z 0-9 - _ . ~). */
export function awsEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** Đường dẫn: mã hóa từng đoạn, giữ dấu "/". */
export function awsEncodePath(path: string): string {
  return path
    .split("/")
    .map((part) => awsEncode(part))
    .join("/");
}

/** "20130524T000000Z" từ một thời điểm. */
export function amzDate(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export type PresignInput = {
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  target: R2Target;
  creds: R2Creds;
  /** Số giây link còn dùng được, 1 đến 604800 (7 ngày). */
  expiresSeconds: number;
  now?: Date;
};

/** Trả địa chỉ đầy đủ đã ký. Chỉ ký header `host`, nội dung không ký (UNSIGNED-PAYLOAD). */
export async function presignUrl(input: PresignInput): Promise<string> {
  const { method, target, creds } = input;
  if (!(input.expiresSeconds >= 1 && input.expiresSeconds <= 604800)) throw new Error("Thời hạn link phải từ 1 giây đến 7 ngày.");
  const stamp = amzDate(input.now ?? new Date());
  const day = stamp.slice(0, 8);
  const scope = `${day}/${target.region}/${target.service}/aws4_request`;
  const query: Array<[string, string]> = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${creds.accessKeyId}/${scope}`],
    ["X-Amz-Date", stamp],
    ["X-Amz-Expires", String(Math.floor(input.expiresSeconds))],
    ["X-Amz-SignedHeaders", "host"],
  ];
  const canonicalQuery = query
    .map(([k, v]) => [awsEncode(k), awsEncode(v)] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const canonicalPath = awsEncodePath(target.path);
  const canonicalRequest = [method, canonicalPath, canonicalQuery, `host:${target.host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", stamp, scope, await sha256Hex(canonicalRequest)].join("\n");
  const kDate = await hmac(encoder.encode(`AWS4${creds.secretAccessKey}`), day);
  const kRegion = await hmac(kDate, target.region);
  const kService = await hmac(kRegion, target.service);
  const kSigning = await hmac(kService, "aws4_request");
  const signature = hex(await hmac(kSigning, toSign));
  return `https://${target.host}${canonicalPath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
