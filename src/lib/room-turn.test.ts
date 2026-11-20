import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GroqLiveRow } from "./sub/groq-board.ts";
import type { PriceBook } from "./run-bill.ts";
import { dearestRoomChat, roomChatModels, roomUse, type RoomHouses } from "./room-turn.ts";
import { holdGiay } from "./token-math.ts";
import { PROVIDERS, type ProviderId } from "./sub/provider.ts";

function liveRow(id: string, extra: Partial<GroqLiveRow>): GroqLiveRow {
  return { id, speed: null, usdIn: null, usdOut: null, usdPerHour: null, usdPerMillionChars: null, unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null, ...extra };
}

const groq: PriceBook = {
  rate: 25000,
  rows: [
    liveRow("whisper-large-v3-turbo", { usdPerHour: 0.04 }),
    liveRow("whisper-large-v3", { usdPerHour: 0.111 }),
    liveRow("openai/gpt-oss-120b", { usdIn: 0.15, usdOut: 0.6 }),
    liveRow("qwen/qwen3.8-27b", { usdIn: 0.8, usdOut: 4 }),
  ],
  desk: { markup: 0, custom: {} },
};

const empty = Object.fromEntries((Object.keys(PROVIDERS) as ProviderId[]).map((id) => [id, { key: null, models: null }])) as RoomHouses;
// Danh sách thật lúc báo lỗi (20/11/2026) + phòng có thêm key Alibaba.
const houses: RoomHouses = {
  ...empty,
  groq: { key: "k", models: ["whisper-large-v3", "whisper-large-v3-turbo", "openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-safeguard-20b"] },
  alibaba: { key: "k", models: ["qwen-plus", "qwen-max", "text-embedding-v3", "wanx2.1-t2i-turbo"] },
};

describe("cửa trả theo lượt, mọi nhà", () => {
  it("model dịch chọn tay: đúng nhà, đúng việc, đúng danh sách", () => {
    assert.deepEqual(roomUse(houses, "qwen/qwen3.8-27b", "chat"), { provider: "groq", model: "qwen/qwen3.8-27b" });
    assert.deepEqual(roomUse(houses, "qwen-plus", "chat"), { provider: "alibaba", model: "qwen-plus" });
    const missing = roomUse(houses, "llama-3.3-70b-versatile", "chat");
    assert.ok("error" in missing && /llama-3\.3-70b-versatile/.test(missing.error), "nêu tên model phòng không có");
    const wrongJob = roomUse(houses, "whisper-large-v3", "chat");
    assert.ok("error" in wrongJob, "model nhận dạng không dùng để dịch");
  });

  it("nhà chưa lưu key: báo đúng tên nhà", () => {
    const noAli = { ...houses, alibaba: { key: null, models: null } };
    const out = roomUse(noAli, "qwen-plus", "chat");
    assert.ok("error" in out && /Alibaba/.test(out.error));
    const dg = roomUse(houses, "deepgram-nova-3", "asr");
    assert.ok("error" in dg && /Deepgram/.test(dg.error));
  });

  it("nhận dạng mọi nhà đi cùng một đường", () => {
    assert.deepEqual(roomUse(houses, "whisper-large-v3", "asr"), { provider: "groq", model: "whisper-large-v3" });
    const withDg = { ...houses, deepgram: { key: "k", models: ["nova-3-general"] } };
    assert.deepEqual(roomUse(withDg, "deepgram-nova-3", "asr"), { provider: "deepgram", model: "deepgram-nova-3" });
  });

  it("Tự động: gom model dịch mọi nhà, không lẫn model ảnh, nhúng, kiểm duyệt", () => {
    const ids = roomChatModels(houses).map((pick) => `${pick.provider}:${pick.model}`);
    assert.ok(ids.includes("groq:qwen/qwen3.8-27b") && ids.includes("alibaba:qwen-plus") && ids.includes("alibaba:qwen-max"));
    for (const bad of ["alibaba:text-embedding-v3", "alibaba:wanx2.1-t2i-turbo", "groq:openai/gpt-oss-safeguard-20b", "groq:whisper-large-v3"]) assert.ok(!ids.includes(bad), bad);
  });

  it("Tự động giữ theo model dịch đắt nhất trong mọi nhà, giá theo đúng nhà", () => {
    // qwen-max (Alibaba, 1.6/6.4) đắt hơn qwen3.8-27b (Groq, 0.8/4).
    assert.deepEqual(dearestRoomChat(houses, groq, {}), { provider: "alibaba", model: "qwen-max" });
    assert.deepEqual(dearestRoomChat({ ...houses, alibaba: { key: null, models: null } }, groq, {}), { provider: "groq", model: "qwen/qwen3.8-27b" });
  });

  it("giữ Token dịch tính giá dịch theo nhà của model dịch, không theo Groq", () => {
    const base = { groq, asrProvider: "groq", asrModel: "whisper-large-v3-turbo", seconds: 600 };
    const viaGroq = holdGiay({ ...base, chatProvider: "groq", chatModel: "openai/gpt-oss-120b" });
    const viaAli = holdGiay({ ...base, chatProvider: "alibaba", chatModel: "qwen-max" });
    assert.ok(viaGroq != null && viaAli != null && viaAli > viaGroq);
    assert.equal(holdGiay({ ...base, chatProvider: "groq", chatModel: "qwen-max" }), null, "không tính nhầm bảng nhà khác");
  });
});
