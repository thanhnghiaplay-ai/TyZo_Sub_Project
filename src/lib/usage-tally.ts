/**
 * Đếm ẩn danh (đợt 4 sắp lại trang khách, v5.25.0). Chỉ import tương đối để test chạy được bằng node.
 * Bảng usage_tally chỉ giữ (ngày, chủ đề, lựa chọn, số lần): không lưu tài khoản, email, mã máy hay địa chỉ mạng.
 * Khối «Khách dùng thế nào» ở Tổng quan ghép số này với số tài khoản đang có gói hay Token (đọc từ dữ liệu đã có).
 */
import type { Sql } from "./db.ts";
import { USE_CHOICES } from "./first-ask.ts";

const TALLY_TOPICS = {
  /** Câu hỏi lần đầu: dùng để làm gì (kể cả Bỏ qua). */
  use: [...USE_CHOICES.map((choice) => choice.id), "skip"] as string[],
  /** Cách trả khách chọn và nhớ (key = Thuê phòng, turn = Trả theo lượt). */
  pay: ["key", "turn"] as string[],
} as const;

type TallyTopic = keyof typeof TALLY_TOPICS;
type TallyInput = { topic: TallyTopic; answer: string };

/** Mỗi ô (ngày, chủ đề, lựa chọn) không vượt trần này: một người bấm liên tục cũng không làm số lệch quá mức. */
export const TALLY_DAY_CAP = 5000;

/** Chỉ nhận đúng chủ đề và lựa chọn đã khai; còn lại trả null (không ghi). */
export function parseTally(value: unknown): TallyInput | null {
  if (!value || typeof value !== "object") return null;
  const { topic, answer } = value as { topic?: unknown; answer?: unknown };
  if (topic !== "use" && topic !== "pay") return null;
  if (typeof answer !== "string" || !TALLY_TOPICS[topic].includes(answer)) return null;
  return { topic, answer };
}

const TODAY = `(now() at time zone 'Asia/Ho_Chi_Minh')::date`;

export async function tallyWith(sql: Sql, input: TallyInput): Promise<void> {
  await sql.query(
    `insert into usage_tally (day, topic, answer, n) values (${TODAY}, $1, $2, 1)
     on conflict (day, topic, answer) do update set n = least(usage_tally.n + 1, ${TALLY_DAY_CAP})`,
    [input.topic, input.answer],
  );
}

export type UsageMix = {
  /** Từ dữ liệu đã có, tính tại lúc xem: tài khoản đang có gói thuê phòng còn hạn, đang có Token dịch còn hạn. */
  accounts: { rent: number; tokens: number; both: number; none: number; total: number };
  /** Số đếm ẩn danh trong khoảng ngày đang xem. */
  tally: { topic: TallyTopic; answer: string; n: number }[];
};

export async function usageMixWith(sql: Sql, range: number): Promise<UsageMix> {
  const days = Math.max(1, Math.min(90, Math.floor(range)));
  const rows = await sql.query<{ rent: number; tokens: number; both: number; total: number }>(`
    with a as (
      select r.user_id,
        (r.plan is not null and r.plan_until > now()) as rent,
        exists (select 1 from token_grants g where g.user_id = r.user_id and g.expires_at > now() and g.left_tokens > 0) as tokens
      from room_accounts r
    )
    select count(*) filter (where rent)::int as rent, count(*) filter (where tokens)::int as tokens,
      count(*) filter (where rent and tokens)::int as both, count(*)::int as total
    from a
  `);
  const row = rows[0];
  const rent = Number(row?.rent ?? 0);
  const tokens = Number(row?.tokens ?? 0);
  const both = Number(row?.both ?? 0);
  const total = Number(row?.total ?? 0);
  const tally = await sql.query<{ topic: TallyTopic; answer: string; n: number }>(
    `select topic, answer, sum(n)::int as n from usage_tally
     where day > ${TODAY} - $1::int group by topic, answer order by topic, n desc`,
    [days],
  );
  return {
    accounts: { rent, tokens, both, none: Math.max(0, total - rent - tokens + both), total },
    tally: tally.map((item) => ({ topic: item.topic, answer: item.answer, n: Number(item.n) })),
  };
}
