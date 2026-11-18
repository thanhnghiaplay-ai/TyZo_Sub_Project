import { useEffect, useState } from "react";
import { pushToast } from "@/components/toast";
import { getModelPrices, reloadModelPrices, saveDeepgramPriceConfig, saveUsdFix, type ModelPriceRow } from "@/lib/usd-fix-room";
import { type UsdFix, type UsdSlot } from "@/lib/usd-fix";
import { groupByHouse, houseSourceLine, isPulledHouse, type PulledHouse } from "@/lib/price-house";

function show(n: number | null) {
  return n == null ? "" : String(n);
}

function pack(draft: Record<string, UsdSlot>): UsdFix {
  const out: UsdFix = {};
  for (const [id, slot] of Object.entries(draft)) {
    if (slot.hour || slot.inn || slot.out || slot.chars) out[id] = slot;
  }
  return out;
}

type Draft = { hour: string; inn: string; out: string; chars: string };
type DgState = { auto: boolean; everyHours: string; at: number | null };

export function ModelUsdBoard() {
  const [rows, setRows] = useState<ModelPriceRow[]>([]);
  const [rate, setRate] = useState<number | null>(null);
  const [text, setText] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [dg, setDg] = useState<DgState>({ auto: true, everyHours: "6", at: null });
  const [dgSaved, setDgSaved] = useState<{ auto: boolean; everyHours: string }>({ auto: true, everyHours: "6" });

  function take(next: { rate: number | null; rows: ModelPriceRow[]; deepgram?: { auto: boolean; everyHours: number; at: number | null } }) {
    if (next.deepgram) {
      const state = { auto: next.deepgram.auto, everyHours: String(next.deepgram.everyHours) };
      setDg({ ...state, at: next.deepgram.at });
      setDgSaved(state);
    }
    setRate(next.rate);
    setRows(next.rows);
    const slots: Record<string, Draft> = {};
    for (const row of next.rows) {
      slots[row.id] = { hour: show(row.fix.hour), inn: show(row.fix.inn), out: show(row.fix.out), chars: show(row.fix.chars) };
    }
    setText(slots);
  }

  useEffect(() => {
    void getModelPrices()
      .then(take)
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được giá model.", "bad"));
  }, []);

  function setField(id: string, key: keyof Draft, value: string) {
    setText((current) => {
      const prev = current[id] ?? { hour: "", inn: "", out: "", chars: "" };
      return { ...current, [id]: { ...prev, [key]: value } };
    });
  }

  /** Một chỗ lưu cho cả bảng: số đô la sửa tay, và cách cập nhật Deepgram nếu có đổi. */
  async function saveAll() {
    const draft: Record<string, UsdSlot> = {};
    for (const [id, slot] of Object.entries(text)) {
      draft[id] = { hour: num(slot.hour), inn: num(slot.inn), out: num(slot.out), chars: num(slot.chars) };
    }
    const dgChanged = dg.auto !== dgSaved.auto || dg.everyHours !== dgSaved.everyHours;
    const hours = Number(dg.everyHours);
    if (dgChanged && !(Number.isInteger(hours) && hours >= 1 && hours <= 168)) {
      pushToast("Chu kỳ lấy lại phải từ 1 đến 168 giờ.", "bad");
      return;
    }
    setBusy(true);
    try {
      if (dgChanged) await saveDeepgramPriceConfig({ data: { auto: dg.auto, everyHours: hours } });
      const next = await saveUsdFix({ data: pack(draft) });
      take(next);
      pushToast("Đã lưu giá.");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Chưa lưu được.", "bad");
    } finally {
      setBusy(false);
    }
  }

  function reload(house: PulledHouse) {
    setBusy(true);
    void reloadModelPrices({ data: { house } })
      .then((next) => {
        take(next);
        pushToast(`Đã lấy lại giá ${house}.`);
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lấy lại được giá.", "bad"))
      .finally(() => setBusy(false));
  }

  const groups = groupByHouse(rows);

  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <p className="text-sm font-medium">Giá từng model</p>
        <p className="text-xs text-muted">
          Ô trống thì dùng số của nhà{rate ? ` (tỷ giá ${new Intl.NumberFormat("vi-VN").format(Math.round(rate))} đ)` : ""}. Gõ số chỉ khi bảng sai. Không phải giá bán riêng. Token dịch tính so với một giờ Turbo.
        </p>
      </div>
      {groups.map((group) => (
        <section key={group.house} className="grid gap-2 rounded-[var(--radius-ctl)] border border-line px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">{group.house}</p>
            {group.pulled && isPulledHouse(group.house) && (
              <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-3 text-sm disabled:opacity-40" onClick={() => reload(group.house as PulledHouse)}>
                Lấy lại
              </button>
            )}
          </div>
          <p className="text-xs text-muted">
            {houseSourceLine(group)}
            {group.house === "Deepgram" && (dg.at ? ` Lần lấy gần nhất: ${new Date(dg.at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.` : " Chưa lấy lần nào, đang dùng giá dự phòng.")}
          </p>
          {group.house === "Deepgram" && (
            <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={dg.auto} onChange={(event) => setDg((cur) => ({ ...cur, auto: event.target.checked }))} />
                Tự cập nhật theo trang giá
              </label>
              <UsdField label="Chu kỳ lấy lại (giờ, 1 đến 168)" placeholder="6" value={dg.everyHours} onChange={(value) => setDg((cur) => ({ ...cur, everyHours: value.replace(/\D/g, "") }))} />
            </div>
          )}
          <ul className="grid gap-2">
            {group.rows.map((row) => {
              const slot = text[row.id] ?? { hour: "", inn: "", out: "", chars: "" };
              return (
                <li key={row.id} className="grid gap-1 border-t border-line pt-2 first:border-t-0 first:pt-0">
                  <p className="text-sm font-medium">{row.name}</p>
                  <p className="text-xs text-muted">{row.tokens}</p>
                  {row.kind === "hour" && <UsdField label="Đô la mỗi giờ" placeholder={show(row.auto.hour)} value={slot.hour} onChange={(value) => setField(row.id, "hour", value)} />}
                  {row.kind === "chars" && <UsdField label="Đô la mỗi triệu ký tự" placeholder={show(row.auto.chars)} value={slot.chars} onChange={(value) => setField(row.id, "chars", value)} />}
                  {row.kind === "chat" && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <UsdField label="Đô la vào, mỗi triệu token" placeholder={show(row.auto.inn)} value={slot.inn} onChange={(value) => setField(row.id, "inn", value)} />
                      <UsdField label="Đô la ra, mỗi triệu token" placeholder={show(row.auto.out)} value={slot.out} onChange={(value) => setField(row.id, "out", value)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <button type="button" disabled={busy || rows.length === 0} className="min-tap w-fit rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40" onClick={() => void saveAll()}>
        Lưu số đô la
      </button>
    </div>
  );
}

function num(value: string): number | null {
  const raw = value.trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function UsdField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs text-muted">
      {label}
      <input
        inputMode="decimal"
        placeholder={placeholder || "Chưa có"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 text-sm text-fg outline-none"
      />
    </label>
  );
}
