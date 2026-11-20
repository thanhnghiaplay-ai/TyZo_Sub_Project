import { useEffect, useMemo, useState } from "react";
import { pushToast } from "@/components/toast";
import { askConfirm } from "@/lib/confirm";
import { dong, formatMoney, parseMoney } from "@/lib/money-format";
import { describePlanPrices, planPricesProblem, plansWith, type PlanPrices } from "@/lib/room-plan-prices";
import { ROOM_PLANS, TRIAL_FILES, TRIAL_MINUTES, type RoomPlanId } from "@/lib/room-plans";
import { resetRoomPlanPrices, saveRoomPlanPrices } from "@/lib/room-plans-room";
import { PLANS_CHANGED, useRoomPlans } from "@/lib/use-room-plans";

type Draft = Record<RoomPlanId, { price: string; strike: string }>;

function toDraft(plans: ReturnType<typeof plansWith>): Draft {
  return Object.fromEntries(plans.map((plan) => [plan.id, { price: formatMoney(plan.price), strike: plan.strike === null ? "" : formatMoney(plan.strike) }])) as Draft;
}

function fromDraft(draft: Draft): PlanPrices {
  return Object.fromEntries(
    ROOM_PLANS.map((plan) => {
      const item = draft[plan.id];
      const strike = parseMoney(item.strike);
      return [plan.id, { price: parseMoney(item.price), strike: item.strike.trim() && strike > 0 ? strike : null }];
    }),
  ) as PlanPrices;
}

/**
 * Chủ chỉnh GIÁ và GIÁ GẠCH của gói thuê phòng. Tên gói và số giờ cố định (đơn cũ, hạn của khách và điều khoản dựa vào đó).
 * Giá đổi thì trang gói, ví, điều khoản và hướng dẫn đổi theo. Đơn khách đã đặt trước đó giữ đúng giá lúc đặt.
 */
export function RoomPlansView() {
  const saved = useRoomPlans();
  const [draft, setDraft] = useState<Draft>(() => toDraft(saved));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!dirty) setDraft(toDraft(saved));
  }, [saved, dirty]);

  const next = useMemo(() => fromDraft(draft), [draft]);
  const problem = planPricesProblem(next);
  const before = useMemo(() => Object.fromEntries(saved.map((plan) => [plan.id, { price: plan.price, strike: plan.strike }])) as PlanPrices, [saved]);
  const changed = describePlanPrices(before, next) !== "Lưu lại, không đổi giá.";
  const preview = plansWith(problem ? null : next);

  const patch = (id: RoomPlanId, field: "price" | "strike", value: string) => {
    setDirty(true);
    setDraft((current) => ({ ...current, [id]: { ...current[id], [field]: value.replace(/[^\d.]/g, "") } }));
  };

  async function save() {
    if (problem || !changed) return;
    const ok = await askConfirm({
      title: "Đổi giá thuê phòng?",
      text: `${describePlanPrices(before, next)}\n\nKhách thấy giá mới ngay ở trang gói, ví, điều khoản và hướng dẫn. Đơn khách đã đặt trước vẫn giữ giá cũ.`,
      confirmLabel: "Lưu giá mới",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await saveRoomPlanPrices({ data: next });
      setDirty(false);
      window.dispatchEvent(new Event(PLANS_CHANGED));
      pushToast("Đã lưu giá thuê phòng.");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Chưa lưu được giá.", "bad");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    const ok = await askConfirm({
      title: "Về giá mặc định?",
      text: "Xóa giá đã lưu, dùng lại giá có sẵn trong app. Đơn khách đã đặt trước vẫn giữ giá lúc đặt.",
      confirmLabel: "Về mặc định",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await resetRoomPlanPrices();
      setDirty(false);
      window.dispatchEvent(new Event(PLANS_CHANGED));
      pushToast("Đã về giá mặc định.");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Chưa đặt lại được.", "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-3">
      <p className="text-xs text-muted">
        Giá thuê phòng đặt tay, không tính từ Token dịch. Chỉ đổi được giá bán và giá gạch; tên gói và số giờ cố định. Số tiết kiệm tự tính (giá gạch trừ giá bán).
        Đơn khách đã đặt trước khi đổi giá vẫn giữ giá lúc đặt và vẫn được giao gói.
      </p>
      <div className="grid gap-2">
        {ROOM_PLANS.map((plan) => {
          const item = draft[plan.id];
          const shown = preview.find((row) => row.id === plan.id)!;
          return (
            <div key={plan.id} className="grid gap-2 rounded-[var(--radius-ctl)] border border-line px-3 py-2 sm:grid-cols-[6rem_1fr_1fr_auto] sm:items-center">
              <span className="text-sm font-medium">{plan.name}</span>
              <label className="grid gap-1 text-xs text-muted">
                Giá bán (đ)
                <input
                  inputMode="numeric"
                  className="min-tap rounded-[var(--radius-ctl)] border border-line bg-transparent px-2 text-sm text-fg"
                  value={item.price}
                  aria-label={`Giá bán gói ${plan.name}`}
                  onChange={(event) => patch(plan.id, "price", event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted">
                Giá gạch (đ, bỏ trống nếu không có)
                <input
                  inputMode="numeric"
                  className="min-tap rounded-[var(--radius-ctl)] border border-line bg-transparent px-2 text-sm text-fg"
                  value={item.strike}
                  aria-label={`Giá gạch gói ${plan.name}`}
                  onChange={(event) => patch(plan.id, "strike", event.target.value)}
                />
              </label>
              <span className="text-xs text-muted">{!problem && shown.save !== null ? `Tiết kiệm ${dong(shown.save)}` : "Không giá gạch"}</span>
            </div>
          );
        })}
      </div>
      {problem ? <p className="text-sm text-danger" role="alert">{problem}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-tap rounded-[var(--radius-ctl)] bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-50"
          disabled={busy || Boolean(problem) || !changed}
          onClick={() => void save()}
        >
          Lưu giá thuê phòng
        </button>
        <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line px-3 text-sm disabled:opacity-50" disabled={busy} onClick={() => void reset()}>
          Về giá mặc định
        </button>
      </div>
      <p className="text-xs text-muted">Dùng thử: {TRIAL_FILES} tệp, tối đa {TRIAL_MINUTES} phút.</p>
    </section>
  );
}
