import { liveLang } from "./langs.ts";
import { LIVE_MODEL_35, LIVE_MODEL_38 } from "./live-price.ts";

export const LIVE_MODELS = [LIVE_MODEL_38, LIVE_MODEL_35];
/** Vé chỉ sống rất ngắn: đủ để trình duyệt mở kết nối, không đủ để người khác dùng lại. */
export const LIVE_TICKET_TTL_MS = 60_000;

export type LiveOpenInput = { model: string; target: string; source: string; audio: boolean };

/** Kiểm đầu vào xin vé. Ném lỗi tiếng Việt khi sai. */
export function parseLiveOpen(input: Partial<LiveOpenInput> | null | undefined): LiveOpenInput {
  const model = String(input?.model ?? "");
  if (!LIVE_MODELS.includes(model)) throw new Error("Model dịch trực tiếp không đúng.");
  const target = String(input?.target ?? "");
  if (!liveLang(target)) throw new Error("Ngôn ngữ đích không được hỗ trợ.");
  const source = String(input?.source ?? "");
  if (source && !liveLang(source)) throw new Error("Ngôn ngữ nguồn không được hỗ trợ.");
  return { model, target, source, audio: input?.audio === true };
}

/** Địa chỉ cầu nối công khai phải là ws hoặc wss, không kèm vé. */
export function bridgeBase(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "wss:" && url.protocol !== "ws:") return null;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
