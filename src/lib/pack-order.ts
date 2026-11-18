/** Gói mới nằm ĐẦU danh sách (nút «Thêm gói dịch» ở trên), gói cũ bị đẩy xuống. Hàm thuần. */
export function prependPack<T>(list: readonly T[], pack: T): T[] {
  return [pack, ...list];
}
