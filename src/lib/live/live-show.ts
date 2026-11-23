/**
 * Dịch trực tiếp THEO KHẢ NĂNG TỪNG MODEL (Chủ chốt 17/11/2026).
 * Mỗi model nhận một chế độ live:
 *  - real: dịch trực tiếp thật (luồng liên tục, model tự dịch)
 *  - chunked: giả bằng cắt đoạn ngắn rồi nhận dạng + dịch (model đủ điều kiện, app CHƯA có đường chạy này)
 *  - none: không làm được
 * Admin chỉ bật được model làm được (`liveTickable`). Hiện chỉ `real` có đường chạy.
 * Hàm thuần, không import máy chủ.
 */
import { catalogModel, MODEL_CATALOG, type CatalogModel } from "../sub/model-catalog.ts";
import type { ProviderId } from "../sub/provider.ts";

type LiveMode = "real" | "chunked" | "none";

/** Chế độ live của một model trong danh mục. Dựng từ khai sẵn: kind live → real; nhận dạng cắt đoạn được → chunked; còn lại none. */
export function liveModeOf(model: CatalogModel): LiveMode {
  if (model.kind === "live") return "real";
  if (model.kind === "asr" && model.intake === "chunks") return "chunked";
  return "none";
}

export function liveModeFor(provider: ProviderId, id: string): LiveMode {
  const model = catalogModel(provider, id);
  return model ? liveModeOf(model) : "none";
}

/** Model hiện được liệt kê ở bảng Admin (mọi model có thể live, kể cả chưa chạy được). */
export function liveCandidates(): Array<CatalogModel & { mode: LiveMode }> {
  return MODEL_CATALOG.map((model) => ({ ...model, mode: liveModeOf(model) })).filter((model) => model.mode !== "none");
}

/** Chỉ model `real` có đường chạy nên tick được. */
export function liveTickable(mode: LiveMode): boolean {
  return mode === "real";
}

const ID_RE = /^[a-z0-9./_-]{2,80}$/i;

/** null = Chủ chưa lưu, không khóa thêm (mọi model real mở). */
export function parseLiveShow(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return null;
    return data.filter((id): id is string => typeof id === "string" && ID_RE.test(id)).slice(0, 80);
  } catch {
    return null;
  }
}

/** Chỉ giữ model thật sự bật được. */
export function cleanLiveShow(ids: unknown): string[] {
  const list = Array.isArray(ids) ? ids : [];
  const ok = new Set(liveCandidates().filter((model) => liveTickable(model.mode)).map((model) => model.id));
  return [...new Set(list.filter((id): id is string => typeof id === "string" && ok.has(id)))];
}

/** Câu báo khi model chưa được mở cho dịch trực tiếp; rỗng = dùng được. */
export function liveOpenProblem(show: string[] | null, model: string): string {
  const mode = MODEL_CATALOG.find((item) => item.id === model);
  if (!mode || !liveTickable(liveModeOf(mode))) return "Model này chưa dịch trực tiếp được.";
  if (show && !show.includes(model)) return "Admin chưa mở model này cho dịch trực tiếp.";
  return "";
}

export function liveOpenModels(show: string[] | null, all: readonly string[]): string[] {
  return all.filter((id) => !liveOpenProblem(show, id));
}
