/**
 * Tổng số model dùng được trên TẤT CẢ key (Groq, Alibaba, Deepgram...). Hàm thuần.
 * Key riêng của khách: mỗi nhà khách nhập key thì cộng model của nhà đó. Key phòng: cộng model của mọi nhà phòng đã lưu key.
 */
import { PROVIDER_IDS, PROVIDERS, type ProviderId } from "./provider.ts";

export type ModelCounts = Partial<Record<ProviderId, number | null | undefined>>;

export type ModelTotal = { total: number; parts: { id: ProviderId; label: string; count: number }[] };

/** Nhà không có key hoặc chưa đọc được (null, 0) thì bỏ qua. */
export function modelTotal(counts: ModelCounts): ModelTotal {
  const parts: ModelTotal["parts"] = [];
  for (const id of PROVIDER_IDS) {
    const count = counts[id];
    if (typeof count !== "number" || count <= 0) continue;
    parts.push({ id, label: PROVIDERS[id].label, count });
  }
  return { total: parts.reduce((sum, part) => sum + part.count, 0), parts };
}

/** Câu báo sau khi đồng bộ. Chỉ chia theo nhà khi có từ hai nhà trở lên. */
export function modelTotalText(room: boolean, counts: ModelCounts): string {
  const { total, parts } = modelTotal(counts);
  const detail = parts.length > 1 ? ` (${parts.map((part) => `${part.label} ${part.count}`).join(", ")})` : "";
  if (room) return `Đã đồng bộ với key của phòng. Dùng được ${total} model${detail}.`;
  return `Các key của bạn dùng được ${total} model${detail}. Model không có trên key sẽ bị làm mờ.`;
}
