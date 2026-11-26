import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { buyGiayWith, closeTokenWith, giayBalance, openGiayWith } from "./token-flow.ts";
import { runModalPartWith } from "./tyzo-modal-charge.ts";

let sql: Sql;
const PRICE = JSON.stringify({ mode: "fixed", nhanh: 1, ky: 2 });
const SEG = [{ text: "こんにちは", start: 0, end: 1 }];

before(async () => {
  const db = new PGlite();
  const dir = new URL("../../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) await db.exec(readFileSync(new URL(file, dir), "utf8"));
  sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return (await db.query(text, values)).rows;
  }) as unknown as Sql;
});

async function open(hold: number, seconds = 600) {
  await sql`delete from run_modal_parts`;
  await sql`delete from token_slices`;
  await sql`delete from run_tickets`;
  await sql`delete from token_grants`;
  await sql`delete from room_ledger`;
  await sql`delete from room_accounts`;
  await sql`insert into room_accounts (user_id, balance) values ('k', 100000)`;
  await buyGiayWith(sql, "k", { grantId: "g1", tokens: 1000, days: 30, price: 1, note: "thử" });
  const opened = await openGiayWith(sql, { id: "t1", userId: "k", fileName: "a.mp4", seconds, rate: 1, hold, asrModel: "tyzo-modal-nhanh", chatModel: "c", modalPrice: PRICE });
  assert.ok(opened && "id" in opened);
}

const part = (hash: string, seconds = 60, est = 10) => ({ ticket: "t1", userId: "k", model: "tyzo-modal-nhanh", partHash: hash, seconds, estimateTokens: () => est });
const ticket = async () => (await sql<{ held: number; charged: number; modal_seconds: string; modal_short: number }>`
  select held, charged, modal_seconds, modal_short from run_tickets where id = 't1'`)[0];

describe("thu tiền từng đoạn TyZo Modal", () => {
  beforeEach(() => open(100));

  it("trừ đúng số thực của đoạn", async () => {
    let calls = 0;
    const r = await runModalPartWith(sql, part("a"), async () => (calls++, { segments: SEG, tokens: 12 }));
    assert.deepEqual([r.tokens, r.short, r.reused, calls], [12, 0, false, 1]);
    const t = await ticket();
    assert.deepEqual([t.held, t.charged, Number(t.modal_seconds)], [88, 12, 60]);
  });

  it("gửi lại cùng đoạn sau khi đã xong: trả kết quả cũ, không gọi GPU, không trừ lần hai", async () => {
    let calls = 0;
    const run = () => runModalPartWith(sql, part("a"), async () => (calls++, { segments: SEG, tokens: 12 }));
    await run();
    const again = await run();
    assert.deepEqual([again.reused, again.tokens, calls], [true, 12, 1]);
    const t = await ticket();
    assert.deepEqual([t.held, t.charged, Number(t.modal_seconds)], [88, 12, 60]);
  });

  it("gửi trùng khi đoạn đang chạy thì từ chối, không trừ", async () => {
    let release!: () => void;
    const first = runModalPartWith(sql, part("a"), () => new Promise((ok) => { release = () => ok({ segments: SEG, tokens: 5 }); }));
    while (!release) await new Promise((r) => setTimeout(r, 5));
    await assert.rejects(runModalPartWith(sql, part("a"), async () => ({ segments: SEG, tokens: 5 })), /đang được nhận dạng/);
    release();
    await first;
    assert.equal((await ticket()).charged, 5);
  });

  it("Modal lỗi: trả lại thời lượng, không trừ, gửi lại được", async () => {
    await assert.rejects(runModalPartWith(sql, part("a"), async () => { throw new Error("HTTP 500"); }), /HTTP 500/);
    let t = await ticket();
    assert.deepEqual([t.held, t.charged, Number(t.modal_seconds)], [100, 0, 0]);
    await runModalPartWith(sql, part("a"), async () => ({ segments: SEG, tokens: 7 }));
    t = await ticket();
    assert.deepEqual([t.charged, Number(t.modal_seconds)], [7, 60]);
  });

  it("chín đoạn chạy cùng lúc: trừ đúng tổng, không vượt số giữ", async () => {
    await Promise.all(Array.from({ length: 9 }, (_, i) => runModalPartWith(sql, part("p" + i), async () => ({ segments: SEG, tokens: 10 }))));
    const t = await ticket();
    assert.deepEqual([t.held, t.charged, Number(t.modal_seconds), t.modal_short], [10, 90, 540, 0]);
  });

  it("không còn giữ đủ cho ước tính thì từ chối trước khi gọi GPU", async () => {
    let calls = 0;
    await assert.rejects(runModalPartWith(sql, part("a", 60, 101), async () => (calls++, { segments: SEG, tokens: 1 })), /không còn đủ Token/);
    assert.equal(calls, 0);
    assert.equal(Number((await ticket()).modal_seconds), 0);
  });

  it("vượt thời lượng phiếu thì từ chối", async () => {
    await assert.rejects(runModalPartWith(sql, part("a", 700), async () => ({ segments: SEG, tokens: 1 })), /đã hết/);
  });

  it("số thực vượt phần còn giữ: trừ hết phần còn lại, ghi phần thiếu để đối soát", async () => {
    const r = await runModalPartWith(sql, part("a"), async () => ({ segments: SEG, tokens: 130 }));
    assert.deepEqual([r.tokens, r.short], [100, 30]);
    const t = await ticket();
    assert.deepEqual([t.held, t.charged, t.modal_short], [0, 100, 30]);
  });

  it("đóng phiếu trả lại phần chưa dùng; sau đó không chạy thêm đoạn được", async () => {
    await runModalPartWith(sql, part("a"), async () => ({ segments: SEG, tokens: 12 }));
    await closeTokenWith(sql, "t1", "k", false);
    assert.equal(await giayBalance(sql, "k"), 1000 - 12);
    await assert.rejects(runModalPartWith(sql, part("b"), async () => ({ segments: SEG, tokens: 1 })), /đã hết|đã đóng/);
  });

  it("phiếu của người khác hoặc model khác thì từ chối", async () => {
    await assert.rejects(runModalPartWith(sql, { ...part("a"), userId: "x" }, async () => ({ segments: SEG, tokens: 1 })), /không hợp lệ/);
    await assert.rejects(runModalPartWith(sql, { ...part("a"), model: "tyzo-modal-ky" }, async () => ({ segments: SEG, tokens: 1 })), /không hợp lệ/);
  });
});
