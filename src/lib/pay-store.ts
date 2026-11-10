import { createServerFn } from "@tanstack/react-start";
import { confirmOrderWith } from "@/lib/pay-confirm";
import { creditHitWith } from "@/lib/pay-flow";
import { randomBytes } from "node:crypto";
import { toDataURL } from "qrcode";
import type { Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { accountMatches, cassoHits, randomPayCode, PAY_MINUTES, sepayHit, vietqrPayload, type PayHit } from "@/lib/pay-match";

export type PayPublic = { sepay: boolean; casso: boolean };

export type PaySettingsView = PayPublic & {
  sepayOn: boolean;
  cassoOn: boolean;
  sepayBank: string;
  sepayAccount: string;
  sepayName: string;
  sepayKeySet: boolean;
  cassoBank: string;
  cassoAccount: string;
  cassoName: string;
  cassoTokenSet: boolean;
  cassoKeySet: boolean;
};

export type PayOrderView = {
  id: string;
  provider: "sepay" | "casso";
  amount: number;
  code: string;
  status: string;
  bank: string;
  account: string;
  name: string;
  qr: string;
  /** true khi mã quét được bằng ứng dụng ngân hàng. */
  qrLive: boolean;
  createdAt: string;
};

type Settings = {
  sepay_key: string;
  sepay_bank: string;
  sepay_account: string;
  sepay_name: string;
  casso_token: string;
  casso_key: string;
  casso_bank: string;
  casso_account: string;
  casso_name: string;
  sepay_on: boolean;
  casso_on: boolean;
};

const EMPTY: Settings = {
  sepay_key: "",
  sepay_bank: "",
  sepay_account: "",
  sepay_name: "",
  casso_token: "",
  casso_key: "",
  casso_bank: "",
  casso_account: "",
  casso_name: "",
  sepay_on: true,
  casso_on: true,
};

function ready(bank: string, account: string, secret: string) {
  return Boolean(bank.trim() && account.trim() && secret.trim());
}

function viewOf(row: Settings): PaySettingsView {
  return {
    sepay: row.sepay_on && ready(row.sepay_bank, row.sepay_account, row.sepay_key),
    casso: row.casso_on && ready(row.casso_bank, row.casso_account, row.casso_token || row.casso_key),
    sepayOn: row.sepay_on,
    cassoOn: row.casso_on,
    sepayBank: row.sepay_bank,
    sepayAccount: row.sepay_account,
    sepayName: row.sepay_name,
    sepayKeySet: Boolean(row.sepay_key),
    cassoBank: row.casso_bank,
    cassoAccount: row.casso_account,
    cassoName: row.casso_name,
    cassoTokenSet: Boolean(row.casso_token),
    cassoKeySet: Boolean(row.casso_key),
  };
}

async function readSettings(): Promise<Settings> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<Settings>`select sepay_key, sepay_bank, sepay_account, sepay_name, casso_token, casso_key, casso_bank, casso_account, casso_name, sepay_on, casso_on from pay_settings where id = 1`;
  return rows[0] ?? EMPTY;
}

async function qrUrl(bank: string, account: string, amount: number, code: string) {
  const live = vietqrPayload({ bank, account, amount, info: code });
  const text = live || ["Chuyen khoan", bank.trim(), account.trim(), String(amount), code].filter(Boolean).join(" ");
  return { qr: await toDataURL(text, { margin: 1, width: 280, errorCorrectionLevel: "M" }), qrLive: Boolean(live) };
}

async function expireMine(sql: Sql, userId: string) {
  await sql`
    update pay_orders
    set status = 'expired', provider_ref = coalesce(provider_ref, 'het-han')
    where user_id = ${userId}
      and status in ('pending', 'claimed')
      and created_at <= now() - (${PAY_MINUTES} * interval '1 minute')
  `;
}


async function writePayNotice(userId: string | null, kind: string, title: string, body: string) {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into room_notices (user_id, kind, title, body, appeal_id)
      values (${userId}, ${kind}, ${title.slice(0, 120)}, ${body.slice(0, 500)}, ${null})
    `;
  } catch {
    /* bảng notice có sau lần xây mới */
  }
}

async function creditHit(provider: "sepay" | "casso", hit: PayHit) {
  const { getSql } = await import("@/lib/db");
  const done = await creditHitWith(await getSql(), provider, hit);
  if (done) await writePayNotice(done.userId, "user", "Đã cộng tiền nạp", `Đã cộng ${done.amount} đ vào số dư (mã ${done.code}).`);
  return Boolean(done);
}

async function requireOwner(userId: string) {
  const { isOwnerId } = await import("@/lib/admin-allow.server");
  const { getSql } = await import("@/lib/db");
  if (!(await isOwnerId(await getSql(), userId))) throw new Error("Chi Chu duoc sua cong thanh toan.");
}

export const getPayPublic = createServerFn({ method: "GET" }).handler(async (): Promise<PayPublic> => {
  const row = await readSettings();
  const view = viewOf(row);
  return { sepay: view.sepay, casso: view.casso };
});

export const getPaySettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PaySettingsView> => {
    await requireOwner(context.userId);
    return viewOf(await readSettings());
  });

export const savePaySettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Partial<Settings>) => input)
  .handler(async ({ context, data }): Promise<PaySettingsView> => {
    await requireOwner(context.userId);
    const current = await readSettings();
    const next: Settings = {
      sepay_key: data.sepay_key?.trim() || current.sepay_key,
      sepay_bank: (data.sepay_bank ?? current.sepay_bank).trim(),
      sepay_account: (data.sepay_account ?? current.sepay_account).trim(),
      sepay_name: (data.sepay_name ?? current.sepay_name).trim(),
      casso_token: data.casso_token?.trim() || current.casso_token,
      casso_key: data.casso_key?.trim() || current.casso_key,
      casso_bank: (data.casso_bank ?? current.casso_bank).trim(),
      casso_account: (data.casso_account ?? current.casso_account).trim(),
      casso_name: (data.casso_name ?? current.casso_name).trim(),
      sepay_on: current.sepay_on,
      casso_on: current.casso_on,
    };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into pay_settings (
        id, sepay_key, sepay_bank, sepay_account, sepay_name,
        casso_token, casso_key, casso_bank, casso_account, casso_name, sepay_on, casso_on
      ) values (
        1, ${next.sepay_key}, ${next.sepay_bank}, ${next.sepay_account}, ${next.sepay_name},
        ${next.casso_token}, ${next.casso_key}, ${next.casso_bank}, ${next.casso_account}, ${next.casso_name},
        ${next.sepay_on}, ${next.casso_on}
      )
      on conflict (id) do update set
        sepay_key = excluded.sepay_key,
        sepay_bank = excluded.sepay_bank,
        sepay_account = excluded.sepay_account,
        sepay_name = excluded.sepay_name,
        casso_token = excluded.casso_token,
        casso_key = excluded.casso_key,
        casso_bank = excluded.casso_bank,
        casso_account = excluded.casso_account,
        casso_name = excluded.casso_name,
        sepay_on = excluded.sepay_on,
        casso_on = excluded.casso_on
    `;
    return viewOf(next);
  });

/** Số đơn nạp chưa xong tối đa của một tài khoản. */
const MAX_PENDING_ORDERS = 3;

export const createPayOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { provider: string; amount: number }) => {
    const provider = input.provider;
    if (provider !== "sepay" && provider !== "casso") throw new Error("Cong khong dung.");
    const amount = Math.round(Number(input.amount));
    if (!Number.isFinite(amount) || amount < 10_000 || amount > 1_000_000) throw new Error("So tien tu 10.000 den 1.000.000 dong.");
    return { provider, amount };
  })
  .handler(async ({ context, data }): Promise<PayOrderView> => {
    const { requireOpenAccount } = await import("@/lib/guard.server");
    await requireOpenAccount(context.userId);
    const settings = await readSettings();
    const view = viewOf(settings);
    if (data.provider === "sepay" && !view.sepay) throw new Error("Sepay dang bao tri.");
    if (data.provider === "casso" && !view.casso) throw new Error("Casso dang bao tri.");
    const bank = data.provider === "sepay" ? settings.sepay_bank : settings.casso_bank;
    const account = data.provider === "sepay" ? settings.sepay_account : settings.casso_account;
    const name = data.provider === "sepay" ? settings.sepay_name : settings.casso_name;
    const id = randomBytes(12).toString("hex");
    const code = randomPayCode(randomBytes(6));
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await expireMine(sql, context.userId);
    const { takeRate } = await import("@/lib/guard.server");
    await takeRate(`pay-create:${context.userId}`, 10, 3600);
    const made = await sql<{ id: string; created_at: Date | string }>`
      insert into pay_orders (id, user_id, provider, amount, code)
      select ${id}::text, ${context.userId}::text, ${data.provider}::text, ${data.amount}::int, ${code}::text
      where (select count(*) from pay_orders where user_id = ${context.userId} and status in ('pending', 'claimed')) < ${MAX_PENDING_ORDERS}
      returning id, created_at
    `;
    if (!made.length) throw new Error(`Bạn đang có ${MAX_PENDING_ORDERS} đơn nạp chưa xong. Hãy chuyển khoản hoặc hủy bớt rồi tạo đơn mới.`);
    await writePayNotice(context.userId, "user", "Đã tạo đơn nạp", `Đơn ${code}: ${data.amount} đ qua ${data.provider}. Chờ xác nhận hoặc chuyển khoản.`);
    const picture = await qrUrl(bank, account, data.amount, code);
    return {
      id,
      provider: data.provider as "sepay" | "casso",
      amount: data.amount,
      code,
      status: "pending",
      bank,
      account,
      name,
      qr: picture.qr,
      qrLive: picture.qrLive,
      createdAt: new Date(made[0].created_at).toISOString(),
    };
  });

export const readPayOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id.trim())
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await expireMine(sql, context.userId);
    const rows = await sql<{ status: string; amount: number; created_at: Date | string }>`
      select status, amount, created_at from pay_orders where id = ${data} and user_id = ${context.userId}
    `;
    if (!rows.length) throw new Error("Khong thay don nap.");
    const row = rows[0];
    return { status: row.status, amount: row.amount, createdAt: new Date(row.created_at).toISOString() };
  });

export const cancelMyPayOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    const value = id?.trim();
    if (!value) throw new Error("Thieu don nap.");
    return value;
  })
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      update pay_orders
      set status = 'void', provider_ref = coalesce(provider_ref, 'khach-huy')
      where id = ${data} and user_id = ${context.userId} and status in ('pending', 'claimed')
      returning id
    `;
    if (!rows.length) throw new Error("Đơn này không còn để hủy.");
    return { ok: true as const };
  });

export type PayHistoryItem = {
  id: string;
  provider: string;
  amount: number;
  code: string;
  status: string;
  createdAt: string;
};

export const getPayDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ live: PayOrderView | null; history: PayHistoryItem[] }> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await expireMine(sql, context.userId);
    const settings = await readSettings();
    const rows = await sql<{
      id: string;
      provider: string;
      amount: number;
      code: string;
      status: string;
      created_at: Date | string;
    }>`
      select id, provider, amount, code, status, created_at
      from pay_orders
      where user_id = ${context.userId}
      order by created_at desc
      limit 8
    `;
    const history = rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      amount: row.amount,
      code: row.code,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
    }));
    const open = rows.find((row) => row.status === "pending" || row.status === "claimed");
    if (!open || (open.provider !== "sepay" && open.provider !== "casso")) return { live: null, history };
    const bank = open.provider === "sepay" ? settings.sepay_bank : settings.casso_bank;
    const account = open.provider === "sepay" ? settings.sepay_account : settings.casso_account;
    const name = open.provider === "sepay" ? settings.sepay_name : settings.casso_name;
    const picture = await qrUrl(bank, account, open.amount, open.code);
    return {
      live: {
        id: open.id,
        provider: open.provider,
        amount: open.amount,
        code: open.code,
        status: open.status,
        bank,
        account,
        name,
        qr: picture.qr,
        qrLive: picture.qrLive,
        createdAt: new Date(open.created_at).toISOString(),
      },
      history,
    };
  });

export const syncCasso = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { takeRate } = await import("@/lib/guard.server");
    await takeRate(`casso-sync:${context.userId}`, 1, 15);
    const settings = await readSettings();
    if (!settings.casso_key) return { checked: false };
    const response = await fetch("https://oauth.casso.vn/v2/transactions?pageSize=20&sort=DESC", {
      headers: { Authorization: `Apikey ${settings.casso_key}` },
    });
    if (!response.ok) throw new Error("Casso chua tra danh sach giao dich.");
    const body = (await response.json()) as unknown;
    for (const hit of cassoHits(body)) {
      if (accountMatches(hit.account, settings.casso_account)) await creditHit("casso", hit);
    }
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const pending = await sql<{ id: string }>`
      select id from pay_orders where user_id = ${context.userId} and provider = 'casso' and status in ('pending', 'claimed') order by created_at desc limit 1
    `;
    return { checked: true, pending: pending.length > 0 };
  });

export type PayClaim = {
  id: string;
  email: string;
  name: string;
  provider: string;
  amount: number;
  code: string;
  status: string;
  createdAt: string;
};

async function requireStaff(userId: string, lead: boolean) {
  const { isOwnerId } = await import("@/lib/admin-allow.server");
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  if (await isOwnerId(sql, userId)) return;
  const rows = await sql<{ role: string | null }>`select role from room_staff where user_id = ${userId}`;
  if (!lead && rows[0]?.role === "quan-ly") return;
  throw new Error(lead ? "Chi Chu duoc sua cong nap." : "Chi Quan ly hoac Chu duoc xem don nap.");
}

export const claimPayOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    const value = id?.trim();
    if (!value) throw new Error("Thieu don nap.");
    return value;
  })
  .handler(async ({ context, data }) => {
    const { takeRate } = await import("@/lib/guard.server");
    await takeRate(`pay-claim:${context.userId}`, 10, 3600);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const claimed = await sql<{ amount: number; code: string; provider: string }>`
      update pay_orders set status = 'claimed'
      where id = ${data} and user_id = ${context.userId} and status = 'pending'
      returning amount, code, provider
    `;
    const order = claimed[0];
    if (order) {
      const who = await sql<{ email: string }>`select email from "user" where id = ${context.userId}`;
      const email = who[0]?.email ?? "";
      await writePayNotice(
        null,
        "viec",
        "Khách báo đã chuyển",
        `${email}: báo đã chuyển ${order.amount} đ · mã ${order.code} · ${order.provider}`,
      );
    }
    return { ok: true };
  });

export const listPayOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PayClaim[]> => {
    await requireStaff(context.userId, false);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      update pay_orders
      set status = 'expired', provider_ref = coalesce(provider_ref, 'het-han')
      where status in ('pending', 'claimed')
        and created_at <= now() - (${PAY_MINUTES} * interval '1 minute')
    `;
    const rows = await sql<{
      id: string;
      email: string | null;
      name: string | null;
      provider: string;
      amount: number;
      code: string;
      status: string;
      created_at: Date | string;
    }>`
      select o.id, u.email, u.name, o.provider, o.amount, o.code, o.status, o.created_at
      from pay_orders o
      left join "user" u on u.id = o.user_id
      order by o.created_at desc
      limit 40
    `;
    return rows.map((row) => ({
      id: row.id,
      email: row.email ?? "",
      name: row.name ?? "",
      provider: row.provider,
      amount: row.amount,
      code: row.code,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  });

export const confirmPayOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    const value = id?.trim();
    if (!value) throw new Error("Thieu don nap.");
    return value;
  })
  .handler(async ({ context, data }) => {
    // Chỉ Chủ được xác nhận thủ công, vì việc này cộng tiền thật vào ví.
    await requireStaff(context.userId, true);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const who = await sql<{ email: string }>`select email from "user" where id = ${context.userId}`;
    const actorEmail = who[0]?.email ?? "";
    const done = await confirmOrderWith(sql, data, context.userId, actorEmail);
    if (!done) throw new Error("Don nay da xu ly hoac khong con.");
    await writePayNotice(done.userId, "user", "Đã cộng tiền nạp", `Đã cộng ${done.amount} đ vào số dư (mã ${done.code}).`);
    return { ok: true };
  });

export const cancelPayOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    const value = id?.trim();
    if (!value) throw new Error("Thieu don nap.");
    return value;
  })
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId, false);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ id: string; status: string; code: string; user_id: string; amount: number }>`
      update pay_orders
      set status = 'cancelled', provider_ref = coalesce(provider_ref, 'huy-xac-nhan')
      where id = ${data} and status in ('pending', 'claimed')
      returning id, status, code, user_id, amount
    `;
    if (!rows.length) throw new Error("Don nay da xu ly hoac khong con de huy.");
    const order = rows[0];
    const who = await sql<{ email: string }>`select email from "user" where id = ${context.userId}`;
    const actor = who[0]?.email ?? "";
    await sql`
      insert into room_ledger (user_id, kind, amount, note)
      values (${order.user_id}, 'huy-nap', 0, ${"Từ chối nạp " + order.code + " (" + order.amount + " đ) bởi " + actor})
    `;
    await sql`
      insert into room_audit (actor_id, action, target_id, note, actor_email, actor_role, target_email)
      values (${context.userId}, 'huy-nap', ${order.user_id}, ${order.code}, ${actor}, 'nhan-vien', ${""})
    `;
    await writePayNotice(order.user_id, "user", "Từ chối đơn nạp", `Đơn ${order.code} (${order.amount} đ) đã bị từ chối. Không cộng tiền.`);
    return { ok: true as const, code: order.code };
  });

export const setPayGate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { provider: string; on?: boolean; clear?: boolean }) => {
    const provider = input.provider === "casso" ? "casso" : input.provider === "sepay" ? "sepay" : "";
    if (!provider) throw new Error("Cong khong dung.");
    return { provider, on: Boolean(input.on), clear: Boolean(input.clear) };
  })
  .handler(async ({ context, data }) => {
    await requireOwner(context.userId);
    const current = await readSettings();
    const next = { ...current };
    if (data.clear) {
      if (data.provider === "sepay") {
        next.sepay_key = "";
        next.sepay_bank = "";
        next.sepay_account = "";
        next.sepay_name = "";
        next.sepay_on = false;
      } else {
        next.casso_token = "";
        next.casso_key = "";
        next.casso_bank = "";
        next.casso_account = "";
        next.casso_name = "";
        next.casso_on = false;
      }
    } else if (data.provider === "sepay") next.sepay_on = data.on;
    else next.casso_on = data.on;
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into pay_settings (
        id, sepay_key, sepay_bank, sepay_account, sepay_name, sepay_on,
        casso_token, casso_key, casso_bank, casso_account, casso_name, casso_on
      ) values (
        1, ${next.sepay_key}, ${next.sepay_bank}, ${next.sepay_account}, ${next.sepay_name}, ${next.sepay_on},
        ${next.casso_token}, ${next.casso_key}, ${next.casso_bank}, ${next.casso_account}, ${next.casso_name}, ${next.casso_on}
      )
      on conflict (id) do update set
        sepay_key = excluded.sepay_key,
        sepay_bank = excluded.sepay_bank,
        sepay_account = excluded.sepay_account,
        sepay_name = excluded.sepay_name,
        sepay_on = excluded.sepay_on,
        casso_token = excluded.casso_token,
        casso_key = excluded.casso_key,
        casso_bank = excluded.casso_bank,
        casso_account = excluded.casso_account,
        casso_name = excluded.casso_name,
        casso_on = excluded.casso_on
    `;
    return viewOf(next);
  });

function headerSecret(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const apikey = auth.toLowerCase().startsWith("apikey ") ? auth.slice(7).trim() : "";
  const secure = request.headers.get("secure-token") ?? "";
  return { apikey, secure };
}

export async function handleSepay(request: Request) {
  const { sameSecret } = await import("@/lib/pay-secret.server");
  const settings = await readSettings();
  const { apikey } = headerSecret(request);
  if (!settings.sepay_key || !sameSecret(apikey, settings.sepay_key)) {
    return Response.json({ success: false }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const hit = sepayHit(body);
  if (hit && accountMatches(hit.account, settings.sepay_account)) await creditHit("sepay", hit);
  return Response.json({ success: true });
}

export async function handleCasso(request: Request) {
  const { sameSecret } = await import("@/lib/pay-secret.server");
  const settings = await readSettings();
  const { apikey, secure } = headerSecret(request);
  const tokenOk = Boolean(settings.casso_token) && sameSecret(secure, settings.casso_token);
  const keyOk = Boolean(settings.casso_key) && sameSecret(apikey, settings.casso_key);
  if (!tokenOk && !keyOk) return Response.json({ success: false }, { status: 401 });
  const body = await request.json().catch(() => null);
  for (const hit of cassoHits(body)) {
    if (accountMatches(hit.account, settings.casso_account)) await creditHit("casso", hit);
  }
  return Response.json({ success: true });
}
