/**
 * DANH MỤC MODEL CHUNG. Một chỗ để hỏi "model này của nhà nào, làm việc gì, nhận âm thanh kiểu nào".
 * Danh mục được DỰNG từ các bảng đã có (ASR_MODELS, CHAT_MODELS, model dịch trực tiếp), không chép dữ liệu lần hai.
 * Model chưa có trong danh mục (key của khách trả về thêm model lạ) thì `modelKindOf` đoán theo nhà và tên.
 * Thêm nhà mới (PROVIDERS.md): nhà khai khả năng nào thì phải có ít nhất một model loại đó ở đây, test sẽ báo nếu thiếu.
 */
import { LIVE_MODEL_35, LIVE_MODEL_38 } from "../live/live-price.ts";
import { asrHouse, asrIntake } from "./asr-house.ts";
import { modelRoleOf, type ModelRole } from "./model-role.ts";
import { ASR_MODELS, CHAT_MODELS } from "./models.ts";
import type { ProviderId, ProviderIntake } from "./provider.ts";

/** asr: nhận dạng · chat: dịch bằng mô hình ngôn ngữ · tts: đọc thành tiếng · live: dịch trực tiếp · guard: kiểm duyệt, không dùng để dịch */
export type ModelKind = "asr" | "chat" | "tts" | "live" | "guard";

export type CatalogModel = {
  id: string;
  provider: ProviderId;
  kind: ModelKind;
  label: string;
  /** Chỉ model nhận dạng mới có: cách app đưa âm thanh cho nhà (đọc từ khai của nhà). */
  intake: ProviderIntake | null;
};

/** Giọng Orpheus trên Groq (đọc thuyết minh). Địa chỉ gọi nằm ở groq.ts. */
export const ORPHEUS_MODELS = [
  { id: "canopylabs/orpheus-v1-english", label: "Orpheus tiếng Anh" },
  { id: "canopylabs/orpheus-arabic-saudi", label: "Orpheus tiếng Ả Rập" },
] as const;

const LIVE_LABEL: Record<string, string> = {
  [LIVE_MODEL_38]: "Qwen3.8 LiveTranslate",
  [LIVE_MODEL_35]: "Qwen3.5 LiveTranslate",
};

function build(): CatalogModel[] {
  const out: CatalogModel[] = [];
  for (const row of ASR_MODELS) {
    const provider = asrHouse(row.id);
    if (provider) out.push({ id: row.id, provider, kind: "asr", label: row.name, intake: asrIntake(row.id) });
  }
  for (const model of CHAT_MODELS) {
    out.push({ id: model.id, provider: model.provider ?? "groq", kind: model.tier === "safety" ? "guard" : "chat", label: model.name, intake: null });
  }
  for (const voice of ORPHEUS_MODELS) out.push({ id: voice.id, provider: "groq", kind: "tts", label: voice.label, intake: null });
  for (const id of [LIVE_MODEL_38, LIVE_MODEL_35]) out.push({ id, provider: "alibaba", kind: "live", label: LIVE_LABEL[id] ?? id, intake: null });
  return out;
}

export const MODEL_CATALOG: readonly CatalogModel[] = build();

const BY_KEY = new Map(MODEL_CATALOG.map((model) => [`${model.provider}:${model.id}`, model]));

export function catalogModel(provider: ProviderId, id: string): CatalogModel | null {
  return BY_KEY.get(`${provider}:${id}`) ?? null;
}

/** Model của một nhà, có thể lọc theo loại. */
export function catalogFor(provider: ProviderId, kind?: ModelKind): CatalogModel[] {
  return MODEL_CATALOG.filter((model) => model.provider === provider && (!kind || model.kind === kind));
}

const KIND_OF_ROLE: Record<ModelRole, ModelKind> = { asr: "asr", tts: "tts", guard: "guard", live: "live", translate: "chat" };

/**
 * Model này làm việc gì. Có trong danh mục thì lấy từ danh mục; chưa có thì đoán theo nhà và tên.
 * Trả null khi không đoán được (ví dụ model Deepgram lạ, vì Deepgram không có model dịch nên không gán "chat" bừa).
 */
export function modelKindOf(provider: ProviderId, id: string): ModelKind | null {
  const known = catalogModel(provider, id);
  if (known) return known.kind;
  const kind = KIND_OF_ROLE[modelRoleOf(id)];
  // Model lạ chỉ được xem là model dịch khi tên giống mô hình chữ: key của một số nhà trả cả model ảnh, nhúng, đọc ảnh, âm thanh…
  if (kind === "chat" && NOT_CHAT.test(id)) return null;
  return kind;
}

/** Tên model không phải mô hình chữ (dù modelRoleOf mặc định xếp vào «dịch»). */
const NOT_CHAT = /embed|rerank|image|wan[x\d.-]|(^|[-/])vl([-.]|$)|-vl-|vision|ocr|omni|audio|realtime|video|flux|diffusion|cosyvoice|paraformer|sambert|moderation|-tts|tts-|asr/i;
