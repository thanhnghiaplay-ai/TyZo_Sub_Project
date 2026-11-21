import { ELEVEN_TTS_ID, type ElevenVoice } from "./eleven-voice.ts";

/**
 * Gọi cửa giọng đọc ElevenLabs của phòng (/api/room-elevenlabs) từ trình duyệt.
 * key "room": key phòng, trừ Token dịch ở máy chủ. Key khác: key ElevenLabs của khách, chỉ đi qua máy chủ, không lưu.
 */
function headersFor(path: string, key: string): Record<string, string> {
  return { "Content-Type": "application/json", "x-eleven-path": path, ...(key && key !== "room" ? { "x-user-key": key } : {}) };
}

async function messageOf(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: { message?: string } };
    return data?.error?.message || fallback;
  } catch {
    return fallback;
  }
}

export async function speakEleven(input: { key: string; voice: string; lang: string; text: string; signal?: AbortSignal }): Promise<Blob> {
  const timeout = AbortSignal.timeout(60_000);
  const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetch("/api/room-elevenlabs", {
      method: "POST",
      headers: headersFor("/audio/speech", input.key),
      body: JSON.stringify({ model: ELEVEN_TTS_ID, input: input.text, voice: input.voice, lang: input.lang }),
      signal,
    });
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError" && input.signal?.aborted) throw error;
    throw new Error("Giọng đọc ElevenLabs: không kết nối được máy chủ.");
  }
  if (!response.ok) throw new Error(await messageOf(response, `Giọng đọc ElevenLabs lỗi (${response.status}).`));
  return response.blob();
}

/** Danh sách giọng của key (key phòng khi key = "room"). */
export async function listElevenVoices(key: string): Promise<ElevenVoice[]> {
  let response: Response;
  try {
    response = await fetch("/api/room-elevenlabs", { method: "POST", headers: headersFor("/voices", key), body: "{}", signal: AbortSignal.timeout(30_000) });
  } catch {
    throw new Error("Không đọc được danh sách giọng ElevenLabs.");
  }
  if (!response.ok) throw new Error(await messageOf(response, "Không đọc được danh sách giọng ElevenLabs."));
  const data = (await response.json()) as { voices?: ElevenVoice[] };
  return Array.isArray(data.voices) ? data.voices : [];
}
