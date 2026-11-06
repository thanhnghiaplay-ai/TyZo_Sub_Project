import { useEffect, useState } from "react";
import { getRunDesk, saveRunDesk, type RunDeskView, type RunTicket } from "@/lib/admin-room";
import { RUN_STATUS_LABEL, type RunDesk, type RunStatus } from "@/lib/run-desk";

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

function label(status: string) {
  return status in RUN_STATUS_LABEL ? RUN_STATUS_LABEL[status as RunStatus] : status;
}

export function ticketLine(ticket: RunTicket) {
  const minutes = ticket.seconds > 0 ? `${Math.round(ticket.seconds / 60)} phút` : "0 phút";
  return `${ticket.fileName || "Không tên"} · ${minutes} · giữ ${dong(ticket.held)} · trừ ${dong(ticket.charged)} · ${label(ticket.status)}`;
}

export function RunDeskBoard({ owner }: { owner: boolean }) {
  const [view, setView] = useState<RunDeskView | null>(null);
  const [form, setForm] = useState<RunDesk | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getRunDesk()
      .then((next) => {
        setView(next);
        setForm(next.desk);
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Chưa đọc được bàn trả theo lượt."));
  }, []);

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setNotice(null);
    void saveRunDesk({ data: form })
      .then((desk) => {
        setForm(desk);
        setView((current) => (current ? { ...current, desk } : current));
        setNotice("Đã lưu. Trang khách đổi theo trạng thái cửa.");
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Chưa lưu được."))
      .finally(() => setBusy(false));
  }

  return (
    <form className="grid gap-3 rounded-2xl border border-line bg-card p-4" onSubmit={save}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Trả theo lượt</h2>
        <p className="text-xs font-medium text-muted">{form?.open ? "Đã lưu là mở" : "Đang đóng"}</p>
      </div>
      <p className="text-sm text-muted">Đóng thì trang khách chỉ hiện câu tạm ngưng và vẫn dùng key của họ. Mở thì khung trả theo lượt hiện để xem bố cục. Lần chạy chưa trừ ví.</p>
      <div className="grid grid-cols-3 gap-2">
        <p className="rounded-xl border border-line px-3 py-2 text-sm">Đang giữ<br />{dong(view?.holding ?? 0)}</p>
        <p className="rounded-xl border border-line px-3 py-2 text-sm">Đã trừ hôm nay<br />{dong(view?.charged ?? 0)}</p>
        <p className="rounded-xl border border-line px-3 py-2 text-sm">Phiếu lỗi<br />{view?.errors ?? 0}</p>
      </div>
      <label className="grid gap-1 text-sm">
        Đơn giá Turbo, đồng mỗi phút
        <input
          inputMode="numeric"
          disabled={!owner}
          value={form?.turbo ?? ""}
          onChange={(event) => setForm((current) => (current ? { ...current, turbo: Number(event.target.value.replace(/\D/g, "") || 0) } : current))}
          className="rounded-xl border border-line bg-raised px-3 py-3 outline-none disabled:opacity-60"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Đơn giá Large, đồng mỗi phút
        <input
          inputMode="numeric"
          disabled={!owner}
          value={form?.large ?? ""}
          onChange={(event) => setForm((current) => (current ? { ...current, large: Number(event.target.value.replace(/\D/g, "") || 0) } : current))}
          className="rounded-xl border border-line bg-raised px-3 py-3 outline-none disabled:opacity-60"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Hạn mức một khách mỗi ngày, đồng. Để 0 nếu chưa đặt
        <input
          inputMode="numeric"
          disabled={!owner}
          value={form?.cap ?? ""}
          onChange={(event) => setForm((current) => (current ? { ...current, cap: Number(event.target.value.replace(/\D/g, "") || 0) } : current))}
          className="rounded-xl border border-line bg-raised px-3 py-3 outline-none disabled:opacity-60"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Câu khách thấy khi cửa đóng
        <textarea
          disabled={!owner}
          rows={2}
          value={form?.note ?? ""}
          onChange={(event) => setForm((current) => (current ? { ...current, note: event.target.value } : current))}
          className="rounded-xl border border-line bg-raised px-3 py-2 outline-none disabled:opacity-60"
        />
      </label>
      <label className="flex min-tap items-center gap-2 text-sm">
        <input
          type="checkbox"
          disabled={!owner}
          checked={Boolean(form?.open)}
          onChange={(event) => setForm((current) => (current ? { ...current, open: event.target.checked } : current))}
        />
        Lưu trạng thái: mở cửa trên trang khách
      </label>
      {owner && (
        <button type="submit" disabled={busy || !form} className="min-tap w-fit rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40">
          Lưu cửa trả theo lượt
        </button>
      )}
      {notice && <p className="text-sm text-muted">{notice}</p>}
      <div>
        <h3 className="text-sm font-semibold">Phiếu gần đây</h3>
        {!view?.recent.length && <p className="text-sm text-muted">Chưa có phiếu. Khách chưa chạy cửa này.</p>}
        <ul className="mt-1 space-y-1 text-sm text-muted">
          {view?.recent.map((ticket) => (
            <li key={ticket.id}>
              {ticket.email || ticket.userId} · {ticketLine(ticket)}
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
