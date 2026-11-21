/**
 * Nút chính trang chủ theo trạng thái (đợt 3 sắp lại trang khách, v5.23.0). Thuần, chỉ import tương đối.
 * Nút không đứng im với chữ «Tải và dịch» khi chưa dịch được: nó đổi thành đúng bước còn thiếu
 * (thêm key, gia hạn, mua Token, chọn cách trả), và có một dòng nói vì sao. Không có ngõ cụt (huongdan.txt mục C).
 */
import type { PayState } from "./pay-status.ts";

/** start: bắt đầu dịch. add-key: mở Cài đặt dịch. wallet: mở Ví. choose: đưa mắt về dòng cách trả. none: chưa bấm được. */
export type HomeActionKind = "start" | "add-key" | "wallet" | "choose" | "none";

export type HomeAction = { kind: HomeActionKind; label: string; hint: string };

export function homeAction(input: {
  pay: PayState;
  /** Tắt tiền (money.on = false): không có dòng cách trả, nút luôn là Tải và dịch. */
  moneyOn: boolean;
  hasInput: boolean;
  online: boolean;
  running: boolean;
  blocked: boolean;
}): HomeAction {
  if (input.running) return { kind: "none", label: "Đang chạy…", hint: "" };
  if (input.blocked) return { kind: "none", label: "Đang bảo trì", hint: "Dịch bình thường tạm dừng nhận lượt mới. Bạn vẫn chọn tệp sẵn được." };
  if (!input.online) return { kind: "none", label: "Đang mất mạng", hint: "Có mạng lại thì nút này tự bật. Tệp đã chọn vẫn giữ." };
  if (input.moneyOn) {
    const pay = input.pay;
    if (pay.kind === "choose") return { kind: "choose", label: "Chọn cách trả để bắt đầu", hint: "Chọn một trong hai cách ở trên. Lần sau app nhớ." };
    if (pay.kind === "key-none") return { kind: "add-key", label: "Thêm key để dịch", hint: pay.turnOpen ? "Chưa có key AI. Thêm key, hoặc chọn «Dùng Token lần này» ở trên." : "Chưa có key AI. Thêm key là dịch được." };
    if (pay.kind === "key-expired") return { kind: "wallet", label: "Gia hạn để dịch", hint: "Gói thuê phòng đã hết hạn." };
    if (pay.kind === "turn-empty") return { kind: "wallet", label: "Mua Token dịch", hint: "Hết Token dịch. Mua thêm, hoặc chọn dùng key của bạn ở trên." };
  }
  if (!input.hasInput) return { kind: "none", label: "Tải và dịch", hint: "Chọn video hoặc dán link trước." };
  return { kind: "start", label: "Tải và dịch", hint: "" };
}
