import type { Sql } from "./db.ts";
import { asrPerSecond, billedSecondsOf, asrCost, chatCost, chatPerMillion, speechCost, speechPerMillionChars, type PriceBook } from "./run-bill.ts";
import { dayStartIso } from "./run-desk.ts";
import { chargeSpeechWith, chargeTicketWith, refundSpeechWith, restoreTicketWith, ticketKind } from "./run-ticket.ts";

export const MAX_COMPLETION_TOKENS = 8192;
/** Bitrate thấp nhất khi file không phải WAV. Im và nén vẫn bị tính đủ giờ, nên không được đoán cao. */
export const ASR_BITRATE_FLOOR = 6_000;

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

const tag = (bytes: Uint8Array, offset: number) => String.fromCharCode(bytes[offset] || 0, bytes[offset + 1] || 0, bytes[offset + 2] || 0, bytes[offset + 3] || 0);

/** Giây đúng của WAV PCM. File khác trả null để dùng bitrate sàn. */
export function wavSeconds(bytes: Uint8Array): number | null {
  if (bytes.length < 44 || tag(bytes, 0) !== "RIFF" || tag(bytes, 8) !== "WAVE") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  let rate = 0;
  let channels = 0;
  let bits = 0;
  let dataBytes = 0;
  while (offset + 8 <= bytes.length) {
    const id = tag(bytes, offset);
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (id === "fmt " && size >= 16 && start + 16 <= bytes.length) {
      if (view.getUint16(start, true) !== 1) return null;
      channels = view.getUint16(start + 2, true);
      rate = view.getUint32(start + 4, true);
      bits = view.getUint16(start + 14, true);
    } else if (id === "data") {
      dataBytes = Math.min(size, Math.max(0, bytes.length - start));
    }
    if (size > bytes.length) break;
    offset = start + size + (size % 2);
  }
  if (!(rate >= 8000 && rate <= 48000 && (channels === 1 || channels === 2) && (bits === 8 || bits === 16) && dataBytes > 0)) return null;
  return dataBytes / (rate * channels * (bits / 8));
}

/** Trần giây của đúng đoạn tiếng này. WAV thì lấy giờ trong file. File khác giả định bitrate sàn. */
export function asrSecondsCeiling(bytes: Uint8Array): number {
  const wav = wavSeconds(bytes);
  if (wav != null && wav > 0) return wav;
  return (Math.max(1, bytes.length) * 8) / ASR_BITRATE_FLOOR;
}

/** Trần token của một lần dịch: cả body là đầu vào, câu trả lời không vượt mức đã chặn. */
export function chatCeiling(body: ArrayBuffer): { prompt: number; completion: number } {
  let completion = MAX_COMPLETION_TOKENS;
  try {
    const json = JSON.parse(new TextDecoder().decode(body)) as { max_completion_tokens?: unknown; max_tokens?: unknown };
    const cap = Number(json.max_completion_tokens ?? json.max_tokens ?? 0);
    if (cap > 0 && cap <= MAX_COMPLETION_TOKENS) completion = cap;
  } catch {
    /* body không phải JSON thì giữ trần câu trả lời */
  }
  return { prompt: Math.ceil(body.byteLength / 3), completion };
}

async function audioPayload(body: ArrayBuffer, contentType: string | null): Promise<Uint8Array> {
  if (contentType && /multipart\/form-data/i.test(contentType)) {
    try {
      const form = await new Response(body, { headers: { "content-type": contentType } }).formData();
      const file = form.get("file");
      if (file instanceof Blob) return new Uint8Array(await file.arrayBuffer());
    } catch {
      /* không tách được thì tính cả body */
    }
  }
  return new Uint8Array(body);
}

/**
 * Tính tiền một yêu cầu gửi nhà cung cấp.
 * Nhận dạng và dịch giữ trần xấu nhất của đúng yêu cầu này trước khi gọi.
 * Trần lớn hơn phần còn giữ thì không gọi. Gọi xong chỉ trừ số thật, không quá trần đã giữ.
 * Nhà cung cấp trả lỗi thì trả lại khoản vừa giữ. Đọc thuyết minh trừ thẳng ví.
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
  contentType?: string | null;
  cap: number;
  send: () => Promise<Response>;
}): Promise<GateOutcome> {
  const { sql, book, path, model, userId } = input;

  if (path === "/audio/speech") {
    const cost = speechCost(book, model, input.chars);
    const base = speechCost({ ...book, desk: { markup: 0, custom: {} } }, model, input.chars) ?? 0;
    if (cost == null || speechPerMillionChars(book, model) == null) return { kind: "reject", status: 422, message: "Model này chưa có giá niêm yết." };
    const key = dayKey();
    const ok = await chargeSpeechWith(sql, userId, cost, key, input.cap, dayStartIso(), base);
    if (!ok) return { kind: "reject", status: 402, message: "Số dư chưa đủ hoặc đã quá hạn mức hôm nay. Hãy nạp thêm." };
    let response: Response;
    try {
      response = await input.send();
    } catch (error) {
      await refundSpeechWith(sql, userId, cost, key, base);
      throw error;
    }
    if (!response.ok) await refundSpeechWith(sql, userId, cost, key, base);
    return { kind: "pass", response };
  }

  const priced = path === "/audio/transcriptions" ? asrPerSecond(book, model) != null : chatPerMillion(book, model) != null;
  if (!priced) return { kind: "reject", status: 422, message: "Model này chưa có giá niêm yết." };
  if (!/^[a-f0-9]{24}$/.test(input.ticketId)) return { kind: "reject", status: 402, message: "Thiếu phiếu giữ chỗ. Hãy bấm chạy lại để giữ chỗ." };
  const kind = await ticketKind(sql, input.ticketId, userId);
  if (!kind) {
    return { kind: "reject", status: 402, message: "Số tiền đã giữ cho lần chạy này đã hết hoặc phiếu đã đóng. Phần đã dịch vẫn còn. Hãy nạp thêm và chạy tiếp." };
  }
  if (kind === "translate" && path === "/audio/transcriptions") {
    return { kind: "reject", status: 402, message: "Phiếu dịch lại không dùng để nhận dạng." };
  }

  const bareBook = { ...book, desk: { markup: 0, custom: {} } };
  let ceiling: number | null;
  let bare = 0;
  if (path === "/audio/transcriptions") {
    const seconds = asrSecondsCeiling(await audioPayload(input.body, input.contentType ?? null));
    ceiling = asrCost(book, model, seconds);
    bare = asrCost(bareBook, model, seconds) ?? 0;
  } else {
    const tokens = chatCeiling(input.body);
    ceiling = chatCost(book, model, tokens.prompt, tokens.completion);
    bare = chatCost(bareBook, model, tokens.prompt, tokens.completion) ?? 0;
  }
  if (ceiling == null || !(ceiling > 0)) return { kind: "reject", status: 422, message: "Model này chưa có giá niêm yết." };
  const reserved = await chargeTicketWith(sql, input.ticketId, userId, ceiling, bare);
  const baseReserved = Math.round((bare * reserved) / ceiling);
  const short = "Số tiền đã giữ cho lần chạy này đã hết hoặc phiếu đã đóng. Phần đã dịch vẫn còn. Hãy nạp thêm và chạy tiếp.";
  if (reserved < ceiling) {
    await restoreTicketWith(sql, input.ticketId, userId, reserved, baseReserved);
    return { kind: "reject", status: 402, message: short };
  }

  let response: Response;
  try {
    response = await input.send();
  } catch (error) {
    await restoreTicketWith(sql, input.ticketId, userId, reserved, baseReserved);
    throw error;
  }
  if (!response.ok) {
    await restoreTicketWith(sql, input.ticketId, userId, reserved, baseReserved);
    return { kind: "pass", response };
  }

  const text = await response.text();
  let cost: number | null = null;
  let base = 0;
  try {
    const data = JSON.parse(text) as {
      duration?: unknown;
      segments?: Array<{ end?: unknown }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    if (path === "/audio/transcriptions") {
      const seconds = billedSecondsOf(data);
      cost = asrCost(book, model, seconds);
      base = asrCost(bareBook, model, seconds) ?? 0;
    } else {
      const prompt = Number(data.usage?.prompt_tokens);
      const completion = Number(data.usage?.completion_tokens);
      const inn = Number.isFinite(prompt) ? prompt : Math.ceil(input.body.byteLength / 3);
      const out = Number.isFinite(completion) ? completion : MAX_COMPLETION_TOKENS;
      cost = chatCost(book, model, inn, out);
      base = chatCost(bareBook, model, inn, out) ?? 0;
    }
  } catch {
    cost = path === "/audio/transcriptions" ? asrCost(book, model, 0) : chatCost(book, model, Math.ceil(input.body.byteLength / 3), MAX_COMPLETION_TOKENS);
    base = path === "/audio/transcriptions" ? asrCost(bareBook, model, 0) ?? 0 : chatCost(bareBook, model, Math.ceil(input.body.byteLength / 3), MAX_COMPLETION_TOKENS) ?? 0;
  }
  const keep = cost != null && cost > 0 ? Math.min(reserved, cost) : 0;
  const keepBase = keep > 0 ? Math.min(baseReserved, Math.max(0, base)) : 0;
  await restoreTicketWith(sql, input.ticketId, userId, reserved - keep, baseReserved - keepBase);
  const out = new Headers();
  const type = response.headers.get("content-type");
  if (type) out.set("content-type", type);
  return { kind: "pass", response: new Response(text, { status: response.status, headers: out }) };
}
