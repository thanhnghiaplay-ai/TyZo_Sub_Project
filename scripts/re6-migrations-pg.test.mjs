import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import pg from "pg";

const target = process.env.TYZO_TEST_PG_URL;
const root = fileURLToPath(new URL("..", import.meta.url));
const files = readdirSync(join(root, "migrations")).filter((name) => name.endsWith(".sql")).sort();
const sharedCap = "0057_admission_shared_cap_fairness.sql";
const modalUsd = "0058_modal_settlement_usd.sql";

test("RE6-006: PG18 fresh, 0056 → 0058, rollback and repeat", { skip: !target }, async (t) => {
  const url = new URL(target);
  assert.ok(["127.0.0.1", "[::1]"].includes(url.hostname), "Use an isolated loopback PostgreSQL");
  for (const key of url.searchParams.keys()) assert.equal(key, "sslmode");
  const admin = new pg.Client({ connectionString: url.href });
  await admin.connect();
  const databases = [];
  t.after(async () => {
    try {
      for (const { client, name } of databases) {
        await client.end();
        await admin.query(`drop database ${name} with (force)`);
      }
    } finally {
      await admin.end();
    }
  });
  const version = await admin.query("show server_version_num");
  if (Math.floor(Number(version.rows[0].server_version_num) / 10000) !== 18) {
    t.skip("Requires PostgreSQL 18");
    return;
  }

  async function database(suffix) {
    const name = `re6_${process.pid}_${suffix}`;
    await admin.query(`create database ${name}`);
    const dbUrl = new URL(url);
    dbUrl.pathname = name;
    const client = new pg.Client({ connectionString: dbUrl.href });
    databases.push({ client, name });
    await client.connect();
    return { dbUrl, client };
  }

  const work = mkdtempSync(join(tmpdir(), "tyzo-re6-migrate-"));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  mkdirSync(join(work, "scripts"));
  mkdirSync(join(work, "migrations"));
  symlinkSync(join(root, "node_modules"), join(work, "node_modules"), "dir");
  for (const name of ["migrate.mjs", "migration-plan.mjs", "migration-gate.mjs"]) {
    cpSync(join(root, "scripts", name), join(work, "scripts", name));
  }
  function stage(name) {
    cpSync(join(root, "migrations", name), join(work, "migrations", name));
  }
  function migrate(dbUrl, dir = root) {
    const result = spawnSync(process.execPath, [join(dir, "scripts/migrate.mjs")], {
      env: { PATH: process.env.PATH, DATABASE_URL: dbUrl.href },
      timeout: 20_000,
      encoding: "utf8",
    });
    assert.ifError(result.error);
    return result;
  }
  function succeeded(result, message) {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, message);
  }
  async function names(client) {
    return (await client.query("select name from _migrations order by name")).rows.map(({ name }) => name);
  }

  const fresh = await database("fresh");
  succeeded(migrate(fresh.dbUrl), /done/);
  assert.deepEqual(await names(fresh.client), files);
  succeeded(migrate(fresh.dbUrl), /up to date/);

  const upgrade = await database("upgrade");
  files.filter((name) => name < sharedCap).forEach(stage);
  succeeded(migrate(upgrade.dbUrl, work), /done/);
  const { client } = upgrade;
  await client.query(`
    insert into work_admissions (id, user_id, provider, model, lane, ref)
      values ('fixture-active', 'fixture-active', 'provider', 'model', 'batch', 'fixture');
    insert into work_waiters (user_id, provider, model, lane) values ('fixture', 'provider', 'model', 'batch');
    insert into run_tickets (id, user_id, status) values ('fixture', 'fixture', 'dang-giu');
    insert into run_modal_settlements (attempt, ticket_id, part_hash) values ('fixture', 'fixture', 'fixture');
  `);
  const functionSql = "select pg_get_functiondef('tyzo_admit(text,text,text,text,text,jsonb,integer,text)'::regprocedure)";
  const before = (await client.query(functionSql)).rows;
  for (const name of [sharedCap, modalUsd]) {
    const path = join(work, "migrations", name);
    writeFileSync(path, readFileSync(join(root, "migrations", name), "utf8") + "\nselect 1/0;\n");
    const failed = migrate(upgrade.dbUrl, work);
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /division by zero/);
    assert.ok(!(await names(client)).includes(name));
    if (name === sharedCap) assert.deepEqual((await client.query(functionSql)).rows, before);
    else {
      const column = await client.query("select 1 from information_schema.columns where table_name = 'run_modal_settlements' and column_name = 'provider_usd'");
      assert.equal(column.rowCount, 0);
    }
    stage(name);
    succeeded(migrate(upgrade.dbUrl, work), /1 migration/);
  }
  assert.deepEqual((await client.query(functionSql)).rows, (await fresh.client.query(functionSql)).rows);
  assert.deepEqual((await client.query("select id, status from work_admissions")).rows,
    [{ id: "fixture-active", status: "running" }]);
  assert.deepEqual((await client.query("select user_id from work_waiters")).rows, [{ user_id: "fixture" }]);
  assert.deepEqual((await client.query("select attempt, provider_usd from run_modal_settlements")).rows,
    [{ attempt: "fixture", provider_usd: null }]);
  succeeded(migrate(upgrade.dbUrl, work), /up to date/);
  assert.deepEqual(await names(client), files);
});
