/**
 * Hàng model trong bảng Admin «Model khách được chọn khi thuê phòng».
 * Dựng từ danh mục chung (model-catalog.ts) cộng model key phòng gọi được, thay bảng viết tay từng nhà.
 * Chỉ liệt kê loại model mà cửa Thuê phòng THẬT SỰ chặn được hôm nay: nhận dạng và dịch (rentUseProblem), giọng Orpheus và ElevenLabs (rentVoiceProblem, chặn ở narration.ts và cửa /api/room-elevenlabs).
 * Giọng Aura (Deepgram) chỉ trả bằng Token dịch nên không có ô tick. Dịch trực tiếp có bảng riêng (live-show.ts).
 */
import { catalogFor, modelKindOf, type ModelKind } from "./sub/model-catalog.ts";
import { roomListHas } from "./sub/key-list.ts";
import { PROVIDERS, type ProviderId } from "./sub/provider.ts";

export type RentRow = {
  id: string;
  name: string;
  /** true: key phòng gọi được · false: key phòng không thấy model này (chỉ nhà đã kiểm danh sách) · null: chưa đồng bộ key phòng hoặc chưa chắc */
  onKey: boolean | null;
};

/** Loại model cửa Thuê phòng chặn được, theo khả năng nhà khai. Kiểm duyệt (guard) đi cùng dịch như bảng cũ. */
export function rentKindsOf(house: ProviderId): Set<ModelKind> {
  const kinds = new Set<ModelKind>();
  const caps = PROVIDERS[house].caps;
  if (caps.includes("asr")) kinds.add("asr");
  if (caps.includes("chat")) {
    kinds.add("chat");
    kinds.add("guard");
  }
  // Giọng đọc chặn được khi dùng key khách: Orpheus (Groq) và ElevenLabs. Aura (Deepgram) chỉ trả bằng Token dịch.
  if ((house === "groq" || house === "elevenlabs") && caps.includes("tts")) kinds.add("tts");
  return kinds;
}

/** Model đã biết của nhà (theo danh mục) rồi tới model lạ trên key phòng (xếp theo tên). Mỗi model một hàng. */
export function rentRowsFor(house: ProviderId, keyModels: string[] | null): RentRow[] {
  const kinds = rentKindsOf(house);
  const onKey = (id: string) => roomListHas(house, id, keyModels);
  const rows: RentRow[] = catalogFor(house)
    .filter((model) => kinds.has(model.kind))
    .map((model) => ({ id: model.id, name: model.label, onKey: onKey(model.id) }));
  const seen = new Set(rows.map((row) => row.id));
  const extra = (keyModels ?? [])
    .filter((id) => !seen.has(id) && /^[a-z0-9./_-]{2,80}$/i.test(id))
    .filter((id) => {
      const kind = modelKindOf(house, id);
      return kind !== null && kinds.has(kind);
    })
    .sort((a, b) => a.localeCompare(b));
  for (const id of extra) {
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push({ id, name: id, onKey: true });
  }
  return rows;
}
