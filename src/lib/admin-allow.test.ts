import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { isOwnerId, ownerEmails, transferOwner } from "./admin-allow.server.ts";

let sql: Sql;

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

async function user(id: string, email: string, verified: boolean) {
  await sql`insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values (${id}, ${id}, ${email}, ${verified}, now(), now())`;
}

describe("quyền Chủ nằm trong database", () => {
  const previous = process.env.ADMIN_EMAIL;
  const previousFrom = process.env.MAIL_FROM;
  const previousKey = process.env.RESEND_API_KEY;
  beforeEach(async () => {
    await sql`delete from room_staff`;
    await sql`delete from "user"`;
    delete process.env.ADMIN_EMAIL;
    delete process.env.MAIL_FROM;
    delete process.env.RESEND_API_KEY;
  });
  afterEach(() => {
    if (previous == null) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previous;
    if (previousFrom == null) delete process.env.MAIL_FROM;
    else process.env.MAIL_FROM = previousFrom;
    if (previousKey == null) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  });

  function mailOn() {
    process.env.MAIL_FROM = "TyZo <a@b.vn>";
    process.env.RESEND_API_KEY = "test";
  }

  it("không có dòng role chu thì không ai là Chủ, kể cả khi email giống biến môi trường cũ", async () => {
    await user("a", "chu@tyzo.test", true);
    assert.equal(await isOwnerId(sql, "a"), false);
    assert.deepEqual(await ownerEmails(sql), []);
  });

  it("chưa gửi được thư thì Chủ chưa xác minh vẫn vào được", async () => {
    await user("a", "chu@tyzo.test", false);
    await sql`insert into room_staff (user_id, role) values ('a', 'chu')`;
    assert.equal(await isOwnerId(sql, "a"), true);
  });

  it("đã gửi được thư thì Chủ chưa xác minh không được tính", async () => {
    mailOn();
    await user("a", "chu@tyzo.test", false);
    await sql`insert into room_staff (user_id, role) values ('a', 'chu')`;
    assert.equal(await isOwnerId(sql, "a"), false);
  });

  it("có dòng chu và đã xác minh thì là Chủ", async () => {
    await user("a", "chu@tyzo.test", true);
    await sql`insert into room_staff (user_id, role) values ('a', 'chu')`;
    assert.equal(await isOwnerId(sql, "a"), true);
    assert.deepEqual(await ownerEmails(sql), ["chu@tyzo.test"]);
  });

  it("chưa gửi được thư thì ADMIN_EMAIL khởi tạo cả email chưa xác minh", async () => {
    process.env.ADMIN_EMAIL = "Chu@TyZo.test";
    await user("a", "chu@tyzo.test", false);
    assert.equal(await isOwnerId(sql, "a"), true);
  });

  it("đã gửi được thư thì ADMIN_EMAIL chỉ khởi tạo email đã xác minh", async () => {
    mailOn();
    process.env.ADMIN_EMAIL = "Chu@TyZo.test";
    await user("a", "chu@tyzo.test", false);
    assert.equal(await isOwnerId(sql, "a"), false);
    await sql`update "user" set "emailVerified" = true where id = 'a'`;
    assert.equal(await isOwnerId(sql, "a"), true);
  });

  it("sau khi chuyển quyền, ADMIN_EMAIL không đòi lại quyền", async () => {
    process.env.ADMIN_EMAIL = "chu@tyzo.test";
    await user("a", "chu@tyzo.test", true);
    await user("b", "moi@tyzo.test", true);
    assert.equal(await isOwnerId(sql, "a"), true);
    await transferOwner(sql, "a", "moi@tyzo.test");
    assert.equal(await isOwnerId(sql, "b"), true);
    assert.equal(await isOwnerId(sql, "a"), false);
  });

  it("đã gửi được thư thì chuyển quyền cho email chưa đăng ký hoặc chưa xác minh thì báo lỗi", async () => {
    mailOn();
    await user("a", "chu@tyzo.test", true);
    await user("c", "chua@tyzo.test", false);
    await assert.rejects(transferOwner(sql, "a", "khong-co@tyzo.test"), /Chưa có tài khoản/);
    await assert.rejects(transferOwner(sql, "a", "chua@tyzo.test"), /chưa xác minh/);
  });
});
