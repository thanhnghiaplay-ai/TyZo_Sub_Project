import type { Sql } from "./db.ts";

/** Giá vốn ước tính của một phiếu cũ: số đã trừ chia (1 + phần chênh). Chỉ là ước tính, không phải số thật. */
export function estimateBase(charged: number, markup: number): number {
  if (!Number.isFinite(charged) || charged <= 0) return 0;
  const m = Number.isFinite(markup) && markup > 0 ? markup : 0;
  return Math.round(charged / (1 + m / 100));
}

/** Số phiếu đã trừ tiền nhưng chưa có giá vốn (phiếu cũ, trước khi lưu giá vốn). Phiếu đang giữ không tính. */
export async function countUncosted(sql: Sql): Promise<number> {
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from run_tickets
    where charged > 0 and base_cost = 0 and base_est = false and status <> 'dang-giu'
  `;
  return Number(rows[0]?.n ?? 0);
}

/**
 * Điền giá vốn ước tính cho phiếu cũ và đánh dấu base_est. Không đụng phiếu đã có giá vốn thật,
 * không đụng phiếu đang giữ (đang cộng dồn giá vốn). Chạy lại lần hai không đổi gì.
 */
export async function estimateOldCostWith(sql: Sql, markup: number): Promise<number> {
  const m = Number.isFinite(markup) && markup > 0 ? markup : 0;
  const rows = await sql<{ id: string }>`
    update run_tickets
    set base_cost = round(charged::numeric / (1 + ${m}::numeric / 100))::int, base_est = true
    where charged > 0 and base_cost = 0 and base_est = false and status <> 'dang-giu'
    returning id
  `;
  return rows.length;
}
