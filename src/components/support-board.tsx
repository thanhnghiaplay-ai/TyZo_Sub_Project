import { useEffect, useState } from "react";
import { pushToast } from "@/components/toast";
import { EMPTY_CONTACT, NOTE_MAX, type SupportContact } from "@/lib/support-contact";
import { getSupportContact, saveSupportContact } from "@/lib/support-room";

const INPUT = "min-tap w-full min-w-0 rounded-xl border border-line bg-bg px-3 text-sm";

/** Thông tin liên hệ hỗ trợ hiện ở trang Hướng dẫn. Chủ đổi ở đây, không phải sửa code. */
export function SupportBoard() {
  const [saved, setSaved] = useState<SupportContact | null>(null);
  const [draft, setDraft] = useState<SupportContact>(EMPTY_CONTACT);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getSupportContact()
      .then((next) => {
        setSaved(next);
        setDraft(next);
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được thông tin liên hệ.", "bad"));
  }, []);

  const dirty = saved ? JSON.stringify(saved) !== JSON.stringify(draft) : false;
  const set = (name: keyof SupportContact) => (event: React.ChangeEvent<HTMLInputElement>) => setDraft((state) => ({ ...state, [name]: event.target.value }));

  function save() {
    setBusy(true);
    void saveSupportContact({ data: draft })
      .then((next) => {
        setSaved(next);
        setDraft(next);
        pushToast("Đã lưu thông tin liên hệ.");
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được thông tin liên hệ.", "bad"))
      .finally(() => setBusy(false));
  }

  return (
    <section className="admin-card grid content-start gap-2">
      <h3 className="text-sm font-semibold">Liên hệ hỗ trợ</h3>
      <p className="text-sm text-muted">Hiện ở trang Hướng dẫn cho khách. Ô nào để trống thì không hiện. Chỉ Chủ lưu.</p>
      <label className="grid gap-1 text-xs font-semibold text-muted">
        Email
        <input className={INPUT} value={draft.email} inputMode="email" autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="ho-tro@ten-mien.vn" onChange={set("email")} />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-muted">
        Zalo (số điện thoại hoặc link zalo.me)
        <input className={INPUT} value={draft.zalo} autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="09xx xxx xxx" onChange={set("zalo")} />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-muted">
        Facebook (link trang hoặc m.me)
        <input className={INPUT} value={draft.facebook} autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="https://facebook.com/…" onChange={set("facebook")} />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-muted">
        Ghi chú (giờ làm việc, cách trả lời…)
        <input className={INPUT} value={draft.note} maxLength={NOTE_MAX} autoComplete="off" placeholder="Trả lời trong giờ hành chính" onChange={set("note")} />
      </label>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">{saved === null ? "Đang đọc…" : dirty ? "Có thay đổi chưa lưu." : "Đã lưu."}</p>
        <button type="button" className="min-tap rounded-xl bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-50" disabled={busy || saved === null || !dirty} onClick={save}>
          Lưu liên hệ
        </button>
      </div>
    </section>
  );
}
