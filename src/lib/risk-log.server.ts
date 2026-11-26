import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { trustedClientIp } from "./request-ip.server.ts";

/**
 * Ghi dữ kiện dùng làm bằng chứng khi phát hiện vi phạm (xem risk-rules.ts). Không bao giờ làm hỏng việc chính:
 * mọi lỗi ở đây bị nuốt. Giữ 180 ngày (dọn ở risk.server.ts).
 */
function requestMeta(): { ip: string; ua: string } {
  const request = getRequest();
  const ip = trustedClientIp(request);
  const ua = (request?.headers.get("user-agent") ?? "").slice(0, 300);
  return { ip, ua };
}

function cleanDevice(raw: unknown): string {
  return typeof raw === "string" && /^[a-z0-9]{16,64}$/.test(raw) ? raw : "";
}

/** Ghi một việc của tài khoản. dedupeMinutes: bỏ qua nếu đã có cùng việc, cùng mạng, cùng máy trong khoảng này. */
export async function noteEvent(userId: string, kind: string, opts: { device?: string; ref?: string; dedupeMinutes?: number } = {}) {
  try {
    if (!userId) return;
    const { ip, ua } = requestMeta();
    const device = cleanDevice(opts.device);
    const ref = (opts.ref ?? "").slice(0, 80);
    const sql = await getSql();
    if (opts.dedupeMinutes) {
      const since = new Date(Date.now() - opts.dedupeMinutes * 60_000).toISOString();
      const seen = await sql<{ id: number }>`
        select id from account_events
        where user_id = ${userId} and kind = ${kind} and ip = ${ip} and device = ${device} and at > ${since}::timestamptz
        limit 1
      `;
      if (seen.length) return;
    }
    await sql`insert into account_events (user_id, kind, ip, ua, device, ref) values (${userId}, ${kind}, ${ip}, ${ua}, ${device}, ${ref})`;
    checkSoon(userId);
  } catch {
    /* không chặn việc chính */
  }
}

/** Máy ứng dụng Android vừa gọi lên: ghi địa chỉ mạng của lần gọi. */
export async function noteAppIp(deviceId: string, userId: string) {
  try {
    const { ip } = requestMeta();
    if (!ip) return;
    const sql = await getSql();
    await sql`
      insert into app_device_ips (device_id, ip) values (${deviceId}, ${ip})
      on conflict (device_id, ip) do update set last_at = now(), uses = app_device_ips.uses + 1
    `;
    checkSoon(userId);
  } catch {
    /* không chặn */
  }
}

const lastCheck = new Map<string, number>();

/** Kiểm luật cho một tài khoản, chạy nền, mỗi tài khoản tối đa 10 phút một lần trên mỗi máy chủ. */
export function checkSoon(userId: string) {
  const now = Date.now();
  if (now - (lastCheck.get(userId) ?? 0) < 10 * 60_000) return;
  lastCheck.set(userId, now);
  if (lastCheck.size > 5000) lastCheck.clear();
  void import("@/lib/risk.server")
    .then(async (m) => m.checkUser(await getSql(), userId))
    .catch(() => {});
}
