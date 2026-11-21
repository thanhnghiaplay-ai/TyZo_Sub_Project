import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import { askConfirm } from "@/lib/confirm";
import { clientKeyPlaceholder, PROVIDER_IDS, PROVIDERS, providerDoes, type ProviderId } from "@/lib/sub/provider";

const FIELD =
  "min-tap w-full rounded-[var(--radius-ctl)] border border-line bg-bg px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent";
const BTN = "min-tap inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-3 text-sm font-medium hover:border-accent focus-visible:ring-2 focus-visible:ring-accent";

export type KeyCheck = { phase: "idle" | "checking" | "ok" | "warn" | "bad"; text: string };

/**
 * «Key AI của bạn» (đợt 2 sắp lại trang khách): danh sách key đã thêm, mỗi key ghi nhà, việc nhà làm được, trạng thái,
 * nút Sửa và Xóa; nút «Thêm key» → chọn nhà → dán. Danh sách nhà lấy từ bảng PROVIDERS: nhà mới tự hiện, không viết tay.
 * Key chỉ lưu trên máy khách (giá trị và lưu/xóa do nơi gọi lo).
 */
export function KeyRing({
  values,
  check,
  onChange,
}: {
  values: Partial<Record<ProviderId, string>>;
  check: (id: ProviderId) => KeyCheck;
  onChange: (id: ProviderId, value: string) => void;
}) {
  const [editing, setEditing] = useState<ProviderId | null>(null);
  /** Nhà đang được thêm: giữ ở khối riêng tới khi bấm Xong, để ô nhập không nhảy chỗ (mất con trỏ) khi vừa gõ ký tự đầu. */
  const [pending, setPending] = useState<ProviderId | null>(null);
  const [adding, setAdding] = useState(false);
  const [show, setShow] = useState(false);
  // Hàng đang sửa vẫn giữ dù ô tạm trống (khách xóa để dán lại), không biến mất giữa lúc gõ.
  const added = PROVIDER_IDS.filter((id) => id !== pending && ((values[id] ?? "").trim() || id === editing));
  const free = PROVIDER_IDS.filter((id) => !added.includes(id) && id !== pending);

  const remove = async (id: ProviderId) => {
    const ok = await askConfirm({
      title: `Xóa key ${PROVIDERS[id].label}?`,
      text: "Key bị xóa khỏi máy này. Muốn dùng lại thì phải dán lại.",
      confirmLabel: "Xóa key",
      danger: true,
    });
    if (!ok) return;
    onChange(id, "");
    if (editing === id) setEditing(null);
  };

  const paste = async (id: ProviderId) => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) onChange(id, text);
    } catch {
      /* trình duyệt không cho đọc bộ nhớ tạm: khách dán bằng tay */
    }
  };

  const editor = (id: ProviderId) => (
    <div className="grid gap-1.5 pt-2">
      <label className="grid gap-1 text-sm text-muted" htmlFor={id === "groq" ? "key" : `key-${id}`}>
        {id === "groq" ? "Groq API key" : `Key ${PROVIDERS[id].label}`}
        <span className="flex gap-2">
          <input
            id={id === "groq" ? "key" : `key-${id}`}
            className={FIELD}
            type={show ? "text" : "password"}
            placeholder={clientKeyPlaceholder(id)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={values[id] ?? ""}
            onChange={(event) => onChange(id, event.target.value)}
          />
          <button type="button" className={BTN + " shrink-0 px-2.5"} aria-label="Dán key" title="Dán key" onClick={() => void paste(id)}>
            <Icon slot="ui.paste" />
          </button>
          <button type="button" className={BTN + " shrink-0 px-2.5"} aria-label={show ? "Ẩn key" : "Hiện key"} title={show ? "Ẩn key" : "Hiện key"} onClick={() => setShow((v) => !v)}>
            {show ? <Icon slot="ui.hide" /> : <Icon slot="ui.eye" />}
          </button>
        </span>
      </label>
      <span className="text-xs text-muted">
        Lấy key ở {PROVIDERS[id].keyPage}. Chỉ lưu trên máy này.{" "}
        <Link to="/huong-dan" hash="key-groq" className="underline">Cách lấy key</Link>
      </span>
    </div>
  );

  return (
    <div className="grid gap-2" data-key-ring data-tour="key-input">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Key AI của bạn</span>
        {free.length > 0 && !adding && !pending && (
          <button type="button" className={BTN + " border-accent text-accent"} onClick={() => { setAdding(true); setEditing(null); setPending(null); }}>
            <Icon slot="act.add" className="size-4" />
            Thêm key
          </button>
        )}
      </div>

      {added.length === 0 && !adding && !pending && (
        <p className="rounded-[var(--radius-ctl)] border border-dashed border-line px-3 py-2 text-sm text-muted">
          Chưa có key nào. Bấm «Thêm key», chọn nhà (Groq, Alibaba…) rồi dán key. Không có key thì trả theo lượt bằng Token dịch.
        </p>
      )}

      {added.map((id) => {
        const state = check(id);
        return (
          <div key={id} data-key-row={id} className="rounded-[var(--radius-ctl)] border border-line bg-bg px-3 py-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{PROVIDERS[id].label}</p>
                <p className="text-xs text-muted">{providerDoes(id)}</p>
                <p
                  role="status"
                  className={
                    "mt-0.5 flex items-start gap-1 text-xs " +
                    (state.phase === "ok" ? "text-success" : state.phase === "bad" ? "text-danger" : state.phase === "warn" ? "text-warning" : "text-muted")
                  }
                >
                  {state.phase === "checking" && <Icon slot="ui.busy" className="mt-0.5 size-3.5 shrink-0 animate-spin" />}
                  {state.phase === "ok" && <Icon slot="st.ok" className="mt-0.5 size-3.5 shrink-0" />}
                  {state.phase === "warn" && <Icon slot="st.warn" className="mt-0.5 size-3.5 shrink-0" />}
                  {state.phase === "bad" && <Icon slot="st.error" className="mt-0.5 size-3.5 shrink-0" />}
                  <span>{state.text}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className={BTN} aria-expanded={editing === id} onClick={() => { setEditing(editing === id ? null : id); setAdding(false); setPending(null); }}>
                  {editing === id ? "Xong" : "Sửa"}
                </button>
                <button type="button" className={BTN + " text-danger"} aria-label={`Xóa key ${PROVIDERS[id].label}`} onClick={() => void remove(id)}>
                  <Icon slot="act.delete" className="size-4" />
                </button>
              </div>
            </div>
            {editing === id && editor(id)}
          </div>
        );
      })}

      {adding && (
        <div className="grid gap-2 rounded-[var(--radius-ctl)] border border-accent px-3 py-2" data-key-add>
          <p className="text-sm font-semibold">Thêm key của nhà nào?</p>
          <div className="grid gap-2">
            {free.map((id) => (
              <button
                key={id}
                type="button"
                className="min-tap grid gap-0.5 rounded-[var(--radius-ctl)] border border-line bg-bg px-3 py-2 text-left hover:border-accent"
                onClick={() => { setAdding(false); setEditing(null); setPending(id); }}
              >
                <span className="text-sm font-semibold">{PROVIDERS[id].label}</span>
                <span className="text-xs text-muted">{providerDoes(id)}</span>
              </button>
            ))}
          </div>
          <button type="button" className={BTN + " w-fit"} onClick={() => setAdding(false)}>Hủy</button>
        </div>
      )}

      {pending && (
        <div className="rounded-[var(--radius-ctl)] border border-accent px-3 py-2" data-key-row={pending} data-key-pending>
          <p className="text-sm font-semibold">{PROVIDERS[pending].label}</p>
          <p className="text-xs text-muted">{providerDoes(pending)}</p>
          {editor(pending)}
          <div className="flex gap-2 pt-2">
            <button type="button" className={BTN + " border-accent text-accent"} disabled={!(values[pending] ?? "").trim()} onClick={() => setPending(null)}>
              Xong
            </button>
            <button type="button" className={BTN} onClick={() => { onChange(pending, ""); setPending(null); }}>Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
}
