import type { Sql } from "./db.ts";
import { parseModelList, parseRunDesk } from "./run-desk.ts";

export type OverviewRange = 1 | 7 | 30;

export function parseRange(value: unknown): OverviewRange {
  return value === 7 || value === 30 ? value : 1;
}

export type TopUser = { userId: string; email: string; amount: number; runs: number };

export type OverviewAlert = {
  id: string;
  level: "red" | "yellow";
  text: string;
  /** Tab Admin để nhảy tới. */
  go: "viec" | "cau-hinh" | "chat-luong" | "tien";
};

export type Overview = {
  range: OverviewRange;
  /** Tiền nạp vào ví: hôm nay, 7 ngày, tháng này. Chỉ Chủ. */
  revenue: { today: number; week: number; month: number } | null;
  runs: { total: number; errors: number; errorRate: number };
  quality: { total: number; attention: number; red: number } | null;
  orders: { waiting: number; claimed: number; oldestMinutes: number };
  alerts: OverviewAlert[];
  topSpend: TopUser[] | null;
  topErrors: TopUser[];
};

const DAY_START = `date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'`;

/** Ngưỡng cảnh báo. Chỉ để nhắc, không chặn gì. */
export const OVERVIEW_LIMITS = {
  errorRate: 0.1,
  minRunsForRate: 5,
  qualityDrop: 0.1,
  minQualityRuns: 10,
  holdHours: 6,
  orderMinutes: 30,
} as const;

/**
 * Số liệu trang Tổng quan. `owner` false thì không trả tiền, top chi tiêu và chất lượng
 * (các phần Chủ mới được xem ở trang Doanh thu và Chất lượng).
 */
export async function overviewWith(sql: Sql, range: OverviewRange, owner: boolean): Promise<Overview> {
  const since = `(${DAY_START}) - interval '${range - 1} days'`;
  const before = `(${DAY_START}) - interval '${range * 2 - 1} days'`;

  let revenue: Overview["revenue"] = null;
  if (owner) {
    const rows = await sql.query<{ today: number; week: number; month: number }>(`
      select
        coalesce(sum(amount) filter (where created_at >= ${DAY_START}), 0)::int as today,
        coalesce(sum(amount) filter (where created_at >= (${DAY_START}) - interval '6 days'), 0)::int as week,
        coalesce(sum(amount) filter (where created_at >= date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'), 0)::int as month
      from room_ledger where kind = 'nap'
    `);
    revenue = { today: Number(rows[0]?.today ?? 0), week: Number(rows[0]?.week ?? 0), month: Number(rows[0]?.month ?? 0) };
  }

  const runRows = await sql.query<{ total: number; errors: number }>(`
    select count(*)::int as total, count(*) filter (where status = 'loi')::int as errors
    from run_tickets where created_at >= ${since} and id not like 'tts-%'
  `);
  const total = Number(runRows[0]?.total ?? 0);
  const errors = Number(runRows[0]?.errors ?? 0);

  let quality: Overview["quality"] = null;
  let qualityDrop = false;
  if (owner) {
    const q = await sql.query<{ total: number; attention: number; red: number; prev_total: number; prev_attention: number }>(`
      select
        count(*) filter (where created_at >= ${since})::int as total,
        count(*) filter (where created_at >= ${since} and health in ('yellow', 'red'))::int as attention,
        count(*) filter (where created_at >= ${since} and health = 'red')::int as red,
        count(*) filter (where created_at >= ${before} and created_at < ${since})::int as prev_total,
        count(*) filter (where created_at >= ${before} and created_at < ${since} and health in ('yellow', 'red'))::int as prev_attention
      from quality_runs where created_at >= ${before}
    `);
    const row = q[0];
    quality = { total: Number(row?.total ?? 0), attention: Number(row?.attention ?? 0), red: Number(row?.red ?? 0) };
    const now = quality.total ? quality.attention / quality.total : 0;
    const prev = Number(row?.prev_total ?? 0) ? Number(row?.prev_attention ?? 0) / Number(row?.prev_total ?? 1) : 0;
    qualityDrop = quality.total >= OVERVIEW_LIMITS.minQualityRuns && Number(row?.prev_total ?? 0) >= OVERVIEW_LIMITS.minQualityRuns && now - prev >= OVERVIEW_LIMITS.qualityDrop;
  }

  const order = await sql.query<{ waiting: number; claimed: number; oldest: number }>(`
    select count(*)::int as waiting, count(*) filter (where status = 'claimed')::int as claimed,
      coalesce(extract(epoch from (now() - min(created_at))) / 60, 0)::int as oldest
    from pay_orders where status in ('pending', 'claimed')
  `);
  const orders = { waiting: Number(order[0]?.waiting ?? 0), claimed: Number(order[0]?.claimed ?? 0), oldestMinutes: Number(order[0]?.oldest ?? 0) };

  const settings = await sql.query<{ key: string; value: string }>(`select key, value from room_settings where key in ('run_desk', 'run_key', 'run_models')`);
  const setting = (key: string) => settings.find((row) => row.key === key)?.value ?? "";
  const desk = parseRunDesk(setting("run_desk"));

  const stuck = await sql.query<{ n: number }>(`
    select count(*)::int as n from run_tickets
    where status = 'dang-giu' and created_at < now() - interval '${OVERVIEW_LIMITS.holdHours} hours'
  `);

  const alerts: OverviewAlert[] = [];
  if (desk.maintenance) alerts.push({ id: "bao-tri", level: "yellow", text: "Cửa trả theo lượt đang bảo trì. Khách không chạy được.", go: "viec" });
  if (owner && !setting("run_key").trim()) alerts.push({ id: "chua-key", level: "yellow", text: "Phòng chưa lưu key Groq. Khách trả theo lượt chưa chạy được.", go: "cau-hinh" });
  else if (owner && !parseModelList(setting("run_models"))) alerts.push({ id: "chua-dong-bo", level: "yellow", text: "Chưa đồng bộ danh sách model của key phòng.", go: "cau-hinh" });
  if (total >= OVERVIEW_LIMITS.minRunsForRate && errors / total >= OVERVIEW_LIMITS.errorRate) {
    alerts.push({ id: "loi-cao", level: "red", text: `Tỷ lệ lỗi ${Math.round((errors / total) * 100)}% (${errors}/${total} lượt).`, go: "viec" });
  }
  if (qualityDrop) alerts.push({ id: "chat-luong-giam", level: "red", text: "Tỷ lệ lần chạy chất lượng thấp đang tăng so với kỳ trước.", go: "chat-luong" });
  if (Number(stuck[0]?.n ?? 0) > 0) alerts.push({ id: "giu-lau", level: "yellow", text: `${stuck[0].n} phiếu giữ tiền quá ${OVERVIEW_LIMITS.holdHours} giờ chưa nhả.`, go: "viec" });
  if (orders.waiting > 0 && orders.oldestMinutes >= OVERVIEW_LIMITS.orderMinutes) {
    alerts.push({ id: "don-cho-lau", level: "yellow", text: `Đơn nạp chờ lâu nhất đã ${orders.oldestMinutes} phút.`, go: "viec" });
  }

  let topSpend: TopUser[] | null = null;
  if (owner) {
    topSpend = await sql.query<TopUser>(`
      select t.user_id as "userId", coalesce(u.email, '') as email, sum(t.charged - t.refunded)::int as amount, count(*)::int as runs
      from run_tickets t left join "user" u on u.id = t.user_id
      where t.created_at >= ${since}
      group by t.user_id, u.email
      having sum(t.charged - t.refunded) > 0
      order by amount desc limit 5
    `);
  }
  const topErrors = await sql.query<TopUser>(`
    select t.user_id as "userId", coalesce(u.email, '') as email, count(*)::int as amount, count(*)::int as runs
    from run_tickets t left join "user" u on u.id = t.user_id
    where t.created_at >= ${since} and t.status = 'loi'
    group by t.user_id, u.email
    order by amount desc limit 5
  `);

  return {
    range,
    revenue,
    runs: { total, errors, errorRate: total ? errors / total : 0 },
    quality,
    orders,
    alerts,
    topSpend,
    topErrors,
  };
}

export const TICKET_FILTERS = ["all", "dang-giu", "da-tru", "da-nha", "loi"] as const;
export type TicketFilter = (typeof TICKET_FILTERS)[number];

export function parseTicketFilter(value: unknown): TicketFilter {
  return TICKET_FILTERS.includes(value as TicketFilter) ? (value as TicketFilter) : "all";
}

export type TicketRow = {
  id: string;
  userId: string;
  email: string;
  fileName: string;
  seconds: number;
  rate: number;
  held: number;
  charged: number;
  released: number;
  refunded: number;
  status: string;
  createdAt: string;
  asrModel: string;
  chatModel: string;
  /** Giây từ lúc mở phiếu đến lúc xong. null nếu phiếu cũ hoặc chưa xong. */
  processSeconds: number | null;
};

/** «Đã trừ» gồm cả phiếu dừng vì hết tiền; «Đã nhả» gồm cả phiếu hoàn ví. */
const FILTER_STATUSES: Record<Exclude<TicketFilter, "all">, string[]> = {
  "dang-giu": ["dang-giu"],
  "da-tru": ["da-tru", "dung-tien"],
  "da-nha": ["da-nha", "da-hoan"],
  loi: ["loi"],
};

function likeEscape(text: string) {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Tìm phiếu theo trạng thái, email hoặc tên tệp. Phiếu đọc thuyết minh (tts-) không tính là một lượt chạy. */
export async function searchTicketsWith(sql: Sql, input: { status: TicketFilter; q: string; limit?: number }): Promise<TicketRow[]> {
  const q = input.q.trim().slice(0, 80);
  const statuses = input.status === "all" ? null : FILTER_STATUSES[input.status];
  const like = q ? `%${likeEscape(q.toLowerCase())}%` : null;
  const rows = await sql.query<{
    id: string; user_id: string; email: string | null; file_name: string; seconds: number; rate: number; held: number;
    charged: number; released: number; refunded: number; status: string; created_at: unknown; asr_model: string; chat_model: string; process_seconds: number | null;
  }>(
    `select t.id, t.user_id, u.email, t.file_name, t.seconds, t.rate, t.held, t.charged, t.released, t.refunded, t.status, t.created_at,
       t.asr_model, t.chat_model,
       case when t.closed_at is null then null else extract(epoch from (t.closed_at - t.created_at))::int end as process_seconds
     from run_tickets t left join "user" u on u.id = t.user_id
     where t.id not like 'tts-%'
       and ($1::text[] is null or t.status = any($1::text[]))
       and ($2::text is null or lower(coalesce(u.email, '')) like $2 escape '\\' or lower(t.file_name) like $2 escape '\\')
     order by t.created_at desc
     limit $3`,
    [statuses, like, Math.min(Math.max(input.limit ?? 40, 1), 100)],
  );
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    email: row.email ?? "",
    fileName: row.file_name,
    seconds: row.seconds,
    rate: row.rate,
    held: row.held,
    charged: row.charged,
    released: row.released,
    refunded: row.refunded,
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ""),
    asrModel: row.asr_model || "",
    chatModel: row.chat_model || "",
    processSeconds: row.process_seconds == null ? null : Number(row.process_seconds),
  }));
}
