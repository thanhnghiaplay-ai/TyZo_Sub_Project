export type AdminTab =
  | "tong-quan"
  | "viec"
  | "cau-hinh"
  | "so-do"
  | "tien"
  | "chat-luong"
  | "nhat-ky"
  | "thao-tac"
  | "thuat-ngu"
  | "ctv"
  | "thu"
  | "giao-dien";

export type AdminTabInfo = {
  id: AdminTab;
  label: string;
  /** Chỉ Chủ mới thấy. */
  owner: boolean;
  /** Từ khóa phụ để tìm trong Ctrl+K. */
  words: string;
};

/** Một danh sách duy nhất cho thanh bên trái, hàng nút trên điện thoại và Ctrl+K. */
export const ADMIN_TABS: AdminTabInfo[] = [
  { id: "tong-quan", label: "Tổng quan", owner: false, words: "trang chu dashboard canh bao" },
  { id: "viec", label: "Việc", owner: false, words: "phieu luot don nap khach tai khoan tra theo luot" },
  { id: "cau-hinh", label: "Cấu hình", owner: true, words: "key groq alibaba gia goi dich cong nap sepay casso thue phong model" },
  { id: "so-do", label: "Sơ đồ", owner: false, words: "to chuc nhan vien quyen" },
  { id: "tien", label: "Doanh thu", owner: true, words: "tien chi phi loi lai arpu bieu do" },
  { id: "chat-luong", label: "Chất lượng", owner: true, words: "whisper model do tin" },
  { id: "thuat-ngu", label: "Thuật ngữ", owner: true, words: "tu dien glossary" },
  { id: "ctv", label: "Cộng tác", owner: true, words: "hoa hong affiliate" },
  { id: "thu", label: "Thư", owner: true, words: "email smtp resend" },
  { id: "giao-dien", label: "Giao diện", owner: true, words: "theme mau sac" },
  { id: "thao-tac", label: "Nhật ký thao tác", owner: false, words: "audit lich su" },
  { id: "nhat-ky", label: "Nhật ký hệ thống", owner: false, words: "log phien ban" },
];

export function tabsFor(role: string | null): AdminTabInfo[] {
  if (!role) return [];
  return ADMIN_TABS.filter((tab) => !tab.owner || role === "chu");
}

/** Bỏ dấu tiếng Việt và hạ chữ thường để so khớp khi tìm. */
export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

/** Lọc tab theo chữ gõ trong Ctrl+K. Không dấu cũng tìm được. */
export function matchTabs(tabs: AdminTabInfo[], query: string): AdminTabInfo[] {
  const q = foldText(query);
  if (!q) return tabs;
  return tabs.filter((tab) => foldText(`${tab.label} ${tab.words}`).includes(q));
}

export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+$/.test(value.trim());
}
