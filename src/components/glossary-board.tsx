import { useState } from "react";
import { askConfirm } from "@/lib/confirm";
import {
  deleteGlossaryTerm,
  glossaryHealth,
  listGlossary,
  restoreGlossary,
  saveGlossaryTerm,
  exportGlossary,
  glossaryStats,
  importGlossary,
  previewGlossaryImport,
  setGlossaryHidden,
  setGlossaryPacks,
  setGlossaryReviewed,
  setSuggestionStatus,
} from "@/lib/glossary-room";
import { GENRE_LABELS } from "@/lib/glossary-share";
import { importBatches, importSummary, parseImportText } from "@/lib/glossary-import";
import { REVIEW_FILTERS, cleanReviewFilter, emptyGenres, statLine, type LangStat, type ReviewFilter, type StatRow } from "@/lib/glossary-review";

const LANGS = [
  ["zh", "Trung"],
  ["ko", "Hàn"],
  ["ja", "Nhật"],
  ["en", "Anh"],
] as const;

export function GlossaryBoard() {
  const [lang, setLang] = useState("zh");
  const [genre, setGenre] = useState("auto");
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [health, setHealth] = useState("");
  const [review, setReview] = useState<ReviewFilter>("all");
  const [asDraft, setAsDraft] = useState(false);
  const [packStat, setPackStat] = useState({ total: 0, reviewed: 0 });
  const [stats, setStats] = useState<{ langs: LangStat[]; rows: StatRow[] } | null>(null);
  const [terms, setTerms] = useState<{ id: number; source: string; target: string; hidden: boolean; reviewed: boolean }[]>([]);
  const [ideas, setIdeas] = useState<{ id: number; source: string; target: string }[]>([]);

  async function run(job: () => Promise<void>) {
    setBusy(true);
    try {
      await job();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Chưa làm được.");
    } finally {
      setBusy(false);
    }
  }

  async function load(nextLang = lang, nextGenre = genre, nextQ = q, nextOffset = 0, nextReview = review) {
    const pack = await listGlossary({ data: { lang: nextLang, genre: nextGenre, q: nextQ, offset: nextOffset, review: nextReview } });
    setHidden(pack.hidden);
    setPackStat({ total: pack.packTotal, reviewed: pack.packReviewed });
    setStats(await glossaryStats());
    setTotal(pack.total);
    setOffset(nextOffset);
    setTerms(pack.terms);
    setIdeas(pack.suggestions);
    const pulse = await glossaryHealth();
    setHealth(`${pulse.stored} mục trong phòng, ${pulse.files} mục gốc, ${pulse.hiddenPacks} bộ đang ẩn.`);
  }

  function pick(nextLang: string, nextGenre: string) {
    setLang(nextLang);
    setGenre(nextGenre);
    void run(() => load(nextLang, nextGenre, q, 0));
  }

  return (
    <section className="admin-flow admin-wide">
      <div className="admin-card space-y-3">
      <h2 className="font-semibold">Thuật ngữ</h2>
      {health ? <p className="text-sm text-muted">{health}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <select className="min-tap rounded-[var(--radius-ctl)] border border-line bg-bg px-3" value={lang} onChange={(event) => pick(event.target.value, genre)}>
          {LANGS.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <select className="min-tap rounded-[var(--radius-ctl)] border border-line bg-bg px-3" value={genre} onChange={(event) => pick(lang, event.target.value)}>
          {Object.entries(GENRE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40" disabled={busy} onClick={() => void run(() => load())}>
          {busy ? "Đang tải…" : "Mở bộ này"}
        </button>
        <button
          type="button"
          className="min-tap rounded-full border border-line px-4 text-sm disabled:opacity-40"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await setGlossaryHidden({ data: { pack: true, lang, genre, hidden: !hidden } });
              await load();
            })
          }
        >
          {hidden ? "Hiện bộ này" : "Ẩn bộ này"}
        </button>
        <button
          type="button"
          className="min-tap rounded-full border border-line px-4 text-sm disabled:opacity-40"
          disabled={busy}
          onClick={async () => {
            if (!(await askConfirm({ title: "Ẩn mọi bộ thuật ngữ?", text: "Khách sẽ không dùng được từ có sẵn.", confirmLabel: "Ẩn tất cả", danger: true }))) return;
            void run(async () => {
              const result = await setGlossaryPacks({ data: { hidden: true } });
              setNote(`Đã ẩn ${result.changed} bộ.`);
              await load();
            });
          }}
        >
          Ẩn tất cả
        </button>
        <button
          type="button"
          className="min-tap rounded-full border border-line px-4 text-sm disabled:opacity-40"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const result = await setGlossaryPacks({ data: { hidden: false } });
              setNote(`Đã mở ${result.changed} bộ.`);
              await load();
            })
          }
        >
          Mở tất cả
        </button>
        <button
          type="button"
          className="min-tap rounded-full border border-line px-4 text-sm disabled:opacity-40"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const result = await restoreGlossary({ data: { lang, genre } });
              setNote(result.added ? `Đã khôi phục ${result.added} từ còn thiếu.` : "Bộ này đã đủ từ gốc.");
              await load();
            })
          }
        >
          Khôi phục từ gốc
        </button>
        <button
          type="button"
          className="min-tap rounded-full border border-line px-4 text-sm disabled:opacity-40"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const result = await exportGlossary({ data: { lang, genre } });
              const blob = new Blob([JSON.stringify(result.rows, null, 2)], { type: "application/json" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = `thuat-ngu-${lang}-${genre}.json`;
              link.click();
              URL.revokeObjectURL(link.href);
              setNote(`Đã xuất ${result.rows.length} từ.`);
            })
          }
        >
          Xuất file
        </button>
        <label className={"inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 text-sm " + (busy ? "pointer-events-none opacity-40" : "")}>
          Nhập file
          <input
            type="file"
            accept="application/json,.json,.csv,.tsv,.txt,text/csv,text/plain"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void run(async () => {
                const rows = parseImportText(await file.text());
                const plan = await previewGlossaryImport({ data: { lang, genre, rows } });
                const problems = plan.rejected.slice(0, 3).map((item) => `dòng ${item.line}: ${item.reason}`);
                const note = importSummary(plan) + (problems.length ? ` Dòng lỗi đầu tiên: ${problems.join("; ")}` : "");
                const batches = importBatches(plan);
                if (!batches.length) {
                  setNote(note + " Không có gì để ghi.");
                  return;
                }
                const ok = await askConfirm({
                  title: "Nhập thuật ngữ?",
                  text: `${note} Ghi vào bộ ${lang} / ${GENRE_LABELS[genre] || genre}${asDraft ? ", đánh dấu CHƯA DUYỆT" : ""}.`,
                  confirmLabel: "Nhập",
                });
                if (!ok) {
                  setNote("Đã hủy, chưa ghi gì.");
                  return;
                }
                let written = 0;
                for (const batch of batches) {
                  const result = await importGlossary({ data: { lang, genre, rows: batch, draft: asDraft } });
                  written += result.added;
                  setNote(`Đang nhập… ${written} từ.`);
                }
                setNote(`Đã ghi ${written} từ. ${plan.same} từ giống hệt đã bỏ qua${plan.rejected.length ? `, ${plan.rejected.length} dòng không dùng được` : ""}.`);
                await load();
              });
            }}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={asDraft} onChange={(event) => setAsDraft(event.target.checked)} />
        Lần nhập file này đánh dấu «chưa duyệt» (bản nháp)
      </label>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input className="min-tap rounded-[var(--radius-ctl)] border border-line bg-bg px-3" placeholder="Từ gốc" value={source} onChange={(event) => setSource(event.target.value)} />
        <input className="min-tap rounded-[var(--radius-ctl)] border border-line bg-bg px-3" placeholder="Cách dịch" value={target} onChange={(event) => setTarget(event.target.value)} />
        <button
          type="button"
          className="min-tap rounded-[var(--radius-ctl)] bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-40"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await saveGlossaryTerm({ data: { lang, genre, source, target } });
              setSource("");
              setTarget("");
              setNote("Đã lưu.");
              await load();
            })
          }
        >
          Lưu
        </button>
      </div>
      <div className="flex gap-2">
        <input
          className="min-tap min-w-0 flex-1 rounded-[var(--radius-ctl)] border border-line bg-bg px-3"
          placeholder="Lọc trong bộ đang mở"
          value={q}
          onChange={(event) => {
            const next = event.target.value;
            setQ(next);
          }}
        />
        <select
          className="min-tap rounded-[var(--radius-ctl)] border border-line bg-bg px-3 text-sm"
          value={review}
          onChange={(event) => {
            const next = cleanReviewFilter(event.target.value);
            setReview(next);
            void run(() => load(lang, genre, q, 0, next));
          }}
        >
          {REVIEW_FILTERS.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <button type="button" className="min-tap rounded-full border border-line px-4 text-sm disabled:opacity-40" disabled={busy} onClick={() => void run(() => load(lang, genre, q, 0))}>
          Lọc
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>Bộ này: {statLine(packStat.total, packStat.reviewed)}</span>
        <button
          type="button"
          className="min-tap rounded-full border border-line px-3 text-xs disabled:opacity-40"
          disabled={busy || packStat.total === packStat.reviewed}
          onClick={async () => {
            if (!(await askConfirm({ title: "Duyệt cả bộ?", text: `Đánh dấu «đã duyệt» mọi mục của bộ ${lang} / ${GENRE_LABELS[genre] || genre}. Chỉ làm khi bạn đã xem hết.`, confirmLabel: "Duyệt cả bộ" }))) return;
            void run(async () => {
              const result = await setGlossaryReviewed({ data: { pack: true, lang, genre, reviewed: true } });
              setNote(`Đã duyệt ${result.changed} mục.`);
              await load();
            });
          }}
        >
          Duyệt cả bộ
        </button>
      </div>
      {note ? <p className="text-sm text-muted">{note}</p> : null}
      <p className="text-xs text-muted">Đang thấy {terms.length} / {total} mục. {hidden ? "Bộ này đang ẩn với khách." : "Bộ này đang mở cho khách."}</p>
      </div>
      <div className="admin-card space-y-3">
      <div className="space-y-2">
        {terms.map((term) => (
          <div key={term.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className={"min-w-0 flex-1 break-words " + (term.hidden ? "text-muted line-through" : "")}>{term.source} → {term.target}</span>
            <span className={"rounded-full border px-2 text-xs " + (term.reviewed ? "border-line text-muted" : "border-accent text-accent")}>{term.reviewed ? "Đã duyệt" : "Chưa duyệt"}</span>
            <button type="button" className="min-tap text-xs" disabled={busy} onClick={() => void run(async () => { await setGlossaryReviewed({ data: { id: term.id, reviewed: !term.reviewed } }); await load(lang, genre, q, offset); })}>
              {term.reviewed ? "Bỏ duyệt" : "Duyệt"}
            </button>
            <button type="button" className="min-tap text-xs" disabled={busy} onClick={() => void run(async () => { await setGlossaryHidden({ data: { id: term.id, hidden: !term.hidden } }); await load(lang, genre, q, offset); })}>
              {term.hidden ? "Hiện" : "Ẩn"}
            </button>
            <button
              type="button"
              className="min-tap text-xs"
              disabled={busy}
              onClick={async () => {
                if (!(await askConfirm({ title: "Xóa từ này?", text: `Xóa «${term.source}»?`, confirmLabel: "Xóa", danger: true }))) return;
                void run(async () => {
                  await deleteGlossaryTerm({ data: term.id });
                  await load(lang, genre, q, offset);
                });
              }}
            >
              Xóa
            </button>
          </div>
        ))}
      </div>
      {offset + terms.length < total && (
        <button type="button" className="min-tap rounded-full border border-line px-4 text-sm disabled:opacity-40" disabled={busy} onClick={() => void run(() => load(lang, genre, q, offset + 50))}>
          Xem tiếp
        </button>
      )}
      {stats && stats.langs.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Thống kê số mục</h3>
            <button
              type="button"
              className="min-tap rounded-full border border-line px-3 text-xs disabled:opacity-40"
              disabled={busy || stats.langs.every((item) => item.draft === 0)}
              onClick={async () => {
                const draft = stats.langs.reduce((sum, item) => sum + item.draft, 0);
                if (!(await askConfirm({ title: "Duyệt hết?", text: `Đánh dấu đã duyệt ${draft} mục chưa duyệt, mọi ngôn ngữ. Không cần xem từng câu.`, confirmLabel: "Duyệt hết" }))) return;
                void run(async () => {
                  const result = await setGlossaryReviewed({ data: { all: true, reviewed: true } });
                  setNote(`Đã duyệt ${result.changed} mục.`);
                  await load();
                });
              }}
            >
              Duyệt hết
            </button>
          </div>
          {stats.langs.map((item) => (
            <details key={item.lang} className="text-sm" open={item.lang === lang}>
              <summary className="cursor-pointer">{LANGS.find(([id]) => id === item.lang)?.[1] ?? item.lang}: {statLine(item.total, item.reviewed)}</summary>
              <ul className="mt-1 space-y-1 text-xs text-muted">
                {item.genres.map((g) => (
                  <li key={g.genre}>{g.label}: {g.total} mục, {g.draft} chưa duyệt{g.hidden ? `, ${g.hidden} ẩn` : ""}</li>
                ))}
              </ul>
              {emptyGenres(stats.rows, item.lang, GENRE_LABELS).length > 0 && (
                <p className="mt-1 text-xs text-muted">Chưa có mục: {emptyGenres(stats.rows, item.lang, GENRE_LABELS).map((id) => GENRE_LABELS[id]).join(", ")}.</p>
              )}
            </details>
          ))}
        </div>
      )}
      {ideas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Khách gửi lên</h3>
          {ideas.map((idea) => (
            <div key={idea.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 break-words">{idea.source} → {idea.target}</span>
              <button type="button" className="min-tap text-xs" disabled={busy} onClick={() => void run(async () => { await setSuggestionStatus({ data: { id: idea.id, status: "adopted" } }); await load(lang, genre, q, offset); })}>Nhận</button>
              <button type="button" className="min-tap text-xs" disabled={busy} onClick={() => void run(async () => { await setSuggestionStatus({ data: { id: idea.id, status: "dropped" } }); await load(lang, genre, q, offset); })}>Bỏ</button>
            </div>
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
