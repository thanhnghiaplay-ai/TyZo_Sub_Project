export type PriceOverride = { hour: number; inn: number; out: number };

export type RunDesk = {
  maintenance: boolean;
  note: string;
  cap: number;
  markup: number;
  custom: Record<string, PriceOverride>;
};

export const RUN_DESK_DEFAULT: RunDesk = {
  maintenance: false,
  note: "",
  cap: 0,
  markup: 0,
  custom: {},
};

const OLD_CLOSED = new Set([
  "Cửa trả theo lượt chưa mở.",
  "Cửa trả theo lượt đang tạm ngưng để hoàn thiện. Bạn vẫn dùng key Groq của mình.",
]);

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

function percent(value: unknown) {
  const amount = Math.round(Number(value));
  if (!Number.isFinite(amount) || amount < 0 || amount > 500) throw new Error("Phần trăm tăng không đúng.");
  return amount;
}

export function emptyOverride(): PriceOverride {
  return { hour: 0, inn: 0, out: 0 };
}

function overrideOf(value: unknown): PriceOverride {
  const row = value && typeof value === "object" ? (value as Partial<PriceOverride>) : {};
  return { hour: money(row.hour ?? 0), inn: money(row.inn ?? 0), out: money(row.out ?? 0) };
}

export function quoteVnd(base: number | null, markup: number, custom: number) {
  const floor = base != null && base > 0 ? Math.round(base) : 0;
  if (custom > 0) return Math.max(Math.round(custom), floor);
  if (!(floor > 0) || base == null) return 0;
  return Math.round(base * (1 + markup / 100));
}

function dongLabel(amount: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(amount))} đ`;
}

export function formatRoomPrice(
  row: { usdPerHour: number | null; usdPerMillionChars: number | null; usdIn: number | null; usdOut: number | null },
  rate: number,
  markup: number,
  custom?: PriceOverride,
): string {
  const over = custom ?? emptyOverride();
  if (row.usdPerHour != null || over.hour > 0) {
    const amount = quoteVnd(row.usdPerHour == null ? null : row.usdPerHour * rate, markup, over.hour);
    return amount ? `${dongLabel(amount)}/giờ` : "Chưa niêm yết";
  }
  if (row.usdPerMillionChars != null && !(over.inn || over.out)) {
    const amount = quoteVnd(row.usdPerMillionChars * rate, markup, 0);
    return amount ? `${dongLabel(amount)} mỗi triệu ký tự` : "Chưa niêm yết";
  }
  const inn = quoteVnd(row.usdIn == null ? null : row.usdIn * rate, markup, over.inn);
  const out = quoteVnd(row.usdOut == null ? null : row.usdOut * rate, markup, over.out);
  if (!inn && !out) return "Chưa niêm yết";
  return `${inn ? dongLabel(inn) : "—"} vào / ${out ? dongLabel(out) : "—"} ra mỗi triệu token`;
}

export function parseRunDesk(raw: string | null | undefined): RunDesk {
  if (!raw) return { ...RUN_DESK_DEFAULT, custom: {} };
  try {
    const data = JSON.parse(raw) as Partial<RunDesk> & { open?: boolean; turbo?: number; large?: number };
    const note = typeof data.note === "string" ? data.note : "";
    const canned = OLD_CLOSED.has(note.trim());
    const maintenance = data.maintenance == null ? data.open === false && Boolean(note.trim()) && !canned : Boolean(data.maintenance);
    const custom: Record<string, PriceOverride> = {};
    if (data.custom && typeof data.custom === "object") {
      for (const [id, value] of Object.entries(data.custom)) custom[id] = overrideOf(value);
    }
    if (!custom["whisper-large-v3-turbo"] && Number(data.turbo) > 0) {
      custom["whisper-large-v3-turbo"] = { hour: money(Number(data.turbo) * 60), inn: 0, out: 0 };
    }
    if (!custom["whisper-large-v3"] && Number(data.large) > 0) {
      custom["whisper-large-v3"] = { hour: money(Number(data.large) * 60), inn: 0, out: 0 };
    }
    return checkRunDesk({
      maintenance,
      note: canned ? "" : note,
      cap: data.cap ?? 0,
      markup: data.markup ?? 0,
      custom,
    });
  } catch {
    return { ...RUN_DESK_DEFAULT, custom: {} };
  }
}

export function checkRunDesk(input: RunDesk): RunDesk {
  const note = input.note.trim().slice(0, 180);
  if (input.maintenance && note.length < 8) throw new Error("Hãy nhập nội dung bảo trì.");
  const custom: Record<string, PriceOverride> = {};
  for (const [id, value] of Object.entries(input.custom || {})) {
    if (!/^[a-z0-9./_-]{2,80}$/i.test(id)) continue;
    const row = overrideOf(value);
    if (row.hour || row.inn || row.out) custom[id] = row;
  }
  return {
    maintenance: Boolean(input.maintenance),
    note: input.maintenance ? note : note,
    cap: money(input.cap),
    markup: percent(input.markup),
    custom,
  };
}

export function parseModelList(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return null;
    return data.filter((id): id is string => typeof id === "string" && /^[a-z0-9./_-]{2,80}$/i.test(id)).slice(0, 400);
  } catch {
    return null;
  }
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
