/**
 * Kiểm toán RE3-001: quyết toán usage Dịch trực tiếp phải nguyên tử (journal chi phí + trừ phiếu + biên nhận).
 * Chạy trên PostgreSQL thật riêng (TYZO_TEST_PG_URL, mỗi lần một schema `thu_…` bỏ đi sau). Alibaba giả, không gọi nhà thật.
 *
 * Mỗi kịch bản chèn đúng một lỗi vào một điểm của đường ghi sổ rồi so với phiên đối chứng không lỗi:
 * tổng Token đã trừ, số quan sát chi phí và tổng chi phí nhà cung cấp phải bằng nhau (đúng một lần, không mất usage).
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import WebSocket, { WebSocketServer } from "ws";
import type { Sql } from "../db.ts";
import { realPgSql } from "../test-sql.ts";
import { attachLiveBridge } from "./live-bridge.ts";
import { createLiveBilling } from "./live-billing.ts";
import { signLiveTicket } from "./live-ticket.ts";
import { LIVE_MODEL_38, LIVE_FALLBACK_ROWS } from "./live-price.ts";
import type { LiveBook } from "./live-cost.ts";
import { buyGiayWith } from "../billing/token-flow.ts";

const pgTest = process.env.TYZO_TEST_PG_URL ? test : test.skip;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const book: LiveBook = { rate: 26000, rows: LIVE_FALLBACK_ROWS };
let sql: Sql;
let end: (() => Promise<void>) | undefined;

before(async () => {
  const db = await realPgSql();
  if (db) ({ sql, end } = db);
});
after(async () => {
  await end?.();
});

type Fault = {
  /** Lỗi khi câu lệnh khớp (lần thứ `nth`, mặc định 1), trước khi chạy. */
  before?: { match: RegExp; nth?: number };
  /** Giao dịch đã COMMIT nhưng phản hồi về ứng dụng bị mất (mất ACK), một lần. */
  lostAckAfterCommit?: boolean;
  /** Lỗi ngay sau khi câu lệnh khớp chạy xong (đã ghi), một lần; trong giao dịch thì giao dịch bị hủy. */
  afterStatement?: { match: RegExp };
  /** CSDL «mất» cho lệnh khớp chừng nào `down()` còn true (sự cố kéo dài). */
  outage?: { match: RegExp; down: () => boolean };
};

/** Bọc Sql để chèn lỗi. Mỗi lỗi chỉ xảy ra một lần (lần thử lại thành công nếu mã có thử lại). */
function faulty(base: Sql, fault: Fault): Sql {
  let seen = 0;
  let beforeFired = false,
    afterFired = false,
    ackFired = false;
  const wrap = (target: Sql, inTx: boolean): Sql => {
    const fn = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.join("?");
      if (fault.outage?.down() && fault.outage.match.test(text))
        throw Object.assign(new Error("synthetic outage"), { code: "57P01" });
      if (fault.before && !beforeFired && fault.before.match.test(text)) {
        seen += 1;
        if (seen === (fault.before.nth ?? 1)) {
          beforeFired = true;
          throw Object.assign(new Error("synthetic fault before statement"), { code: "08006" });
        }
      }
      const out = await (target as unknown as (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>)(
        strings,
        ...values,
      );
      if (fault.afterStatement && !afterFired && fault.afterStatement.match.test(text)) {
        afterFired = true;
        throw Object.assign(new Error("synthetic fault after statement"), { code: "08006" });
      }
      return out;
    }) as unknown as Sql;
    fn.query = target.query;
    fn.begin = async (body) => {
      const result = await target.begin!((tx) => body(wrap(tx, true)));
      if (!inTx && fault.lostAckAfterCommit && !ackFired) {
        ackFired = true;
        throw Object.assign(new Error("synthetic lost ACK after COMMIT"), { code: "08006" });
      }
      return result;
    };
    return fn;
  };
  return wrap(base, false);
}

function fakeAli(reports: number[]) {
  const wss = new WebSocketServer({ port: 0 });
  wss.on("connection", (ws) => {
    let chunks = 0;
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString()) as { type: string };
      if (msg.type === "session.update") ws.send(JSON.stringify({ type: "session.updated" }));
      else if (msg.type === "input_audio_buffer.append") {
        chunks += 1;
        if (chunks === 1) {
          // Bộ đếm cộng dồn của phiên (R09): mỗi báo cáo lớn dần.
          reports.forEach((audio, i) =>
            ws.send(
              JSON.stringify({
                type: "response.done",
                response: {
                  id: `resp-${i}`,
                  status: "completed",
                  usage: {
                    input_tokens_details: { audio_tokens: audio },
                    output_tokens_details: { text_tokens: 5 * (i + 1), audio_tokens: 0 },
                  },
                },
              }),
            ),
          );
        }
      } else if (msg.type === "session.finish") ws.send(JSON.stringify({ type: "session.finished" }));
    });
  });
  return { wss, url: `ws://127.0.0.1:${(wss.address() as { port: number }).port}/realtime` };
}

async function runSession(db: Sql, user: string, reports: number[], onStop?: () => void) {
  await sql`insert into room_accounts (user_id, balance) values (${user}, 10) on conflict (user_id) do update set balance = 10`;
  const bought = await buyGiayWith(sql, user, { grantId: `g-${user}`, tokens: 100000, days: 30, price: 1, note: "fixture" });
  assert.ok(!("error" in bought), "fixture: mua gói thử không thành");
  const ali = fakeAli(reports);
  const server = createServer();
  const states: unknown[] = [];
  const logs: string[] = [];
  attachLiveBridge(server, {
    secret: "k",
    upstream: async () => ({ url: ali.url, key: "K" }),
    billing: createLiveBilling(db, { book: async () => book }),
    admit: async () => async (state?: string) => {
      states.push(state ?? "done");
    },
    toGiay: (base) => Math.ceil(base * 10),
    blockSeconds: 120,
    drainMs: 1500,
    log: (m) => logs.push(m),
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  const token = signLiveTicket("k", {
    uid: user,
    sid: `sid-${user}`,
    model: LIVE_MODEL_38,
    target: "en",
    source: "",
    audio: false,
    exp: Date.now() + 60_000,
  });
  const client = new WebSocket(`ws://127.0.0.1:${port}/live?ticket=${encodeURIComponent(token)}`);
  const msgs: Array<{ type: string }> = [];
  client.on("message", (d, bin) => {
    if (!bin) msgs.push(JSON.parse(d.toString()));
  });
  const closed = new Promise<void>((r) => client.on("close", () => r()));
  for (let i = 0; i < 300 && !msgs.some((m) => m.type === "ready"); i += 1) await wait(10);
  client.send(Buffer.alloc(3200, 1));
  await wait(400);
  onStop?.();
  if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: "stop" }));
  await closed;
  await wait(300);
  server.close();
  ali.wss.close();
  const charged = await sql<{ n: number }>`
    select coalesce(sum(charged),0)::int as n from run_tickets where user_id = ${user}`;
  return { charged: charged[0].n, states, logs, msgs };
}

/** Chi phí nhà cung cấp và số quan sát chỉ của phiên vừa chạy (so trước/sau). */
async function journalSnapshot() {
  const rows = await sql<{ n: number; base: string }>`
    select count(*)::int as n, coalesce(sum(base_vnd),0)::text as base from provider_spend_events`;
  return { n: rows[0].n, base: Number(rows[0].base) };
}

async function measured(db: Sql, user: string, reports: number[], onStop?: () => void) {
  const before = await journalSnapshot();
  const out = await runSession(db, user, reports, onStop);
  const afterJ = await journalSnapshot();
  return { ...out, observations: afterJ.n - before.n, supplier: +(afterJ.base - before.base).toFixed(6) };
}

const REPORTS = [500, 1000, 1600];

pgTest("RE3-001: đối chứng không lỗi trừ đúng và ghi đủ quan sát", async () => {
  const control = await measured(sql, "ctl", REPORTS);
  assert.ok(control.charged > 0, JSON.stringify(control));
  assert.ok(control.supplier > 0, JSON.stringify(control));
  assert.equal(control.observations, REPORTS.length);
  assert.deepEqual(control.states, ["done"]);
});

for (const [name, fault] of [
  ["lỗi sau khi journal đã ghi, trước khi trừ phiếu", { before: { match: /update token_slices/ } }],
  ["mất ACK sau khi journal đã commit", { afterStatement: { match: /insert into provider_spend_events/ } }],
  ["mất ACK sau khi giao dịch quyết toán đã commit", { lostAckAfterCommit: true }],
] as Array<[string, Fault]>) {
  pgTest(`RE3-001: ${name} → tổng trừ và chi phí bằng đối chứng, đúng một lần`, async () => {
    const tag = name.replace(/[^a-z]/gi, "").slice(0, 12) + Math.floor(Math.random() * 1e6);
    const control = await measured(sql, `c-${tag}`, REPORTS);
    assert.ok(control.charged > 0 && control.observations === REPORTS.length, "đối chứng phải có tiền thật");
    const hurt = await measured(faulty(sql, fault), `f-${tag}`, REPORTS);
    assert.equal(
      hurt.charged,
      control.charged,
      `Token đã trừ lệch: lỗi=${hurt.charged} đối chứng=${control.charged}; logs=${hurt.logs.join(" | ")}`,
    );
    assert.equal(hurt.observations, control.observations, "số quan sát chi phí lệch");
    assert.equal(hurt.supplier, control.supplier, "chi phí nhà cung cấp lệch");
  });
}

pgTest("RE3-001: CSDL mất kéo dài → không nhả phiếu, không trừ đoán, admission unknown để đối soát", async () => {
  const hurt = await measured(
    faulty(sql, { outage: { match: /live_usage_receipts|provider_spend_events|update token_slices/, down: () => true } }),
    `outage-${Math.floor(Math.random() * 1e6)}`,
    REPORTS,
  );
  assert.equal(hurt.charged, 0);
  assert.equal(hurt.observations, 0);
  assert.deepEqual(hurt.states, ["unknown"]);
  const held = await sql<{ n: number }>`
    select count(*)::int n from run_tickets where user_id like 'outage-%' and status = 'dang-giu' and held > 0`;
  assert.ok(held[0].n >= 1, "phiếu phải còn giữ để đối soát");
  assert.ok(hurt.logs.some((l) => l.includes("giữ") && l.includes("đối soát")), hurt.logs.join(" | "));
});

pgTest("RE3-001: CSDL hồi trước khi đóng phiên → phát lại biên nhận, tổng bằng đối chứng", async () => {
  const tag = Math.floor(Math.random() * 1e6);
  const control = await measured(sql, `rc-${tag}`, REPORTS);
  let down = true;
  const hurt = await measured(
    faulty(sql, { outage: { match: /live_usage_receipts|update token_slices/, down: () => down } }),
    `rf-${tag}`,
    REPORTS,
    () => {
      down = false;
    },
  );
  assert.equal(hurt.charged, control.charged, hurt.logs.join(" | "));
  assert.equal(hurt.observations, control.observations);
  assert.equal(hurt.supplier, control.supplier);
});
