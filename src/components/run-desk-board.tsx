import { useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { pushToast } from "@/components/toast";
import { getRunDesk, saveRunDesk, saveRunKey, type RunDeskView, type RunTicket } from "@/lib/admin-room";
import { ASR_MODELS, CHAT_MODELS } from "@/lib/sub/models";
import { formatLivePrice, type GroqBoard } from "@/lib/sub/groq-board";
import { loadGroqBoard } from "@/lib/sub/groq-board-load";
import { emptyOverride, formatRoomPrice, RUN_STATUS_LABEL, type PriceOverride, type RunDesk, type RunStatus } from "@/lib/run-desk";
import { DoorDot } from "@/components/run-door";

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

function label(status: string) {
  return status in RUN_STATUS_LABEL ? RUN_STATUS_LABEL[status as RunStatus] : status;
}

export function ticketLine(ticket: RunTicket) {
  const minutes = ticket.seconds > 0 ? `${Math.max(1, Math.round(ticket.seconds / 60))} phút` : "Chưa có thời lượng";
  const when = ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("vi-VN") : "";
  return `${when} · ${minutes} · giữ ${dong(ticket.held)} · trừ ${dong(ticket.charged)} · ${label(ticket.status)}`;
}

export function TicketCard({ ticket, children }: { ticket: RunTicket; children?: ReactNode }) {
  const when = ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("vi-VN") : "Chưa có giờ";
  const minutes = ticket.seconds > 0 ? `${Math.max(1, Math.round(ticket.seconds / 60))} phút tiếng` : "Chưa có thời lượng";
  return (
    <article className="rounded-xl border border-line px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{ticket.fileName || "Không tên tệp"}</p>
        <p className="shrink-0 text-xs font-semibold text-accent">{label(ticket.status)}</p>
      </div>
      <p className="text-xs text-muted">{ticket.email || "Không rõ tài khoản"} · {when}</p>
      <p className="text-sm text-muted">{minutes} · Giữ {dong(ticket.held)} · Trừ {dong(ticket.charged)}{ticket.refunded > 0 ? ` · Hoàn ${dong(ticket.refunded)}` : ""}</p>
      {children}
    </article>
  );
}

const PRICE_ROWS = [
  ...ASR_MODELS.map((model) => ({ id: model.id, name: model.name, kind: "hour" as const })),
  ...CHAT_MODELS.map((model) => ({ id: model.id, name: model.name, kind: "token" as const })),
];

export function RunDeskBoard({ owner }: { owner: boolean }) {
  const [view, setView] = useState<RunDeskView | null>(null);
  const [form, setForm] = useState<RunDesk | null>(null);
  const [board, setBoard] = useState<GroqBoard | null>(null);
  const [models, setModels] = useState<string[] | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [priceOpen, setPriceOpen] = useState(true);

  useEffect(() => {
    void getRunDesk()
      .then((next) => {
        setView(next);
        setForm(next.desk);
        setModels(next.models);
        setAdminKey(next.key || "");
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được bàn trả theo lượt.", "bad"));
    void loadGroqBoard()
      .then(setBoard)
      .catch(() => pushToast("Chưa lấy được giá gốc. Phần trăm và giá riêng vẫn lưu được.", "bad"));
  }, []);

  function save(next: RunDesk, done: string) {
    setBusy(true);
    void saveRunDesk({ data: next })
      .then((desk) => {
        setForm(desk);
        setView((current) => (current ? { ...current, desk } : current));
        pushToast(done);
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được.", "bad"))
      .finally(() => setBusy(false));
  }

  function syncKey() {
    const token = adminKey.trim();
    if (!token) {
      pushToast("Hãy nhập hoặc dán key, rồi đồng bộ.", "bad");
      return;
    }
    setBusy(true);
    void saveRunKey({ data: token })
      .then((ids) => {
        setModels(ids);
        pushToast(`Đã lưu key. Key này gọi được ${ids.length} model. Khách chọn trả theo lượt sẽ dùng đúng key này.`);
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đồng bộ được key.", "bad"))
      .finally(() => setBusy(false));
  }

  async function pasteKey() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        pushToast("Bộ nhớ tạm không có nội dung để dán.", "bad");
        return;
      }
      setAdminKey(text);
    } catch {
      pushToast("Chưa dán được. Hãy cho phép dán, hoặc nhập tay.", "bad");
    }
  }

  function setCustom(id: string, patch: Partial<PriceOverride>) {
    setForm((current) => {
      if (!current) return current;
      const prev = current.custom[id] ?? emptyOverride();
      return { ...current, custom: { ...current.custom, [id]: { ...prev, ...patch } } };
    });
  }

  return (
    <section className="grid gap-3 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Trả theo lượt</h2>
        <p className="flex items-center gap-2 text-xs font-medium text-muted">
          <DoorDot open={!form?.maintenance} />
          {form?.maintenance ? "Đang bảo trì" : "Đang mở"}
        </p>
      </div>
      <p className="text-sm text-muted">Cửa mặc định mở. Muốn báo bảo trì thì nhập nội dung rồi lưu. Giá gốc chỉ để tính ở trang này, không hiện khi khách dùng key của họ.</p>
      <div className="grid grid-cols-3 gap-2">
        <p className="rounded-xl border border-line px-3 py-2 text-sm">Đang giữ<br />{dong(view?.holding ?? 0)}</p>
        <p className="rounded-xl border border-line px-3 py-2 text-sm">Đã trừ hôm nay<br />{dong(view?.charged ?? 0)}</p>
        <p className="rounded-xl border border-line px-3 py-2 text-sm">Phiếu lỗi<br />{view?.errors ?? 0}</p>
      </div>

      <div className="grid gap-2 rounded-xl border border-line p-3">
        <h3 className="text-sm font-semibold">Bảo trì</h3>
        <textarea
          disabled={!owner}
          rows={2}
          value={form?.note ?? ""}
          placeholder="Nội dung khách thấy khi tạm ngưng"
          onChange={(event) => setForm((current) => (current ? { ...current, note: event.target.value } : current))}
          className="rounded-xl border border-line bg-raised px-3 py-2 outline-none disabled:opacity-60"
        />
        {owner && form && (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-4 text-sm disabled:opacity-40" onClick={() => save({ ...form, maintenance: true }, "Đã bật bảo trì.")}>
              Lưu và báo bảo trì
            </button>
            <button type="button" disabled={busy} className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40" onClick={() => save({ ...form, maintenance: false }, "Đã mở lại cửa.")}>
              Mở lại cửa
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-2 rounded-xl border border-line p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Giá biểu</h3>
          <button type="button" className="min-tap rounded-full border border-line px-3 text-sm" onClick={() => setPriceOpen((open) => !open)}>
            {priceOpen ? "Ẩn giá biểu" : "Hiện giá biểu"}
          </button>
        </div>
        {priceOpen && (
          <>
        <label className="grid gap-1 text-sm">
          Tăng thêm trên giá gốc, phần trăm
          <input
            inputMode="numeric"
            disabled={!owner}
            value={form?.markup ?? 0}
            onChange={(event) => setForm((current) => (current ? { ...current, markup: Number(event.target.value.replace(/\D/g, "") || 0) } : current))}
            className="rounded-xl border border-line bg-raised px-3 py-3 outline-none disabled:opacity-60"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Hạn mức một khách mỗi ngày, đồng. Để 0 nếu chưa đặt
          <input
            inputMode="numeric"
            disabled={!owner}
            value={form?.cap ?? 0}
            onChange={(event) => setForm((current) => (current ? { ...current, cap: Number(event.target.value.replace(/\D/g, "") || 0) } : current))}
            className="rounded-xl border border-line bg-raised px-3 py-3 outline-none disabled:opacity-60"
          />
        </label>
        <p className="text-xs text-muted">Giá gốc chỉ hiện ở đây. Khách không thấy.</p>
        {owner && (
          <label className="grid gap-1 text-sm">
            Key Groq để đồng bộ
            <span className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                value={adminKey}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder={form && adminKey ? "Key đã lưu. Gõ key khác nếu muốn đổi" : "Nhập hoặc dán key. Bấm lưu thì key được giữ trên máy chủ"}
                onChange={(event) => setAdminKey(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-line bg-raised px-3 py-3 outline-none"
              />
              <button type="button" className="min-tap rounded-full border border-line px-3 text-sm" onClick={() => void pasteKey()}>
                Dán
              </button>
              <button type="button" className="min-tap rounded-full border border-line px-3" aria-label={showKey ? "Ẩn key" : "Hiện key"} onClick={() => setShowKey((value) => !value)}>
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>
        )}
        {owner && (
          <button type="button" disabled={busy} className="min-tap w-fit rounded-full border border-line px-4 text-sm disabled:opacity-40" onClick={syncKey}>
            Lưu key
          </button>
        )}
        <p className="text-xs text-muted">{adminKey ? "Key này còn sau khi tải lại trang. Chỉ Chủ thấy key." : "Chưa lưu key."}</p>
        <div className="grid gap-2">
          {PRICE_ROWS.map((model) => {
            const row = board?.rows.find((item) => item.id === model.id);
            const custom = form?.custom[model.id] ?? emptyOverride();
            const base = row && board ? formatLivePrice(row, board.rate) : "Chưa có giá gốc";
            const shown = row && board && form ? formatRoomPrice(row, board.rate, form.markup, custom) : "Chưa có giá gốc";
            const usable = models ? models.includes(model.id) : null;
            return (
              <div key={model.id} className="grid gap-1 rounded-xl bg-raised px-3 py-2">
                <p className="text-sm font-medium">{model.name}</p>
                <p className="text-xs text-muted">Giá gốc: {base}</p>
                <p className="text-xs text-muted">Khách trả theo lượt sẽ thấy: {shown}</p>
                <p className="text-xs text-muted">{usable == null ? "Key: chưa đồng bộ" : usable ? "Key dùng được" : "Key không dùng được"}</p>
                {model.kind === "hour" ? (
                  <input
                    inputMode="numeric"
                    disabled={!owner}
                    value={custom.hour || ""}
                    placeholder="Giá riêng, đồng mỗi giờ. Để trống thì dùng phần trăm"
                    onChange={(event) => setCustom(model.id, { hour: Number(event.target.value.replace(/\D/g, "") || 0) })}
                    className="rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none disabled:opacity-60"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      inputMode="numeric"
                      disabled={!owner}
                      value={custom.inn || ""}
                      placeholder="Vào, đồng / triệu token"
                      onChange={(event) => setCustom(model.id, { inn: Number(event.target.value.replace(/\D/g, "") || 0) })}
                      className="rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none disabled:opacity-60"
                    />
                    <input
                      inputMode="numeric"
                      disabled={!owner}
                      value={custom.out || ""}
                      placeholder="Ra, đồng / triệu token"
                      onChange={(event) => setCustom(model.id, { out: Number(event.target.value.replace(/\D/g, "") || 0) })}
                      className="rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none disabled:opacity-60"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {owner && form && (
          <button type="button" disabled={busy} className="min-tap w-fit rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40" onClick={() => save(form, "Đã cập nhật giá.")}>
            Cập nhật giá
          </button>
        )}
          </>
        )}
      </div>

      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Phiếu gần đây</h3>
        {!view?.recent.length && (
          <div className="rounded-xl border border-dashed border-line px-3 py-3">
            <p className="text-sm font-medium">Chưa có phiếu trả theo lượt</p>
            <p className="mt-1 text-sm text-muted">Phiếu xuất hiện sau lần chạy đầu tiên. Mỗi phiếu ghi tên tệp, giờ, trạng thái, số phút, số đang giữ và số đã trừ.</p>
          </div>
        )}
        <div className="grid max-h-80 gap-2 overflow-y-auto">
          {view?.recent.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </div>
    </section>
  );
}
