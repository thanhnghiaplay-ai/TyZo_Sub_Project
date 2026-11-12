import type { AliSentence } from "@/lib/sub/ali-filetrans";
import type { Seg } from "@/lib/sub/types";

/** Chuyển câu Alibaba (mốc mili-giây) thành Seg để dịch. */
export function segsFromAli(sentences: AliSentence[]): Seg[] {
  return sentences
    .map((s) => {
      const start = Math.max(0, s.start / 1000);
      const end = Math.max(start + 0.1, s.end / 1000);
      const text = (s.text || "").trim();
      if (!text) return null;
      return { start, end, original: text, raw: text, translation: null } as Seg;
    })
    .filter((s): s is Seg => s !== null)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}
