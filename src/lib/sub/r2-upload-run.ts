import { r2Remove, r2Upload } from "@/lib/r2-upload";
import { putWithRetry, xhrPutSend } from "@/lib/sub/r2-put";

export type R2Uploaded = { key: string; url: string };

/** Xin link ký ở máy chủ rồi tải thẳng âm thanh lên R2 (không qua máy chủ phòng). Trả link đọc cho nhà nhận dạng. */
export async function uploadAudioToR2(
  blob: Blob,
  options: { signal?: AbortSignal; onProgress?: (sent: number, total: number) => void } = {},
): Promise<R2Uploaded> {
  const contentType = blob.type || "audio/wav";
  const grant = await r2Upload({ data: { size: blob.size, contentType } });
  await putWithRetry(xhrPutSend(grant.putUrl, blob, grant.contentType, options.signal), {
    signal: options.signal,
    onProgress: options.onProgress,
  });
  return { key: grant.key, url: grant.getUrl };
}

/** Xóa tệp tạm. Không bao giờ ném lỗi: xóa hỏng thì lifecycle 1 ngày của bucket dọn. */
export async function removeAudioFromR2(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    await r2Remove({ data: { key } });
  } catch {
    /* bỏ qua */
  }
}
