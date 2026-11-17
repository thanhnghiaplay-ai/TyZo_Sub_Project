import { useEffect, useState } from "react";
import { pushToast } from "@/components/toast";
import { getLiveShow, saveLiveShow } from "@/lib/live/live-show-room";
import { liveCandidates, liveTickable } from "@/lib/live/live-show";
import { PROVIDER_LABEL } from "@/lib/sub/provider";

const MODE_NOTE = { real: "dịch trực tiếp thật", chunked: "cắt đoạn ngắn (app chưa có đường chạy, chưa bật được)", none: "" } as const;

/** Chủ chọn model dịch trực tiếp khách được dùng. Chỉ model làm được mới tick được; chưa lưu thì mở hết model làm được. */
export function LiveShowBoard() {
  const rows = liveCandidates();
  const [show, setShow] = useState<string[]>(() => rows.filter((row) => liveTickable(row.mode)).map((row) => row.id));
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getLiveShow()
      .then((next) => {
        if (next) {
          setShow(next);
          setSaved(true);
        }
      })
      .catch(() => undefined);
  }, []);

  function toggle(id: string, on: boolean) {
    setShow((current) => (on ? [...new Set([...current, id])] : current.filter((item) => item !== id)));
  }

  function save() {
    setBusy(true);
    void saveLiveShow({ data: show })
      .then((next) => {
        setShow(next);
        setSaved(true);
        pushToast("Đã lưu model dịch trực tiếp.");
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được danh sách.", "bad"))
      .finally(() => setBusy(false));
  }

  return (
    <section className="admin-wide grid content-start gap-3 rounded-[var(--radius-card)] border border-line bg-card p-4">
      <h2 className="font-semibold">Model dịch trực tiếp khách được dùng</h2>
      <p className="text-xs text-muted">
        Mỗi model tự khai khả năng. Chỉ model dịch trực tiếp thật mới bật được. Model chỉ làm được bằng cách cắt đoạn ngắn hiện ở đây nhưng chưa bật được vì app chưa có đường chạy đó.
        {saved ? "" : " Chưa lưu: đang mở mọi model làm được."}
      </p>
      <div className="grid gap-2">
        {rows.map((row) => {
          const can = liveTickable(row.mode);
          return (
            <label key={`${row.provider}:${row.id}`} className="flex min-tap items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 size-5" disabled={!can} checked={can && show.includes(row.id)} onChange={(event) => toggle(row.id, event.target.checked)} />
              <span>
                {row.label} <span className="text-muted">· {PROVIDER_LABEL[row.provider]} · {MODE_NOTE[row.mode]}</span>
              </span>
            </label>
          );
        })}
      </div>
      <button type="button" disabled={busy} onClick={save} className="min-tap w-fit rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40">
        Lưu model dịch trực tiếp
      </button>
    </section>
  );
}
