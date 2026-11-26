/**
 * Ô chọn "Nhận dạng giọng" phía khách, sinh từ danh mục model chung (không viết tay từng model).
 * Hàm thuần: trả cho mỗi model nhận dạng một trạng thái; chữ hiển thị do giao diện quyết định.
 *  - room: đang ở cửa Trả theo lượt (hiện giá bằng Token dịch; model bị giữ thì khóa). Mọi nhà chạy cửa này từ v5.1.2
 *  - closed: Thuê phòng, Chủ chưa mở model này
 *  - noKey: Chủ đã mở nhưng key của khách không có model này (chỉ khi danh sách key của nhà đáng tin, xem key-list.ts)
 *  - open: dùng được
 */
import { keyListHas } from "./sub/key-list.ts";
import { catalogFor } from "./sub/model-catalog.ts";
import { PROVIDER_IDS, type ProviderId } from "./sub/provider.ts";

type AsrPickState = "room" | "closed" | "noKey" | "open";
export type AsrPickRow = { id: string; name: string; house: ProviderId; state: AsrPickState; disabled: boolean };

export function asrPickerRows(input: {
  showRoomPrice: boolean;
  /** Danh sách Chủ mở theo nhà; null = chưa lưu, không khóa. */
  allow: Partial<Record<ProviderId, string[] | null>>;
  /** Cửa Trả theo lượt: model nào đang bị giữ (chưa có giá). */
  roomHeld: (id: string) => boolean;
  /** Danh sách model trên key của khách, theo nhà (null/thiếu = chưa biết). */
  keyModels?: Partial<Record<ProviderId, string[] | null>>;
}): AsrPickRow[] {
  const rows: AsrPickRow[] = [];
  for (const house of PROVIDER_IDS) {
    if (house === "tyzo-modal" && !input.showRoomPrice) continue;
    for (const model of catalogFor(house, "asr")) {
      const allow = input.allow[house] ?? null;
      const open = !allow || allow.includes(model.id);
      let state: AsrPickState;
      let disabled: boolean;
      if (input.showRoomPrice) {
        state = "room";
        disabled = input.roomHeld(model.id);
      } else {
        const onKey = open ? keyListHas(house, model.id, input.keyModels?.[house]) : null;
        state = !open ? "closed" : onKey === false ? "noKey" : "open";
        disabled = state !== "open";
      }
      rows.push({ id: model.id, name: model.label, house, state, disabled });
    }
  }
  return rows;
}
