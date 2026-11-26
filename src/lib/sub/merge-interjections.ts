/**
 * Gộp cùng một tiếng cảm thán ngắn lặp liền nhau (cách nhau dưới 1,5 giây) thành một phụ đề,
 * ví dụ «え、» ×5 trong 1,4 giây → «え、え、え…». Câu có nội dung, tiếng cảm thán khác nhau hoặc cách xa thì giữ nguyên.
 * Danh sách cảm thán giống eval/asr/luong-ky/pml.py (INTERJ) và eval/asr/phim/thu_phim.py, đã thử trên phim Nhật 10 phút.
 */
export type TimedLine = { text: string; start: number; end: number };

const INTERJ = /^(啊|呀|哈|嗯|呃|哦|哇|唔|嘿|ああ|あ|ん|う|うわ|わあ|ひゃ|きゃ|ふふ|은|음|으|아|어|까|꺄|악|윽|누|와|우|ugh|oh|ah|aah|uh|um|hmm|ha|whoa|ow|ooh|yeah)+$/i;
const EXTRA = /^(え|ええ|おお|ねえ|ねぇ|はぁ|ふう|ふぅ|うう|んん)+$/;
const GAP = 1.5;

const core = (text: string) => text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

function isInterjection(c: string): boolean {
  const base = c.replace(/[ー〜~っッ]/g, "");
  return base.length > 0 && c.length <= 8 && (INTERJ.test(base) || EXTRA.test(base));
}

export function mergeInterjections<T extends TimedLine>(lines: T[], _language = ""): T[] {
  const out: { line: T; core: string; n: number }[] = [];
  for (const line of lines) {
    const c = core(line.text);
    const prev = out[out.length - 1];
    if (prev && isInterjection(c) && prev.core === c && line.start - prev.line.end < GAP) {
      prev.line = { ...prev.line, end: Math.max(prev.line.end, line.end) };
      prev.n += 1;
      continue;
    }
    out.push({ line, core: c, n: 1 });
  }
  return out.map(({ line, n }) => {
    if (n === 1) return line;
    const word = line.text.trim().replace(/[、。,.!！?？…〜~]+$/u, "");
    const sep = /[\u3040-\u30ff\u4e00-\u9fff]/.test(word) ? "、" : ", ";
    return { ...line, text: Array(Math.min(n, 3)).fill(word).join(sep) + (n > 3 ? "…" : "") };
  });
}
