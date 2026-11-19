import type { AliSentence } from "@/lib/sub/ali-filetrans";
import type { Seg } from "@/lib/sub/types";

/** Chuyển câu Alibaba thành Seg để dịch. Mốc của AliSentence đã là GIÂY (ali-filetrans.ts đổi từ mili-giây), không chia nữa. */
export function segsFromAli(sentences: AliSentence[]): Seg[] {
  return sentences
    .map((s) => {
      const start = Math.max(0, s.start);
      const end = Math.max(start + 0.1, s.end);
      const text = (s.text || "").trim();
      if (!text) return null;
      return { start, end, original: text, raw: text, translation: null } as Seg;
    })
    .filter((s): s is Seg => s !== null)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}
