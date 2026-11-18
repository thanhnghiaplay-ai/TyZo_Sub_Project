import { requireOpenAccount, takeRate } from "@/lib/guard.server";
import { requireServiceOpen } from "@/lib/service-status.server";
import { cleanSpeechmaticsKey, sentencesFromSpeechmatics, speechmaticsJobConfig, type SmSentence } from "@/lib/sub/speechmatics";
import { runSpeechmaticsJob, type SmRequest } from "@/lib/sub/speechmatics-poll";
import { directFileUrlProblem } from "@/lib/sub/ali-filetrans";
import { authHeader, PROVIDERS } from "@/lib/sub/provider";

export type SpeechmaticsAsrInput = { url: string; language: string; model: string; key: string; ticketId?: string };
export type SpeechmaticsAsrResult = { sentences: SmSentence[]; seconds: number };

/** Tổng thời gian chờ một file. Quá hạn thì báo lỗi rõ, không treo hàm máy chủ. */
const DEADLINE_MS = 110_000;
/** Nhịp hỏi trạng thái job. */
const INTERVAL_MS = 3_000;
const REQUEST_MS = 20_000;

/**
 * Nhận dạng cả file từ link công khai. Key "room" = key phòng ở cửa Trả theo lượt (cần phiếu giữ chỗ, trừ Token dịch
 * theo số giây thực, giá gốc của nhà). Key khách: không lưu, không tính tiền phòng.
 */
export async function runSpeechmaticsAsr(userId: string, input: SpeechmaticsAsrInput): Promise<SpeechmaticsAsrResult> {
  await requireOpenAccount(userId);
  await requireServiceOpen("normal");
  await takeRate(`sm-asr:${userId}`, 30, 60);
  const usingRoom = input.key === "room";
  const { assertRoomTicket, roomKeyOf } = await import("@/lib/room-asr.server");
  const key = usingRoom ? cleanSpeechmaticsKey(await roomKeyOf("speechmatics_key", "Speechmatics", 20)) : cleanSpeechmaticsKey(input.key);
  if (usingRoom) await assertRoomTicket(userId, input.ticketId);
  const problem = directFileUrlProblem(input.url);
  if (problem) throw new Error(problem);
  const config = speechmaticsJobConfig({ audioUrl: input.url, appModel: input.model, language: input.language });

  const request: SmRequest = async (path, init) => {
    const method = init?.method ?? "GET";
    let body: FormData | undefined;
    if (method === "POST") {
      // Multipart: trường `config` là JSON. Không đặt Content-Type tay để fetch tự thêm ranh giới.
      body = new FormData();
      body.append("config", JSON.stringify(init?.config ?? {}));
    }
    let response: Response;
    try {
      response = await fetch(`${PROVIDERS.speechmatics.api}${path}`, {
        method,
        headers: { Authorization: authHeader("speechmatics", key) },
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

  const transcript = await runSpeechmaticsJob({ request, config, deadlineMs: DEADLINE_MS, intervalMs: INTERVAL_MS });
  const done = sentencesFromSpeechmatics(transcript, input.language);
  if (usingRoom && input.ticketId) {
    const { loadSpeechmaticsRows } = await import("@/lib/sub/speechmatics-board.server");
    const { getSql } = await import("@/lib/db");
    const { chargeRoomAsr } = await import("@/lib/room-asr.server");
    const rows = await loadSpeechmaticsRows(await getSql());
    await chargeRoomAsr({ userId, ticketId: input.ticketId, seconds: done.seconds, model: input.model, rows });
  }
  return done;
}
