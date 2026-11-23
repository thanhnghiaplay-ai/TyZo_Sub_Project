import { requireOpenAccount, takeRate } from "@/lib/guard.server";
import { requireServiceOpen } from "@/lib/service-status.server";
import { cleanSpeechmaticsKey, sentencesFromSpeechmatics, speechmaticsJobConfig, type SmSentence } from "@/lib/sub/speechmatics";
import { startSpeechmaticsJob, stepSpeechmaticsJob, type SmRequest } from "@/lib/sub/speechmatics-poll";
import { directFileUrlProblem } from "@/lib/sub/ali-filetrans";
import { authHeader, PROVIDERS } from "@/lib/sub/provider";

export type SpeechmaticsAsrInput = { url: string; language: string; model: string; key: string; ticketId?: string };
type SpeechmaticsAsrResult = { sentences: SmSentence[]; seconds: number };

const REQUEST_MS = 20_000;

export type SpeechmaticsStartResult = { jobId: string };
export type SpeechmaticsStepInput = { jobId: string; language: string; model: string; key: string; ticketId?: string };
export type SpeechmaticsStepResult = { state: "running" } | ({ state: "done" } & SpeechmaticsAsrResult);

async function prepare(userId: string, key: string, ticketId?: string) {
  await requireOpenAccount(userId);
  await requireServiceOpen("normal");
  const usingRoom = key === "room";
  const { assertRoomTicket, roomKeyOf } = await import("@/lib/room-asr.server");
  const real = usingRoom ? cleanSpeechmaticsKey(await roomKeyOf("speechmatics_key", "Speechmatics", 20)) : cleanSpeechmaticsKey(key);
  if (usingRoom) await assertRoomTicket(userId, ticketId);
  const request: SmRequest = async (path, init) => {
    const method = init?.method ?? "GET";
    let body: FormData | undefined;
    if (method === "POST") {
      body = new FormData();
      body.append("config", JSON.stringify(init?.config ?? {}));
    }
    let response: Response;
    try {
      response = await fetch(`${PROVIDERS.speechmatics.api}${path}`, {
        method,
        headers: { Authorization: authHeader("speechmatics", real) },
        ...(body ? { body } : {}),
        signal: AbortSignal.timeout(REQUEST_MS),
      });
    } catch {
      throw new Error("Không kết nối được Speechmatics.");
    }
    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
    return { status: response.status, payload };
  };
  return { request, usingRoom };
}

/** Lệnh 1: gửi link, trả mã job ngay (vài giây). */
export async function startSpeechmaticsAsr(userId: string, input: SpeechmaticsAsrInput): Promise<SpeechmaticsStartResult> {
  await takeRate(`sm-asr:${userId}`, 30, 60);
  const problem = directFileUrlProblem(input.url);
  if (problem) throw new Error(problem);
  const config = speechmaticsJobConfig({ audioUrl: input.url, appModel: input.model, language: input.language });
  const { request } = await prepare(userId, input.key, input.ticketId);
  return { jobId: await startSpeechmaticsJob(request, config) };
}

/** Lệnh 2: hỏi một lần. Xong thì trừ Token dịch đúng một lần (job đã xóa nên hỏi lại sẽ lỗi, không trừ lần hai). */
export async function stepSpeechmaticsAsr(userId: string, input: SpeechmaticsStepInput): Promise<SpeechmaticsStepResult> {
  await takeRate(`sm-step:${userId}`, 600, 60);
  const { request, usingRoom } = await prepare(userId, input.key, input.ticketId);
  const step = await stepSpeechmaticsJob(request, input.jobId);
  if (step.state === "running") return step;
  const done = sentencesFromSpeechmatics(step.payload, input.language);
  if (usingRoom && input.ticketId) {
    const { loadSpeechmaticsRows } = await import("@/lib/sub/speechmatics-board.server");
    const { getSql } = await import("@/lib/db");
    const { chargeRoomAsr } = await import("@/lib/room-asr.server");
    const rows = await loadSpeechmaticsRows(await getSql());
    await chargeRoomAsr({ userId, ticketId: input.ticketId, seconds: done.seconds, model: input.model, rows });
  }
  return { state: "done", ...done };
}
