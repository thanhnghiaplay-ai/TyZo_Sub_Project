/**
 * RE7-004 · hướng dẫn tên riêng cho model dịch (hướng D), 5 ngôn ngữ lõi Anh/Trung/Nhật/Hàn/Việt = 20 cặp có hướng.
 * Thứ tự ưu tiên: (1) bảng thuật ngữ của khách/phòng — bắt buộc dùng đúng; (2) cách gọi chuẩn đã biết chắc theo
 * ngôn ngữ đích; (3) không chắc thì GIỮ NGUYÊN tên gốc. Không bao giờ bỏ, rút gọn hay dịch nghĩa một tên riêng.
 *
 * CHƯA gửi lên Qwen LiveTranslate: tài liệu phiên realtime chỉ xác nhận `translation.language` và
 * `translation.corpus.phrases` (bảng thuật ngữ, đã dùng qua vé `words`), chưa có trường hướng dẫn tự do. Văn bản này
 * chuẩn bị sẵn cho khi Chủ duyệt thử thật (có phí). Không thêm lượt gọi AI nào trên đường streaming.
 */
export const CORE_LANGS = ["en", "zh", "ja", "ko", "vi"] as const;
export type CoreLang = (typeof CORE_LANGS)[number];

export function corePairs(): [CoreLang, CoreLang][] {
  return CORE_LANGS.flatMap((s) => CORE_LANGS.filter((t) => t !== s).map((t) => [s, t] as [CoreLang, CoreLang]));
}

const NAME: Record<CoreLang, string> = { en: "English", zh: "Chinese", ja: "Japanese", ko: "Korean", vi: "Vietnamese" };

/** Quy ước theo nguồn → đích. Chỉ nêu quy ước chuẩn; mọi trường hợp không chắc rơi về «giữ nguyên». */
const RULE: Record<CoreLang, Partial<Record<CoreLang, string>>> = {
  vi: {
    zh: "Chinese person and place names: use the established Sino-Vietnamese reading only when certain (王小明 → Vương Tiểu Minh, 北京 → Bắc Kinh).",
    ja: "Japanese names: use Hepburn romanization (田中 → Tanaka, 東京 → Tokyo).",
    ko: "Korean names: use Revised Romanization (김민수 → Kim Min-su, 부산 → Busan).",
    en: "English names: keep the original spelling.",
  },
  en: {
    zh: "Chinese names: use Hanyu Pinyin with standard spacing (王小明 → Wang Xiaoming).",
    ja: "Japanese names: use Hepburn romanization (田中 → Tanaka).",
    ko: "Korean names: use Revised Romanization or the person's known spelling (김민수 → Kim Min-su).",
    vi: "Vietnamese names: keep the original spelling with diacritics (Nguyễn Văn An).",
  },
  zh: {
    ja: "Japanese names written in kanji: keep the same characters (田中 → 田中); kana-only names: keep the original.",
    ko: "Korean names: use the established Chinese characters only when certain; otherwise keep the Hangul original.",
    en: "English names: use the established Chinese name only when certain; otherwise keep the Latin original.",
    vi: "Vietnamese names: keep the Latin original with diacritics unless an established Chinese form is certain.",
  },
  ja: {
    zh: "Chinese names: keep the original characters (王小明 → 王小明).",
    ko: "Korean names: write the established katakana reading only when certain; otherwise keep the Hangul original.",
    en: "English names: use the established katakana form only when certain; otherwise keep the Latin original.",
    vi: "Vietnamese names: use katakana only when certain; otherwise keep the Latin original with diacritics.",
  },
  ko: {
    zh: "Chinese names: use the standard Hangul transcription only when certain; otherwise keep the original characters.",
    ja: "Japanese names: use the standard Hangul transcription only when certain (田中 → 다나카); otherwise keep the original.",
    en: "English names: use the standard Hangul transcription only when certain; otherwise keep the Latin original.",
    vi: "Vietnamese names: use the standard Hangul transcription only when certain; otherwise keep the Latin original.",
  },
};

export type GlossaryPair = { source: string; target: string };

/** Bảng thuật ngữ trước (đã làm sạch, bỏ trùng, tối đa 30 như cleanHotwords), rồi quy ước, rồi quy tắc giữ nguyên. */
export function namePolicyPrompt(source: CoreLang, target: CoreLang, glossary: GlossaryPair[] = []): string {
  if (source === target) throw new Error("Nguồn và đích phải khác nhau.");
  const seen = new Set<string>();
  const terms = glossary
    .map((g) => ({ source: g.source.trim(), target: g.target.trim() }))
    .filter((g) => g.source && g.target && !seen.has(g.source) && seen.add(g.source))
    .slice(0, 30);
  const lines = [`You translate live ${NAME[source]} speech into ${NAME[target]}.`];
  if (terms.length) {
    lines.push("Glossary (mandatory, overrides every other rule; use exactly as written):");
    for (const t of terms) lines.push(`- ${t.source} → ${t.target}`);
  }
  lines.push(
    "Proper names (people, characters, places, organizations, titles, terms):",
    `- ${RULE[target][source]}`,
    "- If you are not certain of the conventional form, keep the original name exactly as spoken or written. Do not guess.",
    "- Never omit, shorten, summarize or translate the meaning of a name. Keep every name in both partial and final text.",
  );
  return lines.join("\n");
}
