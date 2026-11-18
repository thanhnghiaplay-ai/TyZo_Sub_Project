/** Chữ dưới ô «Nhận dạng giọng» khi model nhận cả file từ link. */
import { asrHouse, asrTakesLink } from "./asr-house.ts";
import { PROVIDERS } from "./provider.ts";

const SHARED =
  "nhận link tải thẳng, không phải trang xem, và không cắt đoạn trên máy. Kho tạm bật thì chọn được tệp trên máy: âm thanh tách trên máy, gửi lên kho tạm rồi xóa khi xong.";

/**
 * Một đoạn cho mọi nhà nhận link. Null khi model cắt đoạn trên máy (Whisper).
 * Alibaba không nhắc Groq: câu cũ không nhắc, và lối chạy Alibaba không chặn thiếu key Groq ở cùng chỗ với các nhà kia.
 */
export function linkAsrNote(modelId: string): string | null {
  if (!asrTakesLink(modelId)) return null;
  const house = asrHouse(modelId);
  if (!house || house === "groq") return null;
  const extra =
    house === "speechmatics" ? " Key phải đúng vùng tài khoản." : house === "soniox" ? " Tài khoản cần đã nạp tiền." : "";
  const groq = house === "alibaba" ? "" : " Dịch vẫn cần key Groq.";
  return `${PROVIDERS[house].label} ${SHARED}${extra}${groq}`;
}
