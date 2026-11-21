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

type MoneyInput = {
  active: boolean;
  asr: string;
  chat: string;
  /** Thời lượng video đang chọn, 0 nếu chưa biết (ví dụ dán link). */
  seconds: number;
  narration: boolean;
  /** v5.31.2: idle = chưa chạy (cần cả hai phần), running = đang chạy (không hiện ước tính, số dư đang giữ/trả), chat = đã nhận dạng xong, chỉ còn dịch. */
  phase?: "idle" | "running" | "chat";
};

export type MoneyView = {
  on: boolean;
  /** Gói trả theo lượt đang khớp model đã chọn (v5.32.4). null = chưa chọn gói; packCount = số gói Admin mở. */
  pack: { id: string; name: string } | null;
  packCount: number;
  phase: "idle" | "running" | "chat";
  account: RoomState | null;
  /** Lần đọc tài khoản gần nhất bị lỗi (mất mạng, máy chủ bận). Gửi sự kiện «tyzo-room-refresh» để thử lại. */
  failed: boolean;
  left: number | null;
  exactRate: boolean;
  secs: number;
  run: ReturnType<typeof pickPrice>;
  estimate: ReturnType<typeof runEstimate> | null;
};

/**
 * Đọc số Token dịch, giá mỗi phút và ước tính một lần, để thanh số dư ở đầu trang và ô ước tính
 * ở cuối dùng chung, không gọi máy chủ hai lần.
 */
export function useMoney({ active, asr, chat, seconds, narration, phase = "idle" }: MoneyInput): MoneyView {
  const { user, isPending } = useCurrentUserState();
  const on = active && !isPending && Boolean(user) && !user?.isDevFallback;
  const [account, setAccount] = useState<RoomState | null>(null);
  const [failed, setFailed] = useState(false);
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
    setFailed(false);
    void getRoomAccount()
      .then((next) => {
        if (!gone) setAccount(next);
      })
      .catch(() => {
        if (!gone) setFailed(true);
      });
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

  const chosen = packs.find((pack) => {
    const models = turnPackModels(pack);
    return models.asr === asr && models.chat === chat;
  });
  const rate = pickPrice(perMinute, chosen?.id ?? null);
  const left = account && rate ? minutesLeft(account.units, rate.row.total) : null;
  const run = pickPrice(forRun, chosen?.id ?? null);
  const estimate = account ? runEstimate(run?.row ?? null, account.units, phase === "chat" ? "chat" : "all") : null;
  return { on, phase, pack: chosen ? { id: chosen.id, name: chosen.name } : null, packCount: packs.length, account, failed, left, exactRate: Boolean(rate?.exact), secs, run, estimate };
}

/** Thanh số dư gọn, đặt ngay đầu màn hình đầu: Token dịch còn và còn khoảng bao nhiêu phút. */
export function MoneyBalance({ money, turn }: { money: MoneyView; turn: boolean }) {
  if (!money.on) return null;
  const { account, left, exactRate } = money;
  return (
    <section aria-label="Số dư Token dịch" data-balance className="flex min-w-0 items-center justify-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm">
      <Icon slot="nav.wallet" className="size-4 shrink-0 text-accent" />
      {account ? (
        <span className="min-w-0 truncate">
          <strong>{formatGiay(account.units)}</strong>
          {left != null && turn && (
            <>
              {" "}
              · <strong className="text-accent">Còn khoảng {formatMinutes(left)}</strong>
              {!exactRate ? " (theo gói rẻ nhất)" : ""}
            </>
          )}
          {!turn && <span className="text-muted"> · đang dùng key của bạn</span>}
        </span>
      ) : (
        <span className="text-muted">Đang đọc Token dịch…</span>
      )}
    </section>
  );
}

/** Ô ước tính cho video đang chọn, đặt trên nút bắt đầu. Chỉ có ý nghĩa khi trả theo lượt. */
export function MoneyEstimate({ money }: { money: MoneyView }) {
  const { on, account, secs, estimate, phase } = money;
  if (!on || !account) return null;
  // Đang chạy: số dư lên xuống vì giữ rồi trả từng phần, ước tính lúc này chỉ gây hiểu lầm (v5.31.2).
  if (phase === "running") return null;
  // Ước tính chi tiết nằm ở bước cuối «Tải và dịch». Màn chính chỉ hiện khi số dư không đủ, để khỏi chiếm chỗ.
  if (!estimate || estimate.enough) return null;
  const parts = estimate.asrHold && estimate.chatHold;
  return (
    <section aria-label="Ước tính Token dịch" className="rounded-[var(--radius-card)] border border-line bg-card p-3 text-sm">
      <p className="text-danger" role="status" data-money-short>
        {estimate.part === "chat" ? (
          <>
            Đã nhận dạng xong. Phần dịch cần giữ khoảng <strong>{formatGiay(estimate.hold)}</strong>, thiếu {formatGiay(estimate.short)}. Mua thêm Token dịch ở Ví rồi bấm Tiếp tục.
          </>
        ) : parts ? (
          <>
            Video {fmt(secs)}: nhận dạng giữ khoảng {formatGiay(estimate.asrHold!)}, dịch giữ khoảng {formatGiay(estimate.chatHold!)} (giữ lần lượt, xong phần nào trả phần thừa phần đó). Còn thiếu khoảng {formatGiay(estimate.short)}. Hãy mua Token dịch ở Ví.
          </>
        ) : (
          <>
            Video {fmt(secs)}: cần giữ khoảng <strong>{formatGiay(estimate.hold)}</strong>, thiếu {formatGiay(estimate.short)}. Hãy mua Token dịch ở Ví.
          </>
        )}
      </p>
    </section>
  );
}

/**
 * Thẻ Token dịch cho cửa trả theo lượt: số còn và ước tính cho video đang chọn.
 * Dùng khi đã có bản dịch (không còn màn hình đầu). Màn hình đầu dùng useMoney riêng.
 */
export function MoneyCard(props: MoneyInput) {
  const money = useMoney(props);
  if (!money.on) return null;
  return (
    <div className="grid gap-2">
      <MoneyBalance money={money} turn />
      <MoneyEstimate money={money} />
    </div>
  );
}
