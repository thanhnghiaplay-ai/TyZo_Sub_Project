import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { AppDeviceRow } from "@/lib/app-link.server";

export type { AppDeviceRow };
export type AppLinkView = { devices: AppDeviceRow[]; apkUrl: string };

/** Trang Tài khoản: máy Android đang liên kết và nơi tải tệp cài. */
export const getAppLinks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AppLinkView> => {
    const { listDevices } = await import("@/lib/app-link.server");
    const { env } = await import("@/lib/env.server");
    return { devices: await listDevices(context.userId), apkUrl: apkUrlFrom(env("ANDROID_APK_URL")) };
  });

/** Lấy mã liên kết mới (10 phút, dùng một lần). */
export const makeAppLinkCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { requireOpenAccount, takeRate } = await import("@/lib/guard.server");
    await requireOpenAccount(context.userId);
    await takeRate(`app-code:${context.userId}`, 10, 600);
    const { createLinkCode } = await import("@/lib/app-link.server");
    return createLinkCode(context.userId);
  });

export const removeAppDevice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: string) => {
    const id = String(input ?? "");
    if (!/^[a-f0-9]{16}$/.test(id)) throw new Error("Máy không đúng.");
    return id;
  })
  .handler(async ({ context, data }) => {
    const { revokeDevice } = await import("@/lib/app-link.server");
    return { ok: await revokeDevice(context.userId, data) };
  });

/** Chỉ nhận địa chỉ https. Rỗng khi chưa đặt. */
function apkUrlFrom(raw: string | undefined): string {
  if (!raw) return "";
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}
