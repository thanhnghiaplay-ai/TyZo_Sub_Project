import type { Sql } from "./db";
import type { ProviderRows } from "./price-rows";
import { parseModelList } from "./run-desk";
import type { GroqLiveRow } from "./sub/groq-board";
import { PROVIDERS, type ProviderId } from "./sub/provider";

/**
 * Cách nạp bảng giá đã kéo của từng nhà (ngoài Groq: Groq nạp bằng loadPriceBook).
 * Kiểu `Record` bắt buộc đủ mọi nhà: thêm nhà mới mà quên khai cách nạp giá thì tsc báo lỗi.
 */
const ROW_LOADERS: Record<Exclude<ProviderId, "groq">, (sql: Sql) => Promise<GroqLiveRow[]>> = {
  "tyzo-modal": async sql => {
    const rows = await sql<{value:string}>`select value from room_settings where key = 'tyzo_modal_price'`;
    if (!rows.length) return [];
    const { parseModalPrice, holdUsdPerFilmHour } = await import("./sub/tyzo-modal-price");
    let price;
    try { price = parseModalPrice(JSON.parse(rows[0].value)); } catch { return []; }   // giá cũ hoặc hỏng: coi như chưa đặt giá
    return (["nhanh","ky"] as const).map(profile => ({ id: "tyzo-modal-"+profile, usdPerHour: holdUsdPerFilmHour(price, profile),
      speed:null, usdIn:null, usdOut:null, usdPerMillionChars:null, unlisted:false, limits:[], contextTokens:null, maxCompletionTokens:null, maxFile:null }));
  },
  alibaba: async (sql) => (await import("./sub/alibaba-board.server")).loadAlibabaRows(sql),
};

/** Bảng giá đã kéo của mọi nhà ngoài Groq. Nhà nạp lỗi thì bỏ qua (dùng giá gốc trong code). */
export async function loadProviderRows(sql: Sql): Promise<ProviderRows> {
  const out: ProviderRows = {};
  for (const id of Object.keys(ROW_LOADERS) as Exclude<ProviderId, "groq">[]) {
    try {
      out[id] = await ROW_LOADERS[id](sql);
    } catch {
      /* giữ giá gốc trong code */
    }
  }
  return out;
}

type RoomHouse = { key: string | null; models: string[] | null };

/** Key và danh sách model PHÒNG của mọi nhà, đọc một lần. Tên dòng lấy từ PROVIDERS[id].settings, không viết tay. */
export async function loadRoomHouses(sql: Sql): Promise<Record<ProviderId, RoomHouse>> {
  const rows = await sql<{ key: string; value: string }>`select key, value from room_settings`;
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const out = {} as Record<ProviderId, RoomHouse>;
  for (const id of Object.keys(PROVIDERS) as ProviderId[]) {
    const names = PROVIDERS[id].settings;
    out[id] = { key: map.get(names.key)?.trim() || null, models: parseModelList(map.get(names.models)) };
  }
  out["tyzo-modal"] = { key: process.env.TYZO_ASR_TOKEN && process.env.TYZO_ASR_URL ? "configured" : null, models: PROVIDERS["tyzo-modal"].fixedModels ?? null };
  return out;
}
