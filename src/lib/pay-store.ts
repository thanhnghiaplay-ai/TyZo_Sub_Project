import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";
import { toDataURL } from "qrcode";
import { authMiddleware } from "@/lib/auth/middleware";
import { cassoHits, codesIn, makePayCode, sameSecret, sepayHit, type PayHit } from "@/lib/pay-match";

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
  const text = ["Chuyen khoan", bank.trim(), account.trim(), String(amount), code].filter(Boolean).join(" ");
  return toDataURL(text, { margin: 1, width: 280, errorCorrectionLevel: "M" });
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
  const codes = codesIn(hit.text);
  if (!codes.length) return false;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const orders = await sql<{ id: string; user_id: string; amount: number; code: string }>`
    select id, user_id, amount, code from pay_orders
    where status in ('pending', 'claimed') and provider = ${provider} and code in (${codes[0]}, ${codes[1] ?? codes[0]}, ${codes[2] ?? codes[0]})
  `;
  const order = orders.find((item) => codes.includes(item.code) && hit.amount >= item.amount);
  if (!order) return false;
  const applied = await sql<{ user_id: string }>`
    with seen as (
      insert into pay_seen (provider, provider_ref) values (${provider}, ${hit.ref})
      on conflict do nothing
      returning provider_ref
    ),
    paid as (
      update pay_orders
      set status = 'paid', provider_ref = ${hit.ref}
      where id = ${order.id} and status in ('pending', 'claimed') and exists (select 1 from seen)
      returning user_id, amount
    ),
    account as (
      insert into room_accounts (user_id, balance)
      select user_id, ${hit.amount} from paid
      on conflict (user_id) do update set balance = room_accounts.balance + ${hit.amount}
      returning user_id
    )
    insert into room_ledger (user_id, kind, amount, note)
    select user_id, 'nap', ${hit.amount}, ${"Nap " + provider + " " + order.code} from account
    returning user_id
  `;
  if (applied.length > 0) {
    const uid = applied[0].user_id;
    await writePayNotice(uid, "user", "Đã cộng tiền nạp", `Đã cộng ${hit.amount} đ vào số dư (mã ${order.code}).`);
  }
  return applied.length > 0;
}

async function requireOwner(userId: string) {
  const { emailIsOwner } = await import("@/lib/admin-allow.server");
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ email: string; role: string | null }>`
    select u.email, s.role from "user" u left join room_staff s on s.user_id = u.id where u.id = ${userId}
  `;
  const email = rows[0]?.email ?? "";
  const role = rows[0]?.role;
  if (!emailIsOwner(email) && role !== "chu") throw new Error("Chi Chu duoc sua cong thanh toan.");
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
    const settings = await readSettings();
    const view = viewOf(settings);
    if (data.provider === "sepay" && !view.sepay) throw new Error("Sepay dang bao tri.");
    if (data.provider === "casso" && !view.casso) throw new Error("Casso dang bao tri.");
    const bank = data.provider === "sepay" ? settings.sepay_bank : settings.casso_bank;
    const account = data.provider === "sepay" ? settings.sepay_account : settings.casso_account;
    const name = data.provider === "sepay" ? settings.sepay_name : settings.casso_name;
    const id = randomBytes(12).toString("hex");
    const code = makePayCode(randomBytes(8).toString("hex"));
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into pay_orders (id, user_id, provider, amount, code)
      values (${id}, ${context.userId}, ${data.provider}, ${data.amount}, ${code})
    `;
    await writePayNotice(context.userId, "user", "Đã tạo đơn nạp", `Đơn ${code}: ${data.amount} đ qua ${data.provider}. Chờ xác nhận hoặc chuyển khoản.`);
    return {
      id,
      provider: data.provider as "sepay" | "casso",
      amount: data.amount,
      code,
      status: "pending",
      bank,
      account,
      name,
      qr: await qrUrl(bank, account, data.amount, code),
    };
  });

export const readPayOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id.trim())
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ status: string; amount: number }>`
      select status, amount from pay_orders where id = ${data} and user_id = ${context.userId}
    `;
    if (!rows.length) throw new Error("Khong thay don nap.");
    return rows[0];
  });

export const syncCasso = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const settings = await readSettings();
    if (!settings.casso_key) return { checked: false };
    const response = await fetch("https://oauth.casso.vn/v2/transactions?pageSize=20&sort=DESC", {
      headers: { Authorization: `Apikey ${settings.casso_key}` },
    });
    if (!response.ok) throw new Error("Casso chua tra danh sach giao dich.");
    const body = (await response.json()) as unknown;
    for (const hit of cassoHits(body)) await creditHit("casso", hit);
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
  const { emailIsOwner } = await import("@/lib/admin-allow.server");
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ email: string; role: string | null }>`
    select u.email, s.role from "user" u left join room_staff s on s.user_id = u.id where u.id = ${userId}
  `;
  const email = rows[0]?.email ?? "";
  const role = rows[0]?.role;
  if (emailIsOwner(email) || role === "chu") return;
  if (!lead && role === "quan-ly") return;
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
    await requireStaff(context.userId, false);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const paid = await sql<{ user_id: string; amount: number; code: string }>`
      update pay_orders
      set status = 'paid', provider_ref = 'thu-cong'
      where id = ${data} and status in ('pending', 'claimed')
      returning user_id, amount, code
    `;
    const order = paid[0];
    if (!order) throw new Error("Don nay da xu ly hoac khong con.");
    await sql`
      insert into room_accounts (user_id, balance)
      values (${order.user_id}, ${order.amount})
      on conflict (user_id) do update set balance = room_accounts.balance + ${order.amount}
    `;
    await sql`
      insert into room_ledger (user_id, kind, amount, note)
      values (${order.user_id}, 'nap', ${order.amount}, ${"Nap thu cong " + order.code})
    `;
    await writePayNotice(order.user_id, "user", "Đã cộng tiền nạp", `Đã cộng ${order.amount} đ vào số dư (mã ${order.code}).`);
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
    await sql`
      insert into room_ledger (user_id, kind, amount, note)
      values (${order.user_id}, 'huy-nap', 0, ${"Từ chối nạp " + order.code + " (" + order.amount + " đ)"})
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
  const settings = await readSettings();
  const { apikey } = headerSecret(request);
  if (!settings.sepay_key || !sameSecret(apikey, settings.sepay_key)) {
    return Response.json({ success: false }, { status: 401 });
  }
  const hit = sepayHit(await request.json().catch(() => null));
  if (hit) await creditHit("sepay", hit);
  return Response.json({ success: true });
}

export async function handleCasso(request: Request) {
  const settings = await readSettings();
  const { apikey, secure } = headerSecret(request);
  const tokenOk = Boolean(settings.casso_token) && sameSecret(secure, settings.casso_token);
  const keyOk = Boolean(settings.casso_key) && sameSecret(apikey, settings.casso_key);
  if (!tokenOk && !keyOk) return Response.json({ success: false }, { status: 401 });
  for (const hit of cassoHits(await request.json().catch(() => null))) await creditHit("casso", hit);
  return Response.json({ success: true });
}
