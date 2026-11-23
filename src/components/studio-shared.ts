/** Hằng và kiểu dùng chung giữa phòng dịch (studio.tsx) và các phần con studio-*.tsx. */

export const FIELD =
  "min-tap w-full rounded-[var(--radius-ctl)] border border-line bg-bg px-3 text-base text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent";

export const FONTS = [
  '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif',
  'Georgia, "Times New Roman", serif',
  '"Courier New", monospace',
  'Impact, "Arial Black", sans-serif',
  '"Segoe Print", cursive',
];
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const ARS: Array<[string, string | number]> = [
  ["Vừa khung", "contain"],
  ["Lấp đầy", "cover"],
  ["Kéo giãn", "fill"],
  ["16:9", 16 / 9],
  ["4:3", 4 / 3],
  ["21:9", 21 / 9],
];

export type SubStyle = { on: boolean; font: string; size: number; col: string; bgm: string; op: number; pos: number; off: number };
export const SUB_DEF: SubStyle = { on: true, font: "0", size: 50, col: "#ffffff", bgm: "box", op: 0, pos: 3, off: 0 };
