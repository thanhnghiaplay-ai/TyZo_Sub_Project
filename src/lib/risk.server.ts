import { createHash } from "node:crypto";
import type { Sql } from "@/lib/db";
import {
  canonical,
  EVALUATORS,
  parseRiskSettings,
  riskReport,
  ruleOf,
  type RiskEvidence,
  type RiskFacts,
  type RiskFinding,
  type RiskRuleId,
  type RiskSettings,
} from "@/lib/risk-rules";

/**
 * Bộ máy phát hiện vi phạm: gom dữ kiện của một tài khoản, chạy các luật (risk-rules.ts), dựng hoặc cập nhật cờ
 * kèm hồ sơ bằng chứng có mã băm, và tự xử lý khi Admin bật cho luật đó. Không bao giờ ném lỗi ra việc chính.
 */
const DAY = 86_400_000;
const since = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const iso = (value: string | Date | null | undefined) => (value ? new Date(value).toISOString() : new Date(0).toISOString());

export async function loadRiskSettings(sql: Sql): Promise<RiskSettings> {
  const rows = await sql<{ value: string }>`select value from room_settings where key = 'risk_rules'`;
  return parseRiskSettings(rows[0]?.value ?? "{}");
}

const ORDER_STATUS: Record<string, string> = {
  pending: "Chờ chuyển",
  claimed: "Đã báo chuyển",
  paid: "Đã trả",
  expired: "Hết hạn",
  void: "Khách hủy",
};

export async function gatherFacts(sql: Sql, userId: string, email: string): Promise<RiskFacts> {
  const from = since(60);
  const active = await sql<{ active: boolean }>`
    select (
      exists (select 1 from room_accounts where user_id = ${userId} and plan_until > now())
      or exists (select 1 from token_grants where user_id = ${userId} and left_tokens > 0 and expires_at > now())
    ) as active
  `;
  const events = await sql<{ kind: string; ip: string; ua: string; device: string; at: string | Date }>`
    select kind, ip, ua, device, at from account_events
    where user_id = ${userId} and at > ${from}::timestamptz order by at desc limit 3000
  `;
  const appIps = await sql<{ device: string; name: string; ip: string; first_at: string | Date; last_at: string | Date; uses: number }>`
    select d.id as device, d.name, i.ip, i.first_at, i.last_at, i.uses
    from app_devices d join app_device_ips i on i.device_id = d.id
    where d.user_id = ${userId} and i.last_at > ${from}::timestamptz
    order by i.last_at desc limit 500
  `;
  // Tài khoản khác chung máy, hoặc chung địa chỉ mạng VÀ cùng đúng trình duyệt (tránh bắt oan mạng di động dùng chung địa chỉ).
  const linked = await sql<{ email: string; via: string; value: string; at: string | Date; trial: boolean; created_at: string | Date }>`
    with mine as (
      select distinct device, ip, ua from account_events where user_id = ${userId} and at > ${from}::timestamptz
    ),
    mine_dev as (
      select device from mine where device <> ''
      union select device_id from trial_devices where user_id = ${userId}
    ),
    hits as (
      select e.user_id, 'may' as via, e.device as value, max(e.at) as at
      from account_events e
      where e.user_id <> ${userId} and e.at > ${from}::timestamptz and e.device <> '' and e.device in (select device from mine_dev)
      group by e.user_id, e.device
      union all
      select t.user_id, 'may' as via, t.device_id as value, now() as at
      from trial_devices t
      where t.user_id <> ${userId} and t.device_id in (select device from mine_dev)
      union all
      select e.user_id, 'mang' as via, e.ip as value, max(e.at) as at
      from account_events e join mine m on m.ip = e.ip and m.ua = e.ua
      where e.user_id <> ${userId} and e.at > ${from}::timestamptz and e.ip <> '' and e.ua <> ''
      group by e.user_id, e.ip
    )
    select u.email, h.via, h.value, max(h.at) as at, u."createdAt" as created_at,
      (exists (select 1 from trial_devices t where t.user_id = h.user_id)
        or exists (select 1 from account_events x where x.user_id = h.user_id and x.kind = 'dung-thu')) as trial
    from hits h join "user" u on u.id = h.user_id
    group by u.email, h.via, h.value, u."createdAt", h.user_id
    order by max(h.at) desc limit 200
  `;
  const appeals = await sql<{ id: number; created_at: string | Date; status: string; body: string }>`
    select id, created_at, status, body from room_appeals
    where (user_id = ${userId} or email = ${email}) and created_at > ${since(7)}::timestamptz
    order by created_at desc limit 300
  `;
  const blocks = await sql<{ bucket: string; at: string | Date }>`
    select bucket, at from rate_blocks where bucket like ${"%:" + userId} and at > ${since(1)}::timestamptz order by at desc limit 2000
  `;
  const claims = await sql<{ ref: string; at: string | Date; code: string | null; amount: number | null; status: string | null }>`
    select e.ref, e.at, o.code, o.amount, o.status
    from account_events e left join pay_orders o on o.id = e.ref
    where e.user_id = ${userId} and e.kind = 'bao-da-chuyen' and e.at > ${since(90)}::timestamptz
    order by e.at desc limit 300
  `;
  const selfRefs = await sql<{ guest: string; via: string; value: string; guest_at: string | Date; ctv_at: string | Date }>`
    select ug.email as guest,
      case when eg.device <> '' and eg.device = ec.device then 'may' else 'mang' end as via,
      case when eg.device <> '' and eg.device = ec.device then eg.device else eg.ip end as value,
      max(eg.at) as guest_at, max(ec.at) as ctv_at
    from referrals r
    join "user" ug on ug.id = r.user_id
    join account_events eg on eg.user_id = r.user_id and eg.at > ${since(365)}::timestamptz
    join account_events ec on ec.user_id = r.affiliate_id and ec.at > ${since(365)}::timestamptz
      and ((eg.device <> '' and eg.device = ec.device) or (eg.ip <> '' and eg.ip = ec.ip and eg.ua <> '' and eg.ua = ec.ua))
    where r.affiliate_id = ${userId}
    group by 1, 2, 3 limit 100
  `;
  return {
    now: new Date().toISOString(),
    active: Boolean(active[0]?.active),
    events: events.map((e) => ({ at: iso(e.at), kind: e.kind, ip: e.ip, device: e.device, ua: e.ua })),
    appIps: appIps.map((a) => ({ device: a.device, name: a.name, ip: a.ip, firstAt: iso(a.first_at), lastAt: iso(a.last_at), uses: Number(a.uses) })),
    linked: linked.map((l) => ({ email: l.email, via: l.via === "may" ? "may" : "mang", value: l.value, at: iso(l.at), trial: Boolean(l.trial), createdAt: iso(l.created_at) })),
    appeals: appeals.map((a) => ({ id: Number(a.id), at: iso(a.created_at), status: a.status, excerpt: a.body.replace(/\s+/g, " ").slice(0, 120) })),
    blocks: blocks.map((b) => ({ at: iso(b.at), action: b.bucket.slice(0, b.bucket.lastIndexOf(":")) || b.bucket })),
    claims: claims.map((c) => ({ order: c.ref, code: c.code ?? c.ref, amount: Number(c.amount ?? 0), claimedAt: iso(c.at), status: ORDER_STATUS[c.status ?? ""] ?? c.status ?? "Không thấy đơn", paid: c.status === "paid" })),
    selfRefs: selfRefs.map((s) => ({ guest: s.guest, via: s.via === "may" ? "may" : "mang", value: s.value, guestAt: iso(s.guest_at), ctvAt: iso(s.ctv_at) })),
  };
}

export function hashEvidence(evidence: RiskEvidence): string {
  return createHash("sha256").update(canonical(evidence)).digest("hex");
}

export function buildEvidence(input: { id: number; finding: RiskFinding; email: string; createdAt: string; settings: RiskSettings; createdIso?: string; note?: string }): RiskEvidence {
  const rule = ruleOf(input.finding.rule)!;
  return {
    hoSo: `RR-${input.id}`,
    taoLuc: input.createdIso ?? new Date().toISOString(),
    taiKhoan: { email: input.email, taoLuc: input.createdAt },
    luat: {
      ma: rule.id,
      ten: rule.title,
      dieuKhoan: rule.termsRef,
      trichDan: rule.termsText,
      cachPhatHien: rule.how(input.settings[rule.id]?.p ?? {}),
      deXuat: rule.recommend === "cam" ? "Cấm" : "Khóa",
    },
    ketLuan: input.finding.summary,
    bang: input.finding.sections,
    ...(input.note ? { ghiChu: input.note } : {}),
  };
}

async function systemAudit(sql: Sql, action: string, userId: string, email: string, note: string) {
  try {
    await sql`
      insert into room_audit (actor_id, action, target_id, note, actor_email, actor_role, target_email)
      values ('he-thong', ${action}, ${userId}, ${note}, 'Hệ thống', '', ${email})
    `;
  } catch {
    /* nhật ký lỗi không chặn */
  }
}

/** Ghi hoặc cập nhật cờ. Trả mã cờ và cờ mới hay cũ. */
async function upsertFlag(sql: Sql, userId: string, email: string, createdAt: string, finding: RiskFinding, settings: RiskSettings) {
  const rule = ruleOf(finding.rule)!;
  const open = await sql<{ id: number; created_at: string | Date }>`
    select id, created_at from risk_flags where user_id = ${userId} and rule = ${finding.rule} and status = 'mo'
  `;
  let id: number;
  let created = new Date().toISOString();
  let fresh = false;
  if (!open.length) {
    // Đã có người xử lý hoặc bỏ qua cờ này trong 14 ngày: không dựng lại, tránh báo lặp.
    const recent = await sql<{ id: number }>`
      select id from risk_flags where user_id = ${userId} and rule = ${finding.rule} and status <> 'mo'
        and decided_at > ${new Date(Date.now() - 14 * DAY).toISOString()}::timestamptz limit 1
    `;
    if (recent.length) return null;
  }
  if (open.length) {
    id = Number(open[0].id);
    created = iso(open[0].created_at);
  } else {
    const rows = await sql<{ id: number }>`
      insert into risk_flags (user_id, rule, recommend, score, summary)
      values (${userId}, ${finding.rule}, ${rule.recommend}, ${finding.score}, ${finding.summary})
      on conflict (user_id, rule) where status = 'mo' do nothing
      returning id
    `;
    if (!rows.length) return null;
    id = Number(rows[0].id);
    fresh = true;
  }
  const evidence = buildEvidence({ id, finding, email, createdAt, settings, createdIso: fresh ? created : new Date().toISOString() });
  const hash = hashEvidence(evidence);
  await sql`
    update risk_flags set evidence = ${JSON.stringify(evidence)}, evidence_hash = ${hash}, summary = ${finding.summary},
      score = ${finding.score}, updated_at = now()
    where id = ${id}
  `;
  return { id, fresh, evidence };
}

async function autoAct(sql: Sql, userId: string, email: string, flagId: number, finding: RiskFinding, settings: RiskSettings, staff: boolean) {
  const setting = settings[finding.rule];
  const rule = ruleOf(finding.rule)!;
  if (setting.auto === "khoa" && !staff) {
    const reason = `Tự khóa theo ${rule.termsRef} («${rule.termsText}»). Hồ sơ RR-${flagId}. Bạn gửi Yêu cầu xem lại nếu cho rằng chưa đúng.`;
    await sql`insert into room_accounts (user_id) values (${userId}) on conflict (user_id) do nothing`;
    const locked = await sql<{ user_id: string }>`
      update room_accounts set status = 'locked', status_reason = ${reason}
      where user_id = ${userId} and status = 'open' returning user_id
    `;
    if (locked.length) {
      await sql`update risk_flags set auto_action = 'da-tu-khoa' where id = ${flagId}`;
      await systemAudit(sql, "tu-khoa", userId, email, reason);
    }
  }
  if (setting.auto === "thu-hoi-may" && Array.isArray(finding.extra?.devices)) {
    const ids = (finding.extra!.devices as string[]).filter((d) => /^[a-f0-9]{16}$/.test(d));
    for (const deviceId of ids) {
      await sql`update app_devices set revoked_at = now() where id = ${deviceId} and user_id = ${userId} and revoked_at is null`;
    }
    if (ids.length) {
      await sql`update risk_flags set auto_action = 'da-go-may' where id = ${flagId}`;
      await systemAudit(sql, "tu-go-may", userId, email, `Gỡ ${ids.length} máy ứng dụng Android (hồ sơ RR-${flagId}).`);
    }
  }
}

/** Kiểm mọi luật đang bật cho một tài khoản. Trả số cờ mới. */
export async function checkUser(sql: Sql, userId: string): Promise<number> {
  try {
    const who = await sql<{ email: string; created_at: string | Date; role: string | null }>`
      select u.email, u."createdAt" as created_at, s.role from "user" u left join room_staff s on s.user_id = u.id where u.id = ${userId}
    `;
    if (!who.length || who[0].role === "chu") return 0;
    const email = who[0].email;
    const staff = Boolean(who[0].role);
    const settings = await loadRiskSettings(sql);
    const facts = await gatherFacts(sql, userId, email);
    let made = 0;
    for (const [id, evaluate] of Object.entries(EVALUATORS) as Array<[Exclude<RiskRuleId, "thu-cong">, (typeof EVALUATORS)[keyof typeof EVALUATORS]]>) {
      if (!settings[id].on) continue;
      const finding = evaluate(facts, settings[id].p);
      if (!finding) continue;
      const flag = await upsertFlag(sql, userId, email, iso(who[0].created_at), finding, settings);
      if (flag?.fresh) {
        made += 1;
        await autoAct(sql, userId, email, flag.id, finding, settings, staff);
      }
    }
    return made;
  } catch {
    return 0;
  }
}

/**
 * Quét các tài khoản có hoạt động gần đây theo từng đợt (máy chủ Vercel giới hạn thời gian mỗi lần gọi).
 * after: mã tài khoản cuối của đợt trước; next: mã để gọi đợt sau, null khi đã quét hết. Đợt đầu dọn dữ kiện quá hạn.
 */
export async function sweepRisk(sql: Sql, opts: { after?: string; budgetMs?: number } = {}): Promise<{ checked: number; made: number; next: string | null }> {
  const started = Date.now();
  const budget = opts.budgetMs ?? 8000;
  const after = opts.after ?? "";
  if (!after) {
    await sql`delete from account_events where at < ${since(180)}::timestamptz`;
    await sql`delete from rate_blocks where at < ${since(30)}::timestamptz`;
    await sql`delete from app_device_ips where last_at < ${since(90)}::timestamptz`;
  }
  const users = await sql<{ user_id: string }>`
    select distinct user_id from (
      select user_id from account_events where at > ${since(7)}::timestamptz
      union select user_id from room_appeals where user_id is not null and created_at > ${since(7)}::timestamptz
      union select d.user_id from app_devices d join app_device_ips i on i.device_id = d.id where i.last_at > ${since(7)}::timestamptz
      union select affiliate_id as user_id from referrals
    ) x where user_id > ${after} order by user_id limit 300
  `;
  let made = 0;
  let checked = 0;
  let last = after;
  for (const row of users) {
    made += await checkUser(sql, row.user_id);
    checked += 1;
    last = row.user_id;
    if (Date.now() - started > budget) break;
  }
  const done = checked === users.length && users.length < 300;
  return { checked, made, next: done ? null : last };
}

export function reportOf(evidenceJson: string, hash: string): string {
  try {
    return riskReport(JSON.parse(evidenceJson) as RiskEvidence, hash);
  } catch {
    return "Hồ sơ lỗi, không đọc được.";
  }
}
