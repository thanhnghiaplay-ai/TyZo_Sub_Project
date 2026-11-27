/**
 * Quyết định cho cửa Trả theo lượt (thuần, test được): model này của nhà nào, làm được việc gì,
 * phòng có key và có model không, và (chế độ Tự động) model dịch nào để giữ Token dịch.
 * Không viết riêng cho nhà nào: nhà và việc hỏi danh mục chung (model-catalog.ts), khả năng hỏi PROVIDERS,
 * tên trong danh sách nhà hỏi key-list.ts, giá hỏi price-rows.ts. Thêm nhà mới không phải sửa file này.
 */
import { chatPerMillion, type PriceBook } from "./billing/run-bill.ts";
import { bareBookOf, type ProviderRows } from "./price-rows.ts";
import { catalogFor, modelKindOf, payPerTurnChat, type ModelKind } from "./sub/model-catalog.ts";
import { KEY_LIST_TRUSTED, roomListHas } from "./sub/key-list.ts";
import { PROVIDER_IDS, PROVIDERS, providerHas, type ProviderCap, type ProviderId } from "./sub/provider.ts";
import { providerOfModel, roomRefusal, type RoomOffer } from "./sub/room-models.ts";

export type RoomHouses = Record<ProviderId, { key: string | null; models: string[] | null }>;
type RoomPick = { provider: ProviderId; model: string };

const KIND_OF_CAP: Record<ProviderCap, ModelKind> = { asr: "asr", chat: "chat", tts: "tts", live: "live" };

export function offerOf(houses: RoomHouses): RoomOffer {
  return Object.fromEntries(PROVIDER_IDS.map((id) => [id, houses[id]?.key ? houses[id].models : null])) as RoomOffer;
}

/** Model chọn tay dùng được ở cửa phòng cho việc `cap` không. Trả nhà của model, hoặc câu lỗi nêu rõ thiếu gì. */
export function roomUse(houses: RoomHouses, model: string, cap: ProviderCap): RoomPick | { error: string } {
  const provider = providerOfModel(model, offerOf(houses));
  if (!provider) return { error: `Chưa rõ model ${model} thuộc nhà cung cấp nào.` };
  const label = PROVIDERS[provider].label;
  if (!providerHas(provider, cap)) return { error: `${label} không làm việc này, nên model ${model} không dùng ở đây được.` };
  const kind = modelKindOf(provider, model);
  if (kind && kind !== KIND_OF_CAP[cap]) return { error: `Model ${model} không làm việc này.` };
  const house = houses[provider];
  if (!house?.key) return { error: `Phòng chưa lưu key ${label}.` };
  if (!house.models && KEY_LIST_TRUSTED[provider]) return { error: `Phòng chưa đồng bộ danh sách model ${label} cho cửa trả theo lượt.` };
  if (roomListHas(provider, model, house.models) === false) return { error: roomRefusal(model) };
  return { provider, model };
}

/** Mọi model dịch phòng gọi được (mọi nhà có key), kèm nhà. */
export function roomChatModels(houses: RoomHouses): RoomPick[] {
  const out: RoomPick[] = [];
  for (const provider of PROVIDER_IDS) {
    if (!providerHas(provider, "chat")) continue;
    const house = houses[provider];
    if (!house?.key || !house.models) continue;
    const ids = new Set([...house.models, ...catalogFor(provider, "chat").map((model) => model.id)]);
    for (const id of ids) {
      // RE5-001: cùng quy tắc với cửa trả theo lượt — chỉ model dịch trong danh mục.
      if (!payPerTurnChat(provider, id)) continue;
      if (roomListHas(provider, id, house.models) === false) continue;
      out.push({ provider, model: id });
    }
  }
  return out;
}

/**
 * Chế độ Tự động: giữ Token dịch theo model dịch ĐẮT nhất phòng gọi được (mọi nhà), vì app có thể chọn bất kỳ model nào trong đó.
 * Số trừ là số thật, phần giữ thừa được nhả. Model chưa có giá thì bỏ qua.
 */
export function dearestRoomChat(houses: RoomHouses, groq: PriceBook, rows: ProviderRows): RoomPick | null {
  let best: { pick: RoomPick; cost: number } | null = null;
  for (const pick of roomChatModels(houses)) {
    const per = chatPerMillion(bareBookOf(pick.provider, groq, rows), pick.model);
    if (!per) continue;
    const cost = per.inn * 12 + per.out * 8;
    if (!best || cost > best.cost) best = { pick, cost };
  }
  return best?.pick ?? null;
}
