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

/** An old decode completion must never replace the newer run's PCM. */
export function commitDecodedJob(job: Job, runId: number, pcm: Float32Array, mediaId: string): boolean {
  if (job.runId !== runId) return false;
  job.pcm = pcm;
  job.pcmId = mediaId;
  job.stream = null;
  return true;
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


/** Claim before the first await so successive taps cannot open two tickets for the same Studio. */
export async function startJobOnce(gate: { current: boolean }, start: () => Promise<void>): Promise<void> {
  if (gate.current) return;
  gate.current = true;
  try {
    await start();
  } finally {
    gate.current = false;
  }
}


/** Processed and buffered Modal responses. The original audio must be reselected by the user. */
export type ModalCheckpoint = {
  model: string;
  parts: Job["parts"];
  nextPart: number;
  buffered: [number, AsrResult][];
  offsets: [number, number][];
  skipped: number;
  failedParts: number[];
  decodeFailures: RawAsrPart[];
  appliedSig: string;
  bibleGo: boolean;
  holdPosted: boolean;
};

export function snapshotModalProgress(job: Job, model: string): ModalCheckpoint | undefined {
  if (!model.startsWith("tyzo-modal-") || job.nextPart >= job.parts.length || (!job.nextPart && !job.asrBuf.size)) return undefined;
  return {
    model,
    parts: job.parts.slice(),
    nextPart: job.nextPart,
    buffered: [...job.asrBuf],
    offsets: [...job.heardOffset],
    skipped: job.skipped,
    failedParts: job.failedParts.slice(),
    decodeFailures: job.rawParts.filter((part) => part.kind === "decode_fail"),
    appliedSig: job.appliedSig,
    bibleGo: job.bibleGo,
    holdPosted: job.holdPosted,
  };
}

export function restoreModalProgress(job: Job, saved: ModalCheckpoint): void {
  job.parts = saved.parts;
  job.nextPart = saved.nextPart;
  job.asrBuf = new Map(saved.buffered);
  job.heardOffset = new Map(saved.offsets);
  job.skipped = saved.skipped;
  job.failedParts = saved.failedParts;
  job.rawParts = saved.decodeFailures;
  job.appliedSig = saved.appliedSig;
  job.bibleGo = saved.bibleGo;
  job.holdPosted = saved.holdPosted;
}
