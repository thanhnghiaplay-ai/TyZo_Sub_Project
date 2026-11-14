import { formatDong, formatMinutes, minutesLeft } from "../wallet-view.ts";

/**
 * Số liệu hiện ở màn hình Dịch trực tiếp. Hàm thuần, không gọi mạng, test được bằng Node.
 * Tiền giữ cho phiên đã bị trừ khỏi số dư tự do của ví, nên tổng còn dùng được = số dư tự do + tiền đang giữ.
 */
export type LiveMoney = { free: number; heldLeft: number };

export function liveMoneyLeft({ free, heldLeft }: LiveMoney): number {
  const a = Number.isFinite(free) ? Math.max(0, free) : 0;
  const b = Number.isFinite(heldLeft) ? Math.max(0, heldLeft) : 0;
  return a + b;
}

/** Số phút còn dịch được. null khi chưa biết giá một phút. */
export function liveMinutes(money: number, perMinute: number | null): number | null {
  return minutesLeft(money, perMinute);
}

export type LiveWarn = "ok" | "low" | "out";

/**
 * Mức cảnh báo tiền.
 * - `out`: không còn đủ cho 1 phút, hoặc cầu nối đã từ chối giữ thêm và báo sắp dừng.
 * - `low`: còn dưới ngưỡng (mặc định 3 phút), hoặc cầu nối báo `low`.
 */
export function liveWarn(input: { minutes: number | null; bridgeLow: boolean; denied: boolean; running: boolean }, lowMinutes = 3): LiveWarn {
  const { minutes, bridgeLow, denied, running } = input;
  if (minutes != null && minutes < 1 && (running || denied)) return "out";
  if (bridgeLow) return "low";
  if (minutes != null && minutes < lowMinutes) return "low";
  return "ok";
}

/** Câu cảnh báo cho khách. Rỗng khi tiền còn thoải mái. */
export function liveWarnText(warn: LiveWarn, minutes: number | null): string {
  if (warn === "out") return "Sắp hết tiền, phiên sẽ tự dừng. Hãy nạp thêm rồi bấm Bắt đầu lại.";
  if (warn === "low") return minutes != null ? `Sắp hết tiền: còn khoảng ${formatMinutes(minutes)}. Nạp thêm để không bị ngắt.` : "Sắp hết tiền. Nạp thêm để không bị ngắt.";
  return "";
}

/** Dòng số dư: "12.000 đ · còn khoảng 5 phút". */
export function liveBalanceLine(money: number, minutes: number | null): string {
  const base = formatDong(money);
  return minutes == null ? base : `${base} · còn khoảng ${formatMinutes(minutes)}`;
}

/** Thời gian đã dịch, dạng 0:00 hoặc 1:02:03. */
export function elapsedLabel(ms: number): string {
  const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export type LiveUiState = "idle" | "opening" | "connecting" | "live" | "closing" | "closed";

export function liveStateText(state: LiveUiState, reconnecting: number): string {
  if (reconnecting > 0 && (state === "live" || state === "connecting")) return `Đang nối lại (lần ${reconnecting})…`;
  switch (state) {
    case "opening":
      return "Đang xin vé vào cầu nối…";
    case "connecting":
      return "Đang nối cầu nối dịch…";
    case "live":
      return "Đang dịch trực tiếp";
    case "closing":
      return "Đang dừng, chờ phần dịch cuối…";
    case "closed":
      return "Đã dừng";
    default:
      return "Chưa bắt đầu";
  }
}

/** Nút chính: bấm khi đang chạy là dừng. Đang xin vé hoặc nối thì vẫn cho dừng để khách hủy được. */
export function liveButton(state: LiveUiState): { label: string; stops: boolean; disabled: boolean } {
  switch (state) {
    case "opening":
      return { label: "Đang mở…", stops: false, disabled: true };
    case "connecting":
    case "live":
      return { label: "Dừng", stops: true, disabled: false };
    case "closing":
      return { label: "Đang dừng…", stops: true, disabled: true };
    default:
      return { label: "Bắt đầu", stops: false, disabled: false };
  }
}
