import { useCallback, useEffect, useState } from "react";
import {
  getWorkCapacity,
  saveWorkCapacity,
  type CapacityLimits,
  type CapacitySnapshot,
} from "@/lib/admin/work-capacity-room";
import { pushToast } from "./toast";

const LABELS: Record<Exclude<keyof CapacityLimits, "enabled">, string> = {
  batch: "Tổng đoạn dịch và nhận dạng",
  modal: "Tổng đoạn TyZo",
  live: "Tổng phiên dịch trực tiếp",
  perUser: "Mỗi tài khoản, mỗi nhóm",
  perUserModal: "Đoạn TyZo mỗi tài khoản",
  perProvider: "Mỗi nhà, mỗi nhóm",
  perModel: "Mỗi model, mỗi nhóm",
};

export function WorkCapacityBoard() {
  const [view, setView] = useState<CapacitySnapshot | null>(null);
  const [draft, setDraft] = useState<CapacityLimits | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    try {
      const next = await getWorkCapacity();
      setView(next);
      setDraft(next.limits);
    } catch {
      pushToast("Chưa đọc được giới hạn xử lý.", "bad");
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const next = await saveWorkCapacity({ data: draft });
      setDraft(next);
      await reload();
      pushToast("Đã lưu giới hạn. Các việc đang chạy tiếp tục hoàn tất.");
    } catch {
      pushToast("Chưa lưu được. Các giới hạn phải là số nguyên từ 1 đến 300.", "bad");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border border-line bg-card p-4">
      <h3 className="text-sm font-semibold">Giới hạn xử lý đồng thời</h3>
      <p className="text-sm text-muted">
        Chỉ giới hạn việc xử lý, không giới hạn số khách xem Web. Tạm ngừng nhận mới để việc đang
        chạy hoàn tất. Giới hạn này không tự thuê thêm máy.
      </p>
      {draft ? (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
            />
            Nhận việc mới
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((key) => (
              <label key={key} className="grid min-w-0 gap-1 text-sm">
                <span>{LABELS[key]}</span>
                <input
                  type="number"
                  min={1}
                  max={300}
                  step={1}
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
                  className="min-tap w-full min-w-0 rounded-[var(--radius-ctl)] border border-line bg-bg px-2"
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="min-tap rounded-[var(--radius-ctl)] bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-50"
            >
              Lưu giới hạn
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void reload()}
              className="min-tap rounded-[var(--radius-ctl)] border border-line px-3 text-sm"
            >
              Đọc lại số liệu
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">Đang đọc cấu hình…</p>
      )}
      {view && (
        <div className="space-y-1 text-sm" aria-live="polite">
          {view.lanes.length === 0 && <p>Chưa có việc đang chạy.</p>}
          {view.lanes.map((lane) => (
            <p key={lane.lane}>
              {lane.lane === "modal"
                ? "TyZo"
                : lane.lane === "live"
                  ? "Dịch trực tiếp"
                  : "Dịch và nhận dạng"}
              : {lane.running} đang chạy · {lane.unknown} cần kiểm tra.
            </p>
          ))}
          {view.reconciliation.map((row) => (
            <p key={row.unit}>
              Cần đối soát: {row.calls} lệnh · phần thiếu đã ghi {row.short}{" "}
              {row.unit === "token" ? "Token dịch" : "đồng"}.
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
