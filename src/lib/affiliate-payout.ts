/**
 * LỆNH RÚT HOA HỒNG CỦA CỘNG TÁC VIÊN: tạo, xác nhận đã chuyển, hủy. Tách khỏi cửa máy chủ (affiliate-room.ts) để thử
 * trên Postgres thật nhiều kết nối. KHÔNG đổi cách tính hoa hồng, mức tối thiểu hay quy tắc duyệt; chỉ làm các bước
 * cùng có hiệu lực (kiểm toán v5.49: R5-001, R5-002, R5-003, R5-004).
 *
 * - Mỗi khoản hoa hồng gắn đúng lệnh rút của nó (commission_events.payout_id). Khoản cũ: migration 0042 gắn khi chắc
 *   chắn; còn lại không đoán theo CTV nữa (RE-006), Chủ đối soát (payoutReconcileWith).
 * - Tạo lệnh: một giao dịch, khóa dòng CTV trước nên hai lần bấm cùng lúc chỉ ra MỘT lệnh.
 * - Xác nhận / hủy: chỉ đụng khoản của đúng lệnh đó, và chỉ khi lệnh còn «cho-chi».
 */
import type { Sql } from "./db.ts";
import { inTransaction } from "./db-tx.ts";

export type PayoutAsk = { minPayout: number };

export async function requestPayoutWith(sql: Sql, userId: string, rules: PayoutAsk): Promise<{ amount: number; id: number }> {
  return inTransaction(sql, async (tx) => {
    // Khóa dòng CTV: lần bấm thứ hai chờ lần đầu xong rồi mới đọc số dư (lúc đó khoản đã sang «cho-rut»).
    const me = await tx<{ status: string; bank_name: string; bank_account: string; bank_holder: string }>`
      select status, bank_name, bank_account, bank_holder from affiliates where user_id = ${userId} for update`;
    // Thứ tự kiểm và câu báo giữ như trước.
    const ready = await tx<{ amount: number }>`
      select coalesce(sum(amount), 0)::int as amount from commission_events where affiliate_id = ${userId} and status = 'da-duyet'`;
    const amount = Number(ready[0]?.amount ?? 0);
    if (amount < rules.minPayout) throw new Error("Chưa đủ số tiền tối thiểu để rút.");
    const open = await tx<{ id: number }>`select id from affiliate_payouts where affiliate_id = ${userId} and status = 'cho-chi' limit 1`;
    if (open.length) throw new Error("Đang có một lệnh rút chờ duyệt.");
    if (!me.length) throw new Error("Bạn chưa đăng ký cộng tác viên.");
    if (me[0].status !== "hoat-dong") throw new Error("Mã giới thiệu đang tạm khóa hoặc chờ duyệt, chưa rút được.");
    if (!me[0].bank_account) throw new Error("Hãy nhập tài khoản ngân hàng nhận tiền trước.");
    // R5-004: không đọc được cờ rủi ro thì KHÔNG cho rút (trước đây lỗi truy vấn bị coi như không có cờ).
    const flagged = await tx<{ id: number }>`
      select id from risk_flags where user_id = ${userId} and rule = 'ctv-tu-gioi-thieu' and status = 'mo' limit 1`;
    if (flagged.length) throw new Error(`Tạm chưa rút được: có khách trùng máy hoặc mạng với bạn đang chờ Admin xem lại (hồ sơ RR-${flagged[0].id}). Gửi Yêu cầu xem lại nếu cần.`);
    const bankInfo = JSON.stringify({ bank: me[0].bank_name, account: me[0].bank_account, holder: me[0].bank_holder });
    const made = await tx<{ id: number }>`
      insert into affiliate_payouts (affiliate_id, amount, bank_info) values (${userId}, ${amount}, ${bankInfo}) returning id`;
    const id = Number(made[0].id);
    const moved = await tx<{ amount: number }>`
      with m as (
        update commission_events set status = 'cho-rut', payout_id = ${id}
        where affiliate_id = ${userId} and status = 'da-duyet' returning amount
      )
      select coalesce(sum(amount), 0)::int as amount from m`;
    // Số tiền lệnh = đúng tổng các khoản vừa gắn vào lệnh (cùng giao dịch, dòng đã khóa).
    if (Number(moved[0]?.amount ?? 0) !== amount) throw new Error("Số dư vừa thay đổi. Hãy bấm Rút lại.");
    return { amount, id };
  });
}

/**
 * Khoản của lệnh phải khớp số tiền lệnh (RE-006). Không còn đoán theo CTV cho khoản chưa gắn lệnh: lệnh cũ chưa đối soát
 * được thì báo lỗi, Chủ xem ở «Đối soát lệnh rút» (payoutReconcileWith).
 */
async function linkedTotal(tx: Sql, id: number) {
  const r = await tx<{ n: number; total: number }>`
    select count(*)::int as n, coalesce(sum(amount), 0)::int as total from commission_events where payout_id = ${id} and status = 'cho-rut'`;
  return { n: Number(r[0]?.n ?? 0), total: Number(r[0]?.total ?? 0) };
}

/** Admin xác nhận đã chuyển tiền. Lệnh không còn chờ chuyển hoặc chưa khớp khoản thì báo lỗi, không đụng gì. */
export async function markPayoutWith(sql: Sql, id: number, ref: string) {
  return inTransaction(sql, async (tx) => {
    const p = await tx<{ amount: number }>`select amount from affiliate_payouts where id = ${id} and status = 'cho-chi' for update`;
    if (!p.length) throw new Error("Lệnh rút này không còn chờ chuyển (đã chi hoặc đã hủy).");
    const linked = await linkedTotal(tx, id);
    if (linked.total !== Number(p[0].amount)) {
      throw new Error(`Lệnh rút #${id} chưa đối soát được: khoản gắn với lệnh ${linked.total} đ, lệnh ghi ${p[0].amount} đ. Xem «Đối soát lệnh rút» trước khi chuyển.`);
    }
    await tx`update affiliate_payouts set status = 'da-chi', paid_ref = ${ref}, paid_at = now() where id = ${id}`;
    await tx`update commission_events set status = 'da-chi' where payout_id = ${id} and status = 'cho-rut'`;
    return { ok: true as const };
  });
}

/** Admin từ chối lệnh rút: trả đúng các khoản của lệnh đó về «Rút được». Lệnh cũ chưa khớp khoản thì báo lỗi. */
export async function cancelPayoutWith(sql: Sql, id: number, note: string) {
  return inTransaction(sql, async (tx) => {
    const p = await tx<{ amount: number }>`select amount from affiliate_payouts where id = ${id} and status = 'cho-chi' for update`;
    if (!p.length) return { ok: false };
    const linked = await linkedTotal(tx, id);
    if (linked.total !== Number(p[0].amount)) {
      throw new Error(`Lệnh rút #${id} chưa đối soát được: khoản gắn với lệnh ${linked.total} đ, lệnh ghi ${p[0].amount} đ. Xem «Đối soát lệnh rút».`);
    }
    await tx`update affiliate_payouts set status = 'huy', note = ${note} where id = ${id}`;
    await tx`update commission_events set status = 'da-duyet', payout_id = null where payout_id = ${id} and status = 'cho-rut'`;
    return { ok: true };
  });
}

export type PayoutMismatch = { id: number; affiliateId: string; amount: number; linked: number };
export type OrphanEvents = { affiliateId: string; count: number; total: number };

/** Đối soát CHỈ ĐỌC (RE-006): lệnh chờ chuyển chưa khớp khoản, và khoản «cho-rut» chưa gắn lệnh nào. */
export async function payoutReconcileWith(sql: Sql): Promise<{ mismatched: PayoutMismatch[]; orphans: OrphanEvents[] }> {
  const mismatched = await sql<{ id: number; affiliate_id: string; amount: number; linked: number }>`
    select p.id, p.affiliate_id, p.amount,
      coalesce((select sum(e.amount) from commission_events e where e.payout_id = p.id and e.status = 'cho-rut'), 0)::int as linked
    from affiliate_payouts p where p.status = 'cho-chi'
      and p.amount <> coalesce((select sum(e.amount) from commission_events e where e.payout_id = p.id and e.status = 'cho-rut'), 0)
    order by p.id`;
  const orphans = await sql<{ affiliate_id: string; count: number; total: number }>`
    select affiliate_id, count(*)::int as count, coalesce(sum(amount), 0)::int as total
    from commission_events where status = 'cho-rut' and payout_id is null group by affiliate_id order by affiliate_id`;
  return {
    mismatched: mismatched.map((r) => ({ id: Number(r.id), affiliateId: r.affiliate_id, amount: Number(r.amount), linked: Number(r.linked) })),
    orphans: orphans.map((r) => ({ affiliateId: r.affiliate_id, count: Number(r.count), total: Number(r.total) })),
  };
}
