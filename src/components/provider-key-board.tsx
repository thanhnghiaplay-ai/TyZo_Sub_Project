import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { pushToast } from "@/components/toast";
import { getProviderKey, getProviderMarkup, saveProviderKey, saveProviderMarkup } from "@/lib/provider-room";
import { PROVIDERS, type ProviderId } from "@/lib/sub/provider";

/**
 * Ô key phòng cho một nhà cung cấp bất kỳ trong bảng PROVIDERS. Không dùng chung ô key nhà khác.
 * Không hiện lại key đã lưu. Nhà mới chỉ cần thêm một dòng `<ProviderKeyBoard provider="..." />` ở Admin.
 */
export function ProviderKeyBoard({ provider, note, withMarkup }: { provider: ProviderId; note?: string; withMarkup?: boolean }) {
  const info = PROVIDERS[provider];
  const [tail, setTail] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [markup, setMarkup] = useState("0");

  useEffect(() => {
    if (!withMarkup) return;
    void getProviderMarkup({ data: provider })
      .then((value) => setMarkup(String(value)))
      .catch(() => undefined);
  }, [provider, withMarkup]);

  function saveMarkup() {
    setBusy(true);
    void saveProviderMarkup({ data: { provider, markup: Number(markup || 0) } })
      .then((value) => pushToast(`Đã lưu phần trăm chênh ${info.label}: ${value}%.`))
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được.", "bad"))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    void getProviderKey({ data: provider })
      .then((next) => {
        setTail(next.keyTail);
        setCount(next.models?.length ?? null);
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : `Chưa đọc được key ${info.label}.`, "bad"));
  }, [provider, info.label]);

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
      <p className="text-sm text-muted">{note ?? `Tách khỏi key nhà khác. Chỉ Chủ lưu. Khách không thấy key. Key này dùng cho cửa Trả theo lượt (phòng trả tiền, trừ Token dịch).`}</p>
      <div className="flex gap-2">
        <input
          className="min-tap min-w-0 flex-1 rounded-[var(--radius-ctl)] border border-line bg-bg px-3 text-sm"
          type={show ? "text" : "password"}
          value={draft}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={tail ? "Key đã lưu. Dán key mới nếu muốn đổi" : `Key ${info.label} (${info.keyPage})`}
          onChange={(event) => setDraft(event.target.value)}
        />
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
      {withMarkup && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm">
            Phần trăm chênh {info.label} (cửa Trả theo lượt)
            <input
              className="min-tap w-32 rounded-[var(--radius-ctl)] border border-line bg-bg px-3"
              inputMode="numeric"
              value={markup}
              onChange={(event) => setMarkup(event.target.value.replace(/\D/g, ""))}
            />
          </label>
          <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line px-3 text-sm disabled:opacity-50" disabled={busy} onClick={saveMarkup}>
            Lưu phần trăm
          </button>
        </div>
      )}
    </section>
  );
}
