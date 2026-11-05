import { createServerFn } from "@tanstack/react-start";

type EdgeRequest = {
  text: string;
  voice: string;
  rate: string;
  pitch: string;
};

const VOICE_RE = /^[a-z]{2,3}-[A-Z]{2}-[A-Za-z]+Neural$/;
const PROSODY_RE = /^(default|[+-]\d{1,3}%|[+-]\d{1,3}Hz)$/;

function clean(input: EdgeRequest): EdgeRequest {
  const text = String(input?.text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
  if (!text) throw new Error("Không có chữ để đọc.");
  const voice = VOICE_RE.test(input.voice) ? input.voice : "vi-VN-HoaiMyNeural";
  const rate = PROSODY_RE.test(input.rate) ? input.rate : "default";
  const pitch = PROSODY_RE.test(input.pitch) ? input.pitch : "default";
  return { text, voice, rate, pitch };
}

export const synthesizeEdge = createServerFn({ method: "POST" })
  .validator((input: EdgeRequest) => clean(input))
  .handler(async ({ data }) => {
    const { EdgeTTS } = await import("node-edge-tts");
    const lang = data.voice.split("-").slice(0, 2).join("-");
    const tts = new EdgeTTS({
      voice: data.voice,
      lang,
      rate: data.rate,
      pitch: data.pitch,
      volume: "default",
      timeout: 12000,
    });
    const chunks: Buffer[] = [];
    for await (const chunk of tts.streamAudio(data.text)) {
      if (Buffer.isBuffer(chunk)) chunks.push(chunk);
    }
    const audio = Buffer.concat(chunks);
    if (audio.length < 32) throw new Error("Giọng neural không trả về tiếng.");
    return { audio: audio.toString("base64"), voice: data.voice };
  });
