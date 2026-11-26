import type { Seg } from "./types.ts";

export type TyzoProfile = "nhanh" | "ky";
export const MAX_MODAL_PARTS = 9;

export function modalRequest(token: string, audioBase64: string, language: string, profile: TyzoProfile) {
  return { token, audio_b64: audioBase64, ext: "wav", lang: language, profile };
}

export function modalSegments(response: unknown, offset: number): Seg[] {
  if (!response || typeof response !== "object" || !("segs" in response) || !Array.isArray(response.segs)) {
    throw new Error("TyZo Modal trả về dữ liệu phụ đề không hợp lệ.");
  }
  return response.segs.map((row: unknown) => {
    if (!row || typeof row !== "object" || !("start" in row) || !("end" in row) || !("text" in row)
      || typeof row.start !== "number" || !Number.isFinite(row.start) || row.start < 0
      || typeof row.end !== "number" || !Number.isFinite(row.end) || row.end < row.start
      || typeof row.text !== "string") throw new Error("TyZo Modal trả về câu thiếu chữ hoặc sai thời gian.");
    return { start: offset + row.start, end: offset + row.end, original: row.text.trim(), translation: null };
  });
}

const interjection = /^(?:啊|呀|哈|嗯|呃|哦|哇|唔|嘿|ああ|あ|ん|う|うわ|わあ|ひゃ|きゃ|ふふ|은|음|으|아|어|까|꺄|악|윽|누|와|우|ugh|oh|ah|aah|uh|um|hmm|ha|whoa|ow|ooh|yeah|え|おお|ねえ|ねぇ|はぁ|ふう|ふぅ)+$/iu;

export function mergeModalInterjections(parts: Seg[][]): Seg[] {
  const result: Seg[] = [];
  let lastCore = "";
  let repetitions = 0;
  let word = "";
  for (const seg of parts.flat().sort((a, b) => a.start - b.start)) {
    const core = seg.original.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    const previous = result.at(-1);
    if (previous && core === lastCore && core.length <= 8 && interjection.test(core.replace(/[ーっッ]/gu, "")) && seg.start - previous.end < 1.5) {
      repetitions++;
      previous.end = Math.max(previous.end, seg.end);
      previous.original = Array(Math.min(repetitions, 3)).fill(word).join("、") + (repetitions > 3 ? "…" : "");
    } else {
      result.push({ ...seg });
      lastCore = core;
      repetitions = 1;
      word = seg.original.trim().replace(/[、。,.!！?？…〜~]+$/u, "");
    }
  }
  return result;
}

export function modalCharacterBudgets(segs: Seg[]): number[] {
  return segs.map((seg, i) => {
    const next = segs[i + 1];
    const until = Math.min(seg.end + 2, next ? next.start - 0.08 : Infinity);
    return Math.max(8, Math.floor(15 * (Math.max(seg.end, until) - seg.start)));
  });
}

// Mỗi phần có đồng hồ riêng. Ghép theo mốc phim sau khi mọi phần đã xong.
export async function runModalParts<T>(
  parts: readonly T[],
  recognize: (part: T) => Promise<Seg[]>,
  fallback: (part: T, error: unknown) => Promise<Seg[]>,
  canFallback: (error: unknown) => boolean,
  signal: AbortSignal,
): Promise<Seg[]> {
  const results: Seg[][] = new Array(parts.length);
  let next = 0;
  let stopped = false;
  async function worker() {
    try {
      while (!stopped && next < parts.length) {
        signal.throwIfAborted();
        const index = next++;
        try {
          results[index] = await recognize(parts[index]);
        } catch (error) {
          signal.throwIfAborted();
          if (stopped || !canFallback(error)) throw error;
          results[index] = await fallback(parts[index], error);
        }
      }
    } catch (error) {
      stopped = true;
      throw error;
    }
  }
  const workers = await Promise.allSettled(Array.from({length: Math.min(MAX_MODAL_PARTS, parts.length)}, worker));
  signal.throwIfAborted();
  for (const worker of workers) if (worker.status === "rejected") throw worker.reason;
  return mergeModalInterjections(results);
}
