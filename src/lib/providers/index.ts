/**
 * Danh sách nhà nhận dạng theo khuôn chung (types.ts). Kiểu Record: thêm nhà vào ProviderId mà quên khai ở đây thì tsc báo lỗi.
 */
import { asrHouse } from "@/lib/sub/asr-house";
import type { ProviderId } from "@/lib/sub/provider";
import type { AsrModel } from "@/lib/sub/types";
import { alibabaAsr } from "./alibaba";
import { groqAsr } from "./groq";
import { tyzoAsr } from "./tyzo";
import type { AsrRunner, ChunkInput, ChunkResult } from "./types";

export const ASR_RUNNERS: Record<ProviderId, AsrRunner> = {
  groq: groqAsr,
  alibaba: alibabaAsr,
  "tyzo-modal": tyzoAsr,
};

/** Nhà chạy model nhận dạng này. Model lạ thì Groq (giữ cách cũ). */
export function asrRunnerOf(model: string): AsrRunner {
  return ASR_RUNNERS[asrHouse(model) ?? "groq"];
}

/** Nhận dạng một đoạn bằng nhà của model. Nhà nhận link không có đường này. */
export async function transcribe(
  packed: ChunkInput["packed"],
  key: string,
  language: string,
  prompt: string,
  model: AsrModel,
  signal: AbortSignal,
  gate: { blockedUntil: number },
  onWait?: (message: string) => void,
  ticket?: string | null,
): Promise<ChunkResult> {
  const runner = asrRunnerOf(model);
  if (runner.intake !== "chunks") throw new Error("Model này nhận cả tệp qua link, không nhận từng đoạn.");
  return runner.transcribe({ packed, key, language, prompt, model, signal, gate, onWait, ticket });
}

export type { AsrRunner, ChunkAsr, LinkAsr } from "./types";
