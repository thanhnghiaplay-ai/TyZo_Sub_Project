import { useEffect, useState } from "react";
import { pushToast } from "@/components/toast";
import { getLiveSetup, saveLiveWorkspace } from "@/lib/live/live-room";

/** Workspace ID Alibaba (vùng Singapore) cho Dịch trực tiếp. Cầu nối đọc ID này khi nối tới Alibaba. */
export function LiveWorkspaceBoard() {
  const [saved, setSaved] = useState("");
  const [hasKey, setHasKey] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getLiveSetup()
      .then((next) => {
        setSaved(next.workspaceId);
        setHasKey(next.hasKey);
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được cài đặt Dịch trực tiếp.", "bad"));
  }, []);

  function save() {
    const id = draft.trim();
    if (!id) return pushToast("Hãy nhập Workspace ID.", "bad");
    setBusy(true);
    void saveLiveWorkspace({ data: id })
      .then((value) => {
        setSaved(value);
        setDraft("");
        pushToast("Đã lưu Workspace ID.");
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được Workspace ID.", "bad"))
      .finally(() => setBusy(false));
  }

  return (
    <section className="space-y-2 rounded-2xl border border-line bg-card p-4">
      <h3 className="text-sm font-semibold">Dịch trực tiếp: Workspace ID Alibaba</h3>
      <p className="text-sm text-muted">Vùng Singapore. Dùng chung key Alibaba ở trên. Chỉ Chủ lưu.</p>
      <div className="flex gap-2">
        <input
          className="min-tap min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-sm"
          value={draft}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={saved ? "Đã lưu. Dán ID mới nếu muốn đổi" : "ws-…"}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="button" className="min-tap rounded-xl bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-50" disabled={busy} onClick={save}>
          Lưu ID
        </button>
      </div>
      <p className="text-xs text-muted">
        {saved ? `Đang dùng: ${saved}.` : "Chưa lưu Workspace ID."}
        {hasKey ? "" : " Chưa có key Alibaba nên chưa nối được."}
      </p>
    </section>
  );
}
