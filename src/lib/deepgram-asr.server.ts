import { requireOpenAccount, takeRate } from "@/lib/guard.server";
import { requireServiceOpen } from "@/lib/service-status.server";
import { directFileUrlProblem } from "@/lib/sub/ali-filetrans";
import { cleanDeepgramKey, deepgramErrorText, deepgramListenUrl, sentencesFromDeepgram, type DgSentence } from "@/lib/sub/deepgram";
import { authHeader } from "@/lib/sub/provider";

export type DeepgramAsrInput = { url: string; language: string; key: string; ticketId?: string };
export type DeepgramAsrResult = { sentences: DgSentence[]; seconds: number };

/** Deepgram trả kết quả ngay trong một yêu cầu. Quá hạn này thì báo lỗi rõ, không treo. */
const WAIT_MS = 110_000;

/**
 * Nhận dạng cả file từ link công khai. Key "room" = key phòng ở cửa Trả theo lượt (cần phiếu giữ chỗ, trừ Token dịch theo số giây thực).
 * Key khách: không lưu, không tính tiền phòng.
 */
export async function runDeepgramAsr(userId: string, input: DeepgramAsrInput): Promise<DeepgramAsrResult> {
  await requireOpenAccount(userId);
  await requireServiceOpen("normal");
  await takeRate(`dg-asr:${userId}`, 30, 60);
  const usingRoom = input.key === "room";
  const { assertRoomTicket, roomKeyOf } = await import("@/lib/room-asr.server");
  const key = usingRoom ? cleanDeepgramKey(await roomKeyOf("deepgram_key", "Deepgram", 20)) : cleanDeepgramKey(input.key);
  if (usingRoom) await assertRoomTicket(userId, input.ticketId);
  const problem = directFileUrlProblem(input.url);
  if (problem) throw new Error(problem);

  let response: Response;
  try {
    response = await fetch(deepgramListenUrl(input.language), {
      method: "POST",
      headers: { Authorization: authHeader("deepgram", key), "Content-Type": "application/json" },
      body: JSON.stringify({ url: input.url.trim() }),
      signal: AbortSignal.timeout(WAIT_MS),
    });
  } catch (error) {
    if ((error as { name?: string })?.name === "TimeoutError") throw new Error("Deepgram trả lời quá lâu. Hãy thử file ngắn hơn hoặc chạy lại.");
    throw new Error("Không kết nối được Deepgram.");
  }
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) throw new Error(deepgramErrorText(response.status, payload));
  const done = sentencesFromDeepgram(payload);
  if (usingRoom && input.ticketId) {
    const { loadDeepgramRows } = await import("@/lib/sub/deepgram-board.server");
    const { getSql } = await import("@/lib/db");
    const { chargeRoomAsr } = await import("@/lib/room-asr.server");
    const { DEEPGRAM_ASR } = await import("@/lib/sub/deepgram");
    const rows = await loadDeepgramRows(await getSql());
    await chargeRoomAsr({ userId, ticketId: input.ticketId, seconds: done.seconds, model: DEEPGRAM_ASR, rows, deskKey: "deepgram_desk" });
  }
  return done;
}
