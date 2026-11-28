/**
 * MAIN-040: phần việc của một đoạn TyZo Modal sau khi đã giữ phiếu (gọi GPU, ghi chi phí nhà bền, quy ra Token).
 * Tách khỏi server function (tyzo-modal-call.ts) để kiểm hành vi trên PostgreSQL thật. Không import mã máy chủ.
 */
import type { Sql } from "../db.ts";
import { recordSpendDurablyWith } from "../provider-spend-journal.ts";
import { UncertainUpstreamError } from "./upstream-outcome.ts";

export type ModalSeg = { original: string; start: number; end: number };
export type ModalWorkDeps<S> = {
  /** Gọi GPU một lần cho đoạn này. */
  run: () => Promise<{ segments: ModalSeg[]; usd: number }>;
  isTransient: (error: unknown) => boolean;
  /** Gộp/đổi dạng câu trả về khách (mergeInterjections ở bản thật). */
  shape: (segments: ModalSeg[]) => S[];
  toTokens: (usd: number) => number;
  rate: number;
  model: string;
  retryDelayMs?: number;
};

/**
 * Chỉ thử lại một lần khi nhà từ chối tạm thời (429 trước khi nhận việc). Chi phí GPU ghi vào sổ bền với mã
 * `modal:<attempt>` (một lượt chỉ ghi một lần); ghi lỗi thì báo «không chắc» để không trả kết quả chưa có chứng từ.
 */
export async function modalPartWork<S>(sql: Sql, attempt: string, deps: ModalWorkDeps<S>) {
  let out: { segments: ModalSeg[]; usd: number };
  try {
    out = await deps.run();
  } catch (error) {
    if (!deps.isTransient(error)) throw error;
    await new Promise((r) => setTimeout(r, deps.retryDelayMs ?? 3000));
    out = await deps.run();
  }
  // RE6-009: GPU đã chạy nhưng số tiền không hợp lệ → không rõ chi phí, không trả kết quả chưa có chứng từ.
  if (typeof out.usd !== "number" || !Number.isFinite(out.usd) || out.usd < 0)
    throw new UncertainUpstreamError(new Error("Chi phí GPU Modal không hợp lệ."));
  const segments = deps.shape(out.segments);
  try {
    // MAIN-040-B: giữ số tiền GPU thật trên lượt trước khi ghi chứng từ; chứng từ lỗi thì đối soát vẫn có số.
    await sql`update run_modal_settlements set provider_usd = ${out.usd} where attempt = ${attempt}`;
    await recordSpendDurablyWith(sql, { id: "modal:" + attempt, provider: "tyzo-modal", model: deps.model, baseVnd: out.usd * deps.rate, rate: deps.rate });
  } catch (error) {
    throw new UncertainUpstreamError(error);
  }
  // Bù chứng từ của các lượt trước bị ngắt giữa «ghi provider_usd» và «ghi chứng từ» (không chặn lượt này).
  await recoverModalSpend(sql, deps.rate).catch((error) => console.warn("modal-spend-recover", error));
  return { segments, tokens: deps.toTokens(out.usd) };
}

/**
 * RE6-009: lượt đã có `provider_usd` (GPU đã chạy, Modal đã tính) mà thiếu chứng từ `modal:<attempt>` — tiến trình
 * chết hoặc CSDL lỗi giữa hai lần ghi — được ghi bù đúng một lần (khóa chứng từ là mã lượt, ghi lại không cộng hai lần).
 * Số USD lấy từ lượt; tỷ giá là tỷ giá lúc bù (số VND có thể lệch tỷ giá, số USD không lệch). Không trừ thêm khách.
 */
export async function recoverModalSpend(sql: Sql, rate: number, limit = 50): Promise<number> {
  const rows = await sql<{ attempt: string; usd: string; model: string | null }>`
    select s.attempt, s.provider_usd::text as usd, t.asr_model as model from run_modal_settlements s
    left join run_tickets t on t.id = s.ticket_id
    -- «xong» chỉ có sau khi chứng từ đã ghi (quyết toán chạy sau modalPartWork), nên chỉ xét lượt chưa xong.
    where s.status <> 'xong' and s.provider_usd is not null
      and not exists (select 1 from provider_spend_events e where e.id = 'modal:' || s.attempt)
    order by s.attempt limit ${limit}`;
  let n = 0;
  for (const row of rows) {
    const usd = Number(row.usd);
    if (!Number.isFinite(usd) || usd < 0) continue;
    await recordSpendDurablyWith(sql, {
      id: "modal:" + row.attempt,
      provider: "tyzo-modal",
      model: row.model && row.model.startsWith("tyzo-modal") ? row.model : "tyzo-modal",
      baseVnd: usd * rate,
      rate,
    });
    n += 1;
  }
  return n;
}
