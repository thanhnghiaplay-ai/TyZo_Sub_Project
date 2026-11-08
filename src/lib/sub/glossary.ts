/**
 * Structured glossary by (source language × genre).
 * Each genre file stands alone. common.json and global.json are not merged,
 * so a term from one genre cannot leak into another.
 * Matching: longest-match first. For space-less scripts (ja/zh/ko/th)
 * we do plain substring search; otherwise prefer word boundaries.
 */

export type GlossaryTerm = {
  source: string;
  target: string;
  whole_word?: boolean;
  case_sensitive?: boolean;
  note?: string;
  /** Bản dịch theo ngôn ngữ đích. target là bản dự phòng khi ngôn ngữ không có trong bảng này. */
  renders?: Partial<Record<"vi" | "ko" | "ja" | "en", string>>;
};

export type GlossaryPack = {
  terms: GlossaryTerm[];
  sources: string[]; // which files contributed
};

const cache = new Map<string, GlossaryPack>();

const SPACELESS = new Set(["ja", "zh", "ko", "th", "zh-CN", "zh-TW", "ja-JP", "ko-KR", "th-TH"]);

function normalizeLang(code: string): string {
  if (!code) return "";
  const lower = code.toLowerCase();
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("ko")) return "ko";
  if (lower.startsWith("zh")) return "zh";
  if (lower.startsWith("th")) return "th";
  if (lower.startsWith("en")) return "en";
  if (lower.startsWith("vi")) return "vi";
  return lower.slice(0, 2);
}

async function fetchJson(path: string): Promise<{ terms: GlossaryTerm[] | null; keep: boolean }> {
  try {
    const res = await fetch(path, { cache: "force-cache" });
    if (res.status === 404) return { terms: null, keep: true };
    if (!res.ok) return { terms: null, keep: false };
    const data = await res.json();
    if (Array.isArray(data)) return { terms: data as GlossaryTerm[], keep: true };
    if (data && Array.isArray(data.terms)) return { terms: data.terms as GlossaryTerm[], keep: true };
    return { terms: null, keep: true };
  } catch {
    return { terms: null, keep: false };
  }
}

/** Bản đưa vào phụ đề. Có bản đúng ngôn ngữ đích thì dùng, không thì dùng target. */
export function glossaryTarget(term: GlossaryTerm, targetLang: string): string {
  const lang = normalizeLang(targetLang);
  const picked =
    lang === "vi" || lang === "ko" || lang === "ja" || lang === "en" ? term.renders?.[lang]?.trim() : "";
  return picked || (term.target ?? term.source).trim();
}

/** Load one genre file only. Cached per (lang, genre, target). "auto" loads that genre's own file when it exists. */
export async function loadGenreGlossary(sourceLang: string, genre: string, targetLang = ""): Promise<GlossaryPack> {
  const lang = normalizeLang(sourceLang);
  const g = (genre || "auto").toLowerCase();
  const into = normalizeLang(targetLang);
  const key = `${lang}|${g}|${into}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const sources: string[] = [];
  const map = new Map<string, GlossaryTerm>();
  if (lang && g) {
    const path = `/glossaries/${lang}/${g}.json`;
    const loaded = await fetchJson(path);
    if (!loaded.keep) return { terms: [], sources: [] };
    const terms = loaded.terms;
    if (terms?.length) {
      sources.push(path);
      for (const t of terms) {
        if (!keepTerm(t.source, lang)) continue;
        const term: GlossaryTerm = {
          source: t.source.trim(),
          target: (t.target ?? t.source).trim(),
          whole_word: t.whole_word,
          case_sensitive: t.case_sensitive,
          note: t.note,
          renders: t.renders,
        };
        term.target = glossaryTarget(term, targetLang);
        const k = term.case_sensitive ? term.source : term.source.toLowerCase();
        map.set(k, term);
      }
    }
  }

  const pack: GlossaryPack = { terms: [...map.values()], sources };
  cache.set(key, pack);
  return pack;
}

export function clearGlossaryCache() {
  cache.clear();
}

const GODAN: Record<string, { i: string; a: string; past: string; te: string }> = {
  う: { i: "い", a: "わ", past: "った", te: "って" },
  く: { i: "き", a: "か", past: "いた", te: "いて" },
  ぐ: { i: "ぎ", a: "が", past: "いだ", te: "いで" },
  す: { i: "し", a: "さ", past: "した", te: "して" },
  つ: { i: "ち", a: "た", past: "った", te: "って" },
  ぬ: { i: "に", a: "な", past: "んだ", te: "んで" },
  ぶ: { i: "び", a: "ば", past: "んだ", te: "んで" },
  む: { i: "み", a: "ま", past: "んだ", te: "んで" },
  る: { i: "り", a: "ら", past: "った", te: "って" },
};

const NOUN_TAILS = [
  "じゃなかった",
  "じゃない",
  "しました",
  "しません",
  "している",
  "してる",
  "していた",
  "します",
  "でした",
  "できる",
  "かった",
  "しない",
  "した",
  "して",
  "する",
  "です",
  "だよ",
  "だね",
  "だ",
];

function hasKana(s: string): boolean {
  return /[\u3040-\u30ff]/.test(s);
}

function addPolite(stem: string, i: string, a: string, past: string, te: string, out: Set<string>) {
  out.add(stem + i + "ます");
  out.add(stem + i + "ました");
  out.add(stem + i + "ません");
  out.add(stem + a + "ない");
  out.add(stem + a + "なかった");
  out.add(stem + past);
  out.add(stem + te);
  out.add(stem + te + "いる");
  out.add(stem + te + "る");
}

/** Dictionary-form verbs/する → a few spoken surfaces. Not a full morphological analyzer. */
function jaVerbSurfaces(source: string): string[] {
  if (source.length < 2 || source.length > 16 || !hasKana(source)) return [];
  const out = new Set<string>();
  if (source.endsWith("する") && source.length > 2) {
    const stem = source.slice(0, -2);
    for (const tail of ["した", "して", "します", "しません", "している", "してる", "しない", "できる", "された"]) out.add(stem + tail);
    return [...out];
  }
  const last = source.slice(-1);
  const row = GODAN[last];
  if (!row) return [];
  const stem = source.slice(0, -1);
  addPolite(stem, row.i, row.a, row.past, row.te, out);
  if (last === "る") addPolite(stem, "", "", "た", "て", out);
  out.delete(source);
  return [...out];
}

function extendJaTail(text: string, end: number): number {
  const rest = text.slice(end, end + 8);
  for (const tail of NOUN_TAILS) {
    if (rest.startsWith(tail)) return end + tail.length;
  }
  return end;
}

function keepTerm(source: string, lang: string) {
  const text = source.trim();
  if (!text) return false;
  if (SPACELESS.has(normalizeLang(lang))) return text.length >= 1;
  return text.length >= 2;
}

function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find all non-overlapping matches, longest first.
 * Returns list of { start, end, term } sorted by position.
 */
export function findMatches(text: string, terms: GlossaryTerm[], langHint = ""): Array<{ start: number; end: number; term: GlossaryTerm }> {
  if (!text || !terms.length) return [];
  const lang = normalizeLang(langHint);
  const spaceless = SPACELESS.has(lang);
  const ja = lang === "ja";
  const items: Array<{ surface: string; term: GlossaryTerm; extend: boolean }> = [];
  for (const term of terms) {
    if (!keepTerm(term.source, lang)) continue;
    const surfaces = ja ? jaVerbSurfaces(term.source) : [];
    items.push({ surface: term.source, term, extend: ja && surfaces.length === 0 });
    for (const surface of surfaces) items.push({ surface, term, extend: false });
  }
  items.sort((a, b) => b.surface.length - a.surface.length);
  const occupied: Array<[number, number]> = [];
  const matches: Array<{ start: number; end: number; term: GlossaryTerm }> = [];

  for (const item of items) {
    const flags = item.term.case_sensitive ? "g" : "gi";
    let pattern: string;
    if (item.term.whole_word === true || (!spaceless && item.term.whole_word !== false)) {
      pattern = `(?<![\\p{L}\\p{N}])${esc(item.surface)}(?![\\p{L}\\p{N}])`;
    } else {
      pattern = esc(item.surface);
    }
    let re: RegExp;
    try {
      re = new RegExp(pattern, flags + "u");
    } catch {
      re = new RegExp(esc(item.surface), flags);
    }
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      let end = start + m[0].length;
      if (item.extend) end = extendJaTail(text, end);
      if (occupied.some(([a, b]) => start < b && end > a)) {
        if (m[0].length === 0) re.lastIndex++;
        continue;
      }
      occupied.push([start, end]);
      matches.push({ start, end, term: item.term });
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  matches.sort((a, b) => a.start - b.start);
  return matches;
}

/**
 * Protect matched terms by replacing with placeholders.
 * Returns protected lines + a map from placeholder → target.
 */
export function protectTerms(
  lines: string[],
  terms: GlossaryTerm[],
  langHint = "",
): { protected: string[]; restoreMap: Map<string, string>; hits: number } {
  const restoreMap = new Map<string, string>();
  let counter = 0;
  let hits = 0;
  const protectedLines = lines.map((line) => {
    const matches = findMatches(line, terms, langHint);
    if (!matches.length) return line;
    let out = "";
    let cursor = 0;
    for (const m of matches) {
      out += line.slice(cursor, m.start);
      const ph = `{{G${counter++}}}`;
      restoreMap.set(ph, m.term.target);
      out += ph;
      cursor = m.end;
      hits++;
    }
    out += line.slice(cursor);
    return out;
  });
  return { protected: protectedLines, restoreMap, hits };
}

/** Put hard targets back. Does not eat or insert spaces around the token. */
export function restoreTerms(lines: string[], restoreMap: Map<string, string>): string[] {
  if (!restoreMap.size) return lines;
  const entries = [...restoreMap.entries()]
    .map(([token, target]) => {
      const match = /^\{\{G(\d+)\}\}$/i.exec(token);
      return match ? { index: Number(match[1]), target } : null;
    })
    .filter((entry): entry is { index: number; target: string } => Boolean(entry));
  return lines.map((line) => {
    let out = line;
    for (const entry of entries) {
      out = out.replace(placeholderVariant(entry.index), () => entry.target);
    }
    return out;
  });
}

/** Indexes of the exact tokens protectTerms inserts, in order. */
export function placeholderIndexes(line: string): number[] {
  const found: number[] = [];
  for (const match of line.matchAll(/\{\{G(\d+)\}\}/g)) found.push(Number(match[1]));
  return found;
}

function placeholderVariant(index: number): RegExp {
  return new RegExp(
    `(?:\\{\\{\\s*|\\[\\[\\s*|\\{\\s*)[Gg]\\s*${index}(?!\\d)\\s*(?:\\}\\}|\\]\\]|\\})`,
    "g",
  );
}

function leftoverPlaceholderPattern(): RegExp {
  return /(?:\{\{\s*|\[\[\s*|\{\s*)[Gg]\s*\d+\s*(?:\}\}|\]\]|\})/g;
}

export function lineHasPlaceholder(line: string, index: number): boolean {
  return placeholderVariant(index).test(line);
}

export function hasLeftoverPlaceholder(line: string): boolean {
  return leftoverPlaceholderPattern().test(line);
}

/** Drop leftover {{G…}} / {G…} / [[G…]] so they never reach the subtitle. */
export function stripLeftoverPlaceholders(line: string): string {
  return line
    .replace(leftoverPlaceholderPattern(), "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[ \t]+|[ \t]+$/g, "");
}

/**
 * Restore lines that still contain every source placeholder.
 * A line needs one unprotected retry when a source token is missing
 * or a placeholder shape is still left after restore.
 */
export function settleGlossaryLines(
  protectedLines: string[],
  rawLines: string[],
  restoreMap: Map<string, string>,
): { lines: string[]; retryIndexes: number[] } {
  if (!restoreMap.size) return { lines: rawLines.slice(), retryIndexes: [] };
  const lines = restoreTerms(rawLines, restoreMap);
  const retryIndexes: number[] = [];
  for (let i = 0; i < protectedLines.length; i++) {
    const wanted = placeholderIndexes(protectedLines[i] || "");
    const raw = rawLines[i] || "";
    const missing = wanted.some((index) => !lineHasPlaceholder(raw, index));
    if (missing || hasLeftoverPlaceholder(lines[i] || "")) retryIndexes.push(i);
  }
  return { lines, retryIndexes };
}

/** User terms override file terms with the same source (case-insensitive). */
export function overlayUserTerms(pack: GlossaryTerm[], user: GlossaryTerm[]): GlossaryTerm[] {
  if (!user.length) return pack;
  const map = new Map<string, GlossaryTerm>();
  for (const t of pack) {
    if (!t.source?.trim()) continue;
    map.set(t.source.toLowerCase(), t);
  }
  for (const t of user) {
    if (!t.source?.trim()) continue;
    map.set(t.source.toLowerCase(), {
      source: t.source.trim(),
      target: (t.target ?? t.source).trim(),
      whole_word: t.whole_word,
      case_sensitive: t.case_sensitive,
      note: t.note,
    });
  }
  return [...map.values()];
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quote = false;
      else cur += ch;
    } else if (ch === '"') quote = true;
    else if (ch === "," || ch === "\t" || ch === ";") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** Parse CSV or "source => target" lines into terms. */
export function parseGlossaryCsv(text: string): GlossaryTerm[] {
  const terms: GlossaryTerm[] = [];
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  let headerSkipped = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const arrow = line.match(/^(.*?)\s*(?:=>|→|=)\s*(.*)$/);
    let source = "";
    let target = "";
    if (arrow && !line.includes(",") && !line.includes("\t") && !line.includes(";")) {
      source = arrow[1].trim();
      target = arrow[2].trim();
    } else {
      const cols = splitCsvLine(line);
      if (!headerSkipped && /^(source|gốc|tu|term)$/i.test(cols[0] || "")) {
        headerSkipped = true;
        continue;
      }
      headerSkipped = true;
      source = (cols[0] || "").replace(/^"|"$/g, "").trim();
      target = (cols[1] || "").replace(/^"|"$/g, "").trim();
    }
    if (!source) continue;
    terms.push({ source, target: target || source });
  }
  return terms;
}

export function termsToCsv(terms: GlossaryTerm[]): string {
  const rows = ["source,target"];
  for (const t of terms) {
    const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    rows.push(`${q(t.source)},${q(t.target)}`);
  }
  return rows.join("\n");
}

/** Merge structured terms into the free-text gloss string used by filmContext. */
export function mergeIntoGloss(existingGloss: string, terms: GlossaryTerm[]): string {
  const lines = existingGloss
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const seen = new Set(lines.map((l) => l.toLowerCase().split(/\s*(?:=>|→|=)\s*/)[0]));
  for (const t of terms) {
    const key = t.source.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const base = t.source === t.target ? t.source : `${t.source} => ${t.target}`;
    const note = t.note?.trim();
    lines.push(note ? `${base} (${note.slice(0, 80)})` : base);
  }
  return lines.join("\n");
}
