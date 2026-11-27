/** Handler/transaction regressions on a real isolated PostgreSQL schema.
 * TanStack transport and identity are fixture adapters; these tests do not
 * certify the production ingress/authentication transport.
 */
import assert from "node:assert/strict";
import { before, after, mock, test } from "node:test";
import { createHash } from "node:crypto";
import type { Sql } from "./db.ts";
import { realPgSql } from "./test-sql.ts";

let sql: Sql;
let end: (() => Promise<void>) | undefined;
let request = new Request("http://fixture.test");
const auth = { fixtureAuth: true };
type Args = { context?: { userId?: string }; data?: unknown };
type Handler = (args: { context: { userId: string }; data: unknown }) => Promise<unknown>;
function serverFn() {
  let middleware: unknown[] = [];
  let validate = (value: unknown) => value;
  const chain = {
    middleware(values: unknown[]) { middleware = values; return chain; },
    validator(fn: (value: unknown) => unknown) { validate = fn; return chain; },
    handler(fn: Handler) { return async (args: Args = {}) => {
      if (middleware.includes(auth) && !args.context?.userId) throw new Error("fixture unauthorized");
      return fn({ context: { userId: args.context?.userId ?? "" }, data: validate(args.data) });
    }; },
  };
  return chain;
}
mock.module("@tanstack/react-start", { namedExports: { createServerFn: serverFn } });
mock.module("@tanstack/react-start/server", { namedExports: { getRequest: () => request } });
mock.module("@tanstack/react-router", { namedExports: { createFileRoute: () => (options: unknown) => options } });
mock.module("./auth/middleware.ts", { namedExports: { authMiddleware: auth } });
mock.module("./db.ts", { namedExports: { getSql: async () => sql } });
mock.module("./risk-log.server.ts", { namedExports: { noteAppIp: async () => {}, noteEvent: async () => {}, checkSoon: () => {} } });
mock.module("./admin/admin-room.ts", { namedExports: {
  requireRole: async (id: string) => { if (id !== "audit-admin") throw new Error("fixture forbidden"); return { email: "fixture@example.invalid" }; },
  assertLower: async () => {}, writeAudit: async () => {}, asStanding: () => ({}), clip: (s: string) => s, stamp: (s: string) => s,
} });
mock.module("./token-cost.server.ts", { namedExports: { turboBasePerSecond: async () => null } });
const rates: string[] = [];
mock.module("./guard.server.ts", { namedExports: { takeRate: async (key: string) => { rates.push(key); } } });

before(async () => {
  const fixture = await realPgSql();
  if (fixture) ({ sql, end } = fixture);
});
after(async () => { await end?.(); });
const call = (fn: unknown, data?: unknown, userId = "audit-admin") => (fn as (args: Args) => Promise<Record<string, unknown>>)({ context: { userId }, data });
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
async function person(id: string) {
  await sql`insert into "user" (id,name,email,"emailVerified") values (${id},'fixture',${id + "@example.invalid"},true) on conflict do nothing`;
}

test("AZ-007 / R3-005: serialized link codes and rollback after device-insert failure", async (t) => {
  if (!sql) return t.skip("Requires explicitly isolated TYZO_TEST_PG_URL");
  const links = await import("./app-link.server.ts");
  await person("link-owner");
  await Promise.all(Array.from({ length: 12 }, () => links.createLinkCode("link-owner")));
  assert.equal(Number((await sql`select count(*) n from app_link_codes where user_id='link-owner'`)[0].n), 1);
  const code = await links.createLinkCode("link-owner");
  await sql.query("create function fail_device_fixture() returns trigger language plpgsql as $$ begin raise exception 'synthetic insert fault'; end $$");
  await sql.query("create trigger fail_device_fixture before insert on app_devices for each row execute function fail_device_fixture()");
  await assert.rejects(links.redeemLinkCode(code.code, "fixture"), /synthetic insert fault/);
  assert.equal(Number((await sql`select count(*) n from app_link_codes where user_id='link-owner'`)[0].n), 1);
  await sql.query("drop trigger fail_device_fixture on app_devices");
  const device = await links.redeemLinkCode(code.code, "fixture");
  assert.equal(device?.userId, "link-owner");
  assert.equal(await links.redeemLinkCode(code.code, "fixture"), null);
});

test("R4-004 / R4-005: remove-user rolls back all steps on fault and revokes device on success", async (t) => {
  if (!sql) return t.skip("Requires explicitly isolated TYZO_TEST_PG_URL");
  const users = await import("./admin/admin-users.ts");
  const links = await import("./app-link.server.ts");
  await person("delete-owner");
  await sql`insert into room_staff (user_id,role) values ('delete-owner','ho-tro')`;
  await sql`insert into trial_devices (device_id,user_id) values ('synthetic-device','delete-owner')`;
  const code = await links.createLinkCode("delete-owner");
  const device = await links.redeemLinkCode(code.code, "fixture");
  assert.ok(device);
  await sql.query("create function fail_delete_fixture() returns trigger language plpgsql as $$ begin raise exception 'synthetic delete fault'; end $$");
  await sql.query("create trigger fail_delete_fixture before delete on trial_devices for each row execute function fail_delete_fixture()");
  await assert.rejects(call(users.removeUser, "delete-owner"), /synthetic delete fault/);
  assert.equal(Number((await sql`select count(*) n from room_staff where user_id='delete-owner'`)[0].n), 1);
  assert.equal(Number((await sql`select count(*) n from "user" where id='delete-owner'`)[0].n), 1);
  assert.equal((await sql`select revoked_at from app_devices where token_hash=${hash(device.token)}`)[0].revoked_at, null);
  await sql.query("drop trigger fail_delete_fixture on trial_devices");
  await call(users.removeUser, "delete-owner");
  request = new Request("http://fixture.test", { headers: { authorization: `Bearer ${device.token}` } });
  assert.equal(await links.deviceUserId(), null);
  assert.equal(Number((await sql`select count(*) n from "user" where id='delete-owner'`)[0].n), 0);
});

test("R4-008: temporary password revokes web sessions and Android credentials", async (t) => {
  if (!sql) return t.skip("Requires explicitly isolated TYZO_TEST_PG_URL");
  const users = await import("./admin/admin-users.ts");
  const links = await import("./app-link.server.ts");
  await person("password-owner");
  await sql`insert into account (id,"accountId","providerId","userId",password,"updatedAt") values ('fixture-account','fixture-account','credential','password-owner','old',now())`;
  await sql`insert into session (id,token,"userId","expiresAt","updatedAt") values ('fixture-session','fixture-session','password-owner',now()+interval '1 day',now())`;
  const code = await links.createLinkCode("password-owner");
  const device = await links.redeemLinkCode(code.code, "fixture"); assert.ok(device);
  await call(users.setTempPassword, { userId: "password-owner", password: "synthetic-fixture-password" });
  assert.equal(Number((await sql`select count(*) n from session where "userId"='password-owner'`)[0].n), 0);
  request = new Request("http://fixture.test", { headers: { authorization: `Bearer ${device.token}` } });
  assert.equal(await links.deviceUserId(), null);
});

test("R4-006: real revenue aggregation exceeds int32 without truncation", async (t) => {
  if (!sql) return t.skip("Requires explicitly isolated TYZO_TEST_PG_URL");
  const money = await import("./admin/admin-money.ts");
  await sql`insert into room_ledger (user_id,kind,amount,note) values ('money-fixture','nap',1600000000,'synthetic'),('money-fixture','nap',1600000000,'synthetic')`;
  const result = await call(money.getMoney, "day");
  assert.ok(Number(result.revenue) >= 3_200_000_000);
});

test("R3-004: database password update and device revocation fail or commit together", async (t) => {
  if (!sql) return t.skip("Requires explicitly isolated TYZO_TEST_PG_URL");
  const links = await import("./app-link.server.ts");
  await person("atomic-password-owner");
  await sql`insert into account (id,"accountId","providerId","userId",password,"updatedAt") values ('atomic-account','atomic-account','credential','atomic-password-owner','old',now())`;
  const code = await links.createLinkCode("atomic-password-owner");
  const device = await links.redeemLinkCode(code.code,"fixture"); assert.ok(device);
  await sql.query("create function fail_revoke_fixture() returns trigger language plpgsql as $$ begin raise exception 'synthetic revoke fault'; end $$");
  await sql.query("create trigger fail_revoke_fixture before update on app_devices for each row execute function fail_revoke_fixture()");
  await assert.rejects(sql`update account set password='new-fixture-value' where id='atomic-account'`,/synthetic revoke fault/);
  assert.equal((await sql`select password from account where id='atomic-account'`)[0].password,"old");
  assert.equal((await sql`select revoked_at from app_devices where token_hash=${hash(device.token)}`)[0].revoked_at,null);
  await sql.query("drop trigger fail_revoke_fixture on app_devices");
  const pendingCode = await links.createLinkCode("atomic-password-owner");
  await sql`update account set password='new-fixture-value' where id='atomic-account'`;
  assert.ok((await sql`select revoked_at from app_devices where token_hash=${hash(device.token)}`)[0].revoked_at);
  assert.equal(await links.redeemLinkCode(pendingCode.code,"fixture"),null);
});

test("R5-007: conflicting referral code reports false and preserves original affiliation", async (t) => {
  if (!sql) return t.skip("Requires explicitly isolated TYZO_TEST_PG_URL");
  for (const id of ["host-a","host-b","referred"]) await person(id);
  await sql`insert into affiliates (user_id,code,status) values ('host-a','ABCDEFGH','hoat-dong'),('host-b','JKLMNPQR','hoat-dong')`;
  const { attachReferral } = await import("./affiliate-room.ts");
  assert.equal((await call(attachReferral,"ABCDEFGH","referred")).ok,true);
  assert.equal((await call(attachReferral,"JKLMNPQR","referred")).ok,false);
  assert.equal((await sql`select affiliate_id from referrals where user_id='referred'`)[0].affiliate_id,"host-a");
});

test("R3-007: all three read/quote polish endpoints register authentication", async () => {
  const polish = await import("./polish/polish-room.ts");
  for (const fn of [polish.getPolishModels, polish.getPolishPrompts, polish.quotePolishChoices]) {
    await assert.rejects(call(fn, {}, ""), /fixture unauthorized/);
  }
});

test("R4-007: actual Android history-delete handler applies per-account rate limit", async (t) => {
  if (!sql) return t.skip("Requires explicitly isolated TYZO_TEST_PG_URL");
  const links = await import("./app-link.server.ts");
  await person("history-owner");
  const code = await links.createLinkCode("history-owner");
  const device = await links.redeemLinkCode(code.code,"fixture"); assert.ok(device);
  request = new Request("http://fixture.test/api/app-history?all=1",{method:"DELETE",headers:{authorization:`Bearer ${device.token}`}});
  const route = (await import("../routes/api/app-history.ts")).Route as unknown as { server: { handlers: { DELETE: (arg:{request:Request})=>Promise<Response> } } };
  const response = await route.server.handlers.DELETE({request});
  assert.equal(response.status,200);
  assert.ok(rates.includes("live-history-del:history-owner"));
});

test("DEEP-010: real webhook handlers authenticate before reading and cap oversized bodies", async (t) => {
  if (!sql) return t.skip("Requires explicitly isolated TYZO_TEST_PG_URL");
  await sql`insert into pay_settings(id,sepay_key,casso_key) values(1,'synthetic-fixture','synthetic-fixture') on conflict(id) do update set sepay_key=excluded.sepay_key,casso_key=excluded.casso_key`;
  const hooks=await import('./payment/pay-store.ts');
  for(const handle of [hooks.handleSepay,hooks.handleCasso]) {
    let pulls=0;let canceled=false;
    const stream=new ReadableStream<Uint8Array>({pull(c){pulls++;c.enqueue(new Uint8Array(128*1024));},cancel(){canceled=true;}},{highWaterMark:0});
    const denied=await handle(new Request('http://fixture.test',{method:'POST',body:stream,duplex:'half'} as RequestInit));
    assert.equal(denied.status,401);assert.equal(pulls,0);
    await stream.cancel();
    const over=new ReadableStream<Uint8Array>({pull(c){pulls++;c.enqueue(new Uint8Array(128*1024));},cancel(){canceled=true;}},{highWaterMark:0});
    const accepted=await handle(new Request('http://fixture.test',{method:'POST',body:over,duplex:'half',headers:{authorization:'Apikey synthetic-fixture'}} as RequestInit));
    assert.equal(accepted.status,200);assert.equal(canceled,true);assert.ok(pulls<=3);
  }
});

test("SCALE: capacity settings require Admin, reject bad bounds, and audit atomically", async (t) => {
  if (!sql) return t.skip("Requires explicitly isolated TYZO_TEST_PG_URL");
  const capacity = await import("./admin/work-capacity-room.ts");
  const { DEFAULT_ADMISSION } = await import("./billing/work-admission.ts");
  await assert.rejects(call(capacity.getWorkCapacity, undefined, "ordinary-user"), /forbidden/);
  await assert.rejects(call(capacity.saveWorkCapacity, { ...DEFAULT_ADMISSION, batch: 0 }), /không hợp lệ/);
  await call(capacity.saveWorkCapacity, { ...DEFAULT_ADMISSION, enabled: false });
  assert.equal(JSON.parse((await sql<{ value: string }>`select value from room_settings where key='work_admission'`)[0].value).enabled, false);
  assert.equal(Number((await sql<{ n: number }>`select count(*)::int n from room_audit where action='gioi-han-nhan-viec'`)[0].n), 1);
  await sql.query("create function fail_capacity_audit() returns trigger language plpgsql as $$begin raise exception 'synthetic audit fault'; end$$");
  await sql.query("create trigger fail_capacity_audit before insert on room_audit for each row execute function fail_capacity_audit()");
  await assert.rejects(call(capacity.saveWorkCapacity, DEFAULT_ADMISSION), /synthetic audit fault/);
  assert.equal(JSON.parse((await sql<{ value: string }>`select value from room_settings where key='work_admission'`)[0].value).enabled, false);
  await sql.query("drop trigger fail_capacity_audit on room_audit");
});

test("SCALE: resolving uncertain capacity needs Admin evidence, is audited atomically, and never changes financial records", async (t) => {
  if (!sql) return t.skip("Requires explicitly isolated TYZO_TEST_PG_URL");
  const capacity = await import("./admin/work-capacity-room.ts");
  const id = "f".repeat(24);
  const data = { id, evidence: "Provider fixture shows work ended; checked operator log 42." };
  await sql`insert into work_admissions(id,user_id,provider,model,lane,status)values(${id},'fixture-owner','groq','chat','batch','unknown')`;
  const balances = async () => JSON.stringify(await sql`select
    (select coalesce(sum(held),0)::text from run_tickets) as held,
    (select coalesce(sum(charged),0)::text from run_tickets) as charged,
    (select coalesce(sum(left_tokens),0)::text from token_grants) as tokens,
    (select coalesce(sum(base_vnd),0)::text from provider_spend) as provider_spend`);
  const before = await balances();
  await assert.rejects(call(capacity.resolveWorkAdmission,data,"ordinary-user"),/forbidden/);
  await assert.rejects(call(capacity.resolveWorkAdmission,{id,evidence:"short"}),/bằng chứng/);
  await sql.query("create function fail_resolution_audit() returns trigger language plpgsql as $$begin raise exception 'synthetic resolution audit fault'; end$$");
  await sql.query("create trigger fail_resolution_audit before insert on room_audit for each row execute function fail_resolution_audit()");
  await assert.rejects(call(capacity.resolveWorkAdmission,data),/synthetic resolution audit fault/);
  assert.equal((await sql`select status from work_admissions where id=${id}`)[0].status,"unknown");
  await sql.query("drop trigger fail_resolution_audit on room_audit");
  assert.equal(await call(capacity.resolveWorkAdmission,data),true);
  assert.equal(await call(capacity.resolveWorkAdmission,data),false);
  assert.equal(Number((await sql`select count(*)::int n from room_audit where action='xac-nhan-chuong-trinh-da-ket-thuc'`)[0].n),1);
  assert.equal(await balances(),before);
  const live = "d".repeat(24);
  await sql`insert into work_admissions(id,user_id,provider,model,lane)values(${live},'fixture-owner','groq','chat','batch')`;
  assert.equal(await call(capacity.resolveWorkAdmission,{...data,id:live}),false);
  assert.equal((await sql`select status from work_admissions where id=${live}`)[0].status,"running");
});

mock.module("./app-release.server.ts", { namedExports: { androidRelease: async () => ({code:12,name:"0.12",url:""}) } });

test("AZ-002: app link/me identity is derived from authenticated device, never client input", async (t) => {
  if (!sql) return t.skip("Requires explicitly isolated TYZO_TEST_PG_URL");
  const links = await import("./app-link.server.ts");
  await person("identity-a");await person("identity-b");
  const code=await links.createLinkCode("identity-a");
  const post=(await import("../routes/api/app-link.ts")).Route as unknown as {server:{handlers:{POST:(args:{request:Request})=>Promise<Response>}}};
  request=new Request("http://fixture.test/api/app-link",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:code.code,name:"identity fixture",userId:"identity-b"})});
  const linked=await post.server.handlers.POST({request});assert.equal(linked.status,200);
  const identity=await linked.json();assert.equal(identity.userId,"identity-a");
  const me=(await import("../routes/api/app-me.ts")).Route as unknown as {server:{handlers:{GET:()=>Promise<Response>}}};
  request=new Request("http://fixture.test/api/app-me",{headers:{authorization:`Bearer ${identity.token}`}});
  const mine=await me.server.handlers.GET();assert.equal(mine.status,200);const value=await mine.json();assert.equal(value.userId,"identity-a");assert.equal(value.email,"identity-a@example.invalid");
  request=new Request("http://fixture.test/api/app-me");
  const denied=await me.server.handlers.GET();assert.equal(denied.status,401);assert.equal((await denied.json()).userId,undefined);
});
