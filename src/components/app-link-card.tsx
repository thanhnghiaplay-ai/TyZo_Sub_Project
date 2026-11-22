import { useEffect, useState } from "react";
import { getAppLinks, makeAppLinkCode, removeAppDevice, type AppLinkView } from "@/lib/app-link-room";
import { showCode } from "@/lib/app-link";

const when = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/**
 * Ứng dụng Android (v5.37.0): tải tệp cài, lấy mã liên kết, xem và gỡ máy đã liên kết.
 * Ứng dụng thu tiếng của video đang phát ở ứng dụng khác rồi hiện phụ đề nổi, trừ Token dịch như Dịch trực tiếp.
 */
export function AppLinkCard() {
  const [view, setView] = useState<AppLinkView | null>(null);
  const [code, setCode] = useState<{ code: string; until: number; known: string[] } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [joined, setJoined] = useState("");

  const load = () =>
    getAppLinks()
      .then((next) => {
        setView(next);
        return next;
      })
      .catch(() => {
        setNote("Chưa tải được danh sách máy.");
        return null;
      });

  useEffect(() => {
    void load();
  }, []);

  // Đồng hồ của mã chạy từng giây.
  useEffect(() => {
    if (!code) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [code]);

  // Mã đang chờ: 3 giây hỏi lại một lần, máy mới xuất hiện tức là mã vừa được dùng.
  useEffect(() => {
    if (!code) return;
    const timer = setInterval(() => {
      if (Date.now() > code.until) return;
      void load().then((next) => {
        const fresh = next?.devices.find((device) => !code.known.includes(device.id));
        if (fresh) {
          setJoined(fresh.name);
          setCode(null);
        }
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [code]);

  const left = code ? Math.max(0, Math.ceil((code.until - now) / 1000)) : 0;

  return (
    <section id="ung-dung-android" data-tour="android-app" className="space-y-3 rounded-[var(--radius-card)] border border-line bg-card p-4">
      <div>
        <h2 className="font-semibold">Ứng dụng Android</h2>
        <p className="mt-1 text-sm text-muted">
          Phụ đề dịch hiện ngay trên video đang phát ở Bilibili, YouTube, TikTok. Trừ Token dịch như Dịch trực tiếp. Cần Android 10 trở lên.
        </p>
        <a href="/huong-dan#ung-dung-android" className="mt-1 inline-block text-sm text-accent">
          Xem hướng dẫn cài và dùng
        </a>
      </div>
      {view?.apkUrl ? (
        <a href={view.apkUrl} className="min-tap block rounded-full bg-accent text-center font-semibold text-ink" rel="noopener">
          Tải tệp cài (bản {view.appVersion})
        </a>
      ) : (
        <p className="text-sm text-muted">Tệp cài chưa phát hành{view ? ` (bản mới nhất ${view.appVersion})` : ""}.</p>
      )}
      <div className="space-y-2">
        <button
          type="button"
          disabled={busy}
          className="min-tap w-full rounded-full border border-line disabled:opacity-40"
          onClick={() => {
            setBusy(true);
            setNote("");
            setJoined("");
            makeAppLinkCode()
              .then((made) => {
                setCode({ code: made.code, until: Date.now() + made.expiresInSeconds * 1000, known: (view?.devices ?? []).map((device) => device.id) });
                setNow(Date.now());
              })
              .catch((error: unknown) => setNote(error instanceof Error && error.message ? error.message : "Chưa lấy được mã."))
              .finally(() => setBusy(false));
          }}
        >
          Lấy mã liên kết
        </button>
        {code && left > 0 && (
          <div className="rounded-[var(--radius-ctl)] border border-line bg-raised p-3 text-center">
            <p className="font-mono text-2xl font-semibold tracking-widest select-all">{showCode(code.code)}</p>
            <p className="mt-1 text-xs text-muted">
              Gõ mã này vào ứng dụng. Còn {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}, dùng một lần.
            </p>
          </div>
        )}
        {code && left === 0 && <p className="text-sm text-muted">Mã đã hết hạn. Bấm lấy mã mới.</p>}
        {joined && <p className="text-sm font-medium text-accent">Đã liên kết với {joined}.</p>}
      </div>
      {view && view.devices.length > 0 && (
        <ul className="space-y-2">
          {view.devices.map((device) => (
            <li key={device.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-ctl)] border border-line px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{device.name}</span>
                <span className="block text-xs text-muted">
                  {device.lastUsedAt ? `Dùng lần cuối: ${when(device.lastUsedAt)}` : `Liên kết lúc ${when(device.createdAt)}`}
                </span>
              </span>
              <button
                type="button"
                className="inline-flex h-10 shrink-0 items-center rounded-full border border-line px-3 text-sm"
                onClick={() => {
                  void removeAppDevice({ data: device.id })
                    .then(load)
                    .catch(() => setNote("Chưa gỡ được máy này."));
                }}
              >
                Gỡ
              </button>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="text-sm text-muted">{note}</p>}
    </section>
  );
}
