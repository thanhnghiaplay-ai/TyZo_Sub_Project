/**
 * Ô chọn "Nhận dạng giọng" phía khách, sinh từ danh mục model chung (không viết tay từng model).
 * Hàm thuần: trả cho mỗi model nhận dạng một trạng thái; chữ hiển thị do giao diện quyết định.
 *  - room: đang ở cửa Trả theo lượt (hiện giá phòng, Groq có thể bị giữ)
 *  - noRoom: nhà này chưa chạy cửa Trả theo lượt trên giao diện
 *  - closed: Thuê phòng, Chủ chưa mở model này
 *  - open: dùng được
 */
import { catalogFor } from "./sub/model-catalog.ts";
import { PROVIDER_IDS, type ProviderId } from "./sub/provider.ts";

export type AsrPickState = "room" | "noRoom" | "closed" | "open";
export type AsrPickRow = { id: string; name: string; house: ProviderId; state: AsrPickState; disabled: boolean };

export function asrPickerRows(input: {
  showRoomPrice: boolean;
  /** Danh sách Chủ mở theo nhà; null = chưa lưu, không khóa. */
  allow: Partial<Record<ProviderId, string[] | null>>;
  /** Cửa Trả theo lượt: model Groq nào đang bị giữ (chưa có giá). */
  roomHeld: (id: string) => boolean;
}): AsrPickRow[] {
  const rows: AsrPickRow[] = [];
  for (const house of PROVIDER_IDS) {
    for (const model of catalogFor(house, "asr")) {
      const allow = input.allow[house] ?? null;
      const open = !allow || allow.includes(model.id);
      let state: AsrPickState;
      let disabled: boolean;
      if (input.showRoomPrice) {
        // Cửa Trả theo lượt: chỉ Groq chạy trên giao diện này
        state = house === "groq" ? "room" : "noRoom";
        disabled = house === "groq" ? input.roomHeld(model.id) : true;
      } else {
        state = open ? "open" : "closed";
        disabled = !open;
      }
      rows.push({ id: model.id, name: model.label, house, state, disabled });
    }
  }
  return rows;
}
