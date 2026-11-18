/**
 * Tên NGẮN của model cho các ô chọn (Admin → Gói dịch). Mỗi dòng chỉ hiện tên ngắn, ví dụ «Qwen 3.8 27B».
 * Mã model dài chỉ hiện một dòng nhỏ dưới ô đang chọn.
 * Thứ tự: model có trong danh mục chung thì lấy nhãn ở đó (không chép lần hai); chưa có (model lạ của key khách,
 * model Alibaba kéo về) thì rút gọn từ mã. Thuần, không gọi mạng.
 */
import { MODEL_CATALOG } from "./model-catalog.ts";

const BY_ID = new Map(MODEL_CATALOG.map((model) => [model.id, model.label]));
const ACRONYM = new Set(["gpt", "asr", "tts", "llm", "oss", "ai"]);

function prettyToken(token: string): string {
  if (/^\d+(\.\d+)?[bkm]$/i.test(token)) return token.toUpperCase();
  if (/^\d/.test(token)) return token;
  if (ACRONYM.has(token.toLowerCase())) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1);
}

/** Rút gọn từ mã: bỏ tên tổ chức trước dấu «/», tách chữ khỏi số, viết hoa đầu từ. «qwen3.8-27b» → «Qwen 3.8 27B». */
export function prettyModelId(id: string): string {
  const tail = id.split("/").pop() ?? id;
  const spaced = tail.replace(/([a-z])(\d)/gi, "$1 $2");
  const tokens = spaced.split(/[-_\s]+/).filter(Boolean);
  const out = tokens.map(prettyToken).join(" ");
  return out || id;
}

export function shortModelName(id: string): string {
  return BY_ID.get(id) ?? prettyModelId(id);
}

/**
 * Tên ngắn cho cả một danh sách. Hai model trùng tên ngắn thì thêm mã vào để khỏi lẫn
 * (ví dụ hai bản khác ngày của cùng một model).
 */
export function shortModelNames(ids: readonly string[]): Record<string, string> {
  const names = ids.map((id) => shortModelName(id));
  const count = new Map<string, number>();
  for (const name of names) count.set(name, (count.get(name) ?? 0) + 1);
  const out: Record<string, string> = {};
  ids.forEach((id, index) => {
    const name = names[index];
    out[id] = (count.get(name) ?? 0) > 1 ? `${name} (${id})` : name;
  });
  return out;
}
