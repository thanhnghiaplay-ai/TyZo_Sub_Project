import { requireOpenAccount, takeRate } from "@/lib/guard.server";
import { requireServiceOpen } from "@/lib/service-status.server";
import { cleanSonioxKey, sentencesFromSoniox, sonioxSubmitBody, type SonioxSentence } from "@/lib/sub/soniox";
import { runSonioxJob, startSonioxJob, stepSonioxJob, type SonioxRequest } from "@/lib/sub/soniox-poll";
import { directFileUrlProblem } from "@/lib/sub/ali-filetrans";
import { authHeader, PROVIDERS } from "@/lib/sub/provider";

export type SonioxAsrInput = { url: string; language: string; model: string; key: string; ticketId?: string };
export type SonioxAsrResult = { sentences: SonioxSentence[]; seconds: number };

/** Tổng thời gian chờ một file. Quá hạn thì báo lỗi rõ, không treo hàm máy chủ. */
const DEADLINE_MS = 110_000;
/** Nhịp hỏi trạng thái. */
const INTERVAL_MS = 3_000;
const REQUEST_MS = 20_000;

/**
 * Nhận dạng cả file từ link công khai. Key "room" = key phòng ở cửa Trả theo lượt (cần phiếu giữ chỗ, trừ Token dịch
 * theo số giây thực, giá gốc của nhà). Key khách: không lưu, không tính tiền phòng.
 */
export async function runSonioxAsr(userId: string, input: SonioxAsrInput): Promise<SonioxAsrResult> {
  await requireOpenAccount(userId);
  await requireServiceOpen("normal");
  await takeRate(`sx-asr:${userId}`, 30, 60);
  const usingRoom = input.key === "room";
  const { assertRoomTicket, roomKeyOf } = await import("@/lib/room-asr.server");
  const key = usingRoom ? cleanSonioxKey(await roomKeyOf("soniox_key", "Soniox", 20)) : cleanSonioxKey(input.key);
  if (usingRoom) await assertRoomTicket(userId, input.ticketId);
  const problem = directFileUrlProblem(input.url);
  if (problem) throw new Error(problem);
  const body = sonioxSubmitBody({ audioUrl: input.url, appModel: input.model, language: input.language });

  const request: SonioxRequest = async (path, init) => {
    const method = init?.method ?? "GET";
    let response: Response;
    try {
      response = await fetch(`${PROVIDERS.soniox.api}${path}`, {
        method,
        headers: { Authorization: authHeader("soniox", key), ...(init?.body ? { "Content-Type": "application/json" } : {}) },
        ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
        signal: AbortSignal.timeout(REQUEST_MS),
      });
    } catch {
      throw new Error("Không kết nối được Soniox.");
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

  const transcript = await runSonioxJob({ request, body, deadlineMs: DEADLINE_MS, intervalMs: INTERVAL_MS });
  const done = sentencesFromSoniox(transcript, input.language);
  if (usingRoom && input.ticketId) {
    const { loadSonioxRows } = await import("@/lib/sub/soniox-board.server");
    const { getSql } = await import("@/lib/db");
    const { chargeRoomAsr } = await import("@/lib/room-asr.server");
    const rows = await loadSonioxRows(await getSql());
    await chargeRoomAsr({ userId, ticketId: input.ticketId, seconds: done.seconds, model: input.model, rows });
  }
  return done;
}

export type SonioxStartResult = { jobId: string };
export type SonioxStepInput = { jobId: string; language: string; model: string; key: string; ticketId?: string };
export type SonioxStepResult = { state: "running" } | ({ state: "done" } & SonioxAsrResult);

async function prepare(userId: string, key: string, ticketId?: string) {
  await requireOpenAccount(userId);
  await requireServiceOpen("normal");
  const usingRoom = key === "room";
  const { assertRoomTicket, roomKeyOf } = await import("@/lib/room-asr.server");
  const real = usingRoom ? cleanSonioxKey(await roomKeyOf("soniox_key", "Soniox", 20)) : cleanSonioxKey(key);
  if (usingRoom) await assertRoomTicket(userId, ticketId);
  const request: SonioxRequest = async (path, init) => {
    const method = init?.method ?? "GET";
    let response: Response;
    try {
      response = await fetch(`${PROVIDERS.soniox.api}${path}`, {
        method,
        headers: { Authorization: authHeader("soniox", real), ...(init?.body ? { "Content-Type": "application/json" } : {}) },
        ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
        signal: AbortSignal.timeout(REQUEST_MS),
      });
    } catch {
      throw new Error("Không kết nối được Soniox.");
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
export async function startSonioxAsr(userId: string, input: SonioxAsrInput): Promise<SonioxStartResult> {
  await takeRate(`sx-asr:${userId}`, 30, 60);
  const problem = directFileUrlProblem(input.url);
  if (problem) throw new Error(problem);
  const body = sonioxSubmitBody({ audioUrl: input.url, appModel: input.model, language: input.language });
  const { request } = await prepare(userId, input.key, input.ticketId);
  return { jobId: await startSonioxJob(request, body) };
}

/** Lệnh 2: hỏi một lần. Xong thì trừ Token dịch đúng một lần (bản đã xóa nên hỏi lại sẽ lỗi, không trừ lần hai). */
export async function stepSonioxAsr(userId: string, input: SonioxStepInput): Promise<SonioxStepResult> {
  await takeRate(`sx-step:${userId}`, 600, 60);
  const { request, usingRoom } = await prepare(userId, input.key, input.ticketId);
  const step = await stepSonioxJob(request, input.jobId);
  if (step.state === "running") return step;
  const done = sentencesFromSoniox(step.payload, input.language);
  if (usingRoom && input.ticketId) {
    const { loadSonioxRows } = await import("@/lib/sub/soniox-board.server");
    const { getSql } = await import("@/lib/db");
    const { chargeRoomAsr } = await import("@/lib/room-asr.server");
    const rows = await loadSonioxRows(await getSql());
    await chargeRoomAsr({ userId, ticketId: input.ticketId, seconds: done.seconds, model: input.model, rows });
  }
  return { state: "done", ...done };
}
