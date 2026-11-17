import { auraModel, isAuraModel } from "./aura.ts";

/**
 * Đọc một mảnh chữ bằng Aura-2 qua cửa của phòng. Trừ Token dịch ở máy chủ (xem /api/room-deepgram).
 * Chạy ở trình duyệt, cần đã đăng nhập. Lỗi trả về câu tiếng Việt từ máy chủ (ví dụ chưa đủ Token dịch).
 */
export async function speakAura(input: { voice: string; lang: "en" | "es"; text: string; signal?: AbortSignal }): Promise<Blob> {
  const model = auraModel(input.voice, input.lang);
  if (!isAuraModel(model)) throw new Error("Giọng Aura không đúng.");
  const timeout = AbortSignal.timeout(60_000);
  const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch("/api/room-deepgram", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-deepgram-path": "/audio/speech" },
      body: JSON.stringify({ model, input: input.text }),
      signal,
    });
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError" && input.signal?.aborted) throw error;
    throw new Error("Giọng đọc Aura: không kết nối được máy chủ.");
  }
  if (!response.ok) {
    let message = `Giọng đọc Aura lỗi (${response.status}).`;
    try {
      const data = (await response.json()) as { error?: { message?: string } };
      if (data?.error?.message) message = data.error.message;
    } catch {
      /* giữ câu mặc định */
    }
    throw new Error(message);
  }
  return response.blob();
}
