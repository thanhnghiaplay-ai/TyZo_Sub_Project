/**
 * KHUÔN CHUNG cho mọi nhà nhận dạng. Pipeline (use-pipeline.ts) chỉ gọi qua khuôn này, không viết `if` theo tên nhà.
 * Thêm nhà mới: tạo một tệp trong thư mục này theo khuôn, rồi khai trong `index.ts`. Bỏ một nhà: xóa tệp và dòng khai.
 */
import type { PackedAudio } from "@/lib/sub/codec";
import type { transcribeGroq } from "@/lib/sub/groq";
import type { ProviderId } from "@/lib/sub/provider";
import type { AsrModel, Seg } from "@/lib/sub/types";

/** Kết quả nhận dạng một đoạn, dạng Whisper (câu có giờ, có thể kèm mốc từng từ). Mọi nhà trả về đúng dạng này. */
export type ChunkResult = Awaited<ReturnType<typeof transcribeGroq>>;

export type ChunkInput = {
  packed: PackedAudio;
  /** Key của khách, hoặc "room" khi trả theo lượt. */
  key: string;
  language: string;
  prompt: string;
  model: AsrModel;
  signal: AbortSignal;
  gate: { blockedUntil: number };
  onWait?: (message: string) => void;
  ticket?: string | null;
};

export type LinkInput = {
  url: string;
  language: string;
  key: string;
  ticketId?: string | null;
  signal: AbortSignal;
  onWait?: (message: string) => void;
};

type AsrBase = {
  id: ProviderId;
  /** Chỉ chạy ở cửa Trả theo lượt (không có ở Thuê phòng). */
  turnOnly: boolean;
};

/** Nhà nhận từng đoạn đã cắt trên máy khách (Groq Whisper, TyZo). */
export type ChunkAsr = AsrBase & {
  intake: "chunks";
  /** Số đoạn gửi cùng lúc. null = theo cài đặt luồng của khách. */
  parallel: number | null;
  transcribe(input: ChunkInput): Promise<ChunkResult>;
};

/** Nhà nhận cả tệp qua link tải thẳng (Alibaba Filetrans). */
export type LinkAsr = AsrBase & {
  intake: "link";
  recognize(input: LinkInput): Promise<Seg[]>;
};

export type AsrRunner = ChunkAsr | LinkAsr;
