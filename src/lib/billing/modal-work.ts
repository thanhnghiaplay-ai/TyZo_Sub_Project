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
  const segments = deps.shape(out.segments);
  try {
    await recordSpendDurablyWith(sql, { id: "modal:" + attempt, provider: "tyzo-modal", model: deps.model, baseVnd: out.usd * deps.rate, rate: deps.rate });
  } catch (error) {
    throw new UncertainUpstreamError(error);
  }
  return { segments, tokens: deps.toTokens(out.usd) };
}
