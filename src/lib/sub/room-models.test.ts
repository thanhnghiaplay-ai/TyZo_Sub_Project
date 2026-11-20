import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickAutoModel } from "./models.ts";
import { pickPool, roomMissing, roomRefusal } from "./room-models.ts";

// Danh sách thật của key phòng lúc báo lỗi (20/11/2026): không có minimax, llama-3.3, muse-spark.
const ROOM = ["whisper-large-v3", "whisper-large-v3-turbo", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];

describe("room-models", () => {
  it("trả theo lượt thì chọn trong danh sách phòng, kể cả khi key khách có model khác", () => {
    const own = ["minimaxai/minimax-m2.7", "llama-3.3-70b-versatile", "qwen/qwen3.8-27b"];
    const pool = pickPool(true, ROOM, own);
    assert.deepEqual(pool, new Set(ROOM));
    assert.deepEqual(pickPool(false, ROOM, own), new Set(own));
    assert.equal(pickPool(true, null, null), null);
  });

  it("phim tiếng Trung, qwen đang nghỉ: Tự động không nhảy sang model phòng không có", () => {
    const base = { profile: "accurate" as const, texts: ["analysis"], sourceLang: "zh", genre: "auto", glossaryHit: true, allowEnterprise: false, escalate: true };
    const cooling = new Map([["qwen/qwen3.8-27b", Date.now() + 60_000]]);
    const picked = pickAutoModel({ ...base, available: pickPool(true, ROOM, null), cooling, blocked: new Set() } as Parameters<typeof pickAutoModel>[0]);
    assert.ok(ROOM.includes(picked.id), picked.id);
  });

  it("nêu tên model Groq phòng không có", () => {
    assert.equal(roomMissing(ROOM, "whisper-large-v3", null), null);
    assert.equal(roomMissing(ROOM, "whisper-large-v3", "auto"), null);
    assert.deepEqual(roomMissing(ROOM, "whisper-large-v3", "llama-3.3-70b-versatile"), ["llama-3.3-70b-versatile"]);
    assert.equal(roomMissing(null, "x", "y"), null);
    assert.match(roomRefusal("minimaxai/minimax-m2.7"), /minimaxai\/minimax-m2\.7/);
  });
});
