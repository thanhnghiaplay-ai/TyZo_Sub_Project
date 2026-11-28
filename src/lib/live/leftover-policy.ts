/**
 * RE7-004 · PHƯƠNG ÁN CHỜ CHỦ DUYỆT, CHƯA NỐI vào cầu nối (live-bridge vẫn dùng dropLeftoverScript).
 * Nguyên tắc: không xóa nội dung chỉ vì khác hệ chữ. Chỉ bỏ chuỗi Hán/kana/Hangul DÍNH LIỀN chữ của ngôn ngữ đích
 * (dấu hiệu model dịch dở: «luôn如一»). Chuỗi đứng riêng (tách bằng khoảng trắng, dấu câu, đầu/cuối câu) được giữ,
 * vì thường là tên riêng model không phiên âm («Tôi gặp 王小明 hôm qua»). Tên trong danh sách `keep` (thuật ngữ, tên
 * người dùng khai) luôn giữ. Dấu câu toàn khổ vẫn đổi sang dấu thường. Đích Trung/Nhật/Hàn giữ nguyên như cũ.
 */
import { keepsSourceScript } from "./leftover-script.ts";

const RUN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}々ー]+/gu;
const WORD = /[\p{L}\p{N}]/u;
const WIDE: Record<string, string> = { "，": ", ", "。": ". ", "！": "! ", "？": "? ", "：": ": ", "；": "; ", "、": ", ", "（": "(", "）": ")", "「": "\"", "」": "\"", "『": "\"", "』": "\"", "　": " " };
const WIDE_RE = new RegExp(`[${Object.keys(WIDE).join("")}]`, "g");

export type LeftoverOutcome = { text: string; dropped: string[]; kept: string[] };

export function preserveLeftoverScript(text: string, target: string, opts: { whole?: boolean; keep?: string[] } = {}): LeftoverOutcome {
  const whole = opts.whole ?? true;
  if (!text || keepsSourceScript(target)) return { text, dropped: [], kept: [] };
  const keep = new Set(opts.keep ?? []);
  const dropped: string[] = []; const kept: string[] = [];
  let out = text.replace(RUN, (run, at: number) => {
    const before = text[at - 1] ?? ""; const after = text[at + run.length] ?? "";
    const glued = (WORD.test(before) && !RUN.test(before)) || (WORD.test(after) && !RUN.test(after));
    RUN.lastIndex = 0;
    if (keep.has(run) || !glued) { kept.push(run); return run; }
    dropped.push(run); return "";
  });
  out = out.replace(WIDE_RE, (c) => WIDE[c]);
  if (whole) out = out.replace(/[ \t]{2,}/g, " ").replace(/ +([,.!?:;)])/g, "$1").replace(/\( +/g, "(").trim();
  return { text: out, dropped, kept };
}
