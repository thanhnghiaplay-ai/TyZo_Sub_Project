import { asrHouse } from "./asr-house.ts";

/**
 * Trả theo lượt: máy chủ chỉ nhận model Groq có trong danh sách key phòng (run_models, đồng bộ từ Groq).
 * Các hàm ở đây giúp app chọn và báo đúng danh sách đó, thay vì để máy chủ từ chối giữa chừng.
 */

/** Tập model mà chế độ Tự động được chọn. Trả theo lượt và đã biết danh sách phòng thì dùng danh sách phòng. */
export function pickPool(roomPay: boolean, offered: string[] | null, ownIds: string[] | null): Set<string> | null {
  if (roomPay && offered) return new Set(offered);
  return ownIds ? new Set(ownIds) : null;
}

/** Model Groq đang chọn mà key phòng không có. Model nhà khác (Deepgram, Alibaba…) do máy chủ kiểm riêng. */
export function roomMissing(offered: string[] | null, asrModel: string, chatModel: string | null): string[] | null {
  if (!offered) return null;
  const missing: string[] = [];
  if (asrHouse(asrModel) === "groq" && !offered.includes(asrModel)) missing.push(asrModel);
  if (chatModel && chatModel !== "auto" && !offered.includes(chatModel)) missing.push(chatModel);
  return missing.length ? missing : null;
}

export function roomMissingText(missing: string[]): string {
  const names = missing.join(", ");
  return `Key phòng chưa có ${missing.length > 1 ? "các model" : "model"} ${names}, nên trả theo lượt chưa dùng được. Hãy đổi sang model khác trong Cài đặt dịch (hoặc để model dịch Tự động), hay dùng key của bạn.`;
}

/** Câu máy chủ trả khi model không có trong danh sách key phòng. Nêu tên để khách và Chủ biết đổi gì. */
export function roomRefusal(model: string): string {
  return `Model ${model} không có trong cửa trả theo lượt (key phòng chưa có model này).`;
}
