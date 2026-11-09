const LANGS = new Set(["ja", "ko", "zh", "en"]);
const GENRES = new Set([
  "action",
  "adventure",
  "crime",
  "scifi",
  "horror",
  "romance",
  "psychological",
  "comedy",
  "costume",
  "historical",
  "mystery",
  "sports",
  "adult",
  "sex",
  "series",
  "daily",
  "auto",
]);

export function glossaryPair(lang: string, genre: string) {
  const nextLang = lang.trim().toLowerCase();
  const nextGenre = (genre || "auto").trim().toLowerCase();
  if (!LANGS.has(nextLang) || !GENRES.has(nextGenre)) throw new Error("Ngôn ngữ hoặc thể loại không đúng.");
  return { lang: nextLang, genre: nextGenre };
}

function scrub(value: string) {
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
