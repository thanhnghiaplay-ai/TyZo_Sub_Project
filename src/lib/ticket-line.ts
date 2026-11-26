/**
 * Chữ trên thẻ phiếu ở Admin (v5.31.2). Thuần, chỉ import tương đối.
 * Phiếu Token dịch ghi đúng đơn vị «Token dịch» (trước ghi nhầm «giây»), ghi số giữ ban đầu thay vì «Giữ 0» sau khi đóng,
 * và ghi số trả lại. Phiếu phần dịch («Dịch tiếp · …») và phiếu việc phụ (phân tích, trau chuốt, khoảng trống) có nhãn rõ.
 */
import { CHAT_TICKET_PREFIX } from "./billing/run-bill.ts";

const nf = new Intl.NumberFormat("vi-VN");

type TicketMoney = { held: number; charged: number; released: number; refunded: number; status: string; unit: string };

function amount(n: number, unit: string): string {
  return unit === "token" ? `${nf.format(n)} Token dịch` : `${nf.format(Math.round(n))} đ`;
}

export function ticketMoneyLine(t: TicketMoney): string {
  // Phiếu Token: số giữ ban đầu = đang giữ + đã trừ + đã trả lại (lúc đóng, «đang giữ» về 0).
  if (t.unit === "token") {
    const first = t.held + t.charged + t.released;
    const parts = [`Giữ ${amount(first, t.unit)}`, `trừ ${amount(t.charged, t.unit)}`];
    if (t.status === "dang-giu") parts.push(`đang giữ ${amount(t.held, t.unit)}`);
    else parts.push(`trả lại ${amount(t.released, t.unit)}`);
    if (t.refunded > 0) parts.push(`hoàn ${amount(t.refunded, t.unit)}`);
    return parts.join(" · ");
  }
  return `Giữ ${amount(t.held, t.unit)} · Trừ ${amount(t.charged, t.unit)}${t.refunded > 0 ? ` · Hoàn ${amount(t.refunded, t.unit)}` : ""}`;
}

const SYSTEM_NAMES = ["Phân tích nội dung", "Trau chuốt bản dịch", "Khoảng trống"];

/** Nhãn phần việc và phần tên tệp còn lại (để che). Tên việc phụ không phải tên tệp nên không che. */
export function ticketPart(fileName: string): { tag: string | null; name: string; system: boolean } {
  if (fileName.startsWith(CHAT_TICKET_PREFIX)) return { tag: "Phần dịch", name: fileName.slice(CHAT_TICKET_PREFIX.length), system: false };
  const sys = SYSTEM_NAMES.find((label) => fileName.startsWith(label));
  if (sys) return { tag: sys === "Khoảng trống" ? "Dò khoảng trống" : sys, name: fileName, system: true };
  return { tag: null, name: fileName, system: false };
}
