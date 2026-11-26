/**
 * TyZo Modal: máy GPU của phòng nhận dạng từng đoạn (luồng Nhanh hoặc Kỹ). Chỉ ở cửa Trả theo lượt, cần phiếu lượt.
 * Gói WAV gửi lên máy chủ (tyzo-modal-call.ts), máy chủ giữ phiếu, trừ Token theo giây GPU thật.
 */
import { roomTicketId } from "@/lib/sub/room-ticket";
import type { ChunkAsr } from "./types";

/** Tối đa 9 đoạn cùng lúc (gói Modal Starter cho 10 GPU, chừa 1 cho máy mô hình chữ). */
export const TYZO_PARALLEL = 9;

/** Đọc đoạn âm thanh thành base64. Kiểm toán R6-009: khách bấm hủy thì dừng đọc ngay, báo AbortError. */
function toBase64(blob: Blob, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const aborted = () => Object.assign(new Error("Đã hủy."), { name: "AbortError" });
    if (signal?.aborted) return reject(aborted());
    const reader = new FileReader();
    const stop = () => reader.abort();
    signal?.addEventListener("abort", stop, { once: true });
    const done = () => signal?.removeEventListener("abort", stop);
    reader.onload = () => {
      done();
      resolve(String(reader.result).split(",")[1]);
    };
    reader.onerror = () => {
      done();
      reject(reader.error);
    };
    reader.onabort = () => {
      done();
      reject(aborted());
    };
    reader.readAsDataURL(blob);
  });
}

export const tyzoAsr: ChunkAsr = {
  id: "tyzo-modal",
  intake: "chunks",
  turnOnly: true,
  parallel: TYZO_PARALLEL,
  async transcribe(input) {
    const room = input.ticket ?? roomTicketId();
    if (input.key !== "room" || !room) throw new Error("TyZo Modal cần phiếu Trả theo lượt.");
    const audio = await toBase64(input.packed.wav?.() ?? input.packed.blob, input.signal);
    const { callTyzoModal } = await import("@/lib/tyzo-modal-call");
    const profile = input.model === "tyzo-modal-ky" ? "ky" : "nhanh";
    const result = await callTyzoModal({ data: { ticket: room, audio, language: input.language, profile }, signal: input.signal });
    return { segments: result.segments, language: input.language || undefined, words: undefined };
  },
};
