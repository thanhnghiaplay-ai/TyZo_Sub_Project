import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkServicePacks } from "./service-pack.ts";
import { turnPackProblem } from "./turn-pack.ts";
import { rentUseProblem, type RentShow } from "./rent-show-rule.ts";
import { ALIBABA_ROWS } from "./sub/alibaba-catalog.ts";
import { ASSEMBLYAI_BASE_ROWS } from "./sub/assemblyai-base.ts";
import { DEEPGRAM_BASE_ROWS } from "./sub/deepgram-base.ts";
import { SPEECHMATICS_BASE_ROWS } from "./sub/speechmatics-base.ts";
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
  groq: "bang-gia-groq",
  alibaba: ALIBABA_ROWS.map((row) => row.id),
  deepgram: DEEPGRAM_BASE_ROWS.map((row) => row.id),
  assemblyai: ASSEMBLYAI_BASE_ROWS.map((row) => row.id),
  speechmatics: SPEECHMATICS_BASE_ROWS.map((row) => row.id),
  // Nhà đang làm dở (ready: false): điền dòng giá thật ở bước 6, rồi bài kiểm này mới đếm tới khi ready thành true.
  soniox: [],
};

const asrProviders = PROVIDER_IDS.filter((id) => providerHas(id, "asr"));

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
