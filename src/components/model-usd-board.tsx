import { useEffect, useState } from "react";
import { pushToast } from "@/components/toast";
import { getModelPrices, reloadModelPrices, saveDeepgramPriceConfig, saveUsdFix, type ModelPriceRow } from "@/lib/usd-fix-room";
import { type UsdFix, type UsdSlot } from "@/lib/usd-fix";

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

export function ModelUsdBoard() {
  const [rows, setRows] = useState<ModelPriceRow[]>([]);
  const [rate, setRate] = useState<number | null>(null);
  const [text, setText] = useState<Record<string, { hour: string; inn: string; out: string; chars: string }>>({});
  const [busy, setBusy] = useState(false);
  const [dg, setDg] = useState<{ auto: boolean; everyHours: string; at: number | null }>({ auto: true, everyHours: "6", at: null });

  function take(next: { rate: number | null; rows: ModelPriceRow[]; deepgram?: { auto: boolean; everyHours: number; at: number | null } }) {
    if (next.deepgram) setDg({ auto: next.deepgram.auto, everyHours: String(next.deepgram.everyHours), at: next.deepgram.at });
    setRate(next.rate);
    setRows(next.rows);
    const slots: Record<string, { hour: string; inn: string; out: string; chars: string }> = {};
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

  function setField(id: string, key: "hour" | "inn" | "out" | "chars", value: string) {
    setText((current) => {
      const prev = current[id] ?? { hour: "", inn: "", out: "", chars: "" };
      return { ...current, [id]: { ...prev, [key]: value } };
    });
  }

  function save() {
    const draft: Record<string, UsdSlot> = {};
    for (const [id, slot] of Object.entries(text)) {
      draft[id] = {
        hour: num(slot.hour),
        inn: num(slot.inn),
        out: num(slot.out),
        chars: num(slot.chars),
      };
    }
    setBusy(true);
    void saveUsdFix({ data: pack(draft) })
      .then((next) => {
        take(next);
        pushToast("Đã lưu số đô la tham chiếu.");
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được.", "bad"))
      .finally(() => setBusy(false));
  }

  function saveDg() {
    setBusy(true);
    void saveDeepgramPriceConfig({ data: { auto: dg.auto, everyHours: Number(dg.everyHours) } })
      .then(() => pushToast("Đã lưu cách cập nhật giá Deepgram."))
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được.", "bad"))
      .finally(() => setBusy(false));
  }

  function reload() {
    setBusy(true);
    void reloadModelPrices()
      .then((next) => {
        take(next);
        pushToast("Đã lấy lại bảng niêm yết.");
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lấy lại được bảng.", "bad"))
      .finally(() => setBusy(false));
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Giá từng model</p>
        <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-3 text-sm disabled:opacity-40" onClick={reload}>
          Lấy lại bảng
        </button>
      </div>
      <p className="text-xs text-muted">
        Số đô la tự lấy từ bảng niêm yết{rate ? ` · tỷ giá ${new Intl.NumberFormat("vi-VN").format(Math.round(rate))} đ` : ""}. Ô trống thì dùng số tự lấy. Gõ số chỉ khi bảng sai. Đây không phải giá bán riêng. Cột Token dịch tính từ số đang dùng, so với một giờ Turbo.
      </p>
      <div className="grid gap-2 rounded-[var(--radius-ctl)] border border-line px-3 py-2">
        <p className="text-sm font-medium">Giá Deepgram tự cập nhật</p>
        <p className="text-xs text-muted">
          Lấy từ deepgram.com/pricing (cột trả theo dùng, bỏ giá cũ bị gạch). Giá lệch quá 5 lần so với dự phòng thì bỏ. Số bạn gõ ở từng model bên dưới luôn thắng số tự lấy.
          {dg.at ? ` Lần lấy gần nhất: ${new Date(dg.at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.` : " Chưa lấy lần nào, đang dùng giá dự phòng."}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={dg.auto} onChange={(event) => setDg((cur) => ({ ...cur, auto: event.target.checked }))} />
          Tự cập nhật theo trang giá
        </label>
        <UsdField label="Chu kỳ lấy lại (giờ, 1 đến 168)" placeholder="6" value={dg.everyHours} onChange={(value) => setDg((cur) => ({ ...cur, everyHours: value.replace(/\D/g, "") }))} />
        <button type="button" disabled={busy} className="min-tap w-fit rounded-full border border-line px-3 text-sm disabled:opacity-40" onClick={saveDg}>
          Lưu cách cập nhật Deepgram
        </button>
      </div>
      <ul className="grid gap-2">
        {rows.map((row) => {
          const slot = text[row.id] ?? { hour: "", inn: "", out: "", chars: "" };
          return (
            <li key={row.id} className="grid gap-2 rounded-[var(--radius-ctl)] border border-line px-3 py-2">
              <p className="text-sm font-medium">{row.name} <span className="font-normal text-muted">· {row.house}</span></p>
              <p className="text-xs text-muted">{row.tokens}</p>
              {row.kind === "hour" && (
                <UsdField label="Đô la mỗi giờ" placeholder={show(row.auto.hour)} value={slot.hour} onChange={(value) => setField(row.id, "hour", value)} />
              )}
              {row.kind === "chars" && (
                <UsdField label="Đô la mỗi triệu ký tự" placeholder={show(row.auto.chars)} value={slot.chars} onChange={(value) => setField(row.id, "chars", value)} />
              )}
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
      <button type="button" disabled={busy || rows.length === 0} className="min-tap w-fit rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40" onClick={save}>
        Lưu số tham chiếu
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
