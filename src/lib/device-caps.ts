// Nhận biết khả năng của thiết bị để mỗi chức năng chỉ hiện khi thiết bị làm được.
// Hàm thuần nhận môi trường vào, để test được không cần trình duyệt.

export type Caps = {
  /** Có chuột (di chuột được): hiện gợi ý phím tắt, kéo thả tệp. */
  finePointer: boolean;
  /** Chỉ có cảm ứng: điện thoại, máy tính bảng. */
  touchOnly: boolean;
  /** Micro dùng được (cần HTTPS và getUserMedia). */
  mic: boolean;
  /** Thu âm thanh của tab (getDisplayMedia): chỉ máy tính, trình duyệt Chromium. */
  tabAudio: boolean;
  /** Khóa hướng màn hình (Android có, iPhone không). */
  lockOrientation: boolean;
  /** Giữ màn hình sáng khi đang chạy. */
  wakeLock: boolean;
  /** Đọc bộ nhớ tạm bằng nút (Firefox và Safari cũ không có). */
  readClipboard: boolean;
};

export type CapsEnv = {
  matchMedia?: (query: string) => { matches: boolean };
  navigator?: {
    userAgent?: string;
    maxTouchPoints?: number;
    mediaDevices?: { getUserMedia?: unknown; getDisplayMedia?: unknown };
    wakeLock?: unknown;
    clipboard?: { readText?: unknown };
  };
  screen?: { orientation?: { lock?: unknown } };
  isSecureContext?: boolean;
};

/** Giá trị an toàn khi chưa biết (máy chủ dựng trang, hoặc trước khi đo): không hứa gì. */
export const NO_CAPS: Caps = {
  finePointer: true,
  touchOnly: false,
  mic: false,
  tabAudio: false,
  lockOrientation: false,
  wakeLock: false,
  readClipboard: false,
};

const MOBILE_UA = /android|iphone|ipad|ipod|mobile/i;

export function detectCaps(env: CapsEnv): Caps {
  const nav = env.navigator;
  const media = (query: string) => Boolean(env.matchMedia?.(query).matches);
  const touchPoints = nav?.maxTouchPoints ?? 0;
  const finePointer = media("(hover: hover) and (pointer: fine)");
  // iPad mới giả làm máy Mac: có cảm ứng nhiều điểm mà không có chuột thì vẫn là máy cảm ứng.
  const touchOnly = !finePointer && (touchPoints > 0 || media("(pointer: coarse)"));
  const mobileUa = MOBILE_UA.test(nav?.userAgent ?? "");
  const secure = env.isSecureContext !== false;
  return {
    finePointer,
    touchOnly,
    mic: secure && typeof nav?.mediaDevices?.getUserMedia === "function",
    tabAudio: secure && !mobileUa && !touchOnly && typeof nav?.mediaDevices?.getDisplayMedia === "function",
    lockOrientation: typeof env.screen?.orientation?.lock === "function" && mobileUa && !/iphone|ipad|ipod/i.test(nav?.userAgent ?? ""),
    wakeLock: secure && Boolean(nav?.wakeLock),
    readClipboard: secure && typeof nav?.clipboard?.readText === "function",
  };
}
