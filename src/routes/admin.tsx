import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminDesk } from "@/components/admin-desk";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-bg px-4 text-fg">
      <header className="flex items-center justify-between gap-3 border-b border-line py-3">
        <h1 className="text-base font-semibold">Admin</h1>
        <Link to="/" className="min-tap rounded-full border border-line px-3 text-sm text-muted">
          Về phòng
        </Link>
      </header>
      <AdminDesk />
    </main>
  );
}
