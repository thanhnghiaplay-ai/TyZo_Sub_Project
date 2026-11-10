import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { claimTrialDevice, spendTrial } from "@/lib/room-account";
import { getMyPlace } from "@/lib/admin-room";
import { authClient } from "@/lib/auth/client";
import { deviceId } from "@/lib/device-id";
import { exportNotice, roomAccess, trialFileProblem } from "@/lib/room-plans";
import { standingBlock } from "@/lib/staff-role";
import { readMediaSeconds } from "@/lib/trial-media";
import { claimPlayback, closeRoomTicket, openRoomTicket } from "@/lib/sub/room-ticket";
import { formatMoney } from "@/lib/money-format";

const moneyText = (n: number) => `${formatMoney(n) || "0"} đ`;
import { audioBufferTo16k, packAudio } from "@/lib/sub/codec";
import {
  abortError,
  analyzeFilm,
  applyNameFixes,
  contextBlock,
  listModelIds,
  ROOM_KEY,
  sleep,
  throwIfAborted,
  transcribe,
  translateIndexes,
  translateWithRepair,
} from "@/lib/sub/groq";
import { mergeCatalog, modelLabel, pickAutoModel } from "@/lib/sub/models";
import { liveAsrPerSecond, type GroqBoard } from "@/lib/sub/groq-board";
import { loadGroqBoard } from "@/lib/sub/groq-board-load";
import { looksLikePageLink, openStream, streamParts, streamSamples, type Mp4Stream } from "@/lib/sub/mp4";
import { gateChunk, speechSpansFromProbs } from "@/lib/sub/vad";
import { applyLineLocks, assignVoices, lineLockId, measurePitch } from "@/lib/sub/pitch-voice";
import { chunkOverlapsPrevious, chunksFromSpans, chunksToSamples, energyThreshold, spansFromEnergy } from "@/lib/sub/chunk-plan";
import { FILTER_RETRY_BUDGET_SECONDS, filterRejectKey, planFilterRetries, type FilterRetryReport } from "@/lib/sub/filter-retry";
import { ingestAsrPart, keepRejectedCue, slicePcm, type AsrPartResult, type RawAsrPart, type RejectEntry } from "@/lib/sub/diagnostics";
import {
  ASR_RETRY_BUDGET_SECONDS,
  formatRetryStatus,
  partSeconds,
  planDecodeRetries,
  spansForDecodeRetry,
  type AsrRetryReport,
} from "@/lib/sub/asr-retry";
import {
  addressLock,
  asrPrompt,
  BATCH,
  glossaryHit,
  isSilentChunk,
  fmt,
  MAX_BYTES,
  MAX_MINUTES,
  MAX_STREAM_HOURS,
  splitAudio,
  SR,
  toSrt,
  untranslated,
  windowRms,
  type Bible,
} from "@/lib/sub/text";
import {
  loadGenreGlossary,
  protectTerms,
  restoreTerms,
  settleGlossaryLines,
  stripLeftoverPlaceholders,
  mergeIntoGloss,
  overlayUserTerms,
  parseGlossaryCsv,
  type GlossaryTerm,
} from "@/lib/sub/glossary";
import { suggestTerms } from "@/lib/glossary-room";
import {
  budgetSpeechGaps,
  formatGapConfirm,
  GAP_BUDGET_SECONDS,
  spansFromBlocks,
  type GapPlan,
} from "@/lib/sub/gap-scan";
import { ASR_PRICE, type AsrModel, type AutoProfile, type ChatModel, type ModelMode, type Seg } from "@/lib/sub/types";

type AsrResult = AsrPartResult;

type Job = {
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
};

function readGenderMap(key: string): Record<string, "female" | "male"> {
  try {
    const data = JSON.parse(readStore(key) || "{}") as Record<string, string>;
    const out: Record<string, "female" | "male"> = {};
    for (const [name, value] of Object.entries(data)) {
      if (value === "male" || value === "female") out[name] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function voiceStore(kind: "line" | "cast", film: string) {
  return `g${kind}_` + (film.trim().toLowerCase() || "_");
}

function overlayCastLocks(bible: Bible, film: string) {
  const saved = readGenderMap(voiceStore("cast", film));
  for (const character of bible.characters || []) {
    const gender = saved[(character.name || "").trim().toLowerCase()];
    if (gender) character.gender = gender;
  }
}

function cloneBible(bible: Bible): Bible {
  return JSON.parse(JSON.stringify(bible)) as Bible;
}

const emptyJob = (): Job => ({
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
});

function readStore(key: string) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
function writeStore(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function shareUserTerms(source: string, genre: string, terms: GlossaryTerm[]) {
  try {
    if (localStorage.getItem("gshare") !== "1") return;
  } catch {
    return;
  }
  void suggestTerms({ data: { lang: source, genre, terms } }).catch(() => {});
}

function userGlossKey(source: string, genre: string) {
  return "guser_" + (source || "_") + "_" + (genre || "auto");
}

function readUserTerms(source: string, genre: string): GlossaryTerm[] {
  try {
    const raw = readStore(userGlossKey(source, genre));
    if (!raw) return [];
    const data = JSON.parse(raw) as GlossaryTerm[];
    return Array.isArray(data) ? data.filter((t) => t && t.source) : [];
  } catch {
    return [];
  }
}

export function usePipeline() {
  const job = useRef<Job>(emptyJob());
  const lineLocksRef = useRef<Record<string, "female" | "male">>({});
  const [key, setKey] = useState("");
  const roomPayRef = useRef(false);
  const trialLease = useRef({ media: "", spent: false });
  const keyRef = useRef("");
  keyRef.current = key;
  const activeKey = () => (roomPayRef.current ? ROOM_KEY : keyRef.current.trim());
  const [target, setTarget] = useState("Vietnamese");
  const [source, setSource] = useState("zh");
  const [genre, setGenre] = useState("auto");
  const [threads, setThreads] = useState(3);
  const [mode, setMode] = useState<ModelMode>("manual");
  const [profile, setProfile] = useState<AutoProfile>("balanced");
  const [modelId, setModelId] = useState("openai/gpt-oss-120b");
  const [allowEnterprise, setAllowEnterprise] = useState(true);
  const [asrModel, setAsrModel] = useState<AsrModel>("whisper-large-v3-turbo");
  const [speechVad, setSpeechVadState] = useState(false);
  const vadRef = useRef(false);
  vadRef.current = speechVad;
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [gloss, setGloss] = useState("");
  const [glossaryInfo, setGlossaryInfo] = useState<{
    count: number;
    sources: string[];
    terms: Array<{ source: string; target: string; user?: boolean }>;
    userCount: number;
    failed?: boolean;
  }>({
    count: 0,
    sources: [],
    terms: [],
    userCount: 0,
  });
  const [userTerms, setUserTerms] = useState<GlossaryTerm[]>([]);
  const userTermsRef = useRef<GlossaryTerm[]>([]);
  userTermsRef.current = userTerms;
  const [pre, setPre] = useState(true);
  const [bible, setBible] = useState<Bible | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [reviewHold, setReviewHold] = useState(false);
  const [reviewBefore, setReviewBeforeState] = useState(true);
  const reviewRef = useRef(true);
  const preRef = useRef(true);
  reviewRef.current = reviewBefore;
  preRef.current = pre;
  const [file, setFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [segs, setSegs] = useState<Seg[]>([]);
  const [diag, setDiag] = useState<{ rejects: RejectEntry[]; raw: RawAsrPart[] }>({ rejects: [], raw: [] });
  const [asrRetry, setAsrRetry] = useState<AsrRetryReport | null>(null);
  const [filterRetry, setFilterRetry] = useState<FilterRetryReport | null>(null);
  const [gapPlan, setGapPlanState] = useState<GapPlan | null>(null);
  const gapPlanRef = useRef<GapPlan | null>(null);
  const [status, setStatus] = useState("Sẵn sàng. Chọn video rồi bấm Tải và dịch.");
  const [isError, setIsError] = useState(false);
  const [running, setRunning] = useState(false);
  const [remoteIds, setRemoteIds] = useState<string[] | null>(null);
  const [board, setBoard] = useState<GroqBoard | null>(null);
  const [boardNote, setBoardNote] = useState("");
  const boardRef = useRef<GroqBoard | null>(null);
  const asrUsd = (model: AsrModel) => liveAsrPerSecond(boardRef.current?.rows || [], model, ASR_PRICE[model]);
  const [modelBusy, setModelBusy] = useState(false);
  const [uses, setUses] = useState<Record<string, number>>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const publishTimer = useRef(0);

  useEffect(() => {
    setKey(readStore("gk"));
    const lang = readStore("glang");
    setTarget(lang === "Vietnamese" ? lang : "Vietnamese");
    const src = readStore("gsrc");
    setSource(src === "zh" || src === "ko" || src === "ja" || src === "en" ? src : "zh");
    const g = readStore("ggenre");
    if (g) setGenre(g);
    const par = Number(readStore("gpar"));
    if ([1, 3, 4, 6, 8].includes(par)) setThreads(par);
    const savedMode = readStore("gmode");
    const savedProfile = readStore("gprofile");
    const savedModel = readStore("gmdl");
    if (savedMode === "auto") {
      setMode("manual");
      if (!savedModel) setModelId(savedProfile === "fast" ? "openai/gpt-oss-20b" : "openai/gpt-oss-120b");
    } else if (savedMode === "manual") setMode("manual");
    if (savedProfile === "fast" || savedProfile === "balanced" || savedProfile === "accurate") setProfile(savedProfile);
    if (savedModel) setModelId(savedModel);
    if (readStore("genter") === "0") setAllowEnterprise(false);
    const whisper = readStore("gasr");
    if (whisper === "whisper-large-v3" || whisper === "whisper-large-v3-turbo") setAsrModel(whisper);
    if (readStore("gvad") === "1") setSpeechVadState(true);
    setTitle(readStore("gtitle"));
    setNotes(readStore("gnotes"));
    const glossKey = "gl_" + (readStore("gtitle").trim().toLowerCase() || "_");
    setGloss(readStore(glossKey));
    if (readStore("gpre") === "0") setPre(false);
    if (readStore("greview") === "0") {
      reviewRef.current = false;
      setReviewBeforeState(false);
    }
  }, []);

  // Load structured glossary when source language or genre changes
  useEffect(() => {
    const loaded = readUserTerms(source, genre);
    setUserTerms(loaded);
    userTermsRef.current = loaded;
  }, [source, genre]);

  useEffect(() => {
    let cancelled = false;
    setGlossaryInfo({
      count: userTerms.length,
      userCount: userTerms.length,
      sources: [],
      terms: userTerms.map((t) => ({ source: t.source, target: t.target, user: true })),
    });
    (async () => {
      try {
        const pack = await loadGenreGlossary(source, genre, target);
        if (cancelled) return;
        const merged = overlayUserTerms(pack.terms, userTerms);
        const userKeys = new Set(userTerms.map((t) => t.source.toLowerCase()));
        setGlossaryInfo({
          count: merged.length,
          userCount: userTerms.length,
          sources: pack.sources,
          failed: Boolean(pack.error),
          terms: [
            ...userTerms.map((t) => ({ source: t.source, target: t.target, user: true })),
            ...merged
              .filter((t) => !userKeys.has(t.source.toLowerCase()))
              .slice(0, 80)
              .map((t) => ({ source: t.source, target: t.target })),
          ],
        });
      } catch {
        if (!cancelled)
          setGlossaryInfo({
            count: userTerms.length,
            userCount: userTerms.length,
            sources: [],
            failed: true,
            terms: userTerms.map((t) => ({ source: t.source, target: t.target, user: true })),
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, genre, target, userTerms]);

  useEffect(() => {
    lineLocksRef.current = readGenderMap(voiceStore("line", title));
  }, [title]);

  const publish = useCallback((immediate = false) => {
    const flush = () => {
      publishTimer.current = 0;
      setSegs(job.current.segs.map((seg) => ({ ...seg })));
      setUses({ ...job.current.uses });
      setDiag({ rejects: job.current.rejects.slice(), raw: job.current.rawParts.slice() });
      setAsrRetry(job.current.retryReport);
      setFilterRetry(job.current.filterRetryReport);
    };
    if (immediate) {
      clearTimeout(publishTimer.current);
      flush();
      return;
    }
    if (!publishTimer.current) publishTimer.current = window.setTimeout(flush, 250);
  }, []);

  const say = useCallback((message: string, error = false) => {
    setStatus(message);
    setIsError(error);
  }, []);

  const progress = useCallback(() => {
    const j = job.current;
    const done = j.segs.reduce((n, seg) => n + (seg.translation === null ? 0 : 1), 0);
    const modelBit = mode === "auto" && j.lastModel ? ` · Auto ${modelLabel(j.lastModel)}` : "";
    say(
      `Nhận dạng ${Math.min(j.nextPart, j.parts.length)}/${j.parts.length} đoạn · dịch ${done}/${j.segs.length} câu${modelBit}${j.note ? " · " + j.note : ""}`,
    );
  }, [mode, say]);

  const mediaId = useCallback(() => {
    if (file || audioFile)
      return `file:${file?.name}:${file?.size}:${file?.lastModified}|${audioFile ? audioFile.name + ":" + audioFile.size : ""}`;
    if (url.trim()) return `url:${url.trim()}`;
    return "";
  }, [file, audioFile, url]);

  const modelSig = mode === "auto" ? `auto:${profile}:${allowEnterprise ? 1 : 0}|${genre}` : `${modelId}|${genre}`;

  const buttonLabel = useMemo(() => {
    if (running) return "Hủy";
    const id = mediaId();
    const known = Boolean(id) && job.current.pcmId === id;
    const unfinished = known && (job.current.nextPart < job.current.parts.length || segs.some((seg) => seg.translation === null));
    const retarget = known && segs.length > 0 && job.current.appliedSig && job.current.appliedSig !== `${target}|${modelSig}`;
    return unfinished || retarget ? "Tiếp tục" : "Tải và dịch";
  }, [running, mediaId, segs, target, modelSig]);

  const catalog: ChatModel[] = useMemo(() => mergeCatalog(remoteIds || []), [remoteIds]);

  const pullBoard = useCallback(async () => {
    try {
      const next = await loadGroqBoard();
      boardRef.current = next;
      setBoard(next);
      setBoardNote("");
    } catch (error) {
      setBoardNote((error as Error).message || "Không cập nhật được giá Groq.");
    }
  }, []);

  useEffect(() => {
    void pullBoard();
  }, [pullBoard]);

  const refreshModels = useCallback(async () => {
    const token = activeKey();
    void pullBoard();
    if (!token) {
      say("Nhập API key trước khi đồng bộ model. Giá Groq vẫn được cập nhật.", true);
      return;
    }
    setModelBusy(true);
    try {
      const ids = await listModelIds(token);
      setRemoteIds(ids);
      say(token === ROOM_KEY ? `Đã đồng bộ với key của phòng. Dùng được ${ids.length} model.` : `Key này dùng được ${ids.length} model Groq. Model không có trên key sẽ bị làm mờ.`);
    } catch (error) {
      say((error as Error).message || "Không đọc được danh sách model.", true);
    } finally {
      setModelBusy(false);
    }
  }, [pullBoard, say]);

  const setRoomPay = useCallback((on: boolean) => {
    roomPayRef.current = on;
    if (on) void refreshModels();
  }, [refreshModels]);

  const clearJob = useCallback(() => {
    const j = job.current;
    j.segs = [];
    j.pcm = null;
    j.stream = null;
    j.pcmId = "";
    j.parts = [];
    j.asrBuf.clear();
    j.heard.clear();
    j.failedParts = [];
    j.decodeRetried = new Set();
    j.retryUsedSeconds = 0;
    j.retryReport = null;
    j.gapSpent = 0;
    gapPlanRef.current = null;
    setGapPlanState(null);
    j.rawParts = [];
    j.rejects = [];
    j.diagLang = "";
    j.bible = null;
    j.analysisP = null;
    j.bibleGo = false;
    j.holdPosted = false;
    setBible(null);
    setReviewHold(false);
    setAnalyzing(false);
    j.nextPart = 0;
    j.skipped = 0;
    j.asrCost = 0;
    j.appliedSig = "";
    j.doneSource = "";
    j.uses = {};
    j.lastModel = "";
    j.note = "";
    publish(true);
  }, [publish]);

  const reset = useCallback(() => {
    const j = job.current;
    if (!j.segs.length && !j.pcm && !j.pcmId) {
      say("Chưa có gì để xóa.");
      return;
    }
    if (!confirm("Xóa phụ đề hiện tại và nhận dạng lại từ đầu? Việc này sẽ tính phí Groq thêm một lần.")) return;
    j.runId++;
    j.abort?.abort();
    j.abort = null;
    setRunning(false);
    clearJob();
    say("Đã xóa. Bấm Tải và dịch để chạy lại.");
  }, [clearJob, say]);

  const guardRoom = useCallback(async (paidOnly: string | null, allowSpentTrial = false) => {
    const session = await authClient.getSession().catch(() => null);
    if (!session?.data?.user) {
      say("Chưa đăng nhập. Hãy đăng ký hoặc đăng nhập rồi mới tải và dịch.", true);
      return null;
    }
    const id = deviceId();
    if (!id) {
      say("Trình duyệt không cho lưu máy này, không mở được lượt thử.", true);
      return null;
    }
    try {
      const place = await getMyPlace();
      const blocked = standingBlock(place.status, place.reason);
      if (blocked) {
        say(blocked, true);
        return null;
      }
      const state = await claimTrialDevice({ data: id });
      const access = roomAccess({ plan: state.plan, planUntil: state.planUntil, trialLeft: state.trialLeft });
      if (roomPayRef.current) {
        const until = state.planUntil ? new Date(state.planUntil).getTime() : 0;
        const hadPlan = Boolean(state.plan && until);
        if (!hadPlan && access.kind !== "paid") {
          say("Bản dùng thử không dùng cửa trả theo lượt. Hãy chọn key của bạn, hoặc mua gói thuê phòng.", true);
          return null;
        }
        return access;
      }
      if (paidOnly && access.kind !== "paid") {
        say(paidOnly, true);
        return null;
      }
      if (access.kind === "locked") {
        if (allowSpentTrial) return access;
        say(access.text, true);
        return null;
      }
      return access;
    } catch {
      say("Chưa đọc được tài khoản. Hãy đăng nhập lại.", true);
      return null;
    }
  }, [say]);

  const exportSrt = useCallback(async () => {
    const session = await authClient.getSession().catch(() => null);
    if (!session?.data?.user) return say("Chưa đăng nhập. Hãy đăng ký hoặc đăng nhập rồi mới xuất file Vietsub.", true);
    const id = deviceId();
    if (!id) return say("Trình duyệt không cho lưu máy này, không mở được lượt thử.", true);
    try {
      const place = await getMyPlace();
      const blocked = standingBlock(place.status, place.reason);
      if (blocked) return say(blocked, true);
      const state = await claimTrialDevice({ data: id });
      const notice = exportNotice({ plan: state.plan, planUntil: state.planUntil, trialLeft: state.trialLeft });
      if (notice) return say(notice, true);
    } catch {
      return say("Chưa đọc được tài khoản. Hãy đăng nhập lại.", true);
    }
    if (!job.current.segs.length) return say("Chưa có phụ đề để xuất.", true);
    const blob = new Blob([toSrt(job.current.segs)], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    const href = URL.createObjectURL(blob);
    link.href = href;
    link.download = ((file?.name || "phu-de").replace(/\.[^.]+$/, "") || "phu-de") + ".srt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }, [file, say]);

  const saveGloss = useCallback(
    (nextTitle: string, nextNotes: string, nextGloss: string) => {
      const glossKey = "gl_" + (nextTitle.trim().toLowerCase() || "_");
      writeStore(glossKey, nextGloss);
      writeStore("gtitle", nextTitle);
      writeStore("gnotes", nextNotes);
    },
    [],
  );

  const editSeg = useCallback(
    (index: number, translation: string, rule: string) => {
      const seg = job.current.segs[index];
      if (!seg) return;
      if (translation.trim()) {
        seg.translation = translation.trim();
        seg.translationFailed = false;
        seg.edited = true;
      }
      let related = 0;
      if (rule.trim()) {
        const next = (gloss.trim() ? gloss.trim() + "\n" : "") + rule.trim();
        setGloss(next);
        saveGloss(title, notes, next);
        const src = rule.split(/=>|→|=/)[0]?.trim().toLowerCase() || "";
        if (src) {
          for (const item of job.current.segs) {
            if (item !== seg && item.translation !== null && item.original.toLowerCase().includes(src)) {
              item.translation = null;
              item.translationFailed = false;
              related++;
            }
          }
        }
      }
      publish(true);
      say(related ? `Đã thêm thuật ngữ. ${related} câu liên quan sẽ dịch lại khi bấm Tiếp tục.` : "Đã sửa câu.");
    },
    [gloss, notes, publish, saveGloss, say, title],
  );

  const cancel = useCallback(() => {
    job.current.abort?.abort();
  }, []);

  const start = useCallback(async () => {
    const token = activeKey();
    const link = url.trim();
    const chosen = modelId.trim();
    if (!token) return say("Vui lòng nhập Groq API key.", true);
    if (mode === "manual" && !chosen) return say("Vui lòng chọn model dịch.", true);
    if (!file && !audioFile && !link) return say("Vui lòng chọn file video/âm thanh hoặc dán link trực tiếp.", true);
    if (!file && !audioFile && !/^https?:\/\//i.test(link)) return say("Link phải bắt đầu bằng http:// hoặc https://.", true);
    if (analyzing) return say("Đang phân tích phim, chờ một chút.", true);
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return say("Trình duyệt này không hỗ trợ xử lý âm thanh. Hãy cập nhật trình duyệt.", true);
    const idNow = mediaId();
    const continuingTrial = trialLease.current.spent && trialLease.current.media === idNow;
    const access = await guardRoom(null, continuingTrial);
    if (!access) return;
    let trialArm = false;
    if (!roomPayRef.current && access.kind !== "paid") {
      if (!continuingTrial) {
        if (access.kind !== "trial") return say(access.text, true);
        const chosenFile = audioFile || file;
        if (!chosenFile) return say("Bản dùng thử không nhận link. Hãy chọn một tệp trên máy.", true);
        let seconds = 0;
        try {
          seconds = await readMediaSeconds(chosenFile);
        } catch (error) {
          return say(error instanceof Error ? error.message : "Không đọc được thời lượng tệp.", true);
        }
        const problem = trialFileProblem(seconds, chosenFile.size);
        if (problem) return say(problem, true);
        trialArm = true;
      }
    }
    const ensureTrial = async () => {
      if (!trialArm || trialLease.current.spent) return;
      await spendTrial();
      trialLease.current = { media: idNow, spent: true };
    };

    if (token !== ROOM_KEY) writeStore("gk", token);
    writeStore("glang", target);
    writeStore("gsrc", source);
    writeStore("gmdl", chosen);
    writeStore("ggenre", genre);
    writeStore("gpar", String(threads));
    writeStore("gmode", mode);
    writeStore("gprofile", profile);
    writeStore("genter", allowEnterprise ? "1" : "0");
    writeStore("gasr", asrModel);
    writeStore("gpre", pre ? "1" : "0");
    saveGloss(title, notes, gloss);

    let ticketId: string | null = null;
    let ticketFailed = false;
    let releasePlayback = () => {};
    if (roomPayRef.current) {
      const chosenFile = audioFile || file;
      if (!chosenFile) return say("Trả theo lượt chưa nhận link. Hãy chọn một tệp trên máy.", true);
      try {
        const opened = await openRoomTicket({
          fileName: chosenFile.name,
          seconds: await readMediaSeconds(chosenFile),
          asrModel,
          chatModel: mode === "manual" ? chosen : "auto",
        });
        ticketId = opened.id;
        releasePlayback = claimPlayback(ticketId);
        say(`Đã giữ ${moneyText(opened.held)} (ước tính, số trừ là số thực, phần thừa trả lại). Số dư còn ${moneyText(opened.balance)}.`);
      } catch (error) {
        return say(error instanceof Error ? error.message : "Không giữ được tiền cho lần chạy này.", true);
      }
    }

    const j = job.current;
    const my = ++j.runId;
    let audioContext: AudioContext;
    try {
      audioContext = new AudioContextClass({ sampleRate: SR });
    } catch {
      audioContext = new AudioContextClass();
    }
    j.abort = new AbortController();
    const signal = j.abort.signal;
    const pauseForNewBible = { current: true };
    setRunning(true);
    try {
      audioContext.resume?.();
    } catch {
      /* resume có thể không có */
    }

    const onWait = (message: string) => {
      if (my === j.runId) say(message);
    };

    const ensureAnalysis = async () => {
      if (!j.analysisP) {
        j.note = "đang phân tích phim…";
        setAnalyzing(true);
        progress();
        const analysisModel =
          mode === "manual"
            ? chosen
            : pickAutoModel({
                profile: "accurate",
                texts: ["analysis"],
                sourceLang: source,
                genre,
                glossaryHit: true,
                allowEnterprise,
                available: remoteIds ? new Set(remoteIds) : null,
                cooling: j.cooling,
                blocked: j.blocked,
                escalate: true,
              }).id;
        j.analysisP = analyzeFilm({
          key: token,
          model: analysisModel,
          language: target,
          title,
          notes,
          gloss,
          lines: j.segs.map((seg) => seg.original),
          signal,
          gate: j.gate,
          onWait,
          ticket: ticketId,
        })
          .then((next) => {
            applyNameFixes(j.segs, next);
            overlayCastLocks(next, title);
            j.bible = next;
            j.note = "";
            setBible(cloneBible(next));
            publish();
            return next;
          })
          .catch((error: Error) => {
            j.analysisP = null;
            if (error?.name === "AbortError") throw error;
            const failed: Bible = { failed: String(error?.message || error) };
            j.bible = failed;
            setBible(failed);
            j.note = "không tạo được bảng thuật ngữ, dịch không có bảng";
            return null;
          })
          .finally(() => {
            if (my === j.runId) setAnalyzing(false);
          });
      }
      return j.analysisP;
    };

    const applyReady = () => {
      while (j.asrBuf.has(j.nextPart)) {
        const res = j.asrBuf.get(j.nextPart);
        j.asrBuf.delete(j.nextPart);
        const heard = j.heard.get(j.nextPart) ?? null;
        const offset = j.heardOffset.get(j.nextPart) ?? 0;
        j.heard.delete(j.nextPart);
        j.heardOffset.delete(j.nextPart);
        if (res === "skip" || res === "fail" || res) {
          const [startAt, endAt] = j.parts[j.nextPart];
          const chunkStart = startAt / SR + offset;
          const chunkEnd = heard ? chunkStart + heard.length / SR : endAt / SR;
          const ingested = ingestAsrPart({
            partIndex: j.nextPart,
            chunkStart,
            chunkEnd,
            requestedLanguage: j.diagLang,
            result: res,
            segs: j.segs,
            samples: res === "skip" || res === "fail" ? null : heard,
            overlapGate: chunkOverlapsPrevious(j.parts, j.nextPart),
          });
          if (ingested.skipped) j.skipped++;
          else if (ingested.failed) j.failedParts.push(j.nextPart);
          else j.segs.sort((a, b) => a.start - b.start || a.end - b.end);
          j.rawParts.push(ingested.raw);
          if (ingested.rejects.length) j.rejects.push(...ingested.rejects);
        }
        j.nextPart++;
      }
      applyLineLocks(j.segs, lineLocksRef.current);
      publish();
      progress();
    };

    let vadWarned = false;
    const warnVad = () => {
      if (vadWarned) return;
      vadWarned = true;
      say("Không tải được bộ lọc tiếng người. Đoạn này gửi theo mức năng lượng.");
    };

    const transcribeRemaining = async () => {
      let next = j.nextPart;
      j.decodeFail = 0;
      j.decodeOk = 0;
      j.note = "đang chuẩn bị";
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
            const gated = await gateChunk(samples, vadRef.current);
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
              const prompt = asrPrompt(title, gloss);
              const res = await transcribe(packed, token, source, prompt, asrModel, signal, j.gate, onWait, ticketId);
              await ensureTrial();
              if (my !== j.runId) return;
              j.asrCost += Math.max(10, clip.length / SR) * asrUsd(asrModel);
              j.asrBuf.set(index, res);
              j.heard.set(index, clip);
              j.heardOffset.set(index, gated.offset);
            }
          }
          applyReady();
        }
      };
      await Promise.all(Array.from({ length: Math.max(1, threads) }, worker));
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
          let samples = j.pcm ? j.pcm.subarray(startAt, endAt) : await streamSamples(j.stream!, audioContext, startAt / SR, endAt / SR, signal);
          throwIfAborted(signal);
          let res: AsrResult;
          let heard: Float32Array | null = null;
          let chunkStart = startAt / SR;
          let chunkEnd = endAt / SR;
          if (!samples) res = "fail";
          else {
            const gated = await gateChunk(samples, vadRef.current);
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
              const result = await transcribe(packed, token, source, asrPrompt(title, gloss), asrModel, signal, j.gate, onWait, ticketId);
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
        applyLineLocks(j.segs, lineLocksRef.current);
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
          let samples = j.pcm ? j.pcm.subarray(from, Math.min(j.pcm.length, to)) : await streamSamples(j.stream!, audioContext, clip.start, clip.end, signal);
          throwIfAborted(signal);
          if (!samples?.length) continue;
          const gated = await gateChunk(samples, vadRef.current);
          if (!gated) continue;
          if (gated.fallback) warnVad();
          const start = clip.start + gated.offset;
          const seconds = gated.samples.length / SR;
          j.filterRetryUsed += seconds;
          const packed = await packAudio(gated.samples, signal);
          throwIfAborted(signal);
          const result = await transcribe(packed, token, source, asrPrompt(title, gloss), asrModel, signal, j.gate, onWait, ticketId);
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
          applyLineLocks(j.segs, lineLocksRef.current);
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

    const translateRemaining = async (asrDone: () => boolean) => {
      const sig = `${target}|${modelSig}`;
      if (j.appliedSig && j.appliedSig !== sig) {
        for (const seg of j.segs) {
          if (seg.edited) continue;
          seg.translation = null;
          seg.translationFailed = false;
        }
        publish(true);
      }
      j.appliedSig = sig;
      const take = (done: boolean) => {
        const limit = done ? j.segs.length : Math.max(0, j.segs.length - 2);
        let start = 0;
        while (start < limit && (j.segs[start].translation !== null || j.segs[start].busy)) start++;
        const out: Seg[] = [];
        for (let i = start; i < limit && out.length < BATCH; i++) {
          const seg = j.segs[i];
          if (seg.translation !== null || seg.busy) break;
          out.push(seg);
        }
        return out;
      };
      const worker = async () => {
        for (;;) {
          throwIfAborted(signal);
          if (my !== j.runId) return;
          const done = asrDone();
          if (preRef.current && reviewRef.current && pauseForNewBible.current && !j.bibleGo) {
            if (!done) {
              await sleep(500, signal);
              continue;
            }
            if (!j.bible) await ensureAnalysis();
            if (my !== j.runId) return;
            if (j.bible && !j.bible.failed && !j.bibleGo) {
              if (!j.holdPosted) {
                j.holdPosted = true;
                j.note = "chờ bạn xem bảng nhân vật";
                setReviewHold(true);
                say("Đã phân tích xong. Sửa bảng nhân vật nếu cần, rồi bấm Dịch tiếp.");
              }
              await sleep(300, signal);
              continue;
            }
          } else if (preRef.current && !j.bible) {
            if (!done) {
              await sleep(500, signal);
              continue;
            }
            await ensureAnalysis();
            if (my !== j.runId) return;
          }
          const group = take(done);
          if (!group.length) {
            if (done) return;
            await sleep(400, signal);
            continue;
          }
          group.forEach((seg) => {
            seg.busy = true;
          });
          try {
            const origs = group.map((seg) => seg.original);
            const at = j.segs.indexOf(group[0]);
            const nxt = j.segs.slice(at + group.length, at + group.length + 5).map((item) => item.original);
            const ctx = j.segs.slice(Math.max(0, at - 14), at).map((seg) =>
              seg.translation && seg.translation.trim() ? { o: seg.original, t: seg.translation } : seg.original,
            );
            const prior = j.segs.slice(Math.max(0, at - 14), at).map((seg) => seg.original);

            // Structured glossary (genre × source language) — hard override via placeholder
            let packTerms: Awaited<ReturnType<typeof loadGenreGlossary>>["terms"] = [];
            try {
              const pack = await loadGenreGlossary(source, genre, target);
              packTerms = overlayUserTerms(pack.terms, userTermsRef.current);
            } catch {
              packTerms = overlayUserTerms([], userTermsRef.current);
            }
            const effectiveGloss = packTerms.length ? mergeIntoGloss(gloss, packTerms) : gloss;
            const { protected: protectedOrigs, restoreMap, hits } = protectTerms(origs, packTerms, source);

            const opts = {
              ctx,
              nxt,
              genre,
              context: [
                contextBlock({ title, notes, gloss: effectiveGloss, bible: j.bible }),
                addressLock([...prior, ...origs, ...nxt], j.bible),
              ]
                .filter(Boolean)
                .join("\n\n"),
            };
            let translated: string[] | null = null;
            let used = mode === "manual" ? chosen : "";
            let lastError: Error | undefined;
            const attempts = mode === "manual" ? 1 : 3;
            for (let attempt = 0; attempt < attempts; attempt++) {
              const picked =
                mode === "manual"
                  ? { id: chosen, via: "chọn tay" }
                  : pickAutoModel({
                      profile,
                      texts: origs,
                      sourceLang: source,
                      genre,
                      glossaryHit: glossaryHit(origs, effectiveGloss) || hits > 0,
                      allowEnterprise,
                      available: remoteIds ? new Set(remoteIds) : null,
                      cooling: j.cooling,
                      blocked: j.blocked,
                      escalate: attempt > 0,
                    });
              used = picked.id;
              j.lastModel = used;
              j.note = picked.via;
              progress();
              try {
                // Send protected lines (terms → placeholders) so LLM cannot rewrite forced terms
                translated = await translateWithRepair(
                  protectedOrigs,
                  target,
                  token,
                  used,
                  signal,
                  j.gate,
                  opts,
                  onWait,
                  ticketId,
                );
                break;
              } catch (error) {
                if ((error as Error)?.name === "AbortError") throw error;
                lastError = error as Error;
                const message = lastError.message || "";
                if (/429|giới hạn/.test(message)) j.cooling.set(used, Date.now() + 20000);
                if (/404|không tìm thấy model|decommissioned|model .* not found/i.test(message)) j.blocked.add(used);
                if (mode === "manual") throw lastError;
              }
            }
            if (!translated) throw lastError || new Error("Dịch văn bản thất bại.");
            const settled = settleGlossaryLines(protectedOrigs, translated, restoreMap);
            translated = settled.lines;
            if (settled.retryIndexes.length) {
              try {
                const again = protectTerms(origs, packTerms, source);
                const redo = await translateIndexes(
                  again.protected,
                  settled.retryIndexes,
                  target,
                  token,
                  used,
                  signal,
                  j.gate,
                  { ...opts, fix: true },
                  onWait,
                  settled.lines,
                  ticketId,
                );
                const restored = restoreTerms(redo, again.restoreMap).map((line) => stripLeftoverPlaceholders(line));
                settled.retryIndexes.forEach((index, k) => {
                  const line = restored[k] || "";
                  if (!line.trim() || untranslated(origs[index], line)) return;
                  translated![index] = line;
                });
              } catch (error) {
                if ((error as Error)?.name === "AbortError") throw error;
              }
            }
            if (my !== j.runId) return;
            let failedInGroup = 0;
            let changed = 0;
            group.forEach((seg, offset) => {
              if (seg.original !== origs[offset]) {
                seg.translation = null;
                seg.translationFailed = false;
                changed++;
                return;
              }
              const line = (translated![offset] || "").trim();
              seg.model = used;
              if (!line || untranslated(seg.original, line)) {
                seg.translation = "";
                seg.translationFailed = true;
                failedInGroup++;
              } else {
                seg.translation = translated![offset];
                seg.translationFailed = false;
              }
            });
            j.uses[used] = (j.uses[used] || 0) + (group.length - failedInGroup - changed);
            j.note = "";
            publish();
            progress();
          } finally {
            group.forEach((seg) => {
              seg.busy = false;
            });
          }
        }
      };
      const translators = Math.min(4, Math.max(2, threads));
      await Promise.all(Array.from({ length: translators }, worker));
    };

    try {
      j.diagLang = source;
      const id = mediaId();
      const havePcm = Boolean((j.pcm || j.stream) && j.pcmId === id);
      if (j.pcmId !== id || j.doneSource !== source) {
        if (!havePcm) {
          say("Đang đọc cấu trúc file…");
          const primary = audioFile || file;
          const opened = await openStream(primary, link, signal, j.forceOld);
          j.streamWhy = opened.why;
          const video = videoRef.current;
          if (opened.stream && video) {
            if (opened.stream.dur > MAX_STREAM_HOURS * 3600)
              throw new Error(`Video dài hơn ${MAX_STREAM_HOURS} giờ. Hãy cắt thành các phần nhỏ hơn.`);
            if (j.videoUrl) URL.revokeObjectURL(j.videoUrl);
            j.videoUrl = null;
            const playback = file || audioFile;
            if (playback) {
              j.videoUrl = URL.createObjectURL(playback);
              video.src = j.videoUrl;
            } else video.src = link;
            video.load();
            j.stream = opened.stream;
            j.pcm = null;
            j.pcmId = id;
          } else {
            say("Đang tải video…");
            if (j.videoUrl) URL.revokeObjectURL(j.videoUrl);
            j.videoUrl = null;
            if (video && !file && !audioFile) {
              video.src = link;
              video.load();
            }
            const blob = await loadBlob(primary, link, signal, (message) => say(message));
            if (!blob.size) throw new Error("File video/âm thanh trống.");
            if (my !== j.runId) return;
            if (video && (file || audioFile)) {
              j.videoUrl = URL.createObjectURL(file || blob);
              video.src = j.videoUrl;
              video.load();
            }
            await waitForMetadata(video).catch(() => {});
            if (video && Number.isFinite(video.duration) && video.duration > MAX_MINUTES * 60)
              throw new Error(`File dài hơn ${MAX_MINUTES} phút sẽ làm đầy bộ nhớ máy. Hãy cắt thành đoạn ngắn hơn.`);
            say("Đang giải mã và đưa âm thanh về 16 kHz…");
            j.pcm = await decodeTo16k(blob, audioContext);
            if (my !== j.runId) return;
            j.pcmId = id;
            j.stream = null;
          }
        }
        j.segs = [];
        j.nextPart = 0;
        j.skipped = 0;
        j.asrCost = 0;
        j.asrBuf.clear();
    j.heard.clear();
        j.failedParts = [];
        j.decodeRetried = new Set();
        j.retryUsedSeconds = 0;
        j.retryReport = null;
        j.filterRetried = new Set();
        j.filterRetryUsed = 0;
        j.filterRetryReport = null;
        j.heardOffset.clear();
        j.gapSpent = 0;
        gapPlanRef.current = null;
        setGapPlanState(null);
        j.rawParts = [];
        j.rejects = [];
        j.bible = null;
        j.analysisP = null;
        j.bibleGo = false;
        j.holdPosted = false;
        setBible(null);
        setReviewHold(false);
        j.uses = {};
        const planRecognitionParts = async () => {
          const totalSamples = j.pcm ? j.pcm.length : Math.floor((j.stream?.dur || 0) * SR);
          const duration = totalSamples / SR;
          if (!(duration > 0)) return j.pcm ? splitAudio(j.pcm) : streamParts(j.stream!.dur);
          const scanStreamEnergy = async () => {
            const levels: number[] = [];
            for (let at = 0; at < duration; at += 30) {
              throwIfAborted(signal);
              const end = Math.min(duration, at + 30);
              const samples = await streamSamples(j.stream!, audioContext, at, end, signal);
              if (!samples?.length) {
                const count = Math.max(1, Math.ceil(end - at));
                for (let i = 0; i < count; i++) levels.push(1);
                continue;
              }
              levels.push(...windowRms(samples));
            }
            return levels;
          };
          let levels: number[] = [];
          try {
            levels = j.pcm ? windowRms(j.pcm) : await scanStreamEnergy();
          } catch (error) {
            if ((error as { name?: string })?.name === "AbortError") throw error;
            return streamParts(duration);
          }
          let spans = spansFromEnergy(levels, 1, energyThreshold(levels));
          if (j.pcm && vadRef.current) {
            try {
              j.note = "đang tìm đoạn có lời";
              progress();
              const { speechProbabilities } = await import("@/lib/sub/vad-runtime");
              const speech = speechSpansFromProbs(await speechProbabilities(j.pcm));
              if (speech.length) spans = speech;
            } catch (error) {
              if ((error as { name?: string })?.name === "AbortError") throw error;
              warnVad();
            }
          }
          if (!spans.length) {
            j.note = "không thấy đoạn có tiếng, vẫn thử cả file. Hãy tăng âm lượng hoặc bật lọc tiếng người";
            say("Không thấy đoạn nào có tiếng. File có thể thu quá nhỏ. Hãy tăng âm lượng hoặc bật lọc tiếng người rồi chạy lại.", true);
          }
          const planned = chunksToSamples(chunksFromSpans(spans, duration), totalSamples);
          return planned.length ? planned : j.pcm ? splitAudio(j.pcm) : streamParts(duration);
        };
        j.parts = await planRecognitionParts();
        j.doneSource = source;
        j.appliedSig = "";
        publish(true);
      }

      pauseForNewBible.current = !(j.bible && !j.bible.failed);
      let asrFinished = j.nextPart >= j.parts.length;
      const inner = new AbortController();
      const onAbort = () => inner.abort();
      if (signal.aborted) inner.abort();
      else signal.addEventListener("abort", onAbort, { once: true });
      const fail = (error: unknown) => {
        inner.abort();
        throw error;
      };
      const asr = transcribeRemaining().then(
        () => {
          asrFinished = true;
        },
        fail,
      );
      const tr = translateRemaining(() => asrFinished).catch(fail);
      const results = await Promise.allSettled([asr, tr]);
      signal.removeEventListener("abort", onAbort);
      const errors = results.filter((item): item is PromiseRejectedResult => item.status === "rejected").map((item) => item.reason as Error);
      const real = errors.find((error) => error?.name !== "AbortError");
      if (real) throw real;
      if (errors.length) throw errors[0];
      publish(true);
      if (my !== j.runId) return;
      if (j.nextPart >= j.parts.length) {
        j.pcm = null;
        j.stream = null;
      }
      const retryBit =
        j.retryReport && (j.retryReport.usedSeconds > 0 || j.retryReport.missing.length > 0) ? ` ${formatRetryStatus(j.retryReport)}` : "";
      if (!j.segs.length) {
        say(
          `Không nhận dạng được lời nói. Có thể video không có tiếng hoặc âm thanh quá nhỏ. Đã bỏ qua ${j.skipped} đoạn im lặng.${retryBit}`,
          true,
        );
        return;
      }
      const pending = j.segs.some((seg) => seg.translation === null);
      const failedN = j.segs.filter((seg) => seg.translationFailed).length;
      if (pending) say(`Còn câu chưa dịch. Bấm Tiếp tục — không phải nhận dạng lại.${retryBit}`, true);
      else if (failedN || j.failedParts.length || j.retryReport?.missing.length) {
        const bits = [
          failedN ? `${failedN} câu không dịch được` : "",
          j.retryReport?.missing.length ? formatRetryStatus(j.retryReport) : j.failedParts.length ? `${j.failedParts.length} đoạn không giải mã được` : "",
        ].filter(Boolean);
        say(`Hoàn tất nhưng ${bits.join(". ")}. Câu đã dịch không bị gửi lại.`, true);
      } else {
        const mix =
          mode === "auto"
            ? " · " +
              Object.entries(j.uses)
                .map(([id, count]) => `${modelLabel(id)} × ${count}`)
                .join(", ")
            : "";
        say(`Hoàn tất: ${j.segs.length} câu · bỏ qua ${j.skipped} đoạn im lặng${mix}.${retryBit}`);
      }
    } catch (error) {
      if (my !== j.runId) return;
      const err = error as Error;
      if (err?.name === "AbortError") {
        const canResume = ((j.pcm || j.stream) && j.nextPart < j.parts.length) || j.segs.some((seg) => seg.translation === null);
        say(canResume ? "Đã hủy. Bấm Tiếp tục để làm nốt. Phần đã nhận dạng không bị gửi lại." : "Đã hủy.");
        return;
      }
      ticketFailed = true;
      if (j.forceOld && /giải mã được âm thanh theo đoạn/.test(err?.message || "")) clearJob();
      const why = j.streamWhy && /lớn hơn|dài hơn/.test(err?.message || "") ? ` (Đọc theo đoạn không dùng được vì: ${j.streamWhy}.)` : "";
      say(`Lỗi: ${err?.message || String(error)}${why}`, true);
    } finally {
      releasePlayback();
      await closeRoomTicket(ticketId, ticketFailed);
      try {
        await audioContext.close();
      } catch {
        /* context có thể đã đóng */
      }
      if (my === j.runId) {
        j.abort = null;
        setRunning(false);
        setReviewHold(false);
        setAnalyzing(false);
        publish(true);
      }
    }
  }, [
    allowEnterprise,
    analyzing,
    asrModel,
    audioFile,
    clearJob,
    file,
    genre,
    gloss,
    key,
    guardRoom,
    mediaId,
    mode,
    modelId,
    modelSig,
    notes,
    pre,
    profile,
    progress,
    publish,
    remoteIds,
    saveGloss,
    say,
    source,
    target,
    threads,
    title,
    url,
  ]);

  const setReviewBefore = useCallback((value: boolean) => {
    reviewRef.current = value;
    setReviewBeforeState(value);
    writeStore("greview", value ? "1" : "0");
    if (!value) {
      job.current.bibleGo = true;
      setReviewHold(false);
    }
  }, []);

  const setPreLive = useCallback((value: boolean) => {
    preRef.current = value;
    setPre(value);
    writeStore("gpre", value ? "1" : "0");
    if (!value) {
      job.current.bibleGo = true;
      setReviewHold(false);
    }
  }, []);

  const approveBible = useCallback(() => {
    job.current.bibleGo = true;
    setReviewHold(false);
    say("Đang dịch theo bảng nhân vật…");
  }, [say]);

  const mutateBible = useCallback((recipe: (current: Bible) => void) => {
    const current = job.current.bible;
    if (!current || current.failed) return;
    recipe(current);
    setBible(cloneBible(current));
  }, []);

  const patchCharacter = useCallback(
    (index: number, patch: { name?: string; gender?: string; self?: string; addressed?: string }) => {
      mutateBible((current) => {
        const list = current.characters || [];
        if (!list[index]) return;
        list[index] = { ...list[index], ...patch };
        current.characters = list;
        const name = (list[index].name || "").trim().toLowerCase();
        if (name && (patch.gender === "male" || patch.gender === "female" || patch.gender === "unknown")) {
          const saved = readGenderMap(voiceStore("cast", title));
          if (patch.gender === "unknown") delete saved[name];
          else saved[name] = patch.gender;
          writeStore(voiceStore("cast", title), JSON.stringify(saved));
        }
      });
    },
    [mutateBible, title],
  );

  const patchSummary = useCallback(
    (summary: string) => {
      mutateBible((current) => {
        current.summary = summary;
      });
    },
    [mutateBible],
  );

  const patchTerm = useCallback(
    (index: number, tgt: string) => {
      mutateBible((current) => {
        const list = current.terms || [];
        if (!list[index]) return;
        list[index] = { ...list[index], tgt };
      });
    },
    [mutateBible],
  );

  const analyzeNow = useCallback(async () => {
    const token = activeKey();
    if (!token) return say("Nhập API key trước khi phân tích.", true);
    const lines = job.current.segs.map((seg) => seg.original).filter(Boolean);
    if (!lines.length) return say("Chưa có lời thoại. Hãy nhận dạng trước, rồi phân tích.", true);
    if (running) return say("Đang chạy. Hãy hủy hoặc đợi xong rồi phân tích lại.", true);
    const chosen = modelId.trim();
    const analysisModel =
      mode === "manual"
        ? chosen
        : pickAutoModel({
            profile: "accurate",
            texts: ["analysis"],
            sourceLang: source,
            genre,
            glossaryHit: true,
            allowEnterprise,
            available: remoteIds ? new Set(remoteIds) : null,
            cooling: job.current.cooling,
            blocked: job.current.blocked,
            escalate: true,
          }).id;
    if (!analysisModel) return say("Chưa chọn model dịch.", true);
    let ticketId: string | null = null;
    let releasePlayback = () => {};
    if (roomPayRef.current) {
      try {
        const spanSeconds = Math.max(60, Math.ceil(Math.max(0, ...job.current.segs.map((seg) => seg.end))));
        ticketId = (await openRoomTicket({ fileName: "Phân tích phim", seconds: spanSeconds, asrModel, chatModel: analysisModel })).id;
        releasePlayback = claimPlayback(ticketId);
      } catch (error) {
        return say(error instanceof Error ? error.message : "Không giữ được tiền cho lần phân tích.", true);
      }
    }
    setAnalyzing(true);
    say("Đang phân tích phim…");
    const controller = new AbortController();
    job.current.abort = controller;
    let analysisFailed = false;
    try {
      const next = await analyzeFilm({
        key: token,
        model: analysisModel,
        language: target,
        title,
        notes,
        gloss,
        lines,
        signal: controller.signal,
        gate: job.current.gate,
        onWait: (message) => say(message),
        ticket: ticketId,
      });
      applyNameFixes(job.current.segs, next);
      overlayCastLocks(next, title);
      job.current.bible = next;
      job.current.analysisP = Promise.resolve(next);
      job.current.bibleGo = false;
      job.current.holdPosted = false;
      setBible(cloneBible(next));
      publish(true);
      say(`Đã phân tích ${next.characters?.length || 0} nhân vật. Sửa bảng nếu cần, rồi bấm Tiếp tục để dịch.`);
    } catch (error) {
      const err = error as Error;
      if (err?.name === "AbortError") {
        say("Đã hủy phân tích.");
        return;
      }
      analysisFailed = true;
      const failed: Bible = { failed: err?.message || String(error) };
      job.current.bible = failed;
      setBible(failed);
      say(`Không phân tích được: ${failed.failed}`, true);
    } finally {
      releasePlayback();
      await closeRoomTicket(ticketId, analysisFailed);
      if (job.current.abort === controller) job.current.abort = null;
      setAnalyzing(false);
    }
  }, [allowEnterprise, asrModel, genre, gloss, key, mode, modelId, notes, publish, remoteIds, running, say, source, target, title]);

  const retryFailed = useCallback(() => {
    void (async () => {
      const access = await guardRoom("Bản dùng thử chỉ dịch một lần. Không dịch lại.");
      if (!access) return;
      let n = 0;
      for (const seg of job.current.segs) {
        if (!seg.translationFailed) continue;
        seg.translation = null;
        seg.translationFailed = false;
        seg.busy = false;
        n++;
      }
      if (!n) {
        say("Không có câu lỗi để dịch lại.");
        return;
      }
      publish(true);
      if (job.current.abort) {
        say(`Đưa ${n} câu lỗi vào hàng dịch. Câu đã xong không gửi lại.`);
        return;
      }
    void start();
    })();
  }, [guardRoom, publish, say, start]);

  const readRanges = useCallback(
    async (
      signal: AbortSignal,
      run: (read: (start: number, end: number) => Promise<Float32Array | null>, duration: number) => Promise<void>,
    ) => {
      const j = job.current;
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) throw new Error("Trình duyệt này không hỗ trợ xử lý âm thanh.");
      if (j.pcm && j.pcm.length) {
        const pcm = j.pcm;
        await run(
          async (start, end) => pcm.subarray(Math.max(0, Math.floor(start * SR)), Math.min(pcm.length, Math.floor(end * SR))),
          pcm.length / SR,
        );
        return;
      }
      let audioContext: AudioContext;
      try {
        audioContext = new AudioContextClass({ sampleRate: SR });
      } catch {
        audioContext = new AudioContextClass();
      }
      try {
        const fromStream = async (stream: Mp4Stream, duration: number) => {
          await run((start, end) => streamSamples(stream, audioContext, start, end, signal), duration);
        };
        if (j.stream) {
          await fromStream(j.stream, j.stream.dur);
          return;
        }
        const link = url.trim();
        const primary = audioFile || file;
        if (!primary && !link) throw new Error("Không còn file âm thanh để dò. Hãy chọn lại video.");
        const opened = await openStream(primary, link, signal, j.forceOld);
        if (opened.stream) {
          await fromStream(opened.stream, opened.stream.dur);
          return;
        }
        const blob = await loadBlob(primary, link, signal, () => {});
        const pcm = await decodeTo16k(blob, audioContext);
        await run(
          async (start, end) => pcm.subarray(Math.max(0, Math.floor(start * SR)), Math.min(pcm.length, Math.floor(end * SR))),
          pcm.length / SR,
        );
      } finally {
        try {
          await audioContext.close();
        } catch {
          /* context có thể đã đóng */
        }
      }
    },
    [audioFile, file, url],
  );

  const scanGaps = useCallback(async () => {
    const access = await guardRoom("Bản dùng thử không dò khoảng trống.");
    if (!access) return;
    if (running) return say("Đang chạy. Hãy đợi xong hoặc hủy rồi mới dò khoảng trống.", true);
    if (!job.current.segs.length) return say("Chưa có phụ đề để so khoảng trống.", true);
    const controller = new AbortController();
    const my = ++job.current.runId;
    job.current.abort = controller;
    setRunning(true);
    say("Đang dò khoảng trống trên máy. Chưa gửi gì lên mạng.");
    try {
      let found: Awaited<ReturnType<typeof spansFromBlocks>> = [];
      await readRanges(controller.signal, async (read, duration) => {
        found = await spansFromBlocks(duration, job.current.segs, read, controller.signal);
      });
      if (my !== job.current.runId) return;
      const remaining = Math.max(0, GAP_BUDGET_SECONDS - job.current.gapSpent);
      const plan = budgetSpeechGaps(found, asrUsd(asrModel), remaining);
      gapPlanRef.current = plan;
      setGapPlanState(plan);
      if (!plan.selected.length) {
        say(
          plan.deferred.length
            ? `Có ${plan.deferred.length} khoảng nhưng không vừa ngân sách còn ${remaining.toFixed(0)} giây. Chưa gửi.`
            : "Không thấy khoảng dài nào có tiếng mà thiếu câu. Chưa gửi.",
        );
        return;
      }
      say(
        `Tìm thấy ${plan.selected.length} khoảng, ${plan.audioSeconds.toFixed(1)} giây. Chưa gửi. Bấm «Nhận dạng các khoảng này» nếu muốn.`,
      );
    } catch (error) {
      if (my !== job.current.runId) return;
      const err = error as Error;
      if (err?.name === "AbortError") {
        say("Đã hủy dò khoảng trống. Chưa gửi gì lên mạng.");
        return;
      }
      say(err?.message || "Không dò được khoảng trống.", true);
    } finally {
      if (job.current.abort === controller) job.current.abort = null;
      if (my === job.current.runId) setRunning(false);
    }
  }, [asrModel, guardRoom, readRanges, running, say]);

  const fillGaps = useCallback(async () => {
    const access = await guardRoom("Bản dùng thử không nhận dạng lại.");
    if (!access) return;
    if (running) return say("Đang chạy. Hãy đợi xong rồi mới gửi khoảng trống.", true);
    const plan = gapPlanRef.current;
    if (!plan?.selected.length) return say("Chưa có khoảng trống để gửi. Hãy dò trước.", true);
    const token = activeKey();
    if (!token) return say("Nhập API key trước khi gửi.", true);
    if (!confirm(formatGapConfirm(plan))) return;
    let ticketId: string | null = null;
    let gapFailed = false;
    let releasePlayback = () => {};
    if (roomPayRef.current) {
      try {
        ticketId = (
          await openRoomTicket({ fileName: "Khoảng trống", seconds: Math.max(10, Math.ceil(plan.audioSeconds)), asrModel, chatModel: "auto" })
        ).id;
        releasePlayback = claimPlayback(ticketId);
      } catch (error) {
        return say(error instanceof Error ? error.message : "Không giữ được tiền cho lần gửi khoảng trống.", true);
      }
    }
    const controller = new AbortController();
    const my = ++job.current.runId;
    job.current.abort = controller;
    const signal = controller.signal;
    setRunning(true);
    const before = job.current.segs.length;
    let sent = 0;
    try {
      const clips: Array<{ start: number; end: number; samples: Float32Array }> = [];
      await readRanges(signal, async (read) => {
        for (const span of plan.selected) {
          throwIfAborted(signal);
          const samples = await read(span.start, span.end);
          if (samples && samples.length) clips.push({ start: span.start, end: span.end, samples: new Float32Array(samples) });
        }
      });
      for (const clip of clips) {
        throwIfAborted(signal);
        if (my !== job.current.runId) return;
        const j = job.current;
        if (isSilentChunk(clip.samples) && !vadRef.current) continue;
        const gated = await gateChunk(clip.samples, vadRef.current);
        if (!gated) continue;
        if (gated.fallback) say("Không tải được bộ lọc tiếng người. Khoảng này gửi theo mức năng lượng.");
        const start = clip.start + gated.offset;
        const seconds = gated.samples.length / SR;
        say(`Đang nhận dạng ${fmt(start)}–${fmt(start + seconds)}. Chỉ khoảng đã xác nhận.`);
        const packed = await packAudio(gated.samples, signal);
        throwIfAborted(signal);
        const result = await transcribe(packed, token, source, asrPrompt(title, gloss), asrModel, signal, j.gate, (message) => say(message), ticketId);
        if (my !== j.runId) return;
        j.asrCost += Math.max(10, seconds) * asrUsd(asrModel);
        j.gapSpent += Math.max(10, seconds);
        sent++;
        const ingested = ingestAsrPart({
          partIndex: -1,
          chunkStart: start,
          chunkEnd: start + seconds,
          requestedLanguage: j.diagLang || source,
          result,
          segs: j.segs,
          samples: gated.samples,
        });
        j.rawParts.push(ingested.raw);
        if (ingested.rejects.length) j.rejects.push(...ingested.rejects);
        j.segs.sort((a, b) => a.start - b.start || a.end - b.end);
        applyLineLocks(j.segs, lineLocksRef.current);
        publish(true);
      }
      if (my !== job.current.runId) return;
      const added = job.current.segs.length - before;
      gapPlanRef.current = null;
      setGapPlanState(null);
      say(
        added
          ? `Đã thêm ${added} câu từ khoảng trống. Bấm Tiếp tục để dịch phần mới. Không nhận dạng lại cả phim.`
          : `Đã gửi ${sent} khoảng nhưng không thêm câu mới. Không gửi thêm.`,
      );
    } catch (error) {
      if (my !== job.current.runId) return;
      const err = error as Error;
      if (err?.name === "AbortError") {
        say(sent ? "Đã hủy. Khoảng chưa gửi thì không bị tính thêm." : "Đã hủy. Chưa gửi khoảng nào.");
        return;
      }
      gapFailed = true;
      say(err?.message || "Không nhận dạng được khoảng trống.", true);
    } finally {
      releasePlayback();
      await closeRoomTicket(ticketId, gapFailed);
      if (sent) {
        gapPlanRef.current = null;
        setGapPlanState(null);
      }
      if (job.current.abort === controller) job.current.abort = null;
      if (my === job.current.runId) setRunning(false);
    }
  }, [asrModel, gloss, guardRoom, key, publish, readRanges, running, say, source, title]);

  const playReject = useCallback(async (row: RejectEntry) => {
    if (row.start == null || row.end == null) {
      say("Câu này không có mốc thời gian để nghe.", true);
      return;
    }
    const j = job.current;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return say("Trình duyệt này không phát được đoạn tiếng.", true);
    let samples: Float32Array | null = j.pcm ? slicePcm(j.pcm, row.start, row.end, SR) : null;
    if (!samples && j.stream) {
      const decode = new AudioContextClass({ sampleRate: SR });
      try {
        samples = await streamSamples(j.stream, decode, row.start, row.end, new AbortController().signal);
      } catch {
        samples = null;
      } finally {
        await decode.close();
      }
    }
    if (!samples?.length) return say("Không còn mẫu tiếng của câu này.", true);
    const ctx = new AudioContextClass({ sampleRate: SR });
    const buffer = ctx.createBuffer(1, samples.length, SR);
    buffer.getChannelData(0).set(samples);
    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.connect(ctx.destination);
    sourceNode.onended = () => void ctx.close();
    sourceNode.start();
  }, [say]);

  const keepReject = useCallback((index: number) => {
    const j = job.current;
    const row = j.rejects[index];
    if (!row || row.dismissed) return;
    const text = row.text.trim();
    const start = row.start;
    if (!keepRejectedCue(j.segs, row) || start == null || row.end == null) {
      say("Không giữ được câu này. Có thể đã có trong phụ đề, hoặc không có chữ.", true);
      return;
    }
    const kept = j.segs.find((seg) => seg.original === text && seg.start === start);
    if (kept && j.pcm) {
      const samples = slicePcm(j.pcm, start, row.end, SR);
      const hz = samples ? measurePitch(samples, SR) : null;
      if (hz) kept.pitchHz = hz;
    }
    assignVoices(j.segs);
    applyLineLocks(j.segs, lineLocksRef.current);
    j.rejects.splice(index, 1);
    publish(true);
    say("Đã giữ câu. Bấm Tiếp tục để dịch nếu câu này chưa có bản dịch.");
  }, [publish, say]);

  const dropReject = useCallback((index: number) => {
    const row = job.current.rejects[index];
    if (!row || row.dismissed) return;
    row.dismissed = true;
    publish(true);
    say("Đã bỏ câu này. Không đưa vào phụ đề.");
  }, [publish, say]);

  const cycleVoiceLock = useCallback((index: number) => {
    const seg = job.current.segs[index];
    if (!seg) return;
    const next = seg.voiceLock === "male" ? "female" : seg.voiceLock === "female" ? undefined : "male";
    const saved = { ...lineLocksRef.current };
    const id = lineLockId(seg);
    if (next) {
      seg.voiceLock = next;
      seg.voice = next;
      saved[id] = next;
    } else {
      delete seg.voiceLock;
      delete saved[id];
    }
    lineLocksRef.current = saved;
    writeStore(voiceStore("line", title), JSON.stringify(saved));
    assignVoices(job.current.segs);
    applyLineLocks(job.current.segs, saved);
    publish(true);
  }, [publish, title]);

  const chooseVoice = useCallback((next: string) => {
    const id = next.trim();
    if (!id) return;
    setMode("manual");
    setModelId(id);
    writeStore("gmode", "manual");
    writeStore("gmdl", id);
  }, []);

  return {
    key,
    setKey,
    setRoomPay,
    target,
    setTarget,
    source,
    setSource,
    genre,
    setGenre,
    threads,
    setThreads,
    mode,
    setMode,
    profile,
    setProfile,
    modelId,
    setModelId,
    chooseVoice,
    allowEnterprise,
    setAllowEnterprise,
    asrModel,
    setAsrModel,
    speechVad,
    setSpeechVad: (value: boolean) => {
      vadRef.current = value;
      setSpeechVadState(value);
      writeStore("gvad", value ? "1" : "0");
    },
    title,
    setTitle: (value: string) => {
      setTitle(value);
      saveGloss(value, notes, gloss);
      const stored = readStore("gl_" + (value.trim().toLowerCase() || "_"));
      if (stored) setGloss(stored);
    },
    notes,
    setNotes: (value: string) => {
      setNotes(value);
      saveGloss(title, value, gloss);
    },
    gloss,
    setGloss: (value: string) => {
      setGloss(value);
      saveGloss(title, notes, value);
    },
    glossaryInfo,
    userTerms,
    addUserTerm: (sourceText: string, targetText: string) => {
      const sourceTextTrim = sourceText.trim();
      const targetTextTrim = targetText.trim();
      if (!sourceTextTrim) return;
      setUserTerms((prev) => {
        const next = overlayUserTerms(
          prev,
          [{ source: sourceTextTrim, target: targetTextTrim || sourceTextTrim }],
        );
        writeStore(userGlossKey(source, genre), JSON.stringify(next));
        shareUserTerms(source, genre, next);
        return next;
      });
    },
    removeUserTerm: (sourceText: string) => {
      const key = sourceText.toLowerCase();
      setUserTerms((prev) => {
        const next = prev.filter((t) => t.source.toLowerCase() !== key);
        writeStore(userGlossKey(source, genre), JSON.stringify(next));
        return next;
      });
    },
    importUserCsv: (text: string) => {
      const parsed = parseGlossaryCsv(text);
      if (!parsed.length) return 0;
      setUserTerms((prev) => {
        const next = overlayUserTerms(prev, parsed);
        writeStore(userGlossKey(source, genre), JSON.stringify(next));
        shareUserTerms(source, genre, next);
        return next;
      });
      return parsed.length;
    },
    clearUserTerms: () => {
      setUserTerms([]);
      writeStore(userGlossKey(source, genre), "[]");
    },
    pre,
    setPre: setPreLive,
    reviewBefore,
    setReviewBefore,
    bible,
    analyzing,
    reviewHold,
    approveBible,
    analyzeNow,
    patchCharacter,
    patchSummary,
    patchTerm,
    file,
    setFile,
    audioFile,
    setAudioFile,
    url,
    setUrl,
    segs,
    diag,
    asrRetry,
    filterRetry,
    gapPlan,
    status,
    isError,
    running,
    buttonLabel,
    catalog,
    board,
    boardNote,
    remoteIds,
    modelBusy,
    uses,
    videoRef,
    refreshModels,
    start,
    cancel,
    reset,
    exportSrt,
    editSeg,
    cycleVoiceLock,
    retryFailed,
    scanGaps,
    fillGaps,
    playReject,
    keepReject,
    dropReject,
  };
}

async function loadBlob(file: File | null, url: string, signal: AbortSignal, status: (message: string) => void) {
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

function waitForMetadata(video: HTMLVideoElement | null) {
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

async function decodeTo16k(blob: Blob, audioContext: AudioContext) {
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
    throw new Error("Không giải mã được âm thanh. Hãy dùng mp4, webm, mp3, m4a hoặc wav.");
  }
  if (!audioBuffer.duration || !Number.isFinite(audioBuffer.duration)) throw new Error("Không đọc được thời lượng âm thanh.");
  if (audioBuffer.duration > MAX_MINUTES * 60)
    throw new Error(`File dài hơn ${MAX_MINUTES} phút sẽ làm đầy bộ nhớ máy. Hãy cắt thành đoạn ngắn hơn.`);
  const samples = await audioBufferTo16k(audioBuffer);
  if (!samples.length) throw new Error("Không tìm thấy âm thanh trong file.");
  if (isSilentChunk(samples)) throw new Error("Không nghe thấy tiếng trong file. Hãy tăng âm lượng hoặc chọn file khác.");
  return samples;
}
