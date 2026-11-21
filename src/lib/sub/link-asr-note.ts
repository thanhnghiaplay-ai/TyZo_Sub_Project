/** Chữ dưới ô «Nhận dạng giọng» khi model nhận cả file từ link. */
import { asrHouse, asrTakesLink } from "./asr-house.ts";
import { PROVIDERS, providerHas, providersWith } from "./provider.ts";

const SHARED =
  "nhận link tải thẳng, không phải trang xem, và không cắt đoạn trên máy. Kho tạm bật thì chọn được tệp trên máy: âm thanh tách trên máy, gửi lên kho tạm rồi xóa khi xong.";

/**
 * Một đoạn cho mọi nhà nhận link. Null khi model cắt đoạn trên máy (Whisper).
 * Nhà chỉ nhận dạng thì nhắc dịch cần key của một nhà có model dịch (lấy từ khả năng nhà khai, không ghi cứng Groq).
 */
export function linkAsrNote(modelId: string): string | null {
  if (!asrTakesLink(modelId)) return null;
  const house = asrHouse(modelId);
  if (!house || house === "groq") return null;
  const extra =
    house === "speechmatics" ? " Key phải đúng vùng tài khoản." : house === "soniox"
        ? " Tài khoản cần đã nạp tiền."
        : house === "elevenlabs"
          ? " Link phải là https; key cần quyền Speech to Text."
          : "";
  const chatHouses = providersWith("chat").map((id) => PROVIDERS[id].label);
  const translate = providerHas(house, "chat") ? "" : ` Dịch cần key của một nhà có model dịch (${chatHouses.join(", ")}).`;
  return `${PROVIDERS[house].label} ${SHARED}${extra}${translate}`;
}
