import { useEffect, useState } from "react";
import { pushToast } from "@/components/toast";
import { getModelPrices, reloadModelPrices, saveUsdFix, type ModelPriceRow } from "@/lib/usd-fix-room";
import { type UsdFix, type UsdSlot } from "@/lib/usd-fix";
import { groupByHouse, houseHeadline, houseSourceLine, isPulledHouse, toggleHouse, type PulledHouse } from "@/lib/price-house";

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

export function ModelUsdBoard() {
  const [rows, setRows] = useState<ModelPriceRow[]>([]);
  const [rate, setRate] = useState<number | null>(null);
  const [text, setText] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  // Nhà đang mở. Mặc định rỗng: mọi nhà thu gọn. Ô đang sửa vẫn giữ trong `text` khi thu lại.
  const [openHouses, setOpenHouses] = useState<string[]>([]);

  function take(next: { rate: number | null; rows: ModelPriceRow[] }) {
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

  /** Một chỗ lưu cho cả bảng: số đô la sửa tay. */
  async function saveAll() {
    const draft: Record<string, UsdSlot> = {};
    for (const [id, slot] of Object.entries(text)) {
      draft[id] = { hour: num(slot.hour), inn: num(slot.inn), out: num(slot.out), chars: num(slot.chars) };
    }
    setBusy(true);
    try {
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
      {groups.length > 1 && (
        <button
          type="button"
          className="min-tap w-fit rounded-full border border-line px-3 text-sm"
          onClick={() => setOpenHouses(openHouses.length >= groups.length ? [] : groups.map((group) => group.house))}
        >
          {openHouses.length >= groups.length ? "Thu hết" : "Mở hết"}
        </button>
      )}
      {groups.map((group) => {
        const open = openHouses.includes(group.house);
        return (
        <section key={group.house} className="grid gap-2 rounded-[var(--radius-ctl)] border border-line px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="min-tap flex min-w-0 flex-1 items-center gap-2 text-left"
              aria-expanded={open}
              onClick={() => setOpenHouses((current) => toggleHouse(current, group.house))}
            >
              <span aria-hidden className="text-xs text-muted">{open ? "▾" : "▸"}</span>
              <span className="text-sm font-semibold">{group.house}</span>
              <span className="text-xs text-muted">{houseHeadline(group)}</span>
            </button>
            {open && group.pulled && isPulledHouse(group.house) && (
              <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-3 text-sm disabled:opacity-40" onClick={() => reload(group.house as PulledHouse)}>
                Lấy lại
              </button>
            )}
          </div>
          {open && (
            <>
          <p className="text-xs text-muted">
            {houseSourceLine(group)}
          </p>
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
            </>
          )}
        </section>
        );
      })}
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
