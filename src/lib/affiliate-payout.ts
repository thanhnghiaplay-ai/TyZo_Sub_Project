/**
 * LỆNH RÚT HOA HỒNG CỦA CỘNG TÁC VIÊN: tạo, xác nhận đã chuyển, hủy. Tách khỏi cửa máy chủ (affiliate-room.ts) để thử
 * trên Postgres thật nhiều kết nối. KHÔNG đổi cách tính hoa hồng, mức tối thiểu hay quy tắc duyệt; chỉ làm các bước
 * cùng có hiệu lực (kiểm toán v5.49: R5-001, R5-002, R5-003, R5-004).
 *
 * - Mỗi khoản hoa hồng gắn đúng lệnh rút của nó (commission_events.payout_id); khoản cũ chưa gắn vẫn đọc theo CTV.
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

/** Admin xác nhận đã chuyển tiền. Lệnh không còn chờ chuyển (đã hủy, đã chi) thì báo lỗi, không đụng khoản nào. */
export async function markPayoutWith(sql: Sql, id: number, ref: string) {
  return inTransaction(sql, async (tx) => {
    const done = await tx<{ affiliate_id: string }>`
      update affiliate_payouts set status = 'da-chi', paid_ref = ${ref}, paid_at = now()
      where id = ${id} and status = 'cho-chi' returning affiliate_id`;
    if (!done.length) throw new Error("Lệnh rút này không còn chờ chuyển (đã chi hoặc đã hủy).");
    await tx`
      update commission_events set status = 'da-chi'
      where status = 'cho-rut' and (payout_id = ${id} or (payout_id is null and affiliate_id = ${done[0].affiliate_id}))`;
    return { ok: true as const };
  });
}

/** Admin từ chối lệnh rút: trả đúng các khoản của lệnh đó về «Rút được». */
export async function cancelPayoutWith(sql: Sql, id: number, note: string) {
  return inTransaction(sql, async (tx) => {
    const rows = await tx<{ affiliate_id: string }>`
      update affiliate_payouts set status = 'huy', note = ${note}
      where id = ${id} and status = 'cho-chi' returning affiliate_id`;
    if (rows.length) {
      await tx`
        update commission_events set status = 'da-duyet', payout_id = null
        where status = 'cho-rut' and (payout_id = ${id} or (payout_id is null and affiliate_id = ${rows[0].affiliate_id}))`;
    }
    return { ok: rows.length > 0 };
  });
}
