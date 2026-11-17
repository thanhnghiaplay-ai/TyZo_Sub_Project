import { useEffect, useState } from "react";
import { pushToast } from "@/components/toast";
import { getRentShow, saveRentShow, type RentShow } from "@/lib/rent-show";
import { getProviderKey } from "@/lib/provider-room";
import { rentRowsFor } from "@/lib/rent-rows";
import { PROVIDER_LABEL, PROVIDER_IDS, type ProviderId } from "@/lib/sub/provider";

export function useRentShow() {
  const [show, setShow] = useState<RentShow | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void getRentShow()
      .then((next) => setShow(next))
      .catch(() => setShow(null))
      .finally(() => setReady(true));
  }, []);
  return { show, ready };
}

function toggle(list: string[], id: string, on: boolean) {
  return on ? [...new Set([...list, id])] : list.filter((item) => item !== id);
}

/** Chủ chọn model khách được dùng khi thuê phòng bằng key của họ. */
export function RentShowBoard() {
  const [show, setShow] = useState<RentShow>(() => Object.fromEntries(PROVIDER_IDS.map((id) => [id, [] as string[]])) as RentShow);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Model key phòng của từng nhà gọi được. Thiếu = nhà đó chưa lưu key phòng hoặc chưa đọc được. */
  const [roomModels, setRoomModels] = useState<Partial<Record<ProviderId, string[] | null>>>({});

  useEffect(() => {
    for (const id of PROVIDER_IDS) {
      void getProviderKey({ data: id })
        .then((next) => setRoomModels((current) => ({ ...current, [id]: next.models })))
        .catch(() => setRoomModels((current) => ({ ...current, [id]: null })));
    }
  }, []);

  useEffect(() => {
    void getRentShow()
      .then((next) => {
        if (next) {
          setShow(next);
          setSaved(true);
        }
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được danh sách thuê phòng.", "bad"));
  }, []);

  function save() {
    setBusy(true);
    void saveRentShow({ data: show })
      .then((next) => {
        setShow(next);
        setSaved(true);
        pushToast("Đã lưu model thuê phòng.");
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được danh sách.", "bad"))
      .finally(() => setBusy(false));
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm text-muted">
          Khách dùng key của họ. Chỉ model được đánh dấu mới chọn được. Danh sách lấy từ model đã biết cộng model key phòng của từng nhà gọi được
          (lưu key phòng ở mục Key của phòng để thấy thêm model). Whisper cần key Groq. Filetrans cần key Alibaba. Nova-3 cần key Deepgram.
          Dịch khi thuê phòng vẫn là model Groq. Dịch bằng Alibaba hay Deepgram chưa chạy. Giọng Orpheus (Groq) có ô tick riêng: bỏ dấu thì khách key riêng không dùng được giọng đó. Giọng Aura chỉ trả bằng Token dịch nên không có ô. Dịch trực tiếp có bảng riêng.
        </p>
        <p className="text-xs text-muted">{saved ? "Đã có danh sách. Bỏ hết dấu rồi lưu thì khách không chọn được model nào." : "Chưa lưu. Khách vẫn chọn như trước cho đến khi bạn bấm Lưu."}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {PROVIDER_IDS.map((id) => {
          const rows = rentRowsFor(id, roomModels[id] ?? null);
          return (
            <div key={id} className="grid content-start gap-2">
              <p className="text-sm font-medium">{PROVIDER_LABEL[id]}</p>
              {rows.map((row) => (
                <label key={row.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={show[id].includes(row.id)} onChange={(event) => setShow((current) => ({ ...current, [id]: toggle(current[id], row.id, event.target.checked) }))} />
                  <span>{row.name}</span>
                  {row.onKey === false && <span className="text-xs text-muted">(key phòng không thấy)</span>}
                </label>
              ))}
            </div>
          );
        })}
      </div>
      <button type="button" className="min-tap w-fit rounded-[var(--radius-ctl)] bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-50" disabled={busy} onClick={save}>
        Lưu danh sách thuê phòng
      </button>
    </section>
  );
}
