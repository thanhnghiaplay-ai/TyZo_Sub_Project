import type { Sql } from "./db.ts";

type GiayOpen = { id: string; held: number } | { error: "het-giay" };

/** Cộng số giây còn hạn. Không tính gói đã hết hạn. */
export async function giayBalance(sql: Sql, userId: string) {
  const rows = await sql<{ n: number }>`
    select coalesce(sum(left_tokens), 0)::int as n from token_grants
    where user_id = ${userId} and expires_at > now() and left_tokens > 0
  `;
  return Number(rows[0]?.n ?? 0);
}

/**
 * Mua gói: trừ ví đồng, ghi Token dịch, ghi sổ. Không cộng hoa hồng.
 * Một câu lệnh, số dư không đủ thì không tạo gói.
 */
export async function buyGiayWith(
  sql: Sql,
  userId: string,
  input: { grantId: string; tokens: number; days: number; price: number; note: string },
): Promise<{ balance: number } | { error: "het-tien" }> {
  const { grantId, tokens, days, price, note } = input;
  await sql`insert into room_accounts (user_id) values (${userId}) on conflict (user_id) do nothing`;
  const rows = await sql<{ balance: number }>`
    with pay as (
      update room_accounts set balance = balance - ${price}::int
      where user_id = ${userId} and balance >= ${price}::int
      returning user_id, balance
    ),
    g as (
      insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at)
      select ${grantId}::text, user_id, ${tokens}::int, ${tokens}::int, ${price}::int, now() + make_interval(days => ${days}::int)
      from pay
      returning id
    ),
    led as (
      insert into room_ledger (user_id, kind, amount, note)
      select user_id, 'goi-giay', -${price}::int, ${note}::text from pay
      returning 1
    )
    select balance from pay
  `;
  if (!rows.length) return { error: "het-tien" };
  return { balance: Number(rows[0].balance) };
}

/**
 * Giữ giây theo hạn gần nhất. Không đủ thì không trừ gói và không tạo phiếu.
 * Phiếu mang unit token để lần đóng không cộng nhầm vào ví đồng.
 */
export async function openGiayWith(
  sql: Sql,
  input: { id: string; userId: string; fileName: string; seconds: number; rate: number; hold: number; asrModel?: string; chatModel?: string; modalPrice?: string },
): Promise<GiayOpen> {
  const { id, userId, fileName, seconds, rate, hold } = input;
  const asrModel = input.asrModel ?? "";
  const chatModel = input.chatModel ?? "";
  const rows = await sql<{ id: string }>`
    with locked as (
      select id, left_tokens, expires_at from token_grants
      where user_id = ${userId} and expires_at > now() and left_tokens > 0
      order by expires_at, id
      for update
    ),
    ranked as (
      select id, left_tokens, sum(left_tokens) over (order by expires_at, id) as running from locked
    ),
    take as (
      select id, least(left_tokens, greatest(0, ${hold}::int - (running - left_tokens)))::int as n from ranked
    ),
    ok as (
      select coalesce(sum(n), 0)::int as total from take
    ),
    upd as (
      update token_grants g set left_tokens = g.left_tokens - take.n
      from take, ok
      where g.id = take.id and take.n > 0 and ok.total >= ${hold}::int
      returning take.n
    ),
    sl as (
      insert into token_slices (ticket_id, grant_id, left_tokens, charged)
      select ${id}::text, take.id, take.n, 0 from take, ok
      where take.n > 0 and ok.total >= ${hold}::int
      returning 1
    ),
    tk as (
      insert into run_tickets (id, user_id, file_name, seconds, rate, held, status, asr_model, chat_model, unit, modal_price)
      select ${id}::text, ${userId}::text, ${fileName}::text, ${seconds}::int, ${rate}::int, ${hold}::int, 'dang-giu', ${asrModel}::text, ${chatModel}::text, 'token', ${input.modalPrice ?? null}
      where exists (select 1 from ok where total >= ${hold}::int)
      returning id
    )
    select tk.id as id from tk
    where (select count(*) from sl) >= 0 and (select coalesce(sum(n), 0) from upd) >= 0
  `;
  if (!rows.length) return { error: "het-giay" };
  return { id, held: hold };
}

/** Trừ giây đã giữ trên phiếu. Không trừ quá phần còn giữ. Không đụng ví đồng. */
export async function chargeTokenWith(sql: Sql, id: string, userId: string, cost: number) {
  const rows = await sql<{ taken: number }>`
    with o as (
      select id from run_tickets
      where id = ${id} and user_id = ${userId} and status = 'dang-giu' and unit = 'token'
      for update
    ),
    locked as (
      select s.grant_id, s.left_tokens from token_slices s
      join o on o.id = s.ticket_id
      where s.left_tokens > 0
      order by s.grant_id
      for update
    ),
    ranked as (
      select grant_id, left_tokens, sum(left_tokens) over (order by grant_id) as running from locked
    ),
    take as (
      select grant_id, least(left_tokens, greatest(0, ${cost}::int - (running - left_tokens)))::int as n from ranked
    ),
    upd as (
      update token_slices s
      set left_tokens = s.left_tokens - take.n, charged = s.charged + take.n
      from take
      where s.ticket_id = ${id} and s.grant_id = take.grant_id and take.n > 0
      returning take.n
    ),
    summed as (
      select coalesce(sum(n), 0)::int as taken from upd
    ),
    tk as (
      update run_tickets
      set charged = charged + summed.taken,
          base_cost = base_cost + summed.taken,
          held = held - summed.taken,
          status = case when held - summed.taken <= 0 then 'dung-tien' else status end,
          closed_at = case when held - summed.taken <= 0 then now() else closed_at end
      from summed
      where run_tickets.id = ${id} and exists (select 1 from o)
      returning summed.taken as taken
    )
    select taken from tk
  `;
  return Number(rows[0]?.taken ?? 0);
}

/**
 * Đóng phiếu giây: phần giữ chưa trừ trả về gói còn hạn. Gói đã hết hạn thì mất.
 * Không cộng ví đồng, không tính hoa hồng.
 */
export async function closeTokenWith(sql: Sql, id: string, userId: string, failed: boolean) {
  const rows = await sql<{ freed: number; charged: number; status: string }>`
    with o as (
      select id, held from run_tickets
      where id = ${id} and user_id = ${userId} and status = 'dang-giu' and unit = 'token'
      for update
    ),
    slices as (
      select s.grant_id, s.left_tokens from token_slices s
      join o on o.id = s.ticket_id
      for update
    ),
    back as (
      update token_grants g set left_tokens = g.left_tokens + slices.left_tokens
      from slices
      where g.id = slices.grant_id and g.expires_at > now() and slices.left_tokens > 0
      returning slices.left_tokens as put
    ),
    clear as (
      update token_slices set left_tokens = 0
      from o where token_slices.ticket_id = o.id
      returning token_slices.grant_id
    ),
    t as (
      update run_tickets
      set released = released + o.held, held = 0, closed_at = now(),
          status = case when charged > 0 then 'da-tru' when ${failed}::boolean then 'loi' else 'da-nha' end
      from o where run_tickets.id = o.id
      returning o.held as freed, run_tickets.charged as charged, run_tickets.status as status
    )
    select t.freed as freed, t.charged as charged, t.status as status
    from t
    where (select coalesce(sum(put), 0) from back) >= 0
      and (select count(*) from clear) >= 0
  `;
  if (!rows.length) return null;
  return { freed: Number(rows[0].freed), charged: Number(rows[0].charged), status: rows[0].status };
}

/** Nhả các phiếu giây giữ quá lâu. Phần còn hạn trả về gói. Không cộng ví đồng. */
export async function releaseStaleTokensWith(sql: Sql, userId: string, hours = 6) {
  const rows = await sql<{ id: string }>`
    select id from run_tickets
    where user_id = ${userId} and status = 'dang-giu' and unit = 'token'
      and created_at < now() - make_interval(hours => ${hours}::int)
  `;
  let n = 0;
  for (const row of rows) {
    const closed = await closeTokenWith(sql, row.id, userId, false);
    if (closed) n += 1;
  }
  return n;
}

/**
 * Đặt số Token dịch còn hạn về đúng một mức.
 * Phần thêm được ghi gói mới, hạn 365 ngày, giá 0. Phần bớt lấy gói sắp hết hạn trước.
 */
export async function setTokenBalanceWith(sql: Sql, userId: string, target: number) {
  const before = await giayBalance(sql, userId);
  const delta = target - before;
  if (delta > 0) {
    const id = `adj-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    await sql`
      insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at)
      values (${id}, ${userId}, ${delta}::int, ${delta}::int, 0, now() + interval '365 days')
    `;
  } else if (delta < 0) {
    const cut = -delta;
    await sql`
      with locked as (
        select id, left_tokens, expires_at from token_grants
        where user_id = ${userId} and expires_at > now() and left_tokens > 0
        order by expires_at, id
        for update
      ),
      ranked as (
        select id, left_tokens, sum(left_tokens) over (order by expires_at, id) as running from locked
      ),
      take as (
        select id, least(left_tokens, greatest(0, ${cut}::int - (running - left_tokens)))::int as n from ranked
      )
      update token_grants g set left_tokens = g.left_tokens - take.n
      from take
      where g.id = take.id and take.n > 0
    `;
  }
  return { before, after: await giayBalance(sql, userId) };
}
