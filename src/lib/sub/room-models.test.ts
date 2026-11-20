import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickAutoModel } from "./models.ts";
import { pickPool, providerOfModel, roomMissing, roomPool, roomRefusal, type RoomOffer } from "./room-models.ts";

// Danh sách thật của key phòng lúc báo lỗi (20/11/2026). Groq không có minimax, llama-3.3, muse-spark.
const OFFER: RoomOffer = {
  groq: ["whisper-large-v3", "whisper-large-v3-turbo", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-safeguard-20b", "canopylabs/orpheus-v1-english"],
  deepgram: ["deepgram-nova-3"],
  alibaba: null,
};

describe("room-models", () => {
  it("gom model phòng theo việc, mọi nhà, qua danh mục chung", () => {
    const chat = roomPool(OFFER, "chat")!;
    assert.ok(chat.has("qwen/qwen3.8-27b"));
    assert.ok(!chat.has("whisper-large-v3"), "nhận dạng không lọt vào dịch");
    assert.ok(!chat.has("openai/gpt-oss-safeguard-20b"), "kiểm duyệt không lọt vào dịch");
    assert.ok(!chat.has("canopylabs/orpheus-v1-english"), "giọng đọc không lọt vào dịch");
    const asr = roomPool(OFFER, "asr")!;
    assert.ok(asr.has("whisper-large-v3") && asr.has("deepgram-nova-3"));
    assert.equal(roomPool({}, "chat"), null);
  });

  it("trả theo lượt thì chọn trong danh sách phòng, kể cả khi key khách có model khác", () => {
    const own = ["minimaxai/minimax-m2.7", "llama-3.3-70b-versatile"];
    assert.deepEqual(pickPool(false, OFFER, own), new Set(own));
    assert.ok(!pickPool(true, OFFER, own)!.has("minimaxai/minimax-m2.7"));
    assert.equal(pickPool(true, null, null), null);
  });

  it("phim tiếng Trung, qwen đang nghỉ: Tự động không nhảy sang model phòng không có", () => {
    const pool = pickPool(true, OFFER, null)!;
    const base = { profile: "accurate" as const, texts: ["analysis"], sourceLang: "zh", genre: "auto", glossaryHit: true, allowEnterprise: false, escalate: true };
    const cooling = new Map([["qwen/qwen3.8-27b", Date.now() + 60_000]]);
    const picked = pickAutoModel({ ...base, available: pool, cooling, blocked: new Set() } as Parameters<typeof pickAutoModel>[0]);
    assert.ok(pool.has(picked.id), picked.id);
  });

  it("nêu tên model phòng không có, đúng nhà của model", () => {
    assert.equal(providerOfModel("deepgram-nova-3"), "deepgram");
    assert.equal(providerOfModel("qwen/qwen3.8-27b"), "groq");
    assert.equal(roomMissing(OFFER, ["whisper-large-v3", "auto"]), null);
    assert.deepEqual(roomMissing(OFFER, ["whisper-large-v3", "llama-3.3-70b-versatile"]), ["llama-3.3-70b-versatile"]);
    assert.deepEqual(roomMissing(OFFER, ["speechmatics-enhanced"]), null, "nhà chưa có danh sách: để máy chủ kiểm");
    assert.equal(roomMissing(null, ["x"]), null);
    assert.match(roomRefusal("minimaxai/minimax-m2.7"), /minimaxai\/minimax-m2\.7/);
  });
});
