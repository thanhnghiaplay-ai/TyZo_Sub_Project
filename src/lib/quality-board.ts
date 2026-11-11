import { healthOf, type Bands, type Health, type QualitySummary } from "./sub/quality.ts";

/**
 * Bản báo chất lượng một lần chạy, gửi từ trình duyệt lên máy chủ. Chỉ có số.
 * Không có chữ phụ đề, tên tệp, video, âm thanh, khóa hay mã tài khoản.
 */
export type QualityReport = {
  appVersion: string;
  keySource: "own" | "room";
  asrModel: string;
  sourceLang: string;
  seconds: number;
  segments: number;
  high: number;
  check: number;
  low: number;
  unknown: number;
  /** Độ tin trung bình 0..1, null nếu Whisper không trả độ tin. */
  confMean: number | null;
  partsTotal: number;
  partsWhisper: number;
  partsEmpty: number;
  partsSilence: number;
  partsDecodeFail: number;
  appFiltered: number;
  keptCues: number;
  health: Health;
  langCheck: boolean;
  langSuspect: number;
  langResent: number;
  langSwapped: number;
  langBefore: number | null;
  langAfter: number | null;
};

const SOURCE_LANGS = new Set(["zh", "ko", "ja", "en"]);
const HEALTHS = new Set<string>(["green", "yellow", "red", "unknown"]);
const VERSION_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const MODEL_RE = /^[a-z0-9./_-]{2,80}$/i;
const MAX_COUNT = 1_000_000;
const MAX_SECONDS = 60 * 60 * 24;

function count(value: unknown, name: string, max = MAX_COUNT): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(`Số ${name} không đúng.`);
  return Math.round(n);
}

function unit(value: unknown, name: string): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error(`Số ${name} không đúng.`);
  return n;
}

/** Kiểm tra và làm sạch bản báo. Sai là ném lỗi, không lưu. Chỉ giữ đúng các trường đã định. */
export function parseQualityReport(input: unknown): QualityReport {
  if (!input || typeof input !== "object") throw new Error("Bản báo không đúng.");
  const r = input as Record<string, unknown>;
  const appVersion = String(r.appVersion ?? "");
  if (!VERSION_RE.test(appVersion)) throw new Error("Số phiên bản không đúng.");
  const keySource = r.keySource === "room" ? "room" : r.keySource === "own" ? "own" : null;
  if (!keySource) throw new Error("Loại key không đúng.");
  const asrModel = String(r.asrModel ?? "");
  if (!MODEL_RE.test(asrModel)) throw new Error("Tên model không đúng.");
  const sourceLang = String(r.sourceLang ?? "");
  if (!SOURCE_LANGS.has(sourceLang)) throw new Error("Ngôn ngữ không đúng.");
  const health = String(r.health ?? "");
  if (!HEALTHS.has(health)) throw new Error("Mức đèn không đúng.");
  const out: QualityReport = {
    appVersion,
    keySource,
    asrModel,
    sourceLang,
    seconds: count(r.seconds, "giây", MAX_SECONDS),
    segments: count(r.segments, "câu"),
    high: count(r.high, "mức cao"),
    check: count(r.check, "mức cần kiểm tra"),
    low: count(r.low, "mức thấp"),
    unknown: count(r.unknown, "mức không rõ"),
    confMean: unit(r.confMean, "độ tin"),
    partsTotal: count(r.partsTotal, "đoạn"),
    partsWhisper: count(r.partsWhisper, "đoạn có chữ"),
    partsEmpty: count(r.partsEmpty, "đoạn trống"),
    partsSilence: count(r.partsSilence, "đoạn im"),
    partsDecodeFail: count(r.partsDecodeFail, "đoạn lỗi"),
    appFiltered: count(r.appFiltered, "câu lọc"),
    keptCues: count(r.keptCues, "câu giữ"),
    health: health as Health,
    langCheck: r.langCheck === true,
    langSuspect: count(r.langSuspect, "đoạn nghi"),
    langResent: count(r.langResent, "đoạn gửi lại"),
    langSwapped: count(r.langSwapped, "đoạn đổi"),
    langBefore: unit(r.langBefore, "độ tin trước"),
    langAfter: unit(r.langAfter, "độ tin sau"),
  };
  if (out.high + out.check + out.low + out.unknown > out.segments) throw new Error("Số mức tin vượt số câu.");
  if (out.partsWhisper + out.partsEmpty + out.partsSilence + out.partsDecodeFail > out.partsTotal) throw new Error("Số đoạn không khớp.");
  if (out.langSwapped > out.langResent || out.langResent > out.langSuspect) throw new Error("Số kiểm tra ngôn ngữ không khớp.");
  if (out.partsTotal === 0) throw new Error("Lần chạy không có đoạn nào.");
  return out;
}

export function reportFromSummary(
  summary: QualitySummary,
  meta: { appVersion: string; keySource: "own" | "room"; asrModel: string; sourceLang: string; seconds: number; langCheck: boolean },
): QualityReport {
  return {
    appVersion: meta.appVersion,
    keySource: meta.keySource,
    asrModel: meta.asrModel,
    sourceLang: meta.sourceLang,
    seconds: Math.max(0, Math.round(meta.seconds)),
    segments: summary.segments,
    high: summary.bands.high,
    check: summary.bands.check,
    low: summary.bands.low,
    unknown: summary.bands.unknown,
    confMean: summary.meanConfidence,
    partsTotal: summary.parts.total,
    partsWhisper: summary.parts.whisper,
    partsEmpty: summary.parts.empty,
    partsSilence: summary.parts.silence,
    partsDecodeFail: summary.parts.decodeFail,
    appFiltered: summary.appFiltered,
    keptCues: summary.keptCues,
    health: summary.health,
    langCheck: meta.langCheck,
    langSuspect: summary.langCheck.suspect,
    langResent: summary.langCheck.resent,
    langSwapped: summary.langCheck.swapped,
    langBefore: summary.langCheck.meanBefore,
    langAfter: summary.langCheck.meanAfter,
  };
}

/** Một dòng từ máy chủ: tổng theo (ngày, loại key, ngôn ngữ, model, phiên bản). */
export type BoardRow = {
  day: string;
  keySource: "own" | "room";
  sourceLang: string;
  asrModel: string;
  appVersion: string;
  runs: number;
  seconds: number;
  segments: number;
  high: number;
  check: number;
  low: number;
  unknown: number;
  confSum: number;
  confWeight: number;
  partsTotal: number;
  partsWhisper: number;
  partsEmpty: number;
  partsSilence: number;
  partsDecodeFail: number;
  appFiltered: number;
  keptCues: number;
  langRuns: number;
  langSuspect: number;
  langResent: number;
  langSwapped: number;
  langBeforeSum: number;
  langAfterSum: number;
  langWeight: number;
  healthGreen: number;
  healthYellow: number;
  healthRed: number;
  healthUnknown: number;
};

export type Rollup = {
  runs: number;
  seconds: number;
  segments: number;
  bands: Bands;
  meanConfidence: number | null;
  parts: { total: number; whisper: number; empty: number; silence: number; decodeFail: number };
  appFiltered: number;
  keptCues: number;
  health: Health;
  healthReason: string;
  runHealth: { green: number; yellow: number; red: number; unknown: number };
  lang: { runsOn: number; suspect: number; resent: number; swapped: number; meanBefore: number | null; meanAfter: number | null };
};

export function rollup(rows: BoardRow[]): Rollup {
  const sum = (pick: (r: BoardRow) => number) => rows.reduce((n, r) => n + pick(r), 0);
  const bands: Bands = { high: sum((r) => r.high), check: sum((r) => r.check), low: sum((r) => r.low), unknown: sum((r) => r.unknown) };
  const parts = {
    total: sum((r) => r.partsTotal),
    whisper: sum((r) => r.partsWhisper),
    empty: sum((r) => r.partsEmpty),
    silence: sum((r) => r.partsSilence),
    decodeFail: sum((r) => r.partsDecodeFail),
  };
  const segments = sum((r) => r.segments);
  const appFiltered = sum((r) => r.appFiltered);
  const confW = sum((r) => r.confWeight);
  const langW = sum((r) => r.langWeight);
  const verdict = rows.length
    ? healthOf({ segments, bands, parts, appFiltered })
    : { health: "unknown" as Health, reason: "Chưa có lần chạy nào." };
  return {
    runs: sum((r) => r.runs),
    seconds: sum((r) => r.seconds),
    segments,
    bands,
    meanConfidence: confW > 0 ? sum((r) => r.confSum) / confW : null,
    parts,
    appFiltered,
    keptCues: sum((r) => r.keptCues),
    health: verdict.health,
    healthReason: verdict.reason,
    runHealth: { green: sum((r) => r.healthGreen), yellow: sum((r) => r.healthYellow), red: sum((r) => r.healthRed), unknown: sum((r) => r.healthUnknown) },
    lang: {
      runsOn: sum((r) => r.langRuns),
      suspect: sum((r) => r.langSuspect),
      resent: sum((r) => r.langResent),
      swapped: sum((r) => r.langSwapped),
      meanBefore: langW > 0 ? sum((r) => r.langBeforeSum) / langW : null,
      meanAfter: langW > 0 ? sum((r) => r.langAfterSum) / langW : null,
    },
  };
}

export function groupRollup(rows: BoardRow[], key: (r: BoardRow) => string, order: "key" | "key-desc" = "key"): Array<{ key: string; rollup: Rollup }> {
  const map = new Map<string, BoardRow[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  const out = [...map.entries()].map(([k, list]) => ({ key: k, rollup: rollup(list) }));
  out.sort((a, b) => (order === "key" ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key)));
  return out;
}

/** So sánh số phiên bản dạng x.y.z, mới trước. */
export function compareVersionDesc(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pb[i] || 0) - (pa[i] || 0);
    if (d) return d;
  }
  return 0;
}

/** Gợi ý chỗ nên xem khi chỉnh. Chỉ là gợi ý theo số liệu, chưa kiểm chứng. Không có số thì không gợi ý. */
export function hintsFor(r: Rollup): string[] {
  if (r.runs === 0 || r.segments === 0) return [];
  const out: string[] = [];
  const known = r.bands.high + r.bands.check + r.bands.low;
  if (r.parts.total && r.parts.decodeFail / r.parts.total > 0.03) out.push("Nhiều đoạn không giải mã được. Xem lại codec và định dạng video của khách.");
  if (known && r.bands.low / known > 0.12) out.push("Nhiều câu có độ tin thấp. Thử model chính xác hơn hoặc bật lọc đoạn có tiếng người.");
  if (r.appFiltered / r.segments > 0.3) out.push("App lọc bỏ nhiều câu Whisper trả về. Xem lại ngưỡng lọc ảo giác.");
  if (r.parts.total && r.parts.empty / r.parts.total > 0.3) out.push("Nhiều đoạn Whisper không trả câu. Có thể phim ít thoại hoặc nhạc nền lấn tiếng.");
  return out;
}

/** Nhận xét về tính năng kiểm tra ngôn ngữ từ số đã gộp. */
export function langCheckVerdict(lang: Rollup["lang"]): string {
  if (lang.runsOn === 0) return "Chưa có lần chạy nào bật tính năng này.";
  if (lang.swapped < 10) return `Mới có ${lang.swapped} đoạn được đổi, chưa đủ để kết luận.`;
  if (lang.meanBefore === null || lang.meanAfter === null) return "Chưa có độ tin để so sánh.";
  const gain = lang.meanAfter - lang.meanBefore;
  if (gain >= 0.1) return `Độ tin các đoạn đổi tăng ${(gain * 100).toFixed(0)} điểm. Có ích.`;
  if (gain > 0) return "Độ tin tăng ít. Chưa rõ có ích.";
  return "Độ tin không tăng. Chưa nên bật mặc định.";
}
