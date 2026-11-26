import type { Sql } from "../db.ts";
import { asrPerSecond, billedSecondsOf, asrCost, chatCost, chatPerMillion, speechCost, speechPerMillionChars, type PriceBook } from "./run-bill.ts";
import { chargeTicketWith, ticketLive } from "./run-ticket.ts";
import { tokensForBase, TURBO_ASR } from "./token-math.ts";
import { chargeTokenWith, closeTokenWith, openGiayWith } from "./token-flow.ts";
import { randomBytes } from "node:crypto";
import { recordSpendWith } from "../provider-spend.ts";

const MAX_COMPLETION_TOKENS = 8192;

type GateOutcome = { kind: "pass"; response: Response } | { kind: "reject"; status: number; message: string };

/** Giới hạn token trả lời mặc định khi yêu cầu không ghi (RE-005): hữu hạn, đủ cho một lô dịch của app. */
export const DEFAULT_COMPLETION_TOKENS = 4096;
export type TokenField = "max_completion_tokens" | "max_tokens";

export type GateRequest = {
  model: string;
  chars: number;
  problem: string | null;
  /** Dịch: giới hạn token trả lời đã chuẩn hóa (luôn có, 1–8192). */
  cap?: number;
  /** Dịch: thân yêu cầu đã chuẩn hóa — PHẢI gửi bản này cho nhà, không gửi bản gốc. */
  body?: ArrayBuffer;
};

function capProblem(raw: unknown): string | null {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1) return "Số token trả lời tối đa không hợp lệ.";
  if (raw > MAX_COMPLETION_TOKENS) return "Số token trả lời tối đa quá lớn.";
  return null;
}

/**
 * Đọc model (và loại bỏ yêu cầu lạ) từ body. Trả null khi không đọc được.
 * Dịch (RE-005, R3-002): giới hạn token trả lời là số nguyên 1–8192; ghi cả hai trường mà khác nhau thì từ chối;
 * không ghi hoặc null thì dùng DEFAULT_COMPLETION_TOKENS. Thân gửi nhà được viết lại chỉ còn đúng trường của nhà
 * (`tokenField`), để nhà không bao giờ nhận yêu cầu không có trần. Cùng giới hạn này dùng để giữ trước (gate-reserve).
 */
export async function readRequest(
  path: string,
  contentType: string | null,
  body: ArrayBuffer,
  tokenField: TokenField = "max_completion_tokens",
): Promise<GateRequest | null> {
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
    const a = json.max_completion_tokens;
    const b = json.max_tokens;
    const given = [a, b].filter((v) => v !== undefined && v !== null);
    for (const v of given) {
      const problem = capProblem(v);
      if (problem) return { model, chars: 0, problem };
    }
    if (given.length === 2 && a !== b) return { model, chars: 0, problem: "Hai giới hạn token trả lời khác nhau." };
    const cap = given.length ? (given[0] as number) : DEFAULT_COMPLETION_TOKENS;
    delete json.max_completion_tokens;
    delete json.max_tokens;
    json[tokenField] = cap;
    const normalized = new TextEncoder().encode(JSON.stringify(json));
    return { model, chars: 0, problem: null, cap, body: normalized.buffer.slice(normalized.byteOffset, normalized.byteOffset + normalized.byteLength) as ArrayBuffer };
  } catch {
    return null;
  }
}

/** Ước số giây âm thanh trong yêu cầu nhận dạng để GIỮ TRƯỚC (trừ thật theo số giây nhà báo). WAV đọc đầu tệp; dạng nén ước rộng tay. */
export async function audioSecondsEstimate(contentType: string | null, body: ArrayBuffer): Promise<number> {
  try {
    const form = await new Response(body, { headers: { "content-type": contentType || "" } }).formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return body.byteLength / 2000;
    const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    const tag = (at: number) => String.fromCharCode(...head.slice(at, at + 4));
    if (tag(0) === "RIFF" && tag(8) === "WAVE") {
      const view = new DataView(head.buffer);
      const byteRate = view.getUint32(28, true);
      if (byteRate > 0) return Math.max(0, file.size - 44) / byteRate;
    }
    // Opus/WebM của app khoảng 16–32 kbit/s: chia cho 2.000 byte/giây là ước dư (giữ dư, trừ theo số thật).
    return file.size / 2000;
  } catch {
    return body.byteLength / 2000;
  }
}

/**
 * Tính tiền một yêu cầu gửi Groq. Chỉ tính khi Groq trả thành công; đoạn lỗi không mất tiền.
 * Nhận dạng và dịch trừ vào phiếu đã giữ chỗ. Orpheus trừ Token dịch theo giá gốc.
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
  /** Sổ giá dùng để quy ra Token dịch (phải có Whisper Turbo của Groq). Thiếu = `book` (cửa Groq). Nhà khác phải truyền bảng Groq. */
  unitBook?: PriceBook;
  /** Nhà cung cấp của lần gọi, để ghi tiền phải trả từng nhà (provider-spend.ts). */
  provider?: string;
  /** Dịch: giới hạn token trả lời đã chuẩn hóa (readRequest). Dùng để giữ trước. */
  outCap?: number;
  /** Nhận dạng: content-type của thân, để ước số giây giữ trước. */
  contentType?: string | null;
  /** Chỉ để test: chờ tối đa bao lâu khi phiếu đang bận (ms). Mặc định 20 giây. */
  busyWaitMs?: number;
  send: () => Promise<Response>;
}): Promise<GateOutcome> {
  const { sql, book, path, model, userId } = input;

  if (path === "/audio/speech") {
    const bare = { ...book, desk: { markup: 0, custom: {} } };
    const base = speechCost(bare, model, input.chars) ?? 0;
    const turbo = asrPerSecond(bare, TURBO_ASR);
    if (!(base > 0) || turbo == null || speechPerMillionChars(bare, model) == null) {
      return { kind: "reject", status: 422, message: "Model này chưa có giá niêm yết." };
    }
    const tokens = tokensForBase(base, turbo);
    if (tokens == null || tokens < 1) return { kind: "reject", status: 422, message: "Chưa tính được số Token dịch." };
    const id = randomBytes(12).toString("hex");
    const opened = await openGiayWith(sql, {
      id,
      userId,
      fileName: "Đọc thuyết minh",
      seconds: 0,
      rate: Math.max(1, Math.round(turbo)),
      hold: tokens,
    });
    if ("error" in opened) return { kind: "reject", status: 402, message: "Chưa đủ Token dịch. Hãy mua gói." };
    let response: Response;
    try {
      response = await input.send();
    } catch (error) {
      await closeTokenWith(sql, id, userId, true);
      throw error;
    }
    if (!response.ok) {
      await closeTokenWith(sql, id, userId, true);
      return { kind: "pass", response };
    }
    await chargeTokenWith(sql, id, userId, tokens);
    await closeTokenWith(sql, id, userId, false);
    await recordSpendWith(sql, { provider: input.provider ?? "groq", model, baseVnd: base, rate: book.rate });
    return { kind: "pass", response };
  }

  const priced = path === "/audio/transcriptions" ? asrPerSecond(book, model) != null : chatPerMillion(book, model) != null;
  if (!priced) return { kind: "reject", status: 422, message: "Model này chưa có giá niêm yết." };
  if (!/^[a-f0-9]{24}$/.test(input.ticketId)) return { kind: "reject", status: 402, message: "Thiếu phiếu giữ chỗ. Hãy bấm chạy lại để giữ chỗ." };
  const spent = "Phần đã giữ cho lần chạy này đã hết hoặc phiếu đã đóng. Phần đã dịch vẫn còn.";
  if (!(await ticketLive(sql, input.ticketId, userId))) return { kind: "reject", status: 402, message: spent };

  // RE-002: giữ trước phần ước tính của lệnh này TRƯỚC khi gọi nhà (đơn giá không đổi; trừ theo số thật sau).
  const bareBook = { ...book, desk: { markup: 0, custom: {} } };
  const unitRow = await sql<{ unit: string }>`select unit from run_tickets where id = ${input.ticketId} and user_id = ${userId}`;
  const tokenUnit = unitRow[0]?.unit === "token";
  const estBase =
    path === "/audio/transcriptions"
      ? asrCost(bareBook, model, await audioSecondsEstimate(input.contentType ?? null, input.body)) ?? 0
      : chatCost(bareBook, model, Math.ceil(input.body.byteLength / 3), input.outCap ?? MAX_COMPLETION_TOKENS) ?? 0;
  const estCost =
    path === "/audio/transcriptions"
      ? asrCost(book, model, await audioSecondsEstimate(input.contentType ?? null, input.body)) ?? 0
      : chatCost(book, model, Math.ceil(input.body.byteLength / 3), input.outCap ?? MAX_COMPLETION_TOKENS) ?? 0;
  const { giayForBaseCost } = await import("./token-math.ts");
  const estimate = tokenUnit ? giayForBaseCost(input.unitBook ?? book, estBase) ?? 0 : estCost;
  const { reserveGateCall, releaseGateCall, beatGateCall } = await import("./gate-reserve.ts");
  const { startBeat } = await import("./work-lease.ts");
  let held = await reserveGateCall(sql, { ticketId: input.ticketId, userId, estimate });
  // Phiếu đang bận (mọi phần giữ đang thuộc lệnh khác): chờ ở máy chủ một lúc, lệnh kia xong sẽ nhả.
  const until = Date.now() + (input.busyWaitMs ?? 20_000);
  while (held.kind === "busy" && Date.now() < until) {
    await new Promise((r) => setTimeout(r, 300));
    held = await reserveGateCall(sql, { ticketId: input.ticketId, userId, estimate });
  }
  if (held.kind === "busy") return { kind: "reject", status: 429, message: "Phần Token đã giữ đang dùng cho các đoạn khác, thử lại sau giây lát." };
  if (held.kind === "none") return { kind: "reject", status: 402, message: spent };
  const callId = held.callId;

  const stopBeat = startBeat(() => beatGateCall(sql, callId));
  let response: Response;
  try {
    response = await input.send();
  } catch (error) {
    stopBeat();
    // Không nhận được trả lời (hết giờ, mất mạng): nhà có thể đã tính tiền. Nhả phần giữ, ghi để đối soát.
    await releaseGateCall(sql, callId, "mat-phan-hoi");
    throw error;
  }
  stopBeat();
  if (!response.ok) {
    await releaseGateCall(sql, callId, "loi");
    return { kind: "pass", response };
  }

  const text = await response.text();
  let cost: number | null = null;
  let base = 0;
  const bare = { ...book, desk: { markup: 0, custom: {} } };
  try {
    const data = JSON.parse(text) as {
      duration?: unknown;
      segments?: Array<{ end?: unknown }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    if (path === "/audio/transcriptions") {
      const seconds = billedSecondsOf(data);
      cost = asrCost(book, model, seconds);
      base = asrCost(bare, model, seconds) ?? 0;
    } else {
      const prompt = Number(data.usage?.prompt_tokens);
      const completion = Number(data.usage?.completion_tokens);
      const inn = Number.isFinite(prompt) ? prompt : Math.ceil(input.body.byteLength / 3);
      const out = Number.isFinite(completion) ? completion : MAX_COMPLETION_TOKENS;
      cost = chatCost(book, model, inn, out);
      base = chatCost(bare, model, inn, out) ?? 0;
    }
  } catch {
    cost = path === "/audio/transcriptions" ? asrCost(book, model, 0) : chatCost(book, model, Math.ceil(input.body.byteLength / 3), MAX_COMPLETION_TOKENS);
    base = path === "/audio/transcriptions" ? asrCost(bare, model, 0) ?? 0 : chatCost(bare, model, Math.ceil(input.body.byteLength / 3), MAX_COMPLETION_TOKENS) ?? 0;
  }
  // Tiền phải trả nhà cung cấp: giá gốc thật của lần gọi thành công, kể cả khi phiếu đã hết phần giữ.
  if (base > 0) await recordSpendWith(sql, { provider: input.provider ?? "groq", model, baseVnd: base, rate: book.rate });
  // Trừ số thật và nhả phần giữ của lệnh trong MỘT giao dịch (không có lúc đã nhả mà chưa trừ hay ngược lại).
  const { inTransaction } = await import("../db-tx.ts");
  await inTransaction(sql, async (tx) => {
    if (cost && cost > 0) {
      if (tokenUnit) {
        const giay = giayForBaseCost(input.unitBook ?? book, base);
        if (giay && giay > 0) await chargeTokenWith(tx, input.ticketId, userId, giay);
      } else await chargeTicketWith(tx, input.ticketId, userId, cost, base);
    }
    await releaseGateCall(tx, callId, "xong");
  });
  const { closeIfWantedWith } = await import("./token-flow.ts");
  await closeIfWantedWith(sql, input.ticketId, userId);
  const out = new Headers();
  const type = response.headers.get("content-type");
  if (type) out.set("content-type", type);
  return { kind: "pass", response: new Response(text, { status: response.status, headers: out }) };
}
