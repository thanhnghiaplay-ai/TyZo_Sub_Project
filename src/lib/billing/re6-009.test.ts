/**
 * RE6-009: chi phí GPU TyZo Modal — đối soát 0058 (provider_usd), crash giữa ghi USD và chứng từ, không sót không trùng,
 * số USD không hợp lệ, giới hạn tài nguyên, và MÔ HÌNH GIẢ LẬP vòng đời máy (lạnh / chạy / chờ / tắt) so với số tính
 * theo hệ số bù. Chạy trên PostgreSQL thật (TYZO_TEST_PG_URL, PG18.7) hoặc PGlite. GPU là hàm giả; KHÔNG gọi Modal.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, it } from "node:test";
import type { Sql } from "../db.ts";
import { pgliteSql, realPgSql } from "../test-sql.ts";
import { buyGiayWith, openGiayWith } from "./token-flow.ts";
import { runModalPartWith } from "./tyzo-modal-charge.ts";
import { modalPartWork, recoverModalSpend, type ModalWorkDeps } from "./modal-work.ts";
import { UncertainUpstreamError } from "./upstream-outcome.ts";
import { drainSpendJournal } from "../provider-spend-journal.ts";
import { DEFAULT_ADMISSION } from "./work-admission.ts";
import { HOLD_RATIO, MODAL_PRICE_DEFAULT } from "../sub/tyzo-modal-price.ts";

let sql: Sql;
let end: (() => Promise<void>) | undefined;
before(async () => {
  const real = await realPgSql();
  if (real) ({ sql, end } = real);
  else sql = await pgliteSql();
});
after(async () => { await end?.(); });

const TID = "9".repeat(24);
const RATE = 25_000;
const MODEL = "tyzo-modal-nhanh";
const SEG = [{ original: "你好", start: 0, end: 1 }];
type Line = { text: string; start: number; end: number };
const deps = (usd: number, over: Partial<ModalWorkDeps<Line>> = {}): ModalWorkDeps<Line> => ({
  run: async () => ({ segments: SEG, usd }), isTransient: () => false,
  shape: (s) => s.map((x) => ({ text: x.original, start: x.start, end: x.end })), toTokens: (u: number) => Math.ceil(u * 1000),
  rate: RATE, model: MODEL, retryDelayMs: 1, ...over,
});
const part = (hash: string) => ({ ticket: TID, userId: "m9", model: MODEL, partHash: hash, seconds: 10, estimateTokens: () => 20 });
const events = () => sql<{ id: string; usd_micro: string; model: string }>`select id, usd_micro, model from provider_spend_events order by id`;
const charged = async () => (await sql<{ charged: number }>`select charged from run_tickets where id = ${TID}`)[0].charged;

async function open() {
  await sql.query("drop trigger if exists re6009_fault on provider_spend_events");
  for (const t of ["run_modal_settlements", "run_modal_parts", "provider_spend_events", "provider_spend", "token_slices", "run_tickets", "token_grants", "room_ledger", "room_accounts"])
    await sql.query(`delete from ${t}`);
  await sql`insert into room_accounts (user_id, balance) values ('m9', 100000)`;
  await buyGiayWith(sql, "m9", { grantId: "g9", tokens: 1000, days: 30, price: 1, note: "thử" });
  const o = await openGiayWith(sql, { id: TID, userId: "m9", fileName: "a", seconds: 600, rate: 1, hold: 300 });
  assert.ok("id" in o);
  await sql`update run_tickets set asr_model = ${MODEL}, modal_price = '{}' where id = ${TID}`;
}
/** Chứng từ chi phí lỗi một lần (giả lập CSDL lỗi / tiến trình chết đúng giữa hai lần ghi). */
async function failNextJournal() {
  // nextval không bị rollback: lần chèn đầu tiên lỗi, các lần sau chạy bình thường.
  await sql.query("drop sequence if exists re6009_seq");
  await sql.query("create sequence re6009_seq");
  await sql.query(`create or replace function re6009_fault() returns trigger language plpgsql as $$
    begin if nextval('re6009_seq') = 1 then raise exception 'synthetic journal failure'; end if; return new; end $$`);
  await sql.query("drop trigger if exists re6009_fault on provider_spend_events");
  await sql.query("create trigger re6009_fault before insert on provider_spend_events for each row execute function re6009_fault()");
}

describe("RE6-009 · chứng từ chi phí GPU: không sót, không trùng", () => {
  beforeEach(open);

  it("crash giữa ghi USD và chứng từ: khách không bị trừ; lượt sau ghi bù đúng một lần, tổng hợp ngày đúng tổng USD", async () => {
    const first = await runModalPartWith(sql, part("a"), async (_p, attempt) => {
      await failNextJournal();
      return modalPartWork(sql, attempt, deps(0.0123));
    }).catch((e) => e);
    assert.ok(first instanceof UncertainUpstreamError, String(first));
    assert.equal(await charged(), 0);
    const [lost] = await sql<{ status: string; usd: string }>`select status, provider_usd::text as usd from run_modal_settlements`;
    assert.deepEqual([lost.status, Number(lost.usd)], ["mat-phan-hoi", 0.0123]);
    assert.equal((await events()).length, 0, "chưa có chứng từ sau crash");
    // Lượt kế tiếp thành công tự ghi bù chứng từ của lượt trước.
    await runModalPartWith(sql, part("b"), (_p, a) => modalPartWork(sql, a, deps(0.007)));
    const ev = await events();
    assert.equal(ev.length, 2);
    assert.deepEqual(ev.map((e) => Number(e.usd_micro)).sort((x, y) => x - y), [7000, 12300]);
    assert.ok(ev.every((e) => e.model === MODEL));
    assert.equal(await recoverModalSpend(sql, RATE), 0, "chạy lại không ghi thêm");
    await drainSpendJournal(sql, 100);
    await drainSpendJournal(sql, 100);
    const [day] = await sql<{ calls: number; usd: string }>`select sum(calls)::int as calls, sum(usd_micro)::text as usd from provider_spend where provider = 'tyzo-modal'`;
    assert.deepEqual([day.calls, Number(day.usd)], [2, 19300], "tổng hợp ngày cộng mỗi chứng từ một lần");
    assert.equal(await charged(), 7, "chỉ lượt thành công trừ khách");
  });

  it("10 lần bù đồng thời cho cùng các lượt: mỗi lượt đúng một chứng từ", async () => {
    for (const h of ["c", "d", "e"]) {
      await runModalPartWith(sql, part(h), async (_p, attempt) => { await failNextJournal(); return modalPartWork(sql, attempt, deps(0.001)); }).catch(() => undefined);
    }
    assert.equal((await events()).length, 0);
    const counts = await Promise.all(Array.from({ length: 10 }, () => recoverModalSpend(sql, RATE).catch(() => 0)));
    assert.ok(counts.reduce((a, b) => a + b, 0) >= 3);
    const ev = await events();
    assert.equal(ev.length, 3);
    assert.equal(new Set(ev.map((e) => e.id)).size, 3);
  });

  it("số USD GPU không hợp lệ (NaN, âm, vô hạn, không phải số): không chắc, không ghi USD, không chứng từ, không trừ", async () => {
    for (const [i, usd] of [Number.NaN, -0.01, Number.POSITIVE_INFINITY, "0.01" as unknown as number].entries()) {
      const err = await runModalPartWith(sql, part(`bad${i}`), (_p, a) => modalPartWork(sql, a, deps(usd))).catch((e) => e);
      assert.ok(err instanceof UncertainUpstreamError, String(usd));
    }
    assert.equal((await events()).length, 0);
    assert.equal(await charged(), 0);
    const rows = await sql<{ status: string; usd: string | null }>`select status, provider_usd::text as usd from run_modal_settlements`;
    assert.equal(rows.length, 4);
    assert.ok(rows.every((r) => r.status === "mat-phan-hoi" && r.usd === null));
    assert.equal(Number((await sql<{ r: string }>`select modal_reserved as r from run_tickets where id = ${TID}`)[0].r), 0);
  });

  it("chi phí 0 hợp lệ (đoạn im lặng) vẫn có chứng từ 0, không bị coi là thiếu", async () => {
    await runModalPartWith(sql, part("z"), (_p, a) => modalPartWork(sql, a, deps(0)));
    const ev = await events();
    assert.deepEqual(ev.map((e) => Number(e.usd_micro)), [0]);
    assert.equal(await recoverModalSpend(sql, RATE), 0);
  });
});

describe("RE6-009 · giới hạn tài nguyên và ngân sách (cấu hình)", () => {
  const app = readFileSync(new URL("../../../eval/asr/luong-ky/modal/modal_app.py", import.meta.url), "utf8");
  const cfg = JSON.parse(readFileSync(new URL("../../../eval/asr/luong-ky/modal/cau-hinh.json", import.meta.url), "utf8"));

  it("cửa nhận việc lane modal không vượt số máy nhận dạng tối đa; khách riêng không chiếm hết", () => {
    const max = Number(/max_containers=(\d+)/.exec(app.slice(app.indexOf('@app.cls(gpu=CFG["gpu"]["nhan_dang"]')))?.[1]);
    assert.equal(max, 9);
    assert.ok(DEFAULT_ADMISSION.modal <= max, `${DEFAULT_ADMISSION.modal} ≤ ${max}`);
    assert.ok(DEFAULT_ADMISSION.perUserModal < DEFAULT_ADMISSION.modal);
  });

  it("ĐÃ BIẾT: máy model chữ (LLM_KW) không có max_containers, timeout 24 giờ — cần Chủ duyệt trần khi nghiệm thu thật", () => {
    const llm = app.slice(app.indexOf("LLM_KW = dict("), app.indexOf(")", app.indexOf("min_containers", app.indexOf("LLM_KW = dict("))) + 1);
    assert.doesNotMatch(llm, /max_containers/);
    assert.match(llm, /timeout=24 \* 3600/);
  });

  it("phần giữ Token theo giờ phim đủ phủ chi phí tính cho mọi hồ sơ (giữ ≥ trừ khi RTF ≤ tỉ lệ giữ)", () => {
    // Số đo: nhanh RTF 0,19–0,31; kỹ ≈ 0,39. Trừ = RTF × giây phim × giá × hệ số; giữ = HOLD_RATIO × giây phim × giá × hệ số.
    for (const [profile, rtf] of [["nhanh", 0.31], ["ky", 0.39]] as const) assert.ok(HOLD_RATIO[profile] >= rtf, profile);
    assert.ok(cfg.gpu.may_du_phong_nhan_dang >= 0 && cfg.gpu.may_du_phong_nhan_dang <= 8);
  });
});

/**
 * MÔ HÌNH GIẢ LẬP vòng đời máy Modal (không phải hóa đơn): máy khởi động lạnh `boot` giây (tính tiền), xử lý,
 * rảnh `window` giây rồi tắt (tính tiền), cộng `buffer` máy dự phòng sống suốt lúc có việc (tính tiền).
 * Tiền thu theo app = giây xử lý × giá × hệ số bù. So sánh để biết khi nào hệ số 3 không đủ.
 */
type Job = { at: number; proc: number };
function simulate(jobs: Job[], o: { boot: number; window: number; buffer: number; max: number }) {
  const free: number[] = []; // thời điểm mỗi máy rảnh lại
  let billed = 0; let firstAt = Infinity; let lastEnd = 0;
  const lives: { start: number; end: number }[] = [];
  for (const j of [...jobs].sort((a, b) => a.at - b.at)) {
    firstAt = Math.min(firstAt, j.at);
    // máy nóng rảnh và chưa tắt
    let idx = free.findIndex((t, i) => t <= j.at && j.at <= t + o.window && lives[i].end >= 0);
    let start: number;
    if (idx >= 0) start = j.at;
    else if (free.length < o.max) { lives.push({ start: j.at, end: 0 }); free.push(0); idx = free.length - 1; start = j.at + o.boot; }
    else { idx = free.indexOf(Math.min(...free)); start = Math.max(j.at, free[idx]); }
    free[idx] = start + j.proc;
    lives[idx].end = free[idx];
    lastEnd = Math.max(lastEnd, free[idx]);
  }
  for (const l of lives) billed += l.end + o.window - l.start;
  billed += o.buffer * (o.boot + (lastEnd - firstAt) + o.window);
  const proc = jobs.reduce((a, j) => a + j.proc, 0);
  return { billed, proc, ratio: billed / proc };
}

describe("RE6-009 · mô hình giả lập vòng đời GPU (lạnh / chạy / chờ / tắt) — KHÔNG phải số thiết bị thật", () => {
  // Thông số đo thật 28/11 (GPU-MODAL/REPORT.md): lạnh 16 s, nóng 9,4 s mỗi đoạn 30 s; cấu hình: rảnh 60 s, 2 máy dự phòng, tối đa 9.
  const live = { boot: 16, window: 60, buffer: 2, max: 9 };
  const overhead = MODAL_PRICE_DEFAULT.overhead;

  it("bảng kịch bản và ngưỡng hệ số bù", (ctx) => {
    const lines: string[] = [];
    const scen: [string, Job[]][] = [
      ["1 đoạn 30 s, máy lạnh", [{ at: 0, proc: 9.4 }]],
      ["phim 5 phút (10 đoạn nối tiếp)", Array.from({ length: 10 }, (_, i) => ({ at: i * 9.4, proc: 9.4 }))],
      ["phim 74 phút (148 đoạn, 3 luồng)", Array.from({ length: 148 }, (_, i) => ({ at: Math.floor(i / 3) * 9.4, proc: 9.4 }))],
      ["8 khách cùng lúc, mỗi khách 1 đoạn", Array.from({ length: 8 }, () => ({ at: 0, proc: 9.4 }))],
      ["khách rải rác: 1 đoạn mỗi 90 s × 10", Array.from({ length: 10 }, (_, i) => ({ at: i * 90, proc: 9.4 }))],
    ];
    const results = scen.map(([name, jobs]) => [name, simulate(jobs, live)] as const);
    for (const [name, r] of results)
      lines.push(`${name}: tính tiền ${r.billed.toFixed(0)} s máy / ${r.proc.toFixed(0)} s xử lý = ${r.ratio.toFixed(1)}× (hệ số ${overhead}${r.ratio > overhead ? " → THIẾU" : " → đủ"})`);
    ctx.diagnostic(lines.join(" | "));
    // Phim dài nhiều đoạn: tỷ lệ tiến về gần 1 + dự phòng; đoạn lẻ: chi phí lạnh + chờ + dự phòng lớn hơn hệ số 3 nhiều lần.
    assert.ok(results[2][1].ratio < overhead, "phim dài: hệ số 3 đủ theo mô hình");
    assert.ok(results[0][1].ratio > overhead * 5, "đoạn lẻ: hệ số 3 không đủ theo mô hình");
    assert.ok(results[4][1].ratio > overhead, "khách rải rác: không đủ");
  });

  it("không có máy dự phòng: chi phí chờ máy tắt vẫn là phần lớn của đoạn lẻ", () => {
    const r = simulate([{ at: 0, proc: 9.4 }], { ...live, buffer: 0 });
    assert.equal(Math.round(r.billed), 16 + 9 + 60);
    assert.ok(r.ratio > overhead);
  });
});
