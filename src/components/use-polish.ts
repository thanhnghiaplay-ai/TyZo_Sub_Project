// Trau chuốt bản dịch phía khách (bước A5.4 trong HANDOFF_NANG_CAP.md).
// Luồng: Chuẩn bị (lấy giá từng model) → khách chọn model → hộp xác nhận → (key phòng: giữ Token) → polishAll → màn so sánh.
// Không ghi đè phụ đề cho đến khi khách chấp nhận (polish-review.ts). Hủy hoặc lỗi nhà cung cấp thì không trừ.
import { useCallback, useRef, useState } from "react";
import { askConfirm } from "@/lib/confirm";
import { addressLock } from "@/lib/sub/text";
import { contextBlock, makePolishCall, ROOM_KEY } from "@/lib/sub/groq";
import { polishAll, polishSummary, type PolishItem, type PolishOpts, type PolishResult } from "@/lib/sub/polish";
import { planPolish, polishConfirmText, type PolishPlan } from "@/lib/polish-estimate";
import { acceptAll, acceptOne, buildReview, hasPending, rejectOne, revertAll, type PolishReview } from "@/lib/polish-review";
import { getPolishModels, openPolishTicket, quotePolishChoices, type PolishChoiceView } from "@/lib/polish-room";
import { polishIdsFor } from "@/lib/polish-models";
import { closeRoomTicket } from "@/lib/sub/room-ticket";
import type { Seg } from "@/lib/sub/types";
import type { Bible } from "@/lib/sub/text";

export type PolishPhase = "idle" | "quoting" | "pick" | "running" | "review";

type Host = {
  getSegs: () => Seg[];
  getBible: () => Bible | null;
  /** Ghi lại bản dịch (chỉ trường `translation`) vào phụ đề đang giữ rồi cập nhật màn hình. */
  writeTranslations: (next: Array<string | null>) => void;
  genre: string;
  title: string;
  notes: string;
  gloss: string;
  extra: string;
  target: string;
  activeKey: () => string;
  roomPay: () => boolean;
  /** Model khách gọi được bằng key riêng. null = chưa biết, không lọc. */
  remoteIds: string[] | null;
  busy: boolean;
  say: (message: string, error?: boolean) => void;
};

export function usePolish(host: Host) {
  const [phase, setPhase] = useState<PolishPhase>("idle");
  const [rows, setRows] = useState<PolishChoiceView[]>([]);
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState("");
  const [plan, setPlan] = useState<PolishPlan | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [review, setReview] = useState<PolishReview | null>(null);
  const [error, setError] = useState("");
  const hostRef = useRef(host);
  hostRef.current = host;
  const abort = useRef<AbortController | null>(null);
  const prep = useRef<{ items: PolishItem[]; opts: PolishOpts; plan: PolishPlan } | null>(null);

  const build = useCallback(() => {
    const h = hostRef.current;
    const segs = h.getSegs();
    const items: PolishItem[] = segs.map((seg) => ({
      original: seg.original,
      translation: seg.translation,
      edited: seg.edited,
      failed: seg.translationFailed,
    }));
    const context = [
      contextBlock({ title: h.title, notes: h.notes, gloss: h.gloss, bible: h.getBible(), extra: h.extra }),
      addressLock(
        segs.map((seg) => seg.original),
        h.getBible(),
      ),
    ]
      .filter(Boolean)
      .join("\n\n");
    const opts: PolishOpts = { genre: h.genre, context, language: h.target };
    return { items, opts, plan: planPolish(items, opts) };
  }, []);

  const close = useCallback(() => {
    abort.current?.abort();
    setPhase("idle");
    setRows([]);
    setNote("");
    setError("");
    setProgress(null);
    prep.current = null;
  }, []);

  /** Bấm «Trau chuốt bản dịch»: tính số câu, hỏi máy chủ giá từng model, hiện hộp chọn. */
  const prepare = useCallback(async () => {
    const h = hostRef.current;
    if (h.busy) return h.say("Đang chạy. Hãy đợi xong rồi mới trau chuốt.", true);
    if (!h.getSegs().some((seg) => seg.translation && seg.translation.trim())) return h.say("Chưa có bản dịch để trau chuốt.", true);
    const built = build();
    if (built.plan.sendable === 0) {
      setError("Không có câu nào cần trau chuốt (câu bạn sửa tay được giữ nguyên).");
      setPhase("pick");
      setRows([]);
      return;
    }
    setError("");
    setPhase("quoting");
    prep.current = built;
    setPlan(built.plan);
    try {
      const view = await quotePolishChoices({ data: { genre: h.genre, ...built.plan } });
      const roomPay = h.roomPay();
      let list = view.rows;
      if (roomPay) list = list.filter((row) => row.inRoom);
      else if (h.remoteIds) list = list.filter((row) => h.remoteIds?.includes(row.id));
      setRows(list);
      setNote(list.length ? "" : view.note || "Chưa có model trau chuốt nào dùng được với cách trả hiện tại.");
      setPicked((current) => (list.some((row) => row.id === current) ? current : (list.find((row) => row.ready) ?? list[0])?.id || ""));
      setPhase("pick");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa lấy được giá trau chuốt.");
      setRows([]);
      setPhase("pick");
    }
  }, [build]);

  /** Chạy thật sau khi khách chọn model và đồng ý ở hộp xác nhận. */
  const run = useCallback(async () => {
    const h = hostRef.current;
    const built = prep.current ? build() : null;
    const row = rows.find((item) => item.id === picked);
    if (!built || !row) return h.say("Hãy chọn model trau chuốt.", true);
    const roomPay = h.roomPay();
    if (roomPay && (!row.ready || row.tokens == null)) return h.say(row.reason || "Model này chưa có giá, chưa trau chuốt được.", true);
    // Danh sách Chủ đặt có thể vừa đổi: kiểm lại trước khi tốn tiền.
    const allowed = polishIdsFor(await getPolishModels().catch(() => null), h.genre);
    if (!allowed?.includes(row.id)) return h.say("Model này không còn mở cho thể loại này. Hãy chọn lại.", true);
    const skippedEdited = h.getSegs().filter((seg) => seg.edited && seg.translation && seg.translation.trim()).length;
    const confirmed = await askConfirm(
      polishConfirmText({
        plan: built.plan,
        quote: { ready: row.ready, reason: row.reason, tokens: row.tokens, vnd: null },
        modelName: row.name,
        skippedEdited,
        ownKey: !roomPay,
      }),
    );
    if (!confirmed) return;
    const token = h.activeKey();
    if (!token) return h.say("Nhập API key trước khi trau chuốt.", true);
    let ticket: string | null = null;
    if (roomPay) {
      try {
        ticket = (await openPolishTicket({ data: { model: row.id, genre: h.genre, inn: built.plan.inn, out: built.plan.out } })).id;
      } catch (err) {
        return h.say(err instanceof Error ? err.message : "Không giữ được Token cho lần trau chuốt.", true);
      }
    }
    const controller = new AbortController();
    abort.current = controller;
    setPhase("running");
    setProgress({ done: 0, total: built.plan.sendable });
    const snapshot = h.getSegs().map((seg) => ({ translation: seg.translation, edited: seg.edited }));
    let failed = false;
    try {
      const call = makePolishCall(token === ROOM_KEY ? ROOM_KEY : token, row.id, controller.signal, { blockedUntil: 0 }, (message) => h.say(message), ticket);
      const run = await polishAll(call, built.items, built.opts, {
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      const results: PolishResult[] = run.results;
      const sum = polishSummary(results);
      const next = buildReview(snapshot, results);
      setReview(next);
      setPhase("review");
      failed = sum.changed === 0 && sum.same === 0 && sum.failed + sum.refused > 0;
      h.say(
        run.stopped
          ? `Trau chuốt dừng giữa chừng: ${run.stopped}`
          : `Trau chuốt xong: ${sum.changed} câu có bản mới. Chọn câu nào dùng, bản cũ chưa bị đổi.`,
        Boolean(run.stopped),
      );
    } catch (err) {
      failed = true;
      if ((err as { name?: string })?.name === "AbortError") {
        h.say("Đã hủy trau chuốt. Bản dịch giữ nguyên.");
        setPhase("idle");
      } else {
        h.say(err instanceof Error ? err.message : "Trau chuốt thất bại.", true);
        setPhase("pick");
      }
    } finally {
      await closeRoomTicket(ticket, failed);
      if (abort.current === controller) abort.current = null;
      setProgress(null);
    }
  }, [build, picked, rows]);

  const cancel = useCallback(() => abort.current?.abort(), []);

  const apply = useCallback(
    (fn: (segs: Seg[], review: PolishReview) => { segs: Seg[]; review: PolishReview }) => {
      const h = hostRef.current;
      setReview((current) => {
        if (!current) return current;
        const out = fn(h.getSegs(), current);
        h.writeTranslations(out.segs.map((seg) => seg.translation));
        return out.review;
      });
    },
    [],
  );

  const accept = useCallback((index: number) => apply((segs, r) => acceptOne(segs, r, index)), [apply]);
  const reject = useCallback((index: number) => apply((segs, r) => rejectOne(segs, r, index)), [apply]);
  const acceptEvery = useCallback(() => apply((segs, r) => acceptAll(segs, r)), [apply]);
  const revert = useCallback(() => apply((segs, r) => revertAll(segs, r)), [apply]);

  /** «Xong»: còn câu chờ chọn thì hỏi lại bằng hộp của app. Câu chưa chọn giữ bản cũ. */
  const finish = useCallback(async () => {
    if (review && hasPending(review)) {
      const ok = await askConfirm({
        title: "Còn câu chưa chọn",
        text: "Những câu chưa chọn sẽ giữ bản cũ. Đóng màn so sánh?",
        confirmLabel: "Đóng, giữ bản cũ",
      });
      if (!ok) return;
    }
    setReview(null);
    close();
  }, [close, review]);

  return {
    phase,
    rows,
    note,
    picked,
    setPicked,
    plan,
    progress,
    review,
    error,
    prepare,
    run,
    cancel,
    close,
    accept,
    reject,
    acceptEvery,
    revert,
    finish,
  };
}

export type PolishUi = ReturnType<typeof usePolish>;
