import type { ReactNode } from "react";

export function LaterFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2 rounded-xl border border-dashed border-line bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs font-medium text-muted">Sẽ cập nhật sau</p>
      </div>
      {children}
    </section>
  );
}
