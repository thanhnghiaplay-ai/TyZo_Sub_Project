/** Durable ownership and budget for asynchronous ASR; no media URL, transcript or provider key is persisted. */
import { createHash, randomBytes } from "node:crypto";
import type { Sql } from "../db.ts";
import { inTransaction } from "../db-tx.ts";
import { asrCost, type PriceBook } from "./run-bill.ts";
import { giayForBaseCost } from "./token-math.ts";
import { reserveGateCall, releaseGateCall, settleGateCall } from "./gate-reserve.ts";
import { closeTicketWith } from "./run-ticket.ts";
import { withWorkAdmission } from "./work-admission.ts";

type Job = {
  id: string;
  user_id: string;
  ticket_id: string;
  call_id: string;
  task_id: string | null;
  state: string;
  price_book: string;
  unit_book: string;
  model: string;
  provider: string;
};

export async function submitAsyncAsr(
  sql: Sql,
  input: {
    userId: string;
    ticketId: string;
    provider: string;
    model: string;
    url: string;
    language: string;
    book: PriceBook;
    unitBook: PriceBook;
  },
  send: () => Promise<string>,
): Promise<string> {
  const requestHash = createHash("sha256")
    .update(JSON.stringify([input.provider, input.model, input.url.trim(), input.language]))
    .digest("hex");
  const find = () =>
    sql<Job>`select * from run_async_asr_jobs where ticket_id = ${input.ticketId} and request_hash = ${requestHash} and state <> 'failed'`;
  const reuse = (job: Job): string => {
    if (job.user_id !== input.userId) throw new Error("Việc nhận dạng không thuộc tài khoản này.");
    if (job.task_id) return job.task_id;
    throw new Error(
      "Việc nhận dạng đang gửi hoặc cần đối soát. Không gửi thêm để tránh tính phí trùng.",
    );
  };
  const old = await find();
  if (old.length) return reuse(old[0]);
  return withWorkAdmission(
    sql,
    { userId: input.userId, provider: input.provider, model: input.model, lane: "batch" },
    async () => {
      const opened = await inTransaction(sql, async (tx) => {
        const tickets = await tx<{
          seconds: number;
          unit: string;
        }>`select seconds, unit from run_tickets where id = ${input.ticketId} and user_id = ${input.userId} for update`;
        if (!tickets.length) throw new Error("Phiếu nhận dạng không hợp lệ.");
        const existing =
          await tx<Job>`select * from run_async_asr_jobs where ticket_id = ${input.ticketId} and request_hash = ${requestHash} and state <> 'failed'`;
        if (existing.length) return { existing: reuse(existing[0]) };
        const bare = { ...input.book, desk: { markup: 0, custom: {} } };
        const base = asrCost(bare, input.model, tickets[0].seconds);
        const units =
          base == null
            ? null
            : tickets[0].unit === "token"
              ? giayForBaseCost(input.unitBook, base)
              : base;
        if (units == null || !Number.isFinite(units) || units <= 0)
          throw new Error("Chưa có giá nhận dạng hợp lệ.");
        const held = await reserveGateCall(tx, {
          ticketId: input.ticketId,
          userId: input.userId,
          estimate: units,
        });
        if (held.kind !== "ok")
          throw new Error(
            held.kind === "busy"
              ? "Phiếu đang bận. Vui lòng thử lại sau."
              : "Phiếu chưa đủ phần giữ cho nhận dạng hoặc đang đóng.",
          );
        const id = randomBytes(12).toString("hex");
        await tx`insert into run_async_asr_jobs(id,user_id,ticket_id,request_hash,call_id,provider,model,price_book,unit_book)
        values(${id},${input.userId},${input.ticketId},${requestHash},${held.callId},${input.provider},${input.model},${JSON.stringify(bare)},${JSON.stringify(input.unitBook)})`;
        return { id, callId: held.callId };
      });
      if ("existing" in opened) return opened.existing!;
      let taskId: string;
      try {
        taskId = await send();
      } catch (error) {
        // Lost response may mean a real upstream job exists. Keep its identity and budget for reconciliation;
        // no automatic resubmission of this request hash. Existing six-hour force-release policy is unchanged.
        await sql`update run_async_asr_jobs set state = 'unknown', updated_at = clock_timestamp() where id = ${opened.id}`;
        throw error;
      }
      await sql`update run_async_asr_jobs set task_id = ${taskId}, state = 'running', updated_at = clock_timestamp() where id = ${opened.id}`;
      return taskId;
    },
  );
}

export async function ownedAsyncAsr(
  sql: Sql,
  userId: string,
  ticketId: string,
  provider: string,
  taskId: string,
): Promise<Job> {
  const rows =
    await sql<Job>`select * from run_async_asr_jobs where provider = ${provider} and task_id = ${taskId} and user_id = ${userId} and ticket_id = ${ticketId}`;
  if (!rows.length)
    throw new Error(
      "Không có hồ sơ sở hữu cho việc nhận dạng này. Với việc từ bản cũ, hãy gửi Yêu cầu xem lại; không gửi lại để tránh tính phí trùng.",
    );
  await sql`update run_gate_calls set heartbeat_at = clock_timestamp() where id = ${rows[0].call_id} and status = 'dang-chay'
    and exists(select 1 from run_async_asr_jobs j where j.call_id = run_gate_calls.id and j.state in ('pending','running','unknown') and j.deadline_at > clock_timestamp())`;
  return rows[0];
}

export async function finishAsyncAsr(sql: Sql, job: Job, seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0)
    throw new Error("Thời lượng nhận dạng không hợp lệ.");
  await inTransaction(sql, async (tx) => {
    await tx`select id from run_tickets where id = ${job.ticket_id} and user_id = ${job.user_id} for update`;
    const rows =
      await tx<Job>`select * from run_async_asr_jobs where id = ${job.id} and user_id = ${job.user_id} for update`;
    if (!rows.length) throw new Error("Việc nhận dạng không hợp lệ.");
    if (rows[0].state === "done") return;
    const book = JSON.parse(rows[0].price_book) as PriceBook;
    const unitBook = JSON.parse(rows[0].unit_book) as PriceBook;
    const base = asrCost(book, rows[0].model, seconds);
    const tickets = await tx<{
      unit: string;
    }>`select unit from run_tickets where id = ${job.ticket_id}`;
    const units =
      base == null ? null : tickets[0]?.unit === "token" ? giayForBaseCost(unitBook, base) : base;
    if (units == null || base == null) throw new Error("Chưa tính được chi phí nhận dạng.");
    await settleGateCall(tx, {
      callId: job.call_id,
      ticketId: job.ticket_id,
      userId: job.user_id,
      units,
      base,
      provider: job.provider,
      model: job.model,
      rate: book.rate,
      reconcile: false,
    });
    await tx`update run_async_asr_jobs set state = 'done', updated_at = clock_timestamp() where id = ${job.id}`;
  });
  await closeWanted(sql, job);
}

export async function failAsyncAsr(sql: Sql, job: Job) {
  await inTransaction(sql, async (tx) => {
    await tx`select id from run_tickets where id = ${job.ticket_id} for update`;
    const changed =
      await tx`update run_async_asr_jobs set state = 'failed', updated_at = clock_timestamp() where id = ${job.id} and state <> 'done' returning id`;
    if (changed.length) await releaseGateCall(tx, job.call_id, "loi");
  });
  await closeWanted(sql, job);
}

async function closeWanted(sql: Sql, job: Job) {
  const rows = await sql<{
    close_failed: boolean;
  }>`select close_failed from run_tickets where id = ${job.ticket_id} and user_id = ${job.user_id} and close_wanted and status = 'dang-giu'`;
  if (rows.length) await closeTicketWith(sql, job.ticket_id, job.user_id, rows[0].close_failed);
}
