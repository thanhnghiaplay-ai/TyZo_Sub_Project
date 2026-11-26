/**
 * TRẠNG THÁI MỘT LẦN CHẠY pipeline (một video). use-pipeline.ts giữ một Job trong ref; mỗi bước đọc và ghi vào đây.
 * Thêm trường mới: thêm ở kiểu Job và ở emptyJob cùng lúc.
 */
import type { Mp4Stream } from "@/lib/sub/mp4";
import type { LangEvent } from "@/lib/sub/quality";
import type { FilterRetryReport } from "@/lib/sub/filter-retry";
import type { AsrPartResult, RawAsrPart, RejectEntry } from "@/lib/sub/diagnostics";
import type { AsrRetryReport } from "@/lib/sub/asr-retry";
import type { Bible } from "@/lib/sub/text";
import type { Seg } from "@/lib/sub/types";

export type AsrResult = AsrPartResult;

export type Job = {
  segs: Seg[];
  pcm: Float32Array | null;
  pcmId: string;
  stream: Mp4Stream | null;
  parts: Array<[number, number]>;
  nextPart: number;
  skipped: number;
  asrCost: number;
  appliedSig: string;
  doneSource: string;
  asrBuf: Map<number, AsrResult>;
  heard: Map<number, Float32Array>;
  heardOffset: Map<number, number>;
  failedParts: number[];
  decodeRetried: Set<number>;
  retryUsedSeconds: number;
  retryReport: AsrRetryReport | null;
  filterRetried: Set<string>;
  filterRetryUsed: number;
  langRetryUsed: number;
  langSuspect: number;
  langEvents: LangEvent[];
  qualitySent: boolean;
  filterRetryReport: FilterRetryReport | null;
  gapSpent: number;
  rawParts: RawAsrPart[];
  rejects: RejectEntry[];
  diagLang: string;
  bible: Bible | null;
  analysisP: Promise<Bible | null> | null;
  bibleGo: boolean;
  holdPosted: boolean;
  note: string;
  decodeFail: number;
  decodeOk: number;
  forceOld: boolean;
  streamWhy: string;
  runId: number;
  abort: AbortController | null;
  videoUrl: string | null;
  gate: { blockedUntil: number };
  cooling: Map<string, number>;
  blocked: Set<string>;
  uses: Record<string, number>;
  lastModel: string;
  readAt: number;
  readRatio: number;
  heardLang: string;
};


/** Ngôn ngữ gửi cho nhà nhận dạng: "auto" thì để trống cho nhà tự nhận. */
export function asrLanguageOf(source: string) {
  return source === "auto" ? "" : source;
}

export const emptyJob = (): Job => ({
  segs: [],
  pcm: null,
  pcmId: "",
  stream: null,
  parts: [],
  nextPart: 0,
  skipped: 0,
  asrCost: 0,
  appliedSig: "",
  doneSource: "",
  asrBuf: new Map(),
  heard: new Map(),
  heardOffset: new Map(),
  failedParts: [],
  decodeRetried: new Set(),
  retryUsedSeconds: 0,
  retryReport: null,
  filterRetried: new Set(),
  filterRetryUsed: 0,
  langRetryUsed: 0,
  langSuspect: 0,
  langEvents: [],
  qualitySent: false,
  filterRetryReport: null,
  gapSpent: 0,
  rawParts: [],
  rejects: [],
  diagLang: "",
  bible: null,
  analysisP: null,
  bibleGo: false,
  holdPosted: false,
  note: "",
  decodeFail: 0,
  decodeOk: 0,
  forceOld: false,
  streamWhy: "",
  runId: 0,
  abort: null,
  videoUrl: null,
  gate: { blockedUntil: 0 },
  cooling: new Map(),
  blocked: new Set(),
  uses: {},
  lastModel: "",
  readAt: 0,
  readRatio: 0,
  heardLang: "",
});
