/**
 * Nguồn duy nhất của giao diện (design tokens).
 * Hàm thuần, không import gì, để chạy được trong test Node và cả ở máy chủ lẫn trình duyệt.
 * Mọi thứ admin chỉnh được đều đi qua parseTheme (làm sạch) và checkTheme (tương phản) trước khi lưu.
 */

export const THEME_VERSION = 1;

/** [khóa, biến CSS, nhãn tiếng Việt]. Thêm màu mới chỉ cần thêm một dòng ở đây. */
export const PALETTE_KEYS = [
  ["bg", "--color-bg", "Nền trang"],
  ["card", "--color-card", "Nền thẻ"],
  ["raised", "--color-raised", "Nền nổi (ô nhập, nút phụ)"],
  ["fg", "--color-fg", "Chữ chính"],
  ["muted", "--color-muted", "Chữ phụ"],
  ["line", "--color-line", "Đường viền"],
  ["accent", "--color-accent", "Màu nhấn (nút chính)"],
  ["ink", "--color-ink", "Chữ trên màu nhấn"],
  ["danger", "--color-danger", "Chữ cảnh báo"],
  ["error", "--color-error", "Lỗi / khóa"],
  ["success", "--color-success", "Thành công"],
  ["warning", "--color-warning", "Chờ / lưu ý"],
  ["info", "--color-info", "Thông tin"],
  ["rankUser", "--rank-user", "Cấp Người dùng"],
  ["rankSupport", "--rank-support", "Cấp Hỗ trợ"],
  ["rankManager", "--rank-manager", "Cấp Quản lý"],
  ["rankOwner", "--rank-owner", "Cấp Admin"],
  ["rankPartner", "--rank-partner", "Cấp Cộng tác viên"],
] as const;

export type PaletteKey = (typeof PALETTE_KEYS)[number][0];
export type Palette = Record<PaletteKey, string>;

export const FONTS = [
  { id: "be-vietnam-pro", name: "Be Vietnam Pro", css: '"Be Vietnam Pro"', gf: "Be+Vietnam+Pro:wght@400;500;600;700" },
  { id: "inter", name: "Inter", css: '"Inter"', gf: "Inter:wght@400;500;600;700" },
  { id: "roboto", name: "Roboto", css: '"Roboto"', gf: "Roboto:wght@400;500;700" },
  { id: "nunito", name: "Nunito", css: '"Nunito"', gf: "Nunito:wght@400;600;700" },
  { id: "open-sans", name: "Open Sans", css: '"Open Sans"', gf: "Open+Sans:wght@400;600;700" },
  { id: "noto-sans", name: "Noto Sans", css: '"Noto Sans"', gf: "Noto+Sans:wght@400;500;600;700" },
  { id: "lexend", name: "Lexend", css: '"Lexend"', gf: "Lexend:wght@400;500;600;700" },
  { id: "mulish", name: "Mulish", css: '"Mulish"', gf: "Mulish:wght@400;600;700" },
  { id: "quicksand", name: "Quicksand", css: '"Quicksand"', gf: "Quicksand:wght@400;500;600;700" },
  { id: "system", name: "Phông hệ thống (không tải)", css: "", gf: "" },
] as const;
export type FontId = (typeof FONTS)[number]["id"];

export const ICON_WEIGHTS = [
  ["thin", "Rất mảnh"],
  ["light", "Mảnh"],
  ["regular", "Thường"],
  ["bold", "Đậm"],
  ["fill", "Đặc"],
  ["duotone", "Hai tông"],
] as const;
export type IconWeight = (typeof ICON_WEIGHTS)[number][0];

export const ICON_SIZES = [
  ["sm", "Nhỏ", 0.85],
  ["md", "Vừa", 1],
  ["lg", "Lớn", 1.15],
] as const;
export type IconSize = (typeof ICON_SIZES)[number][0];

export const ICON_TONES = [
  ["text", "Theo chữ"],
  ["accent", "Theo màu nhấn"],
] as const;
export type IconTone = (typeof ICON_TONES)[number][0];

export const BUTTON_STYLES = [
  ["solid", "Đặc"],
  ["line", "Viền"],
  ["soft", "Mờ"],
] as const;
export type ButtonStyle = (typeof BUTTON_STYLES)[number][0];

/** Kiểu hiệu ứng toàn trang. Cổ điển giữ nguyên; Tương lai thêm lưới mờ, kính mờ, hào quang theo màu nhấn (CSS ở styles.css). */
export const LOOKS = [
  ["classic", "Cổ điển"],
  ["future", "Tương lai"],
] as const;
export type Look = (typeof LOOKS)[number][0];

export const MENU_SIDES = [
  ["left", "Trái"],
  ["right", "Phải"],
] as const;
export type MenuSide = (typeof MENU_SIDES)[number][0];

export const MOTION = [
  ["on", "Bật"],
  ["off", "Tắt"],
] as const;
export type Motion = (typeof MOTION)[number][0];

export const MOTION_SPEEDS = [
  ["slow", "Chậm"],
  ["mid", "Vừa"],
  ["fast", "Nhanh"],
] as const;
export type MotionSpeed = (typeof MOTION_SPEEDS)[number][0];

export const MT_BOARDS = [
  ["error", "Lỗi"],
  ["warning", "Chờ"],
  ["accent", "Nhấn"],
  ["info", "Thông tin"],
] as const;
export type MtBoard = (typeof MT_BOARDS)[number][0];

export const MT_FX = [
  ["on", "Bật"],
  ["off", "Tắt"],
] as const;
export type MtFx = (typeof MT_FX)[number][0];

export const MT_SHOWS = [
  ["robot", "Robot"],
  ["sign", "Chỉ biển"],
] as const;
export type MtShow = (typeof MT_SHOWS)[number][0];

export const TITLE_WEIGHTS = [
  ["keep", "Như hiện tại"],
  ["500", "Vừa"],
  ["600", "Đậm vừa"],
  ["700", "Đậm"],
] as const;
export type TitleWeight = (typeof TITLE_WEIGHTS)[number][0];

export const DENSITIES = [
  ["compact", "Gọn", 0.85],
  ["cozy", "Vừa", 1],
  ["roomy", "Thoáng", 1.15],
] as const;
export type Density = (typeof DENSITIES)[number][0];

/** Chế độ lúc khách mở trang lần đầu. Khách bấm nút sáng/tối thì lựa chọn của khách luôn thắng. */
export const MODES = [
  ["auto", "Theo máy khách"],
  ["dark", "Mặc định tối"],
  ["light", "Mặc định sáng"],
] as const;
export type Mode = (typeof MODES)[number][0];

/**
 * Các "chỗ đặt icon" theo chức năng. Màn hình chỉ gọi theo tên chỗ (slot), không gọi tên icon.
 * Admin đổi icon của một chỗ thì mọi nơi dùng chỗ đó đổi theo. Thêm chức năng mới thì thêm một dòng.
 * [slot, nhãn, icon mặc định (khóa trong icon-registry)]
 */
export const ICON_SLOTS = [
  ["nav.source", "Bước Nguồn", "FilmStrip"],
  ["nav.run", "Bước Tiến trình", "Waveform"],
  ["nav.cast", "Bước Nhân vật & thuật ngữ", "UsersThree"],
  ["nav.edit", "Bước Xem & sửa", "Subtitles"],
  ["nav.voice", "Bước Thuyết minh & kiểu chữ", "SpeakerHigh"],
  ["nav.export", "Bước Xuất & kiểm tra", "DownloadSimple"],
  ["nav.account", "Tài khoản", "User"],
  ["nav.wallet", "Token dịch", "Wallet"],
  ["nav.plans", "Gói", "Crown"],
  ["nav.admin", "Quản lý / Admin", "ShieldCheck"],
  ["nav.home", "Trang chủ", "House"],
  ["nav.menu", "Mở menu", "List"],
  ["act.upload", "Tải lên", "UploadSimple"],
  ["act.link", "Dán link", "Link"],
  ["act.start", "Bắt đầu dịch", "Play"],
  ["act.pause", "Tạm dừng", "Pause"],
  ["act.stop", "Hủy", "Stop"],
  ["act.retry", "Thử lại / tiếp tục", "ArrowsClockwise"],
  ["act.edit", "Sửa", "PencilSimple"],
  ["act.delete", "Xóa", "Trash"],
  ["act.search", "Tìm kiếm", "MagnifyingGlass"],
  ["act.copy", "Sao chép", "Copy"],
  ["act.close", "Đóng", "X"],
  ["act.add", "Thêm", "Plus"],
  ["act.signin", "Đăng nhập", "SignIn"],
  ["act.signout", "Đăng xuất", "SignOut"],
  ["act.fullscreen", "Toàn màn hình", "CornersOut"],
  ["st.ok", "Thành công", "CheckCircle"],
  ["st.warn", "Lưu ý", "Warning"],
  ["st.error", "Lỗi", "XCircle"],
  ["st.info", "Thông tin", "Info"],
  ["st.lock", "Khóa", "Lock"],
  ["st.bell", "Thông báo", "Bell"],
  ["st.mail", "Thư", "Envelope"],
  ["ui.language", "Ngôn ngữ", "Translate"],
  ["ui.theme", "Giao diện", "Palette"],
  ["ui.sun", "Chế độ sáng", "Sun"],
  ["ui.moon", "Chế độ tối", "Moon"],
  ["ui.settings", "Cài đặt", "GearSix"],
  ["ui.key", "Khóa API", "Key"],
  ["ui.chart", "Thống kê", "ChartBar"],
  ["ui.eye", "Xem", "Eye"],
  ["ui.hide", "Ẩn", "EyeSlash"],
  ["ui.clock", "Thời gian", "Clock"],
  ["ui.magic", "Tự động / AI", "Sparkle"],
  ["ui.video", "Video", "FilmSlate"],
  ["ui.audio", "Âm thanh", "Headphones"],
  ["ui.busy", "Đang chạy", "CircleNotch"],
  ["ui.repair", "Bảo trì", "Wrench"],
  ["ui.mic", "Micro", "Microphone"],
  ["ui.tab", "Âm thanh tab", "MonitorPlay"],
  ["ui.speaker", "Loa", "SpeakerHigh"],
  ["ui.mute", "Tắt tiếng", "SpeakerSlash"],
  ["ui.paste", "Dán", "Clipboard"],
  ["ui.options", "Tùy chọn", "SlidersHorizontal"],
  ["ui.more", "Mở thêm", "CaretDown"],
  ["ui.skip", "Bỏ qua", "Minus"],
  ["ui.help", "Trợ giúp", "Question"],
  ["ui.rotate", "Xoay", "ArrowsClockwise"],
  ["ui.compact", "Gọn", "ListDashes"],
  ["ui.roomy", "Thoải mái", "Rows"],
] as const;
export type IconSlot = (typeof ICON_SLOTS)[number][0];

export const ICON_GROUPS = [
  ["nav", "Điều hướng"],
  ["act", "Hành động"],
  ["st", "Trạng thái"],
  ["ui", "Giao diện"],
] as const;
export type IconGroup = (typeof ICON_GROUPS)[number][0];
export type IconGroupWeight = IconWeight | "same";

export type Theme = {
  v: number;
  mode: Mode;
  font: FontId;
  fontScale: number;
  titleFont: FontId;
  titleWeight: TitleWeight;
  /** Giãn dòng nội dung. 1.5 là mức đang có. */
  leading: number;
  radius: number;
  /** 0 là tắt bóng nổi, 1 là mức đang có, tối đa 1.5. */
  shadow: number;
  /** Độ dày viền khung, tính bằng px. 1 là mức đang có. */
  line: number;
  /** Độ rộng tối đa các trang rộng, rem. 120 là mức đang có. */
  pageWidth: number;
  menuSide: MenuSide;
  motion: Motion;
  motionSpeed: MotionSpeed;
  /** Chữ trên biển bảo trì. Rỗng thì «BẢO TRÌ». */
  mtText: string;
  mtBoard: MtBoard;
  mtFx: MtFx;
  mtShow: MtShow;
  /** Đặc giữ nút đặc. Viền và mờ chỉ đổi nút đang tô màu nhấn. */
  button: ButtonStyle;
  /** Tương lai (mặc định) hoặc Cổ điển. Chỉ thêm lớp hiệu ứng, không đổi màu hay chữ. */
  look: Look;
  density: Density;
  iconWeight: IconWeight;
  /** «same» nghĩa là nhóm này theo kiểu nét chung. */
  iconGroups: Record<IconGroup, IconGroupWeight>;
  iconSize: IconSize;
  iconTone: IconTone;
  /** Tên hiển thị và logo (https:// hoặc đường dẫn bắt đầu bằng /). Rỗng là dùng mặc định. */
  brandName: string;
  logoUrl: string;
  /** Chỗ đặt icon nào bị admin đổi sang icon khác. Chỉ chứa phần khác mặc định. */
  icons: Record<string, string>;
  light: Palette;
  dark: Palette;
};

export const DARK_DEFAULT: Palette = {
  bg: "#0e141b",
  card: "#16202a",
  raised: "#1d2b38",
  fg: "#e8eef3",
  muted: "#93a6b6",
  line: "#2c4154",
  accent: "#e7b63a",
  ink: "#1a1400",
  danger: "#ffb4b4",
  error: "#e15b64",
  success: "#3dbe7a",
  warning: "#e39a3c",
  info: "#8eb7ee",
  rankUser: "#9aa6b2",
  rankSupport: "#8eb7ee",
  rankManager: "#e7b63a",
  rankOwner: "#f3d48a",
  rankPartner: "#6ed0b0",
};

export const LIGHT_DEFAULT: Palette = {
  bg: "#f3f5f8",
  card: "#ffffff",
  raised: "#e9eef3",
  fg: "#14202b",
  muted: "#4f6172",
  line: "#cdd7e0",
  accent: "#d9a21b",
  ink: "#1a1400",
  danger: "#b42318",
  error: "#c0343e",
  success: "#1f8a4f",
  warning: "#b86e0a",
  info: "#2a64b8",
  rankUser: "#5b6b7a",
  rankSupport: "#2a64b8",
  rankManager: "#a87708",
  rankOwner: "#8a5a00",
  rankPartner: "#12805f",
};

export const THEME_DEFAULT: Theme = {
  v: THEME_VERSION,
  mode: "dark",
  font: "be-vietnam-pro",
  fontScale: 1,
  titleFont: "be-vietnam-pro",
  titleWeight: "keep",
  leading: 1.5,
  radius: 1,
  shadow: 1,
  line: 1,
  pageWidth: 120,
  menuSide: "left",
  motion: "on",
  motionSpeed: "mid",
  mtText: "BẢO TRÌ",
  mtBoard: "error",
  mtFx: "on",
  mtShow: "robot",
  button: "solid",
  look: "future",
  density: "cozy",
  iconWeight: "duotone",
  iconGroups: { nav: "same", act: "same", st: "same", ui: "same" },
  iconSize: "md",
  iconTone: "text",
  brandName: "",
  logoUrl: "",
  icons: {},
  light: LIGHT_DEFAULT,
  dark: DARK_DEFAULT,
};

function paint(base: Palette, over: Partial<Palette>): Palette {
  return { ...base, ...over };
}

/** Chín bộ màu. Bộ Vàng là màu đang dùng. Bấm bộ là chép cả sáng và tối vào bản nháp. */
export const PALETTES: Array<{ id: string; name: string; light: Palette; dark: Palette }> = [
  { id: "vang", name: "Vàng", light: LIGHT_DEFAULT, dark: DARK_DEFAULT },
  {
    id: "bien",
    name: "Biển",
    dark: paint(DARK_DEFAULT, { bg: "#0b1522", card: "#122033", raised: "#1a2c44", fg: "#e8f1f8", muted: "#9bb3c9", line: "#34536e", accent: "#8ec5ff", ink: "#071422", info: "#8ec5ff", rankSupport: "#8ec5ff", rankManager: "#8ec5ff", rankOwner: "#d7ebff" }),
    light: paint(LIGHT_DEFAULT, { bg: "#f5f8fc", card: "#ffffff", raised: "#e8f0f8", fg: "#102033", muted: "#3d5570", line: "#c3d3e4", accent: "#0f4f9e", ink: "#f5f9ff", info: "#0f4f9e", rankSupport: "#0f4f9e", rankManager: "#0f4f9e", rankOwner: "#0a3468" }),
  },
  {
    id: "rung",
    name: "Rừng",
    dark: paint(DARK_DEFAULT, { bg: "#0d1612", card: "#14211b", raised: "#1c2e24", fg: "#e7f3ec", muted: "#9bb5a6", line: "#345445", accent: "#8ed4a8", ink: "#06210f", info: "#8ed4a8", rankSupport: "#8ed4a8", rankManager: "#8ed4a8", rankOwner: "#d7f5e4" }),
    light: paint(LIGHT_DEFAULT, { bg: "#f4f8f5", card: "#ffffff", raised: "#e7f1eb", fg: "#102218", muted: "#3c5a48", line: "#c5ddd0", accent: "#0e6b3c", ink: "#f3fff7", info: "#0e6b3c", rankSupport: "#0e6b3c", rankManager: "#0e6b3c", rankOwner: "#084828" }),
  },
  {
    id: "dat",
    name: "Đất",
    dark: paint(DARK_DEFAULT, { bg: "#16110e", card: "#241911", raised: "#322216", fg: "#f6eee8", muted: "#c2a898", line: "#5c4030", accent: "#f0b48a", ink: "#2a1208", info: "#f0b48a", rankSupport: "#f0b48a", rankManager: "#f0b48a", rankOwner: "#f8ddc8" }),
    light: paint(LIGHT_DEFAULT, { bg: "#fbf6f2", card: "#ffffff", raised: "#f3e7de", fg: "#2a160f", muted: "#6b4636", line: "#e2cbbd", accent: "#9a3d16", ink: "#fff6f1", info: "#9a3d16", rankSupport: "#9a3d16", rankManager: "#9a3d16", rankOwner: "#6a240c" }),
  },
  {
    id: "tim",
    name: "Tím",
    dark: paint(DARK_DEFAULT, { bg: "#120f1a", card: "#1c1730", raised: "#271f42", fg: "#f1ecf8", muted: "#b5a8cc", line: "#463a66", accent: "#c4b5fd", ink: "#1a1033", info: "#c4b5fd", rankSupport: "#c4b5fd", rankManager: "#c4b5fd", rankOwner: "#e6defd" }),
    light: paint(LIGHT_DEFAULT, { bg: "#f7f5fb", card: "#ffffff", raised: "#ece7f6", fg: "#1c1430", muted: "#53446e", line: "#d4cbe6", accent: "#5b3cc4", ink: "#f7f4ff", info: "#5b3cc4", rankSupport: "#5b3cc4", rankManager: "#5b3cc4", rankOwner: "#3a2288" }),
  },
  {
    id: "hong",
    name: "Hồng",
    dark: paint(DARK_DEFAULT, { bg: "#160f13", card: "#26161d", raised: "#351e28", fg: "#f8eef2", muted: "#c9a8b6", line: "#5e3848", accent: "#f5a3c7", ink: "#2a0e1c", info: "#f5a3c7", rankSupport: "#f5a3c7", rankManager: "#f5a3c7", rankOwner: "#fad4e4" }),
    light: paint(LIGHT_DEFAULT, { bg: "#fdf6f8", card: "#ffffff", raised: "#f8e8ee", fg: "#2a121c", muted: "#6e4454", line: "#e7cdd6", accent: "#a12662", ink: "#fff5f8", info: "#a12662", rankSupport: "#a12662", rankManager: "#a12662", rankOwner: "#6e143f" }),
  },
  {
    id: "xam",
    name: "Xám",
    dark: paint(DARK_DEFAULT, { bg: "#121416", card: "#1c2024", raised: "#262c32", fg: "#eef1f4", muted: "#a7b0b8", line: "#3c4650", accent: "#d5dde6", ink: "#12171c", info: "#d5dde6", rankSupport: "#d5dde6", rankManager: "#d5dde6", rankOwner: "#f2f5f8" }),
    light: paint(LIGHT_DEFAULT, { bg: "#f4f6f8", card: "#ffffff", raised: "#e7ebef", fg: "#161b20", muted: "#4a5560", line: "#d0d6dc", accent: "#3d4a57", ink: "#f4f6f8", info: "#3d4a57", rankSupport: "#3d4a57", rankManager: "#3d4a57", rankOwner: "#1e272f" }),
  },
  {
    id: "tuong-phan",
    name: "Tương phản",
    dark: paint(DARK_DEFAULT, { bg: "#000000", card: "#111111", raised: "#1c1c1c", fg: "#ffffff", muted: "#c8c8c8", line: "#444444", accent: "#ffe14d", ink: "#1a1400", info: "#ffe14d", rankSupport: "#ffe14d", rankManager: "#ffe14d", rankOwner: "#fff3b0" }),
    light: paint(LIGHT_DEFAULT, { bg: "#ffffff", card: "#f7f7f7", raised: "#eeeeee", fg: "#000000", muted: "#444444", line: "#cccccc", accent: "#111111", ink: "#ffffff", info: "#111111", rankSupport: "#111111", rankManager: "#111111", rankOwner: "#000000" }),
  },
  // Bộ thứ chín «Tương lai» (B2): nền gần đen ngả xanh, nhấn cyan. Phần lưới mờ, kính mờ, hào quang là lớp CSS riêng ở B3.
  {
    id: "tuong-lai",
    name: "Tương lai",
    dark: paint(DARK_DEFAULT, { bg: "#070b14", card: "#0e1626", raised: "#16213a", fg: "#e9f1ff", muted: "#9fb0cc", line: "#2a3a5c", accent: "#5de4ff", ink: "#04121a", info: "#5de4ff", rankSupport: "#5de4ff", rankManager: "#7aa8ff", rankOwner: "#c8f4ff" }),
    light: paint(LIGHT_DEFAULT, { bg: "#f3f7fd", card: "#ffffff", raised: "#e4ecf8", fg: "#0c1a2e", muted: "#3b4f6b", line: "#c4d2e6", accent: "#0b6a8f", ink: "#f2fbff", info: "#0b6a8f", rankSupport: "#0b6a8f", rankManager: "#1d4fb0", rankOwner: "#073a52" }),
  },
];

const HEX = /^#[0-9a-f]{6}$/i;

function pickHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  if (HEX.test(text)) return text.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(text)) return ("#" + text[1] + text[1] + text[2] + text[2] + text[3] + text[3]).toLowerCase();
  return fallback;
}

function pickNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100));
}

function pickPalette(value: unknown, base: Palette): Palette {
  const src = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const out = { ...base };
  for (const [key] of PALETTE_KEYS) out[key] = pickHex(src[key], base[key]);
  return out;
}

/** Chỉ nhận https:// hoặc đường dẫn gốc "/". Không dấu nháy, dấu ngoặc, khoảng trắng, "//". */
export function safeUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text || text.length > 300) return "";
  if (/["'()<>\s\\]/.test(text)) return "";
  if (text.startsWith("//")) return "";
  if (text.startsWith("/") || /^https:\/\//i.test(text)) return text;
  return "";
}

function pickIcons(value: unknown): Record<string, string> {
  const src = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const out: Record<string, string> = {};
  for (const [slot, , fallback] of ICON_SLOTS) {
    const key = src[slot];
    if (typeof key === "string" && /^[A-Z][A-Za-z0-9]{1,40}$/.test(key) && key !== fallback) out[slot] = key;
  }
  return out;
}

function pickIconGroups(value: unknown): Theme["iconGroups"] {
  const src = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const out = { ...THEME_DEFAULT.iconGroups };
  for (const [id] of ICON_GROUPS) {
    const raw = src[id];
    if (raw === "same" || ICON_WEIGHTS.some((w) => w[0] === raw)) out[id] = raw as IconGroupWeight;
  }
  return out;
}

/** Làm sạch mọi đầu vào. Giá trị lạ thì lấy mặc định. Không bao giờ ném lỗi. */
export function parseTheme(input: unknown): Theme {
  const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const font = FONTS.some((f) => f.id === src.font) ? (src.font as FontId) : THEME_DEFAULT.font;
  const titleFont = FONTS.some((f) => f.id === src.titleFont) ? (src.titleFont as FontId) : THEME_DEFAULT.titleFont;
  const titleWeight = TITLE_WEIGHTS.some((w) => w[0] === src.titleWeight) ? (src.titleWeight as TitleWeight) : THEME_DEFAULT.titleWeight;
  const weight = ICON_WEIGHTS.some((w) => w[0] === src.iconWeight) ? (src.iconWeight as IconWeight) : THEME_DEFAULT.iconWeight;
  const iconSize = ICON_SIZES.some((s) => s[0] === src.iconSize) ? (src.iconSize as IconSize) : THEME_DEFAULT.iconSize;
  const iconTone = ICON_TONES.some((t) => t[0] === src.iconTone) ? (src.iconTone as IconTone) : THEME_DEFAULT.iconTone;
  const button = BUTTON_STYLES.some((b) => b[0] === src.button) ? (src.button as ButtonStyle) : THEME_DEFAULT.button;
  const look = LOOKS.some((l) => l[0] === src.look) ? (src.look as Look) : THEME_DEFAULT.look;
  const menuSide = MENU_SIDES.some((s) => s[0] === src.menuSide) ? (src.menuSide as MenuSide) : THEME_DEFAULT.menuSide;
  const motion = MOTION.some((m) => m[0] === src.motion) ? (src.motion as Motion) : THEME_DEFAULT.motion;
  const motionSpeed = MOTION_SPEEDS.some((s) => s[0] === src.motionSpeed) ? (src.motionSpeed as MotionSpeed) : THEME_DEFAULT.motionSpeed;
  const mtTextRaw = typeof src.mtText === "string" ? src.mtText.replace(/\s+/g, " ").trim().slice(0, 10) : "";
  const mtText = mtTextRaw || THEME_DEFAULT.mtText;
  const mtBoard = MT_BOARDS.some((b) => b[0] === src.mtBoard) ? (src.mtBoard as MtBoard) : THEME_DEFAULT.mtBoard;
  const mtFx = MT_FX.some((f) => f[0] === src.mtFx) ? (src.mtFx as MtFx) : THEME_DEFAULT.mtFx;
  const mtShow = MT_SHOWS.some((s) => s[0] === src.mtShow) ? (src.mtShow as MtShow) : THEME_DEFAULT.mtShow;
  const density = DENSITIES.some((d) => d[0] === src.density) ? (src.density as Density) : THEME_DEFAULT.density;
  const mode = MODES.some((m) => m[0] === src.mode) ? (src.mode as Mode) : THEME_DEFAULT.mode;
  return {
    v: THEME_VERSION,
    mode,
    font,
    fontScale: pickNumber(src.fontScale, 1, 0.85, 1.25),
    titleFont,
    titleWeight,
    leading: pickNumber(src.leading, 1.5, 1.3, 1.8),
    radius: pickNumber(src.radius, 1, 0, 1.75),
    shadow: pickNumber(src.shadow, 1, 0, 1.5),
    line: pickNumber(src.line, 1, 1, 3),
    pageWidth: pickNumber(src.pageWidth, 120, 40, 120),
    menuSide,
    motion,
    motionSpeed,
    mtText,
    mtBoard,
    mtFx,
    mtShow,
    button,
    look,
    density,
    iconWeight: weight,
    iconGroups: pickIconGroups(src.iconGroups),
    iconSize,
    iconTone,
    brandName: typeof src.brandName === "string" ? src.brandName.trim().slice(0, 40) : "",
    logoUrl: safeUrl(src.logoUrl),
    icons: pickIcons(src.icons),
    light: pickPalette(src.light, LIGHT_DEFAULT),
    dark: pickPalette(src.dark, DARK_DEFAULT),
  };
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/** [chữ, nền, ngưỡng, mô tả]. Dưới ngưỡng là lỗi, không cho công bố. */
const PAIRS: Array<[PaletteKey, PaletteKey, number, string]> = [
  ["fg", "bg", 4.5, "Chữ chính trên nền trang"],
  ["fg", "card", 4.5, "Chữ chính trên thẻ"],
  ["muted", "bg", 3.5, "Chữ phụ trên nền trang"],
  ["muted", "card", 3.5, "Chữ phụ trên thẻ"],
  ["ink", "accent", 4.5, "Chữ trên nút chính"],
  ["danger", "card", 3.5, "Chữ cảnh báo trên thẻ"],
  ["line", "bg", 1.15, "Đường viền với nền trang"],
];

export type ThemeIssue = { mode: "light" | "dark"; text: string; ratio: number; min: number };

export function checkTheme(theme: Theme): ThemeIssue[] {
  const issues: ThemeIssue[] = [];
  for (const mode of ["light", "dark"] as const) {
    const palette = theme[mode];
    for (const [a, b, min, text] of PAIRS) {
      const ratio = contrast(palette[a], palette[b]);
      if (ratio < min) issues.push({ mode, text, ratio, min });
    }
  }
  return issues;
}

export function fontOf(id: FontId) {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}

export function fontHref(id: FontId): string | null {
  const font = fontOf(id);
  return font.gf ? `https://fonts.googleapis.com/css2?family=${font.gf}&display=swap` : null;
}

export function fontFamily(id: FontId): string {
  const font = fontOf(id);
  return font.css ? `${font.css}, ui-sans-serif, system-ui, sans-serif` : "ui-sans-serif, system-ui, sans-serif";
}

function block(selector: string, palette: Palette): string {
  const lines = PALETTE_KEYS.map(([key, variable]) => `${variable}:${palette[key]};`);
  return `${selector}{${lines.join("")}color-scheme:${selector.includes("light") ? "light" : "dark"};}`;
}

function shade(y: string, blur: string, spread: string, alpha: number, amount: number): string {
  const a = Math.round(alpha * amount * 1000) / 1000;
  return `0 ${y} ${blur} ${spread} rgb(0 0 0 / ${a})`;
}

/** Ba mức bóng nổi. Mức 1 trùng bóng sẵn của trang. */
export function shadowStyle(amount: number): Record<"--shadow" | "--shadow-lg" | "--shadow-xl", string> {
  return {
    "--shadow": `${shade("1px", "3px", "0", 0.1, amount)}, ${shade("1px", "2px", "-1px", 0.1, amount)}`,
    "--shadow-lg": `${shade("10px", "15px", "-3px", 0.1, amount)}, ${shade("4px", "6px", "-4px", 0.1, amount)}`,
    "--shadow-xl": `${shade("20px", "25px", "-5px", 0.1, amount)}, ${shade("8px", "10px", "-6px", 0.1, amount)}`,
  };
}

/** CSS đã làm sạch. Mọi giá trị đi qua parseTheme nên không chèn được mã lạ. */
export function themeToCss(theme: Theme): string {
  const density = DENSITIES.find((d) => d[0] === theme.density)?.[2] ?? 1;
  const family = fontFamily(theme.font);
  const title = fontFamily(theme.titleFont);
  const weight = theme.titleWeight === "keep" ? "" : `--title-weight:${theme.titleWeight};`;
  const shadows = Object.entries(shadowStyle(theme.shadow)).map(([key, value]) => `${key}:${value};`).join("");
  const root =
    `:root{--font-sans:${family};--font-title:${title};--radius-card:${theme.radius}rem;--radius-ctl:${Math.round(theme.radius * 0.75 * 100) / 100}rem;` +
    `--font-scale:${theme.fontScale};--leading:${theme.leading};${weight}--density:${density};--page-w:${theme.pageWidth}rem;--shadow-amt:${theme.shadow};--line-w:${theme.line}px;${shadows}}`;
  return [root, block('html[data-theme="dark"]', theme.dark), block('html[data-theme="light"]', theme.light)].join("\n");
}

/**
 * Chọn chế độ sáng/tối ban đầu. Chạy trước khi vẽ để không nháy màu.
 * Thứ tự: lựa chọn khách đã lưu (localStorage) → mặc định Admin (tối/sáng) → màu hệ thống khi Admin để «auto».
 * Khách luôn đổi được, nên nút sáng/tối ở đầu trang luôn hiện.
 */
export function modeScript(mode: Mode): string {
  const fallback =
    mode === "dark" || mode === "light"
      ? `m=${JSON.stringify(mode)};`
      : "try{m=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}catch(e){m='dark'}";
  return (
    `(function(){var m=null;try{m=localStorage.getItem(${JSON.stringify(MODE_KEY)})}catch(e){}` +
    `if(m!=='dark'&&m!=='light'){${fallback}}` +
    "document.documentElement.setAttribute('data-theme',m)})();"
  );
}

/* ---------- Khách tự chọn: sáng/tối và mật độ ---------- */

export const MODE_KEY = "tyzo_mode";
export const DENSITY_KEY = "tyzo_density";

export const USER_DENSITIES = [
  ["compact", "Gọn"],
  ["comfortable", "Thoải mái"],
] as const;
export type UserDensity = (typeof USER_DENSITIES)[number][0];

export function adminDensityValue(density: Density): number {
  return DENSITIES.find((d) => d[0] === density)?.[2] ?? 1;
}

/** Hệ số khoảng cách của lựa chọn khách. «Thoải mái» không bao giờ chật hơn mức vừa. */
export function densityValue(choice: UserDensity, admin: Density): number {
  return choice === "compact" ? 0.85 : Math.max(1, adminDensityValue(admin));
}

/** Chưa chọn thì theo Admin: Admin đặt «Gọn» thì gọn, còn lại là thoải mái. */
export function defaultUserDensity(admin: Density): UserDensity {
  return admin === "compact" ? "compact" : "comfortable";
}

export function pickUserDensity(raw: unknown, admin: Density): UserDensity {
  return raw === "compact" || raw === "comfortable" ? raw : defaultUserDensity(admin);
}

/** Chạy trước khi vẽ, như modeScript. Đặt data-density và --density từ lựa chọn đã lưu của khách. */
export function densityScript(admin: Density): string {
  const roomy = Math.max(1, adminDensityValue(admin));
  return (
    `(function(){var d=null;try{d=localStorage.getItem(${JSON.stringify(DENSITY_KEY)})}catch(e){}` +
    `if(d!=='compact'&&d!=='comfortable')d=${JSON.stringify(defaultUserDensity(admin))};` +
    `var e=document.documentElement;e.setAttribute('data-density',d);` +
    `e.style.setProperty('--density',String(d==='compact'?0.85:${roomy}))})();`
  );
}

/** Khóa lưu trong máy khách: «off» là khách tắt hiệu ứng Tương lai (lưới, kính mờ, hào quang). */
export const FX_KEY = "tyzo_fx";

/** Script đầu trang: đặt data-fx="off" trước khi vẽ nên không nháy. Không có khóa hoặc kho bị chặn thì giữ hiệu ứng. */
export function fxScript(): string {
  return `(function(){try{if(localStorage.getItem(${JSON.stringify(FX_KEY)})==='off')document.documentElement.setAttribute('data-fx','off')}catch(e){}})();`;
}

/* ---------- Khách tự chọn: cỡ chữ (Vừa, Lớn, Rất lớn), nhân thêm vào cỡ chữ Admin đặt ---------- */

export const FONT_KEY = "tyzo_font";
export const USER_FONTS = [
  ["normal", "Vừa", 1],
  ["large", "Lớn", 1.125],
  ["xlarge", "Rất lớn", 1.25],
] as const;
export type UserFont = (typeof USER_FONTS)[number][0];

export function fontValue(choice: UserFont): number {
  return USER_FONTS.find((f) => f[0] === choice)?.[2] ?? 1;
}

export function pickUserFont(raw: unknown): UserFont {
  return raw === "large" || raw === "xlarge" ? raw : "normal";
}

/** Chạy trước khi vẽ: đặt --user-font từ lựa chọn đã lưu. Không có khóa hoặc kho bị chặn thì giữ cỡ Vừa. */
export function fontScript(): string {
  return (
    `(function(){try{var f=localStorage.getItem(${JSON.stringify(FONT_KEY)});` +
    `var v=f==='large'?${fontValue("large")}:f==='xlarge'?${fontValue("xlarge")}:1;` +
    "if(v!==1)document.documentElement.style.setProperty('--user-font',String(v))}catch(e){}})();"
  );
}

