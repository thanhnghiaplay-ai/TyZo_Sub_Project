// Trau chuốt bản dịch (bước A2 trong HANDOFF_NANG_CAP.md).
// File thuần: chỉ import tương đối, không gọi mạng. Lệnh gọi model được TIÊM vào (`PolishCall`)
// nên test được bằng phản hồi giả. Lớp gọi mạng thật (`makePolishCall`) nằm ở `groq.ts`.
//
// Nguyên tắc:
// - Lệnh gốc đòi JSON {"t":[...]} giữ cố định; prompt thể loại chỉ NỐI THÊM, có giới hạn độ dài.
// - Câu người dùng đã sửa tay (`edited`) không bao giờ gửi đi, không bị đổi.
// - Model từ chối hoặc trả rác: GIỮ bản cũ và đánh dấu rõ câu nào (refused / failed), không im lặng.
// - Một lô lỗi không làm mất cả phim: lô lỗi đánh dấu failed, các lô khác chạy tiếp.

import { GENRE_PROMPT_MAX, genrePrompt } from "./genre-prompts.ts";
import { ADDRESS_RULE, stripFence } from "./text.ts";

export type PolishMsg = { role: string; content: string };

/** Gửi `messages` cho model, trả nội dung thô (chuỗi). Ném `PolishRefusal` nếu nhà cung cấp báo từ chối. */
export type PolishCall = (messages: PolishMsg[], count: number) => Promise<string>;

export type PolishStatus =
  /** Model đổi câu, bản mới hợp lệ. */
  | "changed"
  /** Model giữ nguyên (hoặc bản mới chỉ khác khoảng trắng). */
  | "same"
  /** Người dùng đã sửa tay, không gửi, không đổi. */
  | "locked"
  /** Chưa có bản dịch (trống hoặc dịch lỗi), không có gì để trau chuốt. */
  | "skipped"
  /** Model từ chối câu này. Giữ bản cũ. */
  | "refused"
  /** Lỗi hoặc kết quả không hợp lệ (mất ký hiệu thuật ngữ, quá dài, trống, lô lỗi). Giữ bản cũ. */
  | "failed";

export type PolishResult = { text: string; status: PolishStatus; note?: string };

export type PolishItem = {
  original: string;
  translation: string | null | undefined;
  /** Cờ `seg.edited`. */
  edited?: boolean;
  /** Cờ `seg.translationFailed`. */
  failed?: boolean;
};

export type PolishOpts = {
  /** Khóa thể loại (xem `GENRES` ở home-state.ts). */
  genre: string;
  /** Khối `filmContext(...)` + `addressLock(...)`, như bước dịch. */
  context: string;
  /** Ngôn ngữ đích, ví dụ "Vietnamese". */
  language: string;
};

export class PolishRefusal extends Error {
  constructor(message = "Model từ chối trau chuốt.") {
    super(message);
    this.name = "PolishRefusal";
  }
}

export const POLISH_BATCH = 24;
const CTX_BEFORE = 8;
const CTX_AFTER = 4;
const TOKEN_RE = /\{\{G\d+\}\}/g;

/** Câu từ chối thường gặp của model (Anh và Việt). Chỉ tính khi bản cũ KHÔNG có sẵn mẫu này. */
export const REFUSAL_RE =
  /\b(?:i(?:'m| am)? (?:sorry|unable)|i can(?:'|no)t|i cannot|i won(?:'|)t|as an ai|can(?:'|no)t (?:help|assist|comply|continue)|cannot (?:help|assist|comply|fulfill|continue)|not able to (?:help|assist|comply))\b|tôi xin lỗi|xin lỗi,? (?:tôi|mình)|tôi không thể (?:giúp|hỗ trợ|thực hiện|tiếp tục|trau chuốt|dịch)/i;

type Line = { i: number; o: string; t: string };
type CtxLine = { o: string; t: string };

export function polishSystem(count: number, opts: PolishOpts): string {
  const genre = genrePrompt(opts.genre).polish.slice(0, GENRE_PROMPT_MAX);
  return [
    `You are a senior subtitle editor polishing an existing ${opts.language} translation of a film or TV show. Each item in "lines" has the source line "o" and its current translation "t". Return the improved translation for every item.`,
    'Improve only what needs improving: stiff word-for-word phrasing, wrong or inconsistent pronouns and address forms, flat wording, wrong register. If "t" is already good, return it unchanged, character for character.',
    "Never change the meaning. Do not add, omit, explain, merge, split or reorder anything. Keep each subtitle concise (about 40 characters per row, at most 2 rows).",
    "Keep every speaker's tone, slang, insults and swearing at the same intensity; never censor, soften, tidy up or moralize.",
    ADDRESS_RULE,
    "Glossary tokens look like {{G0}} or {{G12}}. If \"t\" contains one, copy that exact token unchanged into your result. Keep names, titles and glossary terms exactly as the film context and the current translation use them.",
    'Use "context_before" and "context_after" (neighbouring lines, with translations when known) only to understand who speaks to whom and the ongoing topic. Never return or translate the context itself.',
    genre,
    opts.context,
    "If you cannot polish a line, return its current translation unchanged. Never put an apology, refusal or explanation inside a line.",
    `Return only JSON {"t":["..."]} with exactly ${count} strings in the same order as "lines".`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function polishMessages(lines: CtxLine[], opts: PolishOpts, before: CtxLine[] = [], after: CtxLine[] = []): PolishMsg[] {
  return [
    { role: "system", content: polishSystem(lines.length, opts) },
    { role: "user", content: JSON.stringify({ context_before: before, lines, context_after: after }) },
  ];
}

/** Đọc {"t":[...]}. Sai số câu là lỗi cả lần gọi (để chia lô gọi lại), ô không phải chuỗi thành "". */
export function parsePolish(content: string, count: number): string[] {
  let parsed: { t?: unknown };
  try {
    parsed = JSON.parse(stripFence(content)) as { t?: unknown };
  } catch {
    throw new Error("Model trau chuốt trả về JSON không hợp lệ.");
  }
  const arr = parsed && Array.isArray(parsed.t) ? parsed.t : null;
  if (!arr) throw new Error("Kết quả trau chuốt không đúng định dạng.");
  if (arr.length !== count) throw new Error("Model trau chuốt trả thiếu câu.");
  return arr.map((item) => (typeof item === "string" ? item : ""));
}

function tokensOf(text: string): string {
  return (text.match(TOKEN_RE) || []).sort().join("|");
}

/** Kiểm một câu model trả về so với bản cũ. Không hợp lệ thì giữ bản cũ và nói lý do. */
export function judgePolished(old: string, next: string): PolishResult {
  const cleaned = typeof next === "string" ? next.trim() : "";
  if (!cleaned) return { text: old, status: "failed", note: "Model trả câu trống, giữ bản cũ." };
  if (REFUSAL_RE.test(cleaned) && !REFUSAL_RE.test(old)) {
    return { text: old, status: "refused", note: "Model từ chối câu này, giữ bản cũ." };
  }
  if (tokensOf(cleaned) !== tokensOf(old)) {
    return { text: old, status: "failed", note: "Bản mới làm mất hoặc đổi ký hiệu thuật ngữ, giữ bản cũ." };
  }
  if (cleaned.length > old.trim().length * 2.5 + 20) {
    return { text: old, status: "failed", note: "Bản mới dài bất thường, giữ bản cũ." };
  }
  if (cleaned === old.trim()) return { text: old, status: "same" };
  return { text: cleaned, status: "changed" };
}

const SPLITTABLE = /hết token|nội dung trống|JSON không hợp lệ|không đúng định dạng|thiếu câu/;
const FATAL = /\b(?:401|403|429)\b|không hợp lệ|giới hạn|chưa được cấp|hạn mức/;

function isAbort(error: unknown): boolean {
  return (error as { name?: string })?.name === "AbortError";
}

async function polishChunk(
  call: PolishCall,
  chunk: Line[],
  before: CtxLine[],
  after: CtxLine[],
  opts: PolishOpts,
  out: Array<PolishResult | undefined>,
): Promise<void> {
  try {
    const content = await call(polishMessages(chunk.map((l) => ({ o: l.o, t: l.t })), opts, before, after), chunk.length);
    let arr: string[];
    try {
      arr = parsePolish(content, chunk.length);
    } catch (error) {
      if (typeof content === "string" && REFUSAL_RE.test(content) && !/^\s*[{[`]/.test(content)) throw new PolishRefusal();
      throw error;
    }
    chunk.forEach((l, k) => {
      out[l.i] = judgePolished(l.t, arr[k]);
    });
  } catch (error) {
    if (isAbort(error)) throw error;
    const refused = error instanceof PolishRefusal;
    const message = (error as Error)?.message || "";
    if (!refused && !SPLITTABLE.test(message)) throw error;
    if (chunk.length <= 1) {
      const l = chunk[0];
      out[l.i] = refused
        ? { text: l.t, status: "refused", note: "Model từ chối câu này, giữ bản cũ." }
        : { text: l.t, status: "failed", note: "Model không trả được câu này, giữ bản cũ." };
      return;
    }
    // Chia đôi để cô lập câu bị từ chối hoặc câu làm hỏng lô.
    const mid = Math.ceil(chunk.length / 2);
    const left = chunk.slice(0, mid);
    const right = chunk.slice(mid);
    await polishChunk(call, left, before, [...right.map((l) => ({ o: l.o, t: l.t })), ...after].slice(0, CTX_AFTER), opts, out);
    const doneLeft = left.map((l) => ({ o: l.o, t: out[l.i]?.text ?? l.t }));
    await polishChunk(call, right, [...before, ...doneLeft].slice(-CTX_BEFORE), after, opts, out);
  }
}

/** Chỉ số các câu sẽ được gửi: không `edited`, không dịch lỗi, có bản dịch. Dùng chung cho polishAll và ước giá. */
export function sendableIndexes(items: PolishItem[]): number[] {
  const out: number[] = [];
  items.forEach((item, i) => {
    if (item.edited || item.failed || !String(item.translation ?? "").trim()) return;
    out.push(i);
  });
  return out;
}

/** Ngữ cảnh trước (tối đa 8 câu) và sau (tối đa 4 câu) cho một lô, lấy bản dịch hiện tại trong `current`. */
export function batchContext(items: PolishItem[], current: string[], idx: number[]): { before: CtxLine[]; after: CtxLine[] } {
  const first = idx[0];
  const last = idx[idx.length - 1];
  const before: CtxLine[] = [];
  for (let i = Math.max(0, first - CTX_BEFORE); i < first; i++) before.push({ o: items[i].original, t: current[i] });
  const after: CtxLine[] = [];
  for (let i = last + 1; i < Math.min(items.length, last + 1 + CTX_AFTER); i++) after.push({ o: items[i].original, t: current[i] });
  return { before, after };
}

export type PolishRun = {
  /** Cùng độ dài và thứ tự với `items`. Luôn có `text`: bản mới nếu `changed`, còn lại là bản cũ. */
  results: PolishResult[];
  /** Có chữ nếu chạy dừng giữa chừng vì lỗi nặng (hết hạn mức, sai key, mạng hỏng liên tục). Các câu chưa chạy là `failed`. */
  stopped: string | null;
};

/**
 * Trau chuốt cả phim theo lô. Không đụng câu `edited`, không gửi câu chưa có bản dịch.
 * Hủy (AbortSignal) thì ném AbortError; mọi lỗi khác được gom vào kết quả từng câu.
 */
export async function polishAll(
  call: PolishCall,
  items: PolishItem[],
  opts: PolishOpts,
  extra: { signal?: AbortSignal; batchSize?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<PolishRun> {
  const size = Math.max(1, Math.floor(extra.batchSize ?? POLISH_BATCH));
  const out: Array<PolishResult | undefined> = new Array(items.length).fill(undefined);
  const current = items.map((item) => (item.translation ?? "") as string);
  const sendable = sendableIndexes(items);
  items.forEach((item, i) => {
    if (item.edited) out[i] = { text: current[i], status: "locked" };
    else if (item.failed || !current[i].trim()) out[i] = { text: current[i], status: "skipped" };
  });
  const total = sendable.length;
  let done = 0;
  let stopped: string | null = null;
  let strikes = 0;
  extra.onProgress?.(0, total);

  for (let from = 0; from < sendable.length && !stopped; from += size) {
    if (extra.signal?.aborted) {
      const e = new Error("Đã hủy.");
      e.name = "AbortError";
      throw e;
    }
    const idx = sendable.slice(from, from + size);
    const chunk: Line[] = idx.map((i) => ({ i, o: items[i].original, t: current[i] }));
    const { before, after } = batchContext(items, current, idx);
    try {
      await polishChunk(call, chunk, before, after, opts, out);
      strikes = 0;
    } catch (error) {
      if (isAbort(error)) throw error;
      const message = (error as Error)?.message || "Lỗi không rõ.";
      strikes += 1;
      for (const l of chunk) if (!out[l.i]) out[l.i] = { text: l.t, status: "failed", note: `Lô bị lỗi: ${message}` };
      if (FATAL.test(message) || strikes >= 3) stopped = message;
    }
    for (const l of chunk) if (out[l.i]) current[l.i] = out[l.i]!.text;
    done += idx.length;
    extra.onProgress?.(done, total);
  }

  if (stopped) {
    for (const i of sendable) {
      if (!out[i]) out[i] = { text: current[i], status: "failed", note: `Dừng giữa chừng: ${stopped}` };
    }
  }
  return { results: out.map((r, i) => r ?? { text: current[i], status: "failed" as const }), stopped };
}

export type PolishSummary = Record<PolishStatus, number>;

export function polishSummary(results: PolishResult[]): PolishSummary {
  const sum: PolishSummary = { changed: 0, same: 0, locked: 0, skipped: 0, refused: 0, failed: 0 };
  for (const r of results) sum[r.status] += 1;
  return sum;
}
