/**
 * MAIN-040: hành vi ghi chi phí GPU TyZo Modal trên PostgreSQL thật (TYZO_TEST_PG_URL) hoặc PGlite.
 * Chạy đúng runModalPartWith + modalPartWork; GPU là hàm giả.
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { Sql } from "../db.ts";
import { pgliteSql, realPgSql } from "../test-sql.ts";
import { buyGiayWith, openGiayWith } from "./token-flow.ts";
import { runModalPartWith } from "./tyzo-modal-charge.ts";
import { modalPartWork, type ModalWorkDeps } from "./modal-work.ts";
import { UncertainUpstreamError } from "./upstream-outcome.ts";

let sql: Sql;
let end: (() => Promise<void>) | undefined;
before(async () => {
  const real = await realPgSql();
  if (real) ({ sql, end } = real);
  else sql = await pgliteSql();
});
after(async () => { await end?.(); });

const TID = "e".repeat(24);
const RATE = 25_000;
const MODEL = "tyzo-modal-nhanh";
const SEG = [{ original: "你好", start: 0, end: 1 }];
async function open() {
  await sql`delete from run_modal_settlements`;
  await sql`delete from run_modal_parts`;
  await sql`delete from provider_spend_events`;
  await sql`delete from provider_spend`;
  await sql`delete from token_slices`;
  await sql`delete from run_tickets`;
  await sql`delete from token_grants`;
  await sql`delete from room_ledger`;
  await sql`delete from room_accounts`;
  await sql`insert into room_accounts (user_id, balance) values ('m', 100000)`;
  await buyGiayWith(sql, "m", { grantId: "gm", tokens: 1000, days: 30, price: 1, note: "thử" });
  const o = await openGiayWith(sql, { id: TID, userId: "m", fileName: "a", seconds: 600, rate: 1, hold: 200 });
  assert.ok("id" in o);
  await sql`update run_tickets set asr_model = ${MODEL}, modal_price = '{}' where id = ${TID}`;
}
const part = (hash: string) => ({ ticket: TID, userId: "m", model: MODEL, partHash: hash, seconds: 10, estimateTokens: () => 20 });
type Line = { text: string; start: number; end: number };
const deps = (run: () => Promise<{ segments: typeof SEG; usd: number }>, over: Partial<ModalWorkDeps<Line>> = {}): ModalWorkDeps<Line> => ({
  run, isTransient: (e: unknown) => (e as Error)?.message === "429", shape: (s) => s.map((x) => ({ text: x.original, start: x.start, end: x.end })), toTokens: (usd: number) => Math.ceil(usd * 1000),
  rate: RATE, model: MODEL, retryDelayMs: 1, ...over,
});
const events = () => sql<{ id: string; base_vnd: string }>`select id, base_vnd from provider_spend_events order by id`;
const charged = async () => (await sql<{ charged: number }>`select charged from run_tickets where id = ${TID}`)[0].charged;
const settlements = () => sql<{ status: string; charged_tokens: number | null }>`select status, charged_tokens from run_modal_settlements`;

describe("MAIN-040: ghi chi phí GPU Modal", () => {
  beforeEach(open);

  it("thành công: một chứng từ chi phí modal:<attempt> đúng số tiền, trừ đúng Token", async () => {
    let attemptSeen = "";
    const r = await runModalPartWith(sql, part("a"), (_p, attempt) => { attemptSeen = attempt; return modalPartWork(sql, attempt, deps(async () => ({ segments: SEG, usd: 0.012 }))); });
    assert.equal(r.reused, false);
    assert.deepEqual((await events()).map((e) => [e.id, Number(e.base_vnd)]), [[`modal:${attemptSeen}`, 0.012 * RATE]]);
    assert.equal(await charged(), 12);
    assert.deepEqual((await settlements()).map((s) => s.status), ["xong"]);
  });

  it("nhà từ chối tạm thời (429) rồi chạy: GPU gọi hai lần, chi phí ghi một lần", async () => {
    let calls = 0;
    await runModalPartWith(sql, part("b"), (_p, attempt) => modalPartWork(sql, attempt, deps(async () => {
      calls++;
      if (calls === 1) throw new Error("429");
      return { segments: SEG, usd: 0.01 };
    })));
    assert.equal(calls, 2);
    assert.equal((await events()).length, 1);
    assert.equal(await charged(), 10);
  });

  it("lỗi hẳn: không ghi chi phí, không trừ, nhả phần giữ, giữ dấu lượt mất phản hồi", async () => {
    await assert.rejects(runModalPartWith(sql, part("c"), (_p, attempt) => modalPartWork(sql, attempt, deps(async () => { throw new Error("500"); }))));
    assert.equal((await events()).length, 0);
    assert.equal(await charged(), 0);
    assert.equal(Number((await sql<{ r: string }>`select modal_reserved as r from run_tickets where id = ${TID}`)[0].r), 0);
    assert.deepEqual((await settlements()).map((s) => s.status), ["mat-phan-hoi"]);
  });

  it("gửi lại cùng đoạn sau khi xong: dùng kết quả đã lưu, không gọi GPU, không ghi chi phí, không trừ lần hai", async () => {
    await runModalPartWith(sql, part("d"), (_p, a) => modalPartWork(sql, a, deps(async () => ({ segments: SEG, usd: 0.012 }))));
    let gpu = 0;
    const again = await runModalPartWith(sql, part("d"), (_p, a) => modalPartWork(sql, a, deps(async () => { gpu++; return { segments: SEG, usd: 0.012 }; })));
    assert.equal(again.reused, true);
    assert.equal(gpu, 0);
    assert.equal((await events()).length, 1);
    assert.equal(await charged(), 12);
  });

  it("ghi chứng từ chi phí lỗi: báo «không chắc», không trừ khách, lượt giữ dấu mất phản hồi KÈM số USD thật (MAIN-040-B)", async () => {
    // Tên model quá dài làm recordSpendDurablyWith từ chối: GPU đã chạy nhưng chứng từ không ghi được.
    const err = await runModalPartWith(sql, part("e"), (_p, a) => modalPartWork(sql, a, deps(async () => ({ segments: SEG, usd: 0.0123 }), { model: "m".repeat(130) }))).catch((e) => e);
    assert.ok(err instanceof UncertainUpstreamError, String(err));
    assert.equal((await events()).length, 0);
    assert.equal(await charged(), 0);
    const rows = await sql<{ status: string; usd: string | null }>`select status, provider_usd::text as usd from run_modal_settlements`;
    assert.deepEqual(rows.map((r) => [r.status, Number(r.usd)]), [["mat-phan-hoi", 0.0123]]);
  });

  it("thành công: lượt cũng lưu số USD GPU (khớp chứng từ)", async () => {
    await runModalPartWith(sql, part("f"), (_p, a) => modalPartWork(sql, a, deps(async () => ({ segments: SEG, usd: 0.007 }))));
    const rows = await sql<{ usd: string }>`select provider_usd::text as usd from run_modal_settlements`;
    assert.deepEqual(rows.map((r) => Number(r.usd)), [0.007]);
  });

  it("cùng lượt ghi chi phí hai lần (thử lại sau mất kết nối DB) không nhân đôi chứng từ", async () => {
    await modalPartWork(sql, "fixed-attempt", deps(async () => ({ segments: SEG, usd: 0.02 })));
    await modalPartWork(sql, "fixed-attempt", deps(async () => ({ segments: SEG, usd: 0.02 })));
    assert.deepEqual((await events()).map((e) => e.id), ["modal:fixed-attempt"]);
    await assert.rejects(modalPartWork(sql, "fixed-attempt", deps(async () => ({ segments: SEG, usd: 0.03 }))), UncertainUpstreamError, "cùng mã mà số khác phải bị chặn");
  });
});
