import { GENRES as GENRE_LIST, currentGenre } from "./home-state.ts";

const LANGS = new Set(["ja", "ko", "zh", "en"]);
// Danh sách thể loại lấy từ một nơi duy nhất (home-state.ts) để ô chọn, bộ thuật ngữ và kho prompt không lệch nhau.
const GENRES = new Set(GENRE_LIST.map(([id]) => id));

export const GENRE_LABELS: Record<string, string> = Object.fromEntries(GENRE_LIST);

export function glossaryPair(lang: string, genre: string) {
  const nextLang = lang.trim().toLowerCase();
  const nextGenre = currentGenre(genre || "auto");
  if (!LANGS.has(nextLang) || !GENRES.has(nextGenre)) throw new Error("Ngôn ngữ hoặc thể loại không đúng.");
  return { lang: nextLang, genre: nextGenre };
}

function scrub(value: string) {
  // eslint-disable-next-line no-control-regex -- cố ý xóa ký tự điều khiển
  const text = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80);
  if (!text || /https?:|www\.|@/i.test(text) || /\d{8,}/.test(text)) return "";
  return text;
}

export function cleanSuggestion(source: string, target: string) {
  const nextSource = scrub(source);
  const nextTarget = scrub(target);
  if (!nextSource || !nextTarget) return null;
  return { source: nextSource, target: nextTarget };
}

export function cleanSuggestions(terms: { source: string; target: string }[]) {
  const out: { source: string; target: string }[] = [];
  for (const term of terms.slice(0, 200)) {
    const clean = cleanSuggestion(term?.source ?? "", term?.target ?? "");
    if (clean) out.push(clean);
  }
  return out;
}
