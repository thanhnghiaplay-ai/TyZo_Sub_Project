import { useCallback, useEffect, useState } from "react";
import { ExportMenu, type ExportFormat } from "@/components/export-menu";
import { pushToast } from "@/components/toast";
import { askConfirm } from "@/lib/confirm";
import { deleteLiveHistory, listLiveHistory, readLiveHistory, type HistoryItem } from "@/lib/live/live-history-room";
import { downloadLiveFile, liveExportFile } from "@/lib/live/live-export";

/** Sự kiện trang phát khi vừa lưu một phiên lên máy chủ, để danh sách tự tải lại. */
export const LIVE_HISTORY_EVENT = "tyzo-live-history";

function when(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function length(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} giây` : `${Math.floor(s / 60)} phút ${s % 60 ? `${s % 60} giây` : ""}`.trim();
}

/**
 * Lịch sử Dịch trực tiếp lưu trên máy chủ theo tài khoản: phiên từ web và từ ứng dụng Android hiện chung một chỗ.
 * Giữ 30 phiên gần nhất trong 30 ngày (live-history.ts). Tải SRT/VTT/TXT hoặc xóa từng phiên, xóa hết.
 */
export function LiveHistoryPanel() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    void listLiveHistory()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(LIVE_HISTORY_EVENT, load);
    return () => window.removeEventListener(LIVE_HISTORY_EVENT, load);
  }, [load]);

  const download = async (item: HistoryItem, format: ExportFormat) => {
    setBusy(item.id);
    try {
      const found = await readLiveHistory({ data: { id: item.id } });
      const cues = found.cues.map((cue) => ({ start: cue.s, end: cue.e, original: cue.o, translation: cue.t }));
      const file = liveExportFile(cues, format, new Date(found.startedAt));
      if (file) downloadLiveFile(file);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Chưa tải được phiên này.", "bad");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (item: HistoryItem | null) => {
    const ok = await askConfirm({
      title: item ? "Xóa phiên này?" : "Xóa hết lịch sử?",
      text: item ? "Chữ của phiên bị xóa khỏi máy chủ, ở cả web và ứng dụng. Không lấy lại được." : "Mọi phiên trong lịch sử bị xóa khỏi máy chủ, ở cả web và ứng dụng. Không lấy lại được.",
      confirmLabel: "Xóa",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteLiveHistory({ data: { id: item?.id } });
      load();
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Chưa xóa được.", "bad");
    }
  };

  return (
    <details className="rounded-[var(--radius-card)] border border-line bg-card" data-live-history>
      <summary className="min-tap flex cursor-pointer items-center justify-between gap-2 px-3 text-sm font-semibold">
        <span>Lịch sử (web và ứng dụng)</span>
        <span className="text-xs font-normal text-muted">{items == null ? "" : `${items.length} phiên`}</span>
      </summary>
      <div className="grid gap-2 px-3 pb-3">
        <p className="text-xs text-muted">Phiên dịch trực tiếp trên web và trên ứng dụng Android của tài khoản này. Giữ 30 phiên gần nhất trong 30 ngày.</p>
        {items == null && <p className="text-sm text-muted">Đang tải…</p>}
        {items?.length === 0 && <p className="text-sm text-muted">Chưa có phiên nào. Phiên dịch xong sẽ tự lưu vào đây.</p>}
        {items?.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-ctl)] border border-line px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line px-2 text-xs">{item.via === "app" ? "Ứng dụng" : "Web"}</span>
                <span>{when(item.startedAt)}</span>
                <span className="text-muted">· {item.lines} câu · {length(item.durationMs)}</span>
              </p>
              {item.preview && <p className="truncate text-xs text-muted">{item.preview}</p>}
            </div>
            <span className="flex flex-wrap gap-2">
              <ExportMenu disabled={busy === item.id} onPick={(format) => void download(item, format)} />
              <button type="button" className="min-tap rounded-full border border-line px-3 text-sm" onClick={() => void remove(item)}>
                Xóa
              </button>
            </span>
          </div>
        ))}
        {items && items.length > 0 && (
          <button type="button" className="min-tap w-fit rounded-full border border-line px-3 text-sm text-danger" onClick={() => void remove(null)}>
            Xóa hết lịch sử
          </button>
        )}
      </div>
    </details>
  );
}
