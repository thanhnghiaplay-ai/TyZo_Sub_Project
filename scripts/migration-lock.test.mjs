import assert from "node:assert/strict";
import { test } from "node:test";
import { applyMigrations, MIGRATION_LOCK_KEY } from "./migration-lock.mjs";

/**
 * Máy khách giả: ghi lại mọi câu lệnh. `lockGrants` là dãy kết quả của
 * pg_try_advisory_xact_lock, `applied` là nội dung bảng _migrations.
 */
function fakeClient({ applied = [], lockGrants = [true], missingTable = false } = {}) {
  const log = [];
  const grants = [...lockGrants];
  const done = new Set(applied);
  let table = !missingTable;
  return {
    log,
    async query(text, params = []) {
      log.push(text.trim().split("\n")[0].slice(0, 60));
      if (/^SELECT name FROM _migrations/i.test(text)) {
        if (!table) throw Object.assign(new Error("relation does not exist"), { code: "42P01" });
        return { rows: [...done].map((name) => ({ name })) };
      }
      if (/pg_try_advisory_xact_lock/i.test(text)) {
        assert.equal(params[0], MIGRATION_LOCK_KEY);
        return { rows: [{ ok: grants.length > 1 ? grants.shift() : grants[0] }] };
      }
      if (/^CREATE TABLE IF NOT EXISTS _migrations/i.test(text)) {
        table = true;
        return { rows: [] };
      }
      if (/^SELECT 1 FROM _migrations/i.test(text)) return { rows: done.has(params[0]) ? [{}] : [] };
      if (/^INSERT INTO _migrations/i.test(text)) {
        done.add(params[0]);
        return { rows: [] };
      }
      return { rows: [] };
    },
  };
}

const files = [
  { name: "0002_b.sql", text: "create table b(id int);" },
  { name: "0001_a.sql", text: "create table a(id int);" },
];
const instant = { sleep: async () => undefined };

test("không có gì chờ thì không đụng tới khóa", async () => {
  const client = fakeClient({ applied: ["0001_a.sql", "0002_b.sql"] });
  assert.equal(await applyMigrations(client, files, instant), 0);
  assert.deepEqual(client.log, ["SELECT name FROM _migrations"]);
});

test("áp dụng theo thứ tự tên, mỗi file một giao dịch có khóa", async () => {
  const client = fakeClient({ applied: [] });
  const names = [];
  assert.equal(await applyMigrations(client, files, { ...instant, onApplied: (name) => names.push(name) }), 2);
  assert.deepEqual(names, ["0001_a.sql", "0002_b.sql"]);
  assert.equal(client.log.filter((line) => line === "BEGIN").length, 2);
  assert.equal(client.log.filter((line) => line === "COMMIT").length, 2);
  assert.ok(client.log.some((line) => /pg_try_advisory_xact_lock/.test(line)));
  // Không còn khóa mức phiên, thứ rò qua pooler và làm mọi bản sau chờ vô hạn.
  assert.ok(!client.log.some((line) => /pg_advisory_lock|pg_advisory_unlock/.test(line)));
});

test("database trống: bảng _migrations được tạo dưới khóa", async () => {
  const client = fakeClient({ missingTable: true });
  assert.equal(await applyMigrations(client, files.slice(1), instant), 1);
  const create = client.log.findIndex((line) => /^CREATE TABLE IF NOT EXISTS _migrations/.test(line));
  assert.ok(create > client.log.indexOf("BEGIN"), "tạo bảng phải nằm trong giao dịch");
  assert.ok(create > client.log.findIndex((line) => /pg_try_advisory_xact_lock/.test(line)), "tạo bảng sau khi có khóa");
});

test("chưa lấy được khóa thì chờ rồi thử lại, không chờ vô hạn", async () => {
  const client = fakeClient({ lockGrants: [false, false, true] });
  let waited = 0;
  const count = await applyMigrations(client, files.slice(1), { sleep: async () => void (waited += 1) });
  assert.equal(count, 1);
  assert.equal(waited, 2);
  // Mỗi lần không được khóa thì trả giao dịch lại ngay.
  assert.equal(client.log.filter((line) => line === "ROLLBACK").length, 2);
});

test("quá hạn chờ khóa thì ném lỗi rõ ràng", async () => {
  const client = fakeClient({ lockGrants: [false] });
  let clock = 0;
  await assert.rejects(
    applyMigrations(client, files.slice(1), {
      waitMs: 1000,
      pollMs: 400,
      now: () => clock,
      sleep: async (ms) => void (clock += ms),
    }),
    /khóa migration/,
  );
  assert.ok(clock >= 1000);
  assert.ok(!client.log.includes("COMMIT"));
});

test("bản khác đã áp dụng file trong lúc ta chờ thì bỏ qua, không chạy lại", async () => {
  const client = fakeClient({ applied: [] });
  const original = client.query.bind(client);
  // Giữa lúc đọc danh sách và lúc có khóa, bản khác chèn 0001_a.sql.
  client.query = async (text, params) => {
    if (/pg_try_advisory_xact_lock/i.test(text)) await original("INSERT INTO _migrations (name) VALUES ($1)", ["0001_a.sql"]);
    return original(text, params);
  };
  assert.equal(await applyMigrations(client, files.slice(1), instant), 0);
  assert.ok(!client.log.includes("create table a(id int);"));
});

test("lỗi trong file thì ROLLBACK, không ghi vào _migrations, ném lỗi gốc", async () => {
  const client = fakeClient();
  const original = client.query.bind(client);
  client.query = async (text, params) => {
    if (/^create table a/i.test(text)) throw new Error("cú pháp sai");
    return original(text, params);
  };
  await assert.rejects(applyMigrations(client, files.slice(1), instant), /cú pháp sai/);
  assert.ok(client.log.includes("ROLLBACK"));
  assert.ok(!client.log.some((line) => /^INSERT INTO _migrations/.test(line)));
});

test("file có BEGIN hoặc COMMIT bị từ chối trước khi chạm database", async () => {
  const client = fakeClient();
  await assert.rejects(
    applyMigrations(client, [{ name: "0009_x.sql", text: "BEGIN;\ncreate table x(id int);\nCOMMIT;" }], instant),
    /BEGIN, COMMIT hoặc ROLLBACK/,
  );
  assert.ok(!client.log.includes("BEGIN"));
});
