import { audioBufferTo16k } from "@/lib/sub/codec";
import { abortError } from "@/lib/sub/groq";
import { describeDecodeFailure, SNIFF_BYTES } from "@/lib/sub/media-sniff";
import { looksLikePageLink } from "@/lib/sub/mp4";
import { isSilentChunk, MAX_BYTES, MAX_MINUTES } from "@/lib/sub/text";

/** Tải video/âm thanh từ tệp hoặc link và giải mã về 16 kHz cho nhận dạng. Tách từ use-pipeline.ts (23/11/2026). */

export async function loadBlob(file: File | null, url: string, signal: AbortSignal, status: (message: string) => void) {
  if (file) return file;
  if (!/^https?:\/\//i.test(url)) throw new Error("Link phải bắt đầu bằng http:// hoặc https://.");
  if (looksLikePageLink(url))
    throw new Error("Link này là trang video, không phải file mp4/mp3 trực tiếp. Hãy tải video về máy rồi chọn file.");
  if (/\.m3u8(\?|#|$)/i.test(url)) throw new Error("Link .m3u8 (luồng HLS) chưa hỗ trợ. Hãy dùng link mp4/mkv/mp3 trực tiếp.");
  let response: Response;
  try {
    response = await fetch(url, { signal, mode: "cors", credentials: "omit" });
  } catch (error) {
    if (signal.aborted || (error as { name?: string })?.name === "AbortError") throw abortError();
    throw new Error("Video vẫn phát được nhưng máy chủ chặn CORS nên không lấy được âm thanh. Hãy tải file về máy rồi chọn file.");
  }
  if (!response.ok) throw new Error(`Không tải được link video: HTTP ${response.status}.`);
  const type = response.headers.get("content-type") || "";
  if (/text\/html|application\/json|text\/plain/.test(type))
    throw new Error("Link trả về một trang web, không phải file video hoặc âm thanh.");
  const total = Number(response.headers.get("content-length")) || 0;
  const tooBig = "File lớn hơn 1 GB. Hãy tách riêng âm thanh bằng ffmpeg rồi chọn vào ô Âm thanh riêng.";
  if (total > MAX_BYTES) throw new Error(tooBig);
  if (!response.body?.getReader) return response.blob();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    if (got > MAX_BYTES) {
      reader.cancel().catch(() => {});
      throw new Error(tooBig);
    }
    status(`Đang tải video… ${(got / 1048576).toFixed(0)} MB${total ? ` / ${(total / 1048576).toFixed(0)} MB (${Math.round((got / total) * 100)}%)` : ""}`);
  }
  const parts: BlobPart[] = chunks.map((chunk) => {
    const copy = new ArrayBuffer(chunk.byteLength);
    new Uint8Array(copy).set(chunk);
    return copy;
  });
  return new Blob(parts, { type });
}

export function waitForMetadata(video: HTMLVideoElement | null) {
  if (!video || video.readyState >= 1) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", ok);
      video.removeEventListener("error", bad);
    };
    const ok = () => {
      cleanup();
      resolve();
    };
    const bad = () => {
      cleanup();
      reject(new Error("Không đọc được file media."));
    };
    video.addEventListener("loadedmetadata", ok);
    video.addEventListener("error", bad);
  });
}

export async function decodeTo16k(blob: Blob, audioContext: AudioContext, streamWhy = "") {
  if (blob.size > MAX_BYTES)
    throw new Error("File lớn hơn 1 GB và không đọc theo đoạn được. Hãy chọn thêm Âm thanh riêng.");
  let encoded: ArrayBuffer;
  try {
    encoded = await blob.arrayBuffer();
  } catch {
    throw new Error("Không đọc được dữ liệu file.");
  }
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(encoded.slice(0));
  } catch {
    // Đọc vài MB đầu để nói rõ file là gì (MKV, AC3, DTS…) thay vì một câu chung chung.
    let head = new Uint8Array(0);
    try {
      head = new Uint8Array(await blob.slice(0, SNIFF_BYTES).arrayBuffer());
    } catch {
      /* không đọc được thì báo theo nội dung đã có */
    }
    throw new Error(describeDecodeFailure({ fileName: blob instanceof File ? blob.name : "", head, hint: streamWhy }));
  }
  if (!audioBuffer.duration || !Number.isFinite(audioBuffer.duration)) throw new Error("Không đọc được thời lượng âm thanh.");
  if (audioBuffer.duration > MAX_MINUTES * 60)
    throw new Error(`File dài hơn ${MAX_MINUTES} phút sẽ làm đầy bộ nhớ máy. Hãy cắt thành đoạn ngắn hơn.`);
  const samples = await audioBufferTo16k(audioBuffer);
  if (!samples.length) throw new Error("Không tìm thấy âm thanh trong file.");
  if (isSilentChunk(samples)) throw new Error("Không nghe thấy tiếng trong file. Hãy tăng âm lượng hoặc chọn file khác.");
  return samples;
}
