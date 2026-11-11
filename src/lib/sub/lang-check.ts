/**
 * Kiểm tra ngôn ngữ từng đoạn. Chỉ dùng khi người dùng bật công tắc.
 * Groq trả lại đúng ngôn ngữ đã ép, nên không tin trường `language` khi đã ép.
 * Hai dấu hiệu rẻ: chữ viết của kết quả lệch ngôn ngữ đã chọn, hoặc độ tin Whisper thấp.
 * Chỉ khi nhận dạng lại không ép ngôn ngữ cho kết quả tốt hơn rõ rệt thì mới đổi.
 */

export const LANG_RETRY_BUDGET_SECONDS = 120;
export const LANG_MIN_LETTERS = 12;
export const LANG_LOW_LOGPROB = -0.8;
export const LANG_BETTER_MARGIN = 0.2;

export type ScriptCount = { han: number; kana: number; hangul: number; latin: number; total: number };

export type LangResult = {
  language?: string;
  segments?: Array<{ text?: string; avg_logprob?: number; start?: number; end?: number } | null>;
};

export function countScripts(text: string): ScriptCount {
  const out: ScriptCount = { han: 0, kana: 0, hangul: 0, latin: 0, total: 0 };
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)) out.han++;
    else if ((code >= 0x3040 && code <= 0x30ff) || (code >= 0x31f0 && code <= 0x31ff)) out.kana++;
    else if ((code >= 0xac00 && code <= 0xd7af) || (code >= 0x1100 && code <= 0x11ff)) out.hangul++;
    else if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) out.latin++;
    else continue;
    out.total++;
  }
  return out;
}

/** Chữ viết không khớp ngôn ngữ đã chọn. Đoạn quá ngắn thì không kết luận. */
export function scriptMismatch(requested: string, text: string): boolean {
  const c = countScripts(text);
  if (c.total < LANG_MIN_LETTERS) return false;
  const share = (n: number) => n / c.total;
  switch (requested) {
    case "zh":
      return share(c.kana) >= 0.2 || share(c.hangul) >= 0.3 || share(c.latin) >= 0.7;
    case "ja":
      return share(c.hangul) >= 0.3 || share(c.latin) >= 0.7 || (c.kana === 0 && share(c.han) >= 0.9);
    case "ko":
      return share(c.hangul) < 0.2;
    case "en":
      return share(c.latin) < 0.5;
    default:
      return false;
  }
}

export function resultText(result: LangResult): string {
  return (result.segments || []).map((s) => (typeof s?.text === "string" ? s.text : "")).join(" ");
}

/** Trung bình avg_logprob theo độ dài chữ. Không có số thì trả null. */
export function meanLogprob(result: LangResult): number | null {
  let sum = 0;
  let weight = 0;
  for (const s of result.segments || []) {
    if (!s || typeof s.avg_logprob !== "number" || !Number.isFinite(s.avg_logprob)) continue;
    const w = Math.max(1, (typeof s.text === "string" ? s.text : "").length);
    sum += s.avg_logprob * w;
    weight += w;
  }
  return weight ? sum / weight : null;
}

export function needsLangCheck(requested: string, result: LangResult): boolean {
  if (!requested) return false;
  if (!(result.segments || []).length) return false;
  if (scriptMismatch(requested, resultText(result))) return true;
  const mean = meanLogprob(result);
  return mean !== null && mean < LANG_LOW_LOGPROB;
}

const NAMES: Record<string, string> = {
  chinese: "zh",
  mandarin: "zh",
  cantonese: "zh",
  japanese: "ja",
  korean: "ko",
  english: "en",
};

/** Whisper trả tên đầy đủ (english) hoặc mã (en). Ngoài bốn ngôn ngữ thì trả chuỗi rỗng. */
export function normalizeLang(value: string | undefined): string {
  const v = (value || "").trim().toLowerCase();
  if (!v) return "";
  if (NAMES[v]) return NAMES[v];
  const short = v.slice(0, 2);
  return short === "zh" || short === "ja" || short === "ko" || short === "en" ? short : "";
}

/**
 * Giữ kết quả ép ngôn ngữ, trừ khi bản không ép: đoán ngôn ngữ khác trong bốn ngôn ngữ nguồn,
 * và hoặc chữ viết khớp lại, hoặc độ tin cao hơn từ 0,2 trở lên.
 */
export function chooseBetter(requested: string, forced: LangResult, auto: LangResult): "forced" | "auto" {
  if (!(auto.segments || []).length) return "forced";
  const detected = normalizeLang(auto.language);
  if (!detected || detected === requested) return "forced";
  const forcedBad = scriptMismatch(requested, resultText(forced));
  const autoOk = !scriptMismatch(detected, resultText(auto));
  if (forcedBad && autoOk) return "auto";
  const a = meanLogprob(auto);
  const f = meanLogprob(forced);
  if (a !== null && f !== null && a - f >= LANG_BETTER_MARGIN && autoOk) return "auto";
  return "forced";
}
