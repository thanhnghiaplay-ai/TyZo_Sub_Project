export const BADGE_STYLES = [
  { id: "ribbon", name: "Ruy băng" },
  { id: "pill", name: "Nhãn thẳng" },
  { id: "stamp", name: "Con dấu" },
  { id: "rail", name: "Nhãn trái" },
  { id: "sash", name: "Nhãn phải" },
  { id: "fold", name: "Góc gấp" },
  { id: "banner", name: "Dải trên" },
  { id: "chip", name: "Nhãn dưới tên" },
  { id: "frame", name: "Viền sáng" },
  { id: "ticket", name: "Vé góc dưới" },
] as const;

export type BadgeStyleId = (typeof BADGE_STYLES)[number]["id"];

export function badgeStyle(id: string | null | undefined): BadgeStyleId {
  return BADGE_STYLES.some((item) => item.id === id) ? (id as BadgeStyleId) : "ribbon";
}
