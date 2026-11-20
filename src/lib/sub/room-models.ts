/**
 * Trả theo lượt: máy chủ chỉ nhận model có trong danh sách key PHÒNG của đúng nhà cung cấp
 * (Groq: run_models, Alibaba: alibaba_models, Deepgram: deepgram_models…, đồng bộ khi Chủ lưu key).
 * Không viết riêng cho nhà nào: model thuộc nhà nào, làm việc gì đều hỏi danh mục chung (model-catalog.ts).
 */
import { MODEL_CATALOG, modelKindOf, type ModelKind } from "./model-catalog.ts";
import { asrHouse } from "./asr-house.ts";
import { PROVIDERS, type ProviderId } from "./provider.ts";

/** Danh sách model phòng theo từng nhà. Thiếu nhà, hoặc null: chưa biết, để máy chủ tự kiểm. */
export type RoomOffer = Partial<Record<ProviderId, string[] | null>>;

const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

/** Nhà của một model: danh mục chung trước, rồi nhà nhận dạng theo tên, rồi nhà nào trong phòng có model này. */
export function providerOfModel(id: string, offer: RoomOffer = {}): ProviderId | null {
  const known = MODEL_CATALOG.find((model) => model.id === id);
  if (known) return known.provider;
  const house = asrHouse(id);
  if (house) return house;
  return PROVIDER_IDS.find((provider) => offer[provider]?.includes(id)) ?? null;
}

/** Mọi model phòng làm được một việc (ví dụ "chat" = dịch), gộp mọi nhà. null khi chưa biết danh sách nhà nào. */
export function roomPool(offer: RoomOffer, kind: ModelKind): Set<string> | null {
  let known = false;
  const pool = new Set<string>();
  for (const provider of PROVIDER_IDS) {
    const list = offer[provider];
    if (!list) continue;
    known = true;
    for (const id of list) if (modelKindOf(provider, id) === kind) pool.add(id);
  }
  return known ? pool : null;
}

/** Tập model mà chế độ Tự động được chọn cho một việc. Trả theo lượt và đã biết danh sách phòng thì dùng danh sách phòng. */
export function pickPool(roomPay: boolean, offer: RoomOffer | null, ownIds: string[] | null, kind: ModelKind = "chat"): Set<string> | null {
  if (roomPay && offer) {
    const pool = roomPool(offer, kind);
    if (pool) return pool;
  }
  return ownIds ? new Set(ownIds) : null;
}

/** Model đang chọn mà nhà của nó có danh sách phòng nhưng danh sách không có model đó. */
export function roomMissing(offer: RoomOffer | null, models: (string | null | undefined)[]): string[] | null {
  if (!offer) return null;
  const missing: string[] = [];
  for (const id of models) {
    if (!id || id === "auto") continue;
    const provider = providerOfModel(id, offer);
    const list = provider ? offer[provider] : null;
    if (list && !list.includes(id)) missing.push(id);
  }
  return missing.length ? missing : null;
}

export function roomMissingText(missing: string[]): string {
  const names = missing.join(", ");
  return `Phòng chưa có ${missing.length > 1 ? "các model" : "model"} ${names}, nên trả theo lượt chưa dùng được. Hãy đổi model khác trong Cài đặt dịch (hoặc để Tự động), hay dùng key của bạn.`;
}

/** Câu máy chủ trả khi model không có trong danh sách key phòng. Nêu tên để khách và Chủ biết đổi gì. */
export function roomRefusal(model: string): string {
  return `Model ${model} không có trong cửa trả theo lượt (key phòng chưa có model này).`;
}
