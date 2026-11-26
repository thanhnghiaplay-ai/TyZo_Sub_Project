import { reasoningOpts } from "@/lib/sub/models";
import { authHeader, authHeaders, keyKnownButLimited, modelIdsFrom, modelListUrl, PROVIDERS, providerApi, providerChat, type ProviderChat, type ProviderId } from "@/lib/sub/provider";
import { providerOfModel, type RoomOffer } from "@/lib/sub/room-models";
import type { PackedAudio } from "@/lib/sub/codec";
import {
  contiguousRuns,
  filmContext,
  optsForRange,
  parseTranslations,
  translationMessages,
  translationSchema,
  untranslated,
  type Bible,
} from "@/lib/sub/text";
import type { AsrModel } from "@/lib/sub/types";
import { roomTicketId } from "@/lib/sub/room-ticket";
import type { KeyProbe } from "@/lib/sub/key-check";
import { BODY_TIMEOUT_MS, DeadlineError, HEADER_TIMEOUT_MS, withDeadlines } from "@/lib/sub/http-deadline";
import { PolishRefusal, type PolishCall } from "@/lib/sub/polish";
import { analyzeMessages, parseBible } from "@/lib/sub/analyze";

export const API = "https://api.groq.com/openai/v1";
export const ROOM_KEY = "room";

function roomFetchTarget(url: string, init: RequestInit, ticketId?: string | null): { url: string; init: RequestInit } {
  const headers = new Headers(init.headers);
  if (headers.get("Authorization") !== `Bearer ${ROOM_KEY}`) return { url, init };
  const path = url.startsWith(API) ? url.slice(API.length) : "";
  headers.delete("Authorization");
  headers.set("x-groq-path", path);
  const ticket = ticketId === undefined ? roomTicketId() : ticketId;
  if (ticket) headers.set("x-run-ticket", ticket);
  return { url: "/api/room-groq", init: { ...init, headers } };
}

/**
 * Key cho mọi việc chữ (dịch, phân tích nội dung, trau chuốt): ROOM_KEY (trả theo lượt), một chuỗi (key Groq, cách cũ),
 * hoặc vòng key theo nhà `{ keys, lists }` (key khách của từng nhà + danh sách model key đó có, để biết model lạ thuộc nhà nào).
 */
export type ChatKey = string | { keys: Partial<Record<ProviderId, string>>; lists?: RoomOffer };

type ChatCall = { provider: ProviderId; url: string; headers: Record<string, string>; tokenField: ProviderChat["tokenField"] };

/**
 * Đường gọi cho một model dịch, theo NHÀ của model (danh mục chung + danh sách key), không gắn cứng Groq.
 * Trả theo lượt: cửa chung /api/model-call của phòng. Key khách: gọi thẳng nhà nếu nhà cho trình duyệt gọi,
 * không thì đi qua cửa chung (key không lưu). Thiếu key của đúng nhà thì báo rõ nhà nào.
 */
export function chatCall(model: string, key: ChatKey, ticket?: string | null): ChatCall {
  const lists = typeof key === "string" ? undefined : key.lists;
  const provider = providerOfModel(model, lists ?? {}) ?? "groq";
  const chat = providerChat(provider);
  const label = PROVIDERS[provider].label;
  if (!chat) throw new Error(`${label} không có model dịch, hãy chọn model khác.`);
  const json = { "Content-Type": "application/json" };
  if (key === ROOM_KEY) {
    const room = ticket === undefined ? roomTicketId() : ticket;
    return { provider, tokenField: chat.tokenField, url: "/api/model-call", headers: { ...json, "x-provider": provider, "x-path": chat.path, ...(room ? { "x-run-ticket": room } : {}) } };
  }
  const own = (typeof key === "string" ? (provider === "groq" ? key : "") : (key.keys[provider] ?? "")).trim();
  if (!own) throw new Error(`Model ${model} chạy trên ${label}. Hãy nhập key ${label}, hoặc chọn model của nhà bạn đã có key.`);
  if (chat.browserDirect) return { provider, tokenField: chat.tokenField, url: `${providerApi(provider)}${chat.path}`, headers: { ...json, Authorization: authHeader(provider, own) } };
  return { provider, tokenField: chat.tokenField, url: "/api/model-call", headers: { ...json, "x-provider": provider, "x-path": chat.path, "x-user-key": own } };
}

/** Tên nhà của model, cho câu báo chờ/giới hạn (không ghi cứng «Groq»). */
function houseLabel(model: string): string {
  return PROVIDERS[providerOfModel(model) ?? "groq"].label;
}

export function abortError() {
  const error = new Error("Đã hủy.");
  error.name = "AbortError";
  return error;
}

export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}

export function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (!signal) return;
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** Lấy câu lỗi đọc được từ thân lỗi của nhà (dạng OpenAI `error`, ElevenLabs `detail`, hoặc `message`). Không trả JSON thô. */
export function errorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object") {
    const record = data as { error?: { message?: string; code?: string }; message?: string; detail?: unknown; err_msg?: string };
    if (record.error && typeof record.error === "object") return record.error.message || record.error.code || fallback;
    if (typeof record.message === "string") return record.message;
    if (typeof record.err_msg === "string") return record.err_msg;
    const detail = record.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: unknown } | undefined;
      if (first && typeof first.msg === "string") return first.msg;
    }
    if (detail && typeof detail === "object") {
      const row = detail as { message?: unknown; status?: unknown };
      if (typeof row.message === "string") return row.message;
      if (typeof row.status === "string") return row.status;
    }
  }
  return fallback.length > 160 ? `${fallback.slice(0, 160)}…` : fallback;
}

/** Lỗi khi kiểm key của nhà ngoài Groq: câu tiếng Việt theo nhà, kèm câu lỗi gọn của nhà (không chép JSON thô). */
async function keyListError(response: Response, provider: ProviderId) {
  const raw = await response.text().catch(() => "");
  let detail = raw;
  try {
    detail = errorMessage(JSON.parse(raw), raw);
  } catch {
    detail = raw.length > 160 ? `${raw.slice(0, 160)}…` : raw;
  }
  const info = PROVIDERS[provider];
  const tail = detail ? ` Nhà báo: ${detail}` : "";
  if (response.status === 401 || response.status === 403)
    return `Key ${info.label} không đúng hoặc chưa được cấp quyền (${response.status}). Kiểm tra lại key ở ${info.keyPage}.${tail}`;
  if (response.status === 429) return `${info.label} đang giới hạn lượt gọi (429). Chờ một lát rồi thử lại.${tail}`;
  return `${info.label} trả lỗi ${response.status} khi kiểm key.${tail}`;
}

async function readApiError(response: Response, modelName: string) {
  const raw = await response.text().catch(() => "");
  let detail = raw;
  try {
    detail = errorMessage(JSON.parse(raw), raw);
  } catch {
    /* body không phải JSON */
  }
  if (response.status === 401 || response.status === 403)
    return `API key không hợp lệ hoặc chưa được cấp quyền (${response.status}). ${detail}`;
  if (response.status === 404)
    return `Không tìm thấy model hoặc API (404). Hãy kiểm tra tên model: ${modelName}. Chi tiết: ${detail}`;
  if (response.status === 429)
    return `Groq đang giới hạn lượt gọi hoặc hết hạn mức (429). Hãy chờ rồi thử lại. ${detail}`;
  return `API trả về lỗi ${response.status}: ${detail || response.statusText}`;
}

/**
 * Hai hạn chót cho mỗi lần gọi: chờ đầu phản hồi, rồi đọc hết phần thân (xem `http-deadline.ts`).
 * Quá hạn ở bước nào thì thử lại, không đứng mãi. Việc đọc thân phải nằm trong `read`, vì hạn chót chỉ dừng khi `read` xong.
 */
type Outcome<T> = { done: true; value: T } | { done: false; status: number; retryAfter: number; error: Error };

export async function requestWithRetry<T>(
  url: string,
  makeInit: () => RequestInit,
  label: string,
  signal: AbortSignal | undefined,
  gate: { blockedUntil: number },
  onWait: ((message: string) => void) | undefined,
  modelName: string,
  ticket: string | null | undefined,
  read: (response: Response) => Promise<T>,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    let pause = 1500 * (attempt + 1);
    throwIfAborted(signal);
    if (gate.blockedUntil > Date.now()) await sleep(gate.blockedUntil - Date.now(), signal);
    let outcome: Outcome<T> | null = null;
    try {
      outcome = await withDeadlines<Outcome<T>>(
        (guard) => {
          const next = roomFetchTarget(url, makeInit(), ticket);
          return fetch(next.url, { ...next.init, signal: guard });
        },
        async (response) => {
          if (response.ok) return { done: true, value: await read(response) };
          const error = new Error(await readApiError(response, modelName));
          return { done: false, status: response.status, retryAfter: Number(response.headers.get("retry-after")) || 0, error };
        },
        { signal, headerMs: HEADER_TIMEOUT_MS, bodyMs: BODY_TIMEOUT_MS },
      );
    } catch (error) {
      if (signal?.aborted || (error as { name?: string })?.name === "AbortError") throw abortError();
      if (error instanceof DeadlineError) {
        lastError = new Error(
          error.phase === "header"
            ? `${label}: máy chủ không trả lời sau ${error.ms / 1000} giây.`
            : `${label}: máy chủ gửi dữ liệu dở dang, quá ${error.ms / 1000} giây vẫn chưa nhận đủ.`,
        );
      } else if (error instanceof TypeError) {
        lastError = new Error(`${label}: lỗi kết nối mạng. Kiểm tra Internet rồi thử lại.`);
      } else {
        throw error;
      }
    }
    if (outcome?.done) return outcome.value;
    if (outcome) {
      if (outcome.status !== 429 && outcome.status < 500) throw outcome.error;
      lastError = outcome.error;
      if (outcome.status === 429) {
        const ra = outcome.retryAfter;
        if (ra > 90)
          throw new Error(
            `Hết hạn mức ${houseLabel(modelName)}, cần chờ khoảng ${Math.ceil(ra / 60)} phút. Bấm Tiếp tục sau đó, phần đã nhận dạng không bị mất.`,
          );
        pause = Math.max(pause, (ra || 10 * (attempt + 1)) * 1000);
        gate.blockedUntil = Date.now() + pause;
        if (attempt < 4) onWait?.(`${houseLabel(modelName)} đang giới hạn tốc độ, chờ ${Math.round(pause / 1000)} giây rồi thử lại…`);
      }
    }
    if (attempt < 4) await sleep(pause, signal);
  }
  throw lastError || new Error(`${label}: không thể kết nối máy chủ.`);
}

/** Danh sách model nhẹ, chờ ngắn hơn. */
const LIST_TIMEOUT_MS = 30_000;

export async function listModelIds(key: string, signal?: AbortSignal, provider: ProviderId = "groq"): Promise<string[]> {
  const next = roomFetchTarget(modelListUrl(provider), { headers: authHeaders(provider, key) }, null);
  try {
    const data = await withDeadlines(
      (guard) => fetch(next.url, { ...next.init, method: key === ROOM_KEY ? "POST" : "GET", signal: guard }),
      async (response) => {
        if (!response.ok) {
          if (provider === "groq") throw new Error(await readApiError(response, ""));
          // Nhà có danh sách model khai cố định: lệnh kiểm chỉ để biết key đúng. Nhà báo «thiếu quyền» nghĩa là đã nhận ra key,
          // chỉ thiếu quyền của riêng lệnh kiểm (ElevenLabs: models_read, app không dùng) → coi là key đúng.
          if (response.status === 401 || response.status === 403) {
            const raw = await response.clone().text().catch(() => "");
            if (keyKnownButLimited(provider, raw)) return null;
          }
          throw new Error(await keyListError(response, provider));
        }
        return (await response.json()) as unknown;
      },
      { signal, headerMs: LIST_TIMEOUT_MS, bodyMs: LIST_TIMEOUT_MS },
    );
    return modelIdsFrom(provider, data);
  } catch (error) {
    if (error instanceof DeadlineError) throw new Error(`Đọc danh sách model: máy chủ không trả lời xong sau ${error.ms / 1000} giây.`);
    throw error;
  }
}

/** Hỏi Groq danh sách model bằng key này, giữ lại mã trạng thái để biết key sai, bị giới hạn hay chỉ là mất mạng. Không ném lỗi, trừ khi bị hủy. */
export async function probeKey(key: string, signal?: AbortSignal): Promise<KeyProbe> {
  const lost: KeyProbe = { status: 0, ids: [], retryAfter: 0, remainingRequests: null, remainingTokens: null };
  const guard = new AbortController();
  const relay = () => guard.abort();
  signal?.addEventListener("abort", relay, { once: true });
  const timer = setTimeout(() => guard.abort(), 15_000);
  try {
    const next = roomFetchTarget(modelListUrl("groq"), { headers: { Authorization: `Bearer ${key}` } }, null);
    const response = await fetch(next.url, { ...next.init, method: key === ROOM_KEY ? "POST" : "GET", signal: guard.signal });
    const number = (name: string) => {
      const raw = response.headers.get(name);
      const value = raw === null ? NaN : Number(raw);
      return Number.isFinite(value) ? value : null;
    };
    let ids: string[] = [];
    if (response.ok) {
      const data = (await response.json().catch(() => ({}))) as { data?: Array<{ id?: string }> };
      ids = (data.data || []).map((item) => item.id).filter((id): id is string => Boolean(id));
    }
    return {
      status: response.status,
      ids,
      retryAfter: Number(response.headers.get("retry-after")) || 0,
      remainingRequests: number("x-ratelimit-remaining-requests"),
      remainingTokens: number("x-ratelimit-remaining-tokens"),
    };
  } catch {
    if (signal?.aborted) throw abortError();
    return lost;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", relay);
  }
}

/** Nhận dạng một đoạn bằng Whisper của Groq. Gọi qua `transcribe` ở `@/lib/providers`, không gọi thẳng. */
export async function transcribeGroq(
  packed: PackedAudio,
  key: string,
  language: string,
  prompt: string,
  asrModel: AsrModel,
  signal: AbortSignal,
  gate: { blockedUntil: number },
  onWait?: (message: string) => void,
  ticket?: string | null,
) {
  // Mốc từ là phần thêm. Groq từ chối (400) thì gửi lại như cũ, không có mốc từ, để không mất câu.
  let words = true;
  let usable = packed;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await transcribeOnce(usable, key, language, prompt, asrModel, signal, gate, onWait, ticket, words);
    } catch (error) {
      const message = (error as Error)?.message || "";
      if (!/lỗi 400/.test(message)) throw error;
      if (words) {
        words = false;
        continue;
      }
      if (usable === packed && packed.wav) {
        usable = { blob: packed.wav(), name: "audio.wav" };
        continue;
      }
      throw error;
    }
  }
  throw new Error("Nhận dạng giọng nói: không gửi được.");
}

async function transcribeOnce(
  packed: PackedAudio,
  key: string,
  language: string,
  prompt: string,
  asrModel: AsrModel,
  signal: AbortSignal,
  gate: { blockedUntil: number },
  onWait?: (message: string) => void,
  ticket?: string | null,
  withWords = true,
) {
  return requestWithRetry(
    `${API}/audio/transcriptions`,
    () => {
      const form = new FormData();
      form.append("file", packed.blob, packed.name);
      form.append("model", asrModel);
      form.append("response_format", "verbose_json");
      form.append("temperature", "0");
      if (withWords) {
        form.append("timestamp_granularities[]", "word");
        form.append("timestamp_granularities[]", "segment");
      }
      if (language) form.append("language", language);
      if (prompt) form.append("prompt", prompt);
      return { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form };
    },
    "Nhận dạng giọng nói",
    signal,
    gate,
    onWait,
    asrModel,
    ticket,
    (response) =>
      response.json() as Promise<{
        language?: string;
        segments?: Array<{ text?: string; start?: number; end?: number; no_speech_prob?: number; avg_logprob?: number; compression_ratio?: number }>;
        words?: Array<{ word?: string; start?: number; end?: number }>;
      }>,
  );
}

type Msg = { role: string; content: string };

async function translateOnce(
  texts: string[],
  language: string,
  key: ChatKey,
  model: string,
  signal: AbortSignal,
  gate: { blockedUntil: number },
  opts: Parameters<typeof translationMessages>[2],
  onWait?: (message: string) => void,
  ticket?: string | null,
) {
  if (!model) throw new Error("Bạn chưa nhập model dịch.");
  const call = chatCall(model, key, ticket);
  const messages = translationMessages(texts, language, opts);
  const budget = Math.min(4096, 512 + texts.length * 160);
  const payloads = [
    {
      model,
      temperature: 0,
      ...reasoningOpts(model),
      [call.tokenField]: budget,
      response_format: translationSchema(),
      messages,
    },
    { model, temperature: 0, [call.tokenField]: budget, response_format: { type: "json_object" }, messages },
  ];
  let lastError: Error | undefined;
  for (let index = 0; index < payloads.length; index++) {
    try {
      const data = await requestWithRetry(
        call.url,
        () => ({
          method: "POST",
          headers: call.headers,
          body: JSON.stringify(payloads[index]),
        }),
        "Dịch văn bản",
        signal,
        gate,
        onWait,
        model,
        ticket,
        (response) =>
          response.json() as Promise<{
            choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
          }>,
      );
      const choice = data.choices?.[0];
      const content = choice?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        if (choice?.finish_reason === "length") throw new Error("Model dịch dùng hết token trước khi trả câu.");
        throw new Error("Model dịch trả về nội dung trống.");
      }
      return parseTranslations(content, texts.length);
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") throw error;
      lastError = error as Error;
      const canFallback =
        index === 0 && /400|reasoning|response_format|json_schema|not supported|unsupported|unknown parameter/i.test(lastError.message || "");
      if (!canFallback) throw error;
    }
  }
  throw lastError || new Error("Dịch văn bản thất bại.");
}

async function translateBatch(
  texts: string[],
  language: string,
  key: ChatKey,
  model: string,
  signal: AbortSignal,
  gate: { blockedUntil: number },
  opts: Parameters<typeof translationMessages>[2],
  onWait?: (message: string) => void,
  ticket?: string | null,
): Promise<string[]> {
  try {
    return await translateOnce(texts, language, key, model, signal, gate, opts, onWait, ticket);
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") throw error;
    const retryable = /hết token|nội dung trống|JSON không hợp lệ|không đúng định dạng|thiếu câu/.test((error as Error).message || "");
    if (!retryable) throw error;
    if (texts.length <= 1) return [""];
    const mid = Math.ceil(texts.length / 2);
    const left = await translateBatch(
      texts.slice(0, mid),
      language,
      key,
      model,
      signal,
      gate,
      optsForRange(opts, texts, 0, mid),
      onWait,
      ticket,
    );
    let right: string[];
    try {
      const known = texts.map((_, index) => (index < mid ? left[index] : ""));
      right = await translateBatch(
        texts.slice(mid),
        language,
        key,
        model,
        signal,
        gate,
        optsForRange(opts, texts, mid, texts.length, known),
        onWait,
        ticket,
      );
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") throw error;
      const message = (error as Error).message || "";
      if (/401|403|429|không hợp lệ|giới hạn|chưa được cấp/.test(message)) throw error;
      right = texts.slice(mid).map(() => "");
    }
    return left.concat(right);
  }
}

/** Dịch đúng các vị trí `indexes`, kèm ctx của phần còn lại. Không gửi lại các câu đã có. */
export async function translateIndexes(
  texts: string[],
  indexes: number[],
  language: string,
  key: ChatKey,
  model: string,
  signal: AbortSignal,
  gate: { blockedUntil: number },
  opts: Parameters<typeof translationMessages>[2],
  onWait?: (message: string) => void,
  known?: Array<string | null | undefined>,
  ticket?: string | null,
): Promise<string[]> {
  const runs = contiguousRuns(indexes);
  const byIndex = new Map<number, string>();
  for (const run of runs) {
    const start = run[0];
    const end = run[run.length - 1] + 1;
    const fix = await translateBatch(
      texts.slice(start, end),
      language,
      key,
      model,
      signal,
      gate,
      { ...optsForRange(opts, texts, start, end, known), fix: opts.fix },
      onWait,
      ticket,
    );
    run.forEach((index) => {
      byIndex.set(index, fix[index - start] || "");
    });
  }
  return indexes.map((index) => byIndex.get(index) || "");
}

export async function translateWithRepair(
  texts: string[],
  language: string,
  key: ChatKey,
  model: string,
  signal: AbortSignal,
  gate: { blockedUntil: number },
  opts: Parameters<typeof translationMessages>[2],
  onWait?: (message: string) => void,
  ticket?: string | null,
) {
  const out = await translateBatch(texts, language, key, model, signal, gate, opts, onWait, ticket);
  const bad = out.map((line, i) => (untranslated(texts[i], line) ? i : -1)).filter((i) => i >= 0);
  if (bad.length) {
    try {
      const fix = await translateIndexes(texts, bad, language, key, model, signal, gate, { ...opts, fix: true }, onWait, out, ticket);
      bad.forEach((i, k) => {
        if (fix[k] && fix[k].trim()) out[i] = fix[k];
      });
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") throw error;
    }
  }
  return out;
}

/**
 * Lớp gọi mạng cho `polishAll` (polish.ts). Cùng đường gọi, hạn chót, thử lại và xử lý 429 như bước dịch.
 * Nhà cung cấp báo từ chối (`content_filter` hoặc trường `refusal`) thì ném `PolishRefusal` để polishAll
 * chia lô và đánh dấu đúng câu bị từ chối.
 */
/** Nhiệt độ cho bước trau chuốt. */
export const POLISH_TEMPERATURE = 0.3;

export function makePolishCall(
  key: ChatKey,
  model: string,
  signal: AbortSignal,
  gate: { blockedUntil: number },
  onWait?: (message: string) => void,
  ticket?: string | null,
): PolishCall {
  return async (messages, count) => {
    if (!model) throw new Error("Bạn chưa chọn model trau chuốt.");
    const call = chatCall(model, key, ticket);
    const budget = Math.min(8192, 512 + count * 220);
    // Trau chuốt cần câu chữ mềm hơn bước dịch: nhiệt độ thấp nhưng khác 0 (v5.28.0). Bước dịch vẫn 0.
    const payloads = [
      { model, temperature: POLISH_TEMPERATURE, ...reasoningOpts(model), [call.tokenField]: budget, response_format: translationSchema(), messages },
      { model, temperature: POLISH_TEMPERATURE, [call.tokenField]: budget, response_format: { type: "json_object" }, messages },
    ];
    let lastError: Error | undefined;
    for (let index = 0; index < payloads.length; index++) {
      try {
        const data = await requestWithRetry(
          call.url,
          () => ({
            method: "POST",
            headers: call.headers,
            body: JSON.stringify(payloads[index]),
          }),
          "Trau chuốt bản dịch",
          signal,
          gate,
          onWait,
          model,
          ticket,
          (response) =>
            response.json() as Promise<{
              choices?: Array<{ finish_reason?: string; message?: { content?: string; refusal?: string | null } }>;
            }>,
        );
        const choice = data.choices?.[0];
        if (choice?.finish_reason === "content_filter" || (typeof choice?.message?.refusal === "string" && choice.message.refusal.trim())) {
          throw new PolishRefusal();
        }
        const content = choice?.message?.content;
        if (typeof content !== "string" || !content.trim()) {
          if (choice?.finish_reason === "length") throw new Error("Model trau chuốt dùng hết token trước khi trả câu.");
          throw new Error("Model trau chuốt trả về nội dung trống.");
        }
        return content;
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError" || error instanceof PolishRefusal) throw error;
        lastError = error as Error;
        const canFallback =
          index === 0 && /400|reasoning|response_format|json_schema|not supported|unsupported|unknown parameter/i.test(lastError.message || "");
        if (!canFallback) throw error;
      }
    }
    throw lastError || new Error("Trau chuốt thất bại.");
  };
}

export async function analyzeFilm(input: {
  key: ChatKey;
  model: string;
  language: string;
  title: string;
  notes: string;
  gloss: string;
  lines: string[];
  signal: AbortSignal;
  gate: { blockedUntil: number };
  onWait?: (message: string) => void;
  ticket?: string | null;
}): Promise<Bible> {
  const messages: Msg[] = analyzeMessages(input);
  const call = chatCall(input.model, input.key, input.ticket);
  const data = await requestWithRetry(
    call.url,
    () => ({
      method: "POST",
      headers: call.headers,
      body: JSON.stringify({
        model: input.model,
        temperature: 0,
        ...reasoningOpts(input.model),
        [call.tokenField]: 4096,
        response_format: { type: "json_object" },
        messages,
      }),
    }),
    "Phân tích nội dung",
    input.signal,
    input.gate,
    input.onWait,
    input.model,
    input.ticket,
    (response) => response.json() as Promise<{ choices?: Array<{ message?: { content?: string } }> }>,
  );
  return parseBible(data.choices?.[0]?.message?.content || "");
}

export function applyNameFixes(lines: Array<{ original: string; translation: string | null }>, bible: Bible) {
  const esc = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const character of bible.characters || []) {
    if (!character?.name) continue;
    for (const variant of character.variants || []) {
      if (typeof variant !== "string" || variant.length < 3 || variant.toLowerCase() === character.name.toLowerCase()) continue;
      const word = /^[\p{Script=Latin}\s'’.-]+$/u.test(variant);
      const re = new RegExp((word ? "(?<![\\p{L}\\p{N}])" : "") + esc(variant) + (word ? "(?![\\p{L}\\p{N}])" : ""), "giu");
      for (const line of lines) if (line.translation === null) line.original = line.original.replace(re, character.name);
    }
  }
}

export function contextBlock(input: { title: string; notes: string; gloss: string; bible: Bible | null; extra?: string }) {
  return filmContext(input);
}

export async function speakOrpheus(input: {
  key: string;
  text: string;
  voice: string;
  arabic: boolean;
  signal?: AbortSignal;
}): Promise<Blob> {
  const next = roomFetchTarget(`${API}/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.arabic ? "canopylabs/orpheus-arabic-saudi" : "canopylabs/orpheus-v1-english",
      input: input.text,
      voice: input.voice,
      response_format: "wav",
    }),
  });
  try {
    return await withDeadlines(
      (guard) => fetch(next.url, { ...next.init, signal: guard }),
      async (response) => {
        if (!response.ok) throw new Error(await readApiError(response, "Orpheus"));
        return response.blob();
      },
      { signal: input.signal, headerMs: HEADER_TIMEOUT_MS, bodyMs: BODY_TIMEOUT_MS },
    );
  } catch (error) {
    if (error instanceof DeadlineError) throw new Error(`Giọng đọc Orpheus: máy chủ không gửi xong âm thanh sau ${error.ms / 1000} giây.`);
    throw error;
  }
}
