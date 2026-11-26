// Model trau chuốt do Admin đặt (bước A5.1 trong HANDOFF_NANG_CAP.md).
// File thuần, chỉ import tương đối. KHÔNG gọi mạng, KHÔNG trừ gì.
//
// Admin đặt HAI danh sách model dịch (chat) của Groq:
//   - «Kiểm duyệt»: dành cho thể loại thường.
//   - «Không kiểm duyệt»: dành cho thể loại nhãn 18+ (adult; mã cũ softcore, sex quy về adult).
// Chỉ model chat. Model nhận dạng, giọng đọc, model kiểm duyệt (guard) KHÔNG đưa vào đây.
// Người dùng chỉ thấy danh sách ứng với thể loại đang chọn, kèm giá ước bằng Token dịch.

import { needsAgeConfirm } from "./home-state.ts";
import { chatModel } from "./sub/models.ts";
import { catalogFor, modelKindOf } from "./sub/model-catalog.ts";
import { quotePolish, type PolishPlan, type PolishQuote } from "./polish-estimate.ts";
import type { PriceBook } from "./billing/run-bill.ts";

type PolishPool = "censored" | "uncensored";

export const POLISH_POOLS: readonly PolishPool[] = ["censored", "uncensored"];

export const POLISH_POOL_LABEL: Record<PolishPool, string> = {
  censored: "Có kiểm duyệt",
  uncensored: "Không kiểm duyệt",
};

export const POLISH_POOL_HINT: Record<PolishPool, string> = {
  censored: "Dành cho thể loại thường",
  uncensored: "Dành cho thể loại gắn nhãn 18+",
};

export type PolishModels = Record<PolishPool, string[]>;

const ID_RE = /^[a-z0-9./_-]{2,80}$/i;
/** Mỗi danh sách tối đa bấy nhiêu model, để hộp chọn của khách không dài. */
export const POLISH_POOL_MAX = 12;

function idList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!ID_RE.test(id)) continue;
    seen.add(id);
    if (seen.size >= POLISH_POOL_MAX) break;
  }
  return [...seen];
}

/** null = Chủ chưa lưu (hoặc dữ liệu hỏng). Khi đó khách chưa trau chuốt được. */
export function parsePolishModels(raw: string | null | undefined): PolishModels | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data !== "object") return null;
    return { censored: idList(data.censored), uncensored: idList(data.uncensored) };
  } catch {
    return null;
  }
}

export function checkPolishModels(input: unknown): PolishModels {
  const parsed = parsePolishModels(JSON.stringify(input ?? {}));
  if (!parsed) throw new Error("Danh sách model trau chuốt không đúng.");
  for (const pool of POLISH_POOLS) {
    for (const id of parsed[pool]) {
      const kind = modelKindOf("groq", id);
      if (kind !== "chat") throw new Error(`«${id}» không phải model dịch, không đưa vào trau chuốt được.`);
    }
  }
  return parsed;
}

/** Thể loại 18+ dùng danh sách không kiểm duyệt, thể loại còn lại dùng danh sách có kiểm duyệt. */
export function poolForGenre(genre: string): PolishPool {
  return needsAgeConfirm(genre) ? "uncensored" : "censored";
}

/** Danh sách model khách được chọn cho thể loại này. null = Chủ chưa lưu gì. */
export function polishIdsFor(models: PolishModels | null, genre: string): string[] | null {
  if (!models) return null;
  return models[poolForGenre(genre)];
}

type PolishRow = { id: string; name: string; onKey: boolean | null };

/**
 * Hàng model trong bảng Admin: chỉ model chat của Groq trong danh mục cộng model lạ trên key phòng (kind chat).
 * Không có model nhận dạng, giọng đọc, kiểm duyệt.
 */
export function polishRows(keyModels: string[] | null): PolishRow[] {
  const onKey = (id: string) => (keyModels ? keyModels.includes(id) : null);
  const rows: PolishRow[] = catalogFor("groq", "chat").map((model) => ({ id: model.id, name: model.label, onKey: onKey(model.id) }));
  const seen = new Set(rows.map((row) => row.id));
  const extra = (keyModels ?? [])
    .filter((id) => !seen.has(id) && ID_RE.test(id) && modelKindOf("groq", id) === "chat")
    .sort((a, b) => a.localeCompare(b));
  for (const id of extra) {
    seen.add(id);
    rows.push({ id, name: id, onKey: true });
  }
  return rows;
}

type PolishChoice = {
  id: string;
  name: string;
  quote: PolishQuote;
};

/** Giá từng model trong danh sách, để khách so rồi chọn. Model chưa có giá vẫn hiện nhưng `quote.ready` false. */
export function polishChoices(input: {
  ids: string[];
  plan: PolishPlan;
  chatBook: PriceBook | undefined;
  groqBook: PriceBook | undefined;
  /** Model khách có thể gọi (key của khách hoặc key phòng). null = chưa biết, không lọc. */
  available?: Set<string> | null;
  /** Giá theo nhà của từng model (mọi nhà). Thiếu thì dùng `chatBook`. */
  chatBookFor?: (id: string) => PriceBook | undefined;
}): PolishChoice[] {
  const { ids, plan, groqBook, available } = input;
  return ids
    .filter((id) => !available || available.has(id))
    .map((id) => ({
      id,
      name: chatModel(id)?.name ?? id,
      quote: quotePolish({ plan, model: id, chatBook: input.chatBookFor?.(id) ?? input.chatBook, groqBook }),
    }));
}

/** Giữ lựa chọn cũ nếu còn trong danh sách, không thì lấy model đầu tiên đã có giá, không thì model đầu. */
export function pickPolishChoice(choices: PolishChoice[], wanted: string): PolishChoice | null {
  if (!choices.length) return null;
  return choices.find((c) => c.id === wanted) ?? choices.find((c) => c.quote.ready) ?? choices[0];
}

/** Chữ cho khách khi chưa trau chuốt được vì Admin chưa đặt model. */
export function polishNoModelText(models: PolishModels | null, genre: string): string {
  const pool = poolForGenre(genre);
  if (!models) return "Chưa mở tính năng trau chuốt. Admin chưa chọn model.";
  if (models[pool].length === 0) {
    return pool === "uncensored"
      ? "Thể loại 18+ chưa có model trau chuốt không kiểm duyệt. Admin chưa chọn model."
      : "Chưa có model trau chuốt cho thể loại này. Admin chưa chọn model.";
  }
  return "";
}
