import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { MANUAL_TERMS, parseRiskSettings, RISK_RULES, type RiskSettings } from "@/lib/risk-rules";

export type RiskFlagView = {
  id: number;
  userId: string;
  email: string;
  rule: string;
  title: string;
  termsRef: string;
  recommend: "khoa" | "cam";
  score: number;
  status: string;
  summary: string;
  hash: string;
  report: string;
  sections: Array<{ title: string; columns: string[]; rows: string[][] }>;
  autoAction: string;
  standing: string;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  decidedBy: string;
  note: string;
};

const iso = (value: string | Date | null) => (value ? new Date(value).toISOString() : null);

/** Danh sách cờ. Mở tab thì quét lại (tối đa 10 phút một lần) để Admin không phải chờ lịch quét. */
export const getRiskDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { q?: string; all?: boolean } | undefined) => ({ q: String(input?.q ?? "").trim().toLowerCase().slice(0, 120), all: input?.all === true }))
  .handler(async ({ context, data }) => {
    const { requireRole } = await import("@/lib/admin-room");
    const place = await requireRole(context.userId, "quan-ly");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const last = await sql<{ value: string }>`select value from room_settings where key = 'risk_sweep_at'`;
    let sweep: { checked: number; made: number } | null = null;
    if (Date.now() - Number(last[0]?.value ?? 0) > 10 * 60_000) {
      await sql`insert into room_settings (key, value) values ('risk_sweep_at', ${String(Date.now())}) on conflict (key) do update set value = ${String(Date.now())}`;
      const { sweepRisk } = await import("@/lib/risk.server");
      sweep = await sweepRisk(sql);
    }
    const { reportOf, loadRiskSettings } = await import("@/lib/risk.server");
    const like = `%${data.q}%`;
    const rows = await sql<{
      id: number; user_id: string; email: string; rule: string; recommend: string; score: number; status: string; summary: string;
      evidence: string; evidence_hash: string; auto_action: string; standing: string | null; created_at: string | Date; updated_at: string | Date;
      decided_at: string | Date | null; decided_by: string | null; decision_note: string;
    }>`
      select f.id, f.user_id, coalesce(u.email, '') as email, f.rule, f.recommend, f.score, f.status, f.summary, f.evidence, f.evidence_hash,
        f.auto_action, a.status as standing, f.created_at, f.updated_at, f.decided_at, coalesce(d.email, f.decided_by, '') as decided_by, f.decision_note
      from risk_flags f
      left join "user" u on u.id = f.user_id
      left join "user" d on d.id = f.decided_by
      left join room_accounts a on a.user_id = f.user_id
      where (${data.all}::boolean or f.status = 'mo') and (${data.q} = '' or lower(coalesce(u.email, '')) like ${like} or ('rr-' || f.id) = ${data.q})
      order by (f.status = 'mo') desc, f.score desc, f.updated_at desc
      limit 150
    `;
    const counts = await sql<{ status: string; n: number }>`select status, count(*)::int as n from risk_flags group by status`;
    const flags: RiskFlagView[] = rows.map((row) => {
      const rule = RISK_RULES.find((r) => r.id === row.rule || (r.id === "thu-cong" && row.rule.startsWith("thu-cong")));
      let sections: RiskFlagView["sections"] = [];
      let termsRef = rule?.termsRef ?? "";
      try {
        const ev = JSON.parse(row.evidence) as { bang?: RiskFlagView["sections"]; luat?: { dieuKhoan?: string } };
        sections = ev.bang ?? [];
        termsRef = ev.luat?.dieuKhoan || termsRef;
      } catch {
        /* hồ sơ lỗi */
      }
      return {
        id: Number(row.id),
        userId: row.user_id,
        email: row.email,
        rule: row.rule,
        title: rule?.title ?? row.rule,
        termsRef,
        recommend: row.recommend === "cam" ? "cam" : "khoa",
        score: Number(row.score),
        status: row.status,
        summary: row.summary,
        hash: row.evidence_hash,
        report: reportOf(row.evidence, row.evidence_hash),
        sections,
        autoAction: row.auto_action,
        standing: row.standing ?? "open",
        createdAt: iso(row.created_at)!,
        updatedAt: iso(row.updated_at)!,
        decidedAt: iso(row.decided_at),
        decidedBy: row.decided_by ?? "",
        note: row.decision_note,
      };
    });
    return {
      flags,
      counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.n)])) as Record<string, number>,
      settings: await loadRiskSettings(sql),
      canEdit: place.role === "chu",
      canBan: place.role === "chu",
      sweep,
    };
  });

export const runRiskSweep = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { requireRole } = await import("@/lib/admin-room");
    await requireRole(context.userId, "quan-ly");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`insert into room_settings (key, value) values ('risk_sweep_at', ${String(Date.now())}) on conflict (key) do update set value = ${String(Date.now())}`;
    const { sweepRisk } = await import("@/lib/risk.server");
    return sweepRisk(sql);
  });

/** Xử lý một cờ: bỏ qua, khóa hoặc cấm tài khoản. Lý do khóa/cấm ghi rõ điều khoản và mã hồ sơ để khách đọc được. */
export const decideRiskFlag = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; action: "bo-qua" | "khoa" | "cam"; note: string }) => {
    const id = Number(input?.id);
    if (!Number.isInteger(id) || id < 1) throw new Error("Cờ không đúng.");
    if (!["bo-qua", "khoa", "cam"].includes(input?.action)) throw new Error("Việc không đúng.");
    const note = String(input?.note ?? "").trim().slice(0, 500);
    if (input.action === "bo-qua" && note.length < 3) throw new Error("Ghi lý do bỏ qua (để lần sau xem lại biết vì sao).");
    return { id, action: input.action, note };
  })
  .handler(async ({ context, data }) => {
    const { requireRole, writeAudit } = await import("@/lib/admin-room");
    const { isStaffRole, outranks, roleAtLeast } = await import("@/lib/staff-role");
    const actor = await requireRole(context.userId, "quan-ly");
    if (data.action === "cam" && !roleAtLeast(actor.role, "chu")) throw new Error("Chỉ Admin được cấm.");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const flag = await sql<{ user_id: string; rule: string; status: string; evidence: string }>`select user_id, rule, status, evidence from risk_flags where id = ${data.id}`;
    if (!flag.length) throw new Error("Không thấy cờ.");
    if (flag[0].status !== "mo") throw new Error("Cờ này đã được xử lý.");
    const userId = flag[0].user_id;
    if (userId === context.userId) throw new Error("Không xử lý tài khoản của chính bạn.");
    let terms = "";
    try {
      terms = (JSON.parse(flag[0].evidence) as { luat?: { dieuKhoan?: string; trichDan?: string } }).luat?.dieuKhoan ?? "";
    } catch {
      /* bỏ qua */
    }
    if (data.action !== "bo-qua") {
      const target = await sql<{ role: string | null }>`select role from room_staff where user_id = ${userId}`;
      const targetRole = isStaffRole(target[0]?.role) ? target[0].role : null;
      if (targetRole === "chu") throw new Error("Không khóa hoặc cấm Admin.");
      if (targetRole && !outranks(actor.role, targetRole)) throw new Error("Không xử lý người cùng cấp hoặc cấp trên.");
      const status = data.action === "cam" ? "banned" : "locked";
      const reason = `${data.action === "cam" ? "Cấm" : "Khóa"} theo ${terms || "điều khoản"}. Hồ sơ RR-${data.id}.${data.note ? ` ${data.note}` : ""}`.slice(0, 500);
      await sql`insert into room_accounts (user_id) values (${userId}) on conflict (user_id) do nothing`;
      await sql`update room_accounts set status = ${status}, status_reason = ${reason} where user_id = ${userId}`;
      await writeAudit(context.userId, `trang-thai-${status}`, userId, reason);
    } else {
      await writeAudit(context.userId, "bo-qua-co", userId, `RR-${data.id}: ${data.note}`);
    }
    await sql`
      update risk_flags set status = ${data.action === "bo-qua" ? "bo-qua" : data.action === "cam" ? "da-cam" : "da-khoa"},
        decided_at = now(), decided_by = ${context.userId}, decision_note = ${data.note}
      where id = ${data.id}
    `;
    return { ok: true as const };
  });

/** Ghi cờ tay cho việc máy không tự phát hiện được (khiếu nại bản quyền, nội dung khai thác trẻ em…), kèm bằng chứng. */
export const addManualFlag = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { email: string; terms: number; note: string; proof: string }) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    const terms = Number(input?.terms);
    if (!email.includes("@")) throw new Error("Nhập email tài khoản.");
    if (!Number.isInteger(terms) || terms < 0 || terms >= MANUAL_TERMS.length) throw new Error("Chọn ý điều khoản.");
    const note = String(input?.note ?? "").trim().slice(0, 2000);
    const proof = String(input?.proof ?? "").trim().slice(0, 8000);
    if (note.length < 10) throw new Error("Mô tả việc vi phạm (ít nhất 10 chữ).");
    if (proof.length < 5) throw new Error("Dán bằng chứng: đường dẫn, nội dung khiếu nại, mã đơn, mỗi dòng một mục.");
    return { email, terms, note, proof };
  })
  .handler(async ({ context, data }) => {
    const { requireRole, writeAudit } = await import("@/lib/admin-room");
    const actor = await requireRole(context.userId, "quan-ly");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const user = await sql<{ id: string; created_at: string | Date }>`select id, "createdAt" as created_at from "user" where lower(email) = ${data.email}`;
    if (!user.length) throw new Error("Không thấy tài khoản có email này.");
    const term = MANUAL_TERMS[data.terms];
    const rows = await sql<{ id: number }>`
      insert into risk_flags (user_id, rule, recommend, score, summary) values (${user[0].id}, ${"thu-cong-" + Date.now()}, ${term.recommend}, 100, ${data.note.slice(0, 300)})
      returning id
    `;
    const id = Number(rows[0].id);
    const { hashEvidence } = await import("@/lib/risk.server");
    const evidence = {
      hoSo: `RR-${id}`,
      taoLuc: new Date().toISOString(),
      taiKhoan: { email: data.email, taoLuc: new Date(user[0].created_at).toISOString() },
      luat: { ma: "thu-cong", ten: "Cờ do nhân viên ghi tay", dieuKhoan: term.ref, trichDan: term.text, cachPhatHien: `Ghi tay bởi ${actor.email}`, deXuat: term.recommend === "cam" ? "Cấm" : "Khóa" },
      ketLuan: data.note,
      bang: [{ title: "Bằng chứng nhân viên đưa vào", columns: ["STT", "Nội dung"], rows: data.proof.split(/\r?\n/).filter((line) => line.trim()).map((line, i) => [String(i + 1), line.trim()]) }],
    };
    const hash = hashEvidence(evidence);
    // Mã luật giữ đuôi riêng (thu-cong-<giờ>) để một tài khoản có được nhiều cờ tay cùng lúc.
    await sql`update risk_flags set evidence = ${JSON.stringify(evidence)}, evidence_hash = ${hash} where id = ${id}`;
    await writeAudit(context.userId, "ghi-co", user[0].id, `RR-${id}: ${term.ref}`);
    return { id };
  });

export const saveRiskSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: RiskSettings) => parseRiskSettings(input))
  .handler(async ({ context, data }) => {
    const { requireRole, writeAudit } = await import("@/lib/admin-room");
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const value = JSON.stringify(data);
    await sql`insert into room_settings (key, value) values ('risk_rules', ${value}) on conflict (key) do update set value = ${value}`;
    await writeAudit(context.userId, "luat-rui-ro", null, "Lưu ngưỡng luật phát hiện vi phạm");
    return data;
  });
