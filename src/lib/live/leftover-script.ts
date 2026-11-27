/**
 * Dịch trực tiếp: model đôi khi để sót chữ gốc chưa dịch (vd «Bạn phải luôn如一.»). Khi ngôn ngữ đích không dùng
 * chữ Hán/kana/Hangul thì bỏ các chữ đó khỏi bản dịch và đổi dấu câu toàn khổ sang dấu thường. Đích Trung/Nhật/Hàn
 * (và Quảng Đông) giữ nguyên. Chạy trên cả mẩu tạm (delta): chỉ bỏ ký tự, không cắt khoảng trắng của mẩu.
 */
const CJK_TARGETS = new Set(["zh", "ja", "ko", "yue"]);
const LEFTOVER = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}々ー]+/gu;
const WIDE: Record<string, string> = { "，": ", ", "。": ". ", "！": "! ", "？": "? ", "：": ": ", "；": "; ", "、": ", ", "（": "(", "）": ")", "「": "\"", "」": "\"", "『": "\"", "』": "\"", "　": " " };
const WIDE_RE = new RegExp(`[${Object.keys(WIDE).join("")}]`, "g");

export function keepsSourceScript(target: string): boolean {
  return CJK_TARGETS.has(target.trim().toLowerCase().split("-")[0]);
}

/** Bỏ chữ sót. `whole` = câu đầy đủ (dọn khoảng trắng thừa); mẩu tạm thì chỉ bỏ ký tự. */
export function dropLeftoverScript(text: string, target: string, whole = true): string {
  if (!text || keepsSourceScript(target)) return text;
  const out = text.replace(LEFTOVER, "").replace(WIDE_RE, (c) => WIDE[c]);
  if (!whole) return out;
  return out.replace(/[ \t]{2,}/g, " ").replace(/ +([,.!?:;)])/g, "$1").replace(/\( +/g, "(").trim();
}
