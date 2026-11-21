import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import type { MoneyView } from "@/components/money-card";
import { formatMinutes } from "@/lib/wallet-view";
import { formatGiay } from "@/lib/token-math";
import { TRIAL_MINUTES } from "@/lib/room-plans";
import type { PayChoice, PayState, RentAccess } from "@/lib/pay-status";

const BTN = "min-tap inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm font-medium hover:border-accent focus-visible:ring-2 focus-visible:ring-accent";
const MAIN = "min-tap inline-flex items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-ink focus-visible:ring-2 focus-visible:ring-accent";

function accessText(access: Exclude<RentAccess, { kind: "none" }>): string {
  if (access.kind === "trial") return `Dùng thử: còn ${access.left} tệp, tối đa ${TRIAL_MINUTES} phút`;
  return `Thuê phòng còn đến ${new Date(access.until).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`;
}

/**
 * Dòng cách trả ở đầu trang chủ (thay thanh số dư cũ và hai chip «Key của tôi / Nhập key»).
 * Mỗi trạng thái nói rõ đang dùng gì và bước tiếp theo; chưa chọn thì hai cách đứng ngang hàng.
 */
export function PayStatusBar({
  state,
  money,
  onChoose,
  onAddKey,
  onWallet,
  onRetry,
  onPickPack,
}: {
  /** Mở bước cuối có danh sách gói trả theo lượt (v5.32.4). */
  onPickPack?: () => void;
  state: PayState;
  money: MoneyView;
  /** remember=false: chỉ đổi cho lần này, không đổi lựa chọn đã nhớ. */
  onChoose: (choice: PayChoice | null, remember: boolean) => void;
  onAddKey: () => void;
  onWallet: () => void;
  onRetry: () => void;
}) {
  if (!money.on) return null;
  const shell = "grid gap-2 rounded-[var(--radius-card)] border border-line bg-card px-4 py-3 text-sm";

  if (state.kind === "reading") {
    return <section aria-label="Cách trả" data-pay-status="reading" className={shell + " text-muted"}>Đang đọc tài khoản…</section>;
  }
  if (state.kind === "failed") {
    return (
      <section aria-label="Cách trả" data-pay-status="failed" className={shell}>
        <p>Chưa đọc được tài khoản (mạng hoặc máy chủ đang bận).</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BTN} onClick={onRetry}>Thử lại</button>
        </div>
      </section>
    );
  }
  if (state.kind === "choose") {
    return (
      <section aria-label="Chọn cách trả" data-pay-status="choose" className={shell}>
        <p className="font-semibold">Bạn muốn trả thế nào?</p>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          <button type="button" className="min-tap grid gap-0.5 rounded-[var(--radius-ctl)] border border-line bg-bg px-3 py-2 text-left hover:border-accent" onClick={() => onChoose("key", true)}>
            <span className="font-semibold">Dùng key AI của tôi</span>
            <span className="text-xs text-muted">Thuê phòng theo ngày, tuần, tháng. Cước AI trả bằng key của bạn.</span>
          </button>
          <button type="button" className="min-tap grid gap-0.5 rounded-[var(--radius-ctl)] border border-line bg-bg px-3 py-2 text-left hover:border-accent" onClick={() => onChoose("turn", true)}>
            <span className="font-semibold">Trả theo lượt bằng Token</span>
            <span className="text-xs text-muted">Không cần key. Mua Token dịch, dùng tới đâu trừ tới đó.</span>
          </button>
        </div>
      </section>
    );
  }
  if (state.kind === "key-ready") {
    return (
      <section aria-label="Cách trả" data-pay-status="key-ready" className={shell + " flex flex-wrap items-center justify-between"}>
        <span className="flex min-w-0 items-center gap-2">
          <Icon slot="ui.key" className="size-4 shrink-0 text-accent" />
          <span className="min-w-0">
            <strong>Key của bạn</strong> · {accessText(state.access)} · <span className="text-muted">{state.keys.join(", ")}</span>
          </span>
        </span>
        <span className="flex gap-2">
          <button type="button" className={BTN} onClick={onAddKey}>Sửa key</button>
          <button type="button" className={BTN} onClick={() => onChoose(null, false)}>Đổi cách trả</button>
        </span>
      </section>
    );
  }
  if (state.kind === "key-none") {
    return (
      <section aria-label="Cách trả" data-pay-status="key-none" className={shell}>
        <p>
          <strong>{accessText(state.access)}</strong>, nhưng bạn chưa thêm key AI nào.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/huong-dan" hash="key-groq" className={BTN}>Lấy key (hướng dẫn)</Link>
          <button type="button" className={MAIN} onClick={onAddKey}>Thêm key</button>
          {state.turnOpen && (
            <button type="button" className={BTN} onClick={() => onChoose("turn", false)}>Dùng Token lần này</button>
          )}
          {state.turnOpen && (
            <button type="button" className={BTN + " text-muted"} onClick={() => onChoose(null, false)}>Đổi cách trả</button>
          )}
        </div>
      </section>
    );
  }
  if (state.kind === "key-expired") {
    return (
      <section aria-label="Cách trả" data-pay-status="key-expired" className={shell}>
        <p><strong>Gói thuê phòng đã hết hạn.</strong> Gia hạn để dùng key của bạn{state.turnOpen ? ", hoặc trả theo lượt bằng Token dịch" : ""}.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={MAIN} onClick={onWallet}>Gia hạn</button>
          {state.turnOpen && (
            <button type="button" className={BTN} onClick={() => onChoose("turn", false)}>Dùng Token lần này</button>
          )}
          {state.turnOpen && (
            <button type="button" className={BTN + " text-muted"} onClick={() => onChoose(null, false)}>Đổi cách trả</button>
          )}
        </div>
      </section>
    );
  }
  if (state.kind === "turn-empty") {
    return (
      <section aria-label="Cách trả" data-pay-status="turn-empty" className={shell}>
        <p><strong>Hết Token dịch.</strong> Mua thêm để trả theo lượt, hoặc dùng key AI của bạn.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={MAIN} onClick={onWallet}>Mua Token dịch</button>
          <button type="button" className={BTN} onClick={() => onChoose("key", true)}>Dùng key của tôi</button>
        </div>
      </section>
    );
  }
  const need = money.estimate?.hold ?? null;
  return (
    <section aria-label="Cách trả" data-pay-status="turn" className={shell}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <Icon slot="nav.wallet" className="size-4 shrink-0 text-accent" />
          <span className="min-w-0">
            <strong>Trả theo lượt</strong> · còn {formatGiay(state.units)}
            {money.left != null && <> · khoảng {formatMinutes(money.left)}{!money.exactRate ? " (theo gói rẻ nhất)" : ""}</>}
          </span>
        </span>
        <span className="flex gap-2">
          <button type="button" className={BTN} onClick={onWallet}>Mua thêm</button>
          <button type="button" className={BTN} onClick={() => onChoose(null, false)}>Đổi cách trả</button>
        </span>
      </div>
      {money.packCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2" data-pay-pack>
          <span className="min-w-0">
            {money.pack ? (
              <>
                Gói: <strong>{money.pack.name}</strong>
                {need != null && money.secs > 0 && <> · video này cần giữ khoảng {formatGiay(need)}</>}
              </>
            ) : (
              <span className="text-warning">Chưa chọn gói trả theo lượt.</span>
            )}
          </span>
          {onPickPack && (
            <button type="button" className={money.pack ? BTN : MAIN} onClick={onPickPack}>
              {money.pack ? "Đổi gói" : "Chọn gói"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
