import { requireOpenAccount, takeRate } from "@/lib/guard.server";
import { requireServiceOpen } from "@/lib/service-status.server";
import { cleanSonioxKey, sentencesFromSoniox, sonioxSubmitBody, type SonioxSentence } from "@/lib/sub/soniox";
import { runSonioxJob, type SonioxRequest } from "@/lib/sub/soniox-poll";
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
 * Nhận dạng cả file từ link công khai bằng key của khách (không lưu, không tính tiền phòng).
 * Key "room" (cửa Trả theo lượt) CHƯA mở: chưa có bảng giá Soniox để trừ Token dịch (PROVIDERS.md bước 6 và 7),
 * nên chặn thẳng ở đây để không có lượt chạy miễn phí bằng key phòng.
 */
export async function runSonioxAsr(userId: string, input: SonioxAsrInput): Promise<SonioxAsrResult> {
  await requireOpenAccount(userId);
  await requireServiceOpen("normal");
  await takeRate(`sx-asr:${userId}`, 30, 60);
  if (input.key === "room") throw new Error("Soniox chưa mở cho cửa Trả theo lượt. Hãy dùng key của bạn.");
  const key = cleanSonioxKey(input.key);
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
  return sentencesFromSoniox(transcript, input.language);
}
