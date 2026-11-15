import { getSql } from "./db";
import { parseServiceStatus, serviceBlock, SERVICE_KEY, type ServiceGroup } from "./service-status";

/** Câu chặn của nhóm đang bảo trì, trống nếu đang hoạt động. Đọc lỗi thì coi là hoạt động (dòng cài đặt hỏng không khóa cả web). */
export async function serviceClosedText(group: ServiceGroup): Promise<string> {
  try {
    const sql = await getSql();
    const rows = await sql<{ value: string }>`select value from room_settings where key = ${SERVICE_KEY}`;
    return serviceBlock(parseServiceStatus(rows[0]?.value), group);
  } catch {
    return "";
  }
}

/**
 * Dùng ở mọi hàm máy chủ MỞ một lượt chạy mới, trước khi giữ tiền hay trừ lượt thử.
 * Lượt đã mở thì không gọi hàm này, để chạy nốt và đóng phiếu bình thường.
 */
export async function requireServiceOpen(group: ServiceGroup) {
  const text = await serviceClosedText(group);
  if (text) throw new Error(text);
}
