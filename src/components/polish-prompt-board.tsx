import { useEffect, useState } from "react";
import { pushToast } from "@/components/toast";
import { askConfirm } from "@/lib/confirm";
import { GENRES } from "@/lib/home-state";
import { getPolishPrompts, savePolishPrompts } from "@/lib/polish-room";
import type { PolishPrompts } from "@/lib/polish-prompts";
import { GENRE_PROMPT_MAX, genrePrompt } from "@/lib/sub/genre-prompts";

const FIELD = "w-full rounded-[var(--radius-ctl)] border border-line bg-bg px-3 py-2 text-base text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * Admin sửa lệnh giọng văn trau chuốt theo từng thể loại (v5.29.0).
 * Chỉ sửa phần giọng văn; phần khung (giữ nghĩa, thuật ngữ, không câu từ chối, trả JSON) cố định trong code.
 */
export function PolishPromptBoard() {
  const [saved, setSaved] = useState<PolishPrompts>({});
  const [genre, setGenre] = useState(GENRES[0]?.[0] ?? "auto");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void getPolishPrompts()
      .then((next) => setSaved(next))
      .catch(() => pushToast("Chưa đọc được lệnh trau chuốt đã lưu.", "bad"))
      .finally(() => setLoaded(true));
  }, []);

  const fallback = genrePrompt(genre).polish;
  const own = saved[genre];
  // Đổi thể loại hoặc vừa đọc xong: ô hiện bản đang dùng (đã sửa hoặc mặc định).
  useEffect(() => {
    setDraft(own ?? fallback);
  }, [genre, own, fallback]);

  const dirty = draft.trim() !== (own ?? fallback).trim();

  function store(next: PolishPrompts, message: string) {
    setBusy(true);
    void savePolishPrompts({ data: next })
      .then((value) => {
        setSaved(value);
        pushToast(message);
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được lệnh trau chuốt.", "bad"))
      .finally(() => setBusy(false));
  }

  function save() {
    const text = draft.trim();
    const next = { ...saved };
    // Lưu đúng chữ mặc định thì coi như không sửa, để sau này mặc định trong code đổi thì thể loại này đổi theo.
    if (!text || text === fallback.trim()) delete next[genre];
    else next[genre] = text;
    store(next, "Đã lưu lệnh trau chuốt. Lần trau chuốt sau của khách dùng lệnh này.");
  }

  async function reset() {
    const ok = await askConfirm({
      title: "Về lệnh mặc định?",
      text: "Bỏ bản đã sửa của thể loại này, dùng lại lệnh mặc định trong app.",
      confirmLabel: "Về mặc định",
      cancelLabel: "Giữ bản đã sửa",
      danger: true,
    });
    if (!ok) return;
    const next = { ...saved };
    delete next[genre];
    store(next, "Đã về lệnh mặc định.");
  }

  const edited = Object.keys(saved).length;

  return (
    <section className="space-y-3" data-polish-prompts>
      <p className="text-sm text-muted">
        Lệnh giọng văn gửi kèm mỗi lần trau chuốt, viết cho AI (nên viết tiếng Anh). Phần khung giữ nghĩa câu, giữ ký hiệu thuật ngữ, không cho câu từ chối và cách trả kết quả là cố định, không sửa ở đây.
        Ngữ cảnh phim, bảng nhân vật, câu mẫu và yêu cầu thêm của khách vẫn đi kèm như cũ.
      </p>
      <p className="text-xs text-muted">{loaded ? (edited ? `${edited} thể loại đang dùng bản đã sửa.` : "Mọi thể loại đang dùng lệnh mặc định.") : "Đang đọc…"}</p>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Thể loại</span>
        <select className={FIELD} value={genre} onChange={(event) => setGenre(event.target.value)}>
          {GENRES.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
              {saved[id] ? " · đã sửa" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Lệnh giọng văn {own ? "(đã sửa)" : "(mặc định)"}</span>
        <textarea rows={8} maxLength={GENRE_PROMPT_MAX} className={FIELD + " font-mono text-sm"} value={draft} onChange={(event) => setDraft(event.target.value)} />
        <span className="text-xs text-muted">
          {draft.length}/{GENRE_PROMPT_MAX} ký tự. Để trống rồi Lưu cũng là về mặc định.
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || !dirty} className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40" onClick={save}>
          Lưu
        </button>
        <button type="button" disabled={busy || !dirty} className="min-tap rounded-full border border-line px-4 text-sm disabled:opacity-40" onClick={() => setDraft(own ?? fallback)}>
          Bỏ thay đổi
        </button>
        {own && (
          <button type="button" disabled={busy} className="min-tap rounded-full border border-danger px-4 text-sm text-danger disabled:opacity-40" onClick={() => void reset()}>
            Về mặc định
          </button>
        )}
      </div>
    </section>
  );
}
