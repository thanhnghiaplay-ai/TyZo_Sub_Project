import { createFileRoute, Link } from "@tanstack/react-router";
import { AccountPanel } from "@/components/account-panel";

export const Route = createFileRoute("/tai-khoan")({ component: AccountPage });

function AccountPage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-bg text-fg">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-accent">Quản lý</p>
          <h1 className="text-base font-semibold">Tài khoản</h1>
        </div>
        <Link to="/" className="min-tap rounded-full border border-line px-3 text-sm text-muted">
          Về phòng dịch
        </Link>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <AccountPanel />
      </div>
    </main>
  );
}
