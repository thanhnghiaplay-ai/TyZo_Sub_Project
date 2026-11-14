import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { pushToast } from "@/components/toast";
import { getAlibabaDesk, saveAlibabaKey } from "@/lib/pack-room";

/** Key Alibaba của phòng. Không dùng chung ô key Groq. Không hiện lại key đã lưu. */
export function AlibabaKeyBoard() {
  const [tail, setTail] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getAlibabaDesk()
      .then((next) => {
        setTail(next.keyTail);
        setCount(next.models?.length ?? null);
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được key Alibaba.", "bad"));
  }, []);

  function save() {
    const token = draft.trim();
    if (!token) return pushToast("Hãy nhập key Alibaba.", "bad");
    setBusy(true);
    void saveAlibabaKey({ data: token })
      .then((ids) => {
        setTail(token.slice(-4));
        setCount(ids.length);
        setDraft("");
        setShow(false);
        pushToast(`Đã lưu key Alibaba. Key gọi được ${ids.length} model.`);
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được key Alibaba.", "bad"))
      .finally(() => setBusy(false));
  }

  return (
    <section className="space-y-2 rounded-2xl border border-line bg-card p-4">
      <h3 className="text-sm font-semibold">Key Alibaba của phòng</h3>
      <p className="text-sm text-muted">Tách khỏi key Groq. Chỉ Chủ lưu. Khách không thấy key. Cửa trả theo lượt chưa dùng key này.</p>
      <div className="flex gap-2">
        <input
          className="min-tap min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-sm"
          type={show ? "text" : "password"}
          value={draft}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={tail ? "Key đã lưu. Dán key mới nếu muốn đổi" : "sk-… key Alibaba"}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="button" className="min-tap rounded-xl border border-line px-3" aria-label={show ? "Ẩn key" : "Hiện key"} onClick={() => setShow((value) => !value)}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
        <button type="button" className="min-tap rounded-xl bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-50" disabled={busy} onClick={save}>
          Lưu key
        </button>
      </div>
      <p className="text-xs text-muted">
        {tail ? `Đã lưu key, kết thúc bằng ${tail}.` : "Chưa lưu key Alibaba."}
        {count == null ? "" : ` ${count} model trên key.`}
      </p>
    </section>
  );
}
