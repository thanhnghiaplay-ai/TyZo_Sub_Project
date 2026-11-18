import { requireOpenAccount, takeRate } from "@/lib/guard.server";
import { requireServiceOpen } from "@/lib/service-status.server";
import { assemblyaiSubmitBody, cleanAssemblyaiKey, sentencesFromAssemblyai, type AaiSentence } from "@/lib/sub/assemblyai";
import { runAssemblyaiJob, type AaiRequest } from "@/lib/sub/assemblyai-poll";
import { directFileUrlProblem } from "@/lib/sub/ali-filetrans";
import { authHeader, PROVIDERS } from "@/lib/sub/provider";

export type AssemblyaiAsrInput = { url: string; language: string; model: string; key: string; ticketId?: string };
export type AssemblyaiAsrResult = { sentences: AaiSentence[]; seconds: number };

/** Tổng thời gian chờ một file. Quá hạn thì báo lỗi rõ, không treo hàm máy chủ. */
const DEADLINE_MS = 110_000;
/** 3 giây một lần hỏi = 20 lần mỗi phút, dưới mức 60 lần mỗi phút mà AssemblyAI cho phép. */
const INTERVAL_MS = 3_000;
const REQUEST_MS = 20_000;

/**
 * Nhận dạng cả file từ link công khai. Key "room" = key phòng ở cửa Trả theo lượt (cần phiếu giữ chỗ, trừ Token dịch
 * theo số giây thực, giá gốc của nhà). Key khách: không lưu, không tính tiền phòng.
 */
export async function runAssemblyaiAsr(userId: string, input: AssemblyaiAsrInput): Promise<AssemblyaiAsrResult> {
  await requireOpenAccount(userId);
  await requireServiceOpen("normal");
  await takeRate(`aai-asr:${userId}`, 30, 60);
  const usingRoom = input.key === "room";
  const { assertRoomTicket, roomKeyOf } = await import("@/lib/room-asr.server");
  const key = usingRoom ? cleanAssemblyaiKey(await roomKeyOf("assemblyai_key", "AssemblyAI", 20)) : cleanAssemblyaiKey(input.key);
  if (usingRoom) await assertRoomTicket(userId, input.ticketId);
  const problem = directFileUrlProblem(input.url);
  if (problem) throw new Error(problem);
  const body = assemblyaiSubmitBody({ audioUrl: input.url, appModel: input.model, language: input.language });

  const request: AaiRequest = async (path, init) => {
    let response: Response;
    try {
      response = await fetch(`${PROVIDERS.assemblyai.api}${path}`, {
        method: init?.method ?? "GET",
        headers: { authorization: authHeader("assemblyai", key), ...(init?.body ? { "content-type": "application/json" } : {}) },
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

  const finished = await runAssemblyaiJob({ request, body, deadlineMs: DEADLINE_MS, intervalMs: INTERVAL_MS });
  const done = sentencesFromAssemblyai(finished, input.language);
  if (usingRoom && input.ticketId) {
    const { loadAssemblyaiRows } = await import("@/lib/sub/assemblyai-board.server");
    const { getSql } = await import("@/lib/db");
    const { chargeRoomAsr } = await import("@/lib/room-asr.server");
    const rows = await loadAssemblyaiRows(await getSql());
    await chargeRoomAsr({ userId, ticketId: input.ticketId, seconds: done.seconds, model: input.model, rows });
  }
  return done;
}
