import { reasoningOpts } from "@/lib/sub/models";
import type { PackedAudio } from "@/lib/sub/codec";
import {
  contiguousRuns,
  filmContext,
  glossaryList,
  optsForRange,
  parseTranslations,
  stripFence,
  translationMessages,
  translationSchema,
  untranslated,
  type Bible,
} from "@/lib/sub/text";
import type { AsrModel } from "@/lib/sub/types";

export const API = "https://api.groq.com/openai/v1";

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

function errorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object") {
    const record = data as { error?: { message?: string; code?: string }; message?: string };
    if (record.error && typeof record.error === "object") return record.error.message || record.error.code || fallback;
    if (typeof record.message === "string") return record.message;
  }
  return fallback;
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

export async function requestWithRetry(
  url: string,
  makeInit: () => RequestInit,
  label: string,
  signal: AbortSignal | undefined,
  gate: { blockedUntil: number },
  onWait?: (message: string) => void,
  modelName = "",
) {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    let pause = 1500 * (attempt + 1);
    throwIfAborted(signal);
    if (gate.blockedUntil > Date.now()) await sleep(gate.blockedUntil - Date.now(), signal);
    let response: Response | null = null;
    try {
      response = await fetch(url, { ...makeInit(), signal });
    } catch (error) {
      if (signal?.aborted || (error as { name?: string })?.name === "AbortError") throw abortError();
      lastError = new Error(`${label}: lỗi kết nối mạng. Kiểm tra Internet rồi thử lại.`);
    }
    if (response) {
      if (response.ok) return response;
      const message = await readApiError(response, modelName);
      const err = new Error(message);
      if (response.status !== 429 && response.status < 500) throw err;
      lastError = err;
      if (response.status === 429) {
        const ra = Number(response.headers.get("retry-after")) || 0;
        if (ra > 90)
          throw new Error(
            `Hết hạn mức Groq, cần chờ khoảng ${Math.ceil(ra / 60)} phút. Bấm Tiếp tục sau đó, phần đã nhận dạng không bị mất.`,
          );
        pause = Math.max(pause, (ra || 10 * (attempt + 1)) * 1000);
        gate.blockedUntil = Date.now() + pause;
        if (attempt < 4) onWait?.(`Groq đang giới hạn tốc độ, chờ ${Math.round(pause / 1000)} giây rồi thử lại…`);
      }
    }
    if (attempt < 4) await sleep(pause, signal);
  }
  throw lastError || new Error(`${label}: không thể kết nối máy chủ.`);
}

export async function listModelIds(key: string, signal?: AbortSignal): Promise<string[]> {
  const response = await fetch(`${API}/models`, {
    headers: { Authorization: `Bearer ${key}` },
    signal,
  });
  if (!response.ok) throw new Error(await readApiError(response, ""));
  const data = (await response.json()) as { data?: Array<{ id?: string }> };
  return (data.data || []).map((item) => item.id).filter((id): id is string => Boolean(id));
}

export async function transcribe(
  packed: PackedAudio,
  key: string,
  language: string,
  prompt: string,
  asrModel: AsrModel,
  signal: AbortSignal,
  gate: { blockedUntil: number },
  onWait?: (message: string) => void,
) {
  try {
    return await transcribeOnce(packed, key, language, prompt, asrModel, signal, gate, onWait);
  } catch (error) {
    if (packed.wav && /lỗi 400/.test((error as Error)?.message || ""))
      return transcribeOnce({ blob: packed.wav(), name: "audio.wav" }, key, language, prompt, asrModel, signal, gate, onWait);
    throw error;
  }
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
) {
  const response = await requestWithRetry(
    `${API}/audio/transcriptions`,
    () => {
      const form = new FormData();
      form.append("file", packed.blob, packed.name);
      form.append("model", asrModel);
      form.append("response_format", "verbose_json");
      form.append("temperature", "0");
      if (language) form.append("language", language);
      if (prompt) form.append("prompt", prompt);
      return { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form };
    },
    "Nhận dạng giọng nói",
    signal,
    gate,
    onWait,
    asrModel,
  );
  return response.json() as Promise<{
    language?: string;
    segments?: Array<{ text?: string; start?: number; end?: number; no_speech_prob?: number; avg_logprob?: number; compression_ratio?: number }>;
  }>;
}

type Msg = { role: string; content: string };

async function translateOnce(
  texts: string[],
  language: string,
  key: string,
  model: string,
  signal: AbortSignal,
  gate: { blockedUntil: number },
  opts: Parameters<typeof translationMessages>[2],
  onWait?: (message: string) => void,
) {
  if (!model) throw new Error("Bạn chưa nhập model dịch.");
  const messages = translationMessages(texts, language, opts);
  const budget = Math.min(4096, 512 + texts.length * 160);
  const payloads = [
    {
      model,
      temperature: 0,
      ...reasoningOpts(model),
      max_completion_tokens: budget,
      response_format: translationSchema(),
      messages,
    },
    { model, temperature: 0, max_completion_tokens: budget, response_format: { type: "json_object" }, messages },
  ];
  let lastError: Error | undefined;
  for (let index = 0; index < payloads.length; index++) {
    try {
      const response = await requestWithRetry(
        `${API}/chat/completions`,
        () => ({
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(payloads[index]),
        }),
        "Dịch văn bản",
        signal,
        gate,
        onWait,
        model,
      );
      const data = (await response.json()) as {
        choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
      };
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

export async function translateBatch(
  texts: string[],
  language: string,
  key: string,
  model: string,
  signal: AbortSignal,
  gate: { blockedUntil: number },
  opts: Parameters<typeof translationMessages>[2],
  onWait?: (message: string) => void,
): Promise<string[]> {
  try {
    return await translateOnce(texts, language, key, model, signal, gate, opts, onWait);
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
      );
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") throw error;
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
  key: string,
  model: string,
  signal: AbortSignal,
  gate: { blockedUntil: number },
  opts: Parameters<typeof translationMessages>[2],
  onWait?: (message: string) => void,
  known?: Array<string | null | undefined>,
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
  key: string,
  model: string,
  signal: AbortSignal,
  gate: { blockedUntil: number },
  opts: Parameters<typeof translationMessages>[2],
  onWait?: (message: string) => void,
) {
  const out = await translateBatch(texts, language, key, model, signal, gate, opts, onWait);
  const bad = out.map((line, i) => (untranslated(texts[i], line) ? i : -1)).filter((i) => i >= 0);
  if (bad.length) {
    try {
      const fix = await translateIndexes(texts, bad, language, key, model, signal, gate, { ...opts, fix: true }, onWait, out);
      bad.forEach((i, k) => {
        if (fix[k] && fix[k].trim()) out[i] = fix[k];
      });
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") throw error;
    }
  }
  return out;
}

export async function analyzeFilm(input: {
  key: string;
  model: string;
  language: string;
  title: string;
  notes: string;
  gloss: string;
  lines: string[];
  signal: AbortSignal;
  gate: { blockedUntil: number };
  onWait?: (message: string) => void;
}): Promise<Bible> {
  let text = input.lines.join("\n");
  if (text.length > 120000) {
    const h = Math.floor(text.length / 2);
    text = text.slice(0, 40000) + "\n[...]\n" + text.slice(h - 20000, h + 20000) + "\n[...]\n" + text.slice(-40000);
  }
  const sys = `You are a film analyst preparing a subtitle translation into ${input.language}. The input is a raw speech-recognition transcript; names are often misspelled. Return only JSON: {"summary":"3-5 sentences in ${input.language}","characters":[{"name":"canonical spelling","variants":["misspellings of this name that appear in the transcript"],"gender":"male|female|unknown","self":"pronoun this person uses for themselves in ${input.language}","addressed":"how others address this person in ${input.language}","note":"role and relationships"}],"terms":[{"src":"place/organization/item/term as in transcript","tgt":"best rendering in ${input.language}, or the same if it should stay"}]}. Include only names and terms actually present, at most 30 characters and 40 terms, and unify spelling variants of the same name. Infer gender from names, grammar and how people speak; do not leave gender unknown when the transcript makes it clear. self and addressed must be concrete address forms in ${input.language} (Vietnamese examples: "tự xưng tôi, được gọi là anh"), or empty strings if truly unknown.`;
  const glossPairs = glossaryList(input.gloss)
    .slice(0, 80)
    .map(([src, tgt]) => (src === tgt ? src : `${src} => ${tgt}`))
    .join("; ");
  const user = `Known info: ${[input.title.trim(), input.notes.trim().slice(0, 1500), glossPairs].filter(Boolean).join(" | ") || "(none)"}\n\nTRANSCRIPT:\n${text}`;
  const messages: Msg[] = [
    { role: "system", content: sys },
    { role: "user", content: user },
  ];
  const res = await requestWithRetry(
    `${API}/chat/completions`,
    () => ({
      method: "POST",
      headers: { Authorization: `Bearer ${input.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.model,
        temperature: 0,
        ...reasoningOpts(input.model),
        max_completion_tokens: 4096,
        response_format: { type: "json_object" },
        messages,
      }),
    }),
    "Phân tích phim",
    input.signal,
    input.gate,
    input.onWait,
    input.model,
  );
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return JSON.parse(stripFence(data.choices?.[0]?.message?.content || "")) as Bible;
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

export function contextBlock(input: { title: string; notes: string; gloss: string; bible: Bible | null }) {
  return filmContext(input);
}

export async function speakOrpheus(input: {
  key: string;
  text: string;
  voice: string;
  arabic: boolean;
  signal?: AbortSignal;
}): Promise<Blob> {
  const response = await fetch(`${API}/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.arabic ? "canopylabs/orpheus-arabic-saudi" : "canopylabs/orpheus-v1-english",
      input: input.text,
      voice: input.voice,
      response_format: "wav",
    }),
    signal: input.signal,
  });
  if (!response.ok) throw new Error(await readApiError(response, "Orpheus"));
  return response.blob();
}
