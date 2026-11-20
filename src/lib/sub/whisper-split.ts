import type { AsrWord } from "./word-time.ts";

export type SegmentPiece = { start: number; end: number; text: string };

/**
 * Whisper (Groq) cắt «segment» theo quãng lặng và cửa sổ 30 giây, không theo câu. Lời thoại liền nhau không nghỉ
 * (phim, video ngắn) thành vài segment dài, mỗi segment chứa nhiều câu, nên phụ đề chỉ còn vài dòng rất dài.
 * Hàm này tách segment dài thành từng câu theo dấu câu, căn mốc theo từng từ nếu có, không thì chia theo số chữ.
 * Segment ngắn, hoặc không có chỗ ngắt, giữ nguyên.
 */

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const IGNORED = /[\s，,。.！!？?；;…、:："“”"'‘’()（）「」『』\-—]/g;
const SENTENCE_MARK = /[。！？!?…]/;
const CLAUSE_MARK = /[，,、；;：:]/;
const TRAILING = /[。！？!?…，,、；;：:”"’'）)」』]/;

/**
 * Ngưỡng theo số chữ nhìn thấy: [chữ CJK, chữ khác]. Tiếng Trung/Nhật/Hàn một dòng phụ đề chỉ khoảng 14 đến 20 chữ
 * và mỗi câu thường 8 đến 12 chữ, nên ngưỡng thấp hơn nhiều (Whisper hay gộp 3 đến 5 câu thành một segment 30 đến 40 chữ).
 */
const LONG_AT = { cjk: 14, other: 100 };
const TARGET = { cjk: 18, other: 70 };
const MIN_SENTENCE = { cjk: 4, other: 12 };
const HARD_MAX = { cjk: 28, other: 140 };
const MIN_VISIBLE = 2;
const MIN_SECONDS = 0.2;

function visibleLength(text: string): number {
  return text.replace(IGNORED, "").length;
}

function isCjkText(text: string): boolean {
  const letters = text.replace(IGNORED, "");
  if (!letters) return false;
  let hits = 0;
  for (const ch of letters) if (CJK.test(ch)) hits++;
  return hits / [...letters].length >= 0.3;
}

type Atom = { text: string; sentenceEnd: boolean };

/** Cắt ở mọi dấu câu (giữ dấu ở cuối mảnh). «.» chỉ tính khi theo sau là khoảng trắng hoặc hết chuỗi, «,» «:» không tính giữa hai chữ số. */
function atomsOf(text: string): Atom[] {
  const chars = [...text];
  const out: Atom[] = [];
  let buf = "";
  let ended = false;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const prev = chars[i - 1] ?? "";
    const next = chars[i + 1] ?? "";
    buf += ch;
    const digitsAround = /\d/.test(prev) && /\d/.test(next);
    const sentence = SENTENCE_MARK.test(ch) || (ch === "." && (next === "" || /\s/.test(next)));
    const clause = CLAUSE_MARK.test(ch) && !digitsAround;
    if (!sentence && !clause) continue;
    ended = sentence;
    while (i + 1 < chars.length && TRAILING.test(chars[i + 1])) {
      i++;
      buf += chars[i];
      if (SENTENCE_MARK.test(chars[i])) ended = true;
    }
    out.push({ text: buf, sentenceEnd: ended });
    buf = "";
    ended = false;
  }
  if (buf.trim()) out.push({ text: buf, sentenceEnd: false });
  return out;
}

function tidy(text: string): string {
  return text.trim().replace(/[，,、；;\s]+$/g, "").trim();
}

/** Chia đều một đoạn quá dài mà không có dấu câu: CJK theo số chữ, chữ khác theo từ. */
function splitEvenly(text: string, parts: number, cjk: boolean): string[] {
  if (parts <= 1) return [text];
  if (cjk) {
    const chars = [...text.trim()];
    const size = Math.ceil(chars.length / parts);
    const out: string[] = [];
    for (let i = 0; i < chars.length; i += size) out.push(chars.slice(i, i + size).join(""));
    return out;
  }
  const words = text.trim().split(/\s+/);
  const size = Math.ceil(words.length / parts);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size).join(" "));
  return out;
}

function groupAtoms(atoms: Atom[], cjk: boolean): string[] {
  const target = cjk ? TARGET.cjk : TARGET.other;
  const minSentence = cjk ? MIN_SENTENCE.cjk : MIN_SENTENCE.other;
  const hardMax = cjk ? HARD_MAX.cjk : HARD_MAX.other;
  const groups: string[] = [];
  let buf = "";
  const flush = () => {
    if (buf.trim()) groups.push(buf);
    buf = "";
  };
  for (const atom of atoms) {
    if (buf && visibleLength(buf) >= minSentence && visibleLength(buf) + visibleLength(atom.text) > target) flush();
    buf += atom.text;
    if (atom.sentenceEnd && visibleLength(buf) >= minSentence) flush();
  }
  flush();
  const out: string[] = [];
  for (const group of groups) {
    const size = visibleLength(group);
    if (size > hardMax) out.push(...splitEvenly(group, Math.ceil(size / target), cjk));
    else out.push(group);
  }
  return out;
}

function mergeTiny(texts: string[]): string[] {
  const out: string[] = [];
  for (const text of texts) {
    if (visibleLength(text) < MIN_VISIBLE && out.length) out[out.length - 1] = `${out[out.length - 1]} ${text}`.trim();
    else out.push(text);
  }
  if (out.length > 1 && visibleLength(out[0]) < MIN_VISIBLE) {
    const [first, second, ...rest] = out;
    return [`${first} ${second}`.trim(), ...rest];
  }
  return out;
}

type TimedWord = { start: number; end: number; size: number };

function wordsInside(words: ReadonlyArray<AsrWord | null> | undefined, start: number, end: number): TimedWord[] {
  if (!words?.length) return [];
  const out: TimedWord[] = [];
  for (const w of words) {
    if (!w || !Number.isFinite(w.start) || !Number.isFinite(w.end)) continue;
    const ws = w.start as number;
    const we = w.end as number;
    const mid = (ws + we) / 2;
    if (mid < start - 0.05 || mid > end + 0.05) continue;
    out.push({ start: ws, end: we, size: Math.max(visibleLength(typeof w.word === "string" ? w.word : ""), 0) });
  }
  return out;
}

/** Mốc từng mảnh theo từ: chữ thứ a đến b của câu rơi vào từ nào thì lấy mốc từ đó. null nếu mốc từ không khớp với chữ. */
function timeByWords(sizes: number[], words: TimedWord[]): Array<{ start: number; end: number }> | null {
  const textTotal = sizes.reduce((a, b) => a + b, 0);
  const wordTotal = words.reduce((a, w) => a + w.size, 0);
  if (!words.length || textTotal <= 0 || wordTotal <= 0) return null;
  if (Math.abs(wordTotal - textTotal) / textTotal > 0.25) return null;
  const scale = wordTotal / textTotal;
  const cum: number[] = [];
  let run = 0;
  for (const w of words) {
    run += w.size;
    cum.push(run);
  }
  const wordAt = (offset: number) => {
    const index = cum.findIndex((c) => c > offset);
    return index < 0 ? words.length - 1 : index;
  };
  const out: Array<{ start: number; end: number }> = [];
  let from = 0;
  for (const size of sizes) {
    const a = from * scale;
    const b = (from + size) * scale;
    const first = wordAt(a + 0.01);
    const last = Math.max(first, wordAt(Math.max(a, b - 0.01)));
    out.push({ start: words[first].start, end: words[last].end });
    from += size;
  }
  return out;
}

function timeByShare(sizes: number[], start: number, end: number): Array<{ start: number; end: number }> {
  const total = sizes.reduce((a, b) => a + Math.max(1, b), 0);
  const out: Array<{ start: number; end: number }> = [];
  let cursor = start;
  for (const size of sizes) {
    const share = (Math.max(1, size) / total) * (end - start);
    out.push({ start: cursor, end: cursor + share });
    cursor += share;
  }
  return out;
}

/**
 * `start` và `end` là mốc của cả segment (cùng hệ với `words`). Trả về một hoặc nhiều mảnh theo thứ tự thời gian,
 * không chồng nhau, nằm trong [start, end]. Segment ngắn, hoặc không tách được, trả về đúng một mảnh như cũ.
 */
export function splitLongSegment(
  text: string,
  start: number,
  end: number,
  words?: ReadonlyArray<AsrWord | null>,
): SegmentPiece[] {
  const whole: SegmentPiece = { start, end, text };
  if (typeof text !== "string" || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [whole];
  const cjk = isCjkText(text);
  if (visibleLength(text) <= (cjk ? LONG_AT.cjk : LONG_AT.other)) return [whole];

  const texts = mergeTiny(groupAtoms(atomsOf(text), cjk).map(tidy).filter(Boolean));
  if (texts.length < 2) return [whole];

  const sizes = texts.map(visibleLength);
  const spans = timeByWords(sizes, wordsInside(words, start, end)) ?? timeByShare(sizes, start, end);

  const pieces: SegmentPiece[] = [];
  let floor = start;
  for (let i = 0; i < texts.length; i++) {
    const pieceStart = Math.min(Math.max(spans[i].start, floor, start), end);
    const pieceEnd = Math.min(Math.max(spans[i].end, pieceStart + MIN_SECONDS), Math.max(end, pieceStart + MIN_SECONDS));
    pieces.push({ start: pieceStart, end: pieceEnd, text: texts[i] });
    floor = pieceEnd;
  }
  return pieces;
}
