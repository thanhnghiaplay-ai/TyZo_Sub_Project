import { requireOpenAccount, takeRate } from "@/lib/guard.server";
import { requireServiceOpen } from "@/lib/service-status.server";
import { assemblyaiSubmitBody, cleanAssemblyaiKey, sentencesFromAssemblyai, type AaiSentence } from "@/lib/sub/assemblyai";
import { startAssemblyaiJob, stepAssemblyaiJob, type AaiRequest } from "@/lib/sub/assemblyai-poll";
import { directFileUrlProblem } from "@/lib/sub/ali-filetrans";
import { authHeader, PROVIDERS } from "@/lib/sub/provider";

export type AssemblyaiAsrInput = { url: string; language: string; model: string; key: string; ticketId?: string };
type AssemblyaiAsrResult = { sentences: AaiSentence[]; seconds: number };

const REQUEST_MS = 20_000;

export type AssemblyaiStartResult = { jobId: string };
export type AssemblyaiStepInput = { jobId: string; language: string; model: string; key: string; ticketId?: string };
export type AssemblyaiStepResult = { state: "running" } | ({ state: "done" } & AssemblyaiAsrResult);

async function prepare(userId: string, key: string, ticketId?: string) {
  await requireOpenAccount(userId);
  await requireServiceOpen("normal");
  const usingRoom = key === "room";
  const { assertRoomTicket, roomKeyOf } = await import("@/lib/room-asr.server");
  const real = usingRoom ? cleanAssemblyaiKey(await roomKeyOf("assemblyai_key", "AssemblyAI", 20)) : cleanAssemblyaiKey(key);
  if (usingRoom) await assertRoomTicket(userId, ticketId);
  const request: AaiRequest = async (path, init) => {
    let response: Response;
    try {
      response = await fetch(`${PROVIDERS.assemblyai.api}${path}`, {
        method: init?.method ?? "GET",
        headers: { authorization: authHeader("assemblyai", real), ...(init?.body ? { "content-type": "application/json" } : {}) },
        ...(init?.body ? { body: init.body } : {}),
        signal: AbortSignal.timeout(REQUEST_MS),
      });
    } catch {
      throw new Error("Không kết nối được AssemblyAI.");
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

/** Lệnh 1: gửi link, trả mã bản phiên âm ngay (vài giây). */
export async function startAssemblyaiAsr(userId: string, input: AssemblyaiAsrInput): Promise<AssemblyaiStartResult> {
  await takeRate(`aai-asr:${userId}`, 30, 60);
  const problem = directFileUrlProblem(input.url);
  if (problem) throw new Error(problem);
  const body = assemblyaiSubmitBody({ audioUrl: input.url, appModel: input.model, language: input.language });
  const { request } = await prepare(userId, input.key, input.ticketId);
  return { jobId: await startAssemblyaiJob(request, body) };
}

/** Lệnh 2: hỏi một lần. Xong thì trừ Token dịch đúng một lần (bản phiên âm bị xóa nên hỏi lại sẽ lỗi, không trừ lần hai). */
export async function stepAssemblyaiAsr(userId: string, input: AssemblyaiStepInput): Promise<AssemblyaiStepResult> {
  await takeRate(`aai-step:${userId}`, 600, 60);
  const { request, usingRoom } = await prepare(userId, input.key, input.ticketId);
  const step = await stepAssemblyaiJob(request, input.jobId);
  if (step.state === "running") return step;
  const done = sentencesFromAssemblyai(step.payload, input.language);
  if (usingRoom && input.ticketId) {
    const { loadAssemblyaiRows } = await import("@/lib/sub/assemblyai-board.server");
    const { getSql } = await import("@/lib/db");
    const { chargeRoomAsr } = await import("@/lib/room-asr.server");
    const rows = await loadAssemblyaiRows(await getSql());
    await chargeRoomAsr({ userId, ticketId: input.ticketId, seconds: done.seconds, model: input.model, rows });
  }
  return { state: "done", ...done };
}
