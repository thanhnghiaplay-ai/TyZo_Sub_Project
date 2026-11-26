/** Danh sách thẻ của phòng dịch. Tách riêng để các thẻ (studio-panels/) và studio.tsx cùng dùng mà không import vòng. */
import { TOOL_NAME } from "@/lib/customer-menu";

export const TOOLS = [
  ["key", TOOL_NAME.key],
  ["phim", TOOL_NAME.phim],
  ["cast", TOOL_NAME.cast],
  ["voice", TOOL_NAME.voice],
  ["check", TOOL_NAME.check],
  ["run", TOOL_NAME.run],
] as const;

/** Chức năng thêm: chỉ Thuật ngữ (cùng nhóm «Dịch bình thường» trên menu). Cách trả và model nằm trong «Cài đặt dịch» (Menu, không lướt bằng nút vàng). */
export const ADVANCED_TOOLS = [
  ["thuatngu", TOOL_NAME.thuatngu],
] as const;
export type ToolId = (typeof TOOLS)[number][0] | (typeof ADVANCED_TOOLS)[number][0];
