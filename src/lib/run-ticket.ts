import type { Sql } from "./db.ts";

export type OpenResult = { id: string; held: number } | { error: "het-tien" | "qua-han-muc" };

/** Nhả các phiếu giữ quá lâu (khách đóng tab giữa chừng) về ví. Trả số tiền đã nhả. */
export async function releaseStaleWith(sql: Sql, userId: string, hours = 6) {
  const rows = await sql<{ freed: number }>`
    with o as (
      select id, held as h from run_tickets
      where user_id = ${userId} and status = 'dang-giu' and created_at < now() - make_interval(hours => ${hours}::int)
      for update
    ),
    t as (
      update run_tickets set released = released + o.h, held = 0,
        status = case when charged > 0 then 'da-tru' else 'da-nha' end
      from o where run_tickets.id = o.id
      returning o.h as freed
    ),
    acc as (
      update room_accounts set balance = balance + (select coalesce(sum(freed), 0) from t)::int
      where user_id = ${userId} and exists (select 1 from t) returning 1
    ),
    led as (
      insert into room_ledger (user_id, kind, amount, note)
      select ${userId}::text, 'nha', (select sum(freed) from t)::int, 'Nhả khoản giữ quá hạn'
      where exists (select 1 from t where freed > 0) returning 1
    )
    select coalesce(sum(freed), 0)::int as freed from t
  `;
  return Number(rows[0]?.freed ?? 0);
}

/**
 * Giữ tiền nguyên tử: một câu UPDATE có điều kiện balance >= số giữ, kèm tạo phiếu và dòng sổ.
 * Hai yêu cầu cùng lúc không thể cùng giữ được số dư chỉ đủ một lần.
 */
export async function openTicketWith(
  sql: Sql,
  input: { id: string; userId: string; fileName: string; seconds: number; rate: number; hold: number; cap: number; dayStartIso: string; scope?: "full" | "translate" },
): Promise<OpenResult> {
  const { id, userId, fileName, seconds, rate, hold, cap, dayStartIso } = input;
  const scope = input.scope === "translate" ? "translate" : "full";
  await sql`insert into room_accounts (user_id) values (${userId}) on conflict (user_id) do nothing`;
  await releaseStaleWith(sql, userId);
  const rows = await sql<{ id: string }>`
    with acc as (
      update room_accounts set balance = balance - ${hold}::int
      where user_id = ${userId} and balance >= ${hold}::int
        and (${cap}::int = 0 or (
          select coalesce(sum(held + charged), 0) from run_tickets
          where user_id = ${userId} and created_at >= ${dayStartIso}::timestamptz and status <> 'da-huy'
        ) + ${hold}::int <= ${cap}::int)
      returning user_id
    ),
    ins as (
      insert into run_tickets (id, user_id, file_name, seconds, rate, held, status, scope)
      select ${id}::text, user_id, ${fileName}::text, ${seconds}::int, ${rate}::int, ${hold}::int, 'dang-giu', ${scope}::text from acc
      returning id
    ),
    led as (
      insert into room_ledger (user_id, kind, amount, note)
      select user_id, 'giu', -${hold}::int, 'Giữ chỗ phiếu ' || ${id}::text from acc returning 1
    )
    select id from ins
  `;
  if (rows.length) return { id, held: hold };
  if (cap > 0) {
    const today = await sql<{ used: number }>`
      select coalesce(sum(held + charged), 0)::int as used from run_tickets
      where user_id = ${userId} and created_at >= ${dayStartIso}::timestamptz and status <> 'da-huy'
    `;
    const bal = await sql<{ balance: number }>`select balance from room_accounts where user_id = ${userId}`;
    if (Number(bal[0]?.balance ?? 0) >= hold && Number(today[0]?.used ?? 0) + hold > cap) return { error: "qua-han-muc" };
  }
  return { error: "het-tien" };
}

/** Còn phiếu đang giữ và còn tiền giữ không. */
export async function ticketLive(sql: Sql, id: string, userId: string) {
  const rows = await sql<{ held: number }>`
    select held from run_tickets where id = ${id} and user_id = ${userId} and status = 'dang-giu' and held > 0
  `;
  return rows.length > 0;
}

/** Loại phiếu còn sống. null khi phiếu không còn để trừ. Phiếu cũ không có loại thì là cả lần chạy. */
export async function ticketKind(sql: Sql, id: string, userId: string): Promise<"full" | "translate" | null> {
  const rows = await sql<{ scope: string | null }>`
    select scope from run_tickets where id = ${id} and user_id = ${userId} and status = 'dang-giu' and held > 0
  `;
  if (!rows.length) return null;
  return rows[0].scope === "translate" ? "translate" : "full";
}

/**
 * Trừ một đoạn đã chạy xong vào phiếu, không bao giờ trừ quá số đang giữ.
 * Trả số thực trừ (có thể nhỏ hơn cost nếu phiếu hết tiền giữ).
 */
export async function chargeTicketWith(sql: Sql, id: string, userId: string, cost: number, base = 0) {
  const safeBase = Math.max(0, Math.round(base));
  const rows = await sql<{ taken: number; left_held: number }>`
    with o as (
      select id, held as h from run_tickets where id = ${id} and user_id = ${userId} and status = 'dang-giu' for update
    )
    update run_tickets
    set charged = charged + least(${cost}::int, o.h),
        base_cost = base_cost + case when ${cost}::int > 0 then round(${safeBase}::numeric * least(${cost}::int, o.h) / ${cost}::int) else 0 end,
        held = held - least(${cost}::int, o.h),
        status = case when held - least(${cost}::int, o.h) <= 0 then 'dung-tien' else status end
    from o where run_tickets.id = o.id
    returning least(${cost}::int, o.h) as taken, run_tickets.held as left_held
  `;
  return Number(rows[0]?.taken ?? 0);
}

/** Kết thúc phiếu: nhả phần giữ thừa về ví. Chạy lại lần hai không làm gì. */
export async function closeTicketWith(sql: Sql, id: string, userId: string, failed: boolean) {
  const rows = await sql<{ freed: number; charged: number; status: string }>`
    with o as (
      select id, held as h from run_tickets where id = ${id} and user_id = ${userId} and status = 'dang-giu' for update
    ),
    t as (
      update run_tickets set released = released + o.h, held = 0,
        status = case when charged > 0 then 'da-tru' when ${failed}::boolean then 'loi' else 'da-nha' end
      from o where run_tickets.id = o.id
      returning o.h as freed, run_tickets.charged as charged, run_tickets.status as status
    ),
    acc as (
      update room_accounts set balance = balance + t.freed from t where user_id = ${userId} returning 1
    ),
    led as (
      insert into room_ledger (user_id, kind, amount, note)
      select ${userId}::text, 'nha', t.freed, 'Nhả khoản giữ thừa phiếu ' || ${id}::text from t where t.freed > 0 returning 1
    )
    select freed, charged, status from t
  `;
  if (!rows.length) return null;
  const closed = { freed: Number(rows[0].freed), charged: Number(rows[0].charged), status: rows[0].status };
  if (closed.charged > 0) {
    try {
      const { accrueRun } = await import("@/lib/affiliate-flow");
      await accrueRun(sql, userId, id);
    } catch {
      /* hoa hồng không được chặn việc nhả tiền */
    }
  }
  return closed;
}

/** Trừ thẳng ví cho một lần đọc thuyết minh (biết trước số ký tự nên không cần giữ chỗ). */
export async function chargeSpeechWith(sql: Sql, userId: string, cost: number, dayKey: string, cap: number, dayStartIso: string, base = 0) {
  const ticket = `tts-${userId}-${dayKey}`;
  const safeBase = Math.max(0, Math.round(base));
  const rows = await sql<{ user_id: string }>`
    with upd as (
      update room_accounts set balance = balance - ${cost}::int
      where user_id = ${userId} and balance >= ${cost}::int
        and (${cap}::int = 0 or (
          select coalesce(sum(held + charged), 0) from run_tickets
          where user_id = ${userId} and created_at >= ${dayStartIso}::timestamptz and status <> 'da-huy'
        ) + ${cost}::int <= ${cap}::int)
      returning user_id
    ),
    led as (
      insert into room_ledger (user_id, kind, amount, note)
      select user_id, 'luot', -${cost}::int, 'Đọc thuyết minh' from upd returning 1
    ),
    tk as (
      insert into run_tickets (id, user_id, file_name, charged, base_cost, status)
      select ${ticket}::text, user_id, 'Đọc thuyết minh', ${cost}::int, ${safeBase}::int, 'da-tru' from upd
      on conflict (id) do update set charged = run_tickets.charged + ${cost}::int, base_cost = run_tickets.base_cost + ${safeBase}::int
      returning 1
    )
    select user_id from upd
  `;
  if (!rows.length) return false;
  try {
    const { accrueRun } = await import("@/lib/affiliate-flow");
    await accrueRun(sql, userId, ticket);
  } catch {
    /* hoa hồng không chặn lần đọc */
  }
  return true;
}

/** Hoàn lại khoản đã trừ cho lần đọc khi Groq báo lỗi. */
export async function refundSpeechWith(sql: Sql, userId: string, cost: number, dayKey: string, base = 0) {
  const ticket = `tts-${userId}-${dayKey}`;
  const safeBase = Math.max(0, Math.round(base));
  await sql`
    with acc as (update room_accounts set balance = balance + ${cost}::int where user_id = ${userId} returning user_id),
    tk as (
      update run_tickets
      set charged = greatest(0, charged - ${cost}::int), base_cost = greatest(0, base_cost - ${safeBase}::int)
      where id = ${ticket} returning 1
    )
    insert into room_ledger (user_id, kind, amount, note)
    select user_id, 'nha', ${cost}::int, 'Hoàn đoạn đọc lỗi' from acc
  `;
  try {
    const { clawback, accrueRun } = await import("@/lib/affiliate-flow");
    await clawback(sql, "luot", ticket);
    await accrueRun(sql, userId, ticket);
  } catch {
    /* hoàn tiền vẫn xong nếu hoa hồng lỗi */
  }
}
