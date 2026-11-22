/**
 * Luật phát hiện tài khoản có dấu hiệu vi phạm điều khoản (mục 10, 11). Hàm thuần, không import máy chủ, test bằng Node.
 *
 * Nguyên tắc (Chủ chốt 22/11/2026: «luật chặt, chi tiết, có bằng chứng cụ thể để khi có khiếu nại là mang ra liền»):
 *  - Mỗi luật trỏ tới đúng một ý trong điều khoản và trích nguyên văn ý đó.
 *  - Luật chỉ dựng CỜ kèm bảng dữ kiện (giờ, địa chỉ mạng, máy, đơn, yêu cầu…) chụp lại lúc phát hiện, có mã băm SHA-256.
 *    Quyết định khóa hay cấm do người (Quản lý / Admin) bấm, trừ vài luật Admin bật «tự khóa» (quá tải, báo chuyển khoản giả).
 *  - Ngưỡng nằm trong RISK_DEFAULTS, Admin sửa được trong khoảng an toàn (min, max). Thêm luật: thêm một mục vào RISK_RULES,
 *    một hàm trong EVALUATORS, một chỗ gom dữ kiện ở risk.server.ts và test.
 */

export type RiskRuleId =
  | "dung-chung"
  | "ban-lai"
  | "dung-thu-nhieu-tk"
  | "ho-tro-lap"
  | "qua-tai"
  | "chung-tu-gia"
  | "ctv-tu-gioi-thieu"
  | "may-ung-dung"
  | "thu-cong";

export type RiskRecommend = "khoa" | "cam";
export type RiskAuto = "khong" | "khoa" | "thu-hoi-may";

export type RiskParamDef = { key: string; label: string; min: number; max: number; def: number };

export type RiskRuleDef = {
  id: RiskRuleId;
  title: string;
  /** Vị trí trong điều khoản, ví dụ «Mục 10 · Có thể bị khóa nếu · ý 1». */
  termsRef: string;
  /** Trích nguyên văn câu điều khoản. */
  termsText: string;
  recommend: RiskRecommend;
  /** Các kiểu tự xử lý được phép cho luật này. */
  autos: RiskAuto[];
  autoDefault: RiskAuto;
  params: RiskParamDef[];
  /** Câu mô tả cách phát hiện, đọc theo ngưỡng đang dùng. */
  how: (p: Record<string, number>) => string;
};

export const RISK_RULES: RiskRuleDef[] = [
  {
    id: "dung-chung",
    title: "Một tài khoản đang hạn bị nhiều người dùng chung",
    termsRef: "Mục 10 · Có thể bị khóa nếu · ý 1",
    termsText: "Một tài khoản đang hạn được nhiều người dùng chung.",
    recommend: "khoa",
    autos: ["khong"],
    autoDefault: "khong",
    params: [
      { key: "gio", label: "Trong số giờ", min: 1, max: 168, def: 24 },
      { key: "may", label: "Số máy khác nhau từ", min: 2, max: 50, def: 3 },
      { key: "mang", label: "Số địa chỉ mạng khác nhau từ", min: 2, max: 50, def: 3 },
    ],
    how: (p) => `Trong ${p.gio} giờ, tài khoản đang có gói hoặc Token dịch được mở từ ${p.may} máy trở lên VÀ ${p.mang} địa chỉ mạng trở lên.`,
  },
  {
    id: "ban-lai",
    title: "Có dấu hiệu bán lại tài khoản hoặc phòng",
    termsRef: "Mục 10 · Có thể bị cấm nếu · ý 4",
    termsText: "Bán lại tài khoản hoặc bán lại phòng như dịch vụ của mình.",
    recommend: "cam",
    autos: ["khong"],
    autoDefault: "khong",
    params: [
      { key: "ngay", label: "Trong số ngày", min: 1, max: 60, def: 7 },
      { key: "may", label: "Số máy khác nhau từ", min: 3, max: 200, def: 8 },
      { key: "mang", label: "Số địa chỉ mạng khác nhau từ", min: 3, max: 500, def: 12 },
    ],
    how: (p) => `Trong ${p.ngay} ngày, tài khoản được dùng từ ${p.may} máy trở lên, HOẶC từ ${p.mang} địa chỉ mạng trở lên kèm ít nhất 3 máy (kể cả ứng dụng Android). Nhiều địa chỉ mạng mà chỉ một hai máy không tính, vì điện thoại đổi mạng liên tục.`,
  },
  {
    id: "dung-thu-nhieu-tk",
    title: "Tạo nhiều tài khoản để lấy thêm lượt dùng thử",
    termsRef: "Mục 10 · Có thể bị khóa nếu · ý 2",
    termsText: "Tạo nhiều tài khoản chỉ để lấy thêm lượt dùng thử.",
    recommend: "khoa",
    autos: ["khong"],
    autoDefault: "khong",
    params: [
      { key: "ngay", label: "Trong số ngày", min: 1, max: 180, def: 30 },
      { key: "tk", label: "Số tài khoản khác chung máy hoặc mạng từ", min: 1, max: 20, def: 2 },
      { key: "thu", label: "Trong đó đã dùng thử từ", min: 1, max: 20, def: 2 },
    ],
    how: (p) => `Trong ${p.ngay} ngày, có ${p.tk} tài khoản khác trở lên dùng chung máy (hoặc cùng địa chỉ mạng VÀ cùng đúng trình duyệt) với tài khoản này, trong đó ${p.thu} tài khoản trở lên đã nhận lượt dùng thử. Chỉ chung địa chỉ mạng thì không tính, vì mạng di động cho nhiều người chung một địa chỉ.`,
  },
  {
    id: "ho-tro-lap",
    title: "Gửi yêu cầu hỗ trợ lặp lại để gây rối",
    termsRef: "Mục 10 · Có thể bị khóa nếu · ý 3",
    termsText: "Gửi yêu cầu hỗ trợ lặp lại để gây rối.",
    recommend: "khoa",
    autos: ["khong"],
    autoDefault: "khong",
    params: [
      { key: "ngay1", label: "Số yêu cầu trong 24 giờ từ", min: 2, max: 100, def: 6 },
      { key: "ngay7", label: "Số yêu cầu trong 7 ngày từ", min: 3, max: 500, def: 15 },
    ],
    how: (p) => `Gửi từ ${p.ngay1} yêu cầu trong 24 giờ, hoặc từ ${p.ngay7} yêu cầu trong 7 ngày.`,
  },
  {
    id: "qua-tai",
    title: "Cố tình làm quá tải trang",
    termsRef: "Mục 10 · Có thể bị cấm nếu · ý 2",
    termsText: "Cố tình tấn công hoặc làm quá tải trang.",
    recommend: "cam",
    autos: ["khong", "khoa"],
    autoDefault: "khoa",
    params: [
      { key: "gio1", label: "Số lần bị chặn vì gửi quá nhanh trong 1 giờ từ", min: 3, max: 1000, def: 15 },
      { key: "ngay1", label: "Số lần bị chặn trong 24 giờ từ", min: 5, max: 5000, def: 40 },
    ],
    how: (p) => `Bị máy chủ chặn vì gửi quá nhiều yêu cầu từ ${p.gio1} lần trong 1 giờ, hoặc từ ${p.ngay1} lần trong 24 giờ.`,
  },
  {
    id: "chung-tu-gia",
    title: "Báo đã chuyển khoản nhưng không có tiền về, lặp lại",
    termsRef: "Mục 10 · Có thể bị cấm nếu · ý 3",
    termsText: "Đưa chứng từ thanh toán giả.",
    recommend: "cam",
    autos: ["khong", "khoa"],
    autoDefault: "khoa",
    params: [
      { key: "ngay", label: "Trong số ngày", min: 1, max: 90, def: 7 },
      { key: "lan", label: "Số lần báo đã chuyển mà không có tiền từ", min: 2, max: 50, def: 3 },
      { key: "gio", label: "Coi là không có tiền sau số giờ", min: 1, max: 72, def: 2 },
    ],
    how: (p) => `Trong ${p.ngay} ngày, bấm «Tôi đã chuyển» từ ${p.lan} đơn trở lên mà quá ${p.gio} giờ vẫn không có tiền về.`,
  },
  {
    id: "ctv-tu-gioi-thieu",
    title: "Cộng tác viên tự giới thiệu chính mình",
    termsRef: "Mục 11 · Giới thiệu",
    termsText: "Không tự giới thiệu.",
    recommend: "khoa",
    autos: ["khong"],
    autoDefault: "khong",
    params: [{ key: "ngay", label: "Xét trong số ngày", min: 1, max: 365, def: 60 }],
    how: (p) => `Trong ${p.ngay} ngày, khách gắn mã của cộng tác viên dùng chung máy (hoặc cùng địa chỉ mạng VÀ cùng đúng trình duyệt) với chính cộng tác viên đó. Khi cờ còn mở, cộng tác viên không rút tiền được.`,
  },
  {
    id: "may-ung-dung",
    title: "Một máy ứng dụng Android bị dùng từ quá nhiều nơi",
    termsRef: "Mục 10 · Có thể bị khóa nếu · ý 1",
    termsText: "Một tài khoản đang hạn được nhiều người dùng chung.",
    recommend: "khoa",
    autos: ["khong", "thu-hoi-may"],
    autoDefault: "thu-hoi-may",
    params: [
      { key: "gio", label: "Trong số giờ", min: 1, max: 168, def: 24 },
      { key: "mang", label: "Số địa chỉ mạng khác nhau từ", min: 2, max: 100, def: 6 },
    ],
    how: (p) => `Một máy đã liên kết được dùng từ ${p.mang} địa chỉ mạng trở lên trong ${p.gio} giờ (khóa máy bị lộ hoặc bị chia sẻ). Tự xử lý: gỡ liên kết máy đó.`,
  },
  {
    id: "thu-cong",
    title: "Cờ do nhân viên ghi tay",
    termsRef: "Theo mục điều khoản nhân viên chọn",
    termsText: "",
    recommend: "khoa",
    autos: ["khong"],
    autoDefault: "khong",
    params: [],
    how: () => "Nhân viên ghi tay kèm bằng chứng (đường dẫn, mô tả, nội dung khiếu nại) cho việc máy không tự phát hiện được: nội dung khai thác trẻ em, khiếu nại bản quyền…",
  },
];

/** Các ý điều khoản nhân viên chọn khi ghi cờ tay. */
export const MANUAL_TERMS: Array<{ ref: string; text: string; recommend: RiskRecommend }> = [
  { ref: "Mục 10 · Có thể bị khóa nếu · ý 4", text: "Có khiếu nại bản quyền đủ thông tin về nội dung bạn xử lý, trong lúc phòng xem xét.", recommend: "khoa" },
  { ref: "Mục 10 · Có thể bị cấm nếu · ý 1", text: "Đưa vào phòng nội dung khai thác trẻ em.", recommend: "cam" },
  { ref: "Mục 10 · Có thể bị cấm nếu · ý 5", text: "Tiếp tục đưa nội dung không có quyền sau khi đã được báo, hoặc bị khiếu nại bản quyền hợp lệ nhiều lần.", recommend: "cam" },
  { ref: "Mục 10 · Có thể bị cấm nếu · ý 3", text: "Đưa chứng từ thanh toán giả.", recommend: "cam" },
  { ref: "Mục 10 · Có thể bị cấm nếu · ý 4", text: "Bán lại tài khoản hoặc bán lại phòng như dịch vụ của mình.", recommend: "cam" },
  { ref: "Mục 10 · Có thể bị khóa nếu · ý 1", text: "Một tài khoản đang hạn được nhiều người dùng chung.", recommend: "khoa" },
];

export function ruleOf(id: string): RiskRuleDef | undefined {
  return RISK_RULES.find((rule) => rule.id === id);
}

// ---------- Cài đặt (Admin sửa) ----------

export type RiskRuleSetting = { on: boolean; auto: RiskAuto; p: Record<string, number> };
export type RiskSettings = Record<RiskRuleId, RiskRuleSetting>;

export function riskDefaults(): RiskSettings {
  const out = {} as RiskSettings;
  for (const rule of RISK_RULES) {
    out[rule.id] = { on: true, auto: rule.autoDefault, p: Object.fromEntries(rule.params.map((param) => [param.key, param.def])) };
  }
  return out;
}

/** Đọc cài đặt đã lưu; giá trị lạ hoặc ngoài khoảng thì kẹp về khoảng an toàn. */
export function parseRiskSettings(raw: unknown): RiskSettings {
  let data: Record<string, unknown> = {};
  try {
    data = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, unknown>;
  } catch {
    data = {};
  }
  const out = riskDefaults();
  for (const rule of RISK_RULES) {
    const row = (data?.[rule.id] ?? {}) as Partial<RiskRuleSetting>;
    out[rule.id].on = typeof row.on === "boolean" ? row.on : true;
    out[rule.id].auto = rule.autos.includes(row.auto as RiskAuto) ? (row.auto as RiskAuto) : rule.autoDefault;
    for (const param of rule.params) {
      const n = Math.round(Number((row.p ?? {})[param.key]));
      out[rule.id].p[param.key] = Number.isFinite(n) ? Math.min(param.max, Math.max(param.min, n)) : param.def;
    }
  }
  return out;
}

// ---------- Dữ kiện và đánh giá ----------

export type RiskEvent = { at: string; kind: string; ip: string; device: string; ua: string };
export type RiskSection = { title: string; columns: string[]; rows: string[][] };
export type RiskFinding = { rule: RiskRuleId; score: number; summary: string; sections: RiskSection[]; extra?: Record<string, unknown> };

export type RiskFacts = {
  now: string;
  /** Tài khoản đang có gói thuê hoặc Token dịch còn hạn. */
  active: boolean;
  events: RiskEvent[];
  appIps: Array<{ device: string; name: string; ip: string; firstAt: string; lastAt: string; uses: number }>;
  linked: Array<{ email: string; via: "may" | "mang"; value: string; at: string; trial: boolean; createdAt: string }>;
  appeals: Array<{ id: number; at: string; status: string; excerpt: string }>;
  blocks: Array<{ at: string; action: string }>;
  claims: Array<{ order: string; code: string; amount: number; claimedAt: string; status: string; paid: boolean }>;
  selfRefs: Array<{ guest: string; via: "may" | "mang"; value: string; guestAt: string; ctvAt: string }>;
};

const KIND_LABEL: Record<string, string> = {
  "dang-ky": "Đăng ký",
  "dang-nhap": "Đăng nhập",
  "hien-dien": "Đang dùng web",
  "dung-thu": "Nhận dùng thử",
  "bao-da-chuyen": "Báo đã chuyển",
};

/** Rút gọn trình duyệt: «Chrome · Android». */
export function shortUa(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /CocCoc/.test(ua) ? "Cốc Cốc" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : /okhttp/i.test(ua) ? "Ứng dụng" : ua ? "Khác" : "";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return [browser, os].filter(Boolean).join(" · ") || "—";
}

/** Giờ Việt Nam dễ đọc: 22/11/2026 14:05:09. */
export function vnTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** Mã máy trong hồ sơ: giữ ĐẦY ĐỦ (rút gọn có thể làm hai máy khác nhau trông như một, bằng chứng phải chính xác). */
export const shortDev = (d: string) => d || "—";
const within = (iso: string, now: string, hours: number) => new Date(now).getTime() - new Date(iso).getTime() <= hours * 3600 * 1000;
const uniq = (list: string[]) => [...new Set(list.filter(Boolean))];

function eventTable(title: string, events: RiskEvent[]): RiskSection {
  return {
    title,
    columns: ["Lúc (giờ VN)", "Việc", "Địa chỉ mạng", "Máy", "Trình duyệt"],
    rows: [...events].sort((a, b) => a.at.localeCompare(b.at)).map((e) => [vnTime(e.at), KIND_LABEL[e.kind] ?? e.kind, e.ip || "—", shortDev(e.device), shortUa(e.ua)]),
  };
}

function countTable(title: string, label: string, values: string[]): RiskSection {
  const counts = new Map<string, number>();
  for (const v of values.filter(Boolean)) counts.set(v, (counts.get(v) ?? 0) + 1);
  return { title, columns: [label, "Số lần"], rows: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => [label === "Máy" ? shortDev(v) : v, String(n)]) };
}

type Evaluator = (facts: RiskFacts, p: Record<string, number>) => RiskFinding | null;

export const EVALUATORS: Record<Exclude<RiskRuleId, "thu-cong">, Evaluator> = {
  "dung-chung": (f, p) => {
    if (!f.active) return null;
    const recent = f.events.filter((e) => within(e.at, f.now, p.gio));
    const devices = uniq(recent.map((e) => e.device));
    const ips = uniq(recent.map((e) => e.ip));
    if (devices.length < p.may || ips.length < p.mang) return null;
    return {
      rule: "dung-chung",
      score: Math.min(100, 40 + (devices.length - p.may) * 10 + (ips.length - p.mang) * 5),
      summary: `Trong ${p.gio} giờ, tài khoản đang có hạn dùng được mở từ ${devices.length} máy khác nhau và ${ips.length} địa chỉ mạng khác nhau (ngưỡng: ${p.may} máy và ${p.mang} địa chỉ).`,
      sections: [countTable("Các máy", "Máy", recent.map((e) => e.device)), countTable("Các địa chỉ mạng", "Địa chỉ mạng", recent.map((e) => e.ip)), eventTable("Từng lần dùng", recent)],
    };
  },
  "ban-lai": (f, p) => {
    const hours = p.ngay * 24;
    const recent = f.events.filter((e) => within(e.at, f.now, hours));
    const app = f.appIps.filter((a) => within(a.lastAt, f.now, hours));
    const devices = uniq([...recent.map((e) => e.device), ...app.map((a) => `app:${a.device}`)]);
    const ips = uniq([...recent.map((e) => e.ip), ...app.map((a) => a.ip)]);
    if (devices.length < p.may && !(ips.length >= p.mang && devices.length >= 3)) return null;
    return {
      rule: "ban-lai",
      score: Math.min(100, 50 + Math.max(devices.length - p.may, ips.length - p.mang) * 3),
      summary: `Trong ${p.ngay} ngày, tài khoản được dùng từ ${devices.length} máy và ${ips.length} địa chỉ mạng (ngưỡng: ${p.may} máy, hoặc ${p.mang} địa chỉ kèm từ 3 máy).`,
      sections: [
        countTable("Các máy (web)", "Máy", recent.map((e) => e.device)),
        countTable("Các địa chỉ mạng (web)", "Địa chỉ mạng", recent.map((e) => e.ip)),
        { title: "Ứng dụng Android", columns: ["Máy", "Địa chỉ mạng", "Lần đầu", "Lần cuối", "Số lần"], rows: app.map((a) => [a.name || shortDev(a.device), a.ip, vnTime(a.firstAt), vnTime(a.lastAt), String(a.uses)]) },
        eventTable("Từng lần dùng web", recent),
      ],
    };
  },
  "dung-thu-nhieu-tk": (f, p) => {
    const recent = f.linked.filter((l) => within(l.at, f.now, p.ngay * 24));
    const accounts = uniq(recent.map((l) => l.email));
    const trials = uniq(recent.filter((l) => l.trial).map((l) => l.email));
    if (accounts.length < p.tk || trials.length < p.thu) return null;
    return {
      rule: "dung-thu-nhieu-tk",
      score: Math.min(100, 50 + (trials.length - p.thu) * 15),
      summary: `Trong ${p.ngay} ngày, ${accounts.length} tài khoản khác dùng chung máy hoặc địa chỉ mạng với tài khoản này; ${trials.length} tài khoản trong đó đã nhận dùng thử (ngưỡng: ${p.tk} tài khoản, ${p.thu} dùng thử).`,
      sections: [
        {
          title: "Tài khoản dùng chung",
          columns: ["Tài khoản", "Chung qua", "Giá trị chung", "Lúc (giờ VN)", "Đã dùng thử", "Tạo lúc"],
          rows: recent.map((l) => [l.email, l.via === "may" ? "Máy" : "Địa chỉ mạng", l.via === "may" ? shortDev(l.value) : l.value, vnTime(l.at), l.trial ? "Có" : "Không", vnTime(l.createdAt)]),
        },
      ],
    };
  },
  "ho-tro-lap": (f, p) => {
    const day = f.appeals.filter((a) => within(a.at, f.now, 24));
    const week = f.appeals.filter((a) => within(a.at, f.now, 24 * 7));
    if (day.length < p.ngay1 && week.length < p.ngay7) return null;
    return {
      rule: "ho-tro-lap",
      score: Math.min(100, 40 + Math.max(day.length - p.ngay1, week.length - p.ngay7) * 5),
      summary: `Gửi ${day.length} yêu cầu trong 24 giờ và ${week.length} yêu cầu trong 7 ngày (ngưỡng: ${p.ngay1} trong 24 giờ hoặc ${p.ngay7} trong 7 ngày).`,
      sections: [{ title: "Các yêu cầu đã gửi (7 ngày)", columns: ["Mã", "Lúc (giờ VN)", "Trạng thái", "Nội dung (đầu)"], rows: week.map((a) => [`#${a.id}`, vnTime(a.at), a.status, a.excerpt]) }],
    };
  },
  "qua-tai": (f, p) => {
    const hour = f.blocks.filter((b) => within(b.at, f.now, 1));
    const day = f.blocks.filter((b) => within(b.at, f.now, 24));
    if (hour.length < p.gio1 && day.length < p.ngay1) return null;
    return {
      rule: "qua-tai",
      score: Math.min(100, 60 + Math.max(hour.length - p.gio1, day.length - p.ngay1)),
      summary: `Bị máy chủ chặn vì gửi quá nhanh ${hour.length} lần trong 1 giờ và ${day.length} lần trong 24 giờ (ngưỡng: ${p.gio1} hoặc ${p.ngay1}).`,
      sections: [countTable("Theo chức năng", "Chức năng", day.map((b) => b.action)), { title: "Từng lần bị chặn (24 giờ)", columns: ["Lúc (giờ VN)", "Chức năng"], rows: day.map((b) => [vnTime(b.at), b.action]) }],
    };
  },
  "chung-tu-gia": (f, p) => {
    const bad = f.claims.filter((c) => within(c.claimedAt, f.now, p.ngay * 24) && !c.paid && !within(c.claimedAt, f.now, p.gio));
    if (bad.length < p.lan) return null;
    return {
      rule: "chung-tu-gia",
      score: Math.min(100, 60 + (bad.length - p.lan) * 10),
      summary: `Trong ${p.ngay} ngày, bấm «Tôi đã chuyển» ở ${bad.length} đơn nhưng quá ${p.gio} giờ không có khoản tiền nào khớp mã đơn về tài khoản phòng (ngưỡng: ${p.lan} đơn).`,
      sections: [
        {
          title: "Các đơn báo đã chuyển mà không có tiền",
          columns: ["Mã nội dung", "Số tiền", "Báo đã chuyển lúc", "Trạng thái đơn", "Tiền về"],
          rows: bad.map((c) => [c.code, `${c.amount.toLocaleString("vi-VN")} đ`, vnTime(c.claimedAt), c.status, c.paid ? "Có" : "Không"]),
        },
      ],
    };
  },
  "ctv-tu-gioi-thieu": (f, p) => {
    const hits = f.selfRefs.filter((s) => within(s.guestAt, f.now, p.ngay * 24) || within(s.ctvAt, f.now, p.ngay * 24));
    if (!hits.length) return null;
    return {
      rule: "ctv-tu-gioi-thieu",
      score: Math.min(100, 70 + uniq(hits.map((h) => h.guest)).length * 10),
      summary: `${uniq(hits.map((h) => h.guest)).length} khách gắn mã của cộng tác viên này dùng chung máy hoặc địa chỉ mạng với chính cộng tác viên.`,
      sections: [
        {
          title: "Khách trùng máy hoặc mạng với cộng tác viên",
          columns: ["Khách", "Chung qua", "Giá trị chung", "Khách dùng lúc", "CTV dùng lúc"],
          rows: hits.map((h) => [h.guest, h.via === "may" ? "Máy" : "Địa chỉ mạng", h.via === "may" ? shortDev(h.value) : h.value, vnTime(h.guestAt), vnTime(h.ctvAt)]),
        },
      ],
    };
  },
  "may-ung-dung": (f, p) => {
    const byDevice = new Map<string, typeof f.appIps>();
    for (const a of f.appIps.filter((x) => within(x.lastAt, f.now, p.gio))) byDevice.set(a.device, [...(byDevice.get(a.device) ?? []), a]);
    const over = [...byDevice.entries()].filter(([, list]) => uniq(list.map((x) => x.ip)).length >= p.mang);
    if (!over.length) return null;
    return {
      rule: "may-ung-dung",
      score: Math.min(100, 50 + over.length * 10),
      summary: `${over.length} máy ứng dụng Android được dùng từ ${p.mang} địa chỉ mạng trở lên trong ${p.gio} giờ.`,
      sections: over.map(([device, list]) => ({
        title: `Máy ${list[0].name || shortDev(device)}`,
        columns: ["Địa chỉ mạng", "Lần đầu", "Lần cuối", "Số lần"],
        rows: list.map((x) => [x.ip, vnTime(x.firstAt), vnTime(x.lastAt), String(x.uses)]),
      })),
      extra: { devices: over.map(([device]) => device) },
    };
  },
};

// ---------- Hồ sơ bằng chứng ----------

export type RiskEvidence = {
  hoSo: string;
  taoLuc: string;
  taiKhoan: { email: string; taoLuc: string };
  luat: { ma: string; ten: string; dieuKhoan: string; trichDan: string; cachPhatHien: string; deXuat: string };
  ketLuan: string;
  bang: RiskSection[];
  ghiChu?: string;
};

/** JSON khóa xếp thứ tự, để băm luôn ra cùng một chuỗi. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Hồ sơ dạng chữ để gửi khách hoặc lưu: đủ dữ kiện, không cần mở máy khác. */
export function riskReport(e: RiskEvidence, hash: string): string {
  const lines = [
    `HỒ SƠ VI PHẠM ${e.hoSo}`,
    `Tạo lúc: ${vnTime(e.taoLuc)} (giờ Việt Nam)`,
    `Mã băm SHA-256 của dữ liệu gốc: ${hash}`,
    "",
    `Tài khoản: ${e.taiKhoan.email} (tạo lúc ${vnTime(e.taiKhoan.taoLuc)})`,
    `Luật: ${e.luat.ten} [${e.luat.ma}]`,
    `Điều khoản: ${e.luat.dieuKhoan}${e.luat.trichDan ? ` — «${e.luat.trichDan}»` : ""}`,
    `Cách phát hiện: ${e.luat.cachPhatHien}`,
    `Đề xuất: ${e.luat.deXuat}`,
    "",
    `KẾT LUẬN: ${e.ketLuan}`,
  ];
  if (e.ghiChu) lines.push("", `Ghi chú của nhân viên: ${e.ghiChu}`);
  for (const section of e.bang) {
    lines.push("", `--- ${section.title} (${section.rows.length} dòng) ---`, section.columns.join(" | "));
    for (const row of section.rows) lines.push(row.join(" | "));
  }
  lines.push(
    "",
    "Dữ kiện trên là bản chụp dữ liệu máy chủ tại thời điểm tạo hồ sơ, không sửa được về sau.",
    "Mã băm SHA-256 tính trên dữ liệu gốc (JSON xếp khóa); tính lại ra cùng mã là dữ liệu không bị sửa.",
  );
  return lines.join("\n");
}
