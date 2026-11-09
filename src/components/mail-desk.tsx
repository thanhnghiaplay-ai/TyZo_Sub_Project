import { useEffect, useState } from "react";
import { getMailDesk, MAIL_PROVIDERS, saveMailDesk, sendTestMail, type MailDeskView, type MailProvider } from "@/lib/mail-desk";
import { pushToast } from "@/components/toast";

const NAMES: Record<MailProvider, string> = {
  resend: "Resend",
  brevo: "Brevo",
  sendgrid: "SendGrid",
  mailgun: "Mailgun",
  postmark: "Postmark",
};

const BLANK: MailDeskView = {
  provider: "resend",
  from: "",
  domain: "",
  keySet: false,
  savedReady: false,
  serverName: null,
  email: "",
};

export function MailDesk() {
  const [view, setView] = useState<MailDeskView>(BLANK);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    void getMailDesk()
      .then(setView)
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được cấu hình thư.", "bad"));
  }

  useEffect(() => {
    load();
  }, []);

  const canTest = view.savedReady || Boolean(view.serverName);

  return (
    <section className="grid gap-3">
      <form
        className="grid gap-2 rounded-2xl border border-line bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          void saveMailDesk({ data: { provider: view.provider, from: view.from, key, domain: view.domain } })
            .then((next) => {
              setView(next);
              setKey("");
              pushToast("Đã lưu nhà gửi thư.");
            })
            .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được.", "bad"))
            .finally(() => setBusy(false));
        }}
      >
        <h2 className="font-semibold">Thư</h2>
        <p className="text-sm text-muted">
          {view.savedReady
            ? "Đã lưu khóa. Xác minh email và quên mật khẩu chưa bật."
            : "Chưa lưu đủ khóa. Xác minh email và quên mật khẩu đang tắt."}
          {view.serverName ? ` Máy chủ đang có ${NAMES[view.serverName as MailProvider] ?? view.serverName}.` : ""}
        </p>
        <label className="grid gap-1 text-sm">
          Nhà gửi thư
          <select
            value={view.provider}
            onChange={(event) => setView({ ...view, provider: event.target.value as MailProvider })}
            className="rounded-xl border border-line bg-raised px-3 py-3 outline-none"
          >
            {MAIL_PROVIDERS.map((id) => (
              <option key={id} value={id}>
                {NAMES[id]}{id === "resend" || id === "brevo" ? " — nên dùng" : ""}
              </option>
            ))}
          </select>
        </label>
        <input
          value={view.from}
          onChange={(event) => setView({ ...view, from: event.target.value })}
          placeholder="TyZo Sub <thu@ten-mien-cua-ban.vn>"
          className="rounded-xl border border-line bg-raised px-3 py-3 outline-none"
        />
        {view.provider === "mailgun" && (
          <input
            value={view.domain}
            onChange={(event) => setView({ ...view, domain: event.target.value })}
            placeholder="Tên miền gửi, ví dụ mg.ten-mien.vn"
            className="rounded-xl border border-line bg-raised px-3 py-3 outline-none"
          />
        )}
        <input
          value={key}
          onChange={(event) => setKey(event.target.value)}
          type="password"
          autoComplete="off"
          placeholder={view.keySet ? "Khóa đã lưu, gõ để đổi" : "Khóa API"}
          className="rounded-xl border border-line bg-raised px-3 py-3 outline-none"
        />
        <button type="submit" disabled={busy} className="inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-accent px-4 font-semibold text-ink disabled:opacity-40">
          {busy ? "Đang lưu…" : "Lưu"}
        </button>
      </form>
      <div className="grid gap-2 rounded-2xl border border-line p-4">
        <p className="text-sm text-muted">Thư thử gửi tới {view.email || "email của Chủ"}.</p>
        <button
          type="button"
          disabled={busy || !canTest}
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-line px-4 disabled:opacity-40"
          onClick={() => {
            if (busy) return;
            setBusy(true);
            void sendTestMail()
              .then((result) => pushToast(`Đã gửi thư thử tới ${result.email}.`))
              .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa gửi được.", "bad"))
              .finally(() => setBusy(false));
          }}
        >
          Gửi thư thử
        </button>
      </div>
    </section>
  );
}
