/**
 * TyZo Modal: máy GPU của phòng nhận dạng từng đoạn (luồng Nhanh hoặc Kỹ). Chỉ ở cửa Trả theo lượt, cần phiếu lượt.
 * Gói WAV gửi lên máy chủ (tyzo-modal-call.ts), máy chủ giữ phiếu, trừ Token theo giây GPU thật.
 */
import { roomTicketId } from "@/lib/sub/room-ticket";
import type { ChunkAsr } from "./types";

/** Tối đa 9 đoạn cùng lúc (gói Modal Starter cho 10 GPU, chừa 1 cho máy mô hình chữ). */
export const TYZO_PARALLEL = 9;

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
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
    const audio = await toBase64(input.packed.wav?.() ?? input.packed.blob);
    const { callTyzoModal } = await import("@/lib/tyzo-modal-call");
    const profile = input.model === "tyzo-modal-ky" ? "ky" : "nhanh";
    const result = await callTyzoModal({ data: { ticket: room, audio, language: input.language, profile }, signal: input.signal });
    return { segments: result.segments, language: input.language || undefined, words: undefined };
  },
};
