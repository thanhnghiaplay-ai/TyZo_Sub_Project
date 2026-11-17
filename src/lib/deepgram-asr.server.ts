import { requireOpenAccount, takeRate } from "@/lib/guard.server";
import { requireServiceOpen } from "@/lib/service-status.server";
import { directFileUrlProblem } from "@/lib/sub/ali-filetrans";
import { cleanDeepgramKey, deepgramErrorText, deepgramListenUrl, sentencesFromDeepgram, type DgSentence } from "@/lib/sub/deepgram";
import { authHeader } from "@/lib/sub/provider";

export type DeepgramAsrInput = { url: string; language: string; key: string };
export type DeepgramAsrResult = { sentences: DgSentence[]; seconds: number };

/** Deepgram trả kết quả ngay trong một yêu cầu. Quá hạn này thì báo lỗi rõ, không treo. */
const WAIT_MS = 110_000;

/** Nhận dạng cả file từ link công khai bằng key của khách. Không lưu key, không tính tiền phòng. */
export async function runDeepgramAsr(userId: string, input: DeepgramAsrInput): Promise<DeepgramAsrResult> {
  if (input.key === "room") throw new Error("Cửa trả theo lượt chưa nhận dạng bằng Deepgram. Hãy chọn Key của tôi.");
  await requireOpenAccount(userId);
  await requireServiceOpen("normal");
  await takeRate(`dg-asr:${userId}`, 30, 60);
  const key = cleanDeepgramKey(input.key);
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
  return sentencesFromDeepgram(payload);
}
