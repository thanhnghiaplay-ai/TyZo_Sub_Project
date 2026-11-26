import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkServicePacks } from "./service-pack.ts";
import { turnPackProblem } from "./turn-pack.ts";
import { rentUseProblem, type RentShow } from "./rent-show-rule.ts";
import { ALIBABA_ROWS } from "./sub/alibaba-catalog.ts";
import { asrHouse, asrTakesLink } from "./sub/asr-house.ts";
import { ASR_MODELS } from "./sub/models.ts";
import { PROVIDER_IDS, providerHas, type ProviderId } from "./sub/provider.ts";
import { ASR_PRICE } from "./sub/types.ts";

/**
 * Bài kiểm "nhà mới phải đủ cửa". Thêm nhà vào PROVIDERS mà chưa khai ở bảng dưới thì tsc báo lỗi (kiểu Record<ProviderId, ...>),
 * và nếu nhà có khả năng nhận dạng thì các bài dưới tự chạy cho nhà đó: phải có model, giá, mở được cả hai cửa
 * (Trả theo lượt bằng key phòng, Thuê phòng bằng key khách), có trong danh sách Thuê phòng.
 * Làm theo PROVIDERS.md bước 4 đến 7.
 */
const PRICE_ROWS: Record<ProviderId, string[] | "bang-gia-groq"> = {
  "tyzo-modal": ["tyzo-modal-nhanh", "tyzo-modal-ky"],
  groq: "bang-gia-groq",
  alibaba: ALIBABA_ROWS.map((row) => row.id),
};

const asrProviders = PROVIDER_IDS.filter((id) => id !== "tyzo-modal" && providerHas(id, "asr"));

function packFor(provider: ProviderId, model: string) {
  return {
    id: "pack_guard1",
    name: "Gói kiểm",
    note: "",
    enabled: true,
    doors: ["turn", "rent"] as ("turn" | "rent")[],
    roles: { asr: { provider, model }, translate: { provider: "groq" as const, model: "llama-3.3-70b-versatile" } },
  };
}

describe("mỗi nhà nhận dạng phải đủ hai cửa", () => {
  for (const provider of asrProviders) {
    const models = ASR_MODELS.filter((row) => asrHouse(row.id) === provider);
    it(`${provider}: có model nhận dạng, có giá dự phòng và dòng giá`, () => {
      assert.ok(models.length > 0, `${provider} chưa có model trong ASR_MODELS`);
      const rows = PRICE_ROWS[provider];
      for (const model of models) {
        assert.ok((ASR_PRICE as Record<string, number>)[model.id] > 0, `${model.id} chưa có ASR_PRICE`);
        if (rows !== "bang-gia-groq") assert.ok(rows.includes(model.id), `${model.id} chưa có dòng giá để tính tiền`);
      }
    });
    it(`${provider}: gói mở được cả cửa Trả theo lượt và Thuê phòng`, () => {
      for (const model of models) {
        const saved = checkServicePacks([packFor(provider, model.id)]);
        assert.deepEqual(saved[0].doors, ["turn", "rent"], `${model.id} bị chặn một cửa khi lưu gói`);
        assert.equal(turnPackProblem(saved, { asr: model.id, chat: "llama-3.3-70b-versatile" }), "", `${model.id} bị chặn ở cửa Trả theo lượt`);
      }
    });
    it(`${provider}: Chủ mở model cho Thuê phòng thì khách dùng được`, () => {
      const show = Object.fromEntries(PROVIDER_IDS.map((id) => [id, [] as string[]])) as RentShow;
      for (const model of models) show[provider].push(model.id);
      show.groq.push("llama-3.3-70b-versatile");
      for (const model of models) assert.equal(rentUseProblem(show, { asr: model.id, chat: "llama-3.3-70b-versatile" }), "");
    });
    it(`${provider}: nhận link hay nhận đoạn cắt đã khai rõ`, () => {
      for (const model of models) assert.equal(typeof asrTakesLink(model.id), "boolean");
    });
  }
});

/**
 * Cùng luật cho việc DỊCH (và mọi việc chữ: phân tích phim, trau chuốt): nhà nào khai khả năng "chat" thì tự bị kiểm ở đây.
 * Thêm nhà mới có model dịch: khai `chat` ở PROVIDERS, thêm model vào CHAT_MODELS (provider), giá vào price-rows.ts.
 */
import { catalogFor } from "./sub/model-catalog.ts";
import { pickAutoModel, CHAT_MODELS, chatProviderOf } from "./sub/models.ts";
import { pickPool } from "./sub/room-models.ts";
import { roomUse, dearestRoomChat, type RoomHouses } from "./room-turn.ts";
import { holdGiay } from "./billing/token-math.ts";
import { chatPerMillion, type PriceBook } from "./billing/run-bill.ts";
import { bareBookOf } from "./price-rows.ts";
import { rentRowsFor } from "./rent-rows.ts";
import { providersForRole } from "./service-pack.ts";
import { PROVIDERS, providerChat } from "./sub/provider.ts";
import type { GroqLiveRow } from "./sub/groq-board.ts";

const row = (id: string, extra: Partial<GroqLiveRow>): GroqLiveRow => ({ id, speed: null, usdIn: null, usdOut: null, usdPerHour: null, usdPerMillionChars: null, unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null, ...extra });
// Bảng Groq mẫu: có Whisper Turbo (đơn vị Token dịch) và giá các model dịch Groq trong danh mục.
const GROQ_BOOK: PriceBook = {
  rate: 25000,
  rows: [row("whisper-large-v3-turbo", { usdPerHour: 0.04 }), ...CHAT_MODELS.filter((m) => chatProviderOf(m) === "groq").map((m) => row(m.id, { usdIn: 0.2, usdOut: 0.6 }))],
  desk: { markup: 0, custom: {} },
};

const chatProviders = PROVIDER_IDS.filter((id) => providerHas(id, "chat"));

describe("mỗi nhà có model dịch phải đủ hai cửa", () => {
  it("có ít nhất hai nhà dịch, và nhà dịch nào cũng khai đường gọi", () => {
    assert.ok(chatProviders.length >= 2, "phải có hơn một nhà dịch");
    for (const id of chatProviders) assert.ok(providerChat(id), `${id} thiếu đường dịch`);
  });
  for (const provider of chatProviders) {
    const models = catalogFor(provider, "chat").map((m) => m.id);
    const label = PROVIDERS[provider].label;
    it(`${provider}: có model dịch trong danh mục, model nào cũng có giá`, () => {
      assert.ok(models.length > 0, `${provider} chưa có model dịch trong CHAT_MODELS`);
      for (const id of models) assert.ok(chatPerMillion(bareBookOf(provider, GROQ_BOOK), id), `${id} chưa có giá dịch ở price-rows.ts`);
    });
    it(`${provider}: cửa Trả theo lượt nhận model, giữ được Token dịch theo giá của đúng nhà`, () => {
      const houses = Object.fromEntries(PROVIDER_IDS.map((id) => [id, { key: null, models: null }])) as unknown as RoomHouses;
      houses.groq = { key: "k", models: ["whisper-large-v3-turbo"] };
      houses[provider] = { key: "k", models: [...(houses[provider]?.models ?? []), ...models] };
      for (const id of models) {
        assert.deepEqual(roomUse(houses, id, "chat"), { provider, model: id });
        const hold = holdGiay({ groq: GROQ_BOOK, asrProvider: "groq", asrModel: "whisper-large-v3-turbo", chatProvider: provider, chatModel: id, seconds: 600 });
        assert.ok(hold != null && hold > 0, `${id}: không giữ được Token dịch`);
      }
      assert.ok(dearestRoomChat(houses, GROQ_BOOK, {}), "Tự động không tìm được model dịch phòng");
      const noKey = { ...houses, [provider]: { key: null, models: null } };
      const out = roomUse(noKey, models[0], "chat");
      assert.ok("error" in out && out.error.includes(label), "thiếu key phải nêu tên nhà");
    });
    it(`${provider}: cửa Thuê phòng — Chủ mở được, khách dùng được, gói chọn được`, () => {
      const rentIds = rentRowsFor(provider, null).map((r) => r.id);
      for (const id of models) assert.ok(rentIds.includes(id), `${id} không có hàng ở bảng Thuê phòng`);
      const show = Object.fromEntries(PROVIDER_IDS.map((id) => [id, [] as string[]])) as RentShow;
      show.groq.push("whisper-large-v3-turbo");
      show[provider].push(...models);
      for (const id of models) assert.equal(rentUseProblem(show, { asr: "whisper-large-v3-turbo", chat: id }), "");
      assert.ok(providersForRole("translate").includes(provider) && providersForRole("context").includes(provider), "gói chưa chọn được nhà này cho việc chữ");
      const pack = { id: "pack_guard2", name: "Gói kiểm", note: "", enabled: true, doors: ["turn", "rent"] as ("turn" | "rent")[], roles: { asr: { provider: "groq" as const, model: "whisper-large-v3-turbo" }, translate: { provider, model: models[0] } } };
      const saved = checkServicePacks([pack]);
      assert.deepEqual(saved[0].doors, ["turn", "rent"]);
      assert.equal(turnPackProblem(saved, { asr: "whisper-large-v3-turbo", chat: models[0] }), "");
    });
    it(`${provider}: chỉ có key nhà này thì Tự động vẫn chọn model của nhà này`, () => {
      const pool = pickPool(false, null, { keys: { [provider]: "key-x" }, lists: {} })!;
      const picked = pickAutoModel({ profile: "balanced", texts: ["xin chào"], sourceLang: "en", genre: "auto", glossaryHit: false, allowEnterprise: true, available: pool, cooling: new Map(), blocked: new Set(), escalate: false });
      assert.ok(models.includes(picked.id), `${provider}: Tự động chọn ${picked.id}`);
    });
  }
});
