import { useEffect, useState } from "react";
import { pushToast } from "@/components/toast";
import { getServiceStatus, saveServiceStatus } from "@/lib/service-status-room";
import {
  defaultServiceStatus,
  inputToUntil,
  SERVICE_GROUPS,
  SERVICE_LABEL,
  SERVICE_NOTE_MAX,
  SERVICE_STATE_LABEL,
  untilToInput,
  type ServiceGroup,
  type ServiceState,
  type ServiceStatus,
} from "@/lib/service-status";

type Draft = Record<ServiceGroup, { state: ServiceState; note: string; until: string }>;

const WHAT: Record<ServiceGroup, string> = {
  live: "Nghe và dịch ngay khi đang nói (micro hoặc âm thanh tab).",
  normal: "Chọn tệp video hoặc âm thanh rồi dịch, gồm dùng thử, key riêng và trả theo lượt.",
};

function toDraft(status: ServiceStatus): Draft {
  const one = (group: ServiceGroup) => ({ state: status[group].state, note: status[group].note, until: untilToInput(status[group].until) });
  return { live: one("live"), normal: one("normal") };
}

/** Chủ đặt Hoạt động hoặc Bảo trì cho từng nhóm dịch. Bảo trì chặn lượt chạy mới; lượt đang chạy vẫn chạy nốt. */
export function ServiceStatusBoard() {
  const [saved, setSaved] = useState<ServiceStatus>(defaultServiceStatus);
  const [draft, setDraft] = useState<Draft>(() => toDraft(defaultServiceStatus()));
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getServiceStatus()
      .then((next) => {
        setSaved(next);
        setDraft(toDraft(next));
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được trạng thái các nhóm dịch.", "bad"))
      .finally(() => setLoaded(true));
  }, []);

  function patch(group: ServiceGroup, change: Partial<Draft[ServiceGroup]>) {
    setDraft((current) => ({ ...current, [group]: { ...current[group], ...change } }));
  }

  const dirty = SERVICE_GROUPS.some((group) => {
    const a = draft[group];
    const b = toDraft(saved)[group];
    return a.state !== b.state || (a.state === "maintenance" && (a.note.trim() !== b.note || a.until !== b.until));
  });

  function save() {
    const opening = SERVICE_GROUPS.filter((group) => draft[group].state === "maintenance" && saved[group].state !== "maintenance");
    if (opening.length) {
      const names = opening.map((group) => SERVICE_LABEL[group]).join(" và ");
      if (!window.confirm(`Đưa ${names} vào bảo trì? Khách sẽ không bắt đầu được lượt mới. Lượt đang chạy vẫn chạy nốt.`)) return;
    }
    const payload: Record<ServiceGroup, { state: ServiceState; note: string; until: number | null }> = {
      live: { state: draft.live.state, note: draft.live.note, until: draft.live.state === "maintenance" ? inputToUntil(draft.live.until) : null },
      normal: { state: draft.normal.state, note: draft.normal.note, until: draft.normal.state === "maintenance" ? inputToUntil(draft.normal.until) : null },
    };
    for (const group of SERVICE_GROUPS) {
      if (payload[group].state === "maintenance" && draft[group].until && payload[group].until == null) {
        return pushToast(`Giờ dự kiến mở lại của ${SERVICE_LABEL[group]} chưa đúng.`, "bad");
      }
    }
    setBusy(true);
    void saveServiceStatus({ data: payload })
      .then((next) => {
        setSaved(next);
        setDraft(toDraft(next));
        pushToast("Đã lưu trạng thái các nhóm dịch.");
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được trạng thái.", "bad"))
      .finally(() => setBusy(false));
  }

  return (
    <section className="admin-card admin-wide grid gap-3" data-service-board>
      <div>
        <h3 className="text-sm font-semibold">Trạng thái các nhóm dịch</h3>
        <p className="text-sm text-muted">
          Bảo trì chặn lượt chạy mới của nhóm đó, khách thấy lời nhắn bên dưới. Lượt đang chạy vẫn chạy nốt, không bị cắt. Chỉ Chủ đặt.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {SERVICE_GROUPS.map((group) => {
          const row = draft[group];
          const down = row.state === "maintenance";
          const live = saved[group].state === "maintenance";
          return (
            <div key={group} className="grid content-start gap-2 rounded-xl border border-line bg-bg p-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className={"door-dot " + (live ? "door-dot-closed" : "door-dot-open")} aria-hidden="true" />
                {SERVICE_LABEL[group]}
                <span className="text-xs font-normal text-muted">đang {SERVICE_STATE_LABEL[saved[group].state].toLowerCase()}</span>
              </p>
              <p className="text-xs text-muted">{WHAT[group]}</p>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label={`Trạng thái ${SERVICE_LABEL[group]}`}>
                {(["active", "maintenance"] as const).map((state) => (
                  <button
                    key={state}
                    type="button"
                    disabled={!loaded || busy}
                    aria-pressed={row.state === state}
                    onClick={() => patch(group, { state })}
                    className={
                      "min-tap rounded-xl border px-3 text-sm font-semibold disabled:opacity-50 " +
                      (row.state === state ? (state === "active" ? "border-accent bg-accent text-ink" : "border-warning bg-warning/20 text-warning") : "border-line")
                    }
                  >
                    {SERVICE_STATE_LABEL[state]}
                  </button>
                ))}
              </div>
              {down && (
                <>
                  <label className="grid gap-1 text-sm">
                    <span className="text-xs font-semibold text-muted">Lời nhắn cho khách (để trống dùng câu mặc định)</span>
                    <textarea
                      className="min-h-20 rounded-xl border border-line bg-card px-3 py-2 text-sm"
                      maxLength={SERVICE_NOTE_MAX}
                      value={row.note}
                      disabled={busy}
                      placeholder={`${SERVICE_LABEL[group]} đang bảo trì.`}
                      onChange={(event) => patch(group, { note: event.target.value })}
                    />
                    <span className="text-right text-xs text-muted">
                      {row.note.length}/{SERVICE_NOTE_MAX}
                    </span>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-xs font-semibold text-muted">Dự kiến mở lại (giờ Việt Nam, có thể để trống)</span>
                    <input
                      type="datetime-local"
                      className="min-tap rounded-xl border border-line bg-card px-3 text-sm"
                      value={row.until}
                      disabled={busy}
                      onChange={(event) => patch(group, { until: event.target.value })}
                    />
                    <span className="text-xs text-muted">Chỉ để báo khách, không tự mở lại. Đến giờ mà chưa xong thì bạn tự bấm Hoạt động.</span>
                  </label>
                </>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" className="min-tap w-fit rounded-xl bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-50" disabled={!loaded || busy || !dirty} onClick={save}>
        {busy ? "Đang lưu…" : "Lưu trạng thái"}
      </button>
    </section>
  );
}
