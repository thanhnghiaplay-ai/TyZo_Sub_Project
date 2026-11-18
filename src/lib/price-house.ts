/** Gom hàng giá theo nhà, mỗi nhà một khối cùng kiểu. Hàm thuần, không đụng máy chủ. */
export type PriceHouseRow = { id: string; house: string; fix: { hour: number | null; inn: number | null; out: number | null; chars: number | null } };

/** Nhà kéo giá từ trang giá (có nút «Lấy lại») và nhà giá gắn sẵn trong code (sửa tay). */
export const PULLED_HOUSES = ["Groq", "Alibaba", "Deepgram"] as const;
export type PulledHouse = (typeof PULLED_HOUSES)[number];

export function isPulledHouse(house: string): house is PulledHouse {
  return (PULLED_HOUSES as readonly string[]).includes(house);
}

export type HouseGroup<T extends PriceHouseRow> = { house: string; pulled: boolean; rows: T[]; fixedCount: number };

function hasFix(row: PriceHouseRow): boolean {
  const fix = row.fix;
  return fix.hour != null || fix.inn != null || fix.out != null || fix.chars != null;
}

/** Giữ thứ tự nhà theo lần xuất hiện đầu tiên. */
export function groupByHouse<T extends PriceHouseRow>(rows: T[]): HouseGroup<T>[] {
  const out: HouseGroup<T>[] = [];
  for (const row of rows) {
    let group = out.find((item) => item.house === row.house);
    if (!group) {
      group = { house: row.house, pulled: isPulledHouse(row.house), rows: [], fixedCount: 0 };
      out.push(group);
    }
    group.rows.push(row);
    if (hasFix(row)) group.fixedCount += 1;
  }
  return out;
}

/** Dòng nguồn giá của một khối: tự lấy, giá gắn sẵn, kèm số model đang dùng số bạn sửa. */
export function houseSourceLine(group: Pick<HouseGroup<PriceHouseRow>, "pulled" | "fixedCount">): string {
  const base = group.pulled ? "Nguồn giá: tự lấy từ trang giá của nhà." : "Nguồn giá: giá gắn sẵn, sửa tay khi nhà đổi giá.";
  return group.fixedCount > 0 ? `${base} ${group.fixedCount} model đang dùng số bạn sửa.` : base;
}

/** Bật/tắt một nhà trong danh sách nhà đang mở. Mặc định danh sách rỗng = mọi nhà ẩn. */
export function toggleHouse(open: readonly string[], house: string): string[] {
  return open.includes(house) ? open.filter((item) => item !== house) : [...open, house];
}

/** Dòng ngắn hiện ở tiêu đề khi nhà đang thu lại: số model, và số model đang dùng số sửa tay. */
export function houseHeadline(group: Pick<HouseGroup<PriceHouseRow>, "rows" | "fixedCount">): string {
  const base = `${group.rows.length} model`;
  return group.fixedCount > 0 ? `${base} · ${group.fixedCount} đang dùng số bạn sửa` : base;
}
