import type { RunDesk } from "./run-desk.ts";
import type { RentShow } from "./rent-show-rule.ts";

/** Ghi chú audit dễ đọc: nói rõ cái gì đổi, từ gì sang gì. Không chứa key hay mật khẩu. */

const NOTE_MAX = 480;

const ROLE_NAME: Record<string, string> = {
  "ho-tro": "Hỗ trợ",
  "quan-ly": "Quản lý",
  chu: "Chủ",
};

export function roleName(role: string | null | undefined) {
  if (!role) return "không có quyền";
  return ROLE_NAME[role] ?? role;
}

export function vnd(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

export function joinNote(parts: string[], empty = "Lưu lại, không có gì đổi") {
  const text = parts.filter(Boolean).join("; ");
  if (!text) return empty;
  return text.length > NOTE_MAX ? `${text.slice(0, NOTE_MAX - 1)}…` : text;
}

function moneyChange(label: string, before: number, after: number) {
  if (before === after) return "";
  return `${label} ${vnd(before)} → ${vnd(after)}`;
}

export function describeRunDesk(before: RunDesk, after: RunDesk): string {
  const parts: string[] = [];
  if (before.maintenance !== after.maintenance) {
    parts.push(after.maintenance ? `ĐÓNG cửa trả theo lượt (bảo trì: ${after.note})` : "MỞ cửa trả theo lượt");
  } else if (after.maintenance && before.note !== after.note) {
    parts.push(`sửa lời bảo trì: ${after.note}`);
  }
  if (before.cap !== after.cap) parts.push(moneyChange("trần mỗi lượt", before.cap, after.cap));
  if (before.markup !== after.markup) parts.push(`phần chênh ${before.markup}% → ${after.markup}%`);
  const models = new Set([...Object.keys(before.custom), ...Object.keys(after.custom)]);
  const labels = { hour: "giá/giờ", inn: "giá vào", out: "giá ra" } as const;
  for (const model of [...models].sort()) {
    const was = before.custom[model];
    const now = after.custom[model];
    if (!was && now) {
      parts.push(`${model}: đặt giá riêng ${(["hour", "inn", "out"] as const).filter((k) => now[k] > 0).map((k) => `${labels[k]} ${vnd(now[k])}`).join(", ") || "trống"}`);
    } else if (was && !now) {
      parts.push(`${model}: bỏ giá riêng`);
    } else if (was && now) {
      const changes = (["hour", "inn", "out"] as const).map((k) => moneyChange(labels[k], was[k], now[k])).filter(Boolean);
      if (changes.length) parts.push(`${model}: ${changes.join(", ")}`);
    }
  }
  return joinNote(parts);
}

export function describeRentShow(before: RentShow | null, after: RentShow): string {
  const parts: string[] = [];
  for (const house of ["groq", "alibaba"] as const) {
    const was = new Set(before?.[house] ?? []);
    const now = new Set(after[house]);
    const opened = [...now].filter((id) => !was.has(id));
    const closed = [...was].filter((id) => !now.has(id));
    if (opened.length) parts.push(`mở ${house}: ${opened.join(", ")}`);
    if (closed.length) parts.push(`đóng ${house}: ${closed.join(", ")}`);
  }
  if (!before && !parts.length) parts.push(`lưu danh sách lần đầu (groq ${after.groq.length}, alibaba ${after.alibaba.length})`);
  return joinNote(parts);
}

/** Thêm, đổi hay gỡ cộng tác. */
export function describeStaffChange(email: string, before: string | null, after: string | null): { action: string; note: string } {
  if (!before && after) return { action: "them-cong-tac", note: `Thêm ${email} làm ${roleName(after)}` };
  if (before && !after) return { action: "go-cong-tac", note: `Gỡ ${email} khỏi vai ${roleName(before)}` };
  return { action: "doi-quyen", note: `Đổi quyền ${email}: ${roleName(before)} → ${roleName(after)}` };
}

type PackLike = { id: string; name: string; enabled: boolean };

export function describePacks(before: PackLike[], after: PackLike[]): string {
  const parts: string[] = [];
  const old = new Map(before.map((pack) => [pack.id, pack]));
  const now = new Map(after.map((pack) => [pack.id, pack]));
  for (const pack of after) {
    const was = old.get(pack.id);
    if (!was) parts.push(`thêm gói ${pack.name}${pack.enabled ? "" : " (đang tắt)"}`);
    else if (was.enabled !== pack.enabled) parts.push(`${pack.enabled ? "bật" : "tắt"} gói ${pack.name}`);
    else if (JSON.stringify(was) !== JSON.stringify(pack)) parts.push(`sửa gói ${pack.name}`);
  }
  for (const pack of before) if (!now.has(pack.id)) parts.push(`xóa gói ${pack.name}`);
  return joinNote(parts);
}
