import type { Sql } from "../db.ts";
import {
  asrPerSecond,
  billedSecondsOf,
  asrCost,
  chatCost,
  chatPerMillion,
  speechCost,
  speechPerMillionChars,
  type PriceBook,
} from "./run-bill.ts";
import { closeTicketWith, ticketLive } from "./run-ticket.ts";
import { tokensForBase, TURBO_ASR } from "./token-math.ts";
import { closeTokenWith, openGiayWith } from "./token-flow.ts";
import { randomBytes } from "node:crypto";
import { supplierBaseCost } from "./supplier-cost.ts";
import { definitiveProviderRejection } from "./upstream-outcome.ts";

const MAX_COMPLETION_TOKENS = 8192;

function reportedChatTokens(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

type GateOutcome =
  | { kind: "pass"; response: Response }
  | { kind: "reject"; status: number; message: string; retryAfter?: number; queuePosition?: number };

/** Giới hạn token trả lời mặc định khi yêu cầu không ghi (RE-005): hữu hạn, đủ cho một lô dịch của app. */
export const DEFAULT_COMPLETION_TOKENS = 4096;

/** RE4-001: khung cố định cho phần nhà cung cấp tự chèn (system mặc định, Harmony, lời dẫn công cụ). */
export const PROMPT_FRAME_TOKENS = 512;

/**
 * RE4-001: cận trên số token đầu vào của một yêu cầu chat, chỉ từ số byte thân JSON đã chuẩn hóa.
 * Tokenizer byte-level BPE (o200k/Harmony, Llama 3, Qwen) cho mỗi token ít nhất một byte UTF-8, nên
 * token của chữ ≤ byte của chữ ≤ byte thân JSON. Lần byte thứ hai phủ khung mỗi tin nhắn và schema công cụ
 * được nhà viết lại (khung mỗi tin nhắn < 25 byte JSON của chính nó). Đối chiếu: docs/kiem-toan/claude/RE4-001.
 * Nếu biết cửa sổ ngữ cảnh thì lấy số nhỏ hơn (nhà từ chối yêu cầu vượt cửa sổ).
 */
export function promptTokenBound(bodyBytes: number, context: number | null | undefined): number {
  const bound = 2 * Math.max(0, Math.ceil(bodyBytes)) + PROMPT_FRAME_TOKENS;
  return Number.isSafeInteger(context) && (context as number) > 0 ? Math.min(bound, context as number) : bound;
}
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
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1)
    return "Số token trả lời tối đa không hợp lệ.";
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
      const form = await new Response(body, {
        headers: { "content-type": contentType || "" },
      }).formData();
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
    if (json.stream === true)
      return { model, chars: 0, problem: "Cửa trả theo lượt chưa hỗ trợ stream." };
    if (json.n != null && json.n !== 1)
      return { model, chars: 0, problem: "Cửa trả theo lượt chỉ hỗ trợ một câu trả lời." };
    delete json.n; // Both providers default to one completion.
    // DashScope max_tokens on legacy Qwen does not cover separate thinking tokens.
    // The TyZo batch translator requests non-thinking mode.
    if (tokenField === "max_tokens") {
      if ((json.enable_thinking != null && json.enable_thinking !== false) ||
        json.thinking_budget != null ||
        (json.reasoning_effort != null && json.reasoning_effort !== "none"))
        return { model, chars: 0, problem: "Cửa trả theo lượt chỉ hỗ trợ dịch trực tiếp từ văn bản." };
      delete json.reasoning_effort;
      if (model === "qwen-plus" || model === "qwen-turbo") json.enable_thinking = false;
    }
    // RE4-001: cận byte chỉ đúng với chữ. Ảnh, âm thanh, tệp trong tin nhắn có thể tốn token vượt xa số byte
    // của URL/thân yêu cầu, nên cửa trả theo lượt chỉ nhận nội dung chữ.
    if (json.messages != null) {
      if (!Array.isArray(json.messages)) return { model, chars: 0, problem: "Tin nhắn không hợp lệ." };
      const textOnly = json.messages.every((m) => {
        const c = (m as { content?: unknown } | null)?.content;
        return c == null || typeof c === "string" ||
          (Array.isArray(c) && c.every((part) => part?.type === "text" && typeof part.text === "string"));
      });
      if (!textOnly) return { model, chars: 0, problem: "Cửa trả theo lượt chỉ nhận nội dung chữ." };
    }
    // Only client-side function schemas have no separately billed tool execution.
    if ((json.enable_search != null && json.enable_search !== false) ||
      (json.tools != null && (!Array.isArray(json.tools) || json.tools.some((tool) => tool?.type !== "function"))))
      return { model, chars: 0, problem: "Cửa trả theo lượt không hỗ trợ công cụ chạy tại nhà cung cấp." };

    const a = json.max_completion_tokens;
    const b = json.max_tokens;
    const given = [a, b].filter((v) => v !== undefined && v !== null);
    for (const v of given) {
      const problem = capProblem(v);
      if (problem) return { model, chars: 0, problem };
    }
    if (given.length === 2 && a !== b)
      return { model, chars: 0, problem: "Hai giới hạn token trả lời khác nhau." };
    const cap = given.length ? (given[0] as number) : DEFAULT_COMPLETION_TOKENS;
    delete json.max_completion_tokens;
    delete json.max_tokens;
    json[tokenField] = cap;
    const normalized = new TextEncoder().encode(JSON.stringify(json));
    return {
      model,
      chars: 0,
      problem: null,
      cap,
      body: normalized.buffer.slice(
        normalized.byteOffset,
        normalized.byteOffset + normalized.byteLength,
      ) as ArrayBuffer,
    };
  } catch {
    return null;
  }
}

/**
 * RE3-002: số giây âm thanh để GIỮ TRƯỚC (trừ thật theo số giây nhà báo). Cận trên đã xác minh bằng bộ dò
 * metadata (audio-probe.ts); null = không xác minh được → cửa từ chối trước khi giữ hoặc gửi nhà cung cấp.
 * Không còn ước theo dung lượng (size/2000 không phải cận trên với Opus bitrate thấp).
 */
export async function audioSecondsEstimate(
  contentType: string | null,
  body: ArrayBuffer,
): Promise<number | null> {
  try {
    if (!/^multipart\/form-data/i.test(contentType ?? "")) return null;
    const form = await new Response(body, {
      headers: { "content-type": contentType || "" },
    }).formData();
    const files = form.getAll("file");
    if (files.length !== 1 || typeof files[0] === "string") return null;
    const { probeAudioBytes } = await import("./audio-probe.ts");
    const probe = probeAudioBytes(new Uint8Array(await files[0].arrayBuffer()));
    return probe.ok && Number.isFinite(probe.seconds) && probe.seconds > 0 ? probe.seconds : null;
  } catch {
    return null;
  }
}

/**
 * Tính tiền một yêu cầu gửi Groq. Chỉ tính khi Groq trả thành công; đoạn lỗi không mất tiền.
 * Nhận dạng và dịch trừ vào phiếu đã giữ chỗ. Orpheus trừ Token dịch theo giá gốc.
 */
type ChargeInput = {
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
  signal?: AbortSignal;
  beatMs?: number;
  bodyTimeoutMs?: number;
  /** RE3-006: suất nhận việc đang giữ; gắn mã lệnh gọi nhà làm bằng chứng đối soát. */
  admissionId?: string;
  /** Internal admission signal: a complete response proves remote work ended, even if DB settlement fails. */
  upstreamComplete?: () => void;
  send: () => Promise<Response>;
};

export async function chargeAdmittedWith(input: ChargeInput): Promise<GateOutcome> {
  const { withWorkAdmission, AdmissionBusy } = await import("./work-admission.ts");
  let dispatched = false;
  let complete = false;
  try {
    return await withWorkAdmission(
      input.sql,
      {
        userId: input.userId,
        provider: input.provider ?? "groq",
        model: input.model,
        lane: "batch",
      },
      (admission) =>
        chargeWith({
          ...input,
          admissionId: admission.id,
          send: () => {
            dispatched = true;
            return input.send();
          },
          upstreamComplete: () => {
            complete = true;
          },
        }),
      { uncertain: () => dispatched && !complete },
    );
  } catch (error) {
    if (error instanceof AdmissionBusy)
      return {
        kind: "reject",
        status: error.status,
        message: error.message,
        retryAfter: error.retryAfter,
        queuePosition: error.position,
      };
    throw error;
  }
}

export async function chargeWith(input: ChargeInput): Promise<GateOutcome> {
  const { sql, book, path, model, userId } = input;

  if (path === "/audio/speech") {
    const bare = { ...book, desk: { markup: 0, custom: {} } };
    const base = speechCost(bare, model, input.chars) ?? 0;
    const turbo = asrPerSecond(bare, TURBO_ASR);
    if (!(base > 0) || turbo == null || speechPerMillionChars(bare, model) == null) {
      return { kind: "reject", status: 422, message: "Model này chưa có giá niêm yết." };
    }
    const providerBase = supplierBaseCost(
      book,
      model,
      "speech",
      { chars: input.chars },
      input.provider,
    );
    if (providerBase == null)
      return { kind: "reject", status: 422, message: "Chưa có giá chi phí nhà cung cấp." };
    const tokens = tokensForBase(base, turbo);
    if (tokens == null || tokens < 1)
      return { kind: "reject", status: 422, message: "Chưa tính được số Token dịch." };
    const id = randomBytes(12).toString("hex");
    const opened = await openGiayWith(sql, {
      id,
      userId,
      fileName: "Đọc thuyết minh",
      seconds: 0,
      rate: Math.max(1, Math.round(turbo)),
      hold: tokens,
    });
    if ("error" in opened)
      return { kind: "reject", status: 402, message: "Chưa đủ Token dịch. Hãy mua gói." };
    const { reserveGateCall, releaseGateCall, settleGateCall, beatGateCall } =
      await import("./gate-reserve.ts");
    const { startBeat } = await import("./work-lease.ts");
    let callId: string | undefined;
    let sent = false;
    let failure: unknown;
    let stopBeat: () => Promise<void> = async () => {};
    try {
      const held = await reserveGateCall(sql, {
        ticketId: id,
        userId,
        estimate: tokens,
        provider: input.provider ?? "groq",
        model,
      });
      if (held.kind !== "ok") throw new Error("Chưa giữ được ngân sách đọc thuyết minh.");
      callId = held.callId;
      if (input.admissionId) {
        const { tagWork } = await import("./work-admission.ts");
        await tagWork(sql, input.admissionId, held.callId);
      }
      stopBeat = startBeat((signal) => beatGateCall(sql, held.callId, signal), {
        everyMs: input.beatMs,
        onLost: (why) => console.warn("lease-lost", "gate", held.callId, why),
      });
      if (input.signal?.aborted) throw input.signal.reason;
      sent = true;
      const response = await input.send();
      if (!response.ok) {
        const known = definitiveProviderRejection(response.status);
        if (known) input.upstreamComplete?.();
        await releaseGateCall(sql, held.callId, known ? "loi" : "mat-phan-hoi");
        await closeTokenWith(sql, id, userId, true);
        return { kind: "pass", response };
      }
      // The app consumes a complete Blob, so no playback is lost by completing
      // the bounded audio body before the atomic financial settlement.
      const audio = await readBytesWithDeadline(
        response,
        input.bodyTimeoutMs ?? 120_000,
        input.signal,
        32 * 1024 * 1024,
      );
      input.upstreamComplete?.();
      if (!audio.byteLength) throw new Error("Nhà cung cấp chưa trả âm thanh.");
      await settleGateCall(sql, {
        callId: held.callId,
        ticketId: id,
        userId,
        units: tokens,
        base,
        providerBase,
        provider: input.provider ?? "groq",
        model,
        rate: book.rate,
        reconcile: false,
      });
      await closeTokenWith(sql, id, userId, false);
      const headers = new Headers();
      const type = response.headers.get("content-type");
      if (type) headers.set("content-type", type);
      return { kind: "pass", response: new Response(audio, { status: response.status, headers }) };
    } catch (error) {
      failure = error;
      try {
        if (callId) await releaseGateCall(sql, callId, sent ? "mat-phan-hoi" : "loi");
        await closeTokenWith(sql, id, userId, true);
      } catch (cleanupError) {
        failure = new AggregateError(
          [error, cleanupError],
          "Lỗi đọc thuyết minh và ghi trạng thái đối soát.",
        );
      }
      throw failure;
    } finally {
      await stopBeat();
    }
  }

  const priced =
    path === "/audio/transcriptions"
      ? asrPerSecond(book, model) != null
      : chatPerMillion(book, model) != null;
  if (!priced) return { kind: "reject", status: 422, message: "Model này chưa có giá niêm yết." };
  if (!/^[a-f0-9]{24}$/.test(input.ticketId))
    return {
      kind: "reject",
      status: 402,
      message: "Thiếu phiếu giữ chỗ. Hãy bấm chạy lại để giữ chỗ.",
    };
  const spent = "Phần đã giữ cho lần chạy này đã hết hoặc phiếu đã đóng. Phần đã dịch vẫn còn.";
  if (!(await ticketLive(sql, input.ticketId, userId)))
    return { kind: "reject", status: 402, message: spent };

  // RE-002: giữ trước phần ước tính của lệnh này TRƯỚC khi gọi nhà (đơn giá không đổi; trừ theo số thật sau).
  const bareBook = { ...book, desk: { markup: 0, custom: {} } };
  const unitRow = await sql<{
    unit: string;
  }>`select unit from run_tickets where id = ${input.ticketId} and user_id = ${userId}`;
  const tokenUnit = unitRow[0]?.unit === "token";
  const probed =
    path === "/audio/transcriptions"
      ? await audioSecondsEstimate(input.contentType ?? null, input.body)
      : 0;
  // RE3-002: không xác minh được độ dài thì không giữ, không gửi nhà (fail closed).
  if (probed === null)
    return {
      kind: "reject",
      status: 422,
      message: "Không kiểm được độ dài đoạn âm thanh. Hãy tải lại trang rồi chạy lại.",
    };
  const estimatedSeconds = probed;
  const isAsr = path === "/audio/transcriptions";
  const tokenChat = tokenUnit && path === "/chat/completions";
  const outCap = input.outCap ?? MAX_COMPLETION_TOKENS;
  // RE4-001: giữ theo cận byte của chính yêu cầu (gồm khung nhà và schema công cụ), không theo cả cửa sổ
  // ngữ cảnh, để phiếu nhỏ vẫn chạy được. Cửa sổ đã biết chỉ làm cận chặt hơn. Không trừ outCap khỏi cận vào.
  const promptCap = isAsr
    ? 0
    : promptTokenBound(input.body.byteLength, book.rows.find((row) => row.id === model)?.contextTokens);
  if (!isAsr && capProblem(outCap))
    return { kind: "reject", status: 422, message: "Số token trả lời tối đa không hợp lệ." };
  const estBase = isAsr
    ? asrCost(bareBook, model, estimatedSeconds)
    : chatCost(bareBook, model, promptCap, outCap);
  const estCost = isAsr
    ? asrCost(book, model, estimatedSeconds)
    : chatCost(book, model, promptCap, outCap);
  const { giayForBaseCost } = await import("./token-math.ts");
  const estimate = tokenUnit ? (giayForBaseCost(input.unitBook ?? book, estBase ?? 0) ?? 0) : (estCost ?? 0);
  const { reserveGateCall, releaseGateCall, beatGateCall, settleGateCall } =
    await import("./gate-reserve.ts");
  const { startBeat } = await import("./work-lease.ts");
  if (input.signal?.aborted) throw input.signal.reason;
  // Backpressure immediately: no polling loop, no waiting request holds a DB connection.
  const held = await reserveGateCall(sql, {
    ticketId: input.ticketId,
    userId,
    estimate,
    provider: input.provider ?? "groq",
    model,
    chatRate: tokenChat ? book.rate : undefined,
  });
  if (held.kind === "reconciliation-limit") return {
    kind: "reject", status: 429, message: "Đang có lượt dịch cần đối soát. Hãy liên hệ hỗ trợ nếu chưa chạy tiếp được.",
  };
  if (held.kind === "busy")
    return {
      kind: "reject",
      status: 429,
      message: "Phần Token đã giữ đang dùng cho các đoạn khác, thử lại sau giây lát.",
    };
  if (held.kind === "none") return { kind: "reject", status: 402, message: spent };
  const callId = held.callId;
  const stopBeat = startBeat((signal) => beatGateCall(sql, callId, signal), {
    everyMs: input.beatMs,
    onLost: (why) => console.warn("lease-lost", "gate", callId, why),
  });
  let primaryFailure: unknown;
  let sent = false;
  return finishGateCall(
    async () => {
      try {
        if (input.admissionId) {
          const { tagWork } = await import("./work-admission.ts");
          await tagWork(sql, input.admissionId, callId);
        }
        if (input.signal?.aborted) throw input.signal.reason;
        sent = true;
        const response = await input.send();
        if (!response.ok) {
          const known = definitiveProviderRejection(response.status);
          if (known) input.upstreamComplete?.();
          await releaseGateCall(sql, callId, known ? "loi" : "mat-phan-hoi");
          return { kind: "pass", response };
        }

        const text = await readBodyWithDeadline(
          response,
          input.bodyTimeoutMs ?? 120_000,
          input.signal,
        );
        input.upstreamComplete?.();
        let cost: number | null = null;
        let base = 0;
        let providerBase: number | null = null;
        let needsReconciliation = false;
        // RE5-002: dịch mà nhà không trả usage hợp lệ thì KHÔNG trừ khách theo ước tính (phần ra là trần outCap);
        // ghi ước tính thành nghĩa vụ chờ đối soát. ASR vẫn tính theo số giây đã dò (đo thật, không phải trần).
        let deferDebit = false;
        const bare = { ...book, desk: { markup: 0, custom: {} } };
        try {
          const data = JSON.parse(text) as {
            duration?: unknown;
            segments?: Array<{ end?: unknown }>;
            usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
          };
          if (path === "/audio/transcriptions") {
            const reportedSeconds = billedSecondsOf(data);
            needsReconciliation = !(reportedSeconds > 0);
            // Only missing/invalid upstream usage falls back. Never inflate valid
            // duration using the conservative reservation estimate for compressed audio.
            const seconds = needsReconciliation ? estimatedSeconds : reportedSeconds;
            cost = asrCost(book, model, seconds);
            base = asrCost(bare, model, seconds) ?? 0;
            providerBase = supplierBaseCost(book, model, "asr", { seconds }, input.provider);
          } else {
            const prompt = reportedChatTokens(data.usage?.prompt_tokens);
            const completion = reportedChatTokens(data.usage?.completion_tokens);
            deferDebit = prompt === null || completion === null;
            needsReconciliation = deferDebit || (prompt ?? 0) > promptCap || (completion ?? 0) > outCap;
            const inn = prompt ?? Math.ceil(input.body.byteLength / 3);
            const out = completion ?? input.outCap ?? MAX_COMPLETION_TOKENS;
            cost = chatCost(book, model, inn, out);
            base = chatCost(bare, model, inn, out) ?? 0;
            providerBase = supplierBaseCost(book, model, "chat", { inn, out }, input.provider);
          }
        } catch {
          needsReconciliation = true;
          deferDebit = path !== "/audio/transcriptions";
          cost =
            path === "/audio/transcriptions"
              ? asrCost(book, model, estimatedSeconds)
              : chatCost(
                  book,
                  model,
                  Math.ceil(input.body.byteLength / 3),
                  input.outCap ?? MAX_COMPLETION_TOKENS,
                );
          base =
            path === "/audio/transcriptions"
              ? (asrCost(bare, model, estimatedSeconds) ?? 0)
              : (chatCost(
                  bare,
                  model,
                  Math.ceil(input.body.byteLength / 3),
                  input.outCap ?? MAX_COMPLETION_TOKENS,
                ) ?? 0);
        }
        providerBase ??= supplierBaseCost(
          book,
          model,
          path === "/audio/transcriptions" ? "asr" : "chat",
          {
            seconds: estimatedSeconds,
            inn: Math.ceil(input.body.byteLength / 3),
            out: input.outCap ?? MAX_COMPLETION_TOKENS,
          },
          input.provider,
        );
        if (providerBase == null)
          throw new Error("Chưa tính được chi phí nhà cung cấp; cần đối soát.");
        const units = tokenUnit ? giayForBaseCost(input.unitBook ?? book, base) : cost;
        if (units == null) throw new Error("Chưa tính được số Token quyết toán.");
        await settleGateCall(sql, {
          callId,
          ticketId: input.ticketId,
          userId,
          units,
          base,
          providerBase,
          provider: input.provider ?? "groq",
          model,
          rate: book.rate,
          reconcile: needsReconciliation,
          deferDebit,
          chat: tokenChat,
        });
        const out = new Headers();
        const type = response.headers.get("content-type");
        if (type) out.set("content-type", type);
        return {
          kind: "pass",
          response: new Response(text, { status: response.status, headers: out }),
        };
      } catch (error) {
        primaryFailure = error;
        try {
          await releaseGateCall(sql, callId, sent ? "mat-phan-hoi" : "loi");
        } catch (cleanupError) {
          primaryFailure = new AggregateError(
            [error, cleanupError],
            "Lỗi xử lý và ghi trạng thái đối soát.",
          );
        }
        throw primaryFailure;
      } finally {
        await stopBeat();
      }
    },
    () => closePending(sql, input.ticketId, userId),
  );
}

/** Preserve both the original failure and any bookkeeping failure without throwing from finally. */
async function finishGateCall<T>(run: () => Promise<T>, close: () => Promise<void>): Promise<T> {
  let result: T;
  try {
    result = await run();
  } catch (primaryError) {
    try {
      await close();
    } catch (cleanupError) {
      throw new AggregateError([primaryError, cleanupError], "Lỗi xử lý và đóng phiếu chờ.");
    }
    throw primaryError;
  }
  await close();
  return result;
}

/** Header arrival is not completion. Bound body reading and actively cancel it on timeout/disconnect. */
async function readBodyWithDeadline(
  response: Response,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<string> {
  return new TextDecoder().decode(
    await readBytesWithDeadline(response, timeoutMs, signal, 16 * 1024 * 1024),
  );
}

async function readBytesWithDeadline(
  response: Response,
  timeoutMs: number,
  signal: AbortSignal | undefined,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array(0);
  let rejectAbort: (reason: unknown) => void = () => undefined;
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const abort = () => {
    const reason = signal?.aborted
      ? signal.reason
      : new DOMException("Hết thời gian đọc trả lời.", "TimeoutError");
    rejectAbort(reason);
    void reader.cancel(reason).catch(() => undefined);
  };
  const timer = setTimeout(abort, timeoutMs);
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  try {
    const parts: Uint8Array[] = [];
    let bytes = 0;
    for (;;) {
      const part = await Promise.race([reader.read(), aborted]);
      if (part.done) {
        const all = new Uint8Array(bytes);
        let at = 0;
        for (const chunk of parts) {
          all.set(chunk, at);
          at += chunk.byteLength;
        }
        return all;
      }
      bytes += part.value.byteLength;
      if (bytes > limit) {
        void reader.cancel().catch(() => undefined);
        throw new Error("Trả lời vượt giới hạn kích thước.");
      }
      parts.push(part.value);
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}

async function closePending(sql: Sql, ticket: string, userId: string) {
  const wanted = await sql<{ close_failed: boolean }>`select close_failed from run_tickets
    where id = ${ticket} and user_id = ${userId} and status = 'dang-giu' and close_wanted`;
  if (wanted.length) await closeTicketWith(sql, ticket, userId, wanted[0].close_failed);
}
