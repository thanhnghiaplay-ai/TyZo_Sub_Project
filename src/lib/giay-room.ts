import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { asrPerSecond } from "@/lib/billing/run-bill";
import { checkGiayDesk, parseGiayDesk, type GiayDesk, type GiayPack } from "@/lib/token-desk";
import { packPriceVnd, TURBO_ASR } from "@/lib/billing/token-math";

export type GiayPackView = GiayPack & { price: number | null };

export async function turboPerSecond() {
  const { getSql } = await import("@/lib/db");
  const { loadPriceBook } = await import("@/lib/run-board.server");
  const sql = await getSql();
  const book = await loadPriceBook(sql);
  if (!book) return null;
  return asrPerSecond({ rate: book.rate, rows: book.rows, desk: { markup: 0, custom: {} } }, TURBO_ASR);
}

function priced(desk: GiayDesk, perSecond: number | null): GiayPackView[] {
  return desk.packs.map((pack) => ({
    ...pack,
    price: perSecond ? packPriceVnd(pack.tokens, perSecond, desk.markup, desk.buffer) : null,
  }));
}

export const getGiayShelf = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const { giayBalance } = await import("@/lib/billing/token-flow");
    const sql = await getSql();
    const { repairMissedTokens } = await import("@/lib/payment/pay-flow");
    await repairMissedTokens(sql, context.userId);
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'token_desk'`;
    const desk = parseGiayDesk(saved[0]?.value);
    const per = await turboPerSecond();
    return { units: await giayBalance(sql, context.userId), packs: priced(desk, per), priced: per != null };
  });

/** Giá gói Token dịch cho trang Bảng giá (ai cũng xem được, kể cả chưa đăng nhập). Chỉ giá và hạn, không đọc tài khoản. */
export const getGiayPrices = createServerFn({ method: "GET" }).handler(async () => {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const saved = await sql<{ value: string }>`select value from room_settings where key = 'token_desk'`;
  const per = await turboPerSecond();
  return { packs: priced(parseGiayDesk(saved[0]?.value), per), priced: per != null };
});

export const orderGiayPack = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    const packId = String(id || "").trim().toLowerCase();
    if (!/^[a-z0-9-]{1,40}$/.test(packId)) throw new Error("Gói không có.");
    return packId;
  })
  .handler(async ({ context, data }) => {
    const { requireOpenAccount } = await import("@/lib/guard.server");
    await requireOpenAccount(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'token_desk'`;
    const desk = parseGiayDesk(saved[0]?.value);
    const pack = desk.packs.find((row) => row.id === data);
    if (!pack) throw new Error("Gói không có.");
    const per = await turboPerSecond();
    const price = per ? packPriceVnd(pack.tokens, per, desk.markup, desk.buffer) : null;
    if (price == null) throw new Error("Gói Token đang cập nhật giá, tạm chưa mua được. Vui lòng quay lại sau ít phút.");
    const { placeSale } = await import("@/lib/payment/pay-store");
    return placeSale(context.userId, {
      amount: price,
      purpose: "token",
      ref: pack.id,
      detail: JSON.stringify({ tokens: pack.tokens, days: pack.days }),
      title: `Mua ${pack.tokens} Token dịch`,
    });
  });

export const getGiayDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { requireRole } = await import("@/lib/admin/admin-room");
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'token_desk'`;
    const desk = parseGiayDesk(saved[0]?.value);
    const per = await turboPerSecond();
    return { desk, packs: priced(desk, per), perSecond: per };
  });

export const saveGiayDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: GiayDesk) => checkGiayDesk(input))
  .handler(async ({ context, data }) => {
    const { requireRole, writeAudit } = await import("@/lib/admin/admin-room");
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const value = JSON.stringify(data);
    await sql`
      insert into room_settings (key, value) values ('token_desk', ${value})
      on conflict (key) do update set value = ${value}
    `;
    await writeAudit(context.userId, "gia-giay", null, `Chênh ${data.markup}%, đệm ${data.buffer}, ${data.packs.length} gói`);
    return data;
  });
