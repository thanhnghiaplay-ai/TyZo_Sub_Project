import { useEffect, useState } from "react";
import { APP_VERSION } from "@/lib/app-version";
import { getLiveVersion } from "@/lib/live-version";

export function UpdateBanner() {
  const [live, setLive] = useState(APP_VERSION);
  const [later, setLater] = useState(false);

  useEffect(() => {
    let gone = false;
    const look = () => {
      void getLiveVersion()
        .then((next) => {
          if (gone || !next || next === APP_VERSION) return;
          setLive(next);
        })
        .catch(() => undefined);
    };
    look();
    const timer = window.setInterval(look, 60_000);
    const onHide = () => {
      if (!document.hidden) look();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      gone = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  if (live === APP_VERSION || later) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 grid gap-2 rounded-2xl border border-line bg-card p-3 shadow-lg">
      <p className="text-sm">Đã có bản v{live}. Hãy tải lại trang để dùng bản vừa cập nhật. Việc đang làm vẫn giữ nếu bạn chọn để sau.</p>
      <div className="flex gap-2">
        <button type="button" className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink" onClick={() => window.location.reload()}>
          Tải lại
        </button>
        <button type="button" className="min-tap rounded-full border border-line px-4 text-sm" onClick={() => setLater(true)}>
          Để sau
        </button>
      </div>
    </div>
  );
}
