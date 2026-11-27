/**
 * RE3-007: chuyển dữ liệu hai chiều (VPS ⇄ Neon) phải đối soát được, trên PostgreSQL thật RIÊNG (TYZO_TEST_PG_URL,
 * chỉ 127.0.0.1:55439). Chạy đúng các hàm trong deploy/vps/tyzo.sh; «docker» là một tệp giả chuyển lệnh sang công cụ
 * Postgres cục bộ và chèn lỗi theo FAKE_FAULT. Tạo/xóa CSDL thử tyzo, tyzo_moi, tyzo_cu_*, r3_neon trong cụm thử.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { after, before, test } from "node:test";
import pg from "pg";

const raw = process.env.TYZO_TEST_PG_URL;
const url = raw ? new URL(raw) : null;
const enabled = Boolean(url && url.hostname === "127.0.0.1" && url.port === "55439");
const pgTest = enabled ? test : test.skip;
const root = new URL("..", import.meta.url).pathname;
const work = mkdtempSync(join(tmpdir(), "re3-restore-"));
const NEON = "postgresql://tyzo@127.0.0.1:55439/r3_neon";

const admin = () => new pg.Client({ connectionString: url.toString().replace(/\/[^/]*$/, "/postgres") });
async function q(db, text) {
  const c = new pg.Client({ connectionString: `postgresql://tyzo@127.0.0.1:55439/${db}` });
  await c.connect();
  try {
    return (await c.query(text)).rows;
  } finally {
    await c.end();
  }
}
async function adminQ(text) {
  const c = admin();
  await c.connect();
  try {
    return (await c.query(text)).rows;
  } finally {
    await c.end();
  }
}
async function dropTestDbs() {
  const dbs = await adminQ(`select datname from pg_database where datname = any(array['tyzo','tyzo_moi','r3_neon']) or datname like 'tyzo\\_cu\\_%' or datname like 'tyzo\\_hong\\_%'`);
  for (const { datname } of dbs) {
    await adminQ(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${datname}' and pid <> pg_backend_pid()`);
    await adminQ(`drop database if exists "${datname}"`);
  }
}
async function migrate(db) {
  const dir = join(root, "migrations");
  const c = new pg.Client({ connectionString: `postgresql://tyzo@127.0.0.1:55439/${db}` });
  await c.connect();
  await c.query("create table if not exists _migrations (name text primary key, applied_at timestamptz default now())");
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) {
    await c.query(readFileSync(join(dir, f), "utf8"));
    await c.query("insert into _migrations(name) values ($1)", [f]);
  }
  await c.end();
}
async function seed(db, tag, n) {
  await q(db, `insert into room_accounts (user_id, balance) select '${tag}' || g, g * 1000 from generate_series(1, ${n}) g`);
  await q(db, `insert into room_ledger (user_id, kind, amount, note) select '${tag}' || g, 'nap', g * 1000, 'fixture ${tag}' from generate_series(1, ${n}) g`);
  await q(db, `insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at) select '${tag}g' || g, '${tag}' || g, 100, 100 - g % 7, 1, now() + interval '30 days' from generate_series(1, ${n}) g`);
}

const fakeDocker = `#!/usr/bin/env bash
# docker giả cho test RE3-007. Không có Docker thật: chạy công cụ Postgres cục bộ (PGHOST/PGPORT đã đặt).
F="$FAKE_DIR"
fault() { [[ ",\${FAKE_FAULT:-}," == *",$1,"* ]]; }
pgq() { psql -X -q -tA -U tyzo -d "$1" -c "$2" >/dev/null; }
run_cmd() {
  # RE5-004-C: endpoint ghi Neon bị tắt thì mọi kết nối tới nó lỗi; endpoint chỉ đọc thì phiên read-only.
  if [[ "$*" == *ep-rw-1* ]] && [ -f "$F/neon_disabled" ]; then echo "The endpoint has been disabled." >&2; return 1; fi
  if [[ "$*" == *ep-ro-1* ]]; then export PGOPTIONS="-c default_transaction_read_only=on"; fi
  local cmd="$1"; shift
  case "$cmd" in
    df) echo "Filesystem 1K-blocks Used Available Use% Mounted"; echo "fake 999999999 1 999999999 1% /"; return 0 ;;
    pg_dump)
      if fault dump-fail; then echo "pg_dump: error: synthetic dump failure" >&2; return 1; fi
      "$cmd" "$@"; local rc=$?
      # Ghi phát sinh ngay sau khi chụp: nguồn đổi trong lúc chép.
      if fault write-during-vps && [[ " $* " == *" tyzo "* ]]; then pgq tyzo "insert into room_ledger (user_id, kind, amount, note) values ('late','nap',1,'ghi phát sinh')"; fi
      if fault write-during-neon && [[ "$*" == *r3_neon* ]]; then pgq r3_neon "insert into room_ledger (user_id, kind, amount, note) values ('late','nap',1,'ghi phát sinh')"; fi
      return $rc ;;
    pg_restore)
      if fault toc-stream && [ "$1" = "-l" ]; then
        "$cmd" "$@" || return
        # Keep producing enough valid TOC comments to fill the pipe after grep finds the schema.
        for ((i=0; i<2048; i++)); do
          printf '; synthetic pg_restore list stream for checking the complete pipeline\n' || return 1
        done
        return 0
      fi
      "$cmd" "$@"; local rc=$?
      if [ $rc = 0 ] && fault missing-rows; then
        if [[ "$*" == *tyzo_moi* ]]; then pgq tyzo_moi "delete from room_ledger where id = (select min(id) from room_ledger)"; fi
        if [[ "$*" == *r3_neon* ]]; then pgq r3_neon "delete from room_ledger where id = (select min(id) from room_ledger)"; fi
      fi
      return $rc ;;
    psql)
      if fault post-snapshot-writer && [[ "$*" == *r3_neon* ]]; then
        if pgq tyzo "insert into room_ledger (user_id, kind, amount, note) values ('late','nap',1,'ghi phát sinh')"; then
          echo writer-ran > "$F/post-snapshot-writer"
        else
          echo writer-blocked > "$F/post-snapshot-writer"
        fi
      fi
      if fault neon-network && [[ "$*" == *r3_neon* ]]; then return 1; fi
      if fault rollback-db-fail && [[ "$*" == *"allow_connections true"* ]]; then return 1; fi
      if fault rename-fail && [[ "$*" == *"alter database tyzo_moi rename to tyzo"* ]]; then echo "ERROR: synthetic rename failure" >&2; return 1; fi
      "$cmd" "$@" ;;
    *) "$cmd" "$@" ;;
  esac
}
case "$1" in
  ps) [ -f "$F/web_running" ] && echo tyzo-web; echo tyzo-db; exit 0 ;;
  image|pull) exit 0 ;;
  compose)
    echo "$*" >> "$F/compose.log"
    if [[ " $* " == *" stop "* ]]; then
      if fault stop-fail; then exit 1; fi
      if fault still-running; then exit 0; fi
    fi
    if [[ " $* " == *" up "* ]] && fault rollback-web-fail; then exit 1; fi
    for a in "$@"; do [ "$a" = stop ] && rm -f "$F/web_running"; [ "$a" = up ] && touch "$F/web_running"; done
    exit 0 ;;
  exec)
    shift; [ "$1" = -i ] && shift; shift
    run_cmd "$@"; exit $? ;;
  run)
    shift
    while [ $# -gt 0 ]; do case "$1" in --rm|-i) shift ;; --network) shift 2 ;; *) break ;; esac; done
    shift
    run_cmd "$@"; exit $? ;;
esac
echo "docker giả: lệnh lạ $*" >&2; exit 2
`;

// Neon API giả (RE5-004-C). Key đến qua stdin (-K -), không có trên dòng lệnh.
const fakeCurl = `#!/usr/bin/env bash
F="$FAKE_DIR"; cfg="$(cat)"; m=GET; d=""; url=""
while [ $# -gt 0 ]; do case "$1" in -X) m="$2"; shift 2 ;; -d) d="$2"; shift 2 ;; -H|-m|-K) shift 2 ;; -*) shift ;; *) url="$1"; shift ;; esac; done
fault() { [[ ",\${FAKE_FAULT:-}," == *",$1,"* ]]; }
echo "$m $url $d" >> "$F/neon-calls.log"
[[ "$cfg" == *"Authorization: Bearer neon-key-thu"* ]] || { echo "401" >&2; exit 22; }
case "$m $url" in
  "GET https://console.neon.tech/api/v2/projects?limit=100") echo '{"projects":[{"id":"p1"}]}' ;;
  "GET https://console.neon.tech/api/v2/projects/p1/endpoints") echo '{"endpoints":[{"id":"ep-rw-1","branch_id":"br-1"}]}' ;;
  "POST https://console.neon.tech/api/v2/projects/p1/endpoints") fault ro-fail && exit 22; echo '{"endpoint":{"id":"ep-ro-1"}}' ;;
  "PATCH https://console.neon.tech/api/v2/projects/p1/endpoints/ep-rw-1")
    if [[ "$d" == *'"disabled":true'* ]]; then fault disable-fail && exit 22; touch "$F/neon_disabled"; else rm -f "$F/neon_disabled"; fi; echo '{}' ;;
  "DELETE https://console.neon.tech/api/v2/projects/p1/endpoints/ep-ro-1") echo '{}' ;;
  *) echo "lạ" >&2; exit 22 ;;
esac
`;

function sh(body, { fault = "", input = "" } = {}) {
  const text = readFileSync(join(root, "deploy/vps/tyzo.sh"), "utf8");
  const lib = text.slice(0, text.lastIndexOf('main "$@"; exit $?'));
  const libFile = join(work, "lib.sh");
  writeFileSync(libFile, lib);
  const script = `source "${libFile}"
CONF="${work}/tyzo.conf"; printf 'MODE=full\\nDB=local\\n' > "$CONF"; [ -n "\${KEEP_JOURNAL:-}" ] || rm -f "$CONF.chuyen"
COMPOSE_FILE=/dev/null
${body}`;
  return spawnSync("bash", ["-c", script], {
    encoding: "utf8",
    input,
    env: {
      PATH: `${work}/bin:${process.env.PATH}`,
      HOME: work,
      TMPDIR: work,
      PGHOST: "127.0.0.1",
      PGPORT: "55439",
      FAKE_DIR: work,
      FAKE_FAULT: fault,
      PGHOSTADDR: "127.0.0.1",
    },
    timeout: 120_000,
  });
}
const manifest = (target) => sh(target.startsWith("postgres") ? `bang_ke_xa "${target}"` : `bang_ke_vps ${target}`).stdout;

before(async () => {
  if (!enabled) return;
  spawnSync("mkdir", ["-p", join(work, "bin")]);
  writeFileSync(join(work, "bin", "docker"), fakeDocker);
  chmodSync(join(work, "bin", "docker"), 0o755);
  writeFileSync(join(work, "bin", "curl"), fakeCurl);
  chmodSync(join(work, "bin", "curl"), 0o755);
  await adminQ(`do $$ begin if not exists (select 1 from pg_roles where rolname = 'tyzo') then create role tyzo login superuser; end if; end $$`);
});
after(async () => {
  if (enabled) await dropTestDbs();
});

async function freshVps() {
  await dropTestDbs();
  await adminQ("create database tyzo owner tyzo");
  await migrate("tyzo");
  await seed("tyzo", "v", 300);
}
async function freshNeon(seeded) {
  await adminQ("create database r3_neon owner tyzo");
  if (seeded) {
    await migrate("r3_neon");
    await seed("r3_neon", "n", 450);
  }
}

pgTest("RE3-007: bảng kê ổn định, phân biệt khác một dòng", async () => {
  await freshVps();
  const a = manifest("tyzo");
  assert.match(a, /^bang\|room_ledger\|300\|[0-9a-f]{32}$/m);
  assert.match(a, /^migration\|\d+\|[0-9a-f]{32}$/m);
  assert.equal(manifest("tyzo"), a, "hai lần đọc cùng dữ liệu phải ra cùng bảng kê");
  await q("tyzo", "update room_accounts set balance = balance + 1 where user_id = 'v1'");
  const b = manifest("tyzo");
  assert.notEqual(b, a);
  assert.match(b, /^bang\|room_accounts\|300\|/m, "cùng số dòng nhưng mã băm khác");
});

pgTest("RE3-007: VPS → Neon trống: khớp bảng kê, web VPS bật lại, thành công", async () => {
  await freshVps();
  await freshNeon(false);
  writeFileSync(join(work, "web_running"), "");
  const r = sh(`chep_len_neon "${NEON}"`);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /khớp bảng kê VPS/);
  assert.equal(manifest(NEON), manifest("tyzo"));
  assert.ok(existsSync(join(work, "web_running")), "web VPS phải được bật lại");
  assert.match(readFileSync(join(work, "compose.log"), "utf8"), /stop web bridge/);
});

for (const [fault, why] of [
  ["dump-fail", /Không đọc được dữ liệu trên VPS/],
  ["missing-rows", /Neon không khớp bảng kê VPS[\s\S]*|lệch: bang\|room_ledger/],
  ["write-during-vps", /thay đổi trong lúc chép/],
]) {
  pgTest(`RE3-007: VPS → Neon với lỗi ${fault} → không báo thành công, nguồn VPS giữ nguyên, web bật lại`, async () => {
    await freshVps();
    await freshNeon(false);
    const before = manifest("tyzo");
    writeFileSync(join(work, "web_running"), "");
    const r = sh(`chep_len_neon "${NEON}"`, { fault });
    assert.notEqual(r.status, 0, r.stdout);
    assert.doesNotMatch(r.stdout, /✔ Đã nạp lên Neon/);
    assert.match(r.stdout, why);
    if (fault !== "write-during-vps") assert.equal(manifest("tyzo"), before, "nguồn VPS bị đụng");
    assert.ok(existsSync(join(work, "web_running")), "web VPS phải được bật lại");
  });
}

pgTest("RE3-007: Neon → VPS: khớp bảng kê, bản VPS cũ giữ dưới tyzo_cu_*", async () => {
  await freshVps();
  await freshNeon(true);
  const old = manifest("tyzo");
  const r = sh(`chep_tu_neon "${NEON}"`, { input: "dong-y\n" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /khớp bảng kê nguồn/);
  assert.equal(manifest("tyzo"), manifest(NEON));
  const kept = await adminQ("select datname from pg_database where datname like 'tyzo\\_cu\\_%'");
  assert.equal(kept.length, 1);
  assert.equal(manifest(kept[0].datname), old, "bản cũ phải còn nguyên để quay về");
});

for (const [fault, why] of [
  ["missing-rows", /không khớp bảng kê nguồn/],
  ["write-during-neon", /ghi mới trong lúc chép/],
  ["rename-fail", /Đổi chỗ lỗi, đã trả CSDL cũ về/],
  ["dump-fail", /Không đọc được Neon/],
]) {
  pgTest(`RE3-007: Neon → VPS với lỗi ${fault} → VPS giữ nguyên dữ liệu đang chạy, không báo thành công`, async () => {
    await freshVps();
    await freshNeon(true);
    const before = manifest("tyzo");
    const r = sh(`chep_tu_neon "${NEON}"`, { fault, input: "dong-y\n" });
    assert.notEqual(r.status, 0, r.stdout);
    assert.doesNotMatch(r.stdout, /✔ Đã nạp trọn vẹn/);
    assert.match(r.stdout + r.stderr, why);
    assert.equal(manifest("tyzo"), before, "dữ liệu đang chạy trên VPS bị đổi");
    // Đổi tên hỏng: thiết kế cũ giữ bản mới đã kiểm ở tyzo_moi để tra cứu (lần nạp sau tự bỏ); các lỗi khác bỏ ngay.
    const left = await adminQ("select datname from pg_database where datname = 'tyzo_moi'");
    assert.equal(left.length, fault === "rename-fail" ? 1 : 0, "CSDL tạm");
  });
}

pgTest("RE3-007: cổng chuyển sang Vercel — Neon lệch thì không chuyển và bật lại web VPS; khớp thì giữ web dừng", async () => {
  await freshVps();
  await freshNeon(false);
  writeFileSync(join(work, "web_running"), "");
  let r = sh(`khoa_va_doi_soat_chuyen "${NEON}"`, { input: "dong-y\n" });
  assert.notEqual(r.status, 0, r.stdout);
  assert.match(r.stdout, /chưa khớp/);
  assert.ok(existsSync(join(work, "web_running")));
  r = sh(`chep_len_neon "${NEON}" && khoa_va_doi_soat_chuyen "${NEON}"`, { input: "dong-y\n" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Neon khớp dữ liệu VPS/);
  // RE5-004: bước khóa nguồn được ghi bền để lần chạy sau (sau mất SSH/kill) nhận ra lần chuyển dở dang.
  assert.match(readFileSync(join(work, "tyzo.conf.chuyen"), "utf8"), /^\S+ khoa-nguon neon-khop$/m);
  assert.ok(!existsSync(join(work, "web_running")), "web VPS phải dừng để không ghi tách đôi");
  assert.deepEqual(await adminQ("select datallowconn from pg_database where datname='tyzo'"), [{ datallowconn: false }]);
  await assert.rejects(q("tyzo", "select 1"), { code: "55000" });
  r = sh(`khoa_va_doi_soat_chuyen "${NEON}"`, { input: "khong\n" });
  assert.notEqual(r.status, 0, "không xác nhận thì không chuyển");
});


pgTest("RE4-004: lỗi dừng Compose phải chặn chuyển dù hai bảng kê khớp", async () => {
  await freshVps();
  await freshNeon(false);
  const copied = sh(`chep_len_neon "${NEON}"`);
  assert.equal(copied.status, 0, copied.stdout + copied.stderr);
  writeFileSync(join(work, "web_running"), "");
  const r = sh(`khoa_va_doi_soat_chuyen "${NEON}"`, { fault: "stop-fail", input: "dong-y\n" });
  assert.notEqual(r.status, 0, r.stdout + r.stderr);
  assert.ok(existsSync(join(work, "web_running")));
});


pgTest("RE4-004: phiên ngoài Compose chặn chuyển và nguồn được mở lại", async () => {
  await freshVps();
  await freshNeon(false);
  const copied = sh(`chep_len_neon "${NEON}"`);
  assert.equal(copied.status, 0, copied.stdout + copied.stderr);
  writeFileSync(join(work, "web_running"), "");
  const writer = new pg.Client({ connectionString: "postgresql://tyzo@127.0.0.1:55439/tyzo" });
  await writer.connect();
  try {
    const r = sh(`khoa_va_doi_soat_chuyen "${NEON}"`, { input: "dong-y\n" });
    assert.notEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /Chưa khóa được nguồn/);
    assert.deepEqual(await q("tyzo", "select 1 as ok"), [{ ok: 1 }]);
    assert.ok(existsSync(join(work, "web_running")));
  } finally {
    await writer.end();
  }
});

for (const [fault, allows, message] of [
  ["neon-network", true, /Chưa khóa được nguồn hoặc Neon chưa khớp/],
  ["neon-network,rollback-web-fail", true, /Chưa khôi phục được các dịch vụ VPS/],
  ["neon-network,rollback-db-fail", false, /Chưa mở lại được kết nối CSDL VPS/],
]) {
  pgTest(`RE4-004: ${fault} không chuyển và báo trạng thái phục hồi thật`, async () => {
    await freshVps();
    await freshNeon(false);
    writeFileSync(join(work, "web_running"), "");
    const r = sh(`khoa_va_doi_soat_chuyen "${NEON}"`, { fault, input: "dong-y\n" });
    assert.notEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, message);
    assert.equal(existsSync(join(work, "web_running")), fault === "neon-network");
    assert.deepEqual(await adminQ("select datallowconn from pg_database where datname='tyzo'"), [{ datallowconn: allows }]);
  });
}


pgTest("RE4-004: writer sau snapshot bị PostgreSQL chặn trong lúc đối soát đích", async () => {
  await freshVps();
  await freshNeon(false);
  const copied = sh(`chep_len_neon "${NEON}"`);
  assert.equal(copied.status, 0, copied.stdout + copied.stderr);
  const r = sh(`khoa_va_doi_soat_chuyen "${NEON}"`, { fault: "post-snapshot-writer", input: "dong-y\n" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(readFileSync(join(work, "post-snapshot-writer"), "utf8").trim(), "writer-blocked");
});

pgTest("RE4-004: Compose trả thành công nhưng web còn chạy thì không chép lên Neon", async () => {
  await freshVps();
  await freshNeon(false);
  writeFileSync(join(work, "web_running"), "");
  const r = sh(`chep_len_neon "${NEON}"`, { fault: "still-running" });
  assert.notEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Không xác nhận được web và cầu nối đã dừng/);
  assert.deepEqual(await q("r3_neon", "select count(*)::int as n from pg_tables where schemaname='public'"), [{ n: 0 }]);
});


pgTest("RE3-007: đọc hết mục lục pg_restore khi stdout lớn và có schema public", async () => {
  await freshVps();
  await freshNeon(true);
  const r = sh(`chep_tu_neon "${NEON}"`, { fault: "toc-stream", input: "dong-y\n" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(manifest("tyzo"), manifest(NEON));
});

// ---- RE5-004-C: khóa ghi Neon (tắt endpoint ghi, chép qua endpoint chỉ đọc) ----
const NEON_EP = "postgresql://tyzo@ep-rw-1-pooler.test:55439/r3_neon";
const resetNeon = () => { for (const f of ["neon_disabled", "neon-calls.log"]) spawnSync("rm", ["-f", join(work, f)]); };
const neonCalls = () => (existsSync(join(work, "neon-calls.log")) ? readFileSync(join(work, "neon-calls.log"), "utf8") : "");
const journal = () => (existsSync(join(work, "tyzo.conf.chuyen")) ? readFileSync(join(work, "tyzo.conf.chuyen"), "utf8") : "");

pgTest("RE5-004-C: Neon → VPS có khóa ghi: chép qua endpoint chỉ đọc, xong thì Neon giữ khóa, nhật ký ghi lại", async () => {
  await freshVps(); await freshNeon(true); resetNeon();
  const r = sh(`chep_tu_neon "${NEON_EP}"`, { input: "dong-y\nc\nneon-key-thu\n" });
  const j = journal(); // đọc trước: mỗi lần sh() (kể cả manifest) đặt lại nhật ký
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Neon đã khóa ghi/);
  assert.match(r.stdout, /Neon VẪN KHÓA GHI/);
  assert.equal(manifest("tyzo"), manifest(NEON));
  assert.ok(existsSync(join(work, "neon_disabled")), "endpoint ghi phải còn tắt sau khi chép xong");
  const calls = neonCalls();
  assert.match(calls, /POST .*endpoints .*read_only/);
  assert.match(calls, /PATCH .*ep-rw-1 .*"disabled":true/);
  assert.match(calls, /DELETE .*ep-ro-1/);
  assert.doesNotMatch(calls, /neon-key-thu/, "key không nằm trong tham số dòng lệnh");
  assert.match(j, / neon-khoa p1 ep-rw-1 ep-ro-1\n.* xong neon-giu-khoa p1 ep-rw-1\n$/);
});

for (const [fault, why] of [["dump-fail", /Không đọc được Neon/], ["missing-rows", /không khớp bảng kê nguồn/]]) {
  pgTest(`RE5-004-C: khóa Neon rồi chép lỗi (${fault}) → mở lại ghi Neon, VPS giữ nguyên, nhật ký đóng`, async () => {
    await freshVps(); await freshNeon(true); resetNeon();
    const before = manifest("tyzo");
    const r = sh(`chep_tu_neon "${NEON_EP}"`, { fault, input: "dong-y\nc\nneon-key-thu\n" });
    const j = journal();
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, why);
    assert.match(r.stdout, /Neon ghi lại được như cũ/);
    assert.ok(!existsSync(join(work, "neon_disabled")), "endpoint ghi phải được bật lại");
    assert.equal(manifest("tyzo"), before);
    assert.match(j, / da-mo-lai neon p1 ep-rw-1\n$/);
  });
}

pgTest("RE5-004-C: không tắt được endpoint ghi → không chép, xóa endpoint chỉ đọc, Neon vẫn ghi được", async () => {
  await freshVps(); await freshNeon(true); resetNeon();
  const before = manifest("tyzo");
  const r = sh(`chep_tu_neon "${NEON_EP}"`, { fault: "disable-fail", input: "dong-y\nc\nneon-key-thu\n" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /Chưa khóa được ghi trên Neon/);
  assert.ok(!existsSync(join(work, "neon_disabled")));
  assert.match(neonCalls(), /DELETE .*ep-ro-1/);
  assert.equal(manifest("tyzo"), before);
});

pgTest("RE5-004-C: key Neon sai → dừng trước khi khóa hay chép", async () => {
  await freshVps(); await freshNeon(true); resetNeon();
  const before = manifest("tyzo");
  const r = sh(`chep_tu_neon "${NEON_EP}"`, { input: "dong-y\nc\nkey-sai\n" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /Key Neon không thấy endpoint/);
  assert.doesNotMatch(neonCalls(), /PATCH|POST/);
  assert.equal(manifest("tyzo"), before);
});

pgTest("RE5-004-D: mục mở lại Neon đọc nhật ký, cần gõ xác nhận, bật lại endpoint ghi", async () => {
  await freshVps(); await freshNeon(true); resetNeon();
  writeFileSync(join(work, "neon_disabled"), "");
  const body = `printf '2026-11-28T00:00:00Z neon-khoa p1 ep-rw-1 ep-ro-1\\n2026-11-28T00:01:00Z xong neon-giu-khoa p1 ep-rw-1\\n' > "$CONF.chuyen"; mo_lai_neon_do_dang`;
  let r = sh(body, { input: "khong\n" });
  assert.notEqual(r.status, 0);
  assert.ok(existsSync(join(work, "neon_disabled")), "không gõ xác nhận thì không mở");
  r = sh(body, { input: `mo-lai-neon\nneon-key-thu\n${NEON_EP}\n` });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(!existsSync(join(work, "neon_disabled")));
  assert.match(r.stdout, /Neon ghi lại được như cũ/);
});
