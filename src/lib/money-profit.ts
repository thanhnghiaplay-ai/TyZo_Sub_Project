/**
 * Lời lỗ của trang Doanh thu, tính theo TIỀN THẬT (từ v5.0.0 không còn số dư ví,
 * khách trả thẳng bằng QR nên mỗi đồng vào sổ là doanh thu).
 *
 * - revenue: tiền chuyển khoản đã xác nhận trong kỳ (room_ledger kind = 'nap').
 * - von: giá vốn thật đã trả cho nhà model (Groq, Alibaba, ...), đơn vị đồng.
 * - hoa: hoa hồng cộng tác viên đã ghi.
 * - chi: chi phí vận hành ghi tay.
 *
 * Số tiêu từ số dư cũ (goi, luot) không đưa vào đây: tiền đó đã nằm trong
 * revenue lúc khách nạp, cộng thêm sẽ đếm hai lần.
 */
export type ProfitInput = { revenue: number; von: number; hoa: number; chi: number };

export type Profit = {
  /** Lãi gộp = tiền vào − giá vốn. */
  lai: number;
  /** Lời lỗ = lãi gộp − hoa hồng − chi phí ghi tay. */
  loi: number;
};

function money(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

export function profitOf(input: ProfitInput): Profit {
  const lai = money(input.revenue) - Math.max(0, money(input.von));
  const loi = lai - Math.max(0, money(input.hoa)) - Math.max(0, money(input.chi));
  return { lai, loi };
}

/**
 * Giá vốn bằng đồng của các lượt trừ Token dịch. 1 Token dịch = 1 giây nhận dạng Turbo
 * theo giá gốc (chưa cộng chênh), nên đồng = số Token đã trừ × giá gốc Turbo đồng mỗi giây.
 * Phiếu Token chỉ lưu số Token (cột base_cost của phiếu này là Token, không phải đồng),
 * nên đây là số quy theo bảng giá hiện hành. Thiếu giá Turbo thì trả 0 và màn hình nói rõ.
 */
export function tokenCostVnd(tokens: number, turboPerSecond: number | null): number {
  if (!(tokens > 0) || turboPerSecond == null || !(turboPerSecond > 0)) return 0;
  return Math.round(tokens * turboPerSecond);
}
