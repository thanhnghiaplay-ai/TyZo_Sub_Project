import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminDesk } from "@/components/admin-desk";
import { VersionMark } from "@/components/version-mark";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-bg px-4 text-fg">
      <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-3">
        <div className="grid gap-1">
          <h1 className="text-base leading-none font-semibold">Admin</h1>
          <VersionMark />
        </div>
        <Link to="/" className="room-back">
          Về phòng
        </Link>
      </header>
      <AdminDesk />
    </main>
  );
}
