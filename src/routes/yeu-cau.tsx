import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { submitPublicAppeal } from "@/lib/admin-room";

export const Route = createFileRoute("/yeu-cau")({ component: AppealPage });

function AppealPage() {
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-bg px-4 text-fg">
      <header className="border-b border-line py-3">
        <h1 className="text-base font-semibold">Yêu cầu xem lại</h1>
        <p className="mt-1 text-sm text-muted">Dùng khi tài khoản bị khóa hoặc bị cấm. Không cần đăng nhập.</p>
      </header>
      <form
        className="space-y-3 py-4"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          setNotice(null);
          void submitPublicAppeal({ data: { email, body } })
            .then(() => {
              setBody("");
              setNotice("Đã gửi yêu cầu. Nếu bạn đăng nhập lại được, phản hồi sẽ xuất hiện trong mục Thông báo của tài khoản.");
            })
            .catch((error) => setNotice(error instanceof Error ? error.message : "Không gửi được yêu cầu. Vui lòng thử lại."))
            .finally(() => setBusy(false));
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email tài khoản"
          className="w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
        />
        <textarea
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Mô tả việc đã xảy ra và lý do cần xem xét lại"
          rows={5}
          className="w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
        />
        <button type="submit" disabled={busy} className="min-tap w-full rounded-full bg-accent font-semibold text-ink disabled:opacity-40">
          Gửi yêu cầu
        </button>
        {notice && <p className="text-sm text-muted">{notice}</p>}
        <Link to="/login" className="block text-sm text-muted underline">
          Về đăng nhập
        </Link>
      </form>
    </main>
  );
}
