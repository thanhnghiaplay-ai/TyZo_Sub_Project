/**
 * Chấm điểm một bản nhận dạng giọng nói (danh sách câu có mốc giờ) mà KHÔNG cần mạng và KHÔNG phụ thuộc nhà cung cấp:
 * đưa vào SRT của Groq, Deepgram, AssemblyAI... đều chấm được. Dùng bởi `scripts/asr-bench.ts` và có thể dùng lại trong app.
 *
 * Bắt các lỗi đã gặp ở Whisper: bỏ lời (ít chữ trên giây, câu dài mà ít chữ), ảo giác («请不吝点赞…»), lệch ngôn ngữ,
 * câu lặp ở chỗ nối đoạn, câu vụn; và đo sai khác so với bản đáp án (CER cho zh/ja/ko, WER cho en) nếu có.
 */

export type Cue = { start: number; end: number; text: string };
export type Lang = "zh" | "ja" | "ko" | "en";

export type Thresholds = {
  /** Chữ (hoặc ký tự) tối thiểu mỗi giây thoại. Dưới mức này coi là bỏ lời. */
  minCharsPerSec: number;
  /** Câu dài hơn số giây này mà ít chữ thì là «câu thưa» (Whisper gộp cả cửa sổ vào vài chữ). */
  sparseCueSeconds: number;
  /** Tỉ lệ chữ đúng ngôn ngữ tối thiểu (toàn bản). */
  minScriptShare: number;
  /** Sai khác so với đáp án: trên mức này là lỗi, trên mức nửa này là cảnh báo. */
  maxErrorRate: number;
  /** Tỉ lệ câu quá ngắn (dưới 0,8 giây) từ mức này là cảnh báo. */
  maxTinyCueRatio: number;
  /** Độ dài chuỗi chung tối thiểu giữa hai câu liền nhau để coi là lặp. */
  dupCommonChars: number;
};

export const DEFAULT_THRESHOLDS: Record<Lang, Thresholds> = {
  zh: { minCharsPerSec: 1.5, sparseCueSeconds: 8, minScriptShare: 0.8, maxErrorRate: 0.3, maxTinyCueRatio: 0.2, dupCommonChars: 5 },
  ja: { minCharsPerSec: 1.5, sparseCueSeconds: 8, minScriptShare: 0.8, maxErrorRate: 0.3, maxTinyCueRatio: 0.2, dupCommonChars: 5 },
  ko: { minCharsPerSec: 1.5, sparseCueSeconds: 8, minScriptShare: 0.8, maxErrorRate: 0.3, maxTinyCueRatio: 0.2, dupCommonChars: 6 },
  en: { minCharsPerSec: 6, sparseCueSeconds: 8, minScriptShare: 0.9, maxErrorRate: 0.3, maxTinyCueRatio: 0.2, dupCommonChars: 12 },
};

/** Câu mẫu Whisper hay «bịa» khi không nghe rõ (lời cuối video, lời kêu gọi theo dõi, tên nhóm làm phụ đề). */
const HALLUCINATION: Record<Lang, RegExp[]> = {
  zh: [/请不吝点赞/, /订阅.{0,6}转发/, /打赏支持/, /明镜与点点/, /字幕(由|志愿者|制作|组)/, /谢谢观看/, /感谢观看/, /amara\.org/i],
  ja: [/ご視聴ありがとうございました/, /チャンネル登録/, /字幕(は|by)/, /amara\.org/i],
  ko: [/시청해 ?주셔서 ?감사합니다/, /구독과 ?좋아요/, /자막 ?제공/, /amara\.org/i],
  en: [/thanks? for watching/i, /thank you for watching/i, /like and subscribe/i, /subtitles? by/i, /amara\.org/i, /please subscribe/i],
};

export function parseSrt(raw: string): Cue[] {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r/g, "").trim();
  if (!text) return [];
  const cues: Cue[] = [];
  for (const block of text.split(/\n{2,}/)) {
    const lines = block.split("\n");
    const at = lines.findIndex((line) => line.includes("-->"));
    if (at < 0) continue;
    const [a, b] = lines[at].split("-->").map((part) => toSeconds(part.trim()));
    if (a === null || b === null) continue;
    cues.push({ start: a, end: b, text: lines.slice(at + 1).join(" ").trim() });
  }
  return cues;
}

function toSeconds(stamp: string): number | null {
  const match = stamp.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4].padEnd(3, "0").slice(0, 3)) / 1000;
}

const PUNCT = /[\s\p{P}\p{S}]/gu;
const LETTER = /[\p{L}\p{N}]/u;

function chars(text: string): string[] {
  return [...text.replace(PUNCT, "").toLowerCase()];
}

function words(text: string): string[] {
  return text.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, " ").split(/\s+/).filter(Boolean);
}

function units(text: string, lang: Lang): string[] {
  return lang === "en" ? words(text) : chars(text);
}

function distance(a: string[], b: string[]): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

/** Tỉ lệ sai khác (CER với zh/ja/ko, WER với en) của bản nhận dạng so với đáp án. 0 là giống hệt. */
export function errorRate(reference: string, hypothesis: string, lang: Lang): number {
  const ref = units(reference, lang);
  if (!ref.length) return 0;
  return distance(ref, units(hypothesis, lang)) / ref.length;
}

function scriptMatch(char: string, lang: Lang): boolean {
  if (lang === "en") return /\p{Script=Latin}/u.test(char);
  if (lang === "ko") return /[\p{Script=Hangul}\p{Script=Han}]/u.test(char);
  if (lang === "ja") return /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー]/u.test(char);
  return /\p{Script=Han}/u.test(char);
}

function scriptShare(text: string, lang: Lang): number | null {
  const letters = [...text].filter((char) => LETTER.test(char) && !/\p{N}/u.test(char));
  if (!letters.length) return null;
  return letters.filter((char) => scriptMatch(char, lang)).length / letters.length;
}

function longestCommon(a: string, b: string): number {
  if (!a || !b) return 0;
  let best = 0;
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const row = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        row[j] = prev[j - 1] + 1;
        if (row[j] > best) best = row[j];
      }
    }
    prev = row;
  }
  return best;
}

function speechSeconds(cues: Cue[]): number {
  const spans = cues.filter((cue) => cue.end > cue.start).map((cue) => [cue.start, cue.end] as const).sort((x, y) => x[0] - y[0]);
  let total = 0;
  let cursor = -Infinity;
  for (const [start, end] of spans) {
    const from = Math.max(start, cursor);
    if (end > from) total += end - from;
    cursor = Math.max(cursor, end);
  }
  return total;
}

export type AsrMetrics = {
  cues: number;
  durationSec: number;
  speechSec: number;
  /** speechSec / durationSec */
  coverage: number;
  chars: number;
  charsPerSec: number;
  sparseCues: number;
  tinyCueRatio: number;
  duplicatePairs: number;
  hallucinations: string[];
  scriptShare: number | null;
  offScriptCues: number;
  errorRate: number | null;
};

export type AsrVerdict = { status: "pass" | "warn" | "fail"; fails: string[]; warns: string[]; metrics: AsrMetrics };

export type ScoreInput = {
  cues: Cue[];
  lang: Lang;
  /** Độ dài âm thanh (giây). Không có thì lấy mốc kết thúc câu cuối. */
  durationSec?: number;
  /** Bản đáp án (văn bản thuần). Có thì tính CER/WER. */
  reference?: string;
  thresholds?: Partial<Thresholds>;
};

export function scoreAsr(input: ScoreInput): AsrVerdict {
  const { cues, lang } = input;
  const t: Thresholds = { ...DEFAULT_THRESHOLDS[lang], ...input.thresholds };
  const durationSec = input.durationSec ?? Math.max(0, ...cues.map((cue) => cue.end));
  const texts = cues.map((cue) => cue.text);
  const all = texts.join(" ");
  const total = chars(all).length;
  const speech = speechSeconds(cues);

  const sparseCues = cues.filter((cue) => cue.end - cue.start > t.sparseCueSeconds && chars(cue.text).length / (cue.end - cue.start) < 1).length;
  const tiny = cues.filter((cue) => cue.end - cue.start < 0.8).length;

  let duplicatePairs = 0;
  for (let i = 1; i < cues.length; i++) {
    if (longestCommon(chars(cues[i - 1].text).join(""), chars(cues[i].text).join("")) >= t.dupCommonChars) duplicatePairs++;
  }

  const hallucinations = HALLUCINATION[lang].filter((pattern) => pattern.test(all)).map((pattern) => pattern.source);
  const offScriptCues = cues.filter((cue) => {
    const share = scriptShare(cue.text, lang);
    return share !== null && share < 0.5;
  }).length;

  const metrics: AsrMetrics = {
    cues: cues.length,
    durationSec,
    speechSec: speech,
    coverage: durationSec > 0 ? speech / durationSec : 0,
    chars: total,
    charsPerSec: speech > 0 ? total / speech : 0,
    sparseCues,
    tinyCueRatio: cues.length ? tiny / cues.length : 0,
    duplicatePairs,
    hallucinations,
    scriptShare: scriptShare(all, lang),
    offScriptCues,
    errorRate: input.reference !== undefined ? errorRate(input.reference, all, lang) : null,
  };

  const fails: string[] = [];
  const warns: string[] = [];
  if (!cues.length || !total) fails.push("không có câu nào");
  else {
    if (metrics.charsPerSec < t.minCharsPerSec) fails.push(`quá thưa: ${metrics.charsPerSec.toFixed(2)} chữ/giây (tối thiểu ${t.minCharsPerSec}), nghi bỏ lời`);
    if (sparseCues) fails.push(`${sparseCues} câu dài mà ít chữ (nghi bỏ lời trong cả cửa sổ)`);
    if (hallucinations.length) fails.push(`dính câu bịa quen thuộc: ${hallucinations.join(", ")}`);
    if (metrics.scriptShare !== null && metrics.scriptShare < t.minScriptShare) fails.push(`lệch ngôn ngữ: chỉ ${(metrics.scriptShare * 100).toFixed(0)}% chữ đúng ngôn ngữ`);
    else if (offScriptCues) warns.push(`${offScriptCues} câu sai ngôn ngữ`);
    if (metrics.errorRate !== null) {
      if (metrics.errorRate > t.maxErrorRate) fails.push(`sai khác so với đáp án ${(metrics.errorRate * 100).toFixed(0)}% (tối đa ${t.maxErrorRate * 100}%)`);
      else if (metrics.errorRate > t.maxErrorRate / 2) warns.push(`sai khác so với đáp án ${(metrics.errorRate * 100).toFixed(0)}%`);
    }
    if (duplicatePairs) warns.push(`${duplicatePairs} cặp câu liền nhau lặp lời (thường ở chỗ nối đoạn)`);
    if (metrics.tinyCueRatio > t.maxTinyCueRatio) warns.push(`${Math.round(metrics.tinyCueRatio * 100)}% câu quá ngắn (vụn)`);
  }
  return { status: fails.length ? "fail" : warns.length ? "warn" : "pass", fails, warns, metrics };
}

/** Văn bản thuần của một danh sách câu (để làm đáp án từ một SRT đã duyệt tay). */
export function cuesText(cues: Cue[]): string {
  return cues.map((cue) => cue.text).join("\n");
}
