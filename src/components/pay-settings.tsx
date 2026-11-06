import { useEffect, useState } from "react";
import { pushToast } from "@/components/toast";
import { getPaySettings, savePaySettings, type PaySettingsView } from "@/lib/pay-store";

const BLANK: PaySettingsView = {
  sepay: false,
  casso: false,
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

  return (
    <form className="space-y-3 rounded-2xl border border-line bg-card p-4" onSubmit={save}>
      <h2 className="font-semibold">Nạp tiền</h2>
      <p className="text-sm text-muted">
        Để trống ô khóa thì giữ khóa cũ. Chưa nhập đủ thì trang người dùng hiện bảo trì. Webhook Sepay: {origin}/api/pay/sepay. Webhook Casso: {origin}/api/pay/casso.
      </p>
      <fieldset className="grid gap-2">
        <legend className="font-medium">Sepay {view.sepay ? "· đang bật" : "· đang tắt"}</legend>
        <input value={view.sepayBank} onChange={(event) => setView({ ...view, sepayBank: event.target.value })} placeholder="Ngân hàng, ví dụ MBBank" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <input value={view.sepayAccount} onChange={(event) => setView({ ...view, sepayAccount: event.target.value })} placeholder="Số tài khoản" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <input value={view.sepayName} onChange={(event) => setView({ ...view, sepayName: event.target.value })} placeholder="Tên chủ tài khoản" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <input value={sepayKey} onChange={(event) => setSepayKey(event.target.value)} placeholder={view.sepayKeySet ? "API key webhook đã lưu, gõ để đổi" : "API key webhook Sepay"} className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="font-medium">Casso {view.casso ? "· đang bật" : "· đang tắt"}</legend>
        <input value={view.cassoBank} onChange={(event) => setView({ ...view, cassoBank: event.target.value })} placeholder="Ngân hàng, ví dụ MBBank" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <input value={view.cassoAccount} onChange={(event) => setView({ ...view, cassoAccount: event.target.value })} placeholder="Số tài khoản" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <input value={view.cassoName} onChange={(event) => setView({ ...view, cassoName: event.target.value })} placeholder="Tên chủ tài khoản" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <input value={cassoToken} onChange={(event) => setCassoToken(event.target.value)} placeholder={view.cassoTokenSet ? "Secure token đã lưu, gõ để đổi" : "Secure token webhook Casso"} className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <input value={cassoKey} onChange={(event) => setCassoKey(event.target.value)} placeholder={view.cassoKeySet ? "API key đã lưu, gõ để đổi" : "API key Casso, để kiểm tra giao dịch"} className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      </fieldset>
      <button type="submit" disabled={busy} className="min-tap rounded-full bg-accent px-4 font-semibold text-ink disabled:opacity-40">
        Lưu cổng nạp
      </button>
    </form>
  );
}
