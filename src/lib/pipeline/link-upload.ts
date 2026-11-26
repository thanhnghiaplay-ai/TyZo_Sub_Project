/**
 * BƯỚC: đưa tệp trên máy khách lên kho tạm R2 để nhà nhận link (Alibaba Filetrans) đọc được.
 * Âm thanh tách và đóng WAV ngay trên máy khách; phòng xóa tệp trên kho tạm khi lần chạy xong.
 */
import { streamSamples, type Mp4Stream } from "@/lib/sub/mp4";
import { uploadAudioToR2 } from "@/lib/sub/r2-upload-run";
import { SR } from "@/lib/sub/text";
import { packWavFromReader } from "@/lib/sub/wav-stream";

export type LinkUploadInput = {
  pcm: Float32Array | null;
  stream: Mp4Stream | null;
  audioContext: Parameters<typeof streamSamples>[1];
  signal: AbortSignal;
  /** Báo tiến độ cho khách (đã làm tròn 5%). */
  say: (message: string) => void;
  /** false khi khách đã bắt đầu lần chạy khác: dừng, không báo nữa. */
  alive: () => boolean;
};

/** Trả về khóa và link tạm trên R2. null khi lần chạy đã bị thay trước lúc tải lên. */
export async function uploadLocalAudio(input: LinkUploadInput): Promise<{ key: string; url: string } | null> {
  const { pcm, stream, audioContext, signal, say, alive } = input;
  const seconds = pcm ? pcm.length / SR : stream?.dur || 0;
  if (!(seconds > 0)) throw new Error("Không đọc được âm thanh của tệp này.");
  let shown = -1;
  const tell = (label: string, done: number, total: number) => {
    const pct = Math.floor(((done / Math.max(1, total)) * 100) / 5) * 5;
    if (pct === shown) return;
    shown = pct;
    if (alive()) say(`${label} ${pct}%`);
  };
  say("Đang tách âm thanh trên máy…");
  const wav = await packWavFromReader(
    async (from, to) =>
      pcm ? pcm.subarray(Math.max(0, Math.floor(from * SR)), Math.min(pcm.length, Math.floor(to * SR))) : streamSamples(stream!, audioContext, from, to, signal),
    seconds,
    { signal, onProgress: (done, total) => tell("Đang tách âm thanh trên máy…", done, total) },
  );
  if (!alive()) return null;
  shown = -1;
  say("Đang tải âm thanh lên kho tạm…");
  return uploadAudioToR2(wav, { signal, onProgress: (sent, total) => tell("Đang tải âm thanh lên kho tạm…", sent, total) });
}
