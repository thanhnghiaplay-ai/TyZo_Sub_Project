/**
 * Tiền phải trả từng nhà cung cấp (v5.32.0). Chỉ import tương đối để test chạy bằng node.
 * Ghi lúc gọi model thành công bằng key của phòng (trả theo lượt, dịch trực tiếp, đọc giọng, trau chuốt, phân tích).
 * Thuê phòng và dùng thử dùng key của khách nên không ở đây. Giá gốc theo bảng giá lúc gọi, không cộng chênh.
 */
import type { Sql } from "./db.ts";

const TODAY = `(now() at time zone 'Asia/Ho_Chi_Minh')::date`;

type SpendInput = { provider: string; model: string; baseVnd: number; /** Đồng mỗi USD của bảng giá lúc gọi. */ rate: number };

/** Ghi một lần gọi. Không bao giờ ném lỗi: ghi sổ hỏng không được làm hỏng lượt chạy của khách. */
export async function recordSpendWith(sql: Sql, input: SpendInput): Promise<void> {
  try {
    const base = Math.max(0, Math.round(Number(input.baseVnd) || 0));
    if (!base || !input.provider || !input.model) return;
    const usdMicro = input.rate > 0 ? Math.round((base / input.rate) * 1_000_000) : 0;
    await sql.query(
      `insert into provider_spend (day, provider, model, calls, base_vnd, usd_micro) values (${TODAY}, $1, $2, 1, $3, $4)
       on conflict (day, provider, model) do update set calls = provider_spend.calls + 1,
         base_vnd = provider_spend.base_vnd + excluded.base_vnd, usd_micro = provider_spend.usd_micro + excluded.usd_micro`,
      [input.provider.slice(0, 40), input.model.slice(0, 120), base, usdMicro],
    );
  } catch {
    /* bỏ qua */
  }
}

type SpendRow = { provider: string; model: string; calls: number; vnd: number; usd: number };

export type SpendSummary = { total: { calls: number; vnd: number; usd: number }; providers: { provider: string; calls: number; vnd: number; usd: number; models: SpendRow[] }[]; since: string | null };

/** Tổng theo nhà và model trong khoảng ngày (cùng khoảng với trang Doanh thu). */
export async function spendSummaryWith(sql: Sql, window: string): Promise<SpendSummary> {
  const rows = await sql.query<{ provider: string; model: string; calls: number; vnd: number; usd_micro: number }>(
    `select provider, model, sum(calls)::int as calls, sum(base_vnd)::bigint as vnd, sum(usd_micro)::bigint as usd_micro
     from provider_spend where day > ${TODAY} - $1::interval group by provider, model order by vnd desc`,
    [window],
  );
  const first = await sql.query<{ day: unknown }>(`select min(day) as day from provider_spend`);
  const map = new Map<string, SpendSummary["providers"][number]>();
  let calls = 0;
  let vnd = 0;
  let usd = 0;
  for (const row of rows) {
    const item: SpendRow = { provider: row.provider, model: row.model, calls: Number(row.calls), vnd: Number(row.vnd), usd: Number(row.usd_micro) / 1_000_000 };
    const house = map.get(row.provider) ?? { provider: row.provider, calls: 0, vnd: 0, usd: 0, models: [] };
    house.calls += item.calls;
    house.vnd += item.vnd;
    house.usd += item.usd;
    house.models.push(item);
    map.set(row.provider, house);
    calls += item.calls;
    vnd += item.vnd;
    usd += item.usd;
  }
  const day = first[0]?.day;
  return {
    total: { calls, vnd, usd },
    providers: [...map.values()].sort((a, b) => b.vnd - a.vnd),
    since: day == null ? null : day instanceof Date ? day.toISOString().slice(0, 10) : String(day).slice(0, 10),
  };
}

/**
 * Lời lỗ nhìn một lần: tiền vào − tiền phải trả các nhà − hoa hồng − chi phí ghi tay.
 * «Nếu khách dùng hết Token còn hạn»: trừ thêm giá gốc của số Token đã bán mà khách chưa dùng (nợ phải chạy).
 */
export function verdict(input: { revenue: number; providers: number; commission: number; manual: number; owedTokensVnd: number }) {
  const now = Math.round(input.revenue - input.providers - input.commission - input.manual);
  const worst = Math.round(now - Math.max(0, input.owedTokensVnd));
  return { now, worst, state: now < 0 ? "lo" : worst < 0 ? "lo-neu-dung-het" : "loi" } as const;
}
