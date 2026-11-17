import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rentKindsOf, rentRowsFor } from "./rent-rows.ts";
import { PROVIDER_IDS } from "./sub/provider.ts";

describe("hàng model thuê phòng ở Admin", () => {
  it("loại chặn được theo khả năng nhà: Groq nhận dạng và dịch, Alibaba và Deepgram chỉ nhận dạng", () => {
    assert.deepEqual([...rentKindsOf("groq")].sort(), ["asr", "chat", "guard"]);
    assert.deepEqual([...rentKindsOf("alibaba")], ["asr"]);
    assert.deepEqual([...rentKindsOf("deepgram")], ["asr"]);
  });

  it("chưa đồng bộ key phòng vẫn đủ model đã biết, onKey là null", () => {
    const groq = rentRowsFor("groq", null);
    assert.ok(groq.some((row) => row.id === "whisper-large-v3-turbo"));
    assert.ok(groq.some((row) => row.id === "llama-3.3-70b-versatile"));
    assert.ok(groq.every((row) => row.onKey === null));
    assert.deepEqual(rentRowsFor("alibaba", null).map((row) => row.id), ["qwen-audio-3.0-asr-flash-filetrans"]);
    assert.deepEqual(rentRowsFor("deepgram", null).map((row) => row.id), ["deepgram-nova-3"]);
  });

  it("không đưa giọng đọc hay dịch trực tiếp vào bảng (cửa Thuê phòng chưa chặn được)", () => {
    const ids = PROVIDER_IDS.flatMap((id) => rentRowsFor(id, null).map((row) => row.id));
    assert.ok(!ids.some((id) => /orpheus|aura-2|livetranslate/i.test(id)));
  });

  it("model lạ trên key phòng được thêm để Chủ mở, nhưng chỉ loại chặn được", () => {
    const rows = rentRowsFor("groq", ["whisper-large-v3", "meta-llama/new-model-9b", "canopylabs/orpheus-v1-english", "unknown-asr-model", "whisper-next"]);
    const ids = rows.map((row) => row.id);
    assert.ok(ids.includes("meta-llama/new-model-9b"), "model dịch lạ phải hiện");
    assert.ok(ids.includes("whisper-next"), "model nhận dạng lạ phải hiện");
    assert.ok(!ids.includes("canopylabs/orpheus-v1-english"), "giọng đọc không hiện");
    assert.equal(rows.find((row) => row.id === "whisper-large-v3")?.onKey, true);
    assert.equal(rows.find((row) => row.id === "whisper-large-v3-turbo")?.onKey, false, "có trong danh mục nhưng key phòng không thấy");
  });

  it("Deepgram: tên lạ không đoán bừa thành model dịch, giọng Aura không hiện", () => {
    const rows = rentRowsFor("deepgram", ["nova-3", "nova-3-medical", "aura-2-thalia-en", "something-else"]);
    const ids = rows.map((row) => row.id);
    assert.ok(ids.includes("nova-3-medical"));
    assert.ok(!ids.includes("aura-2-thalia-en"));
    assert.ok(!ids.includes("something-else"));
  });

  it("không trùng hàng và mã nào cũng hợp lệ để lưu", () => {
    for (const id of PROVIDER_IDS) {
      const rows = rentRowsFor(id, ["a-model", "a-model", "whisper-large-v3", "bad id with spaces"]);
      const ids = rows.map((row) => row.id);
      assert.equal(new Set(ids).size, ids.length, `${id} trùng hàng`);
      assert.ok(!ids.includes("bad id with spaces"));
    }
  });
});
