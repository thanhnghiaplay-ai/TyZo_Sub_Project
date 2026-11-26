import { holdPageActivity } from "@/lib/page-activity";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { currentGenre, needsAgeConfirm } from "@/lib/home-state";
import { askConfirm } from "@/lib/confirm";
import { dropSaved, loadSaved, savedSummary, snapshotSegs, storeSaved, usableSaved } from "@/lib/saved-runs";
import { RIGHTS_CONFIRM, RIGHTS_DECLINED, RIGHTS_TEXT, RIGHTS_TITLE, rememberRights, rightsConfirmed } from "@/lib/rights-consent";
import { TERMS_VERSION } from "@/lib/terms";
import { usePolish } from "@/components/use-polish";
import { claimTrialDevice, recordRightsConsent, spendTrial } from "@/lib/room-account";
import { getMyPlace } from "@/lib/admin/admin-room";
import { authClient } from "@/lib/auth/client";
import { deviceId } from "@/lib/device-id";
import { roomAccess, trialFileProblem } from "@/lib/room-plans";
import { standingBlock } from "@/lib/staff-role";
import { readMediaSeconds } from "@/lib/trial-media";
import { addLocalRun } from "@/lib/local-runs";
import { claimPlayback, closeRoomTicket, forgetTicket, openRoomTicket, recoverOrphanTicket, rememberTicket } from "@/lib/sub/room-ticket";
import { packAudio } from "@/lib/sub/codec";
import { analyzeFilm, applyNameFixes, listModelIds, probeKey, ROOM_KEY, type ChatKey, throwIfAborted } from "@/lib/sub/groq";
import { mergeCatalog, modelLabel, pickAutoModel } from "@/lib/sub/models";
import { judgeKey, type KeyNeed, type KeyProbe } from "@/lib/sub/key-check";
import { computeStages, type RunPhase, type StageReport } from "@/lib/sub/stage-progress";
import { liveAsrPerSecond, type GroqBoard } from "@/lib/sub/groq-board";
import { loadGroqBoard } from "@/lib/sub/groq-board-load";
import { openStream, streamParts, streamSamples, type Mp4Stream } from "@/lib/sub/mp4";
import { gateChunk, speechSpansFromProbs } from "@/lib/sub/vad";
import { LANG_RETRY_BUDGET_SECONDS } from "@/lib/sub/lang-check";
import { summarizeQuality, type LangCheckReport } from "@/lib/sub/quality";
import { sparseSpeechNote } from "@/lib/sub/sparse-note";
import { loadQualityThresholds } from "@/lib/quality-load";
import { reportFromSummary } from "@/lib/quality-board";
import { reportQuality } from "@/lib/quality-room";
import { APP_VERSION } from "@/lib/app-version";
import { applyLineLocks, assignVoices, lineLockId, measurePitch } from "@/lib/sub/pitch-voice";
import { chunkOverlapsPrevious, chunksFromSpans, chunksToSamples, energyThreshold, spansFromEnergy } from "@/lib/sub/chunk-plan";
import { type FilterRetryReport } from "@/lib/sub/filter-retry";
import { ingestAsrPart, keepRejectedCue, slicePcm, type RawAsrPart, type RejectEntry } from "@/lib/sub/diagnostics";
import { formatRetryStatus, type AsrRetryReport } from "@/lib/sub/asr-retry";
import { asrPrompt, isSilentChunk, fmt, MAX_MINUTES, MAX_STREAM_HOURS, splitAudio, STYLE_EXTRA_MAX, SR, windowRms, type Bible } from "@/lib/sub/text";
import { loadRunGlossary, overlayUserTerms, parseGlossaryCsv, type GlossaryTerm } from "@/lib/sub/glossary";
import { budgetSpeechGaps, formatGapConfirm, GAP_BUDGET_SECONDS, spansFromBlocks, type GapPlan } from "@/lib/sub/gap-scan";
import { ASR_PRICE, type AsrModel, type AutoProfile, type ChatModel, type ModelMode, type Seg } from "@/lib/sub/types";
import { asrRunnerOf, transcribe } from "@/lib/providers";
import { removeAudioFromR2 } from "@/lib/sub/r2-upload-run";
import { asrHouse, asrTakesLink } from "@/lib/sub/asr-house";
import { pickPool, providerOfModel, roomMissing, roomMissingText, type RoomOffer } from "@/lib/sub/room-models";
import { listKeyModels } from "@/lib/key-models";
import { getRoomModelCounts, getRoomOffer } from "@/lib/provider-room";
import { modelTotalText, type ModelCounts } from "@/lib/sub/model-total";
import { PROVIDER_IDS, PROVIDERS, type ProviderId } from "@/lib/sub/provider";
import { readGenderMap, voiceStore, overlayCastLocks, cloneBible, readStore, writeStore, removeStore, shareUserTerms, userGlossKey, readUserTerms, safeStore } from "@/components/pipeline-store";
import { loadBlob, waitForMetadata, decodeTo16k } from "@/components/pipeline-media";
import { asrLanguageOf, emptyJob, commitDecodedJob, type Job } from "@/lib/pipeline/job";
import { uploadLocalAudio } from "@/lib/pipeline/link-upload";
import { downloadText, exportProblem, subtitleFile } from "@/lib/pipeline/export";
import { createRecognizer } from "@/lib/pipeline/recognize";
import { createTranslator } from "@/lib/pipeline/translate";
import { choiceProblem, planChoice, type RunChoice } from "@/lib/pipeline/choice";

/** Dòng trạng thái lúc mới mở, chưa có việc nào. Studio đổi chữ này khi Dịch bình thường đang bảo trì. */
export const READY_STATUS = "Sẵn sàng. Chọn video rồi bấm Tải và dịch.";

export function usePipeline() {
  const { data: savedSession, isPending: savedSessionPending } = authClient.useSession();
  const savedOwner = savedSession?.user?.id ?? "";
  const savedOwnerRef = useRef(savedOwner);
  savedOwnerRef.current = savedSessionPending ? "" : savedOwner;
  const priorSavedOwner = useRef("");
  const job = useRef<Job>(emptyJob());
  const lineLocksRef = useRef<Record<string, "female" | "male">>({});
  const [key, setKey] = useState("");
  // Key khách nhập cho các nhà ngoài Groq (Groq có `key` riêng vì còn kiểm key và đồng bộ model). Khóa kho lấy từ PROVIDERS[id].clientStore.
  const [houseKeys, setHouseKeys] = useState<Partial<Record<ProviderId, string>>>({});
  const houseKeysRef = useRef(houseKeys);
  houseKeysRef.current = houseKeys;
  const setHouseKey = useCallback((id: ProviderId, value: string) => {
    setHouseKeys((current) => ({ ...current, [id]: value }));
    // Xóa trắng là xóa khỏi máy, để tải lại trang không hiện lại key cũ.
    if (value.trim()) writeStore(PROVIDERS[id].clientStore, value);
    else removeStore(PROVIDERS[id].clientStore);
  }, []);
  /**
   * Đặt key Groq và lưu ngay trên máy khi đủ dài (trước đây chỉ lưu lúc bấm chạy, tải lại trang trước đó là mất).
   * Xóa trắng là xóa khỏi máy. Ô gõ dở (dưới 20 ký tự) không lưu.
   */
  const storeGroqKey = useCallback((value: string) => {
    setKey(value);
    if (!value.trim()) removeStore(PROVIDERS.groq.clientStore);
    else if (value.trim().length >= 20) writeStore(PROVIDERS.groq.clientStore, value.trim());
  }, []);
  const houseKeyOf = (id: ProviderId) => (houseKeysRef.current[id] ?? "").trim();
  // Model có trên key khách của các nhà ngoài Groq (Groq đã có remoteIds). Key chỉ đi qua máy chủ, không lưu.
  // Hỏi mọi nhà khách đã nhập key để cộng tổng số model; nhà chưa đáng tin (KEY_LIST_TRUSTED) thì danh sách chỉ để đếm,
  // việc khóa model vẫn qua keyListHas nên không khóa oan.
  const [keyModels, setKeyModels] = useState<Partial<Record<ProviderId, string[] | null>>>({});
  const keyModelsRef = useRef(keyModels);
  keyModelsRef.current = keyModels;
  useEffect(() => {
    const timers: number[] = [];
    let live = true;
    for (const id of PROVIDER_IDS) {
      if (id === "groq") continue;
      const token = (houseKeys[id] ?? "").trim();
      if (token.length < 20) {
        setKeyModels((current) => (current[id] ? { ...current, [id]: null } : current));
        continue;
      }
      timers.push(
        window.setTimeout(() => {
          listKeyModels({ data: { provider: id, key: token } })
            .then((ids) => live && setKeyModels((current) => ({ ...current, [id]: ids })))
            .catch(() => live && setKeyModels((current) => ({ ...current, [id]: null })));
        }, 800),
      );
    }
    return () => {
      live = false;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [houseKeys]);
  const roomPayRef = useRef(false);
  /** Model key phòng theo từng nhà. Trả theo lượt thì chỉ chọn trong danh sách này, vì máy chủ chặn model ngoài danh sách. */
  const roomOfferedRef = useRef<RoomOffer | null>(null);
  /** Bản cho giao diện (ô chọn model) của danh sách phòng theo nhà. */
  const [roomOffer, setRoomOffer] = useState<RoomOffer | null>(null);
  const trialLease = useRef({ media: "", spent: false });
  const keyRef = useRef("");
  keyRef.current = key;
  const activeKey = () => (roomPayRef.current ? ROOM_KEY : keyRef.current.trim());
  const [target, setTarget] = useState("Vietnamese");
  const [source, setSource] = useState("zh");
  const [heardLang, setHeardLang] = useState("");
  const [genre, setGenre] = useState("auto");
  const [pendingGenre, setPendingGenre] = useState<string | null>(null);
  /** Kèm bộ thuật ngữ nền của ngôn ngữ nguồn. Mặc định bật. */
  const [baseGloss, setBaseGloss] = useState(true);
  const [threads, setThreads] = useState(3);
  const [mode, setMode] = useState<ModelMode>("manual");
  const [profile, setProfile] = useState<AutoProfile>("balanced");
  const [modelId, setModelId] = useState("openai/gpt-oss-120b");
  const [allowEnterprise, setAllowEnterprise] = useState(true);
  const [asrModel, setAsrModel] = useState<AsrModel>("whisper-large-v3-turbo");
  const [speechVad, setSpeechVadState] = useState(false);
  const vadRef = useRef(false);
  vadRef.current = speechVad;
  const [langCheck, setLangCheckState] = useState(false);
  const langRef = useRef(false);
  langRef.current = langCheck;
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [extra, setExtra] = useState("");
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
  const [langReport, setLangReport] = useState<LangCheckReport | null>(null);
  const [gapPlan, setGapPlanState] = useState<GapPlan | null>(null);
  const gapPlanRef = useRef<GapPlan | null>(null);
  const [status, setStatus] = useState(READY_STATUS);
  const [isError, setIsError] = useState(false);
  const [running, setRunning] = useState(false);
  // Tab bị trình duyệt dọn hoặc tải lại giữa lúc dịch: nhả Token còn giữ ngay lúc mở lại, không đợi 6 giờ.
  useEffect(() => {
    void recoverOrphanTicket().then((freed) => {
      if (freed) window.dispatchEvent(new Event("tyzo-room-refresh"));
    });
  }, []);
  // Đang dịch mà rời trang thì video và tiến độ trong bộ nhớ mất: báo trước để người dùng chọn ở lại.
  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);
  const [stages, setStages] = useState<StageReport | null>(null);
  const phaseRef = useRef<RunPhase>("idle");
  const [remoteIds, setRemoteIds] = useState<string[] | null>(null);
  const remoteIdsRef = useRef(remoteIds);
  remoteIdsRef.current = remoteIds;
  /**
   * Key cho mọi việc chữ (dịch, phân tích, trau chuốt) theo NHÀ của model: trả theo lượt dùng cửa phòng;
   * key riêng thì đưa đủ key của từng nhà khách đã nhập, kèm danh sách model mỗi key có để biết model lạ thuộc nhà nào.
   */
  const chatKeyOf = useCallback(
    (): ChatKey =>
      roomPayRef.current
        ? ROOM_KEY
        : {
            keys: { ...houseKeysRef.current, groq: keyRef.current.trim() },
            lists: { ...keyModelsRef.current, groq: remoteIdsRef.current },
          },
    [],
  );
  /** Model dịch chế độ Tự động được chọn: theo phòng (trả theo lượt) hoặc theo các nhà khách có key. */
  const autoPool = useCallback(() => {
    const ring = chatKeyOf();
    return pickPool(roomPayRef.current, roomOfferedRef.current, typeof ring === "string" ? null : { keys: ring.keys, lists: ring.lists ?? {} });
  }, [chatKeyOf]);
  const [board, setBoard] = useState<GroqBoard | null>(null);
  const [boardNote, setBoardNote] = useState("");
  const boardRef = useRef<GroqBoard | null>(null);
  const asrUsd = (model: AsrModel) => liveAsrPerSecond(boardRef.current?.rows || [], model, ASR_PRICE[model]);
  const [modelBusy, setModelBusy] = useState(false);
  const [uses, setUses] = useState<Record<string, number>>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const publishTimer = useRef(0);

  /** Chọn thể loại. Thể loại 18+ chỉ áp dụng sau khi khách xác nhận trên 18 tuổi trong hộp thoại của app. */
  const pickGenre = useCallback((value: string) => {
    if (needsAgeConfirm(value)) setPendingGenre(value);
    else setGenre(value);
  }, []);
  const confirmGenre = useCallback(() => {
    setPendingGenre((value) => {
      if (value) setGenre(value);
      return null;
    });
  }, []);
  const cancelGenre = useCallback(() => setPendingGenre(null), []);

  useEffect(() => {
    setKey(readStore(PROVIDERS.groq.clientStore));
    setHouseKeys(Object.fromEntries(PROVIDER_IDS.filter((id) => id !== "groq").map((id) => [id, readStore(PROVIDERS[id].clientStore)])));
    const lang = readStore("glang");
    setTarget(lang === "Vietnamese" ? lang : "Vietnamese");
    const src = readStore("gsrc");
    setSource(src === "auto" || src === "zh" || src === "ko" || src === "ja" || src === "en" ? src : "zh");
    const g = readStore("ggenre");
    // Thể loại 18+ không tự khôi phục: khách phải xác nhận lại trên 18 tuổi mỗi lần chọn.
    if (g) setGenre(needsAgeConfirm(g) ? "auto" : currentGenre(g));
    setBaseGloss(readStore("gbase") !== "0");
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
    if (asrHouse(whisper)) setAsrModel(whisper as AsrModel);
    if (readStore("gvad") === "1") setSpeechVadState(true);
    if (readStore("glang") === "1") setLangCheckState(true);
    setTitle(readStore("gtitle"));
    setNotes(readStore("gnotes"));
    setExtra(readStore("gextra").slice(0, STYLE_EXTRA_MAX));
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
        const pack = await loadRunGlossary(source, genre, target, baseGloss);
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
  }, [source, genre, target, userTerms, baseGloss]);

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
      setLangReport(
        job.current.langSuspect || job.current.langEvents.length
          ? {
              suspect: job.current.langSuspect,
              resent: job.current.langEvents.length,
              swapped: job.current.langEvents.filter((e) => e.swapped).length,
              usedSeconds: job.current.langRetryUsed,
              budgetSeconds: LANG_RETRY_BUDGET_SECONDS,
              events: job.current.langEvents,
            }
          : null,
      );
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

  const pushStages = useCallback(() => {
    const j = job.current;
    const phase = phaseRef.current;
    if (phase === "idle" && !j.segs.length && !j.parts.length) {
      setStages(null);
      return;
    }
    setStages(
      computeStages({
        phase,
        partsTotal: j.parts.length,
        partsDone: Math.min(j.nextPart, j.parts.length),
        segsTotal: j.segs.length,
        segsDone: j.segs.reduce((n, seg) => n + (seg.translation === null ? 0 : 1), 0),
        repairs: j.decodeRetried.size + j.filterRetried.size + j.langEvents.length,
        failed: j.segs.reduce((n, seg) => n + (seg.translationFailed ? 1 : 0), 0),
        readRatio: phase === "read" ? j.readRatio : 0,
        readSeconds: phase === "read" && j.readAt ? (Date.now() - j.readAt) / 1000 : 0,
      }),
    );
  }, []);

  const progress = useCallback(() => {
    const j = job.current;
    const done = j.segs.reduce((n, seg) => n + (seg.translation === null ? 0 : 1), 0);
    const modelBit = mode === "auto" && j.lastModel ? ` · Auto ${modelLabel(j.lastModel)}` : "";
    say(
      `Nhận dạng ${Math.min(j.nextPart, j.parts.length)}/${j.parts.length} đoạn · dịch ${done}/${j.segs.length} câu${modelBit}${j.note ? " · " + j.note : ""}`,
    );
    pushStages();
  }, [mode, say, pushStages]);

  const mediaId = useCallback(() => {
    if (file || audioFile)
      return `file:${file?.name}:${file?.size}:${file?.lastModified}|${audioFile ? audioFile.name + ":" + audioFile.size : ""}`;
    if (url.trim()) return `url:${url.trim()}`;
    return "";
  }, [file, audioFile, url]);

  const modelSig = mode === "auto" ? `auto:${profile}:${allowEnterprise ? 1 : 0}|${genre}${baseGloss ? "" : "|nb"}` : `${modelId}|${genre}${baseGloss ? "" : "|nb"}`;

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

  /** Kết quả hỏi Groq gần nhất cho đúng key đang nhập. Dùng để báo ngay dưới ô key và để chặn sớm trước khi chạy. */
  const [probe, setProbe] = useState<{ key: string; value: KeyProbe; at: number } | null>(null);
  const [probing, setProbing] = useState(false);
  const probeSeq = useRef(0);
  const probeRef = useRef<{ key: string; value: KeyProbe; at: number } | null>(null);
  probeRef.current = probe;

  const runProbe = useCallback(async (token: string): Promise<KeyProbe> => {
    const seq = ++probeSeq.current;
    setProbing(true);
    try {
      const value = await probeKey(token);
      if (seq === probeSeq.current) {
        const next = { key: token, value, at: Date.now() };
        probeRef.current = next;
        setProbe(next);
        if (value.status >= 200 && value.status < 300 && value.ids.length) setRemoteIds(value.ids);
      }
      return value;
    } finally {
      if (seq === probeSeq.current) setProbing(false);
    }
  }, []);

  // Dán hoặc gõ key xong chừng 0,8 giây thì tự kiểm tra, không cần bấm gì.
  useEffect(() => {
    const token = key.trim();
    if (token.length < 20) {
      probeSeq.current++;
      setProbing(false);
      setProbe(null);
      return;
    }
    const timer = window.setTimeout(() => void runProbe(token), 800);
    return () => window.clearTimeout(timer);
  }, [key, runProbe]);

  const keyNeed = useMemo<KeyNeed>(
    () => ({
      asr: asrTakesLink(asrModel) ? null : asrModel,
      chat: mode === "manual" ? modelId.trim() || null : null,
    }),
    [asrModel, mode, modelId],
  );

  const keyStatus = useMemo<{ phase: "idle" | "checking" | "ok" | "warn" | "bad"; text: string }>(() => {
    const token = key.trim();
    if (!token) return { phase: "idle", text: "" };
    if (!probe || probe.key !== token) return probing ? { phase: "checking", text: "Đang kiểm tra key…" } : { phase: "idle", text: "" };
    const verdict = judgeKey(probe.value, keyNeed);
    return { phase: verdict.state, text: verdict.text };
  }, [key, probe, probing, keyNeed]);

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
      // Tổng model của MỌI key: key phòng thì cộng các nhà phòng đã lưu key, key riêng thì cộng các nhà khách đã nhập key.
      const counts: ModelCounts = { groq: ids.length };
      if (token === ROOM_KEY) {
        const room = await getRoomModelCounts().catch(() => ({}) as ModelCounts);
        for (const id of PROVIDER_IDS) if (id !== "groq") counts[id] = room[id];
      } else {
        for (const id of PROVIDER_IDS) if (id !== "groq") counts[id] = keyModelsRef.current[id]?.length ?? null;
      }
      // Trả theo lượt: số model của key phòng là chuyện nội bộ, không đè dòng trạng thái của khách (đỡ xô trang).
      if (token !== ROOM_KEY) say(modelTotalText(false, counts));
    } catch (error) {
      say((error as Error).message || "Không đọc được danh sách model.", true);
    } finally {
      setModelBusy(false);
    }
  }, [pullBoard, say]);

  const setRoomPay = useCallback((on: boolean) => {
    roomPayRef.current = on;
    if (on) {
      void refreshModels();
      void getRoomOffer()
        .then((offer) => {
          roomOfferedRef.current = offer;
          setRoomOffer(offer);
        })
        .catch(() => {
          /* chưa đọc được: để máy chủ tự kiểm khi chạy */
        });
    }
  }, [refreshModels]);

  const clearJob = useCallback(() => {
    const j = job.current;
    j.qualitySent = false;
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
    phaseRef.current = "idle";
    setStages(null);
    publish(true);
  }, [publish]);

  // R5-008: discard previous account's in-memory job before any autosave for a new owner.
  useEffect(() => {
    if (savedSessionPending) return;
    const previous = priorSavedOwner.current;
    priorSavedOwner.current = savedOwner;
    if (previous && previous !== savedOwner) {
      job.current.runId++;
      job.current.abort?.abort();
      setRunning(false);
      clearJob();
    }
  }, [savedOwner, savedSessionPending, clearJob]);

  const reset = useCallback(() => {
    const j = job.current;
    if (!j.segs.length && !j.pcm && !j.pcmId) {
      say("Chưa có gì để xóa.");
      return;
    }
    void askConfirm({
      title: "Xóa phụ đề và làm lại?",
      text: roomPayRef.current
        ? "Xóa phụ đề hiện tại và nhận dạng lại từ đầu? Lần chạy lại trừ thêm Token dịch cho cả nhận dạng lẫn dịch. Muốn đổi model dịch mà giữ nhận dạng thì dùng Dịch lại bằng model khác."
        : "Xóa phụ đề hiện tại và nhận dạng lại từ đầu? Nhà cung cấp tính phí key của bạn thêm một lần cho cả nhận dạng lẫn dịch.",
      confirmLabel: "Xóa và làm lại",
      danger: true,
    }).then((ok) => {
      if (!ok) return;
      j.runId++;
      j.abort?.abort();
      j.abort = null;
      setRunning(false);
      clearJob();
      void dropSaved(savedOwnerRef.current, mediaId());
      say("Đã xóa. Bấm Tải và dịch để chạy lại.");
    });
  }, [clearJob, say, mediaId]);

  // v5.33.0: lưu phụ đề trên máy theo dấu tệp khi nhận dạng đã xong, để tải lại trang không mất phần khách đã trả.
  useEffect(() => {
    const j = job.current;
    const key = mediaId();
    if (!savedOwner || savedSessionPending) return;
    if (!key || !segs.length || j.pcmId !== key || !j.doneSource || j.nextPart < j.parts.length) return;
    const timer = window.setTimeout(() => {
      if (savedOwnerRef.current !== savedOwner) return;
      void storeSaved({
        ownerId: savedOwner,
        key,
        at: new Date().toISOString(),
        fileName: (audioFile || file)?.name || "",
        source: j.doneSource,
        target,
        segs: snapshotSegs(j.segs),
        bible: j.bible,
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [segs, mediaId, target, file, audioFile, savedOwner, savedSessionPending]);

  // Chọn lại đúng tệp đã làm (sau khi tải lại trang): hỏi khôi phục, không nhận dạng lại.
  const offeredSaved = useRef("");
  useEffect(() => {
    const key = mediaId();
    if (!savedOwner || savedSessionPending) return;
    const offerKey = `${savedOwner}:${key}`;
    if (!key || offeredSaved.current === offerKey) return;
    offeredSaved.current = offerKey;
    if (job.current.segs.length || running) return;
    let gone = false;
    void loadSaved(savedOwner, key).then(async (saved) => {
      if (gone || !usableSaved(saved, key, source, savedOwner)) return;
      const sum = savedSummary(saved);
      const ok = await askConfirm({
        title: "Khôi phục bản đã làm?",
        text: `Tệp này đã nhận dạng lúc ${sum.when}: ${sum.total} câu, đã dịch ${sum.done}. Khôi phục để xem, xuất file hoặc dịch nốt, không phải nhận dạng lại.`,
        confirmLabel: "Khôi phục",
        cancelLabel: "Làm mới",
      });
      if (!ok || gone || savedOwnerRef.current !== savedOwner) return;
      const j = job.current;
      if (j.segs.length) return;
      j.segs = saved.segs.map((seg) => ({ ...seg, busy: false }));
      j.pcmId = key;
      j.doneSource = saved.source;
      j.parts = [];
      j.nextPart = 0;
      j.appliedSig = "";
      j.bible = (saved.bible as Bible | null) ?? null;
      j.bibleGo = true;
      j.holdPosted = true;
      if (j.bible) setBible(cloneBible(j.bible));
      publish(true);
      pushStages();
      say(
        sum.done < sum.total
          ? `Đã khôi phục ${sum.total} câu (đã dịch ${sum.done}). Bấm Tiếp tục để dịch nốt; phần nhận dạng không làm lại.`
          : `Đã khôi phục ${sum.total} câu đã dịch.`,
      );
    });
    return () => {
      gone = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaId, source, savedOwner, savedSessionPending]);

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
        // v5.31.1: trả theo lượt mở cho ai có Token dịch, không cần từng thuê phòng. Máy chủ tự kiểm Token khi giữ phiếu.
        if (!(state.units > 0)) {
          say("Hết Token dịch. Mua Token dịch ở Ví để trả theo lượt, hoặc dùng key AI của bạn.", true);
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

  /** Cùng một cửa cho mọi nút xuất file: đăng nhập, tình trạng tài khoản, gói. Trả true khi được xuất. */
  const exportAllowed = useCallback(
    async (what: string) => {
      const problem = await exportProblem(what);
      if (problem) say(problem, true);
      return !problem;
    },
    [say],
  );

  const saveText = useCallback((text: string, suffix: string) => downloadText(text, file?.name || audioFile?.name, suffix), [file, audioFile]);

  const exportSub = useCallback(
    async (format: "srt" | "vtt" | "txt") => {
      if (!(await exportAllowed("file phụ đề"))) return;
      if (!job.current.segs.length) return say("Chưa có phụ đề để xuất.", true);
      const out = subtitleFile(job.current.segs, format);
      saveText(out.text, out.suffix);
    },
    [exportAllowed, saveText, say],
  );
  const exportSrt = useCallback(() => exportSub("srt"), [exportSub]);

  const exportRaw = useCallback(async () => {
    if (!(await exportAllowed("bản nhận dạng gốc"))) return;
    if (!job.current.segs.length) return say("Chưa có bản nhận dạng để xuất.", true);
    const out = subtitleFile(job.current.segs, "raw");
    saveText(out.text, out.suffix);
  }, [exportAllowed, saveText, say]);

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
    const choice: RunChoice = {
      door: roomPayRef.current ? "turn" : "rent",
      asrModel,
      chatMode: mode,
      chatModel: chosen,
      link,
      hasFile: Boolean(file || audioFile),
      groqKey: token,
      houseKey: houseKeyOf,
      chatKey: chatKeyOf,
      autoPool,
    };
    const problem = await choiceProblem(choice);
    if (problem) {
      // Chỉ đúng chỗ chọn gói (bước cuối «Tải và dịch»), không để khách tưởng nút hỏng.
      if (problem.needPack) window.dispatchEvent(new Event("tyzo-need-pack"));
      return say(problem.text, true);
    }
    const { asrOwner } = planChoice(choice);
    // Công cụ theo yêu cầu: khách tự xác nhận quyền với nội dung, mỗi tệp một lần, trước khi gửi nội dung đi đâu hay tốn tiền, lượt thử.
    if (!rightsConfirmed(mediaId())) {
      const ok = await askConfirm({ title: RIGHTS_TITLE, text: RIGHTS_TEXT, confirmLabel: RIGHTS_CONFIRM, cancelLabel: "Hủy" });
      if (!ok) return say(RIGHTS_DECLINED, true);
      const hash = rememberRights(mediaId());
      void recordRightsConsent({ data: { media: hash, terms: TERMS_VERSION } }).catch(() => {});
    }
    // Kiểm key và model trước mọi việc tốn tiền hay tốn lượt thử. Mất mạng hoặc Groq bận thì không chặn.
    if (token && token !== ROOM_KEY && !roomPayRef.current) {
      const known = probeRef.current;
      let value: KeyProbe;
      if (known && known.key === token && Date.now() - known.at < 60_000) value = known.value;
      else {
        say("Đang kiểm tra key Groq…");
        value = await runProbe(token);
      }
      // Key Groq chỉ cần có model dịch khi model dịch chạy trên Groq; model nhà khác đã kiểm ở trên.
      const groqChat = mode === "manual" && (providerOfModel(chosen, { groq: remoteIdsRef.current }) ?? "groq") === "groq" ? chosen : null;
      const verdict = judgeKey(value, { asr: asrOwner === "groq" && !asrTakesLink(asrModel) ? asrModel : null, chat: groqChat });
      if (verdict.state === "bad") return say(verdict.text, true);
    }
    if (!file && !audioFile && !/^https?:\/\//i.test(link)) return say("Link phải bắt đầu bằng http:// hoặc https://.", true);
    if (analyzing) return say("Đang phân tích nội dung, chờ một chút.", true);
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

    if (token !== ROOM_KEY) writeStore(PROVIDERS.groq.clientStore, token);
    writeStore("glang", target);
    writeStore("gsrc", source);
    writeStore("gmdl", chosen);
    writeStore("ggenre", genre);
    writeStore("gbase", baseGloss ? "1" : "0");
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
    // v5.30.0: chia phiếu trước/sau nhận dạng. «chat»: phần nhận dạng của tệp này đã xong (làm nốt, dịch lại) nên chỉ giữ phần dịch.
    // «asr»: bước dịch vốn chờ nhận dạng và phân tích xong, nên giữ phần nhận dạng trước, phần dịch mở phiếu riêng khi bắt đầu dịch.
    // «all»: dịch xen lúc đang nhận dạng (tắt phân tích trước), giữ một phiếu như cũ.
    const before = job.current;
    const asrComplete = before.pcmId === mediaId() && before.doneSource === source && before.nextPart >= before.parts.length && before.segs.length > 0;
    let ticketPart: "all" | "asr" | "chat" | "released" = asrComplete ? "chat" : preRef.current ? "asr" : "all";
    const ticketFile = (audioFile || file)?.name || "";
    if (roomPayRef.current) {
      const missing = roomMissing(roomOfferedRef.current, [asrModel, mode === "manual" ? chosen : null]);
      if (missing) return say(roomMissingText(missing), true);
      const chosenFile = audioFile || file;
      const linkRun = asrTakesLink(asrModel) && !chosenFile;
      if (!chosenFile && !linkRun) return say("Trả theo lượt chưa nhận link. Hãy chọn một tệp trên máy.", true);
      try {
        const opened = await openRoomTicket({
          fileName: chosenFile?.name || "Link Alibaba",
          seconds: chosenFile ? await readMediaSeconds(chosenFile) : 1800,
          asrModel,
          chatModel: mode === "manual" ? chosen : "auto",
          part: ticketPart as "all" | "asr" | "chat",
        });
        ticketId = opened.id;
        releasePlayback = claimPlayback(ticketId);
        rememberTicket(ticketId);
        window.dispatchEvent(new Event("tyzo-room-refresh"));
        const partBit = ticketPart === "asr" ? " cho phần nhận dạng" : ticketPart === "chat" ? " cho phần dịch" : "";
        say(`Đã giữ ${new Intl.NumberFormat("vi-VN").format(opened.held)} Token dịch${partBit} (ước tính, số trừ là số thực, phần thừa trả lại nếu gói còn hạn). Còn ${new Intl.NumberFormat("vi-VN").format(opened.balance)} Token dịch.`);
      } catch (error) {
        return say(error instanceof Error ? error.message : "Không giữ được tiền cho lần chạy này.", true);
      }
    }

    const j = job.current;
    /** Đóng phiếu phần nhận dạng (lúc chờ xem bảng nhân vật hoặc trước khi dịch): trừ số thực, trả phần giữ thừa ngay. */
    const releaseAsrTicket = async () => {
      if (ticketPart !== "asr" || !ticketId) return;
      const id = ticketId;
      ticketId = null;
      ticketPart = "released";
      await closeRoomTicket(id, false);
      forgetTicket(id);
      releasePlayback();
      releasePlayback = () => {};
      window.dispatchEvent(new Event("tyzo-room-refresh"));
    };
    let chatSwitch: Promise<void> | null = null;
    /** Mở phiếu phần dịch đúng một lần (nhiều luồng dịch cùng chờ). Thiếu Token thì ném lỗi; phần nhận dạng vẫn giữ. */
    const ensureChatTicket = () =>
      (chatSwitch ??= (async () => {
        if (!roomPayRef.current || (ticketPart !== "asr" && ticketPart !== "released")) return;
        await releaseAsrTicket();
        const seconds = (audioFile || file) ? await readMediaSeconds((audioFile || file)!).catch(() => 0) : 0;
        const span = seconds > 0 ? seconds : Math.max(1, Math.ceil(j.segs.reduce((end, seg) => Math.max(end, seg.end), 0)));
        try {
          const opened = await openRoomTicket({ fileName: ticketFile || "Video", seconds: span, asrModel, chatModel: mode === "manual" ? chosen : "auto", part: "chat" });
          ticketId = opened.id;
          ticketPart = "chat";
          releasePlayback = claimPlayback(ticketId);
          rememberTicket(ticketId);
          window.dispatchEvent(new Event("tyzo-room-refresh"));
          say(`Đã giữ ${new Intl.NumberFormat("vi-VN").format(opened.held)} Token dịch cho phần dịch. Còn ${new Intl.NumberFormat("vi-VN").format(opened.balance)} Token dịch.`);
        } catch (error) {
          chatSwitch = null;
          const why = error instanceof Error ? error.message : "Không giữ được Token dịch cho phần dịch.";
          throw new Error(`${why} Phần nhận dạng đã xong và được giữ lại: mua thêm Token dịch rồi bấm Tiếp tục, không phải nhận dạng lại.`);
        }
      })());
    const my = ++j.runId;
    let audioContext: AudioContext;
    try {
      audioContext = new AudioContextClass({ sampleRate: SR });
    } catch {
      audioContext = new AudioContextClass();
    }
    j.abort = new AbortController();
    // Một tín hiệu chung cho nhận dạng và dịch: một bên lỗi thì bên kia dừng theo, không chờ vô hạn.
    const inner = new AbortController();
    const outerSignal = j.abort.signal;
    const onAbort = () => inner.abort();
    if (outerSignal.aborted) inner.abort();
    else outerSignal.addEventListener("abort", onAbort, { once: true });
    const signal = inner.signal;
    const pauseForNewBible = { current: true };
    setRunning(true);
    phaseRef.current = asrTakesLink(asrModel) ? "ali" : "read";
    j.readAt = Date.now();
    j.readRatio = 0;
    let readTimer = 0;
    if (phaseRef.current === "read") {
      const bytes = (audioFile || file)?.size || 8 * 1048576;
      const expected = Math.max(6000, Math.min(90000, (bytes / 1048576) * 700));
      let shownPct = -1;
      readTimer = window.setInterval(() => {
        if (my !== j.runId || phaseRef.current !== "read") return;
        const elapsed = Date.now() - j.readAt;
        j.readRatio = Math.min(0.9, elapsed / expected);
        const pct = Math.round(j.readRatio * 100);
        if (pct !== shownPct && pct >= 10) {
          shownPct = pct;
          say(`Đang đọc âm thanh… ${pct}% · ${Math.max(1, Math.round(elapsed / 1000))} giây`);
        }
        pushStages();
      }, 500);
    }
    pushStages();
    document.documentElement.dataset.tyzoBusy = "1";
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
        j.note = "đang phân tích nội dung…";
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
                available: autoPool(),
                cooling: j.cooling,
                blocked: j.blocked,
                escalate: true,
              }).id;
        j.analysisP = analyzeFilm({
          key: chatKeyOf(),
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

    const { transcribeRemaining } = createRecognizer({
      j, my, signal, audioContext, token, source, asrModel, title, gloss, genre, threads,
      ticket: () => ticketId,
      vad: () => vadRef.current,
      langCheck: () => langRef.current,
      lineLocks: () => lineLocksRef.current,
      onWait, ensureTrial, asrUsd, publish, progress, say, warnVad, applyReady, setHeardLang,
    });

    const { translateRemaining } = createTranslator({
      j, my, signal, source, target, mode, chosen, genre, gloss, title, notes, extra, profile, allowEnterprise, baseGloss, threads, modelSig,
      ticket: () => ticketId,
      ticketPart: () => ticketPart,
      preRef, reviewRef, roomPayRef, userTermsRef, pauseForNewBible,
      chatKeyOf, autoPool, ensureAnalysis, releaseAsrTicket, ensureChatTicket, setReviewHold, publish, progress, say, onWait,
    });

    let r2Key: string | null = null;
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
            await waitForMetadata(video, 30_000, signal).catch((error) => {
              if (signal.aborted || (error as { name?: string })?.name === "AbortError") throw error;
            });
            if (my !== j.runId) return;
            if (video && Number.isFinite(video.duration) && video.duration > MAX_MINUTES * 60)
              throw new Error(`File dài hơn ${MAX_MINUTES} phút sẽ làm đầy bộ nhớ máy. Hãy cắt thành đoạn ngắn hơn.`);
            say("Đang giải mã và đưa âm thanh về 16 kHz…");
            // Kiểm toán R6-001: giải mã vào biến riêng, chỉ gán cho lần chạy này nếu khách chưa bắt đầu lần khác.
            const decoded = await decodeTo16k(blob, audioContext, j.streamWhy);
            if (!commitDecodedJob(j, my, decoded, id)) return;
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
        j.langRetryUsed = 0;
        j.langSuspect = 0;
        j.langEvents = [];
        j.qualitySent = false;
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
        let runUrl = link;
        if (asrTakesLink(asrModel) && !link && (file || audioFile)) {
          const uploaded = await uploadLocalAudio({ pcm: j.pcm, stream: j.stream, audioContext, signal, say, alive: () => my === j.runId });
          if (!uploaded) return;
          r2Key = uploaded.key;
          runUrl = uploaded.url;
          if (my !== j.runId) return;
        }
        const linkRunner = asrRunnerOf(asrModel);
        if (linkRunner.intake === "link") {
          const label = PROVIDERS[linkRunner.id].label;
          say(`Đang gửi file tới ${label}…`);
          const segs = await linkRunner.recognize({
            url: runUrl,
            language: asrLanguageOf(source),
            key: roomPayRef.current ? "room" : houseKeyOf(linkRunner.id),
            ticketId,
            signal,
            onWait: (m) => { if (my === j.runId) say(m); },
          });
          if (my !== j.runId) return;
          j.segs = segs;
          j.parts = [];
          j.nextPart = 0;
          j.doneSource = source;
          publish(true);
          await translateRemaining(() => true);
          publish(true);
          say(j.segs.length ? `Nhận dạng ${label} xong: ${j.segs.length} câu.` : `${label} không trả câu nào.`, !j.segs.length);
          setRunning(false);
          delete document.documentElement.dataset.tyzoBusy;
          return;
        }
        j.parts = await planRecognitionParts();
        j.doneSource = source;
        j.appliedSig = "";
        publish(true);
      }
      phaseRef.current = "asr";
      pushStages();

      pauseForNewBible.current = !(j.bible && !j.bible.failed);
      let asrFinished = j.nextPart >= j.parts.length;
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
      if (j.nextPart >= j.parts.length && !j.qualitySent && ["zh", "ko", "ja", "en"].includes(source) && j.rawParts.length) {
        j.qualitySent = true;
        // Chỉ gửi các con số, không gửi chữ, tên tệp, video hay khóa. Lỗi ở đây không được làm hỏng lần dịch.
        try {
          const summary = summarizeQuality({
            thresholds: await loadQualityThresholds(),
            raw: j.rawParts,
            rejects: j.rejects,
            kept: j.segs.length,
            lang: langRef.current
              ? {
                  suspect: j.langSuspect,
                  resent: j.langEvents.length,
                  swapped: j.langEvents.filter((e) => e.swapped).length,
                  usedSeconds: j.langRetryUsed,
                  budgetSeconds: LANG_RETRY_BUDGET_SECONDS,
                  events: j.langEvents,
                }
              : null,
          });
          const report = reportFromSummary(summary, {
            appVersion: APP_VERSION,
            keySource: token === ROOM_KEY ? "room" : "own",
            asrModel,
            sourceLang: source,
            seconds: j.parts.reduce((n, [a, b]) => n + (b - a), 0) / SR,
            langCheck: langRef.current,
          });
          void reportQuality({ data: report }).catch(() => {});
        } catch {
          /* bỏ qua */
        }
      }
      const sparseNote = sparseSpeechNote({ lang: source, segs: j.segs, seconds: j.parts.reduce((n, [a, b]) => n + (b - a), 0) / SR });
      const retryBit =
        (j.retryReport && (j.retryReport.usedSeconds > 0 || j.retryReport.missing.length > 0) ? ` ${formatRetryStatus(j.retryReport)}` : "") +
        (sparseNote ? ` ${sparseNote}` : "");
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
      // Lịch sử thuê phòng (key của khách) chỉ ghi trên máy này; trả theo lượt đã có phiếu ở máy chủ.
      if (!roomPayRef.current) {
        const picked = audioFile || file;
        addLocalRun(safeStore(), {
          at: new Date().toISOString(),
          file: picked?.name || link || "Lượt dịch",
          seconds: Math.round(j.segs.reduce((end, seg) => Math.max(end, seg.end), 0)),
          asr: asrModel,
          chat: mode === "manual" ? chosen : j.lastModel || "auto",
          lines: j.segs.length,
          ok: j.segs.every((seg) => seg.translation !== null && !seg.translationFailed),
        });
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
      if (readTimer) window.clearInterval(readTimer);
      outerSignal.removeEventListener("abort", onAbort);
      if (my === j.runId) {
        delete document.documentElement.dataset.tyzoBusy;
        phaseRef.current = "idle";
        pushStages();
      }
      releasePlayback();
      await removeAudioFromR2(r2Key);
      await closeRoomTicket(ticketId, ticketFailed);
      forgetTicket(ticketId);
      if (ticketId) window.dispatchEvent(new Event("tyzo-room-refresh"));
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
    autoPool,
    chatKeyOf,
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
    extra,
    pre,
    profile,
    progress,
    publish,
    pushStages,
    remoteIds,
    runProbe,
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
            available: autoPool(),
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
        ticketId = (await openRoomTicket({ fileName: "Phân tích nội dung", seconds: spanSeconds, asrModel, chatModel: analysisModel })).id;
        releasePlayback = claimPlayback(ticketId);
      } catch (error) {
        return say(error instanceof Error ? error.message : "Không giữ được tiền cho lần phân tích.", true);
      }
    }
    setAnalyzing(true);
    say("Đang phân tích nội dung…");
    const controller = new AbortController();
    job.current.abort = controller;
    let analysisFailed = false;
    try {
      const next = await analyzeFilm({
        key: chatKeyOf(),
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
  }, [allowEnterprise, asrModel, autoPool, baseGloss, chatKeyOf, genre, gloss, key, mode, modelId, notes, publish, remoteIds, running, say, source, target, title]);

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
        const pcm = await decodeTo16k(blob, audioContext, j.streamWhy);
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
    if (!(await askConfirm({ title: "Gửi các khoảng trống?", text: formatGapConfirm(plan), confirmLabel: "Gửi" }))) return;
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
        const result = await transcribe(packed, token, asrLanguageOf(source), asrPrompt(title, gloss, genre), asrModel, signal, j.gate, (message) => say(message), ticketId);
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
          ? `Đã thêm ${added} câu từ khoảng trống. Bấm Tiếp tục để dịch phần mới. Không nhận dạng lại cả video.`
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

  const polish = usePolish({
    getSegs: () => job.current.segs,
    getBible: () => bible,
    writeTranslations: (next) => {
      next.forEach((text, index) => {
        const seg = job.current.segs[index];
        if (seg && seg.translation !== text) seg.translation = text;
      });
      publish(true);
    },
    genre,
    title,
    notes,
    gloss,
    extra,
    target,
    activeKey,
    chatKey: chatKeyOf,
    roomPay: () => roomPayRef.current,
    remoteIds,
    busy: running || analyzing,
    say,
  });

  useEffect(() => {
    if (running || analyzing || polish.phase === "running" || polish.phase === "quoting") return holdPageActivity();
  }, [running, analyzing, polish.phase]);

  return {
    key,
    setKey,
    houseKeys,
    keyModels,
    setHouseKey,
    setRoomPay,
    storeGroqKey,
    roomOffer,
    chatKeyOf,
    target,
    setTarget,
    source,
    heardLang,
    setSource,
    genre,
    setGenre,
    pendingGenre,
    pickGenre,
    confirmGenre,
    cancelGenre,
    baseGloss,
    setBaseGloss,
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
    langCheck,
    setLangCheck: (value: boolean) => {
      langRef.current = value;
      setLangCheckState(value);
      writeStore("glang", value ? "1" : "0");
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
    extra,
    setExtra: (value: string) => {
      const next = value.slice(0, STYLE_EXTRA_MAX);
      setExtra(next);
      writeStore("gextra", next);
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
    langReport,
    gapPlan,
    status,
    isError,
    running,
    stages,
    buttonLabel,
    catalog,
    board,
    boardNote,
    remoteIds,
    keyStatus,
    modelBusy,
    uses,
    videoRef,
    refreshModels,
    start,
    cancel,
    reset,
    exportSrt,
    exportSub,
    exportRaw,
    editSeg,
    cycleVoiceLock,
    retryFailed,
    scanGaps,
    fillGaps,
    playReject,
    keepReject,
    dropReject,
    polish,
  };
}
