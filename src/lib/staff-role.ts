export type StaffRole = "ho-tro" | "quan-ly" | "chu";
export type RoomStanding = "open" | "locked" | "banned";

export const ROLE_LABEL: Record<StaffRole, string> = {
  "ho-tro": "Hỗ trợ",
  "quan-ly": "Quản lý",
  chu: "Chủ",
};

const RANK: Record<StaffRole, number> = { "ho-tro": 1, "quan-ly": 2, chu: 3 };

export function isStaffRole(value: string | null | undefined): value is StaffRole {
  return value === "ho-tro" || value === "quan-ly" || value === "chu";
}

export function roleAtLeast(role: StaffRole | null, need: StaffRole) {
  if (!role) return false;
  return RANK[role] >= RANK[need];
}

export function standingBlock(status: RoomStanding, reason: string) {
  if (status === "banned") return "Tài khoản đã bị cấm. Hãy gửi yêu cầu ở trang Yêu cầu.";
  if (status === "locked") {
    return reason ? `Tài khoản đang bị khóa: ${reason}` : "Tài khoản đang bị khóa. Hãy gửi yêu cầu ở mục Tài khoản.";
  }
  return null;
}
