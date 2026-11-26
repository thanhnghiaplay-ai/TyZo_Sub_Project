import { groqListHolds } from "@/lib/sub/asr-house";
import { BASE_ROWS } from "@/lib/price-rows";
import { type GroqBoard } from "@/lib/sub/groq-board";
import { formatRoomTokens } from "@/lib/billing/token-math";
import { modelRoleNote } from "@/lib/sub/model-role";

/** Hàm thường của phòng dịch: tua video, giá và ghi chú model theo cửa trả. Tách từ studio.tsx (23/11/2026). */

export function jump(video: HTMLVideoElement | null, start: number) {
  if (!video) return;
  video.currentTime = start;
  void video.play().catch(() => {});
}

/** Key riêng của khách: không cần giá vào/ra, chỉ ghi model làm được việc gì. */
export function ownModelPrice(_board: GroqBoard | null, id: string) {
  return modelRoleNote(id);
}

export function modelFacts(
  board: GroqBoard | null,
  door: { markup: number; custom: Record<string, { hour: number; inn: number; out: number }>; offered: string[] | null } | null,
  id: string,
  note: string,
): { price: string; detail: string } {
  if (!door) return { price: modelRoleNote(id), detail: note };
  const row = board ? roomPriceRow(board, id) : undefined;
  if (!board) return { price: "Đang lấy đơn giá phòng…", detail: "" };
  if (!row) return { price: "Chưa niêm yết", detail: note };
  return { price: formatRoomTokens(row, board) ?? "Chưa niêm yết", detail: "" };
}

/** Dòng giá của model ở cửa Trả theo lượt: bảng Groq, rồi giá gốc của MỌI nhà (price-rows.ts; tỉ giá lấy từ bảng Groq). */
export function roomPriceRow(board: GroqBoard, id: string) {
  return board.rows.find((item) => item.id === id) ?? Object.values(BASE_ROWS).flat().find((item) => item.id === id);
}

export function roomHeld(door: { offered: string[] | null }, id: string) {
  return groqListHolds(door.offered, id);
}

export function roomAsrPrice(board: GroqBoard | null, door: { markup: number; custom: Record<string, { hour: number; inn: number; out: number }>; offered: string[] | null }, id: string): string {
  if (roomHeld(door, id)) return "Chưa cập nhật";
  const row = board ? roomPriceRow(board, id) : undefined;
  if (!board) return "đang lấy đơn giá";
  if (!row) return "chưa niêm yết";
  return formatRoomTokens(row, board) ?? "chưa niêm yết";
}
