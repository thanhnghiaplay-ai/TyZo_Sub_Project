// Màu nhấn do khách tự chọn (lưu trong máy khách). Hàm thuần: test được bằng Node, không import `@/`.

export const ACCENT_KEY = "tyzo_accent";

/** Màu nhấn phải tách được khỏi nền ít nhất bằng ngưỡng này (chuẩn cho thành phần giao diện). */
export const ACCENT_MIN_ON_BG = 3;

const STEPS = 25;
const STEP_SIZE = 0.04;

/** Nhận «#rrggbb», «rrggbb» hoặc «#rgb», trả «#rrggbb» chữ thường; sai thì null. */
export function parseAccent(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let value = raw.trim().toLowerCase();
  if (value.startsWith("#")) value = value.slice(1);
  if (/^[0-9a-f]{3}$/.test(value)) value = value.replace(/./g, (c) => c + c);
  return /^[0-9a-f]{6}$/.test(value) ? "#" + value : null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((n) => clampByte(n).toString(16).padStart(2, "0")).join("");
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function lum(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Tỉ lệ tương phản chưa làm tròn (script đầu trang tính y hệt). */
export function ratio(a: string, b: string): number {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Chữ trên nút màu nhấn: đen hoặc trắng, chọn bên rõ hơn. Luôn đạt tối thiểu 4,5 với mọi màu nền. */
export function inkFor(accent: string): "#000000" | "#ffffff" {
  return ratio("#000000", accent) >= ratio("#ffffff", accent) ? "#000000" : "#ffffff";
}

/**
 * Màu quá gần nền (quá chói trên nền sáng, quá tối trên nền tối) thì kéo dần về phía trắng (nền tối)
 * hoặc đen (nền sáng), mỗi bước 4%, dừng ngay khi đủ ngưỡng. Vừa đủ, không đổi cả màu.
 */
export function fitAccent(accent: string, bg: string, min: number = ACCENT_MIN_ON_BG): { color: string; adjusted: boolean } {
  if (ratio(accent, bg) >= min) return { color: accent, adjusted: false };
  const target = lum(bg) < 0.5 ? 255 : 0;
  const [r, g, b] = hexToRgb(accent);
  let color = accent;
  for (let i = 1; i <= STEPS; i += 1) {
    const t = i * STEP_SIZE;
    color = rgbToHex(r + (target - r) * t, g + (target - g) * t, b + (target - b) * t);
    if (ratio(color, bg) >= min) break;
  }
  return { color, adjusted: true };
}

type AccentVars = {
  "--accent-dark": string;
  "--ink-dark": string;
  "--accent-light": string;
  "--ink-light": string;
};

/** Biến CSS cho cả hai chế độ. styles.css chọn theo data-theme, nên đổi sáng/tối không cần tính lại. */
export function accentVars(accent: string, bgDark: string, bgLight: string): AccentVars {
  const dark = fitAccent(accent, bgDark).color;
  const light = fitAccent(accent, bgLight).color;
  return { "--accent-dark": dark, "--ink-dark": inkFor(dark), "--accent-light": light, "--ink-light": inkFor(light) };
}

/** Đặt màu lên <html> ngay (khi khách kéo thanh). */
export function applyAccent(accent: string, bgDark: string, bgLight: string): void {
  const root = document.documentElement;
  const vars = accentVars(accent, bgDark, bgLight);
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  root.setAttribute("data-accent", "user");
}

export function clearAccent(): void {
  const root = document.documentElement;
  for (const name of ["--accent-dark", "--ink-dark", "--accent-light", "--ink-light"]) root.style.removeProperty(name);
  root.removeAttribute("data-accent");
}

export function readAccent(): string | null {
  try {
    return parseAccent(localStorage.getItem(ACCENT_KEY));
  } catch {
    return null;
  }
}

export function saveAccent(accent: string | null): void {
  try {
    if (accent) localStorage.setItem(ACCENT_KEY, accent);
    else localStorage.removeItem(ACCENT_KEY);
  } catch {
    /* trình duyệt không cho lưu: màu chỉ giữ đến khi tải lại trang */
  }
}

/**
 * Chạy trước khi vẽ (như modeScript và densityScript) để không nháy màu.
 * Cùng công thức với fitAccent/inkFor ở trên (accent.test.ts so hai bên).
 */
export function accentScript(bgDark: string, bgLight: string): string {
  return (
    `(function(){var a=null;try{a=localStorage.getItem(${JSON.stringify(ACCENT_KEY)})}catch(e){}` +
    "if(typeof a!=='string')return;a=a.trim().toLowerCase();if(!/^#[0-9a-f]{6}$/.test(a))return;" +
    "function ch(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}" +
    "function rgb(h){return[parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)]}" +
    "function lum(h){var c=rgb(h);return 0.2126*ch(c[0])+0.7152*ch(c[1])+0.0722*ch(c[2])}" +
    "function ra(x,y){var p=lum(x),q=lum(y);return(Math.max(p,q)+0.05)/(Math.min(p,q)+0.05)}" +
    "function hx(n){n=Math.max(0,Math.min(255,Math.round(n)));return(n<16?'0':'')+n.toString(16)}" +
    `function fit(c,bg){if(ra(c,bg)>=${ACCENT_MIN_ON_BG})return c;var t=lum(bg)<0.5?255:0,o=rgb(c),r=c;` +
    `for(var i=1;i<=${STEPS};i++){var k=i*${STEP_SIZE};r='#'+hx(o[0]+(t-o[0])*k)+hx(o[1]+(t-o[1])*k)+hx(o[2]+(t-o[2])*k);if(ra(r,bg)>=${ACCENT_MIN_ON_BG})break}return r}` +
    "function ink(c){return ra('#000000',c)>=ra('#ffffff',c)?'#000000':'#ffffff'}" +
    `var d=fit(a,${JSON.stringify(bgDark)}),l=fit(a,${JSON.stringify(bgLight)}),s=document.documentElement;` +
    "s.style.setProperty('--accent-dark',d);s.style.setProperty('--ink-dark',ink(d));" +
    "s.style.setProperty('--accent-light',l);s.style.setProperty('--ink-light',ink(l));" +
    "s.setAttribute('data-accent','user')})();"
  );
}
