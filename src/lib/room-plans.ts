export const TRIAL_AMOUNTS = [9_000, 39_000, 99_000] as const;

export const ROOM_PLANS = [
  { id: "ngay", name: "24 giờ", price: 9_000, hours: 24, strike: null as number | null, save: null as number | null },
  { id: "tuan", name: "7 ngày", price: 39_000, hours: 24 * 7, strike: 63_000, save: 24_000 },
  { id: "thang", name: "30 ngày", price: 99_000, hours: 24 * 30, strike: 270_000, save: 171_000 },
] as const;

export type RoomPlanId = (typeof ROOM_PLANS)[number]["id"];

export function roomPlan(id: string) {
  return ROOM_PLANS.find((plan) => plan.id === id) ?? null;
}

export function isTrialAmount(amount: number) {
  return (TRIAL_AMOUNTS as readonly number[]).includes(amount);
}

export const TRIAL_FILES = 1;
export const TRIAL_MINUTES = 10;
export const TRIAL_BYTES = 100 * 1024 * 1024;

export function roomAccess(
  input: { plan: string | null; planUntil: string | null; trialLeft: number },
  now = Date.now(),
) {
  const until = input.planUntil ? new Date(input.planUntil) : null;
  const paid = Boolean(input.plan && until && !Number.isNaN(until.getTime()) && until.getTime() > now);
  if (paid) {
    const name = roomPlan(input.plan!)?.name ?? input.plan;
    return {
      kind: "paid" as const,
      text: `Gói ${name} còn đến ${until!.toLocaleString("vi-VN")}. Trong hạn không giới hạn số tệp, được xuất file Vietsub.`,
    };
  }
  if (input.plan && until && !Number.isNaN(until.getTime()) && until.getTime() <= now) {
    return { kind: "locked" as const, text: "Gói đã hết hạn. Hãy mua gói mới để tải và dịch tiếp." };
  }
  if (input.trialLeft > 0) {
    return {
      kind: "trial" as const,
      text: `Dùng thử: còn ${input.trialLeft} tệp, tối đa ${TRIAL_MINUTES} phút. Không xuất file Vietsub.`,
    };
  }
  return { kind: "locked" as const, text: "Hết lượt dùng thử. Hãy mua gói để tải và dịch tiếp." };
}

export function payTurnNotice(
  input: { plan: string | null; planUntil: string | null; trialLeft: number },
  now = Date.now(),
) {
  const access = roomAccess(input, now);
  const until = input.planUntil ? new Date(input.planUntil) : null;
  const expired = Boolean(input.plan && until && !Number.isNaN(until.getTime()) && until.getTime() <= now);
  if (access.kind === "paid") return "Đang chọn trả theo lượt. Lần chạy dùng key của phòng. Hạn gói thuê không bị trừ.";
  if (expired) return "Gói thuê đã hết hạn. Cửa trả theo lượt vẫn mở: lần chạy dùng key của phòng, không tính theo hạn gói.";
  if (access.kind === "trial") return "Bản dùng thử không dùng cửa trả theo lượt. Hãy chọn key của bạn, hoặc mua gói thuê phòng.";
  return "Chưa có hạn dùng. Cửa trả theo lượt chưa mở cho tài khoản này.";
}

export function exportNotice(
  input: { plan: string | null; planUntil: string | null; trialLeft: number },
  now = Date.now(),
) {
  const access = roomAccess(input, now);
  if (access.kind === "paid") return null;
  const until = input.planUntil ? new Date(input.planUntil) : null;
  if (input.plan && until && !Number.isNaN(until.getTime()) && until.getTime() <= now) {
    return "Gói đã hết hạn. Không xuất được file Vietsub.";
  }
  if (access.kind === "trial") return "Tài khoản dùng thử không xuất được file Vietsub.";
  return "Tài khoản không còn hạn. Không xuất được file Vietsub.";
}

export function trialFileProblem(seconds: number, bytes: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "Không đọc được thời lượng tệp.";
  if (seconds > TRIAL_MINUTES * 60) return `Tệp dài hơn ${TRIAL_MINUTES} phút. Bản dùng thử không nhận tệp này.`;
  if (bytes > TRIAL_BYTES) return "Tệp nặng hơn 100 MB. Bản dùng thử không nhận tệp này.";
  return null;
}
