import { MENU_GROUP, MENU_ITEM, TOOL_NAME } from "@/lib/customer-menu";
import { StudioDock } from "@/components/studio-dock";
import { ToolWheel } from "@/components/tool-wheel";
import { isStudioSheet } from "@/lib/studio-layout";
import { TOOL_ICON } from "@/lib/tool-icon";
import { WHEEL_ORDER, type WheelId } from "@/lib/tool-wheel";
import { stepInfo } from "@/lib/studio-steps";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccountPanel } from "@/components/account-panel";
import { BackButton } from "@/components/back-button";
import { getMyPlace, touchPresence, type MyPlace } from "@/lib/admin-room";
import { submitAppeal } from "@/lib/admin-appeals";
import { deviceId } from "@/lib/device-id";
import { Link, useNavigate } from "@tanstack/react-router";
import { retryLoad } from "@/lib/retry-load";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppShell, RailToggle, SideRail, type RailItem } from "@/components/side-rail";
import { Icon } from "@/components/ui/icon";
import { READY_STATUS, usePipeline } from "@/components/use-pipeline";
import { PolishPanel } from "@/components/polish-panel";
import { useOnline } from "@/lib/use-online";
import { useLinkCheck } from "@/components/use-link-check";
import { pushToast } from "@/components/toast";
import { asrHouse } from "@/lib/sub/asr-house";
import { linkAsrNote } from "@/lib/sub/link-asr-note";
import { PROVIDER_IDS, PROVIDERS, type ProviderId } from "@/lib/sub/provider";
import { pickPool } from "@/lib/sub/room-models";
import { asrPickerRows } from "@/lib/asr-picker";
import { ownKeyAvailable } from "@/lib/rent-show";
import { useRentShow } from "@/components/rent-show-board";
import { TurnPackList } from "@/components/turn-pack-list";
import { turnPackModels } from "@/lib/turn-pack";
import { AccountStrip } from "@/components/account-strip";
import { BrandMark } from "@/components/brand-mark";
import { NoticeBell } from "@/components/notice-bell";
import { DisplayToggle } from "@/components/display-toggle";
import { useRunDoor } from "@/components/run-door";
import { MaintenanceNotice, ServiceSwitch } from "@/components/service-notice";
import { useServiceStatus } from "@/components/use-service-status";
import { railBadge } from "@/lib/service-status";
import { DragSlider } from "@/components/drag-slider";
import { VersionMark } from "@/components/version-mark";
import { StepsBar } from "@/components/steps-bar";
import { ExportMenu } from "@/components/export-menu";
import { CueEditor } from "@/components/cue-editor";
import { useWakeLock } from "@/components/use-caps";
import { MoneyCard, MoneyEstimate, useMoney } from "@/components/money-card";
import { askConfirm } from "@/lib/confirm";
import { PayStatusBar } from "@/components/pay-status-bar";
import { homeAction } from "@/lib/home-action";
import { readUse, rememberUse, shouldAsk, presetForUse, type UseAnswer } from "@/lib/first-ask";
import { FirstAskCard } from "@/components/first-ask-card";
import { recordTally } from "@/lib/usage-tally-room";
import { KeyRing, type KeyCheck } from "@/components/key-ring";
import { payState, readPayChoice, rememberPayChoice, type PayChoice } from "@/lib/pay-status";
import { HomeHero } from "@/components/home-hero";
import { StudioPalette } from "@/components/studio-palette";
import type { PaletteCommand } from "@/lib/palette-match";
import { ConfirmDialog } from "@/components/confirm-code";
import { InfoTip } from "@/components/info-tip";
import { GENRES, isTypingTarget, pastedLink, showHomeHero } from "@/lib/home-state";
import { GuidedTour } from "@/components/guided-tour";
import { markSeen, tourSeen } from "@/components/tour-seen";
import { guideTopics } from "@/lib/guide-topics";
import { takeTourRequest } from "@/lib/tour-request";
import type { TourId } from "@/lib/tour-steps";
import { useFileThumb } from "@/components/file-thumb";
import { createNarrator, defaultOrpheusVoice, guessGender, orpheusVoices, sampleLine } from "@/lib/sub/narration";
import { prefetchTargets, slotFor } from "@/lib/sub/narration-sync";
import { useRoomPlans } from "@/lib/use-room-plans";
import { auraReady, auraVoices, defaultAuraVoice } from "@/lib/sub/aura";
import { elevenReady, type ElevenVoice } from "@/lib/sub/eleven-voice";
import { listElevenVoices } from "@/lib/sub/eleven-speak";
import { edgeVoice } from "@/lib/sub/edge-voice";
import { narrationChoice } from "@/lib/sub/cast-voice";
import { LANGS, SRC_LANGS, STYLE_EXTRA_MAX, cueText, fmt, orpheusReady, speechLang } from "@/lib/sub/text";
import { usesBaseGlossary } from "@/lib/sub/glossary";
import { NARRATION_DEFAULT, type NarrationSettings, type Seg } from "@/lib/sub/types";
import { FIELD, SUB_DEF, type SubStyle } from "@/components/studio-shared";
import { AsrDiag } from "@/components/studio-diag";
import { GlossaryEditor } from "@/components/studio-glossary";
import { Choice, CueRow, FileTile, ModelPicker, Select, VoiceLanes } from "@/components/studio-parts";
import { Stage } from "@/components/studio-stage";
import { jump, ownModelPrice, modelFacts, roomHeld, roomAsrPrice } from "@/components/studio-price";

const ASR_ROOM_TIP = "Thuê phòng chỉ chọn model Admin đã mở. Whisper cần key Groq của bạn. Filetrans cần key Alibaba của bạn. Nova-3 cần key Deepgram của bạn. Universal cần key AssemblyAI của bạn. Speechmatics cần key Speechmatics của bạn. Soniox cần key Soniox của bạn. Scribe cần key ElevenLabs của bạn. Dịch vẫn dùng model Groq đã mở.";
const THREADS_TIP = "Nhiều luồng chạy nhanh hơn nhưng 6–8 luồng dễ chạm giới hạn của key (nhất là key miễn phí). App sẽ tự chờ rồi gửi lại, không mất đoạn đã nhận dạng.";
const ASR_PRICE_TIP = "Đơn giá là giá dịch vụ của phòng, đã gồm phần vận hành. Không dùng số này để so với tài khoản Groq riêng.";
const KEY_MODE_TIP = "Dùng các key bạn đã nhập (Groq, Alibaba, Deepgram… tùy nhà bạn có key). Nhà cung cấp tính tiền cho bạn, phòng không trừ Token dịch cho lượt chạy.";
const TURN_MODE_TIP = "Dùng key của phòng, bạn không nhập key. Phòng giữ số Token dịch ước tính từ gói đã mua, trừ số thực khi xong và trả phần thừa nếu gói còn hạn.";

const EXPORT_EMPTY = "Chưa có phụ đề nào. Hãy chọn video và bấm Tải và dịch trước.";



const SUB_LEGACY: SubStyle = { on: true, font: "0", size: 100, col: "#ffffff", bgm: "box", op: 70, pos: 12, off: 0 };
const STYLE_KEYS = ["on", "font", "size", "col", "bgm", "op", "pos", "off"] as const;

function loadSub(): SubStyle {
  try {
    const raw = localStorage.getItem("gset");
    if (!raw) return SUB_DEF;
    const parsed = JSON.parse(raw) as Partial<SubStyle>;
    if (localStorage.getItem("gset_v") === "2") return { ...SUB_DEF, ...parsed };
    localStorage.setItem("gset_v", "2");
    const untouched = STYLE_KEYS.every((key) => parsed[key] === undefined || parsed[key] === SUB_LEGACY[key]);
    return untouched ? SUB_DEF : { ...SUB_DEF, ...parsed };
  } catch {
    return SUB_DEF;
  }
}

function loadNarration(): NarrationSettings {
  try {
    const raw = localStorage.getItem("gnarr");
    const version = localStorage.getItem("gnarr_v");
    if (!raw) {
      localStorage.setItem("gnarr_v", "4");
      return NARRATION_DEFAULT;
    }
    const parsed = JSON.parse(raw) as Partial<NarrationSettings>;
    const merged = { ...NARRATION_DEFAULT, ...parsed };
    if (merged.engine === "edge" && merged.gender === "any") merged.gender = "female";
    if (version === "4") return merged;
    localStorage.setItem("gnarr_v", "4");
    if (parsed.enabled === undefined) merged.enabled = true;
    if (parsed.lead === undefined) merged.lead = 0;
    merged.lead = Math.min(2, Math.max(-1.5, Number(merged.lead) || 0));
    if (parsed.matchCast === undefined) merged.matchCast = true;
    return merged;
  } catch {
    return NARRATION_DEFAULT;
  }
}

const TOOLS = [
  ["key", TOOL_NAME.key],
  ["phim", TOOL_NAME.phim],
  ["cast", TOOL_NAME.cast],
  ["voice", TOOL_NAME.voice],
  ["check", TOOL_NAME.check],
  ["run", TOOL_NAME.run],
] as const;

/** Chức năng thêm: chỉ Thuật ngữ (cùng nhóm «Dịch bình thường» trên menu). Cách trả và model nằm trong «Cài đặt dịch» (Menu, không lướt bằng nút vàng). */
const ADVANCED_TOOLS = [
  ["thuatngu", TOOL_NAME.thuatngu],
] as const;
type ToolId = (typeof TOOLS)[number][0] | (typeof ADVANCED_TOOLS)[number][0];

/** Thứ tự mục trên menu (Dịch bình thường): Thuật ngữ là lối tắt vào nhánh của tab Ngữ cảnh. */
const MENU_TOOL_ORDER = ["key", "phim", "cast", "thuatngu", "voice", "run", "check"] as const;

export function Studio() {
  const roomPlans = useRoomPlans();
  const app = usePipeline();
  useWakeLock(app.running || app.analyzing);
  // Đang chạy mà lỡ tay đóng tab hay tải lại trang thì trình duyệt hỏi lại (v5.32.1): phần đã nhận dạng chỉ nằm trong trang.
  useEffect(() => {
    if (!(app.running || app.analyzing)) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [app.running, app.analyzing]);
  // Quay lại từ ứng dụng khác giữa lúc chạy: nhắc nếu lượt đã dừng thì bấm Tiếp tục.
  useEffect(() => {
    if (!app.running) return;
    let hiddenAt = 0;
    const onVisible = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 20_000) pushToast("Trang vừa ở nền một lúc. Nếu tiến độ đứng yên, bấm Tiếp tục; phần đã xong không mất.");
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [app.running]);
  const online = useOnline();
  const linkCheck = useLinkCheck();
  const noSubs = app.segs.length === 0;
  const pickedFile = app.file || app.audioFile;
  const thumb = useFileThumb(pickedFile);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourOffer, setTourOffer] = useState(false);
  const [tourId, setTourId] = useState<TourId>("quick-start");
  // «Chỉ tôi» ở trang Hướng dẫn gửi yêu cầu qua sessionStorage. Đọc một lần, giữ trong ref để chạy lại hiệu ứng (StrictMode) không làm mất.
  const askedTour = useRef<TourId | null | undefined>(undefined);
  useEffect(() => {
    if (askedTour.current === undefined) askedTour.current = takeTourRequest("/");
    if (askedTour.current) {
      setTourId(askedTour.current);
      const asked = window.setTimeout(() => setTourOpen(true), 500);
      return () => window.clearTimeout(asked);
    }
    // v5.32.2: không tự mở hướng dẫn nhanh lần đầu (chồng lên chọn cách trả, câu hỏi lần đầu). Hiện dòng mời ở trang chủ.
    if (!tourSeen()) setTourOffer(true);
  }, []);
  // Câu đang sửa nhớ theo nội dung, không theo số thứ tự: câu mới chen vào danh sách thì ô sửa không nhảy sang câu khác.
  const [editKey, setEditKey] = useState<{ start: number; end: number; original: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [rule, setRule] = useState("");
  const editing = editKey ? app.segs.findIndex((item) => item.start === editKey.start && item.end === editKey.end && item.original === editKey.original) : -1;
  const openEdit = useCallback((seg: { start: number; end: number; original: string; translation: string | null; translationFailed?: boolean }) => {
    setEditKey({ start: seg.start, end: seg.end, original: seg.original });
    setDraft(seg.translation && !seg.translationFailed ? seg.translation : "");
    setRule("");
  }, []);
  const jumpTo = useCallback((start: number) => jump(app.videoRef.current, start), [app.videoRef]);
  const [narration, setNarration] = useState<NarrationSettings>(NARRATION_DEFAULT);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  /** Giọng ElevenLabs của key đang dùng (key phòng khi trả theo lượt). null = chưa đọc. */
  const [elevenVoices, setElevenVoices] = useState<ElevenVoice[] | null>(null);
  const [elevenNote, setElevenNote] = useState("");
  const [sub, setSub] = useState<SubStyle>(SUB_DEF);
  const [current, setCurrent] = useState(-1);
  const [toolTab, setToolTab] = useState<ToolId>("phim");
  const [ctxView, setCtxView] = useState<"cast" | "terms" | "note">("cast");
  const [product, setProduct] = useState<"sub" | "account">("sub");
  const [payByRoom, setPayByRoom] = useState(false);
  /** Cách trả khách đã chọn và được nhớ trên máy (null = chưa chọn lần nào). «choosing»: đang mở lại hai lựa chọn. */
  const [payChoice, setPayChoice] = useState<PayChoice | null>(null);
  // Câu hỏi lần đầu (đợt 4): "skip" đến khi đọc xong kho trên máy, để không nháy thẻ hỏi lúc vẽ từ máy chủ.
  const [useAnswer, setUseAnswer] = useState<UseAnswer | "skip" | null>("skip");
  useEffect(() => setUseAnswer(readUse(safeLocalStore())), []);
  const [choosingPay, setChoosingPay] = useState(false);
  const [payRead, setPayRead] = useState(false);
  const [turnLocked, setTurnLocked] = useState(false);
  const { user: me } = useCurrentUserState();
  const runDoor = useRunDoor();
  const service = useServiceStatus();
  // Nhóm Dịch bình thường đang bảo trì: chặn bấm bắt đầu. Lượt đang chạy vẫn chạy nốt (nút Dừng không bị khóa).
  const normalDown = service.status.normal.state === "maintenance";
  // Chưa có việc nào mà nhóm đang bảo trì thì không báo «Sẵn sàng» khi nút bắt đầu đã khóa. Lỗi và kết quả thật giữ nguyên.
  const statusText =
    normalDown && !app.running && app.status === READY_STATUS
      ? "Dịch bình thường đang bảo trì. Bạn vẫn chọn được tệp, nhưng chưa bắt đầu dịch được."
      : app.status;
  const rentShow = useRentShow();
  const [place, setPlace] = useState<MyPlace | null>(null);
  const [appeal, setAppeal] = useState("");
  const [appealNotice, setAppealNotice] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [afterOpen, setAfterOpen] = useState(false);
  // Khách bấm một mục trong menu trái thì hiện khung đầy đủ thay cho trang chủ một ô.
  const [forced, setForced] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const autoStartLink = useRef<string | null>(null);
  const navigate = useNavigate();
  const statusRef = useRef<HTMLDialogElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const narrator = useRef(createNarrator());
  const live = useRef({ segs: app.segs, narration, key: app.key, target: app.target, bible: app.bible, elevenKey: "", elevenVoices: [] as ElevenVoice[] });
  live.current = { segs: app.segs, narration, key: app.key, target: app.target, bible: app.bible, elevenKey: (app.houseKeys.elevenlabs ?? "").trim(), elevenVoices: elevenVoices ?? [] };

  useEffect(() => {
    setNarration(loadNarration());
    setSub(loadSub());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("gnarr", JSON.stringify(narration));
    } catch {
      /* ignore */
    }
  }, [narration, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("gset", JSON.stringify(sub));
    } catch {
      /* ignore */
    }
  }, [sub, hydrated]);
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices() || []);
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, []);
  useEffect(() => {
    if (!narration.enabled) narrator.current.stop(app.videoRef.current);
  }, [narration.enabled, app.videoRef]);
  useEffect(() => {
    const voice = narrator.current;
    return () => voice.stop(app.videoRef.current);
  }, [app.videoRef]);
  useEffect(() => {
    if (product !== "account") return;
    app.videoRef.current?.pause();
  }, [product, app.videoRef]);
  // Lần đầu mở trang: đọc cách trả đã nhớ. Đã chọn trả theo lượt và cửa đang mở thì vào thẳng cách đó.
  useEffect(() => {
    if (!runDoor.ready || payRead) return;
    setPayRead(true);
    const stored = readPayChoice(safeLocalStore());
    setPayChoice(stored);
    if (stored === "turn" && runDoor.open) {
      setPayByRoom(true);
      app.setRoomPay(true);
    }
  }, [runDoor.ready, runDoor.open, payRead, app]);
  useEffect(() => {
    if (!runDoor.ready || runDoor.open) return;
    // Chủ bật bảo trì cửa trả theo lượt: lùi về key của khách và nói rõ, không để khách tưởng vẫn đang trả theo lượt.
    if (payByRoom || payChoice === "turn") pushToast("Trả theo lượt đang bảo trì. Tạm dùng key của bạn.", "bad");
    setPayByRoom(false);
    app.setRoomPay(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi cửa đổi trạng thái
  }, [runDoor.ready, runDoor.open, app.setRoomPay]);


  const speakAt = (index: number) => {
    const { segs, narration: settings, key, target } = live.current;
    const video = app.videoRef.current;
    if (!settings.enabled || !video || video.paused || index < 0) {
      if (!settings.enabled || video?.paused) narrator.current.stop(video);
      return;
    }
    const seg = segs[index];
    if (!seg) return;
    const optionsFor = (item: Seg) => {
      const choice = item.voiceLock
        ? { gender: item.voiceLock, locked: true }
        : narrationChoice(settings.matchCast, settings.gender, item.original, cueText(item), item.voice, live.current.bible);
      return {
        text: cueText(item),
        settings: { ...settings, gender: choice.gender, matchCast: choice.locked },
        target,
        key: payByRoom ? "room" : key.trim(),
        elevenKey: live.current.elevenKey,
        elevenVoices: live.current.elevenVoices,
        video,
        playbackRate: video.playbackRate || 1,
        onBlocked: (message: string) => pushToast(message, "bad"),
        onFail: (message: string) => pushToast(message, "bad"),
      };
    };
    void narrator.current.speak({ ...optionsFor(seg), slot: slotFor(segs, index) });
    // Tạo trước vài câu kế tiếp để câu sau có tiếng sẵn khi tới lượt (giọng máy đọc ngay nên không cần).
    if (settings.engine === "browser") return;
    for (const next of prefetchTargets(segs, index, cueText)) {
      void narrator.current.speak({ ...optionsFor(segs[next]), prefetch: true });
    }
  };

  const previewVoice = () => {
    void narrator.current.speak({
      text: sampleLine(app.target),
      settings: { ...narration, enabled: true, matchCast: false },
      target: app.target,
      key: payByRoom ? "room" : app.key.trim(),
      elevenKey: (app.houseKeys.elevenlabs ?? "").trim(),
      elevenVoices: elevenVoices ?? [],
      video: app.videoRef.current,
      playbackRate: 1,
      onBlocked: (message) => pushToast(message, "bad"),
      onFail: (message) => pushToast(message, "bad"),
    });
  };

  const patchNarration = (patch: Partial<NarrationSettings>) => setNarration((prev) => ({ ...prev, ...patch }));
  const cloud = orpheusReady(app.target);
  const auraLang = auraReady(app.target);
  const elevenLang = elevenReady(app.target);
  const elevenKeyNow = payByRoom ? "room" : (app.houseKeys.elevenlabs ?? "").trim();
  const elevenWanted = narration.engine === "elevenlabs";
  // Đọc danh sách giọng ElevenLabs của key đang dùng khi chọn giọng ElevenLabs (giọng mặc định của nhà có hạn, nên không ghi cứng).
  useEffect(() => {
    if (!elevenWanted) return;
    if (!elevenKeyNow || (elevenKeyNow !== "room" && elevenKeyNow.length < 20)) {
      setElevenVoices(null);
      setElevenNote("Cần key ElevenLabs của bạn (ô key), hoặc chọn Trả theo lượt.");
      return;
    }
    let stale = false;
    setElevenNote("Đang đọc danh sách giọng…");
    listElevenVoices(elevenKeyNow)
      .then((list) => {
        if (stale) return;
        setElevenVoices(list);
        setElevenNote(list.length ? "" : "Key ElevenLabs chưa có giọng nào.");
      })
      .catch((error: unknown) => {
        if (stale) return;
        setElevenVoices(null);
        setElevenNote(error instanceof Error ? error.message : "Không đọc được danh sách giọng ElevenLabs.");
      });
    return () => {
      stale = true;
    };
  }, [elevenWanted, elevenKeyNow]);
  const elevenShown = (elevenVoices ?? []).filter((voice) => narration.gender === "any" || voice.gender === "any" || voice.gender === narration.gender);
  const prefix = speechLang(app.target).slice(0, 2).toLowerCase();
  const langVoices = voices.filter((voice) => voice.lang.replace("_", "-").toLowerCase().startsWith(prefix));
  const shownVoices = (langVoices.length ? langVoices : voices).filter(
    (voice) => narration.gender === "any" || guessGender(voice) === "any" || guessGender(voice) === narration.gender,
  );
  // «Thuật ngữ» là nhánh của tab Ngữ cảnh (id cast): mở nó thì chọn tab cast và nhánh thuật ngữ.
  const pickTool = (raw: ToolId) => {
    const id: ToolId = raw === "thuatngu" ? "cast" : raw;
    if (raw === "thuatngu") setCtxView("terms");
    const sheet = isStudioSheet();
    setSheetOpen((open) => (raw !== "thuatngu" && sheet && id === toolTab ? !open : true));
    setToolTab(id);
  };
  const openTool = (raw: ToolId) => {
    setProduct("sub");
    if (forced) return pickTool(raw);
    if (raw === "thuatngu") setCtxView("terms");
    setForced(true);
    setToolTab(raw === "thuatngu" ? "cast" : raw);
    setSheetOpen(true);
  };
  const hero = showHomeHero({ hasSegs: !noSubs, running: app.running, analyzing: app.analyzing, reviewHold: app.reviewHold, forced });
  /**
   * Một lối duy nhất để đổi cách trả (dòng trạng thái, chip, tab Video). choice null: mở lại hai lựa chọn.
   * remember=false: chỉ đổi cho lần này (ví dụ «Dùng Token lần này»), lựa chọn đã nhớ giữ nguyên.
   */
  const choosePay = (choice: PayChoice | null, remember: boolean) => {
    if (choice === null) {
      setChoosingPay(true);
      return;
    }
    if (choice === "turn" && !runDoor.open) return;
    setChoosingPay(false);
    setPayByRoom(choice === "turn");
    app.setRoomPay(choice === "turn");
    if (remember) {
      // Đếm ẩn danh mỗi lần khách đổi cách trả đã nhớ (chọn lại đúng cách cũ thì không đếm).
      if (choice !== readPayChoice(safeLocalStore())) void recordTally({ data: { topic: "pay", answer: choice } }).catch(() => {});
      rememberPayChoice(safeLocalStore(), choice);
      setPayChoice(choice);
    }
  };
  /** Trạng thái từng key cho danh sách «Key AI của bạn»: Groq theo lần kiểm key, nhà khác theo danh sách model đọc được. */
  const keyCheck = (id: ProviderId): KeyCheck => {
    const value = (id === "groq" ? app.key : (app.houseKeys[id] ?? "")).trim();
    if (!value) return { phase: "idle", text: "" };
    if (value.length < 20) return { phase: "warn", text: "Key có vẻ chưa đủ, kiểm tra lại." };
    if (id === "groq") return app.keyStatus.phase === "idle" ? { phase: "checking", text: "Đang kiểm tra key…" } : app.keyStatus;
    const models = app.keyModels[id];
    if (models === undefined) return { phase: "checking", text: "Đang kiểm tra key…" };
    if (models === null) return { phase: "bad", text: "Chưa đọc được key. Kiểm tra lại key hoặc mạng." };
    return { phase: "ok", text: `Hợp lệ · ${models.length} model` };
  };
  const keyHouses = PROVIDER_IDS.filter((id) => (id === "groq" ? app.key : (app.houseKeys[id] ?? "")).trim()).map((id) => PROVIDERS[id].label);

  // Dán link ở bất cứ đâu (ngoài ô gõ chữ) thì nhận link; ở trang chủ một ô thì tự bắt đầu.
  const takeLink = useCallback(
    (link: string, auto: boolean) => {
      app.setFile(null);
      app.setAudioFile(null);
      app.setUrl(link);
      linkCheck.check(link);
      if (auto) autoStartLink.current = link;
      else pushToast("Đã nhận link. Bấm Tải và dịch để chạy.", "ok");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app.setFile, app.setAudioFile, app.setUrl, linkCheck.check],
  );
  const heroRef = useRef(hero);
  heroRef.current = hero;
  const busyRef = useRef(false);
  busyRef.current = app.running || app.analyzing || product === "account" || place?.status === "banned" || place?.status === "locked";
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target) || busyRef.current) return;
      const link = pastedLink(event.clipboardData?.getData("text") ?? "");
      if (!link) return;
      event.preventDefault();
      takeLink(link, heroRef.current);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [takeLink]);
  const { start: startRun } = app;
  useEffect(() => {
    const want = autoStartLink.current;
    if (!want || app.url !== want) return;
    autoStartLink.current = null;
    void startRun();
  }, [app.url, startRun]);


  // Đọc quyền có thử lại. Lỗi tạm thời thì giữ quyền đã biết, không xóa nút Quản lý.
  const placeSeq = useRef(0);
  const loadPlace = useCallback(async () => {
    const my = ++placeSeq.current;
    try {
      const next = await retryLoad(() => getMyPlace());
      if (my === placeSeq.current) setPlace(next);
    } catch {
      /* giữ nguyên quyền cũ; lần sau (quay lại tab, dịch xong) sẽ đọc lại */
    }
  }, []);

  useEffect(() => {
    void loadPlace();
    const ping = () => void touchPresence({ data: deviceId() ?? undefined }).catch(() => undefined);
    ping();
    const timer = window.setInterval(ping, 60_000);
    const onShow = () => {
      if (document.visibilityState === "visible") void loadPlace();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
      placeSeq.current++;
    };
  }, [loadPlace]);

  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && !app.running) {
      void loadPlace();
      const pending = app.segs.some((seg) => seg.translation === null);
      const anyOk = app.segs.some((seg) => seg.translation && !seg.translationFailed);
      if (!pending && anyOk) setAfterOpen(true);
    }
    wasRunning.current = app.running;
  }, [app.running, app.segs, loadPlace]);

  // Bắt đầu dịch hoặc phân tích thì tab công cụ (tấm trượt) tự đóng để thấy video và tiến độ, khỏi phải bấm X.
  const wasBusy = useRef(false);
  useEffect(() => {
    const busy = app.running || app.analyzing;
    if (busy && !wasBusy.current && isStudioSheet()) setSheetOpen(false);
    wasBusy.current = busy;
  }, [app.running, app.analyzing]);

  // Hướng dẫn «Chỉ tôi» mở/đóng tab công cụ qua sự kiện này (chỉ có tác dụng ở màn có tấm trượt).
  useEffect(() => {
    const onSheet = (event: Event) => {
      if (isStudioSheet()) setSheetOpen(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener("tyzo-sheet", onSheet);
    const onTab = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (stepInfo(id)) setToolTab(id as ToolId);
    };
    window.addEventListener("tyzo-tab", onTab);
    // Trả theo lượt mà chưa chọn gói: mở bước cuối có danh sách gói.
    const onNeedPack = () => {
      setProduct("sub");
      setForced(true);
      setToolTab("run");
      setSheetOpen(true);
    };
    window.addEventListener("tyzo-need-pack", onNeedPack);
    // Menu ở trang khác (Dịch trực tiếp, Hướng dẫn) dẫn về «/#vi» để mở thẳng trang tài khoản.
    const onHash = () => {
      if (window.location.hash !== "#vi") return;
      setProduct("account");
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("tyzo-need-pack", onNeedPack);
      window.removeEventListener("tyzo-sheet", onSheet);
      window.removeEventListener("tyzo-tab", onTab);
    };
  }, []);

  useEffect(() => {
    if (!app.reviewHold) return;
    setToolTab("cast");
    setCtxView("cast");
    setSheetOpen(true);
  }, [app.reviewHold]);

  /** Dịch tiếp sau khi xem bảng nhân vật: đóng tab công cụ trên điện thoại đứng để thấy bản dịch chạy. */
  const continueAfterReview = () => {
    if (isStudioSheet()) setSheetOpen(false);
    app.approveBible();
  };
  /** Dừng lượt đang chạy luôn hỏi lại: lỡ tay bấm thì mất công nhận dạng. */
  const askStop = async () => {
    const ok = await askConfirm({
      title: "Dừng lượt này?",
      text: "Phần đã nhận dạng được giữ lại để bấm Tiếp tục làm nốt, không gửi lại. Chỉ trừ phần đã chạy; phần giữ thừa được trả lại.",
      confirmLabel: "Dừng",
      cancelLabel: "Chạy tiếp",
      danger: true,
    });
    if (ok) app.cancel();
  };
  const showRoomPrice = runDoor.open && payByRoom;
  // Số dư Token dịch đọc một lần: thanh số dư ở đầu màn hình đầu và ô ước tính trên nút bắt đầu dùng chung.
  // Giai đoạn cho ước tính Token: đang chạy thì không hiện; đã có câu mà còn câu chưa dịch thì chỉ còn phần dịch.
  const moneyPhase: "idle" | "running" | "chat" = app.running || app.analyzing ? "running" : app.segs.length > 0 && app.segs.some((seg) => seg.translation === null) ? "chat" : "idle";
  const money = useMoney({ active: runDoor.ready && runDoor.open, asr: app.asrModel, chat: app.modelId, seconds: thumb.seconds ?? 0, narration: narration.enabled, phase: moneyPhase });
  // Đợt 3: màn theo trạng thái. Một trạng thái cách trả dùng chung cho dòng đầu trang và nút chính.
  const pay = payState({
    choice: choosingPay ? null : payByRoom ? "turn" : payChoice ? "key" : null,
    account: money.account,
    failed: money.failed,
    keys: keyHouses,
    turnOpen: runDoor.ready && runDoor.open,
  });
  const answerUse = (answer: UseAnswer | "skip") => {
    rememberUse(safeLocalStore(), answer);
    setUseAnswer(answer);
    // Đếm ẩn danh: chỉ cộng một vào ô của câu trả lời, không kèm tài khoản. Lỗi mạng thì thôi, không làm phiền khách.
    void recordTally({ data: { topic: "use", answer } }).catch(() => {});
    if (answer === "skip") return;
    const preset = presetForUse(answer);
    if (preset.narration !== undefined) patchNarration({ enabled: preset.narration });
    pushToast(preset.tip, "ok");
  };
  // Khách đổi tệp, link hay cách trả thì lỗi cũ dưới nút chính ẩn đi (lỗi mới vẫn hiện).
  const [quietStatus, setQuietStatus] = useState("");
  const lastStatus = useRef(app.status);
  lastStatus.current = app.status;
  useEffect(() => {
    setQuietStatus(lastStatus.current);
  }, [pickedFile, app.url, pay.kind]);
  const startAction = homeAction({ pay, moneyOn: money.on, hasInput: Boolean(pickedFile) || app.url.trim().length > 0, online, running: app.running, blocked: normalDown });
  /** Nút chính làm đúng bước còn thiếu: dịch, thêm key, mở Ví, hoặc đưa về hai lựa chọn cách trả. */
  const runStartAction = () => {
    if (startAction.kind === "start") return void app.start();
    if (startAction.kind === "add-key") return openTool("key");
    if (startAction.kind === "wallet") return setProduct("account");
    if (startAction.kind === "choose") {
      const box = document.querySelector<HTMLElement>('[data-pay-status="choose"]');
      box?.scrollIntoView({ block: "center", behavior: "smooth" });
      box?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    }
  };
  const groqAllow = !showRoomPrice && rentShow.ready ? (rentShow.show?.groq ?? null) : null;
  const aliAllow = !showRoomPrice && rentShow.ready ? (rentShow.show?.alibaba ?? null) : null;
  const dgAllow = !showRoomPrice && rentShow.ready ? (rentShow.show?.deepgram ?? null) : null;
  const aaiAllow = !showRoomPrice && rentShow.ready ? (rentShow.show?.assemblyai ?? null) : null;
  const smAllow = !showRoomPrice && rentShow.ready ? (rentShow.show?.speechmatics ?? null) : null;
  const sxAllow = !showRoomPrice && rentShow.ready ? (rentShow.show?.soniox ?? null) : null;
  const elAllow = !showRoomPrice && rentShow.ready ? (rentShow.show?.elevenlabs ?? null) : null;
  const ownVoice = ownKeyAvailable(app.remoteIds, groqAllow);
  const asrPick = asrPickerRows({
    showRoomPrice,
    allow: { groq: groqAllow, alibaba: aliAllow, deepgram: dgAllow, assemblyai: aaiAllow, speechmatics: smAllow, soniox: sxAllow, elevenlabs: elAllow },
    // Danh sách «phòng mở» (offered) chỉ nói về model Groq; Alibaba, Deepgram, AssemblyAI, Speechmatics, Soniox và ElevenLabs do máy chủ kiểm khi chạy.
    roomHeld: (id) => asrHouse(id) === "groq" && roomHeld(runDoor, id),
    keyModels: { groq: app.remoteIds, ...app.keyModels },
  });
  const lockTurnModels = showRoomPrice && turnLocked;
  // Model dịch dùng được, MỌI nhà: trả theo lượt theo danh sách phòng, key riêng theo các nhà khách đã nhập key.
  const chatRing = app.chatKeyOf();
  const chatUsable = pickPool(showRoomPrice, app.roomOffer, typeof chatRing === "string" ? null : { keys: chatRing.keys, lists: chatRing.lists ?? {} });

  const railItems: RailItem[] = [
    { id: "home", label: MENU_ITEM.home, current: product === "sub" && hero, onPick: () => { setProduct("sub"); setForced(false); } },
    {
      id: "sub",
      label: MENU_GROUP.normal,
      badge: railBadge(service.status, "normal"),
      children: MENU_TOOL_ORDER.map((id) => [id, TOOL_NAME[id]] as const).map(([id, label]) => ({
        id: `tool-${id}`,
        domId: `tool-tab-${id}`,
        label,
        current: product === "sub" && (id === "thuatngu" ? toolTab === "cast" && ctxView === "terms" : id === "cast" ? toolTab === "cast" && ctxView !== "terms" : toolTab === id),
        onPick: () => openTool(id),
      })),
    },
    { id: "dich-truc-tiep", label: MENU_GROUP.live, href: "/dich-truc-tiep", badge: railBadge(service.status, "live") },
    {
      id: "vi-goi",
      label: MENU_GROUP.wallet,
      children: [
        { id: "so-du", domId: "tool-tab-so-du", label: MENU_ITEM.tokens, current: product === "account", onPick: () => setProduct("account") },
        { id: "goi", domId: "tool-tab-goi", label: MENU_ITEM.plans, href: "/goi" },
        { id: "ctv", label: MENU_ITEM.partner, href: "/ctv" },
      ],
    },
    {
      id: "tro-giup",
      label: MENU_GROUP.help,
      children: [
        { id: "huong-dan", label: MENU_ITEM.guide, href: "/huong-dan" },
        { id: "yeu-cau", domId: "tool-tab-yeu-cau", label: MENU_ITEM.appeal, href: "/yeu-cau" },
      ],
    },
    ...(place?.role ? [{ id: "quan-ly", label: MENU_ITEM.manage, href: "/admin" as const }] : []),
  ];

  const clickPicker = () => (document.querySelector("[data-home-hero] input[type=file]") as HTMLInputElement | null)?.click();
  const commands: PaletteCommand[] = [
    { id: "pick", label: "Chọn video", hint: "Việc", words: "tep file mo tai len", disabled: !hero, run: clickPicker },
    {
      id: "paste",
      label: "Dán link từ bộ nhớ tạm và bắt đầu",
      hint: "Việc",
      words: "link url dan paste",
      disabled: app.running,
      run: () => {
        void navigator.clipboard
          .readText()
          .then((text) => {
            const link = pastedLink(text);
            if (!link) return pushToast("Bộ nhớ tạm không có link http/https.", "bad");
            takeLink(link, hero);
          })
          .catch(() => pushToast("Trình duyệt chưa cho đọc bộ nhớ tạm. Hãy bấm Ctrl+V trên trang.", "bad"));
      },
    },
    { id: "start", label: "Bắt đầu tải và dịch", hint: "Việc", words: "chay dich start", disabled: app.running || normalDown || !(pickedFile || app.url.trim()), run: () => void app.start() },
    { id: "stop", label: "Dừng đang chạy", hint: "Việc", words: "huy cancel", disabled: !app.running, run: () => app.cancel() },
    { id: "export-srt", label: "Tải phụ đề SRT (.srt)", hint: "Tải", words: "srt xuat file vietsub phu de", disabled: noSubs || !online, run: () => void app.exportSub("srt") },
    { id: "export-vtt", label: "Tải phụ đề WebVTT (.vtt)", hint: "Tải", words: "vtt webvtt xuat phu de", disabled: noSubs || !online, run: () => void app.exportSub("vtt") },
    { id: "export-txt", label: "Tải chữ thuần (.txt)", hint: "Tải", words: "txt text xuat van ban", disabled: noSubs || !online, run: () => void app.exportSub("txt") },
    { id: "fresh", label: "Video mới (làm lại từ đầu)", hint: "Việc", words: "reset lam lai trang chu", disabled: app.running, run: () => { app.reset(); setProduct("sub"); setForced(false); } },
    ...TOOLS.map(([id, label]) => ({ id: `tool-${id}`, label: `Mở ${label}`, hint: "Mục", words: id === "key" ? "key sub groq cach tra theo luot goi" : id === "voice" ? "nghe thuyet minh giong doc" : "phu de cong cu", run: () => openTool(id) })),
    ...ADVANCED_TOOLS.map(([id, label]) => ({ id: `tool-${id}`, label: `Mở ${label}`, hint: "Mục", words: "thuat ngu glossary the loai", run: () => openTool(id) })),
    { id: "wallet", label: MENU_ITEM.tokens, hint: MENU_GROUP.wallet, words: "tai khoan lich su giao dich token dich goi vi mat khau", run: () => setProduct("account") },
    { id: "dich-truc-tiep", label: "Dịch trực tiếp", hint: "Trang", words: "live truc tiep micro tab giong noi", run: () => void navigate({ to: "/dich-truc-tiep" }) },
    { id: "goi", label: "Thuê phòng và gói", hint: "Trang", words: "mua goi", run: () => void navigate({ to: "/goi" }) },
    { id: "ctv", label: "Cộng tác viên", hint: "Trang", run: () => void navigate({ to: "/ctv" }) },
    { id: "yeu-cau", label: "Yêu cầu xem lại", hint: "Trang", run: () => void navigate({ to: "/yeu-cau" }) },
    { id: "tour", label: "Xem hướng dẫn nhanh", hint: "Trợ giúp", words: "huong dan help chi toi", run: () => { setTourId("quick-start"); setTourOpen(true); } },
    { id: "huong-dan", label: "Hướng dẫn sử dụng", hint: "Trợ giúp", words: "huong dan help tro giup cach dung tim kiem", run: () => void navigate({ to: "/huong-dan" }) },
    ...guideTopics({ plans: roomPlans }).map((topic) => ({ id: `huong-dan-${topic.id}`, label: `Hướng dẫn: ${topic.title}`, hint: "Trợ giúp", words: topic.words, run: () => void navigate({ to: "/huong-dan", hash: topic.id }) })),
    ...(place?.role ? [{ id: "admin", label: "Quản lý", hint: "Trang", run: () => void navigate({ to: "/admin" }) }] : []),
  ];

  return (
    <AppShell className="contents">
    <ConfirmDialog
      open={app.pendingGenre !== null}
      title="Xác nhận trên 18 tuổi"
      message={"Thể loại này có thoại người lớn. Bạn xác nhận mình đủ 18 tuổi trở lên và muốn dùng thể loại này?"}
      confirmLabel="Tôi trên 18 tuổi"
      onConfirm={app.confirmGenre}
      onCancel={app.cancelGenre}
    />
    <SideRail label="Chức năng" items={railItems} who={{ name: me?.displayName, email: me?.primaryEmail }} />
    <StudioDock
      atHome={product === "sub" && hero}
      accountOpen={product === "account"}
      onHome={() => { setProduct("sub"); setForced(false); }}
      onWallet={() => setProduct("account")}
      wheel={<ToolWheel labels={TOOL_NAME} currentId={(WHEEL_ORDER as readonly string[]).includes(toolTab) ? (toolTab as WheelId) : "phim"} onChange={setToolTab} onPress={openTool} progress={app.running && app.stages ? app.stages.percent : null} />}
    />
    <main className="studio-shell">
      <header className="grid shrink-0 gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <RailToggle />
            <BrandMark small title="TyZo Sub" />
            <p className="hidden text-xs font-semibold text-accent min-[480px]:block">TyZo Sub · Công cụ phụ đề AI</p>
          </div>
          {/* Hết chỗ thì xuống dòng (điện thoại hẹp), không đẩy khung rộng hơn màn hình. */}
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              data-palette-open
              aria-label="Tìm nhanh, phím tắt Ctrl K"
              className="min-tap hidden items-center gap-2 rounded-full border border-line bg-card px-3 text-sm text-muted hover:border-accent focus-visible:ring-2 focus-visible:ring-accent lg:inline-flex"
              onClick={() => setPaletteOpen(true)}
            >
              <Icon slot="act.search" className="size-4" />
              <span>Tìm nhanh</span>
              <kbd className="rounded border border-line px-1.5 text-xs">Ctrl K</kbd>
            </button>
            <VersionMark />
            <DisplayToggle />
            <NoticeBell />
          </div>
        </div>
        <h1 data-hero-title className="text-xl font-semibold">Dịch phụ đề video</h1>
        <AccountStrip payByRoom={payByRoom} />
      </header>

      {place?.status === "banned" ? (
        <div className="grid gap-3 p-4">
          <p className="text-sm">Tài khoản đã bị cấm{place.reason ? `: ${place.reason}` : ""}.</p>
          <Link to="/yeu-cau" className="min-tap inline-flex w-fit items-center justify-center rounded-full bg-accent px-4 text-sm font-semibold text-ink">
            Gửi yêu cầu xem lại
          </Link>
          <button type="button" className="min-tap w-fit rounded-full border border-line px-4 text-sm" onClick={() => void signOut("/login")}>
            Đăng xuất
          </button>
        </div>
      ) : (
      <>
      <div data-product="sub" className={product === "account" ? "product-covered" : "contents"}>
      {place?.status === "locked" && (
        <form
          className="grid gap-2 rounded-[var(--radius-ctl)] border border-line bg-card p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAppeal({ data: appeal })
              .then(() => {
                setAppeal("");
                setAppealNotice("Đã gửi yêu cầu xem lại.");
              })
              .catch((error) => setAppealNotice(error instanceof Error && error.message ? error.message : "Chưa gửi được yêu cầu."));
          }}
        >
          <p className="text-sm">Tài khoản đang bị khóa{place.reason ? `: ${place.reason}` : ""}. Bạn vẫn gửi được yêu cầu, nhưng không dịch và không xuất file.</p>
          <textarea value={appeal} onChange={(event) => setAppeal(event.target.value)} rows={3} className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 outline-none" placeholder="Lý do cần mở lại" />
          <button type="submit" className="min-tap w-fit rounded-full border border-line px-4 text-sm">
            Gửi yêu cầu
          </button>
          {appealNotice && <p className="text-sm text-muted">{appealNotice}</p>}
        </form>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          role="status"
          className={"line-clamp-2 h-10 min-w-[11rem] flex-1 text-left text-sm " + (app.isError ? "text-danger" : "text-muted")}
          onClick={() => statusRef.current?.showModal()}
        >
          {statusText}
        </button>
        {!hero && (
        <>
        <span
          className="shrink-0"
          title={noSubs ? EXPORT_EMPTY : undefined}
          onClick={noSubs ? () => pushToast(EXPORT_EMPTY, "bad") : undefined}
        >
          <ExportMenu disabled={noSubs || !online} onPick={(format) => void app.exportSub(format)} />
        </span>
        <button
          type="button"
          disabled={!online}
          title="Lưu chữ gốc Whisper nhận ra, từng câu theo giờ, trước khi dịch"
          className="min-tap shrink-0 rounded-[var(--radius-ctl)] border border-line px-3 text-sm disabled:opacity-40"
          onClick={() => void app.exportRaw()}
        >
          Lưu bản Whisper
        </button>
        </>
        )}
        {app.reviewHold && (
          <button type="button" disabled={!online} className="min-tap shrink-0 rounded-[var(--radius-ctl)] bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-40" onClick={continueAfterReview}>
            Dịch tiếp
          </button>
        )}
        {!hero && !app.running && app.buttonLabel === "Tiếp tục" && (
          <button
            type="button"
            disabled={!online || normalDown}
            className="min-tap shrink-0 rounded-[var(--radius-ctl)] bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-40"
            onClick={() => {
              if (isStudioSheet()) setSheetOpen(false);
              void app.start();
            }}
          >
            Tiếp tục
          </button>
        )}
        <button type="button" aria-label="Xem hướng dẫn nhanh" title="Hướng dẫn nhanh" className="min-tap grid shrink-0 place-items-center rounded-[var(--radius-ctl)] border border-line px-3" onClick={() => setTourOpen(true)}>
          <Icon slot="ui.help" className="size-4" />
        </button>
      </div>
      {!hero && payByRoom && (
        <MoneyCard active asr={app.asrModel} chat={app.modelId} seconds={thumb.seconds ?? app.videoRef.current?.duration ?? 0} narration={narration.enabled} phase={moneyPhase} />
      )}
      <StepsBar report={app.stages} keepOpen={app.running} waiting={app.reviewHold ? "xem và sửa bảng nhân vật nếu cần, rồi bấm Dịch tiếp" : undefined} />
      {afterOpen && !hero && !app.running && (
        <div className="grid shrink-0 gap-2 rounded-[var(--radius-card)] border border-line bg-card p-3 text-sm">
          <p>Dịch xong. Trau chuốt, dịch lại bằng model khác (giữ nhận dạng), hoặc bỏ qua.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="min-tap rounded-full bg-accent px-3 font-semibold text-ink"
              onClick={() => {
                setAfterOpen(false);
                setToolTab("check");
                setSheetOpen(true);
                void app.polish.prepare();
              }}
            >
              Trau chuốt
            </button>
            <button
              type="button"
              className="min-tap rounded-full border border-line px-3"
              onClick={() => {
                setAfterOpen(false);
                setToolTab("key");
                setSheetOpen(true);
                pushToast("Đổi model rồi bấm Tiếp tục. Phần nhận dạng được giữ.");
              }}
            >
              Dịch lại bằng model khác
            </button>
            <button type="button" className="min-tap rounded-full border border-line px-3" onClick={() => setAfterOpen(false)}>
              Bỏ qua
            </button>
          </div>
        </div>
      )}
      <dialog ref={statusRef} className="studio-note">
        <p className="text-sm">{statusText}</p>
        <button type="button" className="min-tap mt-3 rounded-full border border-line px-4 text-sm" onClick={() => statusRef.current?.close()}>
          Đóng
        </button>
      </dialog>


      {hero && (
        <div className="mx-auto grid w-full max-w-2xl gap-3 pt-4 lg:max-w-5xl" data-service-head>
          <ServiceSwitch current="normal" status={service.status} />
          <MaintenanceNotice group="normal" entry={service.status.normal} running={app.running} />
        </div>
      )}
      {!hero && normalDown && (
        <div className="shrink-0 px-1 pt-1">
          <MaintenanceNotice group="normal" entry={service.status.normal} running={app.running} />
        </div>
      )}
      {hero && (
        <HomeHero
          file={pickedFile}
          thumb={thumb}
          url={app.url}
          onFile={(next) => {
            app.setUrl("");
            app.setFile(next);
          }}
          onUrl={app.setUrl}
          source={app.source}
          onSource={app.setSource}
          genre={app.genre}
          onGenre={app.pickGenre}
          onOpenTool={openTool}
          action={startAction}
          onAction={runStartAction}
          problem={app.isError && !app.running && app.status !== quietStatus ? app.status : ""}
          top={
            <div className="grid gap-3 empty:hidden">
              <PayStatusBar
                state={pay}
                money={money}
                onChoose={choosePay}
                onAddKey={() => openTool("key")}
                onWallet={() => setProduct("account")}
                onRetry={() => window.dispatchEvent(new Event("tyzo-room-refresh"))}
                onPickPack={() => window.dispatchEvent(new Event("tyzo-need-pack"))}
              />
              {shouldAsk(useAnswer, money.on ? pay.kind : "off") && <FirstAskCard onAnswer={answerUse} />}
              {/* Một lời mời một lúc: chỉ mời xem hướng dẫn khi không còn câu chọn cách trả hay câu hỏi lần đầu. */}
              {tourOffer && !tourOpen && pay.kind !== "choose" && !shouldAsk(useAnswer, money.on ? pay.kind : "off") && (
                <div data-tour-offer className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-line bg-card px-4 py-2 text-sm">
                  <span>Lần đầu dùng? Xem hướng dẫn 30 giây.</span>
                  <span className="flex gap-2">
                    <button type="button" className="min-tap rounded-full bg-accent px-3 font-semibold text-ink" onClick={() => { setTourId("quick-start"); setTourOpen(true); setTourOffer(false); }}>
                      Xem
                    </button>
                    <button type="button" className="min-tap rounded-full border border-line px-3 text-muted" onClick={() => { markSeen(); setTourOffer(false); }}>
                      Ẩn
                    </button>
                  </span>
                </div>
              )}
            </div>
          }
          extra={payByRoom ? <MoneyEstimate money={money} /> : null}
        />
      )}
      <div className={hero ? "hidden" : "contents"} aria-hidden={hero || undefined}>
      <div className={"studio-stage" + (sheetOpen ? " is-sheet" : "")}>
      <section data-workspace className="studio-workspace">
        <div className="studio-video">
        <Stage
          videoRef={app.videoRef}
          segs={app.segs}
          sub={sub}
          setSub={setSub}
          narrationOn={narration.enabled}
          lead={narration.lead}
          onCue={setCurrent}
          onSpeak={speakAt}
          leadComp={() => narrator.current.compensation(live.current.narration.engine)}
          speechBusy={() => narrator.current.busy()}
          onPause={() => narrator.current.stop(app.videoRef.current)}
          file={pickedFile}
          thumb={thumb}
          url={app.url}
          onFile={app.setFile}
          onUrl={app.setUrl}
        />
        </div>
        <section className="studio-cues grid gap-2 rounded-[var(--radius-card)] border border-line bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold">
              Bản dịch
              <InfoTip label="Cách dùng bản dịch">Chạm một câu để tua. Nút Sửa để chỉnh ngay tại dòng và thêm thuật ngữ.</InfoTip>
            </h2>
          </div>
          <div className="studio-cue-scroll" data-tour="cues">
            {app.segs.length === 0 && <p className="py-6 text-sm text-muted">Chưa có phụ đề. Hãy chọn video và bấm Tải và dịch.</p>}
            {app.segs.map((seg, index) =>
              index === editing ? (
                <div key={`edit-${seg.start}-${seg.end}`} className="border-b border-line py-3">
                  <CueEditor
                    start={seg.start}
                    original={seg.original}
                    draft={draft}
                    rule={rule}
                    onDraft={setDraft}
                    onRule={setRule}
                    onSave={() => {
                      app.editSeg(editing, draft, rule);
                      setEditKey(null);
                    }}
                    onCancel={() => setEditKey(null)}
                  />
                </div>
              ) : (
                <CueRow key={`${seg.start}-${seg.end}-${index}`} seg={seg} index={index} active={index === current} onJump={jumpTo} onEdit={openEdit} onVoice={app.cycleVoiceLock} />
              ),
            )}
          </div>
        </section>
      </section>

      <div className={"studio-tools" + (sheetOpen ? " is-open" : "")}>
        <div className="studio-tool-card">
        <div className="studio-sticky-head">
        <div className="studio-sheet-bar">
          <span className="studio-sheet-title">
            <Icon slot={TOOL_ICON[toolTab].slot} name={TOOL_ICON[toolTab].name} className="size-5" />
            {TOOL_NAME[toolTab]}
          </span>
          <button type="button" className="studio-sheet-close" aria-label="Đóng tab" onClick={() => setSheetOpen(false)}>
            <Icon slot="act.close" className="size-4" />
          </button>
        </div>
        {(() => {
          const step = stepInfo(toolTab);
          if (!step) return null;
          return (
            <div className="studio-step-bar">
              <span className="studio-step-count" aria-label={`Bước ${step.index} trên ${step.total}`}>
                {step.index}/{step.total}
              </span>
              {step.last && app.reviewHold ? (
                <>
                  {/* Lượt đang dừng chờ xem bảng nhân vật: nút chính là Dịch tiếp (tự đóng tab), Hủy nhỏ bên cạnh và hỏi lại. */}
                  <button
                    type="button"
                    data-tour="run"
                    data-step-continue
                    disabled={!online}
                    className="min-tap flex-1 rounded-[var(--radius-ctl)] bg-accent font-semibold text-ink disabled:opacity-40"
                    onClick={continueAfterReview}
                  >
                    Dịch tiếp
                  </button>
                  <button type="button" data-step-stop className="min-tap shrink-0 rounded-[var(--radius-ctl)] border border-danger bg-raised px-3 text-sm font-semibold text-danger" onClick={() => void askStop()}>
                    Hủy
                  </button>
                </>
              ) : step.last ? (
                <button
                  type="button"
                  data-tour="run"
                  disabled={!app.running && (!online || normalDown)}
                  title={!app.running && normalDown ? "Dịch bình thường đang bảo trì" : undefined}
                  className={"min-tap flex-1 rounded-[var(--radius-ctl)] font-semibold disabled:opacity-40 " + (app.running ? "border border-danger bg-raised text-danger" : "bg-accent text-ink")}
                  onClick={() => {
                    if (app.running) void askStop();
                    else {
                      if (isStudioSheet()) setSheetOpen(false);
                      void app.start();
                    }
                  }}
                >
                  {app.buttonLabel}
                </button>
              ) : (
                <button type="button" className="min-tap flex-1 rounded-[var(--radius-ctl)] bg-accent font-semibold text-ink" onClick={() => setToolTab(step.next!)}>
                  Tiếp tục
                </button>
              )}
            </div>
          );
        })()}
        </div>
      <section id="tool-key" role="region" aria-labelledby="tool-tab-key" hidden={toolTab !== "key"} className="grid gap-3 p-4">
        {app.running && (
          <p data-model-locked className="rounded-[var(--radius-ctl)] border border-line bg-card px-3 py-2 text-sm text-muted">
            Lượt đang chạy dùng model đã chọn lúc bấm chạy. Đổi model ở đây thì áp dụng cho lần dịch lại sau.
          </p>
        )}
        {runDoor.ready && runDoor.open && payByRoom && (
          <p className="rounded-[var(--radius-ctl)] border border-line bg-card px-3 py-2 text-sm text-muted">
            Đang trả theo lượt nên không cần dán key. Cách trả và ước tính Token ở bước cuối «{TOOL_NAME.run}».
          </p>
        )}
        {!(runDoor.open && payByRoom) && (
          <KeyRing
            values={{ ...app.houseKeys, groq: app.key }}
            check={keyCheck}
            onChange={(id, value) => (id === "groq" ? app.storeGroqKey(value) : app.setHouseKey(id, value))}
          />
        )}
        <details className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2">
          <summary className="min-tap cursor-pointer text-sm font-medium">Nâng cao: model và nhận dạng giọng</summary>
          <div className="grid gap-3 pt-2">
        {!lockTurnModels && (
        <>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted">Cách dịch</span>
          {!showRoomPrice && (
            <button
              type="button"
              className="inline-flex min-tap items-center gap-1 rounded-full border border-line px-3 text-sm text-fg disabled:opacity-50"
              onClick={() => void app.refreshModels()}
              disabled={app.modelBusy || !online}
            >
              {app.modelBusy ? <Icon slot="ui.busy" className="size-4 animate-spin" /> : <Icon slot="act.retry" className="size-4" />}
              Đồng bộ key
            </button>
          )}
        </div>
        <VoiceLanes
          modelId={app.modelId}
          available={showRoomPrice ? (runDoor.offered ? new Set(runDoor.offered) : null) : ownVoice.ids}
          allowEnterprise={showRoomPrice ? true : app.allowEnterprise}
          known={showRoomPrice ? Boolean(runDoor.offered) : ownVoice.known}
          priceFor={(id) =>
            showRoomPrice
              ? modelFacts(app.board, runDoor, id, "").price
              : ownModelPrice(app.board, id)
          }
          onPick={(id) => app.chooseVoice(id)}
        />
        
        <div className="flex items-start gap-2">
          <details className="min-w-0 flex-1 text-sm text-muted">
          <summary className="cursor-pointer">Nhập mã model khác</summary>
          <div className="pt-2">
            <ModelPicker
              models={app.catalog}
              value={app.modelId}
              remote={showRoomPrice ? null : ownVoice.ids ? [...ownVoice.ids] : app.remoteIds}
              usable={chatUsable}
              board={showRoomPrice ? app.board : null}
              door={showRoomPrice ? runDoor : null}
              onChange={app.chooseVoice}
            />
          </div>
        </details>
          <InfoTip label="Về chọn model">Một lần dịch giữ một lối. Không trộn model nhỏ vào video đang dịch.</InfoTip>
        </div>
        <Select label="Nhận dạng giọng" tip={(groqAllow || aliAllow || dgAllow || aaiAllow || smAllow || sxAllow || elAllow || showRoomPrice) ? <>{(groqAllow || aliAllow || dgAllow || aaiAllow || smAllow || sxAllow || elAllow) ? ASR_ROOM_TIP : null}{showRoomPrice ? " " + ASR_PRICE_TIP : null}</> : undefined} value={app.asrModel} onChange={(value) => app.setAsrModel(value as typeof app.asrModel)}>
          {asrPick.map((row) => (
            <option key={row.id} value={row.id} disabled={row.disabled}>
              {row.name}
              {row.state === "room"
                ? ` · ${roomAsrPrice(app.board, runDoor, row.id)}`
                : row.state === "closed"
                    ? " · Admin chưa mở"
                    : row.state === "noKey"
                      ? " · key của bạn không có model này"
                      : ""}
            </option>
          ))}
        </Select>
        {linkAsrNote(app.asrModel) && <p className="text-sm text-muted">{linkAsrNote(app.asrModel)}</p>}
                </>
        )}
          </div>
        </details>
        <details className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2">
          <summary className="min-tap cursor-pointer text-sm font-medium">Tùy chọn nhận dạng (dùng cho cả hai cách trả)</summary>
          <div className="grid gap-3 pt-2">
            <p className="text-xs text-muted">Áp dụng cho cả Key của tôi và Trả theo lượt. Chọn model ở mục «Nâng cao: model và nhận dạng giọng» phía trên.</p>
        <div className="flex items-center gap-2">
          <label className="flex min-tap items-center gap-2 text-sm">
          <input type="checkbox" checked={app.speechVad} onChange={(event) => app.setSpeechVad(event.target.checked)} />
          Chỉ gửi đoạn có tiếng người
        </label>
          <InfoTip label="Giải thích: Chỉ gửi đoạn có tiếng người">Tắt thì chỉ bỏ đoạn im. Bật thì lần đầu tải thêm khoảng 15 MB, rồi cắt phần không phải lời ở đầu và cuối mỗi đoạn. Không tải được thì dùng lại mức năng lượng. Mỗi đoạn vẫn là một lần gửi.</InfoTip>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex min-tap items-center gap-2 text-sm">
          <input type="checkbox" checked={app.langCheck} onChange={(event) => app.setLangCheck(event.target.checked)} />
          Kiểm tra ngôn ngữ từng đoạn
        </label>
          <InfoTip label="Giải thích: Kiểm tra ngôn ngữ từng đoạn">Hợp video lẫn nhiều thứ tiếng. Đoạn có chữ lệch ngôn ngữ đã chọn hoặc độ tin thấp được nhận dạng lại một lần, không ép ngôn ngữ, và chỉ đổi khi kết quả tốt hơn rõ. Tốn thêm lượt nhận dạng, tối đa khoảng 2 phút âm thanh mỗi lần chạy (trả theo lượt thì trừ thêm Token dịch cho phần đó). Tắt thì chạy như cũ.</InfoTip>
        </div>
        <Select label="Số luồng nhận dạng" tip={THREADS_TIP} value={String(app.threads)} onChange={(value) => app.setThreads(Number(value))}>
          <option value="1">Ổn định · 1 luồng</option>
          <option value="3">Cân bằng · 3 luồng</option>
          <option value="4">Nhanh · 4 luồng</option>
          <option value="6">Mạnh · 6 luồng (hợp key trả phí)</option>
          <option value="8">Tối đa · 8 luồng (hợp key trả phí)</option>
        </Select>
          </div>
        </details>
      </section>

      <section id="tool-phim" role="region" aria-labelledby="tool-tab-phim" hidden={toolTab !== "phim"} className="grid gap-3 p-4">
        {runDoor.ready && runDoor.open && (
          <div className="studio-pay-chip" role="status">
            <span className="text-muted">Trả bằng:</span> <strong>{payByRoom ? "Trả theo lượt" : "Key của tôi"}</strong>
            <button type="button" className="studio-pay-change" onClick={() => openTool("run")} aria-label="Đổi cách trả, ở bước cuối Tải và dịch">
              Đổi
            </button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Nhận diện ngôn ngữ" value={app.source} onChange={app.setSource}>
            {SRC_LANGS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select label="Dịch sang tiếng" value={app.target} onChange={app.setTarget}>
            {LANGS.filter(([value]) => value === "Vietnamese").map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        {app.heardLang ? (
          <p className="text-sm text-muted" role="status">
            Máy nghe ra {({ zh: "Tiếng Trung", ko: "Tiếng Hàn", ja: "Tiếng Nhật", en: "Tiếng Anh" } as Record<string, string>)[app.heardLang] || app.heardLang}
            {app.source !== "auto" && app.heardLang !== app.source ? ". Khác ngôn ngữ bạn chọn." : "."}
          </p>
        ) : null}

        <Select label="Thể loại" value={app.genre} onChange={app.pickGenre}>
          {GENRES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <p className="text-sm text-muted">
          {app.glossaryInfo?.failed ? "Không tải được thuật ngữ có sẵn. Hãy thử lại." : <>Đã nạp <strong className="studio-count">{app.glossaryInfo?.count || 0}</strong> thuật ngữ. </>}
          <button type="button" className="font-semibold text-accent underline" onClick={() => openTool("thuatngu")}>
            Xem và sửa thuật ngữ
          </button>
        </p>

        <FileTile icon={<Icon slot="ui.video" className="size-5" />} image={app.file ? thumb.image : null} title="Video" name={app.file?.name} hint="mp4, mkv, webm…" accept="video/*,audio/*" onFile={app.setFile} />
        <label className="grid gap-1 text-sm text-muted">
          Hoặc link file trực tiếp
          <span className="relative">
            <Icon slot="act.link" className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted" />
            <input
              className={FIELD + " pl-9"}
              type="url"
              placeholder="https://…/video.mp4"
              value={app.url}
              aria-invalid={Boolean(linkCheck.problem)}
              onChange={(event) => {
                if (linkCheck.problem) linkCheck.check(event.target.value);
                app.setUrl(event.target.value);
              }}
              onBlur={(event) => linkCheck.check(event.target.value)}
              onPaste={(event) => linkCheck.check(event.clipboardData.getData("text"))}
            />
          </span>
          {linkCheck.problem && (
            <span role="alert" className="text-xs text-danger">
              {linkCheck.problem}
            </span>
          )}
        </label>
        <details className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2" open={app.audioFile ? true : undefined}>
          <summary className="min-tap cursor-pointer text-sm font-medium">Tùy chọn thêm: âm thanh riêng, file lớn</summary>
          <div className="grid gap-3 pt-2">
            <FileTile icon={<Icon slot="ui.audio" className="size-5" />} title="Âm thanh riêng" name={app.audioFile?.name} hint="Khi file quá lớn" accept="audio/*,video/*" onFile={app.setAudioFile} />
            <p className="text-sm text-muted">
              File lớn hơn 1 GB, MKV, AC3/DTS: tách âm thanh nhỏ bằng ffmpeg rồi chọn vào Âm thanh riêng. Video vẫn phát từ file gốc. Lệnh:{" "}
              <code className="text-fg">ffmpeg -i video.mkv -vn -ac 1 -ar 16000 -c:a aac -b:a 48k -movflags +faststart am-thanh.m4a</code>
            </p>
          </div>
        </details>
      </section>

      <section id="tool-cast" role="region" aria-labelledby="tool-tab-cast" hidden={toolTab !== "cast"} className="grid gap-3 p-4">
          <div role="tablist" aria-label="Ngữ cảnh nội dung" className="grid grid-cols-3 gap-2">
            {(
              [
                ["cast", "Nhân vật"],
                ["terms", "Thuật ngữ"],
                ["note", "Ghi chú nội dung"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={ctxView === id}
                className={"min-tap rounded-[var(--radius-ctl)] px-2 text-sm font-semibold " + (ctxView === id ? "bg-accent text-ink" : "border border-line")}
                onClick={() => setCtxView(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div hidden={ctxView !== "cast"} className="grid gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                Phân tích nội dung
                <InfoTip label="Giải thích phân tích nội dung">Bước riêng, trước khi dịch. Bảng nhân vật khóa tên, giới và cách xưng hô.</InfoTip>
              </h2>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={app.pre}
              className={"min-tap shrink-0 rounded-full px-4 text-sm font-semibold " + (app.pre ? "bg-accent text-ink" : "border border-line")}
              onClick={() => app.setPre(!app.pre)}
            >
              {app.pre ? "Đang bật" : "Tắt"}
            </button>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input className="mt-1" type="checkbox" checked={app.reviewBefore} onChange={(event) => app.setReviewBefore(event.target.checked)} />
            Dừng lại để xem và sửa bảng nhân vật trước khi dịch.
          </label>
          <div className="grid gap-2">
            <button
              type="button"
              className="min-tap rounded-[var(--radius-ctl)] border border-line text-sm disabled:opacity-50"
              disabled={app.running || app.segs.length === 0}
              onClick={() => (app.analyzing ? app.cancel() : void app.analyzeNow())}
            >
              {app.analyzing ? "Hủy phân tích" : "Phân tích ngay"}
            </button>
            {!app.segs.length && <p className="text-xs text-muted">Chưa có lời thoại. Bật phân tích rồi bấm Tải và dịch — app sẽ dừng để bạn xem bảng trước khi dịch.</p>}
          </div>
          {app.bible?.failed && <p className="text-sm text-danger">Không tạo được bảng: {app.bible.failed}</p>}
          {app.bible && !app.bible.failed && (
            <div className="grid gap-2">
              <label className="grid gap-1 text-sm text-muted">
                Tóm tắt
                <textarea className={FIELD} rows={3} value={app.bible.summary || ""} onChange={(event) => app.patchSummary(event.target.value)} />
              </label>
              <div className="grid max-h-80 gap-2 overflow-auto">
                {(app.bible.characters || []).map((character, index) => (
                  // key chỉ theo vị trí: key có tên thì gõ một chữ là hàng bị dựng lại, mất focus, bàn phím ảo tắt
                  <div key={`character-${index}`} className="grid gap-2 rounded-[var(--radius-ctl)] border border-line bg-card p-3">
                    <p className="text-xs font-semibold text-muted">Nhân vật {index + 1}</p>
                    <label className="grid gap-1 text-xs text-muted">
                      Tên nhân vật
                      <input
                        className={FIELD}
                        aria-label="Tên nhân vật"
                        placeholder="Tên nhân vật"
                        value={character.name || ""}
                        onChange={(event) => app.patchCharacter(index, { name: event.target.value })}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-muted">
                      Nam / nữ
                      <select
                        className={FIELD}
                        aria-label="Giới"
                        value={character.gender === "male" || character.gender === "female" ? character.gender : "unknown"}
                        onChange={(event) => app.patchCharacter(index, { gender: event.target.value })}
                      >
                        <option value="female">Nữ</option>
                        <option value="male">Nam</option>
                        <option value="unknown">Chưa rõ</option>
                      </select>
                    </label>
                    <p className="text-xs text-muted">Giới này được giữ khi phân tích lại, và thắng cao độ lúc đọc.</p>
                    <label className="grid gap-1 text-xs text-muted">
                      Tự xưng
                      <input
                        className={FIELD}
                        aria-label="Tự xưng"
                        placeholder="Tự xưng, ví dụ: tôi / em"
                        value={character.self || ""}
                        onChange={(event) => app.patchCharacter(index, { self: event.target.value })}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-muted">
                      Được gọi
                      <input
                        className={FIELD}
                        aria-label="Được gọi"
                        placeholder="Được gọi, ví dụ: anh / chị"
                        value={character.addressed || ""}
                        onChange={(event) => app.patchCharacter(index, { addressed: event.target.value })}
                      />
                    </label>
                  </div>
                ))}
              </div>
              {(app.bible.terms || []).length > 0 && (
                <div className="grid gap-2">
                  <p className="text-sm text-muted">Thuật ngữ trong video</p>
                  {(app.bible.terms || []).slice(0, 24).map((term, index) => (
                    <label key={`${term.src || "t"}-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 text-sm">
                      <span className="truncate text-muted">{term.src}</span>
                      <input className={FIELD} aria-label="Cách dịch" value={term.tgt || ""} onChange={(event) => app.patchTerm(index, event.target.value)} />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
          <div hidden={ctxView !== "terms"} className="grid gap-3">        <div data-tour="glossary-genre">
          <Select label="Thể loại" value={app.genre} onChange={app.pickGenre}>
            {GENRES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        {usesBaseGlossary(app.genre) && (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={app.baseGloss} onChange={(event) => app.setBaseGloss(event.target.checked)} />
            Tự thêm thuật ngữ nền của ngôn ngữ nguồn
          </label>
        )}
        <p className="text-sm text-muted">
          {app.glossaryInfo?.failed ? (
            "Không tải được thuật ngữ có sẵn. Hãy thử lại."
          ) : app.glossaryInfo?.count > 0 ? (
            <>
              Đã nạp <strong className="studio-count">{app.glossaryInfo.count}</strong> thuật ngữ{app.glossaryInfo?.sources?.length > 1 ? " (thể loại này và bộ nền)" : " của thể loại này"}.
            </>
          ) : (
            "Chọn thể loại để nạp thuật ngữ. Thêm tay hoặc nhập CSV ở dưới."
          )}
        </p>
        <details className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2">
          <summary className="min-tap cursor-pointer text-sm font-medium">
            Thuật ngữ thể loại <span className="studio-count">{app.glossaryInfo?.count || 0}</span>
          </summary>
          <p className="pb-2 text-sm text-muted">
            Mỗi thể loại một bộ riêng, không dùng chung. Thêm tay hoặc nhập CSV vẫn lưu trên máy này, theo đúng cặp ngôn ngữ × thể loại.
            {app.glossaryInfo?.userCount ? ` Trong đó ${app.glossaryInfo.userCount} do bạn thêm.` : ""}
            {app.glossaryInfo?.sources?.length ? ` ${app.glossaryInfo.sources.map((s: string) => s.replace(/^\/glossaries\//, "")).join(", ")}.` : ""}
          </p>
          <GlossaryEditor app={app} />
        </details>
            <label className="grid gap-1 text-sm text-muted">
              Thuật ngữ riêng cho phim này
              <textarea className={FIELD} rows={4} placeholder="Bảng thuật ngữ, mỗi dòng: tên gốc = cách dịch" value={app.gloss} onChange={(event) => app.setGloss(event.target.value)} />
            </label>
          </div>
          <div hidden={ctxView !== "note"} className="grid gap-2">
              <input className={FIELD} placeholder="Tên video + năm" value={app.title} onChange={(event) => app.setTitle(event.target.value)} />
              <textarea className={FIELD} rows={3} placeholder="Dàn diễn viên hoặc tóm tắt cốt truyện" value={app.notes} onChange={(event) => app.setNotes(event.target.value)} />
              <textarea
                className={FIELD}
                rows={2}
                maxLength={STYLE_EXTRA_MAX}
                placeholder="Yêu cầu thêm cho bản dịch (giọng văn, mức trang trọng)"
                value={app.extra}
                onChange={(event) => app.setExtra(event.target.value)}
              />
              <p className="text-xs text-muted">{app.extra.length}/{STYLE_EXTRA_MAX} ký tự. Chỉ chỉnh giọng văn; không đổi định dạng kết quả.</p>
          </div>
      </section>

      <section id="tool-voice" role="region" aria-labelledby="tool-tab-voice" hidden={toolTab !== "voice"} className="grid gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              Thuyết minh bản dịch
              <InfoTip label="Giải thích thuyết minh">Giọng neural miễn phí đọc tự nhiên hơn. Lỗi mạng thì máy đọc bằng giọng có sẵn.</InfoTip>
            </h2>
          </div>
          <button
            type="button"
            role="switch"
            data-tour="voice-on"
            aria-checked={narration.enabled}
            className={"min-tap shrink-0 rounded-full px-4 text-sm font-semibold " + (narration.enabled ? "bg-accent text-ink" : "border border-line")}
            onClick={() => patchNarration({ enabled: !narration.enabled })}
          >
            {narration.enabled ? "Đang bật" : "Tắt"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" data-tour="voice-engine">
          <Choice on={narration.engine === "edge"} onClick={() => patchNarration({ engine: "edge", gender: narration.gender === "any" ? "female" : narration.gender })} title="Neural" text="Miễn phí, tự nhiên" />
          <Choice on={narration.engine === "browser"} onClick={() => patchNarration({ engine: "browser" })} title="Giọng máy" text="Có sẵn trên máy" />
          <Choice
            on={narration.engine === "orpheus"}
            onClick={() => patchNarration({ engine: "orpheus", orpheusVoice: defaultOrpheusVoice(app.target, narration.gender) })}
            title="Orpheus"
            text={cloud ? "Có phí" : "Anh, Ả Rập"}
          />
          <Choice
            on={narration.engine === "aura"}
            onClick={() => patchNarration({ engine: "aura", auraVoice: auraLang ? defaultAuraVoice(auraLang, narration.gender) : narration.auraVoice })}
            title="Aura"
            text={auraLang ? "Có phí" : "Anh, Tây Ban Nha"}
          />
          <Choice
            on={narration.engine === "elevenlabs"}
            onClick={() => patchNarration({ engine: "elevenlabs" })}
            title="ElevenLabs"
            text={elevenLang ? "Có phí, có tiếng Việt" : "Chưa đọc tiếng này"}
          />
        </div>
        {narration.engine === "edge" && (
          <p className="text-sm text-muted">
            {narration.matchCast
              ? `Theo tiếng trong video: ${edgeVoice(app.target, "female").label} (nữ) và ${edgeVoice(app.target, "male").label} (nam). `
              : `Giọng ${edgeVoice(app.target, narration.gender === "any" ? "female" : narration.gender).label}. `}
            Không cần API key. Nếu dịch vụ giọng tắt, app tự chuyển sang giọng máy khoảng 20 giây.
          </p>
        )}
        {narration.engine === "orpheus" && !cloud && <p className="text-sm text-danger">Orpheus chưa đọc tiếng này. Máy sẽ dùng giọng có sẵn.</p>}
        {narration.engine === "aura" && !auraLang && <p className="text-sm text-danger">Aura chưa đọc tiếng này. Máy sẽ dùng giọng có sẵn.</p>}
        {narration.engine === "aura" && auraLang && <p className="text-sm text-muted">Aura trừ Token dịch theo số chữ đọc. Hết Token dịch thì máy dùng giọng có sẵn.</p>}
        {narration.engine === "elevenlabs" && !elevenLang && <p className="text-sm text-danger">ElevenLabs chưa đọc tiếng này. Câu sẽ bỏ qua.</p>}
        {narration.engine === "elevenlabs" && elevenLang && (
          <p className="text-sm text-muted">
            {payByRoom ? "ElevenLabs trừ Token dịch theo số chữ đọc." : "ElevenLabs dùng key ElevenLabs của bạn, cước tính ở tài khoản ElevenLabs."}
            {elevenNote ? ` ${elevenNote}` : ""}
          </p>
        )}
        <p className="text-sm text-muted">Giọng dự phòng khi không đo được cao độ, hoặc khi tắt đọc theo video.</p>
        <div className={"grid gap-2 " + (narration.engine === "edge" ? "grid-cols-2" : "grid-cols-3")}>
          {(
            [
              ["female", "Nữ"],
              ["male", "Nam"],
              ["any", "Bất kỳ"],
            ] as const
          )
            .filter(([id]) => narration.engine === "browser" || narration.engine === "orpheus" || narration.engine === "aura" || narration.engine === "elevenlabs" || id !== "any")
            .map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={"min-tap rounded-[var(--radius-ctl)] border text-sm " + (narration.gender === id ? "border-accent bg-accent text-ink" : "border-line")}
              onClick={() => patchNarration({ gender: id, orpheusVoice: defaultOrpheusVoice(app.target, id), ...(auraLang ? { auraVoice: defaultAuraVoice(auraLang, id) } : {}) })}
            >
              {label}
            </button>
          ))}
        </div>
        {narration.engine === "browser" ? (
          <Select label="Giọng trên máy" value={narration.voiceURI} onChange={(voiceURI) => patchNarration({ voiceURI })}>
            <option value="">Tự chọn theo ngôn ngữ</option>
            {(shownVoices.length ? shownVoices : voices).map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} · {voice.lang}
              </option>
            ))}
          </Select>
        ) : narration.engine === "orpheus" ? (
          <Select label="Giọng Orpheus" value={narration.orpheusVoice} onChange={(orpheusVoice) => patchNarration({ orpheusVoice })}>
            {orpheusVoices(app.target)
              .filter((voice) => narration.gender === "any" || voice.gender === narration.gender)
              .map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} · {voice.gender === "female" ? "nữ" : "nam"}
                </option>
              ))}
          </Select>
        ) : narration.engine === "aura" && auraLang ? (
          <Select label="Giọng Aura" value={narration.auraVoice} onChange={(auraVoice) => patchNarration({ auraVoice })}>
            {auraVoices(auraLang)
              .filter((voice) => narration.gender === "any" || voice.gender === narration.gender)
              .map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} · {voice.gender === "female" ? "nữ" : "nam"}
                </option>
              ))}
          </Select>
        ) : narration.engine === "elevenlabs" && elevenLang && elevenShown.length ? (
          <Select label="Giọng ElevenLabs" value={elevenShown.some((voice) => voice.id === narration.elevenVoice) ? narration.elevenVoice : ""} onChange={(elevenVoice) => patchNarration({ elevenVoice })}>
            <option value="">Tự chọn theo giới</option>
            {elevenShown.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
                {voice.gender === "female" ? " · nữ" : voice.gender === "male" ? " · nam" : ""}
              </option>
            ))}
          </Select>
        ) : null}
        <DragSlider label="Tốc độ nói" value={narration.rate} min={0.6} max={1.8} step={0.1} defaultValue={1} marks={[1]} format={(value) => `${value.toFixed(1)}×`} onCommit={(rate) => patchNarration({ rate })} />
        {narration.engine !== "orpheus" && narration.engine !== "aura" && narration.engine !== "elevenlabs" && (
          <DragSlider label="Cao độ" value={narration.pitch} min={0.6} max={1.6} step={0.1} defaultValue={1} marks={[1]} format={(value) => value.toFixed(1)} onCommit={(pitch) => patchNarration({ pitch })} />
        )}
        <DragSlider label="Âm lượng thuyết minh" value={narration.volume} min={0.2} max={1} step={0.05} defaultValue={1} format={(value) => `${Math.round(value * 100)}%`} onCommit={(volume) => patchNarration({ volume })} />
        <DragSlider
          label="Đọc trước / sau phụ đề"
          value={narration.lead}
          min={-1.5}
          max={2}
          step={0.1}
          defaultValue={0}
          marks={[0]}
          format={(value) => (value === 0 ? "Đúng lúc" : value < 0 ? `Trước ${(-value).toFixed(1)} giây` : `Sau ${value.toFixed(1)} giây`)}
          onCommit={(lead) => patchNarration({ lead })}
        />
        <p className="text-sm text-muted">Kéo núm để chỉnh thêm. Đúng lúc là đọc khi câu hiện. Trước là đọc sớm, sau là đọc muộn. App đã tự bù độ trễ tạo giọng, tạo trước vài câu kế tiếp và đọc nhanh vừa phải khi câu dài hơn khoảng thoại.</p>
        <div className="flex items-center gap-2">
          <label className="flex min-tap items-center gap-2 text-sm">
          <input type="checkbox" checked={narration.matchCast} onChange={(event) => patchNarration({ matchCast: event.target.checked })} />
          Đọc theo nhân vật, rồi theo cao độ
        </label>
          <InfoTip label="Giải thích: Đọc theo nhân vật">Câu có tên hoặc tự xưng rõ trong bảng nhân vật thì dùng giới đó. Không chắc thì so cao độ trong video: nhóm thấp là nam, nhóm cao là nữ. Bấm Đổi giọng trên một câu để khóa nam hoặc nữ. Không đoán anh/em.</InfoTip>
        </div>
        <label className="flex min-tap items-center gap-2 text-sm">
          <input type="checkbox" checked={narration.duck} onChange={(event) => patchNarration({ duck: event.target.checked })} />
          Hạ tiếng phim khi đang đọc
        </label>
        <label className="flex min-tap items-center gap-2 text-sm">
          <input type="checkbox" checked={narration.muteVideo} onChange={(event) => patchNarration({ muteVideo: event.target.checked })} />
          Tắt hẳn tiếng gốc lúc thuyết minh
        </label>
        <label className="flex min-tap items-center gap-2 text-sm">
          <input type="checkbox" checked={narration.followPlayback} onChange={(event) => patchNarration({ followPlayback: event.target.checked })} />
          Bám tốc độ phát của video
        </label>
        <label className="flex min-tap items-center gap-2 text-sm">
          <input type="checkbox" checked={narration.skipCues} onChange={(event) => patchNarration({ skipCues: event.target.checked })} />
          Bỏ qua chú thích trong ngoặc, ví dụ [nhạc]
        </label>
        <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line" onClick={previewVoice}>
          Nghe thử một câu
        </button>
      </section>

      <section id="tool-run" role="region" aria-labelledby="tool-tab-run" hidden={toolTab !== "run"} className="grid gap-3 p-4">
        <p className="text-sm text-muted">Bước cuối. Chọn cách trả và xem ước tính Token, rồi bấm Tải và dịch ở thanh trên.</p>
        {runDoor.ready && runDoor.open && (
          <div className="grid gap-2">
            <h2 className="text-sm font-semibold">Cách trả</h2>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" title={KEY_MODE_TIP} aria-describedby="pay-mode-note" className={"min-tap rounded-[var(--radius-ctl)] text-sm font-semibold " + (!payByRoom ? "bg-accent text-ink" : "border border-line")} onClick={() => choosePay("key", true)}>
                Key của tôi
              </button>
              <button type="button" title={TURN_MODE_TIP} aria-describedby="pay-mode-note" className={"min-tap rounded-[var(--radius-ctl)] text-sm font-semibold " + (payByRoom ? "bg-accent text-ink" : "border border-line")} onClick={() => choosePay("turn", true)}>
                Trả theo lượt
              </button>
            </div>
            <p id="pay-mode-note" className="flex items-center gap-2 rounded-[var(--radius-ctl)] border border-line bg-card px-3 py-2 text-sm text-muted">
              <strong className="text-fg">{payByRoom ? "Đang chọn: Trả theo lượt." : "Đang chọn: Key của tôi."}</strong>
              <InfoTip label="Giải thích cách trả">
                {payByRoom ? <>{TURN_MODE_TIP} Số giây từng gói bên dưới là ước tính; số trừ thật là số thực khi xong.</> : KEY_MODE_TIP}
              </InfoTip>
            </p>
            {payByRoom && (
              <TurnPackList
                running={app.running}
                videoRef={app.videoRef}
                fileSeconds={thumb.seconds ?? app.videoRef.current?.duration ?? 0}
                narration={narration.enabled}
                onLocked={setTurnLocked}
                onPick={(pack) => {
                  const next = turnPackModels(pack);
                  if (next.asr) app.setAsrModel(next.asr);
                  if (next.chat) app.chooseVoice(next.chat);
                }}
              />
            )}
          </div>
        )}
        <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line" onClick={app.reset}>
          Làm lại
        </button>
      </section>

      <section id="tool-check" role="region" aria-labelledby="tool-tab-check" hidden={toolTab !== "check"} className="grid gap-3 p-4">
        <PolishPanel ui={app.polish} segs={app.segs} disabled={app.running} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line px-3 text-sm" disabled={app.running || app.segs.length === 0} onClick={() => void app.scanGaps()}>
            Dò khoảng trống
          </button>
          {app.segs.some((seg) => seg.translationFailed) && (
            <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-danger px-3 text-sm font-semibold text-danger" onClick={app.retryFailed}>
              Dịch lại các câu lỗi
            </button>
          )}
        </div>
        {app.gapPlan && (app.gapPlan.selected.length > 0 || app.gapPlan.deferred.length > 0) && (
          <div className="grid gap-2 rounded-[var(--radius-ctl)] border border-line bg-bg p-3 text-sm">
            <p>
              {app.gapPlan.selected.length
                ? `${app.gapPlan.selected.length} khoảng có tiếng nhưng chưa có câu, ${app.gapPlan.audioSeconds.toFixed(1)} giây. Chưa gửi.`
                : "Không còn khoảng nào vừa ngân sách."}
              {app.gapPlan.deferred.length ? ` ${app.gapPlan.deferred.length} khoảng vượt ngân sách ${app.gapPlan.budgetSeconds} giây, không gửi.` : ""}
            </p>
            {app.gapPlan.selected.length > 0 && (
              <ul className="grid gap-1 text-muted">
                {app.gapPlan.selected.slice(0, 6).map((span) => (
                  <li key={`${span.start}-${span.end}`}>
                    {fmt(span.start)}–{fmt(span.end)}
                  </li>
                ))}
              </ul>
            )}
            {app.gapPlan.selected.length > 0 && (
              <button type="button" className="min-tap rounded-[var(--radius-ctl)] bg-accent font-semibold text-ink" disabled={app.running} onClick={() => void app.fillGaps()}>
                Nhận dạng các khoảng này
              </button>
            )}
          </div>
        )}
        <AsrDiag
          raw={app.diag.raw}
          rejects={app.diag.rejects}
          kept={app.segs.length}
          fileName={app.file?.name || app.audioFile?.name}
          retry={app.asrRetry}
          filterRetry={app.filterRetry}
          lang={app.langReport}
          onPlay={app.playReject}
          onKeep={app.keepReject}
          onDrop={app.dropReject}
        />
        {!app.diag.raw.length && !app.diag.rejects.length && !app.gapPlan && <p className="text-sm text-muted">Chưa có gì để kiểm tra. Hãy nhận dạng một video trước.</p>}
      </section>

        </div>
      </div>
      </div>
      </div>

      </div>
      {product === "account" && (
        <div className="studio-wallet-tab grid gap-3">
          <div className="studio-wallet-head">
            <BackButton onBack={() => setProduct("sub")} label="Về màn vừa xem" />
          </div>
          <div className="studio-wallet-body grid gap-3">
            <AccountPanel />
          </div>
        </div>
      )}
      </>
      )}
      <StudioPalette commands={commands} open={paletteOpen} onOpenChange={setPaletteOpen} />
      <GuidedTour open={tourOpen} tour={tourId} onClose={() => setTourOpen(false)} />
    </main>
    </AppShell>
  );
}


/** localStorage nếu trình duyệt cho dùng; bị chặn (chế độ riêng tư, khung nhúng) thì null: lựa chọn chỉ giữ đến khi tải lại. */
function safeLocalStore(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

