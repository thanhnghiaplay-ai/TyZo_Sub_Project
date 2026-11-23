import { useEffect, useRef, useState } from "react";
import { usePipeline } from "@/components/use-pipeline";
import { termsToCsv } from "@/lib/sub/glossary";
import { FIELD } from "@/components/studio-shared";

/** Ô sửa thuật ngữ (GlossaryEditor) của phòng dịch. Tách từ studio.tsx (23/11/2026). */

export function GlossaryEditor({ app }: { app: ReturnType<typeof usePipeline> }) {
  const [src, setSrc] = useState("");
  const [tgt, setTgt] = useState("");
  const [note, setNote] = useState("");
  const [share, setShare] = useState(false);
  useEffect(() => {
    try {
      setShare(localStorage.getItem("gshare") === "1");
    } catch {
      setShare(false);
    }
  }, []);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const add = () => {
    app.addUserTerm(src, tgt);
    setSrc("");
    setTgt("");
    setNote(`Đã thêm «${src.trim()}».`);
  };
  return (
    <div className="grid gap-2 pb-2">
      <p className="text-muted text-xs">
        Term của bạn lưu trên máy này, theo đúng cặp ngôn ngữ × thể loại đang chọn, và ghi đè file của thể loại đó khi trùng. File không dùng chung giữa các thể loại. Tiếng Nhật khớp thêm đuôi nói thường gặp (ます / た / ない / する). CSV: cột source, target (hoặc mỗi dòng «gốc = dịch»).
      </p>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <input className={FIELD} placeholder="Từ gốc" value={src} onChange={(e) => setSrc(e.target.value)} />
        <input className={FIELD} placeholder="Cách dịch" value={tgt} onChange={(e) => setTgt(e.target.value)} />
        <button type="button" className="min-tap rounded-[var(--radius-ctl)] bg-accent px-3 text-sm font-semibold text-ink" onClick={add} disabled={!src.trim()}>
          Thêm
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line px-3 text-sm" onClick={() => fileRef.current?.click()}>
          Nhập CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            const text = await file.text();
            const n = app.importUserCsv(text);
            setNote(n ? `Đã nhập ${n} dòng.` : "Không đọc được dòng nào.");
          }}
        />
        <button
          type="button"
          className="min-tap rounded-[var(--radius-ctl)] border border-line px-3 text-sm"
          disabled={!app.userTerms.length}
          onClick={() => {
            const blob = new Blob([termsToCsv(app.userTerms)], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "glossary.csv";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Xuất CSV
        </button>
        <button
          type="button"
          className="min-tap rounded-[var(--radius-ctl)] border border-line px-3 text-sm"
          disabled={!app.userTerms.length}
          onClick={() => {
            app.clearUserTerms();
            setNote("Đã xóa thuật ngữ bạn thêm cho cặp này.");
          }}
        >
          Xóa của tôi
        </button>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={share}
          onChange={(event) => {
            const on = event.target.checked;
            setShare(on);
            localStorage.setItem("gshare", on ? "1" : "0");
            setNote(on ? "Sẽ gửi bản sao thuật ngữ của bạn khi bạn thêm." : "Không gửi thuật ngữ lên phòng.");
          }}
        />
        Gửi thuật ngữ của tôi để phòng xem. Mặc định tắt. Phòng chưa dùng cho người khác cho đến khi Admin nhận.
      </label>
      {note ? <p className="text-xs text-muted">{note}</p> : null}
      <div className="grid max-h-48 gap-1 overflow-auto text-sm">
        {(app.glossaryInfo?.terms || [])
          .filter((t: { user?: boolean }) => t.user)
          .map((t: { source: string; target: string; user?: boolean }) => (
            <div key={"u-" + t.source} className="flex items-center gap-2 border-b border-line/50 py-0.5">
            <span className="min-w-0 flex-1 truncate font-medium">{t.source}</span>
            <span className="text-muted">→</span>
            <span className="min-w-0 flex-1 truncate">{t.target}</span>
            {t.user ? (
              <button type="button" className="shrink-0 text-xs text-muted" onClick={() => app.removeUserTerm(t.source)} aria-label="Xóa">
                xóa
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
