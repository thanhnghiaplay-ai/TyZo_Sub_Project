import type { Sql } from "./db.ts";
import { arpu, conversionRate, costPerMinute, sortCategories } from "./money-extra.ts";

export type MoneySpan = "day" | "week" | "month" | "year";

export type MoneyExtra = {
  /** Số khách đã nạp tiền trong khoảng đang xem. */
  payers: number;
  /** Tiền nạp trung bình mỗi khách đã nạp. null nếu chưa ai nạp. */
  arpu: number | null;
  /** Khách đã dùng hết lượt thử, toàn thời gian. */
  trialUsers: number;
  /** Trong số đó, người đã từng nạp tiền hoặc mua gói. */
  converted: number;
  conversion: number | null;
  /** Tổng giây âm thanh của các lượt đã trừ tiền trong khoảng. */
  audioSeconds: number;
  /** Giá vốn ghi trên phiếu chia cho phút âm thanh. */
  costPerMinute: number | null;
  /** Giá vốn cộng chi phí ghi tay chia cho phút âm thanh. */
  allInPerMinute: number | null;
  categories: Array<{ category: string; amount: number }>;
};

export function parseSpan(value: unknown): MoneySpan {
  return value === "week" || value === "month" || value === "year" ? value : "day";
}

/** Cùng khoảng với getMoney: 14 ngày, 8 tuần, 12 tháng, 5 năm. */
const WINDOW: Record<MoneySpan, string> = { day: "14 days", week: "8 weeks", month: "12 months", year: "5 years" };

/** Số liệu mới của trang Doanh thu. Chỉ có số tổng, không đọc tên tệp hay chữ phụ đề. */
export async function moneyExtraWith(sql: Sql, span: MoneySpan): Promise<MoneyExtra> {
  const window = WINDOW[span];
  const payerRows = await sql.query<{ payers: number; amount: number }>(
    `select count(distinct user_id)::int as payers, coalesce(sum(amount), 0)::int as amount
     from room_ledger where kind = 'nap' and created_at > now() - $1::interval`,
    [window],
  );
  const trialRows = await sql.query<{ trial: number; converted: number }>(
    `select count(*)::int as trial,
       count(*) filter (where exists (select 1 from room_ledger l where l.user_id = a.user_id and l.kind in ('nap', 'goi')))::int as converted
     from room_accounts a where a.trial_left = 0`,
  );
  const runRows = await sql.query<{ seconds: number; von: number }>(
    `select coalesce(sum(seconds), 0)::int as seconds, coalesce(sum(base_cost), 0)::int as von
     from run_tickets
     where created_at > now() - $1::interval and id not like 'tts-%' and status in ('da-tru', 'dung-tien')`,
    [window],
  );
  const catRows = await sql.query<{ category: string; amount: number }>(
    `select category, coalesce(sum(amount), 0)::int as amount
     from room_costs where spent_on::timestamp > now() - $1::interval
     group by category`,
    [window],
  );
  const payers = Number(payerRows[0]?.payers ?? 0);
  const topUp = Number(payerRows[0]?.amount ?? 0);
  const trialUsers = Number(trialRows[0]?.trial ?? 0);
  const converted = Number(trialRows[0]?.converted ?? 0);
  const seconds = Number(runRows[0]?.seconds ?? 0);
  const von = Number(runRows[0]?.von ?? 0);
  const categories = sortCategories(catRows);
  const manual = categories.reduce((sum, row) => sum + row.amount, 0);
  return {
    payers,
    arpu: arpu(topUp, payers),
    trialUsers,
    converted: Math.min(converted, trialUsers),
    conversion: conversionRate(trialUsers, converted),
    audioSeconds: seconds,
    costPerMinute: costPerMinute(von, seconds),
    allInPerMinute: costPerMinute(von + manual, seconds),
    categories,
  };
}
