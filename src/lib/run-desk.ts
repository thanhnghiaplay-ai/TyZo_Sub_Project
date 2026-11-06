export type RunDesk = {
  turbo: number;
  large: number;
  open: boolean;
  note: string;
  cap: number;
};

export const RUN_CLOSED_NOTE = "Cửa trả theo lượt đang tạm ngưng để hoàn thiện. Bạn vẫn dùng key Groq của mình.";

export const RUN_DESK_DEFAULT: RunDesk = {
  turbo: 0,
  large: 0,
  open: false,
  note: RUN_CLOSED_NOTE,
  cap: 0,
};

const STATUSES = ["dang-giu", "da-tru", "da-nha", "dung-tien", "loi", "da-hoan"] as const;
export type RunStatus = (typeof STATUSES)[number];

export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  "dang-giu": "Đang giữ",
  "da-tru": "Đã trừ",
  "da-nha": "Đã nhả",
  "dung-tien": "Dừng vì hết tiền",
  loi: "Lỗi nhận dạng",
  "da-hoan": "Đã hoàn vào ví",
};

function money(value: unknown) {
  const amount = Math.round(Number(value));
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) throw new Error("Số tiền không đúng.");
  return amount;
}

export function parseRunDesk(raw: string | null | undefined): RunDesk {
  if (!raw) return { ...RUN_DESK_DEFAULT };
  try {
    const data = JSON.parse(raw) as Partial<RunDesk>;
    const note = (typeof data.note === "string" ? data.note : RUN_DESK_DEFAULT.note).replace(
      "Cửa trả theo lượt chưa mở.",
      RUN_CLOSED_NOTE,
    );
    return checkRunDesk({
      turbo: data.turbo ?? 0,
      large: data.large ?? 0,
      open: Boolean(data.open),
      note,
      cap: data.cap ?? 0,
    });
  } catch {
    return { ...RUN_DESK_DEFAULT };
  }
}

export function checkRunDesk(input: RunDesk): RunDesk {
  const note = input.note.trim().slice(0, 180) || RUN_DESK_DEFAULT.note;
  const next = {
    turbo: money(input.turbo),
    large: money(input.large),
    open: Boolean(input.open),
    note,
    cap: money(input.cap),
  };
  return next;
}

export function dayStartIso(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${day}T00:00:00+07:00`).toISOString();
}
