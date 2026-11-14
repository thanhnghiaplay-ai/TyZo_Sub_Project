import { readUsage, type LiveUsage } from "./live-cost.ts";
import { LIVE_MODEL_35, LIVE_MODEL_38 } from "./live-price.ts";

/**
 * Giao thức Qwen LiveTranslate. Hai thế hệ khác nhau nên gom một chỗ:
 * 3.8: output_modalities, chữ gốc luôn bật, nhận diện người nói, sự kiện *.delta.
 * 3.5: modalities, chữ gốc nhờ model ASR riêng, sự kiện *.text kèm `stash` (chữ tạm).
 */
export type QwenGen = "3.8" | "3.5";

export function genOf(model: string): QwenGen | null {
  if (model === LIVE_MODEL_38) return "3.8";
  if (model === LIVE_MODEL_35) return "3.5";
  return null;
}

export type SessionOptions = {
  model: string;
  /** Mã ngôn ngữ đích, ví dụ "en". */
  target: string;
  /** Mã ngôn ngữ nguồn. Bỏ trống để tự nhận diện. */
  source?: string;
  /** Lấy cả tiếng dịch. Tắt thì chỉ nhận chữ. */
  audio: boolean;
  voice?: string;
  hotwords?: Record<string, string>;
};

export function buildSessionUpdate(options: SessionOptions): Record<string, unknown> | null {
  const gen = genOf(options.model);
  if (!gen) return null;
  const modalities = options.audio ? ["text", "audio"] : ["text"];
  const translation: Record<string, unknown> = { language: options.target };
  if (options.hotwords && Object.keys(options.hotwords).length) {
    translation.corpus = { phrases: options.hotwords };
  }
  if (gen === "3.8") {
    const session: Record<string, unknown> = { output_modalities: modalities, translation };
    if (options.voice) session.voice = options.voice;
    return { type: "session.update", session };
  }
  const session: Record<string, unknown> = {
    modalities,
    sample_rate: 16000,
    input_audio_format: "pcm",
    output_audio_format: "pcm",
    translation,
    input_audio_transcription: options.source
      ? { model: "qwen3-asr-flash-realtime", language: options.source }
      : { model: "qwen3-asr-flash-realtime" },
  };
  if (options.voice) session.voice = options.voice;
  return { type: "session.update", session };
}

export function audioAppend(pcm: Uint8Array): string {
  return JSON.stringify({ type: "input_audio_buffer.append", audio: Buffer.from(pcm).toString("base64") });
}

export const SESSION_FINISH = JSON.stringify({ type: "session.finish" });

/** Sự kiện đã chuẩn hóa. Đây là thứ cầu nối gửi cho trình duyệt, không lộ định dạng của nhà cung cấp. */
export type LiveEvent =
  | { kind: "ready" }
  /** `text` là phần đã chốt cộng dồn, `stash` là phần tạm có thể bị viết lại. */
  | { kind: "source"; id: string; text: string; stash: string; final: boolean }
  | { kind: "translation"; id: string; text: string; stash: string; final: boolean }
  | { kind: "pair"; translationId: string; sourceId: string }
  | { kind: "speaker"; sourceId: string; speakerId: string }
  | { kind: "audio"; base64: string }
  | { kind: "usage"; usage: LiveUsage; ok: boolean }
  | { kind: "error"; message: string }
  | { kind: "finished" };

type Raw = Record<string, unknown>;

const str = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * Với kiểu *.delta thì `append` là true: nối thêm vào chữ đã có.
 * Bộ gộp chữ (live-transcript) biết cách xử lý cả hai kiểu.
 */
export type DeltaEvent = { kind: "source-delta" | "translation-delta"; id: string; delta: string };
export type ParsedEvent = LiveEvent | DeltaEvent;

export function parseServerEvent(raw: unknown): ParsedEvent[] {
  if (!raw || typeof raw !== "object") return [];
  const event = raw as Raw;
  const type = str(event.type);
  const id = str(event.item_id);
  switch (type) {
    case "session.updated":
      return [{ kind: "ready" }];
    case "session.finished":
      return [{ kind: "finished" }];
    case "error": {
      const error = (event.error ?? {}) as Raw;
      return [{ kind: "error", message: str(error.message) || "Nhà cung cấp báo lỗi." }];
    }
    case "response.text.delta":
    case "response.audio_transcript.delta":
      return id ? [{ kind: "translation-delta", id, delta: str(event.delta) }] : [];
    case "response.text.text":
    case "response.audio_transcript.text":
      return id ? [{ kind: "translation", id, text: str(event.text), stash: str(event.stash), final: false }] : [];
    case "response.text.done":
      return id ? [{ kind: "translation", id, text: str(event.text), stash: "", final: true }] : [];
    case "response.audio_transcript.done":
      return id ? [{ kind: "translation", id, text: str(event.transcript), stash: "", final: true }] : [];
    case "conversation.item.input_audio_transcription.delta":
      return id ? [{ kind: "source-delta", id, delta: str(event.delta) }] : [];
    case "conversation.item.input_audio_transcription.text":
      return id ? [{ kind: "source", id, text: str(event.text), stash: str(event.stash), final: false }] : [];
    case "conversation.item.input_audio_transcription.completed":
      return id ? [{ kind: "source", id, text: str(event.transcript), stash: "", final: true }] : [];
    case "response.audio.delta":
      return str(event.delta) ? [{ kind: "audio", base64: str(event.delta) }] : [];
    case "input_audio_buffer.speech_started": {
      const speaker = event.speaker_id;
      return id && speaker != null ? [{ kind: "speaker", sourceId: id, speakerId: String(speaker) }] : [];
    }
    case "conversation.item.created": {
      const item = (event.item ?? {}) as Raw;
      const sourceId = str(event.previous_item_id);
      if (str(item.role) !== "assistant" || !sourceId || !str(item.id)) return [];
      return [{ kind: "pair", translationId: str(item.id), sourceId }];
    }
    case "response.done": {
      const response = (event.response ?? {}) as Raw;
      return [{ kind: "usage", usage: readUsage(response.usage), ok: str(response.status) === "completed" }];
    }
    default:
      return [];
  }
}
