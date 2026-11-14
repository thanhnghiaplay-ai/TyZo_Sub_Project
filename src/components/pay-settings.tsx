import { useEffect, useState } from "react";
import { DoorDot } from "@/components/run-door";
import { ConfirmDialog } from "@/components/confirm-code";
import { pushToast } from "@/components/toast";
import {
  cancelPayOrder,
  confirmPayOrder,
  getPaySettings,
  listPayOrders,
  savePaySettings,
  setPayGate,
  type PayClaim,
  type PaySettingsView,
} from "@/lib/pay-store";

const BLANK: PaySettingsView = {
  sepay: false,
  casso: false,
  sepayOn: true,
  cassoOn: true,
  sepayBank: "",
  sepayAccount: "",
  sepayName: "",
  sepayKeySet: false,
  cassoBank: "",
  cassoAccount: "",
  cassoName: "",
  cassoTokenSet: false,
  cassoKeySet: false,
};

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

function statusLabel(status: string) {
  if (status === "paid") return "Đã cộng tiền";
  if (status === "claimed") return "Khách báo đã chuyển";
  if (status === "cancelled") return "Đã từ chối";
  if (status === "void") return "Khách hủy";
  if (status === "expired") return "Hết hạn";
  return "Chờ chuyển khoản";
}

export function PayQueue({ owner = false }: { owner?: boolean }) {
  const [rows, setRows] = useState<PayClaim[]>([]);
  const [busy, setBusy] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  function load() {
    void listPayOrders()
      .then(setRows)
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được đơn nạp.", "bad"));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="grid gap-2 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Đơn nạp</h2>
        <button type="button" className="text-sm text-muted underline" onClick={load}>
          Tải lại
        </button>
      </div>
      <p className="text-sm text-muted">Khách bấm «Tôi đã chuyển khoản» thì đơn chuyển sang chờ kiểm tra. Webhook lỗi thì Chủ bấm xác nhận để cộng tiền tay. Quản lý chỉ xem và hủy.</p>
      {rows.length === 0 && <p className="text-sm text-muted">Chưa có đơn nạp.</p>}
      <ul className="grid max-h-80 gap-2 overflow-y-auto">
        {rows.map((row) => (
          <li key={row.id} data-pay-code={row.code} className="rounded-xl border border-line px-3 py-2 text-sm">
            <p className="font-medium">{row.email || "Không rõ email"}</p>
            <p className="text-muted">
              {row.provider} · {dong(row.amount)} · {row.code}
            </p>
            <p className="text-muted">
              {statusLabel(row.status)} · {row.createdAt ? new Date(row.createdAt).toLocaleString("vi-VN") : ""}
            </p>
            {(row.status === "pending" || row.status === "claimed") && (
              <div className="mt-2 flex flex-wrap gap-2">
                {owner && (
                <button
                  type="button"
                  disabled={busy}
                  className="min-tap rounded-full bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-40"
                  onClick={() => {
                    setBusy(true);
                    void confirmPayOrder({ data: row.id })
                      .then(() => {
                        pushToast("Đã cộng tiền vào số dư.");
                        load();
                      })
                      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa xác nhận được.", "bad"))
                      .finally(() => setBusy(false));
                  }}
                >
                  Xác nhận đã nhận tiền
                </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  className="min-tap rounded-full border border-danger px-3 text-sm text-danger disabled:opacity-40"
                  onClick={() => setCancelId(row.id)}
                >
                  Hủy xác nhận
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={cancelId != null}
        title="Hủy xác nhận"
        message="Hủy xác nhận đơn này? Dùng khi khách báo giả hoặc lợi dụng, không cộng tiền."
        confirmLabel="Hủy xác nhận"
        danger
        onCancel={() => setCancelId(null)}
        onConfirm={() => {
          const id = cancelId;
          setCancelId(null);
          if (!id) return;
          setBusy(true);
          void cancelPayOrder({ data: id })
            .then(() => {
              pushToast("Đã hủy xác nhận, không cộng tiền.");
              load();
            })
            .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa hủy được.", "bad"))
            .finally(() => setBusy(false));
        }}
      />
    </section>
  );
}

export function PaySettings() {
  const [view, setView] = useState<PaySettingsView>(BLANK);
  const [sepayKey, setSepayKey] = useState("");
  const [cassoToken, setCassoToken] = useState("");
  const [cassoKey, setCassoKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    void getPaySettings()
      .then(setView)
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được cấu hình.", "bad"));
  }, []);

  function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    void savePaySettings({
      data: {
        sepay_key: sepayKey,
        sepay_bank: view.sepayBank,
        sepay_account: view.sepayAccount,
        sepay_name: view.sepayName,
        casso_token: cassoToken,
        casso_key: cassoKey,
        casso_bank: view.cassoBank,
        casso_account: view.cassoAccount,
        casso_name: view.cassoName,
      },
    })
      .then((next) => {
        setView(next);
        setSepayKey("");
        setCassoToken("");
        setCassoKey("");
        pushToast("Đã lưu cổng nạp.");
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được.", "bad"))
      .finally(() => setBusy(false));
  }

  function gate(provider: "sepay" | "casso", on: boolean, clear = false) {
    setBusy(true);
    void setPayGate({ data: { provider, on, clear } })
      .then((next) => {
        setView(next);
        pushToast(clear ? "Đã xóa cổng." : on ? "Đã bật cổng." : "Đã tắt cổng.");
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đổi được cổng.", "bad"))
      .finally(() => setBusy(false));
  }

  return (
    <form className="space-y-3" onSubmit={save}>
      <p className="text-sm text-muted">
        Để trống ô khóa thì giữ khóa cũ. Tắt cổng thì khách không tạo được đơn của cổng đó. Webhook Sepay: {origin}/api/pay/sepay. Webhook Casso: {origin}/api/pay/casso.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
      <fieldset className="grid content-start gap-2">
        <legend className="flex items-center gap-2 font-medium">
          <DoorDot open={view.sepay} />
          Sepay {view.sepay ? "· đang mở" : view.sepayOn ? "· thiếu thông tin" : "· đang tắt"}
        </legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-3 text-sm disabled:opacity-40" onClick={() => gate("sepay", !view.sepayOn)}>
            {view.sepayOn ? "Tắt Sepay" : "Bật Sepay"}
          </button>
          <button type="button" disabled={busy} className="min-tap rounded-full border border-danger px-3 text-sm text-danger disabled:opacity-40" onClick={() => gate("sepay", false, true)}>
            Xóa Sepay
          </button>
        </div>
        <input value={view.sepayBank} onChange={(event) => setView({ ...view, sepayBank: event.target.value })} placeholder="Ngân hàng, ví dụ MBBank" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <input value={view.sepayAccount} onChange={(event) => setView({ ...view, sepayAccount: event.target.value })} placeholder="Số tài khoản" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <input value={view.sepayName} onChange={(event) => setView({ ...view, sepayName: event.target.value })} placeholder="Tên chủ tài khoản" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <input value={sepayKey} onChange={(event) => setSepayKey(event.target.value)} placeholder={view.sepayKeySet ? "API key webhook đã lưu, gõ để đổi" : "API key webhook Sepay"} className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      </fieldset>
      <fieldset className="grid content-start gap-2">
        <legend className="flex items-center gap-2 font-medium">
          <DoorDot open={view.casso} />
          Casso {view.casso ? "· đang mở" : view.cassoOn ? "· thiếu thông tin" : "· đang tắt"}
        </legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-3 text-sm disabled:opacity-40" onClick={() => gate("casso", !view.cassoOn)}>
            {view.cassoOn ? "Tắt Casso" : "Bật Casso"}
          </button>
          <button type="button" disabled={busy} className="min-tap rounded-full border border-danger px-3 text-sm text-danger disabled:opacity-40" onClick={() => gate("casso", false, true)}>
            Xóa Casso
          </button>
        </div>
        <input value={view.cassoBank} onChange={(event) => setView({ ...view, cassoBank: event.target.value })} placeholder="Ngân hàng, ví dụ MBBank" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <input value={view.cassoAccount} onChange={(event) => setView({ ...view, cassoAccount: event.target.value })} placeholder="Số tài khoản" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <input value={view.cassoName} onChange={(event) => setView({ ...view, cassoName: event.target.value })} placeholder="Tên chủ tài khoản" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <input value={cassoToken} onChange={(event) => setCassoToken(event.target.value)} placeholder={view.cassoTokenSet ? "Secure token đã lưu, gõ để đổi" : "Secure token webhook Casso"} className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <input value={cassoKey} onChange={(event) => setCassoKey(event.target.value)} placeholder={view.cassoKeySet ? "API key đã lưu, gõ để đổi" : "API key Casso, để kiểm tra giao dịch"} className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      </fieldset>
      </div>
      <button type="submit" disabled={busy} className="min-tap rounded-full bg-accent px-4 font-semibold text-ink disabled:opacity-40">
        Lưu cổng nạp
      </button>
    </form>
  );
}
