import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { getRoomAccount, type RoomState } from "@/lib/room-account";
import { getServiceMenu } from "@/lib/pack-room";
import { quoteTurnPacks, type TurnPrice } from "@/lib/turn-quote";
import { turnPackModels, turnPacks } from "@/lib/turn-pack";
import type { ServicePack } from "@/lib/service-pack";
import { formatMinutes, minutesLeft, pickPrice, runEstimate } from "@/lib/wallet-view";
import { formatGiay } from "@/lib/token-math";
import { fmt } from "@/lib/sub/text";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

/**
 * Thẻ Token dịch cho cửa trả theo lượt: số còn và ước tính cho video đang chọn.
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
  const left = account && rate ? minutesLeft(account.units, rate.row.total) : null;
  const run = pickPrice(forRun, chosen?.id ?? null);
  const estimate = account ? runEstimate(run?.row ?? null, account.units) : null;

  return (
    <section aria-label="Token dịch và ước tính" className="grid gap-2 rounded-[var(--radius-card)] border border-line bg-card p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2">
          <Icon slot="nav.wallet" className="size-4 shrink-0 text-accent" />
          {account ? (
            <span>
              <strong>{formatGiay(account.units)}</strong>
              {left != null && (
                <>
                  {" "}
                  · <strong className="text-accent">Còn khoảng {formatMinutes(left)}</strong>
                  {!rate?.exact ? " (theo gói rẻ nhất)" : ""}
                </>
              )}
            </span>
          ) : (
            <span className="text-muted">Đang đọc Token dịch…</span>
          )}
        </p>
      </div>
      {estimate && (
        <p className={estimate.enough ? "text-muted" : "text-danger"} role="status">
          Video {fmt(secs)}: giữ khoảng <strong className="text-fg">{formatGiay(estimate.hold)}</strong> trước khi chạy
          {run && !run.exact ? " (theo gói rẻ nhất)" : ""}.
          {!estimate.enough ? ` Thiếu ${formatGiay(estimate.short)}. Hãy mua Token dịch ở Tài khoản.` : ""}
        </p>
      )}
      {!estimate && secs < 1 && account && <p className="text-xs text-muted">Chọn một tệp để thấy ước tính cho video đó. Dán link thì chưa biết thời lượng.</p>}
    </section>
  );
}
