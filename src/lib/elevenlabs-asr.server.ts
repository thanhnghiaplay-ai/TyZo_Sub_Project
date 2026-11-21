import { requireOpenAccount, takeRate } from "@/lib/guard.server";
import { requireServiceOpen } from "@/lib/service-status.server";
import { directFileUrlProblem } from "@/lib/sub/ali-filetrans";
import { cleanElevenlabsKey, elevenlabsErrorText, elevenlabsFormFields, sentencesFromElevenlabs, type ElevenlabsSentence } from "@/lib/sub/elevenlabs";
import { authHeaders, PROVIDERS } from "@/lib/sub/provider";

export type ElevenlabsAsrInput = { url: string; language: string; model: string; key: string; ticketId?: string };
export type ElevenlabsAsrResult = { sentences: ElevenlabsSentence[]; seconds: number };

/**
 * ElevenLabs Scribe trả kết quả ngay trong một yêu cầu (đường hỏi lại cần webhook, app không dùng). Quá hạn này thì báo lỗi rõ, không treo.
 * Hàm Vercel Hobby chạy tối đa 300 giây, chừa 30 giây cho kiểm tài khoản và trừ Token dịch. Chờ I/O không tính cước CPU.
 */
const WAIT_MS = 270_000;

/**
 * Nhận dạng cả file từ link công khai. Key "room" = key phòng ở cửa Trả theo lượt (cần phiếu giữ chỗ, trừ Token dịch
 * theo số giây thực, giá gốc của nhà). Key khách: không lưu, không tính tiền phòng.
 */
export async function runElevenlabsAsr(userId: string, input: ElevenlabsAsrInput): Promise<ElevenlabsAsrResult> {
  await requireOpenAccount(userId);
  await requireServiceOpen("normal");
  await takeRate(`el-asr:${userId}`, 30, 60);
  const usingRoom = input.key === "room";
  const { assertRoomTicket, roomKeyOf } = await import("@/lib/room-asr.server");
  const key = usingRoom
    ? cleanElevenlabsKey(await roomKeyOf(PROVIDERS.elevenlabs.settings.key, "ElevenLabs", 20))
    : cleanElevenlabsKey(input.key);
  if (usingRoom) await assertRoomTicket(userId, input.ticketId);
  const problem = directFileUrlProblem(input.url);
  if (problem) throw new Error(problem);
  const form = new FormData();
  for (const [name, value] of elevenlabsFormFields({ audioUrl: input.url, appModel: input.model, language: input.language })) form.append(name, value);

  let response: Response;
  try {
    // Không đặt Content-Type: fetch tự thêm ranh giới multipart.
    response = await fetch(`${PROVIDERS.elevenlabs.api}/speech-to-text`, {
      method: "POST",
      headers: authHeaders("elevenlabs", key),
      body: form,
      signal: AbortSignal.timeout(WAIT_MS),
    });
  } catch (error) {
    if ((error as { name?: string })?.name === "TimeoutError") throw new Error("ElevenLabs trả lời quá lâu. Hãy thử file ngắn hơn hoặc chạy lại.");
    throw new Error("Không kết nối được ElevenLabs.");
  }
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  if (!response.ok) throw new Error(elevenlabsErrorText(response.status, payload));
  const done = sentencesFromElevenlabs(payload, input.language);
  if (usingRoom && input.ticketId) {
    const { loadElevenlabsRows } = await import("@/lib/sub/elevenlabs-board.server");
    const { getSql } = await import("@/lib/db");
    const { chargeRoomAsr } = await import("@/lib/room-asr.server");
    const rows = await loadElevenlabsRows(await getSql());
    await chargeRoomAsr({ userId, ticketId: input.ticketId, seconds: done.seconds, model: input.model, rows });
  }
  return done;
}
