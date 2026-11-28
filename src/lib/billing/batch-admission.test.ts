/**
 * TZ-002 / B-14: lane batch. Suất unknown chưa có ref (chết trước khi gắn mã lệnh) phải được nhả, không chặn việc mới mãi mãi.
 * Chạy trên PGLite; đặt TYZO_TEST_PG_URL để chạy trên Postgres thật.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, it } from "node:test";
import type { Sql } from "../db.ts";
import { pgliteSql, realPgSql } from "../test-sql.ts";
import { AdmissionUncertain, acquireWorkInfo, sweepAdmissions } from "./work-admission.ts";

let sql: Sql;
let end: (() => Promise<void>) | undefined;
const KEY = { userId: "k", provider: "groq", model: "whisper-large-v3", lane: "batch" } as const;

before(async () => {
  const real = await realPgSql();
  if (real) ({ sql, end } = real);
  else sql = await pgliteSql();
});
after(async () => {
  await end?.();
});
beforeEach(async () => {
  await sql`delete from work_admissions`;
  await sql`delete from room_audit where action = 'tu-doi-soat-suat'`;
});

const add = (id: string, lane: string, ref: string | null, age: string) =>
  sql`insert into work_admissions (id, user_id, provider, model, lane, status, ref, finished_at)
    values (${id}, 'k', 'groq', 'whisper-large-v3', ${lane}, 'unknown', ${ref}, clock_timestamp() - ${age}::interval)`;

describe("B-14: suất batch unknown chưa có ref", () => {
  it("quá một chu kỳ lease → được nhả có ghi vết; mới mất lease, đã có ref chưa rõ, lane live → giữ nguyên", async () => {
    await add("batch-chet", "batch", null, "10 minutes");
    await add("batch-vua-mat", "batch", null, "0 seconds");
    await add("batch-da-gui", "batch", "call-abc", "10 minutes");
    await add("live-chet", "live", null, "10 minutes");
    await sweepAdmissions(sql);
    const rows = await sql<{ id: string; status: string }>`select id, status from work_admissions order by id`;
    assert.deepEqual(rows, [
      { id: "batch-chet", status: "resolved" },
      { id: "batch-da-gui", status: "unknown" },
      { id: "batch-vua-mat", status: "unknown" },
      { id: "live-chet", status: "unknown" },
    ]);
    const audit = await sql<{ note: string }>`select note from room_audit where action = 'tu-doi-soat-suat' and note like '%batch-chet%'`;
    assert.equal(audit.length, 1);
    assert.match(audit[0].note, /chua-gui-truoc-khi-gan-ref/);
  });

  it("việc batch mới của cùng người dùng được nhận ngay (đối soát khi hỏi), không bị 409", async () => {
    await add("batch-chet", "batch", null, "10 minutes");
    const got = await acquireWorkInfo(sql, KEY);
    assert.ok(got.id, "phải nhận được suất");
    const old = await sql<{ status: string }>`select status from work_admissions where id = 'batch-chet'`;
    assert.equal(old[0].status, "resolved");
  });

  it("suất batch đã có ref mà chưa có bằng chứng vẫn chặn việc mới (không nhả suất chưa rõ kết quả)", async () => {
    await add("batch-da-gui", "batch", "call-abc", "10 minutes");
    await assert.rejects(acquireWorkInfo(sql, KEY), AdmissionUncertain);
  });
});

describe("B-14: mọi đường gửi batch gắn ref trước, chỉ khi suất còn running", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  it("run-gate.ts dùng tagWorkBeforeSend và dừng trước khi gửi nếu suất đã mất", () => {
    const gate = read("./run-gate.ts");
    assert.doesNotMatch(gate, /\btagWork\b(?!BeforeSend)/);
    assert.equal(gate.match(/tagWorkBeforeSend\(sql, input\.admissionId, [\w.]+\)\) throw new Error\(ADMISSION_LAPSED\)/g)?.length, 2);
    for (const marker of ["await input.send()"]) assert.ok(gate.includes(marker));
    const speech = gate.indexOf("tagWorkBeforeSend(sql, input.admissionId, held.callId)");
    assert.ok(speech > 0 && speech < gate.indexOf("await input.send()"));
    const chat = gate.indexOf("tagWorkBeforeSend(sql, input.admissionId, callId)");
    assert.ok(chat > 0 && chat < gate.lastIndexOf("await input.send()"));
  });
  it("async-asr.ts gắn ref trong giao dịch chỉ khi running và hủy giao dịch nếu không gắn được", () => {
    const asr = read("./async-asr.ts");
    assert.match(asr, /set ref = \$\{held\.callId\} where id = \$\{admission\.id\} and status = 'running' returning id/);
    assert.doesNotMatch(asr, /status in \('running','unknown'\)/);
    assert.ok(asr.indexOf("returning id") < asr.indexOf("taskId = await send()"));
  });
});
