/**
 * BƯỚC DỊCH: dịch các câu đã nhận dạng mà chưa dịch, theo từng lô, nhiều lô cùng lúc.
 * - Chờ bảng phân tích nội dung (nhân vật, xưng hô) khi khách bật "Xem trước khi dịch".
 * - Trả theo lượt: đổi phiếu từ phần nhận dạng sang phần dịch (ensureChatTicket) trước lô đầu.
 * - Giữ thuật ngữ (bảng thuật ngữ theo thể loại + của khách), chọn model tay hoặc Tự động (thử lại tối đa 3 model).
 * Đọc và ghi trạng thái lần chạy `j` (job.ts); dừng khi khách bắt đầu lần chạy khác.
 */
import { addressLock, BATCH, glossaryHit, untranslated } from "@/lib/sub/text";
import { contextBlock, sleep, throwIfAborted, translateIndexes, translateWithRepair, type ChatKey } from "@/lib/sub/groq";
import { loadGenreGlossary, loadRunGlossary, mergeIntoGloss, overlayUserTerms, protectTerms, restoreTerms, settleGlossaryLines, stripLeftoverPlaceholders, type GlossaryTerm } from "@/lib/sub/glossary";
import { pickAutoModel } from "@/lib/sub/models";
import type { AutoProfile, ModelMode, Seg } from "@/lib/sub/types";
import type { Job } from "./job";

type Ref<T> = { current: T };

export type TranslateContext = {
  j: Job;
  my: number;
  signal: AbortSignal;
  source: string;
  target: string;
  mode: ModelMode;
  /** Model dịch khách chọn tay (khi mode là "manual"). */
  chosen: string;
  genre: string;
  gloss: string;
  title: string;
  notes: string;
  /** Yêu cầu thêm về văn phong của khách. */
  extra: string;
  profile: AutoProfile;
  allowEnterprise: boolean;
  baseGloss: boolean;
  threads: number;
  /** Chữ ký ngôn ngữ đích + model: đổi thì dịch lại. */
  modelSig: string;
  ticket: () => string | null;
  ticketPart: () => "all" | "asr" | "chat" | "released";
  preRef: Ref<boolean>;
  reviewRef: Ref<boolean>;
  roomPayRef: Ref<boolean>;
  userTermsRef: Ref<GlossaryTerm[]>;
  pauseForNewBible: Ref<boolean>;
  chatKeyOf: () => ChatKey;
  autoPool: () => Parameters<typeof pickAutoModel>[0]["available"];
  ensureAnalysis: () => Promise<unknown>;
  releaseAsrTicket: () => Promise<void>;
  ensureChatTicket: () => Promise<void>;
  setReviewHold: (hold: boolean) => void;
  publish: (immediate?: boolean) => void;
  progress: () => void;
  say: (message: string, error?: boolean) => void;
  onWait: (message: string) => void;
};

export function createTranslator(ctx: TranslateContext) {
  const { j, my, signal, source, target, mode, chosen, genre, gloss, title, notes, extra, profile, allowEnterprise, baseGloss, threads, modelSig, ticket, ticketPart, preRef, reviewRef, roomPayRef, userTermsRef, pauseForNewBible, chatKeyOf, autoPool, ensureAnalysis, releaseAsrTicket, ensureChatTicket, setReviewHold, publish, progress, say, onWait } = ctx;

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
              // Đang chờ khách thì không giữ phiếu nào: phần nhận dạng trừ xong, phần dịch giữ khi bấm Dịch tiếp.
              await releaseAsrTicket();
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
        // Phiếu phần nhận dạng không giữ cho phần dịch: chưa nhận dạng xong thì chờ, không dịch xen bằng phiếu đó.
        if (ticketPart() === "asr" && roomPayRef.current && !done) {
          await sleep(400, signal);
          continue;
        }
        await ensureChatTicket();
        if (my !== j.runId) return;
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
            const pack = await loadRunGlossary(source, genre, target, baseGloss);
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
              contextBlock({ title, notes, gloss: effectiveGloss, bible: j.bible, extra }),
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
                    available: autoPool(),
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
                chatKeyOf(),
                used,
                signal,
                j.gate,
                opts,
                onWait,
                ticket(),
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
                chatKeyOf(),
                used,
                signal,
                j.gate,
                { ...opts, fix: true },
                onWait,
                settled.lines,
                ticket(),
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
            // Người dùng vừa sửa tay câu này trong lúc máy đang dịch: giữ câu của người dùng.
            if (seg.edited && seg.translation !== null) return;
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

  return { translateRemaining };
}
