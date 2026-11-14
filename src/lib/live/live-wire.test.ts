import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "../db.ts";
import { createLiveBilling } from "./live-billing.ts";
import { loadLiveBook } from "./live-book.ts";
import type { LiveBook } from "./live-cost.ts";
import { bridgeBase, parseLiveOpen } from "./live-open-rules.ts";
import { LIVE_FALLBACK_ROWS, LIVE_MODEL_38 } from "./live-price.ts";
import { loadLiveUpstream, liveUpstreamUrl, validWorkspaceId } from "./live-upstream.ts";

let sql: Sql;
const book: LiveBook = { rate: 26000, markup: 0, rows: LIVE_FALLBACK_ROWS };

before(async () => {
  const db = new PGlite();
  const dir = new URL("../../../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) await db.exec(readFileSync(new URL(file, dir), "utf8"));
  sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return (await db.query(text, values)).rows;
  }) as unknown as Sql;
});

const balanceOf = async (user: string) => Number((await sql<{ balance: number }>`select balance from room_accounts where user_id = ${user}`)[0]?.balance ?? 0);
const ticketOf = async (id: string) => (await sql<{ held: number; charged: number; status: string }>`select held, charged, status from run_tickets where id = ${id}`)[0];

async function reset(balance: number) {
  await sql`delete from run_tickets`;
  await sql`delete from room_ledger`;
  await sql`delete from room_settings`;
  await sql`delete from room_accounts`;
  await sql`insert into room_accounts (user_id, balance) values ('k', ${balance})`;
}

describe("LiveBilling nối vào DB", () => {
  beforeEach(() => reset(10_000));
  const billing = () => createLiveBilling(sql, { book: async () => book, cap: async () => 0, now: () => new Date("2026-11-14T03:00:00Z") });

  it("giữ tiền, trừ theo token, nhả phần thừa", async () => {
    const live = billing();
    assert.deepEqual(await live.open({ userId: "k", ticketId: "s1-1", hold: 3000, seconds: 120, model: LIVE_MODEL_38 }), { ok: true });
    assert.equal(await balanceOf("k"), 7000);
    assert.equal(await live.charge({ userId: "k", ticketId: "s1-1", cost: 800, base: 700 }), 800);
    await live.close({ userId: "k", ticketId: "s1-1", failed: false });
    assert.equal(await balanceOf("k"), 9200);
    assert.deepEqual(await ticketOf("s1-1"), { held: 0, charged: 800, status: "da-tru" });
  });

  it("không trừ quá số đang giữ", async () => {
    const live = billing();
    await live.open({ userId: "k", ticketId: "s2-1", hold: 500, seconds: 120, model: LIVE_MODEL_38 });
    assert.equal(await live.charge({ userId: "k", ticketId: "s2-1", cost: 900, base: 800 }), 500);
    assert.equal(await balanceOf("k"), 9500);
  });

  it("hết tiền thì báo het-tien, không tạo phiếu", async () => {
    const live = billing();
    assert.deepEqual(await live.open({ userId: "k", ticketId: "s3-1", hold: 20_000, seconds: 120, model: LIVE_MODEL_38 }), { ok: false, reason: "het-tien" });
    assert.equal(await ticketOf("s3-1"), undefined);
    assert.equal(await balanceOf("k"), 10_000);
  });

  it("quá hạn mức ngày thì báo qua-han-muc", async () => {
    const live = createLiveBilling(sql, { book: async () => book, cap: async () => 1000, now: () => new Date("2026-11-14T03:00:00Z") });
    assert.deepEqual(await live.open({ userId: "k", ticketId: "s4-1", hold: 1500, seconds: 120, model: LIVE_MODEL_38 }), { ok: false, reason: "qua-han-muc" });
  });

  it("phiên lỗi không tính tiền, đóng hai lần không nhả hai lần", async () => {
    const live = billing();
    await live.open({ userId: "k", ticketId: "s5-1", hold: 2000, seconds: 120, model: LIVE_MODEL_38 });
    await live.close({ userId: "k", ticketId: "s5-1", failed: true });
    await live.close({ userId: "k", ticketId: "s5-1", failed: true });
    assert.equal(await balanceOf("k"), 10_000);
    assert.equal((await ticketOf("s5-1")).status, "loi");
  });
});

describe("bảng giá live từ cài đặt phòng", () => {
  beforeEach(() => reset(0));

  it("chưa có tỉ giá thì null, không đoán", async () => {
    assert.equal(await loadLiveBook(sql, async () => ""), null);
  });

  it("có tỉ giá và phần chênh Alibaba thì dùng giá dự phòng khi chưa kéo được giá", async () => {
    await sql`insert into room_settings (key, value) values ('run_board', ${JSON.stringify({ at: Date.now(), board: { rate: 25500, rows: [] } })})`;
    await sql`insert into room_settings (key, value) values ('alibaba_desk', ${JSON.stringify({ markup: 30 })})`;
    const loaded = await loadLiveBook(sql, async () => {
      throw new Error("không có mạng");
    });
    assert.equal(loaded?.rate, 25500);
    assert.equal(loaded?.markup, 30);
    assert.deepEqual(loaded?.rows, LIVE_FALLBACK_ROWS);
  });
});

describe("địa chỉ Alibaba", () => {
  beforeEach(() => reset(0));

  it("ghép đúng dạng wss theo Workspace ID", () => {
    assert.equal(
      liveUpstreamUrl("ws-abc123", LIVE_MODEL_38),
      `wss://ws-abc123.ap-southeast-1.maas.aliyuncs.com/api-ws/v1/realtime?model=${LIVE_MODEL_38}`,
    );
  });
  it("Workspace ID sai dạng bị loại", () => {
    for (const bad of ["", "a", "ws.evil.com/x", "ws abc", "-abc", undefined]) assert.equal(validWorkspaceId(bad), false);
    assert.equal(validWorkspaceId("llm-8a1b2c3d"), true);
  });
  it("thiếu key hoặc thiếu Workspace ID thì null", async () => {
    assert.equal(await loadLiveUpstream(sql, LIVE_MODEL_38, "ws-abc123"), null);
    await sql`insert into room_settings (key, value) values ('alibaba_key', 'sk-abcdefghijklmnopqrstuvwxyz')`;
    assert.equal(await loadLiveUpstream(sql, LIVE_MODEL_38, undefined), null);
  });
  it("Workspace ID lấy từ biến môi trường hoặc từ cài đặt phòng", async () => {
    await sql`insert into room_settings (key, value) values ('alibaba_key', 'sk-abcdefghijklmnopqrstuvwxyz')`;
    assert.match((await loadLiveUpstream(sql, LIVE_MODEL_38, "ws-env"))!.url, /^wss:\/\/ws-env\./);
    await sql`insert into room_settings (key, value) values ('alibaba_workspace', 'ws-saved')`;
    assert.match((await loadLiveUpstream(sql, LIVE_MODEL_38, undefined))!.url, /^wss:\/\/ws-saved\./);
  });
});

describe("luật xin vé", () => {
  it("chỉ nhận model và ngôn ngữ đã hỗ trợ", () => {
    assert.deepEqual(parseLiveOpen({ model: LIVE_MODEL_38, target: "en", source: "", audio: true }), { model: LIVE_MODEL_38, target: "en", source: "", audio: true });
    assert.throws(() => parseLiveOpen({ model: "gpt-x", target: "en" }), /Model/);
    assert.throws(() => parseLiveOpen({ model: LIVE_MODEL_38, target: "xx" }), /đích/);
    assert.throws(() => parseLiveOpen({ model: LIVE_MODEL_38, target: "en", source: "xx" }), /nguồn/);
    assert.throws(() => parseLiveOpen(null), /Model/);
  });
  it("địa chỉ cầu nối chỉ nhận ws hoặc wss và bỏ phần vé", () => {
    assert.equal(bridgeBase("wss://cau-noi.example.com/live?ticket=x#y"), "wss://cau-noi.example.com/live");
    assert.equal(bridgeBase("https://cau-noi.example.com"), null);
    assert.equal(bridgeBase(undefined), null);
    assert.equal(bridgeBase("không phải địa chỉ"), null);
  });
});

describe("cầu nối không sập khi một phiên lỗi", () => {
  it("cơ sở dữ liệu đứt giữa chừng thì chỉ đóng phiên đó và vẫn nhận phiên sau", async () => {
    const { createServer } = await import("node:http");
    const { default: WebSocket } = await import("ws");
    const { attachLiveBridge } = await import("./live-bridge.ts");
    const { signLiveTicket } = await import("./live-ticket.ts");
    const secret = "bi-mat-thu-nghiem-24-ky-tu-xx";
    const logs: string[] = [];
    const server = createServer();
    attachLiveBridge(server, {
      secret,
      upstream: async () => null,
      billing: {
        book: async () => {
          throw new Error("ECONNREFUSED");
        },
        open: async () => ({ ok: false, reason: "loi" }),
        charge: async () => 0,
        close: async () => {},
      },
      log: (message) => logs.push(message),
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;
    const ticket = () => signLiveTicket(secret, { uid: "k", sid: `s${Math.random()}`, model: LIVE_MODEL_38, target: "en", source: "", audio: true, exp: Date.now() + 60_000 });
    const attempt = () =>
      new Promise<{ code: number; messages: string[] }>((resolve) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}/live?ticket=${ticket()}`);
        const messages: string[] = [];
        ws.on("message", (data) => messages.push(data.toString()));
        ws.on("close", (code) => resolve({ code, messages }));
      });
    const first = await attempt();
    const second = await attempt();
    server.close();
    assert.equal(first.code, 1011);
    assert.equal(second.code, 1011);
    assert.ok(first.messages.some((m) => m.includes("sự cố")));
    assert.equal(logs.length, 2);
  });
});
