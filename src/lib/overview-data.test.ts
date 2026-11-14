import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { overviewWith, parseRange, parseTicketFilter, searchTicketsWith } from "./overview-data.ts";

let sql: Sql;
before(async () => {
  const db = new PGlite();
  const dir = new URL("../../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) await db.exec(readFileSync(new URL(file, dir), "utf8"));
  const run = async (text: string, values: unknown[]) => (await db.query(text, values)).rows;
  sql = Object.assign(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      let text = strings[0];
      for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
      return run(text, values);
    },
    { query: (text: string, params: unknown[] = []) => run(text, params) },
  ) as unknown as Sql;
});

beforeEach(async () => {
  await sql`delete from run_tickets`;
  await sql`delete from room_ledger`;
  await sql`delete from quality_runs`;
  await sql`delete from pay_orders`;
  await sql`delete from room_settings`;
  await sql`delete from "user"`;
  await sql`insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ('u1', 'A', 'a@gmail.com', true, now(), now()), ('u2', 'B', 'b@gmail.com', true, now(), now())`;
});

const ticket = (id: string, user: string, file: string, status: string, charged = 0, extra = "") =>
  sql.query(`insert into run_tickets (id, user_id, file_name, status, charged, seconds, asr_model, chat_model ${extra ? "," + extra.split("=")[0] : ""}) values ($1, $2, $3, $4, $5, 600, 'whisper-large-v3-turbo', 'gpt-oss-20b' ${extra ? "," + extra.split("=")[1] : ""})`, [id, user, file, status, charged]);

describe("Tổng quan", () => {
  it("đọc khoảng ngày lạ về hôm nay", () => {
    assert.equal(parseRange(7), 7);
    assert.equal(parseRange(30), 30);
    assert.equal(parseRange(99), 1);
    assert.equal(parseRange(undefined), 1);
  });

  it("đếm lượt, lỗi, bỏ phiếu đọc thuyết minh", async () => {
    for (let i = 0; i < 8; i += 1) await ticket(`ok${i}`, "u1", "a.mp4", "da-tru", 1000);
    await ticket("e1", "u2", "b.mp4", "loi");
    await ticket("e2", "u2", "c.mp4", "loi");
    await ticket("tts-u1-day", "u1", "Đọc thuyết minh", "da-tru", 300);
    const view = await overviewWith(sql, 1, true);
    assert.equal(view.runs.total, 10);
    assert.equal(view.runs.errors, 2);
    assert.ok(Math.abs(view.runs.errorRate - 0.2) < 1e-9);
    assert.ok(view.alerts.some((item) => item.id === "loi-cao"));
    assert.equal(view.topErrors[0].email, "b@gmail.com");
    assert.equal(view.topErrors[0].amount, 2);
    assert.equal(view.topSpend?.[0].email, "a@gmail.com");
  });

  it("doanh thu chỉ tính tiền nạp và chỉ Chủ thấy", async () => {
    await sql`insert into room_ledger (user_id, kind, amount, note) values ('u1', 'nap', 39000, 'x'), ('u1', 'goi', -39000, 'y'), ('u2', 'nap', 9000, 'z')`;
    const owner = await overviewWith(sql, 1, true);
    assert.deepEqual(owner.revenue, { today: 48000, week: 48000, month: 48000 });
    const staff = await overviewWith(sql, 1, false);
    assert.equal(staff.revenue, null);
    assert.equal(staff.quality, null);
    assert.equal(staff.topSpend, null);
  });

  it("đơn nạp đang chờ", async () => {
    await sql`insert into pay_orders (id, user_id, provider, amount, code, status, created_at) values ('o1', 'u1', 'sepay', 9000, 'C1', 'pending', now() - interval '45 minutes'), ('o2', 'u2', 'sepay', 9000, 'C2', 'claimed', now()), ('o3', 'u2', 'sepay', 9000, 'C3', 'paid', now())`;
    const view = await overviewWith(sql, 1, false);
    assert.equal(view.orders.waiting, 2);
    assert.equal(view.orders.claimed, 1);
    assert.ok(view.orders.oldestMinutes >= 44);
    assert.ok(view.alerts.some((item) => item.id === "don-cho-lau"));
  });

  it("cảnh báo bảo trì và chưa có key", async () => {
    await sql`insert into room_settings (key, value) values ('run_desk', ${JSON.stringify({ maintenance: true, note: "Đang bảo trì hệ thống", cap: 0, markup: 0, custom: {} })})`;
    const view = await overviewWith(sql, 1, true);
    assert.ok(view.alerts.some((item) => item.id === "bao-tri"));
    assert.ok(view.alerts.some((item) => item.id === "chua-key"));
  });

  it("phiếu giữ quá 6 giờ thì cảnh báo", async () => {
    await ticket("old", "u1", "a.mp4", "dang-giu", 0, "created_at=now() - interval '8 hours'");
    const view = await overviewWith(sql, 1, false);
    assert.ok(view.alerts.some((item) => item.id === "giu-lau"));
  });
});

describe("Tìm phiếu", () => {
  it("lọc trạng thái", async () => {
    await ticket("a", "u1", "a.mp4", "dang-giu");
    await ticket("b", "u1", "b.mp4", "da-tru", 500);
    await ticket("c", "u1", "c.mp4", "dung-tien", 500);
    await ticket("d", "u1", "d.mp4", "da-nha");
    await ticket("e", "u1", "e.mp4", "loi");
    const ids = async (status: string) => (await searchTicketsWith(sql, { status: parseTicketFilter(status), q: "" })).map((row) => row.id).sort();
    assert.deepEqual(await ids("dang-giu"), ["a"]);
    assert.deepEqual(await ids("da-tru"), ["b", "c"]);
    assert.deepEqual(await ids("da-nha"), ["d"]);
    assert.deepEqual(await ids("loi"), ["e"]);
    assert.equal((await ids("all")).length, 5);
    assert.equal(parseTicketFilter("bậy"), "all");
  });

  it("tìm theo email hoặc tên tệp, không phân biệt hoa thường, không hiểu % là ký tự đặc biệt", async () => {
    await ticket("a", "u1", "Phim_Hay.mp4", "da-tru", 500);
    await ticket("b", "u2", "100%.mp4", "da-tru", 500);
    const find = async (q: string) => (await searchTicketsWith(sql, { status: "all", q }, { owner: true })).map((row) => row.id);
    assert.deepEqual(await find("b@GMAIL"), ["b"]);
    assert.deepEqual(await find("phim_hay"), ["a"]);
    assert.deepEqual(await find("%"), ["b"]);
    assert.deepEqual(await find("không có"), []);
  });

  it("trả model và thời gian xử lý, phiếu cũ để trống", async () => {
    await ticket("n", "u1", "a.mp4", "da-tru", 500);
    await sql`update run_tickets set closed_at = created_at + interval '95 seconds' where id = 'n'`;
    await ticket("o", "u1", "b.mp4", "da-tru", 500);
    const rows = await searchTicketsWith(sql, { status: "all", q: "" });
    const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
    assert.equal(byId.n.processSeconds, 95);
    assert.equal(byId.n.asrModel, "whisper-large-v3-turbo");
    assert.equal(byId.o.processSeconds, null);
  });

  it("tên tệp trả về luôn đã che; chỉ Chủ tìm được theo tên tệp, nhân viên khác vẫn tìm theo email", async () => {
    await ticket("a", "u1", "Phim_Hay.mp4", "da-tru", 500);
    const asOwner = await searchTicketsWith(sql, { status: "all", q: "" }, { owner: true });
    assert.equal(asOwner[0].fileName, "Ph•••.mp4");
    const staff = await searchTicketsWith(sql, { status: "all", q: "phim_hay" });
    assert.deepEqual(staff, []);
    const byMail = await searchTicketsWith(sql, { status: "all", q: "a@" });
    assert.ok(byMail.every((row) => !row.fileName.includes("Phim_Hay")));
  });
});
