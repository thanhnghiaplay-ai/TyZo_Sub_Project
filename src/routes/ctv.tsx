import { createFileRoute, Link } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";
import { useEffect, useState } from "react";
import { applyAffiliate, myAffiliate, requestPayout } from "@/lib/affiliate-room";

export const Route = createFileRoute("/ctv")({ component: PartnerPage });

function PartnerPage() {
  const [note, setNote] = useState("");
  const [desk, setDesk] = useState<Awaited<ReturnType<typeof myAffiliate>> | null>(null);

  function load() {
    void myAffiliate()
      .then(setDesk)
      .catch((error: Error) => setNote(error.message));
  }

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (desk?.joined) setLink(`${window.location.origin}/?ref=${desk.code}`);
  }, [desk]);

  const [link, setLink] = useState("");
  return (
    <main className="room-wide mx-auto flex h-dvh flex-col gap-4 overflow-y-auto bg-bg px-4 py-6 text-fg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-base font-semibold">Cộng tác viên</h1>
        </div>
        <Link to="/" className="text-sm text-muted">Về phòng</Link>
      </div>
      {!desk?.joined ? (
        <button type="button" className="min-tap w-fit rounded-full bg-accent px-4 text-sm font-semibold text-ink" onClick={() => void applyAffiliate().then(load).catch((error: Error) => setNote(error.message))}>
          Đăng ký mã giới thiệu
        </button>
      ) : (
        <section className="space-y-3 text-sm">
          <p>Trạng thái: {desk.status === "hoat-dong" ? "đang hoạt động" : desk.status === "tam-khoa" ? "tạm khóa" : "chờ duyệt"}.</p>
          <p>Mã {desk.code}</p>
          {desk.status === "hoat-dong" ? <p className="break-all">{link}</p> : null}
          <p>Đang chờ {desk.waiting.toLocaleString("vi-VN")} đ. Có thể rút {desk.ready.toLocaleString("vi-VN")} đ.</p>
          <p className="text-muted">
            {desk.rules.windowDays === 0 ? "Hưởng cả đời, tính từ lúc khách gắn mã." : `Hưởng ${desk.rules.windowDays} ngày kể từ lúc khách gắn mã.`} Chờ {desk.rules.holdDays} ngày trước khi rút. Tối thiểu {desk.rules.minPayout.toLocaleString("vi-VN")} đ.
          </p>
          <button type="button" className="min-tap rounded-full border border-line px-4" onClick={() => void requestPayout().then(() => { setNote("Đã gửi lệnh rút."); load(); }).catch((error: Error) => setNote(error.message))}>
            Yêu cầu rút
          </button>
          <ul className="space-y-1 text-muted">
            {desk.guests.map((guest) => (
              <li key={guest.email + guest.at}>{guest.email}</li>
            ))}
          </ul>
        </section>
      )}
      {note ? <p className="text-sm text-muted">{note}</p> : null}
    </main>
  );
}
