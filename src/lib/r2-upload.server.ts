import { env } from "@/lib/env.server";
import { requireOpenAccount, takeRate } from "@/lib/guard.server";
import { requireServiceOpen } from "@/lib/service-status.server";
import { presignUrl, type R2Creds, type R2Target } from "@/lib/sub/r2-sign";
import { R2_GET_SECONDS, R2_PUT_SECONDS, r2ExtFor, r2KeyOwnedBy, r2ObjectKey, r2UploadProblem } from "@/lib/sub/r2-key";

export type R2UploadInput = { size: number; contentType: string };
export type R2UploadResult = { key: string; putUrl: string; getUrl: string; contentType: string; putSeconds: number };

type R2Config = { account: string; bucket: string; creds: R2Creds };

/** Đọc cấu hình từ biến môi trường. Thiếu cái nào thì trả danh sách tên còn thiếu (không bao giờ trả giá trị). */
export function r2Config(): { ok: true; config: R2Config } | { ok: false; missing: string[] } {
  const account = env("R2_ACCOUNT_ID");
  const accessKeyId = env("R2_ACCESS_KEY_ID");
  const secretAccessKey = env("R2_SECRET_ACCESS_KEY");
  const bucket = env("R2_BUCKET");
  const missing = [
    ["R2_ACCOUNT_ID", account],
    ["R2_ACCESS_KEY_ID", accessKeyId],
    ["R2_SECRET_ACCESS_KEY", secretAccessKey],
    ["R2_BUCKET", bucket],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name as string);
  if (missing.length || !account || !accessKeyId || !secretAccessKey || !bucket) return { ok: false, missing };
  return { ok: true, config: { account, bucket, creds: { accessKeyId, secretAccessKey } } };
}

function targetFor(config: R2Config, key: string): R2Target {
  return { host: `${config.account}.r2.cloudflarestorage.com`, path: `/${config.bucket}/${key}`, region: "auto", service: "s3" };
}

/** Cấp một cặp link: khách tải lên (PUT) và nhà nhận dạng đọc xuống (GET). Không giữ gì ở máy chủ phòng. */
export async function createR2Upload(userId: string, input: R2UploadInput): Promise<R2UploadResult> {
  await requireOpenAccount(userId);
  await requireServiceOpen("normal");
  await takeRate(`r2-upload:${userId}`, 20, 60);
  const loaded = r2Config();
  if (!loaded.ok) throw new Error("Chủ chưa cấu hình kho tạm R2 cho máy chủ.");
  const problem = r2UploadProblem(input);
  if (problem) throw new Error(problem);
  const ext = r2ExtFor(input.contentType) as string;
  const random = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const key = r2ObjectKey(userId, random, ext);
  const target = targetFor(loaded.config, key);
  const [putUrl, getUrl] = await Promise.all([
    presignUrl({ method: "PUT", target, creds: loaded.config.creds, expiresSeconds: R2_PUT_SECONDS }),
    presignUrl({ method: "GET", target, creds: loaded.config.creds, expiresSeconds: R2_GET_SECONDS }),
  ]);
  return { key, putUrl, getUrl, contentType: input.contentType.split(";")[0].trim().toLowerCase(), putSeconds: R2_PUT_SECONDS };
}

/** Xóa tệp tạm sau khi nhận dạng xong. Chỉ xóa được tệp của chính khách. Lỗi xóa không làm hỏng lần chạy. */
export async function removeR2Object(userId: string, key: string): Promise<{ removed: boolean }> {
  await requireOpenAccount(userId);
  if (!r2KeyOwnedBy(key, userId)) throw new Error("Không phải tệp của bạn.");
  const loaded = r2Config();
  if (!loaded.ok) return { removed: false };
  const url = await presignUrl({ method: "DELETE", target: targetFor(loaded.config, key), creds: loaded.config.creds, expiresSeconds: 60 });
  try {
    const response = await fetch(url, { method: "DELETE", signal: AbortSignal.timeout(15_000) });
    return { removed: response.ok || response.status === 404 };
  } catch {
    return { removed: false };
  }
}

/** Cho giao diện biết R2 đã cấu hình chưa (chỉ có/không, không lộ giá trị). */
export function r2Ready(): boolean {
  return r2Config().ok;
}

async function requireOwnerUser(userId: string): Promise<void> {
  const { isOwnerId } = await import("@/lib/admin-allow.server");
  const { getSql } = await import("@/lib/db");
  if (!(await isOwnerId(await getSql(), userId))) throw new Error("Chỉ Chủ xem được cấu hình kho tạm.");
}

export type R2AdminStatus = { ready: boolean; missing: string[] };

/** Chỉ Chủ: cấu hình đã đủ chưa và còn thiếu biến nào (chỉ tên biến, không bao giờ trả giá trị). */
export async function r2AdminStatus(userId: string): Promise<R2AdminStatus> {
  await requireOwnerUser(userId);
  const loaded = r2Config();
  return loaded.ok ? { ready: true, missing: [] } : { ready: false, missing: loaded.missing };
}

export type R2CheckResult = { ok: boolean; message: string };

/** Chỉ Chủ: thử ghi, đọc, xóa một tệp nhỏ bằng chính link ký. Không kiểm được CORS (đó là việc của trình duyệt khách). */
export async function checkR2Connection(userId: string): Promise<R2CheckResult> {
  await requireOwnerUser(userId);
  await takeRate(`r2-check:${userId}`, 6, 60);
  const loaded = r2Config();
  if (!loaded.ok) return { ok: false, message: `Còn thiếu biến môi trường: ${loaded.missing.join(", ")}.` };
  const random = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const key = `_check/${random}.txt`;
  const target = targetFor(loaded.config, key);
  const creds = loaded.config.creds;
  const call = async (method: "PUT" | "GET" | "DELETE", body?: string) => {
    const url = await presignUrl({ method, target, creds, expiresSeconds: 120 });
    return fetch(url, { method, ...(body ? { body } : {}), signal: AbortSignal.timeout(15_000) });
  };
  try {
    const put = await call("PUT", "tyzo-r2-check");
    if (!put.ok) return { ok: false, message: put.status === 403 ? "R2 từ chối ghi (403): kiểm Access Key, Secret, tên bucket và quyền Object Read & Write." : `Ghi thử lỗi ${put.status}.` };
    const get = await call("GET");
    const text = get.ok ? await get.text() : "";
    await call("DELETE").catch(() => null);
    if (!get.ok || text !== "tyzo-r2-check") return { ok: false, message: `Đọc lại thử lỗi ${get.status}.` };
    return { ok: true, message: "Ghi, đọc và xóa thử đều thành công. CORS chưa kiểm được từ đây: thử tải một tệp thật ở trang khách." };
  } catch {
    return { ok: false, message: "Không kết nối được R2 (kiểm R2_ACCOUNT_ID)." };
  }
}
