import { createFileRoute } from "@tanstack/react-router";
import { AdminDesk } from "@/components/admin-desk";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  return (
    <div className="room-wide app-shell mx-auto bg-bg text-fg">
      <AdminDesk />
    </div>
  );
}
