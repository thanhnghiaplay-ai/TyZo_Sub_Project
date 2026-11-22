import { apkUrlFrom, ANDROID_INFO_LATEST, parseReleaseInfo, pickRelease, type AndroidRelease } from "@/lib/app-link";

/**
 * Bản ứng dụng Android mới nhất. Đọc tyzo-sub.json của bản phát hành trên GitHub (không qua API nên không bị giới hạn lượt),
 * giữ trong bộ nhớ 15 phút. GitHub lỗi thì dùng kết quả cũ, chưa có thì coi như chưa phát hành.
 */
let cache: { at: number; value: { code: number; name: string } | null } | null = null;
const TTL_MS = 15 * 60 * 1000;

async function readReleased(): Promise<{ code: number; name: string } | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const response = await fetch(ANDROID_INFO_LATEST, { redirect: "follow", signal: AbortSignal.timeout(5000) });
    const value = response.ok ? parseReleaseInfo(await response.json()) : null;
    cache = { at: Date.now(), value };
    return value;
  } catch {
    // Lỗi mạng: giữ kết quả cũ thêm một lúc, khỏi gọi lại liên tục.
    cache = { at: Date.now() - TTL_MS + 60_000, value: cache?.value ?? null };
    return cache.value;
  }
}

export async function androidRelease(): Promise<AndroidRelease> {
  const { env } = await import("@/lib/env.server");
  const envUrl = apkUrlFrom(env("ANDROID_APK_URL"));
  return pickRelease(envUrl, envUrl ? null : await readReleased());
}
