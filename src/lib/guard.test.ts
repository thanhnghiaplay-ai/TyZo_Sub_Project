import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { AccountBlockedError, RateLimitError, requireOpenAccountWith, takeRateWith } from "./guard.ts";

let sql: Sql;

before(async () => {
  const db = new PGlite();
  const dir = new URL("../../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(new URL(file, dir), "utf8"));
  }
  sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return (await db.query(text, values)).rows;
  }) as unknown as Sql;
});

describe("requireOpenAccount", () => {
  it("tài khoản chưa có dòng hoặc đang mở thì qua", async () => {
    await requireOpenAccountWith(sql, "chua-co");
    await sql`insert into room_accounts (user_id) values ('mo')`;
    await requireOpenAccountWith(sql, "mo");
  });

  it("khóa hoặc cấm thì ném lỗi 403 kèm lý do", async () => {
    await sql`insert into room_accounts (user_id, status, status_reason) values ('khoa', 'locked', 'Dùng chung')`;
    await sql`insert into room_accounts (user_id, status) values ('cam', 'banned')`;
    await assert.rejects(requireOpenAccountWith(sql, "khoa"), (e: unknown) => {
      assert.ok(e instanceof AccountBlockedError);
      assert.equal(e.status, 403);
      assert.match(e.message, /khóa: Dùng chung/);
      return true;
    });
    await assert.rejects(requireOpenAccountWith(sql, "cam"), /bị cấm/);
  });

  it("trạng thái lạ cũng bị chặn", async () => {
    await sql`insert into room_accounts (user_id, status) values ('la', 'weird')`;
    await assert.rejects(requireOpenAccountWith(sql, "la"), AccountBlockedError);
  });
});

describe("takeRate", () => {
  it("cho đủ số lần rồi chặn, kèm số giây chờ", async () => {
    const now = 1_000_000_000_000;
    for (let i = 0; i < 3; i += 1) await takeRateWith(sql, "a", 3, 60, now);
    await assert.rejects(takeRateWith(sql, "a", 3, 60, now + 1000), (e: unknown) => {
      assert.ok(e instanceof RateLimitError);
      assert.equal(e.status, 429);
      assert.ok(e.retryAfter >= 1 && e.retryAfter <= 60);
      return true;
    });
  });

  it("sang cửa sổ mới và khóa khác thì đếm lại", async () => {
    const now = 2_000_000_000_000;
    await takeRateWith(sql, "b", 1, 60, now);
    await assert.rejects(takeRateWith(sql, "b", 1, 60, now), RateLimitError);
    await takeRateWith(sql, "b", 1, 60, now + 61_000);
    await takeRateWith(sql, "c", 1, 60, now);
  });

  it("đồng thời: 20 yêu cầu cùng lúc với hạn 5 thì đúng 5 qua", async () => {
    const now = 3_000_000_000_000;
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => takeRateWith(sql, "race", 5, 60, now)));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 5);
    assert.equal(results.filter((r) => r.status === "rejected").length, 15);
  });
});
