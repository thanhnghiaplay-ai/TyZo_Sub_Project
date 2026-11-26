/**
 * Lệnh trau chuốt theo thể loại do Admin sửa (v5.29.0). Thuần, chỉ import tương đối.
 * Admin chỉ sửa PHẦN GIỌNG VĂN của từng thể loại (thay `genrePrompt(genre).polish`). Phần khung trong polish.ts
 * (giữ nghĩa, ký hiệu thuật ngữ, không câu từ chối, trả JSON đúng số câu) KHÔNG sửa được, để lỡ tay cũng không hỏng trau chuốt.
 * Lưu ở room_settings khóa `polish_prompts`: { [mã thể loại]: lệnh }. Không có mục = dùng lệnh mặc định trong code.
 */
import { GENRES, currentGenre } from "../home-state.ts";
import { GENRE_PROMPT_MAX, genrePrompt } from "../sub/genre-prompts.ts";

export type PolishPrompts = Record<string, string>;

export const POLISH_PROMPTS_KEY = "polish_prompts";

/** Mã thể loại Admin sửa được: đúng các thể loại trong ô chọn của khách. */
export function polishPromptGenres(): string[] {
  return GENRES.map(([id]) => id);
}

/** Gọn chữ: bỏ ký tự điều khiển (trừ xuống dòng), cắt ở giới hạn độ dài thể loại. */
export function cleanPolishPrompt(value: unknown): string {
  return Array.from(String(value ?? ""), (ch) => {
    const code = ch.charCodeAt(0);
    return code === 10 || (code >= 32 && code !== 127) ? ch : " ";
  })
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, GENRE_PROMPT_MAX);
}

/** Đọc từ kho. Dữ liệu hỏng hay thể loại lạ thì bỏ qua, không làm hỏng trau chuốt. */
export function parsePolishPrompts(raw: string | null | undefined): PolishPrompts {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    const known = new Set(polishPromptGenres());
    const out: PolishPrompts = {};
    for (const [id, text] of Object.entries(data)) {
      const clean = cleanPolishPrompt(text);
      if (known.has(id) && clean) out[id] = clean;
    }
    return out;
  } catch {
    return {};
  }
}

/** Kiểm dữ liệu Admin gửi lên: chỉ thể loại có trong ô chọn, chữ trống = bỏ mục (về mặc định). */
export function checkPolishPrompts(input: unknown): PolishPrompts {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Dữ liệu lệnh trau chuốt không đúng.");
  const known = new Set(polishPromptGenres());
  const out: PolishPrompts = {};
  for (const [id, text] of Object.entries(input as Record<string, unknown>)) {
    if (!known.has(id)) throw new Error(`Thể loại «${id}» không có trong ô chọn.`);
    if (typeof text !== "string") throw new Error("Lệnh trau chuốt phải là chữ.");
    if (text.length > GENRE_PROMPT_MAX) throw new Error(`Lệnh quá dài (tối đa ${GENRE_PROMPT_MAX} ký tự).`);
    const clean = cleanPolishPrompt(text);
    if (clean) out[id] = clean;
  }
  return out;
}

/** Lệnh giọng văn đang dùng cho thể loại: bản Admin sửa nếu có, không thì mặc định trong code. */
export function effectiveGenrePolish(genre: string, overrides: PolishPrompts | null | undefined): string {
  const id = currentGenre(genre);
  const own = overrides?.[id];
  return own && own.trim() ? own : genrePrompt(id).polish;
}

/** Câu ghi nhật ký: thể loại nào đổi, về mặc định hay sửa. Không chép nguyên lệnh vào nhật ký. */
export function describePolishPrompts(before: PolishPrompts, after: PolishPrompts): string {
  const label = (id: string) => GENRES.find(([key]) => key === id)?.[1] ?? id;
  const parts: string[] = [];
  for (const id of polishPromptGenres()) {
    if ((before[id] ?? "") === (after[id] ?? "")) continue;
    parts.push(after[id] ? `sửa «${label(id)}» (${after[id].length} ký tự)` : `«${label(id)}» về mặc định`);
  }
  return parts.length ? `Lệnh trau chuốt: ${parts.join(", ")}.` : "Lệnh trau chuốt: không đổi.";
}
