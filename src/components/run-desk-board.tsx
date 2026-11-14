import { useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { pushToast } from "@/components/toast";
import { getRunDesk, saveRunDesk, saveRunKey, type RunDeskView, type RunTicket } from "@/lib/admin-room";
import { ASR_MODELS, CHAT_MODELS, modelLabel } from "@/lib/sub/models";
import { listDoorHistory, searchRunTickets, type DoorChange } from "@/lib/overview-room";
import type { TicketFilter, TicketRow } from "@/lib/overview-data";
import { asrHouse } from "@/lib/sub/asr-house";
import { formatLivePrice, type GroqBoard } from "@/lib/sub/groq-board";
import { loadGroqBoard } from "@/lib/sub/groq-board-load";
import { emptyOverride, formatRoomPrice, RUN_STATUS_LABEL, type PriceOverride, type RunDesk, type RunStatus } from "@/lib/run-desk";
import { DoorDot } from "@/components/run-door";
import { maskFileName } from "@/lib/mask-file-name";

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
        <p className="text-sm font-medium">{maskFileName(ticket.fileName) || "Không tên tệp"}</p>
        <p className="shrink-0 text-xs font-semibold text-accent">{label(ticket.status)}</p>
      </div>
      <p className="text-xs text-muted">{ticket.email || "Không rõ tài khoản"} · {when}</p>
      <p className="text-sm text-muted">{minutes} · Giữ {dong(ticket.held)} · Trừ {dong(ticket.charged)}{ticket.refunded > 0 ? ` · Hoàn ${dong(ticket.refunded)}` : ""}</p>
      {children}
    </article>
  );
}

export function durationText(seconds: number | null) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))} giây`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest ? `${minutes} phút ${rest} giây` : `${minutes} phút`;
}

const TICKET_CHIPS: { id: TicketFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "dang-giu", label: "Đang giữ" },
  { id: "da-tru", label: "Đã trừ" },
  { id: "da-nha", label: "Đã nhả" },
  { id: "loi", label: "Lỗi" },
];

function TicketRowCard({ ticket }: { ticket: TicketRow }) {
  const when = ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("vi-VN") : "Chưa có giờ";
  const minutes = ticket.seconds > 0 ? `${Math.max(1, Math.round(ticket.seconds / 60))} phút tiếng` : "Chưa có thời lượng";
  const models = [ticket.asrModel, ticket.chatModel].filter(Boolean).map(modelLabel).join(" + ");
  return (
    <article className="rounded-xl border border-line px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{maskFileName(ticket.fileName) || "Không tên tệp"}</p>
        <p className="shrink-0 text-xs font-semibold text-accent">{label(ticket.status)}</p>
      </div>
      <p className="text-xs text-muted">{ticket.email || "Không rõ tài khoản"} · {when}</p>
      <p className="text-sm text-muted">{minutes} · Giữ {dong(ticket.held)} · Trừ {dong(ticket.charged)}{ticket.refunded > 0 ? ` · Hoàn ${dong(ticket.refunded)}` : ""}</p>
      <p className="text-xs text-muted">Model: {models || "—"} · Xử lý: {durationText(ticket.processSeconds)}</p>
    </article>
  );
}

/** Danh sách phiếu: lọc theo trạng thái, tìm theo email hoặc tên tệp. */
function TicketPane() {
  const [status, setStatus] = useState<TicketFilter>("all");
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<TicketRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(text.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    let gone = false;
    setLoading(true);
    void searchRunTickets({ data: { status, q: query } })
      .then((next) => {
        if (!gone) setRows(next);
      })
      .catch((error) => {
        if (!gone) pushToast(error instanceof Error && error.message ? error.message : "Chưa đọc được phiếu.", "bad");
      })
      .finally(() => {
        if (!gone) setLoading(false);
      });
    return () => {
      gone = true;
    };
  }, [status, query]);

  const filtered = status !== "all" || query !== "";
  return (
    <div className="admin-pane">
      <h3 className="text-sm font-semibold">Phiếu</h3>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo trạng thái">
        {TICKET_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            aria-pressed={status === chip.id}
            className={"min-tap rounded-full px-3 text-sm " + (status === chip.id ? "bg-accent font-semibold text-ink" : "border border-line")}
            onClick={() => setStatus(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Tìm theo email hoặc tên tệp"
        aria-label="Tìm phiếu theo email hoặc tên tệp"
        className="w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
      />
      {rows && !rows.length && (
        <div className="rounded-xl border border-dashed border-line px-3 py-3">
          <p className="text-sm font-medium">{filtered ? "Không có phiếu khớp" : "Chưa có phiếu trả theo lượt"}</p>
          <p className="mt-1 text-sm text-muted">
            {filtered ? "Thử bỏ bộ lọc hoặc đổi từ tìm." : "Phiếu xuất hiện sau lần chạy đầu tiên. Mỗi phiếu ghi tên tệp, giờ, trạng thái, số phút, model, thời gian xử lý, số đang giữ và số đã trừ."}
          </p>
        </div>
      )}
      <div className="grid max-h-96 gap-2 overflow-y-auto" aria-busy={loading}>
        {rows?.map((ticket) => (
          <TicketRowCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}

const DOOR_LABEL: Record<string, string> = { "dong-cua-luot": "Bật bảo trì", "mo-cua-luot": "Mở lại cửa", "gia-luot": "Đổi giá" };

/** Ai bật hoặc tắt bảo trì, lúc nào, đổi gì. Lấy từ nhật ký thao tác. */
function DoorHistory({ refresh }: { refresh: number }) {
  const [rows, setRows] = useState<DoorChange[]>([]);
  useEffect(() => {
    void listDoorHistory()
      .then(setRows)
      .catch(() => setRows([]));
  }, [refresh]);
  return (
    <div className="grid gap-1">
      <h4 className="text-xs font-semibold text-muted">Lịch sử bảo trì và giá</h4>
      {rows.length === 0 && <p className="text-xs text-muted">Chưa có thay đổi nào được ghi.</p>}
      <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted">
        {rows.map((row) => (
          <li key={row.id}>
            {[new Date(row.at).toLocaleString("vi-VN"), row.actorEmail || "Không rõ", DOOR_LABEL[row.action] ?? row.action, row.note].filter(Boolean).join(" · ")}
          </li>
        ))}
      </ul>
    </div>
  );
}

const PRICE_ROWS = [
  ...ASR_MODELS.filter((model) => asrHouse(model.id) === "groq").map((model) => ({ id: model.id, name: model.name, kind: "hour" as const })),
  ...CHAT_MODELS.map((model) => ({ id: model.id, name: model.name, kind: "token" as const })),
];

/**
 * Bàn trả theo lượt. part "ops" (mặc định, tab Việc): bảo trì và phiếu.
 * part "config" (tab Cấu hình, chỉ Chủ): key Groq, giá và hạn mức.
 * Mỗi lần lưu đọc lại cửa mới nhất rồi chỉ ghi phần của mình, nên hai nơi không đè nhau.
 */
export function RunDeskBoard({ owner, part = "ops" }: { owner: boolean; part?: "ops" | "config" | "key" | "price" }) {
  const [view, setView] = useState<RunDeskView | null>(null);
  const [form, setForm] = useState<RunDesk | null>(null);
  const [board, setBoard] = useState<GroqBoard | null>(null);
  const [models, setModels] = useState<string[] | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const [keyTail, setKeyTail] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doorTick, setDoorTick] = useState(0);

  useEffect(() => {
    void getRunDesk()
      .then((next) => {
        setView(next);
        setForm(next.desk);
        setModels(next.models);
        setKeyTail(next.keyTail || "");
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được bàn trả theo lượt.", "bad"));
    void loadGroqBoard()
      .then(setBoard)
      .catch(() => pushToast("Chưa lấy được giá gốc. Phần trăm và giá riêng vẫn lưu được.", "bad"));
  }, []);

  function save(patch: (latest: RunDesk) => RunDesk, done: string) {
    setBusy(true);
    void getRunDesk()
      .then((latest) => saveRunDesk({ data: patch(latest.desk) }))
      .then((desk) => {
        setForm(desk);
        setView((current) => (current ? { ...current, desk } : current));
        setDoorTick((value) => value + 1);
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
        setKeyTail(token.slice(-4));
        setAdminKey("");
        setShowKey(false);
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

  const sortedRows = [...PRICE_ROWS].sort((a, b) => Number(models?.includes(b.id) ?? false) - Number(models?.includes(a.id) ?? false));

  if (part === "config" || part === "key" || part === "price") {
    if (!owner) return null;
    const showKeyCard = part !== "price";
    const showPriceCard = part !== "key";
    return (
      <>
        {showKeyCard && (
        <section className="grid content-start gap-3 rounded-2xl border border-line bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Key Groq của phòng</h2>
            <p className="text-xs font-medium text-muted">{keyTail ? `Đã lưu · …${keyTail}` : "Chưa lưu"}</p>
          </div>
          <p className="text-sm text-muted">Khách trả theo lượt dùng đúng key này. Key chỉ nằm trên máy chủ và không hiện lại trên trang này. Nhận dạng Alibaba dùng key riêng.</p>
          <span className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={adminKey}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={keyTail ? "Key đã lưu. Dán key mới nếu muốn đổi" : "Nhập hoặc dán key"}
              aria-label="Key Groq của phòng"
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
          <button type="button" disabled={busy} className="min-tap w-fit rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40" onClick={syncKey}>
            Lưu key
          </button>
          <p className="text-xs text-muted">{models ? `Key gọi được ${models.length} model.` : "Chưa đồng bộ danh sách model."}</p>
        </section>
        )}

        {showPriceCard && (
        <section className="admin-wide grid content-start gap-3 rounded-2xl border border-line bg-card p-4">
          <h2 className="font-semibold">Giá và hạn mức</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Tăng thêm trên giá gốc (%)
              <input
                inputMode="numeric"
                value={form?.markup ?? 0}
                onChange={(event) => setForm((current) => (current ? { ...current, markup: Number(event.target.value.replace(/\D/g, "") || 0) } : current))}
                className="rounded-xl border border-line bg-raised px-3 py-3 outline-none"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Hạn mức mỗi khách mỗi ngày (đ, 0 là chưa đặt)
              <input
                inputMode="numeric"
                value={form?.cap ?? 0}
                onChange={(event) => setForm((current) => (current ? { ...current, cap: Number(event.target.value.replace(/\D/g, "") || 0) } : current))}
                className="rounded-xl border border-line bg-raised px-3 py-3 outline-none"
              />
            </label>
          </div>
          <details className="rounded-xl border border-line">
            <summary className="min-tap flex cursor-pointer items-center px-3 text-sm font-semibold">Giá riêng từng model ({PRICE_ROWS.length})</summary>
            <div className="grid gap-2 p-2">
              {sortedRows.map((model) => {
                const row = board?.rows.find((item) => item.id === model.id);
                const custom = form?.custom[model.id] ?? emptyOverride();
                const base = row && board ? formatLivePrice(row, board.rate) : "Chưa có giá gốc";
                const shown = row && board && form ? formatRoomPrice(row, board.rate, form.markup, custom) : "Chưa có giá gốc";
                const usable = models ? models.includes(model.id) : null;
                return (
                  <div key={model.id} className="grid gap-1 rounded-xl bg-raised px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{model.name}</p>
                      <p className={"shrink-0 text-xs " + (usable ? "text-ok" : "text-muted")}>{usable == null ? "Chưa đồng bộ" : usable ? "Key dùng được" : "Key không dùng được"}</p>
                    </div>
                    <p className="text-xs text-muted">Giá gốc: {base}</p>
                    <p className="text-xs text-muted">Khách thấy: {shown}</p>
                    {model.kind === "hour" ? (
                      <input
                        inputMode="numeric"
                        value={custom.hour || ""}
                        placeholder="Giá riêng, đồng mỗi giờ. Để trống thì dùng phần trăm"
                        onChange={(event) => setCustom(model.id, { hour: Number(event.target.value.replace(/\D/g, "") || 0) })}
                        className="rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none"
                      />
                    ) : (
                      <div className="grid min-w-0 grid-cols-2 gap-2">
                        <input
                          inputMode="numeric"
                          value={custom.inn || ""}
                          placeholder="Vào, đồng / triệu token"
                          onChange={(event) => setCustom(model.id, { inn: Number(event.target.value.replace(/\D/g, "") || 0) })}
                          className="rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none"
                        />
                        <input
                          inputMode="numeric"
                          value={custom.out || ""}
                          placeholder="Ra, đồng / triệu token"
                          onChange={(event) => setCustom(model.id, { out: Number(event.target.value.replace(/\D/g, "") || 0) })}
                          className="rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
          <p className="text-xs text-muted">Giá gốc chỉ hiện ở đây, khách không thấy. Giá Alibaba đặt ở mục Gói dịch.</p>
          {form && (
            <button
              type="button"
              disabled={busy}
              className="min-tap w-fit rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40"
              onClick={() => save((latest) => ({ ...latest, markup: form.markup, cap: form.cap, custom: form.custom }), "Đã cập nhật giá.")}
            >
              Cập nhật giá
            </button>
          )}
        </section>
        )}
      </>
    );
  }

  return (
    <section className="admin-wide space-y-3 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Trả theo lượt</h2>
        <p className="flex items-center gap-2 text-xs font-medium text-muted">
          <DoorDot open={!form?.maintenance} />
          {form?.maintenance ? "Đang bảo trì" : "Đang mở"}
        </p>
      </div>
      <p className="text-sm text-muted">Cửa mặc định mở. Muốn báo bảo trì thì nhập nội dung rồi lưu. Key, giá và hạn mức nằm ở tab Cấu hình.</p>
      {owner && (
      <div className="grid grid-cols-3 gap-2">
        <p className="rounded-xl border border-line px-3 py-2 text-sm">Đang giữ<br />{dong(view?.holding ?? 0)}</p>
        <p className="rounded-xl border border-line px-3 py-2 text-sm">Đã trừ hôm nay<br />{dong(view?.charged ?? 0)}</p>
        <p className="rounded-xl border border-line px-3 py-2 text-sm">Phiếu lỗi<br />{view?.errors ?? 0}</p>
      </div>
      )}

      <div className="admin-flow">
        <div className="admin-pane rounded-xl border border-line p-3">
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
              <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-4 text-sm disabled:opacity-40" onClick={() => save((latest) => ({ ...latest, maintenance: true, note: form.note }), "Đã bật bảo trì.")}>
                Lưu và báo bảo trì
              </button>
              <button type="button" disabled={busy} className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40" onClick={() => save((latest) => ({ ...latest, maintenance: false, note: form.note }), "Đã mở lại cửa.")}>
                Mở lại cửa
              </button>
            </div>
          )}
          <DoorHistory refresh={doorTick} />
        </div>

        <TicketPane />
      </div>
    </section>
  );
}
