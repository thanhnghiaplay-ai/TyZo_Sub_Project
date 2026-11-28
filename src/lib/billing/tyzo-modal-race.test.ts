/**
 * Tranh chấp và lỗi giữa chừng khi thu tiền TyZo Modal (kiểm toán v5.49: MAIN-023, MAIN-024, MAIN-036).
 * Chạy trên PGLite; đặt TYZO_TEST_PG_URL để chạy trên Postgres thật nhiều kết nối (khuyên dùng).
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { Sql } from "../db.ts";
import { pgliteSql, realPgSql } from "../test-sql.ts";
import { buyGiayWith, closeTokenWith, giayBalance, openGiayWith } from "./token-flow.ts";
import { submitModalChunk } from "../sub/tyzo-modal.ts";
import { runAdmittedModalPartWith, runModalPartWith } from "./tyzo-modal-charge.ts";
import { sweepAdmissions } from "./work-admission.ts";

let sql: Sql;
let end: (() => Promise<void>) | undefined;
const PRICE = JSON.stringify({ gpuUsdPerHour: 0.8, overhead: 3 });
const SEG = [{ text: "xin chào", start: 0, end: 1 }];

before(async () => {
  const real = await realPgSql();
  if (real) ({ sql, end } = real);
  else sql = await pgliteSql();
});
after(async () => {
  await end?.();
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

const part = (hash: string, seconds = 60, est = 30) => ({ ticket: "t1", userId: "k", model: "tyzo-modal-nhanh", partHash: hash, seconds, estimateTokens: () => est });
const ticket = async () =>
  (await sql<{ held: number; charged: number; status: string; modal_short: number; modal_reserved?: string }>`
    select * from run_tickets where id = 't1'`)[0];
const gate = () => {
  let open!: () => void;
  const wait = new Promise<void>((resolve) => (open = resolve));
  return { wait, open };
};

describe("TyZo Modal: giữ, quyết toán, đóng phiếu khi chạy song song", () => {
  beforeEach(() => open(100));

  it("MAIN-023: 9 đoạn ước 30 Token, giữ 100 → tối đa 3 đoạn được gọi GPU cùng lúc", async () => {
    const g = gate();
    let calls = 0;
    const runs = Array.from({ length: 9 }, (_, i) =>
      runModalPartWith(sql, part(`p${i}`), async () => {
        calls += 1;
        await g.wait;
        return { segments: SEG, tokens: 20 };
      }).then(
        () => "xong",
        (error: Error) => error.message,
      ),
    );
    await new Promise((r) => setTimeout(r, 300));
    assert.ok(calls <= 3, `đã gọi GPU ${calls} đoạn`);
    g.open();
    const out = await Promise.all(runs);
    assert.equal(out.filter((x) => x === "xong").length, calls);
    const t = await ticket();
    assert.ok(t.held >= 0);
    assert.equal(Number(t.modal_reserved ?? 0), 0);
  });

  it("MAIN-024: lỗi khi lưu kết quả thì không trừ Token (không có tiền mà không có chữ)", async () => {
    await sql.query(`create or replace function thu_loi_luu() returns trigger language plpgsql as $$
      begin if new.status = 'xong' then raise exception 'loi gia lap'; end if; return new; end $$`);
    await sql.query(`create trigger thu_loi_luu before update on run_modal_parts for each row execute function thu_loi_luu()`);
    try {
      await assert.rejects(runModalPartWith(sql, part("a"), async () => ({ segments: SEG, tokens: 12 })));
      const t = await ticket();
      assert.deepEqual([t.held, t.charged, Number(t.modal_reserved ?? 0)], [100, 0, 0]);
      const parts = await sql<{ n: number }>`select count(*)::int as n from run_modal_parts`;
      assert.equal(parts[0].n, 0, "đoạn lỗi được bỏ để gửi lại");
    } finally {
      await sql.query(`drop trigger thu_loi_luu on run_modal_parts`);
    }
  });

  it("MAIN-036: khách đóng phiếu khi đoạn đang chạy → đoạn vẫn được trừ, phần dư trả về sau đó", async () => {
    const g = gate();
    const running = runModalPartWith(sql, part("a"), async () => {
      await g.wait;
      return { segments: SEG, tokens: 12 };
    });
    await new Promise((r) => setTimeout(r, 100));
    await closeTokenWith(sql, "t1", "k", false);
    g.open();
    const r = await running;
    assert.deepEqual([r.tokens, r.short], [12, 0]);
    const t = await ticket();
    assert.equal(t.charged, 12);
    assert.equal(t.held, 0);
    assert.notEqual(t.status, "dang-giu");
    assert.equal(await giayBalance(sql, "k"), 1000 - 12);
  });

  it("yêu cầu đóng phiếu giữa ghi đoạn và giữ ngân sách phải nhả Token ngay", async () => {
    await sql.query(`create function thu_dong_phieu_som() returns trigger language plpgsql as $$
      begin
        update run_tickets set close_wanted = true, close_failed = true where id = new.ticket_id;
        return new;
      end $$`);
    await sql.query(`create trigger thu_dong_phieu_som after insert on run_modal_parts
      for each row execute function thu_dong_phieu_som()`);
    try {
      await assert.rejects(runModalPartWith(sql, part("closing"), async () => assert.fail("không được gọi GPU")), /Phiếu Modal đã hết/);
      const t = await ticket();
      assert.deepEqual([t.status, t.held, t.charged, await giayBalance(sql, "k")], ["loi", 0, 0, 1000]);
      const jobs = await sql<{ n: number }>`select count(*)::int n from run_modal_parts where part_hash = 'closing'`;
      assert.equal(jobs[0].n, 0);
    } finally {
      await sql.query(`drop trigger thu_dong_phieu_som on run_modal_parts`);
      await sql.query(`drop function thu_dong_phieu_som()`);
    }
  });

  it("đóng phiếu khi không có đoạn nào chạy vẫn trả hết ngay như cũ", async () => {
    const closed = await closeTokenWith(sql, "t1", "k", false);
    assert.equal(closed?.freed, 100);
    assert.equal(await giayBalance(sql, "k"), 1000);
  });

  // RE-001: «đoạn chết» nay là mất nhịp sống (heartbeat), không còn là gửi quá 15 phút.
  it("đoạn mất nhịp (tiến trình chết) không giữ phiếu mãi: đóng được ngay", async () => {
    await sql`insert into run_modal_parts (ticket_id, part_hash, seconds, created_at, heartbeat_at) values ('t1', 'cu', 60, now() - interval '20 minutes', now() - interval '10 minutes')`;
    const closed = await closeTokenWith(sql, "t1", "k", false);
    assert.equal(closed?.freed, 100);
  });

  it("RE-001: đoạn GPU chạy quá 15 phút (gửi từ 20 phút trước, vẫn còn nhịp) → đóng phiếu phải chờ, không trả phần giữ trước quyết toán", async () => {
    const g = gate();
    const running = runModalPartWith(sql, { ...part("dai"), beatMs: 40 }, async () => {
      await g.wait;
      return { segments: SEG, tokens: 12 };
    });
    await new Promise((r) => setTimeout(r, 120));
    await sql`update run_modal_parts set created_at = now() - interval '20 minutes'`;
    const closed = await closeTokenWith(sql, "t1", "k", false);
    assert.equal(closed, null, "không được đóng khi GPU còn chạy");
    assert.equal((await ticket()).status, "dang-giu");
    g.open();
    const r = await running;
    assert.deepEqual([r.tokens, r.short], [12, 0]);
    const t = await ticket();
    assert.deepEqual([t.charged, t.held], [12, 0]);
    assert.notEqual(t.status, "dang-giu");
  });

  it("RE-001: tiến trình chết (mất nhịp) → đóng phiếu được ngay, phần giữ trả đủ; gửi lại đoạn đó chạy và trừ một lần", async () => {
    await sql`update run_tickets set modal_reserved = 30, modal_seconds = 60 where id = 't1'`;
    await sql`insert into run_modal_parts (ticket_id, part_hash, seconds, reserved, attempt, heartbeat_at)
              values ('t1', 'chet', 60, 30, 'cu', now() - interval '10 minutes')`;
    let calls = 0;
    const r = await runModalPartWith(sql, part("chet"), async () => (calls++, { segments: SEG, tokens: 12 }));
    assert.deepEqual([calls, r.tokens, r.reused], [1, 12, false]);
    const t = await ticket();
    assert.deepEqual([t.charged, Number(t.modal_reserved ?? 0)], [12, 0]);
    const closed = await closeTokenWith(sql, "t1", "k", false);
    assert.equal(closed?.freed, 88);
  });

  it("RE-001: lượt cũ bị coi là chết rồi mới xong → không trừ lần hai (mã lượt chặn)", async () => {
    const g = gate();
    const oldRun = runModalPartWith(sql, part("hang"), async () => {
      await g.wait;
      return { segments: SEG, tokens: 12 };
    });
    await new Promise((r) => setTimeout(r, 120));
    await sql`update run_modal_parts set heartbeat_at = now() - interval '10 minutes' where part_hash = 'hang'`;
    const fresh = await runModalPartWith(sql, part("hang"), async () => ({ segments: SEG, tokens: 12 }));
    assert.equal(fresh.tokens, 12);
    g.open();
    const late = await oldRun;
    assert.equal(late.tokens, 0, "lượt cũ không được trừ");
    const t = await ticket();
    assert.equal(t.charged, 12, "chỉ trừ một lần");
    assert.equal(Number(t.modal_reserved ?? 0), 0);
  });

  it("RE-001: nhịp sống được ghi đều trong lúc GPU chạy", async () => {
    const g = gate();
    const running = runModalPartWith(sql, { ...part("nhip"), beatMs: 40 }, async () => {
      await g.wait;
      return { segments: SEG, tokens: 1 };
    });
    await new Promise((r) => setTimeout(r, 60));
    await sql`update run_modal_parts set heartbeat_at = now() - interval '1 second' where part_hash = 'nhip'`;
    await new Promise((r) => setTimeout(r, 200));
    const hb = await sql<{ fresh: boolean }>`select heartbeat_at > now() - interval '5 seconds' as fresh from run_modal_parts where part_hash = 'nhip'`;
    g.open();
    await running;
    assert.equal(hb[0].fresh, true);
  });
});


describe("TyZo Modal: cửa nhận việc và tiếp tục", () => {
  beforeEach(async () => {
    await open(100);
    await sql`delete from work_admissions`;
    await sql`delete from work_waiters`;
    await sql`insert into room_settings (key, value) values ('work_admission', '{"perUserModal":2}')
      on conflict (key) do update set value = excluded.value`;
  });

  it("sáu đoạn chờ qua 429, mỗi đoạn gửi và trừ đúng một lần", async () => {
    const calls = new Map<string, number>();
    let active = 0;
    let maxActive = 0;
    let busy = 0;
    const signal = new AbortController().signal;
    const chunks = Array.from({ length: 6 }, (_, i) => `part-${i}`);
    const results = await Promise.all(chunks.map((hash) => submitModalChunk(
      () => runAdmittedModalPartWith(sql, part(hash, 29, 10), async () => {
        calls.set(hash, (calls.get(hash) ?? 0) + 1);
        maxActive = Math.max(maxActive, ++active);
        await new Promise((resolve) => setTimeout(resolve, 60));
        active--;
        return { segments: SEG, tokens: 7 };
      }),
      signal,
      () => { busy++; },
      async () => new Promise((resolve) => setTimeout(resolve, 30)),
    )));
    assert.equal(results.length, 6);
    assert.equal(maxActive, 2);
    assert.ok(busy > 0, "cửa đã từ chối tạm thời trước khi gọi GPU");
    assert.deepEqual(chunks.map((hash) => calls.get(hash)), [1, 1, 1, 1, 1, 1]);
    const closed = await closeTokenWith(sql, "t1", "k", false);
    assert.deepEqual([closed?.charged, closed?.freed, await giayBalance(sql, "k")], [42, 58, 958]);
    const jobs = await sql<{ status: string; n: number }>`select status, count(*)::int n from run_modal_parts group by status`;
    assert.deepEqual(jobs, [{ status: "xong", n: 6 }]);
    const leases = await sql<{ n: number }>`select count(*)::int n from work_admissions where status <> 'done'`;
    assert.equal(leases[0].n, 0);
  });

  it("409 giữ khóa đối soát, chỉ cho đọc đoạn đã lưu và không trừ lại", async () => {
    const recognize = async () => ({ segments: SEG, tokens: 7 });
    await runAdmittedModalPartWith(sql, part("saved"), recognize);
    await sql`insert into work_admissions (id, user_id, provider, model, lane, status)
      values ('unknown-k', 'k', 'tyzo-modal', 'tyzo-modal-nhanh', 'modal', 'unknown')`;
    const noGpu = async () => assert.fail("không được gửi GPU");
    const signal = new AbortController().signal;
    const cached = await submitModalChunk(
      () => runAdmittedModalPartWith(sql, part("saved"), noGpu),
      signal,
    );
    assert.equal(cached.reused, true);
    let submits = 0;
    await assert.rejects(submitModalChunk(async () => {
      submits++;
      return runAdmittedModalPartWith(sql, part("new"), noGpu);
    }, signal), { status: 409 });
    assert.equal(submits, 1);
    assert.equal((await ticket()).charged, 7);
  });

  it("đối soát suất Modal đã quyết toán kể cả khi phụ đề tạm đã hết hạn", async () => {
    await runAdmittedModalPartWith(sql, part("settled"), async () => ({ segments: SEG, tokens: 7 }));
    await sql`update work_admissions set status = 'unknown' where user_id = 'k'`;
    await sql`delete from run_modal_parts where ticket_id = 't1' and part_hash = 'settled'`;
    await sql`insert into run_modal_settlements (attempt, ticket_id, part_hash, status)
      values ('lost-attempt', 't1', 'lost-part', 'mat-phan-hoi')`;
    await sql`insert into work_admissions (id, user_id, provider, model, lane, status, ref)
      values ('lost-k', 'k', 'tyzo-modal', 'tyzo-modal-nhanh', 'modal', 'unknown', 'modal:t1:lost-part:lost-attempt')`;
    assert.equal((await sweepAdmissions(sql)).resolved, 1);
    const leases = await sql<{ status: string }>`select status from work_admissions order by status`;
    assert.deepEqual(leases.map((row) => row.status), ["resolved", "unknown"]);
    const audit = await sql<{ note: string }>`select note from room_audit where action = 'tu-doi-soat-suat' and target_id = 'k'`;
    assert.equal(JSON.parse(audit.at(-1)!.note).evidence, "run_modal_settlements:xong");
    assert.equal((await ticket()).charged, 7);
  });

  it("hết lượt chờ và hủy chờ đều dừng gửi", async () => {
    const controller = new AbortController();
    const busy = { kind: "busy", message: "Hết suất.", retryAfter: 1 } as const;
    let submits = 0;
    const submit = async () => { submits++; return busy; };
    await assert.rejects(submitModalChunk(submit, controller.signal, undefined, async (ms) => {
      assert.equal(ms, 2000);
    }), /Hết suất/);
    assert.equal(submits, 31);
    await assert.rejects(submitModalChunk(submit, controller.signal, undefined, async () => {
      controller.abort();
    }), { name: "AbortError" });
    assert.equal(submits, 32);
  });
});
