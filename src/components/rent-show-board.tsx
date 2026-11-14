import { useEffect, useState } from "react";
import { pushToast } from "@/components/toast";
import { getRentShow, saveRentShow, type RentShow } from "@/lib/rent-show";
import { ALIBABA_ROWS } from "@/lib/sub/alibaba-catalog";
import { ASR_MODELS, CHAT_MODELS } from "@/lib/sub/models";
import { asrHouse } from "@/lib/sub/asr-house";

const GROQ_ROWS = [
  ...ASR_MODELS.filter((row) => asrHouse(row.id) === "groq").map((row) => ({ id: row.id, name: row.name })),
  ...CHAT_MODELS.map((row) => ({ id: row.id, name: row.name })),
];

const ALI_ROWS = ALIBABA_ROWS.filter((row) => asrHouse(row.id) === "alibaba").map((row) => ({ id: row.id, name: row.id }));

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
  const [show, setShow] = useState<RentShow>({ groq: [], alibaba: [] });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

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
          Khách dùng key của họ. Chỉ model được đánh dấu mới chọn được. Whisper cần key Groq. Filetrans cần key Alibaba.
          Dịch khi thuê phòng vẫn là model Groq. Dịch bằng Alibaba chưa chạy.
        </p>
        <p className="text-xs text-muted">{saved ? "Đã có danh sách. Bỏ hết dấu rồi lưu thì khách không chọn được model nào." : "Chưa lưu. Khách vẫn chọn như trước cho đến khi bạn bấm Lưu."}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid content-start gap-2">
        <p className="text-sm font-medium">Groq</p>
        {GROQ_ROWS.map((row) => (
          <label key={row.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={show.groq.includes(row.id)} onChange={(event) => setShow((current) => ({ ...current, groq: toggle(current.groq, row.id, event.target.checked) }))} />
            {row.name}
          </label>
        ))}
      </div>
      <div className="grid content-start gap-2">
        <p className="text-sm font-medium">Alibaba</p>
        {ALI_ROWS.map((row) => (
          <label key={row.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={show.alibaba.includes(row.id)} onChange={(event) => setShow((current) => ({ ...current, alibaba: toggle(current.alibaba, row.id, event.target.checked) }))} />
            {row.name}
          </label>
        ))}
      </div>
      </div>
      <button type="button" className="min-tap w-fit rounded-xl bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-50" disabled={busy} onClick={save}>
        Lưu danh sách thuê phòng
      </button>
    </section>
  );
}
