import { requireOpenAccount, takeRate } from "@/lib/guard.server";
import {
  ALI_FILETRANS_MODEL,
  directFileUrlProblem,
  languageHint,
  resultUrlProblem,
  sentencesFromTranscript,
  type AliSentence,
} from "@/lib/sub/ali-filetrans";

const ORIGIN = "https://ws-u3mqeygepiyqd77d.ap-southeast-1.maas.aliyuncs.com";

export type AliFiletransInput =
  | { op: "submit"; url: string; language: string; key: string }
  | { op: "status"; taskId: string; key: string };

export type AliFiletransResult =
  | { state: "queued"; taskId: string }
  | { state: "run" }
  | { state: "done"; sentences: AliSentence[]; seconds: number };

function cleanKey(key: string): string {
  const value = key.trim();
  if (value.length < 20 || value.length > 200 || /\s/.test(value) || value === "room") throw new Error("Key Alibaba không đúng.");
  return value;
}

function messageOf(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const row = payload as Record<string, unknown>;
  const output = row.output && typeof row.output === "object" ? (row.output as Record<string, unknown>) : {};
  const text = output.message || row.message || output.code || row.code;
  return typeof text === "string" && text.trim() ? text.trim().slice(0, 180) : fallback;
}

async function aliJson(path: string, key: string, body?: unknown): Promise<unknown> {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${key}`);
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    headers.set("X-DashScope-Async", "enable");
  }
  let response: Response;
  try {
    response = await fetch(`${ORIGIN}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new Error("Không kết nối được máy nhận dạng.");
  }
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) throw new Error(messageOf(payload, `Nhận dạng lỗi ${response.status}.`));
  return payload;
}

async function readResult(url: string): Promise<unknown> {
  let current = url;
  for (let hop = 0; hop < 3; hop++) {
    const problem = resultUrlProblem(current);
    if (problem) throw new Error(problem);
    const response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(25_000) });
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      if (!next) throw new Error("Không tải được kết quả nhận dạng.");
      current = new URL(next, current).toString();
      continue;
    }
    if (!response.ok) throw new Error("Không tải được kết quả nhận dạng.");
    return response.json() as Promise<unknown>;
  }
  throw new Error("Không tải được kết quả nhận dạng.");
}

function taskIdOf(payload: unknown): string {
  const row = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const output = row.output && typeof row.output === "object" ? (row.output as Record<string, unknown>) : {};
  const id = typeof output.task_id === "string" ? output.task_id : typeof row.task_id === "string" ? row.task_id : "";
  if (!/^[\w-]{8,128}$/.test(id)) throw new Error("Không nhận được mã việc nhận dạng.");
  return id;
}

export async function runAliFiletrans(userId: string, input: AliFiletransInput): Promise<AliFiletransResult> {
  if (input.op !== "submit" && input.op !== "status") throw new Error("Yêu cầu không được phép.");
  await requireOpenAccount(userId);
  await takeRate(`ali-asr:${userId}`, 30, 60);
  const key = cleanKey(input.key);
  if (input.op === "submit") {
    const problem = directFileUrlProblem(input.url);
    if (problem) throw new Error(problem);
    const hints = languageHint(input.language);
    const payload = await aliJson("/api/v1/services/audio/asr/transcription", key, {
      model: ALI_FILETRANS_MODEL,
      input: { file_urls: [input.url.trim()] },
      parameters: { channel_id: [0], ...(hints ? { language_hints: hints } : {}) },
    });
    return { state: "queued", taskId: taskIdOf(payload) };
  }
  if (!/^[\w-]{8,128}$/.test(input.taskId)) throw new Error("Mã việc nhận dạng không đúng.");
  const payload = await aliJson(`/api/v1/tasks/${input.taskId}`, key);
  const row = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const output = row.output && typeof row.output === "object" ? (row.output as Record<string, unknown>) : {};
  const status = typeof output.task_status === "string" ? output.task_status : "";
  if (status === "PENDING" || status === "RUNNING") return { state: "run" };
  if (status !== "SUCCEEDED") throw new Error(messageOf(payload, "Nhận dạng file thất bại."));
  const results = Array.isArray(output.results) ? output.results : [];
  const first = results.find((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).transcription_url === "string") as
    | Record<string, unknown>
    | undefined;
  const sub = typeof first?.subtask_status === "string" ? first.subtask_status : "SUCCEEDED";
  if (!first || sub !== "SUCCEEDED") throw new Error(messageOf(first, "Nhận dạng file thất bại."));
  const transcript = await readResult(String(first.transcription_url));
  return { state: "done", ...sentencesFromTranscript(transcript) };
}
