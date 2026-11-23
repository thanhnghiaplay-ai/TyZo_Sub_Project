/**
 * Sắp chữ phụ đề Dịch trực tiếp như phụ đề phim. Cùng cách với ứng dụng Android (android/…/CaptionLayout.kt):
 * Alibaba không chốt câu khi lời nói hay bài hát không có chỗ ngắt, nên một «dòng» của nó có thể dài cả đoạn.
 * Ở đây tự tách theo dấu câu (Alibaba đã chèn dấu vào bản dịch), rồi chia hai vùng:
 *  - done: những câu đã xong, đứng yên;
 *  - live: câu đang nói (phần chưa có dấu kết câu + chữ tạm), hiện mờ, chỉ vùng này thay đổi.
 * Câu dài quá maxChars được chia ở dấu phẩy hoặc khoảng trắng.
 */
export type CaptionPiece = { text: string; stash: string; final: boolean; source?: string };
export type CaptionShown = { done: string[]; live: string };

/** Câu xong đứng một mình quá chừng này mà không có gì mới thì ẩn, như phụ đề phim. */
export const CAPTION_HIDE_MS = 4000;

const ENDERS = new Set([".", "?", "!", "…", "。", "？", "！"]);
const SOFT = new Set([",", ";", ":", "，", "；", "：", "、"]);

/** Tách theo dấu kết câu. closed = chữ kết thúc bằng dấu kết câu. */
export function captionSentences(text: string): { list: string[]; closed: boolean } {
  const list: string[] = [];
  let buf = "";
  for (const ch of text) {
    buf += ch;
    if (ENDERS.has(ch)) {
      const s = buf.trim();
      // «...» hay «?!» liền nhau: gộp vào câu trước, không tạo câu rỗng.
      if (s && [...s].some((c) => !ENDERS.has(c))) list.push(s);
      else if (s && list.length) list[list.length - 1] += s;
      buf = "";
    }
  }
  const rest = buf.trim();
  if (rest) list.push(rest);
  return { list, closed: !rest && list.length > 0 };
}

/**
 * Chia câu dài thành các đoạn không quá max ký tự, độ dài gần đều nhau (không để đuôi trơ trọi một chữ).
 * Mỗi lần cắt nhắm vào điểm chia đều; dấu phẩy gần điểm đó thì cắt sau dấu phẩy, không thì ở khoảng trắng gần nhất;
 * chữ không có khoảng trắng (tiếng Trung) thì cắt cứng.
 */
export function captionChunks(sentence: string, max: number): string[] {
  const out: string[] = [];
  let rest = [...sentence.trim()];
  while (rest.length > max) {
    const parts = Math.ceil(rest.length / max);
    const target = Math.ceil(rest.length / parts);
    const reach = Math.max(4, Math.floor(max / 4));
    let cut = -1;
    // Dấu phẩy, chấm phẩy… trong khoảng gần điểm chia và không vượt max: cắt ngay sau dấu.
    for (let d = 0; d <= reach && cut < 0; d++) {
      for (const i of [target - 1 + d, target - 1 - d]) {
        if (i > 0 && i < max && SOFT.has(rest[i])) { cut = i; break; }
      }
    }
    // Khoảng trắng gần điểm chia nhất (trong max).
    if (cut < 0) {
      for (let d = 0; d < max && cut < 0; d++) {
        for (const i of [target + d, target - d]) {
          if (i > 0 && i <= max && rest[i] === " ") { cut = i - 1; break; }
        }
      }
    }
    if (cut < 0) cut = Math.min(max, target) - 1;
    out.push(rest.slice(0, cut + 1).join("").trim());
    rest = [...rest.slice(cut + 1).join("").trim()];
  }
  if (rest.length) out.push(rest.join(""));
  return out;
}

/**
 * @param pieces các mục gần nhất, cũ trước mới sau
 * @param keep số câu xong giữ lại phía trên câu đang nói
 * @param finalOnly chỉ hiện câu đã xong (đọc êm, chậm hơn chút)
 */
export function captionLayout(pieces: readonly CaptionPiece[], keep: number, maxChars: number, finalOnly: boolean): CaptionShown {
  const done: string[] = [];
  let live = "";
  pieces.forEach((piece, i) => {
    const { list, closed } = captionSentences(piece.text);
    const last = i === pieces.length - 1;
    const open = last && !piece.final && !closed && list.length > 0;
    const complete = open ? list.slice(0, -1) : list;
    for (const s of complete) done.push(...captionChunks(s, maxChars));
    if (last && !piece.final) live = `${open ? list[list.length - 1] : ""} ${piece.stash}`.trim();
  });
  if (finalOnly) return { done: done.slice(-Math.max(1, keep)), live: "" };
  const liveParts = captionChunks(live, maxChars);
  if (liveParts.length > 1) {
    done.push(...liveParts.slice(0, -1));
    live = liveParts[liveParts.length - 1];
  }
  return { done: keep > 0 ? done.slice(-keep) : [], live };
}

/** Số ký tự tối đa mỗi dòng theo cỡ chữ (cùng số với ứng dụng). */
export function captionMaxChars(size: "s" | "m" | "l" | "xl"): number {
  return size === "s" ? 52 : size === "l" ? 34 : size === "xl" ? 28 : 42;
}
