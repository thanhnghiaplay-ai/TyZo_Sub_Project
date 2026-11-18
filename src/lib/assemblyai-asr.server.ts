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
 * Nhận dạng cả file từ link công khai bằng key của khách (không lưu, không tính tiền phòng).
 * Key "room" (cửa Trả theo lượt) CHƯA mở: chưa có bảng giá AssemblyAI để trừ Token dịch (PROVIDERS.md bước 6 và 7),
 * nên chặn thẳng ở đây để không có lượt chạy miễn phí bằng key phòng.
 */
export async function runAssemblyaiAsr(userId: string, input: AssemblyaiAsrInput): Promise<AssemblyaiAsrResult> {
  await requireOpenAccount(userId);
  await requireServiceOpen("normal");
  await takeRate(`aai-asr:${userId}`, 30, 60);
  if (input.key === "room") throw new Error("AssemblyAI chưa mở cho cửa Trả theo lượt. Hãy dùng key của bạn.");
  const key = cleanAssemblyaiKey(input.key);
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
  return sentencesFromAssemblyai(finished, input.language);
}
