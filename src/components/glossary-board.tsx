import { useState } from "react";
import { deleteGlossaryTerm, listGlossary, saveGlossaryTerm, setGlossaryHidden, setSuggestionStatus } from "@/lib/glossary-room";

const LANGS = [
  ["zh", "Trung"],
  ["ko", "Hàn"],
  ["ja", "Nhật"],
  ["en", "Anh"],
] as const;

const GENRES = ["auto", "action", "romance", "comedy", "horror", "crime", "daily", "adult", "sex", "series", "costume", "historical", "mystery", "sports", "scifi", "adventure", "psychological"];

export function GlossaryBoard() {
  const [lang, setLang] = useState("zh");
  const [genre, setGenre] = useState("auto");
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [note, setNote] = useState("");
  const [hidden, setHidden] = useState(false);
  const [terms, setTerms] = useState<{ id: number; source: string; target: string; hidden: boolean }[]>([]);
  const [ideas, setIdeas] = useState<{ id: number; source: string; target: string }[]>([]);

  async function load(nextLang = lang, nextGenre = genre, nextQ = q) {
    const pack = await listGlossary({ data: { lang: nextLang, genre: nextGenre, q: nextQ } });
    setHidden(pack.hidden);
    setTerms(pack.terms);
    setIdeas(pack.suggestions);
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Thuật ngữ</h2>
      <div className="grid grid-cols-2 gap-2">
        <select className="min-tap rounded-xl border border-line bg-bg px-3" value={lang} onChange={(event) => setLang(event.target.value)}>
          {LANGS.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <select className="min-tap rounded-xl border border-line bg-bg px-3" value={genre} onChange={(event) => setGenre(event.target.value)}>
          {GENRES.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink" onClick={() => void load().catch((error: Error) => setNote(error.message))}>
          Mở bộ này
        </button>
        <button
          type="button"
          className="min-tap rounded-full border border-line px-4 text-sm"
          onClick={() =>
            void setGlossaryHidden({ data: { pack: true, lang, genre, hidden: !hidden } })
              .then(() => load())
              .catch((error: Error) => setNote(error.message))
          }
        >
          {hidden ? "Hiện cả bộ" : "Ẩn cả bộ"}
        </button>
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <input className="min-tap rounded-xl border border-line bg-bg px-3" placeholder="Từ gốc" value={source} onChange={(event) => setSource(event.target.value)} />
        <input className="min-tap rounded-xl border border-line bg-bg px-3" placeholder="Cách dịch" value={target} onChange={(event) => setTarget(event.target.value)} />
        <button
          type="button"
          className="min-tap rounded-xl bg-accent px-3 text-sm font-semibold text-ink"
          onClick={() =>
            void saveGlossaryTerm({ data: { lang, genre, source, target } })
              .then(() => {
                setSource("");
                setTarget("");
                setNote("Đã lưu.");
                return load();
              })
              .catch((error: Error) => setNote(error.message))
          }
        >
          Lưu
        </button>
      </div>
      <input className="min-tap w-full rounded-xl border border-line bg-bg px-3" placeholder="Lọc trong bộ đang mở" value={q} onChange={(event) => setQ(event.target.value)} />
      {note ? <p className="text-sm text-muted">{note}</p> : null}
      <div className="space-y-2">
        {terms.map((term) => (
          <div key={term.id} className="flex items-center gap-2 text-sm">
            <span className={"min-w-0 flex-1 truncate " + (term.hidden ? "text-muted line-through" : "")}>{term.source} → {term.target}</span>
            <button type="button" className="text-xs" onClick={() => void setGlossaryHidden({ data: { id: term.id, hidden: !term.hidden } }).then(() => load())}>
              {term.hidden ? "Hiện" : "Ẩn"}
            </button>
            <button type="button" className="text-xs" onClick={() => void deleteGlossaryTerm({ data: term.id }).then(() => load())}>
              Xóa
            </button>
          </div>
        ))}
      </div>
      {ideas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Khách gửi lên</h3>
          {ideas.map((idea) => (
            <div key={idea.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{idea.source} → {idea.target}</span>
              <button type="button" className="text-xs" onClick={() => void setSuggestionStatus({ data: { id: idea.id, status: "adopted" } }).then(() => load())}>
                Nhận
              </button>
              <button type="button" className="text-xs" onClick={() => void setSuggestionStatus({ data: { id: idea.id, status: "dropped" } }).then(() => load())}>
                Bỏ
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
