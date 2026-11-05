import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminDesk } from "@/components/admin-desk";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-bg px-4 text-fg">
      <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-3">
        <h1 className="text-base leading-none font-semibold">Admin</h1>
        <Link
          to="/"
          className="inline-flex h-9 items-center justify-center rounded-full border border-line px-3 text-sm leading-none text-muted"
        >
          Về phòng
        </Link>
      </header>
      <AdminDesk />
    </main>
  );
}
