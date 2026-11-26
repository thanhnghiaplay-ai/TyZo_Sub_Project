import { useEffect, useState } from "react";
import { pushToast } from "@/components/toast";
import { getPolishModels, savePolishModels } from "@/lib/polish/polish-room";
import { getProviderKey } from "@/lib/provider-room";
import { POLISH_POOLS, POLISH_POOL_HINT, POLISH_POOL_LABEL, polishRows, type PolishModels } from "@/lib/polish/polish-models";

function toggle(list: string[], id: string, on: boolean) {
  return on ? [...new Set([...list, id])] : list.filter((item) => item !== id);
}

/** Chủ chọn model trau chuốt: một danh sách có kiểm duyệt (thể loại thường), một danh sách không kiểm duyệt (thể loại 18+). */
export function PolishModelBoard() {
  const [models, setModels] = useState<PolishModels>({ censored: [], uncensored: [] });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [keyModels, setKeyModels] = useState<string[] | null>(null);

  useEffect(() => {
    void getProviderKey({ data: "groq" })
      .then((next) => setKeyModels(next.models))
      .catch(() => setKeyModels(null));
    void getPolishModels()
      .then((next) => {
        if (next) {
          setModels(next);
          setSaved(true);
        }
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được danh sách trau chuốt.", "bad"));
  }, []);

  const rows = polishRows(keyModels);

  function save() {
    setBusy(true);
    void savePolishModels({ data: models })
      .then((next) => {
        setModels(next);
        setSaved(true);
        pushToast("Đã lưu model trau chuốt.");
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được danh sách.", "bad"))
      .finally(() => setBusy(false));
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm text-muted">
          Khách trau chuốt bản dịch sau khi dịch xong. Thể loại thường chỉ thấy danh sách «Có kiểm duyệt»; thể loại gắn nhãn 18+ chỉ thấy danh sách
          «Không kiểm duyệt». Mỗi model hiện kèm giá Token dịch ước cho khách chọn. Chỉ có model dịch (chat) của Groq; model nhận dạng và giọng đọc không nằm ở đây.
          Muốn thấy thêm model, lưu key Groq của phòng ở mục Nhà cung cấp.
        </p>
        <p className="text-xs text-muted">{saved ? "Đã có danh sách. Danh sách trống thì thể loại đó chưa trau chuốt được." : "Chưa lưu. Khách chưa trau chuốt được cho đến khi bạn bấm Lưu."}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {POLISH_POOLS.map((pool) => (
          <div key={pool} className="grid content-start gap-2">
            <div>
              <p className="text-sm font-medium">{POLISH_POOL_LABEL[pool]}</p>
              <p className="text-xs text-muted">{POLISH_POOL_HINT[pool]}</p>
            </div>
            {rows.map((row) => (
              <label key={row.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={models[pool].includes(row.id)} onChange={(event) => setModels((current) => ({ ...current, [pool]: toggle(current[pool], row.id, event.target.checked) }))} />
                <span>{row.name}</span>
                {row.onKey === false && <span className="text-xs text-muted">(key phòng không thấy)</span>}
              </label>
            ))}
          </div>
        ))}
      </div>
      <button type="button" className="min-tap w-fit rounded-[var(--radius-ctl)] bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-50" disabled={busy} onClick={save}>
        Lưu model trau chuốt
      </button>
    </section>
  );
}
