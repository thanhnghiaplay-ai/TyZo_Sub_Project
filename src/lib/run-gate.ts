import type { Sql } from "./db.ts";
import { asrPerSecond, billedSecondsOf, asrCost, chatCost, chatPerMillion, speechCost, speechPerMillionChars, type PriceBook } from "./run-bill.ts";
import { dayStartIso } from "./run-desk.ts";
import { chargeSpeechWith, chargeTicketWith, refundSpeechWith, ticketLive } from "./run-ticket.ts";

export const MAX_COMPLETION_TOKENS = 8192;

export type GateOutcome = { kind: "pass"; response: Response } | { kind: "reject"; status: number; message: string };

/** Đọc model (và loại bỏ yêu cầu lạ) từ body. Trả null khi không đọc được. */
export async function readRequest(
  path: string,
  contentType: string | null,
  body: ArrayBuffer,
): Promise<{ model: string; chars: number; problem: string | null } | null> {
  try {
    if (path === "/audio/transcriptions") {
      const form = await new Response(body, { headers: { "content-type": contentType || "" } }).formData();
      const model = form.get("model");
      return typeof model === "string" && model ? { model, chars: 0, problem: null } : null;
    }
    const json = JSON.parse(new TextDecoder().decode(body)) as Record<string, unknown>;
    const model = json.model;
    if (typeof model !== "string" || !model) return null;
    if (path === "/audio/speech") {
      const input = typeof json.input === "string" ? json.input : "";
      return { model, chars: input.length, problem: input ? null : "Không có chữ để đọc." };
    }
    if (json.stream === true) return { model, chars: 0, problem: "Cửa trả theo lượt chưa hỗ trợ stream." };
    const cap = Number(json.max_completion_tokens ?? json.max_tokens ?? 0);
    if (cap > MAX_COMPLETION_TOKENS) return { model, chars: 0, problem: "Số token trả lời tối đa quá lớn." };
    return { model, chars: 0, problem: null };
  } catch {
    return null;
  }
}

function dayKey(now = Date.now()) {
  return new Date(now + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Tính tiền một yêu cầu gửi Groq. Chỉ tính khi Groq trả thành công; đoạn lỗi không mất tiền.
 * Nhận dạng và dịch trừ vào phiếu đã giữ chỗ, đọc thuyết minh trừ thẳng ví.
 */
export async function chargeWith(input: {
  sql: Sql;
  book: PriceBook;
  path: string;
  model: string;
  chars: number;
  userId: string;
  ticketId: string;
  body: ArrayBuffer;
  cap: number;
  send: () => Promise<Response>;
}): Promise<GateOutcome> {
  const { sql, book, path, model, userId } = input;

  if (path === "/audio/speech") {
    const cost = speechCost(book, model, input.chars);
    if (cost == null || speechPerMillionChars(book, model) == null) return { kind: "reject", status: 422, message: "Model này chưa có giá niêm yết." };
    const key = dayKey();
    const ok = await chargeSpeechWith(sql, userId, cost, key, input.cap, dayStartIso());
    if (!ok) return { kind: "reject", status: 402, message: "Số dư chưa đủ hoặc đã quá hạn mức hôm nay. Hãy nạp thêm." };
    let response: Response;
    try {
      response = await input.send();
    } catch (error) {
      await refundSpeechWith(sql, userId, cost, key);
      throw error;
    }
    if (!response.ok) await refundSpeechWith(sql, userId, cost, key);
    return { kind: "pass", response };
  }

  const priced = path === "/audio/transcriptions" ? asrPerSecond(book, model) != null : chatPerMillion(book, model) != null;
  if (!priced) return { kind: "reject", status: 422, message: "Model này chưa có giá niêm yết." };
  if (!/^[a-f0-9]{24}$/.test(input.ticketId)) return { kind: "reject", status: 402, message: "Thiếu phiếu giữ chỗ. Hãy bấm chạy lại để giữ chỗ." };
  if (!(await ticketLive(sql, input.ticketId, userId))) {
    return { kind: "reject", status: 402, message: "Số tiền đã giữ cho lần chạy này đã hết hoặc phiếu đã đóng. Phần đã dịch vẫn còn. Hãy nạp thêm và chạy tiếp." };
  }
  const response = await input.send();
  if (!response.ok) return { kind: "pass", response };

  const text = await response.text();
  let cost: number | null = null;
  try {
    const data = JSON.parse(text) as {
      duration?: unknown;
      segments?: Array<{ end?: unknown }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    if (path === "/audio/transcriptions") {
      cost = asrCost(book, model, billedSecondsOf(data));
    } else {
      const prompt = Number(data.usage?.prompt_tokens);
      const completion = Number(data.usage?.completion_tokens);
      cost = Number.isFinite(prompt) && Number.isFinite(completion)
        ? chatCost(book, model, prompt, completion)
        : chatCost(book, model, Math.ceil(input.body.byteLength / 3), MAX_COMPLETION_TOKENS);
    }
  } catch {
    cost = path === "/audio/transcriptions" ? asrCost(book, model, 0) : chatCost(book, model, Math.ceil(input.body.byteLength / 3), MAX_COMPLETION_TOKENS);
  }
  if (cost && cost > 0) await chargeTicketWith(sql, input.ticketId, userId, cost);
  const out = new Headers();
  const type = response.headers.get("content-type");
  if (type) out.set("content-type", type);
  return { kind: "pass", response: new Response(text, { status: response.status, headers: out }) };
}
