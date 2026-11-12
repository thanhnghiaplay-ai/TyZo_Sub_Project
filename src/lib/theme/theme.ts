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
  ["rankOwner", "--rank-owner", "Cấp Chủ"],
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

export const DENSITIES = [
  ["compact", "Gọn", 0.85],
  ["cozy", "Vừa", 1],
  ["roomy", "Thoáng", 1.15],
] as const;
export type Density = (typeof DENSITIES)[number][0];

export const MODES = [
  ["auto", "Theo máy khách"],
  ["dark", "Luôn tối"],
  ["light", "Luôn sáng"],
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
  ["nav.wallet", "Ví / nạp tiền", "Wallet"],
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
  ["ui.clock", "Thời gian", "Clock"],
  ["ui.magic", "Tự động / AI", "Sparkle"],
] as const;
export type IconSlot = (typeof ICON_SLOTS)[number][0];

export type Theme = {
  v: number;
  mode: Mode;
  font: FontId;
  fontScale: number;
  radius: number;
  density: Density;
  iconWeight: IconWeight;
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
  radius: 1,
  density: "cozy",
  iconWeight: "duotone",
  brandName: "",
  logoUrl: "",
  icons: {},
  light: LIGHT_DEFAULT,
  dark: DARK_DEFAULT,
};

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

/** Làm sạch mọi đầu vào. Giá trị lạ thì lấy mặc định. Không bao giờ ném lỗi. */
export function parseTheme(input: unknown): Theme {
  const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const font = FONTS.some((f) => f.id === src.font) ? (src.font as FontId) : THEME_DEFAULT.font;
  const weight = ICON_WEIGHTS.some((w) => w[0] === src.iconWeight) ? (src.iconWeight as IconWeight) : THEME_DEFAULT.iconWeight;
  const density = DENSITIES.some((d) => d[0] === src.density) ? (src.density as Density) : THEME_DEFAULT.density;
  const mode = MODES.some((m) => m[0] === src.mode) ? (src.mode as Mode) : THEME_DEFAULT.mode;
  return {
    v: THEME_VERSION,
    mode,
    font,
    fontScale: pickNumber(src.fontScale, 1, 0.85, 1.25),
    radius: pickNumber(src.radius, 1, 0, 1.75),
    density,
    iconWeight: weight,
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

function block(selector: string, palette: Palette): string {
  const lines = PALETTE_KEYS.map(([key, variable]) => `${variable}:${palette[key]};`);
  return `${selector}{${lines.join("")}color-scheme:${selector.includes("light") ? "light" : "dark"};}`;
}

/** CSS đã làm sạch. Mọi giá trị đi qua parseTheme nên không chèn được mã lạ. */
export function themeToCss(theme: Theme): string {
  const font = fontOf(theme.font);
  const density = DENSITIES.find((d) => d[0] === theme.density)?.[2] ?? 1;
  const family = font.css ? `${font.css}, ui-sans-serif, system-ui, sans-serif` : "ui-sans-serif, system-ui, sans-serif";
  const root =
    `:root{--font-sans:${family};--radius-card:${theme.radius}rem;--radius-ctl:${Math.round(theme.radius * 0.75 * 100) / 100}rem;` +
    `--font-scale:${theme.fontScale};--density:${density};}`;
  return [root, block('html[data-theme="dark"]', theme.dark), block('html[data-theme="light"]', theme.light)].join("\n");
}

/** Chọn chế độ sáng/tối ban đầu. Chạy trước khi vẽ để không nháy màu. Khách chọn tay thì lưu ở localStorage. */
export function modeScript(mode: Mode): string {
  // Admin chọn "Luôn tối/sáng" thì khách không đổi được. Chỉ chế độ "auto" mới nhìn localStorage và màu hệ thống.
  if (mode === "dark" || mode === "light") {
    return `document.documentElement.setAttribute('data-theme',${JSON.stringify(mode)});`;
  }
  return (
    "(function(){var m=null;try{m=localStorage.getItem('tyzo_mode')}catch(e){}" +
    "if(m!=='dark'&&m!=='light'){try{m=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}catch(e){m='dark'}}" +
    "document.documentElement.setAttribute('data-theme',m)})();"
  );
}

export function paletteDiff(a: Theme, b: Theme): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}
