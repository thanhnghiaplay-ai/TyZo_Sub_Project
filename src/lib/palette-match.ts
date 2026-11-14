import { foldText } from "./admin-tabs.ts";

export type PaletteCommand = {
  id: string;
  label: string;
  hint: string;
  /** Từ khóa thêm để tìm (không dấu cũng được). */
  words?: string;
  disabled?: boolean;
  run: () => void;
};

/** Lọc lệnh theo chữ gõ. Không dấu cũng tìm được; bỏ lệnh đang khóa. */
export function matchCommands(list: PaletteCommand[], query: string): PaletteCommand[] {
  const q = foldText(query);
  const usable = list.filter((item) => !item.disabled);
  if (!q) return usable;
  return usable.filter((item) => foldText(`${item.label} ${item.words ?? ""}`).includes(q));
}
