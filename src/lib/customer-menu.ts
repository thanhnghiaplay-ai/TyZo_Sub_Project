/**
 * Tên hiện trên menu trang khách. Một chỗ duy nhất: menu (studio, dịch trực tiếp, hướng dẫn),
 * hướng dẫn (guide-topics.ts) và tour dùng chung, đổi tên thì đổi ở đây.
 */
export const TOOL_NAME = {
  key: "Cài đặt dịch",
  phim: "Phim",
  cast: "Ngữ cảnh",
  voice: "Thuyết minh",
  check: "Kiểm tra",
  thuatngu: "Thuật ngữ",
  run: "Tải và dịch",
} as const;

export type ToolName = keyof typeof TOOL_NAME;

export const MENU_GROUP = {
  /** Trùng tên dịch vụ ở bảng trạng thái của Admin (Dịch bình thường / Dịch trực tiếp). */
  normal: "Dịch bình thường",
  live: "Dịch trực tiếp",
  wallet: "Ví và gói",
  help: "Trợ giúp",
} as const;

export const MENU_ITEM = {
  home: "Trang chủ",
  tokens: "Token dịch",
  plans: "Thuê phòng và gói",
  partner: "Cộng tác viên",
  guide: "Hướng dẫn",
  appeal: "Yêu cầu xem lại",
  manage: "Quản lý",
} as const;
