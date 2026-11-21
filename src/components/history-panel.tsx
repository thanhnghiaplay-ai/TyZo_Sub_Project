import { useCallback, useEffect, useState } from "react";
import { getMyHistory } from "@/lib/history-room";
import { grantRow, localRow, mergeHistory, ticketRow, type GrantRow, type HistoryRow } from "@/lib/history-view";
import type { LedgerRow } from "@/lib/ledger-view";
import { readLocalRuns } from "@/lib/local-runs";

type Tab = "runs" | "buys";

const TONE: Record<HistoryRow["tone"], string> = { ok: "text-accent", bad: "text-danger", wait: "text-warning", plain: "text-muted" };

function safeLocal(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Lịch sử trong trang tài khoản (v5.31.0).
 * «Lượt dịch»: mỗi tệp đã dịch, dài bao lâu, model nào, Token dịch giữ / trừ / trả lại, trạng thái; cả lượt thuê phòng ghi trên máy này.
 * «Mua và gói»: các lần mua Token dịch, thuê phòng, và từng gói Token còn bao nhiêu, hạn đến bao giờ.
 */
export function HistoryPanel({ buys }: { buys: LedgerRow[] }) {
  const [tab, setTab] = useState<Tab>("runs");
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [more, setMore] = useState(false);

  const load = useCallback((before: string | null) => {
    if (before) setMore(true);
    else setState("loading");
    void getMyHistory({ data: { before } })
      .then((page) => {
        const server = page.tickets.map(ticketRow);
        if (before) setRows((current) => mergeHistory([...current, ...server]));
        else {
          setRows(mergeHistory([...server, ...readLocalRuns(safeLocal()).map(localRow)]));
          setGrants(page.grants.map((grant) => grantRow(grant)));
        }
        setNext(page.next);
        setState("ready");
      })
      .catch(() => {
        if (!before) {
          // Mất mạng: vẫn hiện lượt thuê phòng ghi trên máy.
          setRows(mergeHistory(readLocalRuns(safeLocal()).map(localRow)));
          setState("failed");
        }
      })
      .finally(() => setMore(false));
  }, []);

  useEffect(() => {
    load(null);
    const refresh = () => load(null);
    window.addEventListener("tyzo-room-refresh", refresh);
    return () => window.removeEventListener("tyzo-room-refresh", refresh);
  }, [load]);

  const chip = (id: Tab, label: string) => (
    <button
      type="button"
      aria-pressed={tab === id}
      className={"min-tap rounded-full border px-3 text-sm " + (tab === id ? "border-accent bg-accent/10 font-semibold" : "border-line")}
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );

  return (
    <section id="lich-su" className="account-wide grid gap-2 rounded-[var(--radius-card)] border border-line bg-card p-3" data-wallet-history>
      <h2 className="font-semibold">Lịch sử</h2>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Loại lịch sử">
        {chip("runs", "Lượt dịch")}
        {chip("buys", "Mua và gói")}
      </div>

      {tab === "runs" && (
        <div className="grid gap-2" data-history-runs>
          {state === "loading" && <p className="text-sm text-muted">Đang đọc lịch sử…</p>}
          {state === "failed" && (
            <p className="text-sm text-danger">
              Chưa đọc được lịch sử trên máy chủ (mạng hoặc máy chủ bận).{" "}
              <button type="button" className="underline" onClick={() => load(null)}>
                Thử lại
              </button>
            </p>
          )}
          {state !== "loading" && rows.length === 0 && <p className="text-sm text-muted">Chưa có lượt dịch nào.</p>}
          <ul className="grid gap-2">
            {rows.map((row) => (
              <li key={row.id} className="grid gap-0.5 rounded-[var(--radius-ctl)] border border-line bg-bg px-3 py-2 text-sm">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 break-words font-medium">{row.title}</span>
                  <span className={"shrink-0 text-xs font-semibold " + TONE[row.tone]}>{row.state}</span>
                </span>
                {row.detail && <span className="text-xs text-muted">{row.detail}</span>}
                <span className="text-xs">{row.money}</span>
              </li>
            ))}
          </ul>
          {next && (
            <button type="button" disabled={more} className="min-tap rounded-full border border-line text-sm disabled:opacity-40" onClick={() => load(next)}>
              {more ? "Đang đọc…" : "Xem thêm"}
            </button>
          )}
          <p className="text-xs text-muted">Lượt trả theo lượt ghi ở máy chủ. Lượt dùng key của bạn (thuê phòng) chỉ ghi trên máy này, xóa dữ liệu trang là mất.</p>
        </div>
      )}

      {tab === "buys" && (
        <div className="grid gap-3" data-history-buys>
          {grants.length > 0 && (
            <div className="grid gap-1">
              <p className="text-sm font-medium">Gói Token dịch</p>
              <ul className="grid gap-1 text-sm">
                {grants.map((grant) => (
                  <li key={grant.id} className="flex justify-between gap-3">
                    <span className={grant.expired ? "text-muted" : ""}>{grant.title}</span>
                    <span className={"shrink-0 text-right text-xs " + (grant.expired ? "text-muted" : "text-accent")}>{grant.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-1">
            <p className="text-sm font-medium">Mua và thuê</p>
            {buys.length === 0 && <p className="text-sm text-muted">Chưa có giao dịch nào.</p>}
            <ul className="grid gap-1 text-sm">
              {buys.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <span className={"min-w-0 break-words " + (row.tone === "reject" ? "text-danger" : "")}>{row.label}</span>
                  <span className={"shrink-0 text-right " + (row.tone === "down" || row.tone === "reject" ? "text-danger" : "text-accent")}>
                    {row.main}
                    {row.money && <span className="block text-xs text-muted">{row.money}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
