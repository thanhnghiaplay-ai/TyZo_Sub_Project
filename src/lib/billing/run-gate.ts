import type { Sql } from "../db.ts";
import { asrPerSecond, billedSecondsOf, asrCost, chatCost, chatPerMillion, speechCost, speechPerMillionChars, type PriceBook } from "./run-bill.ts";
import { chargeTicketWith, ticketLive } from "./run-ticket.ts";
import { tokensForBase, TURBO_ASR } from "./token-math.ts";
import { chargeTokenWith, closeTokenWith, openGiayWith } from "./token-flow.ts";
import { randomBytes } from "node:crypto";
import { recordSpendWith } from "../provider-spend.ts";

const MAX_COMPLETION_TOKENS = 8192;

type GateOutcome = { kind: "pass"; response: Response } | { kind: "reject"; status: number; message: string };

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
    // Kiểm toán R3-002: có ghi giới hạn thì phải là số nguyên 1–8192 (trước đây «abc», -1, 1.5 đều lọt).
    // Không ghi thì vẫn nhận như cũ (mọi lệnh của app đều ghi; khi nhà không trả usage, phần trừ tính theo mức trần 8192).
    const rawCap = json.max_completion_tokens ?? json.max_tokens;
    if (rawCap !== undefined && rawCap !== null) {
      const cap = Number(rawCap);
      if (typeof rawCap !== "number" || !Number.isInteger(cap) || cap < 1) return { model, chars: 0, problem: "Số token trả lời tối đa không hợp lệ." };
      if (cap > MAX_COMPLETION_TOKENS) return { model, chars: 0, problem: "Số token trả lời tối đa quá lớn." };
    }
    return { model, chars: 0, problem: null };
  } catch {
    return null;
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
  if (!(await ticketLive(sql, input.ticketId, userId))) {
    return { kind: "reject", status: 402, message: "Phần đã giữ cho lần chạy này đã hết hoặc phiếu đã đóng. Phần đã dịch vẫn còn." };
  }
  const response = await input.send();
  if (!response.ok) return { kind: "pass", response };

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
  if (cost && cost > 0) {
    const unit = await sql<{ unit: string }>`select unit from run_tickets where id = ${input.ticketId} and user_id = ${userId}`;
    if (unit[0]?.unit === "token") {
      const { giayForBaseCost } = await import("./token-math.ts");
      const giay = giayForBaseCost(input.unitBook ?? book, base);
      if (giay && giay > 0) {
        const { chargeTokenWith } = await import("./token-flow.ts");
        await chargeTokenWith(sql, input.ticketId, userId, giay);
      }
    } else await chargeTicketWith(sql, input.ticketId, userId, cost, base);
  }
  const out = new Headers();
  const type = response.headers.get("content-type");
  if (type) out.set("content-type", type);
  return { kind: "pass", response: new Response(text, { status: response.status, headers: out }) };
}
