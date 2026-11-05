import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";
import { authMiddleware } from "@/lib/auth/middleware";
import { cassoHits, codesIn, makePayCode, sameSecret, sepayHit, type PayHit } from "@/lib/pay-match";

export type PayPublic = { sepay: boolean; casso: boolean };

export type PaySettingsView = PayPublic & {
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
};

function ready(bank: string, account: string, secret: string) {
  return Boolean(bank.trim() && account.trim() && secret.trim());
}

function viewOf(row: Settings): PaySettingsView {
  return {
    sepay: ready(row.sepay_bank, row.sepay_account, row.sepay_key),
    casso: ready(row.casso_bank, row.casso_account, row.casso_token || row.casso_key),
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
  const rows = await sql<Settings>`select sepay_key, sepay_bank, sepay_account, sepay_name, casso_token, casso_key, casso_bank, casso_account, casso_name from pay_settings where id = 1`;
  return rows[0] ?? EMPTY;
}

function qrUrl(bank: string, account: string, amount: number, code: string) {
  const query = new URLSearchParams({
    acc: account.trim(),
    bank: bank.trim(),
    amount: String(amount),
    des: code,
  });
  return `https://qr.sepay.vn/img?${query.toString()}`;
}

async function creditHit(provider: "sepay" | "casso", hit: PayHit) {
  const codes = codesIn(hit.text);
  if (!codes.length) return false;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const orders = await sql<{ id: string; user_id: string; amount: number; code: string }>`
    select id, user_id, amount, code from pay_orders
    where status = 'pending' and provider = ${provider} and code in (${codes[0]}, ${codes[1] ?? codes[0]}, ${codes[2] ?? codes[0]})
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
      where id = ${order.id} and status = 'pending' and exists (select 1 from seen)
      returning user_id, amount
    ),
    account as (
      insert into room_accounts (user_id, balance)
      select user_id, ${hit.amount} from paid
      on conflict (user_id) do update set balance = room_accounts.balance + ${hit.amount}
      returning user_id
    )
    insert into room_ledger (user_id, kind, amount, note)
    select user_id, 'nap', ${hit.amount}, ${"Nạp " + provider + " " + order.code} from account
    returning user_id
  `;
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
  if (!emailIsOwner(email) && role !== "chu") throw new Error("Chỉ Chủ được sửa cổng thanh toán.");
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
    };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into pay_settings (
        id, sepay_key, sepay_bank, sepay_account, sepay_name,
        casso_token, casso_key, casso_bank, casso_account, casso_name
      ) values (
        1, ${next.sepay_key}, ${next.sepay_bank}, ${next.sepay_account}, ${next.sepay_name},
        ${next.casso_token}, ${next.casso_key}, ${next.casso_bank}, ${next.casso_account}, ${next.casso_name}
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
        casso_name = excluded.casso_name
    `;
    return viewOf(next);
  });

export const createPayOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { provider: string; amount: number }) => {
    const provider = input.provider;
    if (provider !== "sepay" && provider !== "casso") throw new Error("Cổng không đúng.");
    const amount = Math.round(Number(input.amount));
    if (!Number.isFinite(amount) || amount < 10_000 || amount > 5_000_000) throw new Error("Số tiền từ 10.000 đến 5.000.000 đồng.");
    return { provider, amount };
  })
  .handler(async ({ context, data }): Promise<PayOrderView> => {
    const settings = await readSettings();
    const view = viewOf(settings);
    if (data.provider === "sepay" && !view.sepay) throw new Error("Sepay đang bảo trì.");
    if (data.provider === "casso" && !view.casso) throw new Error("Casso đang bảo trì.");
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
    return {
      id,
      provider: data.provider as "sepay" | "casso",
      amount: data.amount,
      code,
      status: "pending",
      bank,
      account,
      name,
      qr: qrUrl(bank, account, data.amount, code),
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
    if (!rows.length) throw new Error("Không thấy đơn nạp.");
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
    if (!response.ok) throw new Error("Casso chưa trả danh sách giao dịch.");
    const body = (await response.json()) as unknown;
    for (const hit of cassoHits(body)) await creditHit("casso", hit);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const pending = await sql<{ id: string }>`
      select id from pay_orders where user_id = ${context.userId} and provider = 'casso' and status = 'pending' order by created_at desc limit 1
    `;
    return { checked: true, pending: pending.length > 0 };
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
