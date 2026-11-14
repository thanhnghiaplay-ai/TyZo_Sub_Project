import { useEffect, useState } from "react";
import { getMailPolicy, saveMailPolicy } from "@/lib/mail-runtime";
import { MAIL_POLICY, renderLetter, type LetterKind, type MailPolicy } from "@/lib/mail-letter";
import { pushToast } from "@/components/toast";

const KINDS: Array<{ id: LetterKind; name: string }> = [
  { id: "verify", name: "Xác minh email" },
  { id: "reset", name: "Đặt lại mật khẩu" },
  { id: "changed", name: "Đã đổi mật khẩu" },
];

export function MailPolicyBoard() {
  const [policy, setPolicy] = useState<MailPolicy>(MAIL_POLICY);
  const [kind, setKind] = useState<LetterKind>("verify");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void getMailPolicy().then(setPolicy).catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được mẫu thư.", "bad"));
  }, []);
  const letter = policy.letters[kind];
  const preview = renderLetter(policy, kind, kind === "changed" ? undefined : "https://tyzo.vn/thu");
  function setLetter(patch: Partial<typeof letter>) {
    setPolicy({ ...policy, letters: { ...policy.letters, [kind]: { ...letter, ...patch } } });
  }
  return (
    <div className="grid min-w-0 gap-2">
      <div className="sticky top-0 z-10 rounded-2xl border border-line bg-card p-2">
        <p className="mb-1 text-xs text-muted">Xem trước. Sửa chữ hoặc màu thì thấy ngay, không cần kéo xuống.</p>
        <iframe title="Xem trước thư" sandbox="" className="h-44 w-full rounded-xl border border-line bg-white" srcDoc={preview.html} />
      </div>
    <form
      className="grid min-w-0 gap-2 rounded-2xl border border-line bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        void saveMailPolicy({ data: policy })
          .then((next) => {
            setPolicy(next);
            pushToast("Đã lưu phần thư.");
          })
          .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được.", "bad"))
          .finally(() => setBusy(false));
      }}
    >
      <h2 className="font-semibold">Xác minh và mật khẩu</h2>
      <p className="text-sm text-muted">Mặc định tắt, tài khoản hiện tại vẫn đăng nhập được. Bật bắt buộc thì tài khoản chưa xác minh không vào được cho đến khi bấm liên kết trong thư.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={policy.verifyOn} onChange={(event) => setPolicy({ ...policy, verifyOn: event.target.checked, verifyRequired: event.target.checked ? policy.verifyRequired : false })} /> Gửi thư xác minh</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={policy.verifyRequired} disabled={!policy.verifyOn} onChange={(event) => setPolicy({ ...policy, verifyRequired: event.target.checked })} /> Bắt xác minh rồi mới đăng nhập</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={policy.resetOn} onChange={(event) => setPolicy({ ...policy, resetOn: event.target.checked })} /> Cho quên mật khẩu</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={policy.changedOn} onChange={(event) => setPolicy({ ...policy, changedOn: event.target.checked })} /> Báo khi mật khẩu vừa đổi</label>
      <label className="grid gap-1 text-sm">
        Thời hạn liên kết
        <select value={policy.ttlMin} onChange={(event) => setPolicy({ ...policy, ttlMin: Number(event.target.value) as MailPolicy["ttlMin"] })} className="w-full min-w-0 rounded-xl border border-line bg-raised px-3 py-3 outline-none">
          <option value={15}>15 phút</option>
          <option value={60}>1 giờ</option>
          <option value={1440}>24 giờ</option>
        </select>
      </label>
      <div className="grid min-w-0 gap-2">
        <label className="grid min-w-0 gap-1 text-sm">
          <span className="leading-snug">Chờ giữa hai lần gửi (giây)</span>
          <input value={policy.resendWait} onChange={(event) => setPolicy({ ...policy, resendWait: Number(event.target.value) || 60 })} inputMode="numeric" className="w-full min-w-0 rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        </label>
        <label className="grid min-w-0 gap-1 text-sm">
          <span className="leading-snug">Tối đa mỗi giờ</span>
          <input value={policy.resendHour} onChange={(event) => setPolicy({ ...policy, resendHour: Number(event.target.value) || 3 })} inputMode="numeric" className="w-full min-w-0 rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        </label>
      </div>
      <details className="grid gap-2 rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold">Soạn thư (tiêu đề, nội dung, màu)</summary>
        <div className="mt-2 grid gap-2">
      <div className="flex flex-wrap gap-2">
        {KINDS.map((item) => (
          <button key={item.id} type="button" className={"inline-flex min-h-11 items-center justify-center rounded-full px-3 text-sm " + (kind === item.id ? "bg-accent font-semibold text-ink" : "border border-line")} onClick={() => setKind(item.id)}>{item.name}</button>
        ))}
      </div>
      <input value={letter.subject} onChange={(event) => setLetter({ subject: event.target.value })} placeholder="Tiêu đề thư" className="w-full min-w-0 rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      <input value={letter.greeting} onChange={(event) => setLetter({ greeting: event.target.value })} placeholder="Lời chào" className="w-full min-w-0 rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      <textarea value={letter.body} onChange={(event) => setLetter({ body: event.target.value })} rows={3} placeholder="Nội dung" className="w-full min-w-0 rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      {kind !== "changed" && <input value={letter.button} onChange={(event) => setLetter({ button: event.target.value })} placeholder="Chữ trên nút" className="w-full min-w-0 rounded-xl border border-line bg-raised px-3 py-3 outline-none" />}
      <input value={letter.footer} onChange={(event) => setLetter({ footer: event.target.value })} placeholder="Chân thư" className="w-full min-w-0 rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={letter.showName} onChange={(event) => setLetter({ showName: event.target.checked })} /> Hiện tên phòng</label>
      <div className="flex flex-wrap gap-2">
        {(["plain", "frame", "band"] as const).map((id) => (
          <button key={id} type="button" className={"inline-flex min-h-11 items-center justify-center rounded-full px-3 text-sm " + (policy.layout === id ? "bg-accent font-semibold text-ink" : "border border-line")} onClick={() => setPolicy({ ...policy, layout: id })}>{id === "plain" ? "Thẳng" : id === "frame" ? "Có khung" : "Có dải"}</button>
        ))}
        <button type="button" className={"inline-flex min-h-11 items-center justify-center rounded-full px-3 text-sm " + (policy.font === "sans" ? "bg-accent font-semibold text-ink" : "border border-line")} onClick={() => setPolicy({ ...policy, font: "sans" })}>Arial</button>
        <button type="button" className={"inline-flex min-h-11 items-center justify-center rounded-full px-3 text-sm " + (policy.font === "serif" ? "bg-accent font-semibold text-ink" : "border border-line")} onClick={() => setPolicy({ ...policy, font: "serif" })}>Georgia</button>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">Nền <input type="color" value={policy.colorBg} onChange={(event) => setPolicy({ ...policy, colorBg: event.target.value })} /></label>
        <label className="flex items-center gap-2">Chữ <input type="color" value={policy.colorInk} onChange={(event) => setPolicy({ ...policy, colorInk: event.target.value })} /></label>
        <label className="flex items-center gap-2">Nút <input type="color" value={policy.colorButton} onChange={(event) => setPolicy({ ...policy, colorButton: event.target.value })} /></label>
      </div>
        </div>
      </details>
      <details className="grid gap-2 rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold">Chữ trên trang (5 câu)</summary>
        <div className="mt-2 grid gap-2">
      <input value={policy.sent} onChange={(event) => setPolicy({ ...policy, sent: event.target.value })} placeholder="Sau khi gửi thư xác minh" className="w-full min-w-0 rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      <input value={policy.unverified} onChange={(event) => setPolicy({ ...policy, unverified: event.target.value })} placeholder="Khi chưa xác minh" className="w-full min-w-0 rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      <input value={policy.resetSent} onChange={(event) => setPolicy({ ...policy, resetSent: event.target.value })} placeholder="Sau khi xin đặt lại mật khẩu" className="w-full min-w-0 rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      <p className="text-xs text-muted">Câu đặt lại mật khẩu hiện cho mọi email, không nói email đó có tài khoản hay không.</p>
      <input value={policy.resetDone} onChange={(event) => setPolicy({ ...policy, resetDone: event.target.value })} placeholder="Khi đặt mật khẩu xong" className="w-full min-w-0 rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
      <input value={policy.resetBad} onChange={(event) => setPolicy({ ...policy, resetBad: event.target.value })} placeholder="Khi liên kết hết hạn" className="w-full min-w-0 rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        </div>
      </details>
      <button type="submit" disabled={busy} className="inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-accent px-4 font-semibold text-ink disabled:opacity-40">{busy ? "Đang lưu…" : "Lưu phần thư"}</button>
    </form>
    </div>
  );
}
