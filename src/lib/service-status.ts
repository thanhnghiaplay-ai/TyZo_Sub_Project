/**
 * Trạng thái hai nhóm dịch: «Dịch trực tiếp» và «Dịch bình thường» (tải tệp rồi dịch), cộng thêm «Toàn web».
 * Mỗi mục có Hoạt động hoặc Bảo trì, Chủ đặt ở Admin → Cấu hình. Hàm thuần, không đụng tới DB.
 *
 * Bảo trì chặn lượt chạy MỚI. Lượt đang chạy (đã giữ tiền) được chạy nốt để khách không mất tiền oan.
 * Bảo trì «Toàn web» che mọi trang của khách, trừ Admin và Đăng nhập (xem `siteOpenPath`), và chặn luôn lượt mới của cả hai nhóm.
 */

export const SERVICE_GROUPS = ["live", "normal"] as const;
export type ServiceGroup = (typeof SERVICE_GROUPS)[number];
export type ServiceState = "active" | "maintenance";

export const SERVICE_LABEL: Record<ServiceGroup, string> = {
  live: "Dịch trực tiếp",
  normal: "Dịch bình thường",
};

/** Mục thứ ba, không phải nhóm dịch: cả web. */
export const SITE_LABEL = "Toàn web";

export const SERVICE_STATE_LABEL: Record<ServiceState, string> = {
  active: "Hoạt động",
  maintenance: "Bảo trì",
};

/** Khóa trong `room_settings`. */
export const SERVICE_KEY = "service_status";

export const SERVICE_NOTE_MAX = 200;

/** Mốc dự kiến mở lại không được xa quá một năm, để gõ nhầm năm thì bị chặn. */
const UNTIL_MAX_AHEAD_MS = 366 * 24 * 60 * 60 * 1000;

export type ServiceEntry = {
  state: ServiceState;
  /** Lời nhắn khách thấy khi bảo trì. Trống thì dùng câu mặc định. */
  note: string;
  /** Giờ dự kiến mở lại (mili giây). Chỉ để báo khách, không tự mở. null = chưa hẹn. */
  until: number | null;
};

export type ServiceScope = ServiceGroup | "site";
export const SERVICE_SCOPES: readonly ServiceScope[] = ["site", ...SERVICE_GROUPS];

export type ServiceStatus = Record<ServiceGroup, ServiceEntry> & { site: ServiceEntry };

export function scopeLabel(scope: ServiceScope): string {
  return scope === "site" ? SITE_LABEL : SERVICE_LABEL[scope];
}

export const SERVICE_ENTRY_DEFAULT: ServiceEntry = { state: "active", note: "", until: null };

export function defaultServiceStatus(): ServiceStatus {
  return { live: { ...SERVICE_ENTRY_DEFAULT }, normal: { ...SERVICE_ENTRY_DEFAULT }, site: { ...SERVICE_ENTRY_DEFAULT } };
}

function oneLine(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, SERVICE_NOTE_MAX) : "";
}

function untilOf(value: unknown): number | null {
  const ms = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms) : null;
}

function entryOf(value: unknown): ServiceEntry {
  const row = value && typeof value === "object" ? (value as Partial<ServiceEntry>) : {};
  const state: ServiceState = row.state === "maintenance" ? "maintenance" : "active";
  return { state, note: oneLine(row.note), until: state === "maintenance" ? untilOf(row.until) : null };
}

/** Đọc từ DB. Không bao giờ ném lỗi: hỏng hay thiếu thì coi là Hoạt động, để một dòng cài đặt hỏng không khóa cả web. */
export function parseServiceStatus(raw: string | null | undefined): ServiceStatus {
  if (!raw) return defaultServiceStatus();
  try {
    const data = JSON.parse(raw) as Partial<Record<ServiceScope, unknown>> | null;
    if (!data || typeof data !== "object") return defaultServiceStatus();
    // Bản lưu từ v3.44 chưa có `site`: thiếu thì Hoạt động, không khóa nhầm cả web.
    return { live: entryOf(data.live), normal: entryOf(data.normal), site: entryOf(data.site) };
  } catch {
    return defaultServiceStatus();
  }
}

/** Kiểm đầu vào của Chủ trước khi lưu. Sai thì ném câu tiếng Việt. */
export function cleanServiceStatus(input: unknown, now: number = Date.now()): ServiceStatus {
  if (!input || typeof input !== "object") throw new Error("Trạng thái không đúng.");
  const data = input as Partial<Record<ServiceScope, unknown>>;
  const out = defaultServiceStatus();
  for (const scope of SERVICE_SCOPES) {
    const name = scopeLabel(scope);
    const row = data[scope];
    if (!row || typeof row !== "object") throw new Error(`Thiếu trạng thái của ${name}.`);
    const raw = row as Partial<ServiceEntry>;
    if (raw.state !== "active" && raw.state !== "maintenance") throw new Error(`Trạng thái của ${name} không đúng.`);
    if (typeof raw.note === "string" && raw.note.trim().length > SERVICE_NOTE_MAX) {
      throw new Error(`Lời nhắn của ${name} dài quá ${SERVICE_NOTE_MAX} ký tự.`);
    }
    const entry = entryOf(raw);
    if (entry.state === "maintenance" && raw.until != null) {
      const until = untilOf(raw.until);
      if (until == null) throw new Error(`Giờ dự kiến mở lại của ${name} không đúng.`);
      if (until <= now) throw new Error(`Giờ dự kiến mở lại của ${name} phải ở tương lai.`);
      if (until > now + UNTIL_MAX_AHEAD_MS) throw new Error(`Giờ dự kiến mở lại của ${name} xa quá một năm.`);
    }
    out[scope] = entry;
  }
  return out;
}

export function inMaintenance(status: ServiceStatus, group: ServiceGroup): boolean {
  return status[group].state === "maintenance";
}

/** Nhãn ngắn cho menu trái: chỉ hiện khi đang bảo trì, hoạt động thì để trống cho gọn. */
export function railBadge(status: ServiceStatus, group: ServiceGroup): string | undefined {
  return status[group].state === "maintenance" ? SERVICE_STATE_LABEL.maintenance : undefined;
}

function vnParts(ms: number) {
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { hour: get("hour"), minute: get("minute"), day: get("day"), month: get("month"), year: get("year") };
}

/** «20:30 15/11/2026» theo giờ Việt Nam, không phụ thuộc múi giờ máy. */
export function untilLabel(until: number): string {
  const p = vnParts(until);
  return `${p.hour}:${p.minute} ${p.day}/${p.month}/${p.year}`;
}

/** Giá trị cho ô chọn ngày giờ (datetime-local), theo giờ Việt Nam. Trống nếu chưa hẹn. */
export function untilToInput(until: number | null): string {
  if (!until) return "";
  const p = vnParts(until);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Ngược lại: đọc ô datetime-local như giờ Việt Nam (UTC+7), không theo múi giờ của máy Chủ đang dùng. Sai dạng thì null. */
export function inputToUntil(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]) - 7, Number(m[5]));
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Câu khách đọc khi nhóm đang bảo trì. Trống = nhóm đang hoạt động.
 * Mốc dự kiến đã qua thì không nhắc nữa (bảo trì kéo dài hơn dự kiến), tránh hẹn một giờ đã trôi.
 */
function blockText(entry: ServiceEntry, name: string, now: number): string {
  if (entry.state !== "maintenance") return "";
  const head = entry.note || `${name} đang bảo trì.`;
  const tail = entry.until && entry.until > now ? ` Dự kiến mở lại lúc ${untilLabel(entry.until)}.` : "";
  return `${head}${tail}`;
}

/** Câu khách đọc khi cả web đang bảo trì. Trống = web đang hoạt động. */
export function siteBlock(status: ServiceStatus, now: number = Date.now()): string {
  return blockText(status.site, SITE_LABEL, now);
}

/** Bảo trì cả web thắng bảo trì từng nhóm: khách chỉ cần đọc một câu, và lượt mới của cả hai nhóm đều bị chặn. */
export function serviceBlock(status: ServiceStatus, group: ServiceGroup, now: number = Date.now()): string {
  return siteBlock(status, now) || blockText(status[group], SERVICE_LABEL[group], now);
}

/**
 * Khi cả web bảo trì, khách chỉ còn thấy trang bảo trì. Hai chỗ vẫn mở để Chủ và nhân viên vào làm việc và đăng nhập:
 * `/admin` và `/login` (kể cả đường con và tham số). Không dùng `startsWith("/admin")` trần vì sẽ mở nhầm `/administrator`.
 */
export function siteOpenPath(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return ["/admin", "/login"].some((open) => path === open || path.startsWith(open + "/"));
}

/** Ghi chú nhật ký thao tác: nói rõ nhóm nào đổi từ gì sang gì. Không chứa bí mật. */
export function describeServiceChange(before: ServiceStatus, after: ServiceStatus): string {
  const parts: string[] = [];
  for (const group of SERVICE_SCOPES) {
    const was = before[group];
    const now = after[group];
    const name = scopeLabel(group);
    if (was.state !== now.state) {
      parts.push(now.state === "maintenance" ? `${name}: ĐƯA VÀO BẢO TRÌ${now.note ? ` (${now.note})` : ""}` : `${name}: MỞ LẠI, hoạt động`);
    } else if (now.state === "maintenance" && (was.note !== now.note || was.until !== now.until)) {
      parts.push(`${name}: sửa lời nhắn hoặc giờ dự kiến bảo trì${now.note ? ` (${now.note})` : ""}`);
    }
  }
  return parts.join("; ") || "Lưu lại, không có gì đổi";
}
