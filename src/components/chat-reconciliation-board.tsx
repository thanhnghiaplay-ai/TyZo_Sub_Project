import { useCallback, useEffect, useState } from "react";
import { getChatReviews, saveChatReview } from "@/lib/admin/chat-reconciliation-room";
import { askConfirm } from "@/lib/confirm";
import { pushToast } from "./toast";

type Queue = Awaited<ReturnType<typeof getChatReviews>>;

export function ChatReconciliationBoard() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [id, setId] = useState("");
  const [usd, setUsd] = useState("");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    try {
      setQueue(await getChatReviews({ data: {} }));
    } catch {
      pushToast("Chưa đọc được hồ sơ đối soát.", "bad");
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);

  async function more() {
    const after = queue?.nextCursor;
    if (!after) return;
    setBusy(true);
    try {
      const next = await getChatReviews({ data: { after } });
      setQueue((current) => ({
        items: [...(current?.items ?? []), ...next.items],
        nextCursor: next.nextCursor,
      }));
    } catch {
      pushToast("Chưa đọc được trang sau.", "bad");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (
      !(await askConfirm({
        title: "Xác nhận chi phí nhà cung cấp?",
        text: "Ghi số USD đã kiểm chứng cho đúng mã lệnh. Thao tác này không trừ Token dịch của khách.",
        confirmLabel: "Ghi đối soát",
      }))
    )
      return;
    setBusy(true);
    try {
      const result = await saveChatReview({ data: { id, usd: usd.trim(), evidence } });
      if (result === "conflict") pushToast("Hồ sơ đã được xử lý với bằng chứng khác.", "bad");
      else if (result === "unavailable") pushToast("Hồ sơ chưa thể đối soát.", "bad");
      else pushToast("Đã ghi đối soát.");
      setId("");
      await reload();
    } catch {
      pushToast("Chưa lưu được. Kiểm tra số USD và bằng chứng.", "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border border-line bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Đối soát chi phí dịch</h3>
        <button
          type="button"
          disabled={busy}
          onClick={() => void reload()}
          className="min-tap rounded-[var(--radius-ctl)] border border-line px-3 text-sm"
        >
          Đọc lại hồ sơ
        </button>
      </div>
      <p className="text-sm text-muted">
        Chỉ nhập chi phí đã xác minh phía nhà cung cấp. Nhập 0 khi đã xác nhận không phát sinh chi
        phí.
      </p>
      {queue?.items.length === 0 && (
        <p className="text-sm text-muted">Không có hồ sơ chờ đối soát.</p>
      )}
      {queue?.items.map((item) => (
        <div
          key={item.id}
          className="space-y-2 rounded-[var(--radius-ctl)] border border-line p-3 text-sm"
        >
          <p className="break-words font-medium">
            {item.provider || "Chưa rõ nhà cung cấp"} · {item.model || "Chưa rõ model"}
          </p>
          <p className="break-all text-xs text-muted">
            {item.id} · {item.at} · khách {item.userId}
          </p>
          <p>
            {item.estimatedUnits == null
              ? "Mức giữ chưa rõ"
              : `Mức giữ ước tính ${item.estimatedUnits} Token dịch`}
          </p>
          {item.legacy && (
            <p className="text-muted">
              Hồ sơ cũ có thể đã nằm trong tổng chi phí. Xác nhận chỉ lưu bằng chứng.
            </p>
          )}
          {item.reportedUsdMicro != null && (
            <p>
              Chi phí tính từ usage đến muộn: {(Number(item.reportedUsdMicro) / 1_000_000).toFixed(6)}{" "}
              USD.
            </p>
          )}
          {id === item.id ? (
            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <label className="grid gap-1">
                Chi phí xác minh (USD)
                <input
                  required
                  inputMode="decimal"
                  pattern="[0-9]{1,9}(\.[0-9]{1,6})?"
                  value={usd}
                  onChange={(e) => setUsd(e.target.value)}
                  className="min-tap rounded-[var(--radius-ctl)] border border-line bg-bg px-2"
                />
              </label>
              <label className="grid gap-1">
                Tham chiếu chứng từ và nội dung đã kiểm tra
                <textarea
                  required
                  minLength={12}
                  maxLength={500}
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  className="rounded-[var(--radius-ctl)] border border-line bg-bg px-2 py-1"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="min-tap rounded-[var(--radius-ctl)] border border-line px-3"
                >
                  Xác nhận chi phí
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setId("")}
                  className="min-tap px-3"
                >
                  Hủy
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setId(item.id);
                setUsd("");
                setEvidence("");
              }}
              className="min-tap rounded-[var(--radius-ctl)] border border-line px-3"
            >
              Đối soát
            </button>
          )}
        </div>
      ))}
      {queue?.nextCursor && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void more()}
          className="min-tap rounded-[var(--radius-ctl)] border border-line px-3 text-sm"
        >
          Xem thêm hồ sơ chi phí
        </button>
      )}
    </section>
  );
}
