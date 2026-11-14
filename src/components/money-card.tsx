import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { getRoomAccount, type RoomState } from "@/lib/room-account";
import { getServiceMenu } from "@/lib/pack-room";
import { quoteTurnPacks, type TurnPrice } from "@/lib/turn-quote";
import { turnPackModels, turnPacks } from "@/lib/turn-pack";
import type { ServicePack } from "@/lib/service-pack";
import { formatDong, formatMinutes, minutesLeft, pickPrice, runEstimate } from "@/lib/wallet-view";
import { fmt } from "@/lib/sub/text";
import { TopUp } from "@/components/top-up";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

/**
 * Thẻ tiền cho cửa trả theo lượt: số dư và còn bao nhiêu phút, ước tính cho video đang chọn,
 * và thẻ nạp nhanh ngay tại chỗ. Chỉ hiện khi đang chọn Trả theo lượt; dùng key riêng thì tiền là của Groq.
 */
export function MoneyCard({
  active,
  asr,
  chat,
  seconds,
  narration,
}: {
  active: boolean;
  asr: string;
  chat: string;
  /** Thời lượng video đang chọn, 0 nếu chưa biết (ví dụ dán link). */
  seconds: number;
  narration: boolean;
}) {
  const { user, isPending } = useCurrentUserState();
  const on = active && !isPending && Boolean(user) && !user?.isDevFallback;
  const [account, setAccount] = useState<RoomState | null>(null);
  const [packs, setPacks] = useState<ServicePack[]>([]);
  const [perMinute, setPerMinute] = useState<TurnPrice[]>([]);
  const [forRun, setForRun] = useState<TurnPrice[]>([]);
  const [tick, setTick] = useState(0);
  const [topOpen, setTopOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setTick((value) => value + 1);
    window.addEventListener("tyzo-room-refresh", refresh);
    return () => window.removeEventListener("tyzo-room-refresh", refresh);
  }, []);

  useEffect(() => {
    if (!on) return;
    let gone = false;
    void getRoomAccount()
      .then((next) => {
        if (!gone) setAccount(next);
      })
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, [on, tick]);

  useEffect(() => {
    if (!on) return;
    let gone = false;
    void getServiceMenu()
      .then((menu) => {
        if (!gone) setPacks(turnPacks(menu.packs));
      })
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, [on]);

  useEffect(() => {
    if (!on || !packs.length) return;
    let gone = false;
    void quoteTurnPacks({ data: { seconds: 60, narration } })
      .then((rows) => {
        if (!gone) setPerMinute(rows);
      })
      .catch(() => {
        if (!gone) setPerMinute([]);
      });
    return () => {
      gone = true;
    };
  }, [on, packs.length, narration]);

  const secs = Number.isFinite(seconds) ? Math.round(seconds) : 0;
  useEffect(() => {
    if (!on || !packs.length || secs < 1) {
      setForRun([]);
      return;
    }
    let gone = false;
    void quoteTurnPacks({ data: { seconds: secs, narration } })
      .then((rows) => {
        if (!gone) setForRun(rows);
      })
      .catch(() => {
        if (!gone) setForRun([]);
      });
    return () => {
      gone = true;
    };
  }, [on, packs.length, secs, narration]);

  if (!on) return null;

  const chosen = packs.find((pack) => {
    const models = turnPackModels(pack);
    return models.asr === asr && models.chat === chat;
  });
  const rate = pickPrice(perMinute, chosen?.id ?? null);
  const left = account && rate ? minutesLeft(account.balance, rate.row.total) : null;
  const run = pickPrice(forRun, chosen?.id ?? null);
  const estimate = account ? runEstimate(run?.row ?? null, account.balance) : null;

  return (
    <section aria-label="Ví và ước tính" className="grid gap-2 rounded-2xl border border-line bg-card p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2">
          <Wallet className="size-4 shrink-0 text-accent" aria-hidden="true" />
          {account ? (
            <span>
              <strong>{formatDong(account.balance)}</strong>
              {left != null && (
                <>
                  {" "}
                  · <strong className="text-accent">Còn khoảng {formatMinutes(left)}</strong>
                  {!rate?.exact ? " (theo gói rẻ nhất)" : ""}
                </>
              )}
              {account.holding > 0 ? ` · đang giữ ${formatDong(account.holding)}` : ""}
            </span>
          ) : (
            <span className="text-muted">Đang đọc số dư…</span>
          )}
        </p>
        <button
          type="button"
          className={"min-tap rounded-full border px-4 text-sm font-semibold " + (estimate && !estimate.enough ? "border-accent bg-accent text-ink" : "border-line")}
          aria-expanded={topOpen}
          onClick={() => setTopOpen((value) => !value)}
        >
          {topOpen ? "Đóng nạp nhanh" : "Nạp nhanh"}
        </button>
      </div>
      {estimate && (
        <p className={estimate.enough ? "text-muted" : "text-danger"} role="status">
          Video {fmt(secs)}: ước tính khoảng <strong className="text-fg">{formatDong(estimate.total)}</strong>, phòng giữ {formatDong(estimate.hold)} trong ví trước khi chạy
          {run && !run.exact ? " (theo gói rẻ nhất)" : ""}.
          {!estimate.enough ? ` Ví thiếu ${formatDong(estimate.short)}, hãy nạp thêm.` : ""}
        </p>
      )}
      {!estimate && secs < 1 && account && <p className="text-xs text-muted">Chọn một tệp để thấy ước tính cho video đó. Dán link thì chưa biết thời lượng.</p>}
      <TopUp
        compact
        opened={topOpen}
        onOpened={setTopOpen}
        onPaid={() => {
          setTick((value) => value + 1);
          window.dispatchEvent(new Event("tyzo-room-refresh"));
        }}
      />
    </section>
  );
}
