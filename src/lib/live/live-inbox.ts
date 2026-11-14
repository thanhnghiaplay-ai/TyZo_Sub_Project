import type { ParsedEvent } from "./qwen-protocol.ts";

/** Tin chữ JSON mà cầu nối gửi cho trình duyệt (khung nhị phân là tiếng dịch, xử lý riêng). */
export type BridgeMessage =
  | { type: "ready"; audio: boolean }
  | { type: "event"; event: ParsedEvent }
  | { type: "balance"; heldLeft: number; denied: boolean }
  | { type: "low" }
  | { type: "closing"; reason: string }
  | { type: "reconnecting"; attempt: number }
  | { type: "error"; message: string };

const TYPES = new Set(["ready", "event", "balance", "low", "closing", "reconnecting", "error"]);

/** Đọc một tin chữ từ cầu nối. Tin hỏng hoặc lạ thì trả null, không ném lỗi, để một tin xấu không làm sập màn hình. */
export function parseBridgeMessage(raw: unknown): BridgeMessage | null {
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  const item = data as Record<string, unknown>;
  const type = typeof item.type === "string" ? item.type : "";
  if (!TYPES.has(type)) return null;
  switch (type) {
    case "ready":
      return { type, audio: item.audio === true };
    case "event":
      return item.event && typeof item.event === "object" && typeof (item.event as { kind?: unknown }).kind === "string"
        ? { type, event: item.event as ParsedEvent }
        : null;
    case "balance": {
      const held = Number(item.heldLeft);
      return { type, heldLeft: Number.isFinite(held) ? Math.max(0, held) : 0, denied: item.denied === true };
    }
    case "closing":
      return { type, reason: typeof item.reason === "string" ? item.reason : "" };
    case "reconnecting": {
      const attempt = Number(item.attempt);
      return { type, attempt: Number.isFinite(attempt) ? attempt : 0 };
    }
    case "error":
      return { type, message: typeof item.message === "string" && item.message ? item.message : "Có lỗi khi dịch trực tiếp." };
    default:
      return { type: "low" };
  }
}
