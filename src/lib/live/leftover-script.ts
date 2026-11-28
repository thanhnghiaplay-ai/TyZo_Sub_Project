/**
 * Dịch trực tiếp · RE7-004 (Chủ duyệt hướng A + D + bảng thuật ngữ, 28/11/2026).
 * KHÔNG xóa ký tự nào chỉ vì khác hệ chữ (Hán/kana/Hangul đứng riêng hay dính liền chữ đích đều giữ): đó có thể là
 * tên nhân vật, địa danh, thuật ngữ. Bản dịch chỉ được chỉnh hình thức, không mất nội dung, trên cả delta và câu chốt:
 *   - đích không dùng chữ Hán/kana/Hangul: dấu câu toàn khổ đổi sang dấu thường («，» → «, »);
 *   - câu đầy đủ (`whole`): gộp khoảng trắng thừa, bỏ khoảng trắng trước dấu câu, cắt đầu/cuối.
 * Đích Trung/Nhật/Hàn (và Quảng Đông) giữ nguyên. Tên riêng được xử lý ở nguồn: bảng thuật ngữ (translation.corpus)
 * và hướng dẫn tên riêng (name-policy.ts) — không thêm lượt gọi AI trên đường streaming.
 */
const CJK_TARGETS = new Set(["zh", "ja", "ko", "yue"]);
const WIDE: Record<string, string> = { "，": ", ", "。": ". ", "！": "! ", "？": "? ", "：": ": ", "；": "; ", "、": ", ", "（": "(", "）": ")", "「": "\"", "」": "\"", "『": "\"", "』": "\"", "　": " " };
const WIDE_RE = new RegExp(`[${Object.keys(WIDE).join("")}]`, "g");

export function keepsSourceScript(target: string): boolean {
  return CJK_TARGETS.has(target.trim().toLowerCase().split("-")[0]);
}

/** Chỉnh hình thức bản dịch, không bỏ chữ. `whole` = câu đầy đủ; mẩu tạm (delta) thì giữ nguyên khoảng trắng. */
export function tidyLiveText(text: string, target: string, whole = true): string {
  if (!text || keepsSourceScript(target)) return text;
  const out = text.replace(WIDE_RE, (c) => WIDE[c]);
  if (!whole) return out;
  return out.replace(/[ \t]{2,}/g, " ").replace(/ +([,.!?:;)])/g, "$1").replace(/\( +/g, "(").trim();
}
