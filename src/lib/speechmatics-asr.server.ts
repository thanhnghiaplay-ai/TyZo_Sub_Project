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
 * Nhận dạng cả file từ link công khai bằng key của khách (không lưu, không tính tiền phòng).
 * Key "room" (cửa Trả theo lượt) CHƯA mở: chưa có bảng giá Speechmatics để trừ Token dịch (PROVIDERS.md bước 6 và 7),
 * nên chặn thẳng ở đây để không có lượt chạy miễn phí bằng key phòng.
 */
export async function runSpeechmaticsAsr(userId: string, input: SpeechmaticsAsrInput): Promise<SpeechmaticsAsrResult> {
  await requireOpenAccount(userId);
  await requireServiceOpen("normal");
  await takeRate(`sm-asr:${userId}`, 30, 60);
  if (input.key === "room") throw new Error("Speechmatics chưa mở cho cửa Trả theo lượt. Hãy dùng key của bạn.");
  const key = cleanSpeechmaticsKey(input.key);
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
  return sentencesFromSpeechmatics(transcript, input.language);
}
