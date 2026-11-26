/**
 * BƯỚC NHẬN DẠNG TỪNG ĐOẠN (nhà nhận từng đoạn: Groq Whisper, TyZo) và các lần nhận dạng lại:
 * - transcribeRemaining: gửi các đoạn còn lại, nhiều đoạn cùng lúc (số luồng theo nhà, xem providers).
 * - checkLanguage: đoạn nghi lệch ngôn ngữ thì gửi lại không ép ngôn ngữ (khi bật công tắc).
 * - retryDecodeFails: đoạn trình duyệt không giải mã được thì thử lại, có ngân sách giây.
 * - retryFilterMisses: câu bị bộ lọc nghi ngờ thì gửi lại riêng câu đó, có ngân sách giây.
 * Mọi bước đọc và ghi trạng thái lần chạy `j` (job.ts). Dừng ngay khi khách bắt đầu lần chạy khác (`my !== j.runId`).
 */
import { asrRunnerOf, transcribe } from "@/lib/providers";
import { asrTestLabel, readAsrTest } from "@/lib/sub/asr-test";
import { ASR_RETRY_BUDGET_SECONDS, partSeconds, planDecodeRetries, spansForDecodeRetry } from "@/lib/sub/asr-retry";
import { chunkOverlapsPrevious } from "@/lib/sub/chunk-plan";
import { packAudio, type PackedAudio } from "@/lib/sub/codec";
import { ingestAsrPart } from "@/lib/sub/diagnostics";
import { FILTER_RETRY_BUDGET_SECONDS, filterRejectKey, planFilterRetries } from "@/lib/sub/filter-retry";
import { throwIfAborted } from "@/lib/sub/groq";
import { chooseBetter, LANG_RETRY_BUDGET_SECONDS, meanLogprob, needsLangCheck, normalizeLang, resultText } from "@/lib/sub/lang-check";
import { streamSamples } from "@/lib/sub/mp4";
import { applyLineLocks } from "@/lib/sub/pitch-voice";
import { asrPrompt, fmt, SR } from "@/lib/sub/text";
import type { AsrModel } from "@/lib/sub/types";
import { gateChunk } from "@/lib/sub/vad";
import { asrLanguageOf, type AsrResult, type Job } from "./job";

export type RecognizeContext = {
  j: Job;
  /** Số của lần chạy này; khác `j.runId` nghĩa là khách đã chạy lần khác. */
  my: number;
  signal: AbortSignal;
  audioContext: AudioContext;
  /** Key của khách, hoặc "room" khi trả theo lượt. */
  token: string;
  source: string;
  asrModel: AsrModel;
  title: string;
  gloss: string;
  genre: string;
  /** Số luồng khách chọn (nhà không tự định số luồng thì dùng số này). */
  threads: number;
  /** Phiếu Trả theo lượt hiện tại (có thể đổi giữa chừng). */
  ticket: () => string | null;
  vad: () => Parameters<typeof gateChunk>[1];
  langCheck: () => boolean;
  lineLocks: () => Parameters<typeof applyLineLocks>[1];
  onWait: (message: string) => void;
  ensureTrial: () => Promise<unknown>;
  asrUsd: (model: AsrModel) => number;
  publish: (immediate?: boolean) => void;
  progress: () => void;
  say: (message: string, error?: boolean) => void;
  warnVad: () => void;
  applyReady: () => void;
  setHeardLang: (code: string) => void;
};

export function createRecognizer(ctx: RecognizeContext) {
  const { j, my, signal, audioContext, token, source, asrModel, title, gloss, genre, threads, ticket, vad, langCheck, lineLocks, onWait, ensureTrial, asrUsd, publish, progress, say, warnVad, applyReady, setHeardLang } = ctx;

  /** Chỉ khi bật công tắc. Đoạn nghi lệch ngôn ngữ thì gửi lại không ép ngôn ngữ, một lần, có ngân sách. Lỗi thì giữ kết quả cũ. */
  const checkLanguage = async (
    res: Exclude<AsrResult, "skip" | "fail">,
    packed: PackedAudio,
    seconds: number,
    partIndex: number,
    startAt: number,
  ): Promise<AsrResult> => {
    if (my !== j.runId || signal.aborted || !langCheck() || !source || source === "auto" || !needsLangCheck(source, res)) return res;
    j.langSuspect++;
    if (j.langRetryUsed + seconds > LANG_RETRY_BUDGET_SECONDS) return res;
    j.langRetryUsed += seconds;
    let again: Awaited<ReturnType<typeof transcribe>>;
    try {
      again = await transcribe(packed, token, "", "", asrModel, signal, j.gate, onWait, ticket());
    } catch (error) {
      if (signal.aborted || (error as { name?: string })?.name === "AbortError") throw error;
      return res;
    }
    if (my !== j.runId || signal.aborted) return res;
    await ensureTrial();
    // Kiểm toán R6-008: khách đã bắt đầu lần chạy khác thì không ghi số liệu vào lần chạy mới.
    if (my !== j.runId) return res;
    j.asrCost += Math.max(10, seconds) * asrUsd(asrModel);
    const pick = chooseBetter(source, res, again);
    j.langEvents.push({
      partIndex,
      start: startAt,
      requested: source,
      detected: normalizeLang(again.language),
      swapped: pick === "auto",
      logprobBefore: meanLogprob(res),
      logprobAfter: meanLogprob(again),
      before: resultText(res).slice(0, 80),
      after: resultText(again).slice(0, 80),
    });
    return pick === "auto" ? again : res;
  };

  const transcribeRemaining = async () => {
    let next = j.nextPart;
    j.decodeFail = 0;
    j.decodeOk = 0;
    j.note = "đang chuẩn bị";
    const asrTestNote = asrTestLabel(readAsrTest());
    if (asrTestNote) say(`Chế độ thử nhận dạng đang bật: ${asrTestNote}. Mở lại app với ?asrtest=off để tắt.`);
    const worker = async () => {
      for (;;) {
        throwIfAborted(signal);
        if (my !== j.runId) return;
        while (j.asrBuf.has(next)) next++;
        const index = next++;
        if (index >= j.parts.length) return;
        const [startAt, endAt] = j.parts[index];
        j.note = `đoạn ${index + 1}: đang giải mã âm thanh`;
        progress();
        let samples = j.pcm ? j.pcm.subarray(startAt, endAt) : await streamSamples(j.stream!, audioContext, startAt / SR, endAt / SR, signal);
        if (!samples && !j.pcm && j.stream) samples = await streamSamples(j.stream, audioContext, startAt / SR, endAt / SR, signal);
        throwIfAborted(signal);
        if (!samples) {
          j.decodeFail++;
          if (!j.pcm && j.decodeFail >= 2 && j.decodeOk === 0) {
            j.forceOld = true;
            throw new Error("Trình duyệt không giải mã được âm thanh theo đoạn. Bấm Tải và dịch lần nữa để dùng chế độ cũ (tối đa 2 giờ, 1 GB).");
          }
          j.asrBuf.set(index, "fail");
        } else {
          const gated = await gateChunk(samples, vad());
          if (!gated) {
            j.decodeOk++;
            j.asrBuf.set(index, "skip");
          } else {
            if (gated.fallback) warnVad();
            j.decodeOk++;
            const clip = gated.samples;
            j.note = `đoạn ${index + 1}: đang nén âm thanh`;
            progress();
            const packed = await packAudio(clip, signal);
            throwIfAborted(signal);
            j.note = `đoạn ${index + 1}: đang gửi ${Math.max(1, Math.round(packed.blob.size / 1024))} KB`;
            progress();
            const prompt = asrPrompt(title, gloss, genre);
            const first = await transcribe(packed, token, asrLanguageOf(source), prompt, asrModel, signal, j.gate, onWait, ticket());
            await ensureTrial();
            if (my !== j.runId) return;
            j.asrCost += Math.max(10, clip.length / SR) * asrUsd(asrModel);
            const res = await checkLanguage(first, packed, clip.length / SR, index, startAt / SR + gated.offset);
            if (my !== j.runId) return;
            if (res !== "skip" && res !== "fail" && res.language) {
              const code = normalizeLang(res.language) || res.language.trim().toLowerCase().slice(0, 12);
              if (code) {
                j.heardLang = code;
                setHeardLang(code);
              }
            }
            j.asrBuf.set(index, res);
            j.heard.set(index, clip);
            j.heardOffset.set(index, gated.offset);
          }
        }
        applyReady();
      }
    };
    await Promise.all(Array.from({ length: (() => { const runner = asrRunnerOf(asrModel); return runner.intake === "chunks" && runner.parallel ? Math.min(runner.parallel, j.parts.length) : Math.max(1, threads); })() }, worker));
    const swappedN = j.langEvents.filter((e) => e.swapped).length;
    if (swappedN) say(`Đã nhận dạng lại ${swappedN} đoạn có ngôn ngữ khác ngôn ngữ đã chọn.`);
    await retryDecodeFails();
    await retryFilterMisses();
  };

  const retryDecodeFails = async () => {
    if (!j.pcm && !j.stream) return;
    const spans = spansForDecodeRetry(j.rawParts, j.decodeRetried);
    const remaining = Math.max(0, ASR_RETRY_BUDGET_SECONDS - j.retryUsedSeconds);
    const plan = planDecodeRetries(spans, j.decodeRetried, remaining);
    if (!plan.retry.length && !plan.deferred.length) return;
    const finishReport = () => {
      if (my !== j.runId) return;
      const missing = j.rawParts
        .filter((row) => row.kind === "decode_fail")
        .map((row) => ({
          index: row.partIndex,
          start: row.start,
          end: row.end,
          retried: j.decodeRetried.has(row.partIndex),
        }))
        .sort((a, b) => a.index - b.index);
      j.retryReport = { budgetSeconds: ASR_RETRY_BUDGET_SECONDS, usedSeconds: j.retryUsedSeconds, missing };
      j.note = "";
      publish(true);
    };
    try {
      for (const part of plan.retry) {
        throwIfAborted(signal);
        if (my !== j.runId) return;
        const [startAt, endAt] = j.parts[part.index];
        const seconds = partSeconds({ index: part.index, start: startAt / SR, end: endAt / SR });
        j.note = `thử lại đoạn ${part.index + 1}`;
        progress();
        const samples = j.pcm ? j.pcm.subarray(startAt, endAt) : await streamSamples(j.stream!, audioContext, startAt / SR, endAt / SR, signal);
        throwIfAborted(signal);
        let res: AsrResult;
        let heard: Float32Array | null = null;
        let chunkStart = startAt / SR;
        let chunkEnd = endAt / SR;
        if (!samples) res = "fail";
        else {
          const gated = await gateChunk(samples, vad());
          if (!gated) res = "skip";
          else {
            if (gated.fallback) warnVad();
            heard = gated.samples;
            chunkStart += gated.offset;
            chunkEnd = chunkStart + heard.length / SR;
            j.note = `thử lại đoạn ${part.index + 1}: đang gửi`;
            progress();
            const packed = await packAudio(heard, signal);
            throwIfAborted(signal);
            const result = await transcribe(packed, token, asrLanguageOf(source), asrPrompt(title, gloss, genre), asrModel, signal, j.gate, onWait, ticket());
            await ensureTrial();
            if (my !== j.runId) return;
            j.asrCost += Math.max(10, heard.length / SR) * asrUsd(asrModel);
            res = result;
          }
        }
        j.decodeRetried.add(part.index);
        j.retryUsedSeconds += seconds;
        j.rawParts = j.rawParts.filter((row) => row.partIndex !== part.index);
        j.rejects = j.rejects.filter((row) => row.partIndex !== part.index);
        const ingested = ingestAsrPart({
          partIndex: part.index,
          chunkStart,
          chunkEnd,
          requestedLanguage: j.diagLang,
          result: res,
          segs: j.segs,
          samples: heard,
          overlapGate: chunkOverlapsPrevious(j.parts, part.index),
        });
        j.rawParts.push(ingested.raw);
        j.rawParts.sort((a, b) => a.partIndex - b.partIndex);
        if (ingested.rejects.length) j.rejects.push(...ingested.rejects);
        j.failedParts = j.failedParts.filter((index) => index !== part.index);
        if (ingested.skipped) j.skipped++;
        else if (ingested.failed) j.failedParts.push(part.index);
        else j.segs.sort((a, b) => a.start - b.start || a.end - b.end);
      }
    } finally {
      applyLineLocks(j.segs, lineLocks());
      finishReport();
    }
  };

  const retryFilterMisses = async () => {
    const plan = planFilterRetries({
      rejects: j.rejects,
      raw: j.rawParts,
      already: j.filterRetried,
      budgetSeconds: Math.max(0, FILTER_RETRY_BUDGET_SECONDS - j.filterRetryUsed),
    });
    if (!plan.retry.length && !plan.deferred.length) return;
    let sent = 0;
    try {
      for (const clip of plan.retry) {
        throwIfAborted(signal);
        if (my !== j.runId) return;
        j.filterRetried.add(clip.key);
        j.note = `thử lại câu không chắc ${fmt(clip.start)}`;
        progress();
        const from = Math.max(0, Math.floor(clip.start * SR));
        const to = Math.max(from + 1, Math.ceil(clip.end * SR));
        const samples = j.pcm ? j.pcm.subarray(from, Math.min(j.pcm.length, to)) : await streamSamples(j.stream!, audioContext, clip.start, clip.end, signal);
        throwIfAborted(signal);
        if (!samples?.length) continue;
        const gated = await gateChunk(samples, vad());
        if (!gated) continue;
        if (gated.fallback) warnVad();
        const start = clip.start + gated.offset;
        const seconds = gated.samples.length / SR;
        j.filterRetryUsed += seconds;
        const packed = await packAudio(gated.samples, signal);
        throwIfAborted(signal);
        const result = await transcribe(packed, token, asrLanguageOf(source), asrPrompt(title, gloss, genre), asrModel, signal, j.gate, onWait, ticket());
        await ensureTrial();
        if (my !== j.runId) return;
        j.asrCost += Math.max(10, seconds) * asrUsd(asrModel);
        const before = j.segs.length;
        const ingested = ingestAsrPart({
          partIndex: -1,
          chunkStart: start,
          chunkEnd: start + seconds,
          requestedLanguage: j.diagLang,
          result,
          segs: j.segs,
          samples: gated.samples,
          overlapGate: false,
        });
        if (j.segs.length > before && clip.reason !== "whisper_empty") {
          j.rejects = j.rejects.filter((row) => filterRejectKey(row) !== clip.key);
        }
        if (clip.reason === "whisper_empty") {
          const index = Number(clip.key.slice("whisper_empty:".length));
          j.rawParts = j.rawParts.filter((row) => !(row.kind === "whisper_empty" && row.partIndex === index));
        }
        j.rawParts.push(ingested.raw);
        for (const row of ingested.rejects) {
          const dup = j.rejects.some((old) => old.text === row.text && old.reason === row.reason && old.start === row.start);
          if (!dup) j.rejects.push(row);
        }
        j.segs.sort((a, b) => a.start - b.start || a.end - b.end);
        sent++;
      }
    } finally {
      if (my === j.runId) {
        applyLineLocks(j.segs, lineLocks());
        j.filterRetryReport = {
          budgetSeconds: FILTER_RETRY_BUDGET_SECONDS,
          usedSeconds: j.filterRetryUsed,
          sent,
          deferred: plan.deferred.length,
        };
        j.note = "";
        publish(true);
      }
    }
  };

  return { checkLanguage, transcribeRemaining, retryDecodeFails, retryFilterMisses };
}
