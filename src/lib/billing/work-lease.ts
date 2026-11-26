/**
 * NHỊP SỐNG của việc đang chạy trên một phiếu (đoạn TyZo Modal, lệnh gọi Groq/Alibaba qua cửa trả theo lượt).
 * Hồ sơ sửa triệt để RE-001: trước đây «đang chạy» = gửi trong 15 phút gần nhất, nên GPU chạy 16–30 phút bị coi là chết,
 * phiếu bị đóng và phần giữ trả về trước khi quyết toán. Nay: việc đang chạy tự ghi nhịp mỗi LEASE_BEAT_MS; quá
 * LEASE_STALE_SECONDS không có nhịp mới coi là đã chết (tiến trình chết thì không còn ai quyết toán được).
 */
export const LEASE_BEAT_MS = 30_000;
/** Lớn hơn 4 lần nhịp: một hai nhịp trễ (CSDL chậm) không làm việc còn sống bị coi là chết. */
export const LEASE_STALE_SECONDS = 150;
export const LEASE_STALE = `${LEASE_STALE_SECONDS} seconds`;

/** Gọi `beat` đều đặn cho tới khi `stop()`. Lỗi của một nhịp không làm hỏng việc chính. */
export function startBeat(beat: () => Promise<unknown>, everyMs = LEASE_BEAT_MS): () => void {
  let stopped = false;
  const timer = setInterval(() => {
    if (!stopped) void beat().catch(() => undefined);
  }, everyMs);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
