/**
 * Nhãn trạng thái Mở/Tắt của gói dịch. Hàm thuần.
 * Bật: nền vàng + chữ đậm (`text-ink` chỉ đúng khi nằm trên `bg-accent`, nếu không chìm vào nền tối).
 * Tắt: viền và chữ xám, có chấm rỗng. Phân biệt cả bằng dấu, không chỉ bằng màu.
 */
export function packStatusView(enabled: boolean): { text: string; mark: string; className: string } {
  return enabled
    ? { text: "Đang mở", mark: "●", className: "border-accent bg-accent font-semibold text-ink" }
    : { text: "Đang tắt", mark: "○", className: "border-line bg-transparent text-muted" };
}
