import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { pushToast } from "@/components/toast";
import { getProviderKey, saveProviderKey } from "@/lib/provider-room";
import { PROVIDERS, PROVIDER_IDS, providerKeyNote, type ProviderId } from "@/lib/sub/provider";

/**
 * Ô key phòng cho một nhà cung cấp bất kỳ trong bảng PROVIDERS. Không dùng chung ô key nhà khác.
 * Không hiện lại key đã lưu. Ghi chú mặc định sinh từ khả năng của nhà (`providerKeyNote`).
 * Nhà mới không cần thêm gì ở Admin: `<ProviderKeyBoards />` vẽ một ô cho mỗi nhà trong `PROVIDER_IDS`.
 */
export function ProviderKeyBoard({ provider, note }: { provider: ProviderId; note?: string }) {
  const info = PROVIDERS[provider];
  const [tail, setTail] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getProviderKey({ data: provider })
      .then((next) => {
        setTail(next.keyTail);
        setCount(next.models?.length ?? null);
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : `Chưa đọc được key ${info.label}.`, "bad"));
  }, [provider, info.label]);

  async function paste() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        pushToast("Bộ nhớ tạm không có nội dung để dán.", "bad");
        return;
      }
      setDraft(text);
    } catch {
      pushToast("Chưa dán được. Hãy cho phép dán, hoặc nhập tay.", "bad");
    }
  }

  function save() {
    const token = draft.trim();
    if (!token) return pushToast(`Hãy nhập key ${info.label}.`, "bad");
    setBusy(true);
    void saveProviderKey({ data: { provider, key: token } })
      .then((ids) => {
        setTail(token.slice(-4));
        setCount(ids.length);
        setDraft("");
        setShow(false);
        pushToast(`Đã lưu key ${info.label}. Key gọi được ${ids.length} model.`);
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : `Chưa lưu được key ${info.label}.`, "bad"))
      .finally(() => setBusy(false));
  }

  return (
    <section className="space-y-2 rounded-[var(--radius-card)] border border-line bg-card p-4">
      <h3 className="text-sm font-semibold">Key {info.label} của phòng</h3>
      <p className="text-sm text-muted">{note ?? providerKeyNote(provider)}</p>
      <div className="flex gap-2">
        <input
          className="min-tap min-w-0 flex-1 rounded-[var(--radius-ctl)] border border-line bg-bg px-3 text-sm"
          type={show ? "text" : "password"}
          value={draft}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label={`Key ${info.label} của phòng`}
          placeholder={tail ? "Key đã lưu. Dán key mới nếu muốn đổi" : `Key ${info.label} (${info.keyPage})`}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line px-3 text-sm" onClick={() => void paste()}>
          Dán
        </button>
        <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line px-3" aria-label={show ? "Ẩn key" : "Hiện key"} onClick={() => setShow((value) => !value)}>
          {show ? <Icon slot="ui.hide" className="size-4" /> : <Icon slot="ui.eye" className="size-4" />}
        </button>
        <button type="button" className="min-tap rounded-[var(--radius-ctl)] bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-50" disabled={busy} onClick={save}>
          Lưu key
        </button>
      </div>
      <p className="text-xs text-muted">
        {tail ? `Đã lưu key, kết thúc bằng ${tail}.` : `Chưa lưu key ${info.label}.`}
        {count == null ? "" : ` ${count} model trên key.`}
      </p>
    </section>
  );
}

/** Một ô key phòng cho MỖI nhà trong PROVIDER_IDS. Thêm nhà vào bảng PROVIDERS là ô mới tự hiện. */
export function ProviderKeyBoards() {
  return (
    <>
      {PROVIDER_IDS.map((id) => (
        <ProviderKeyBoard key={id} provider={id} />
      ))}
    </>
  );
}
