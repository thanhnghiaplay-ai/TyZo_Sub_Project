import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { modelTotal, modelTotalText } from "./model-total.ts";
import { roomListHas } from "./key-list.ts";

describe("tổng model của mọi key", () => {
  it("cộng các nhà có key, bỏ nhà không có hoặc chưa đọc được", () => {
    const sum = modelTotal({ groq: 11, alibaba: 3 });
    assert.equal(sum.total, 14);
    assert.deepEqual(sum.parts.map((part) => part.id), ["groq", "alibaba"]);
  });

  it("câu báo: key phòng và key riêng, chỉ chia theo nhà khi có từ hai nhà", () => {
    assert.equal(modelTotalText(true, { groq: 11 }), "Đã đồng bộ với key của phòng. Dùng được 11 model.");
    assert.equal(modelTotalText(true, { groq: 11, alibaba: 9 }), "Đã đồng bộ với key của phòng. Dùng được 20 model (Groq 11, Alibaba 9).");
    assert.match(modelTotalText(false, { groq: 4, alibaba: 2 }), /^Các key của bạn dùng được 6 model \(Groq 4, Alibaba 2\)\./);
  });
});

describe("nhãn «key phòng không thấy» ở Admin", () => {
  it("Groq đã kiểm danh sách: không có thì false", () => {
    assert.equal(roomListHas("groq", "llama-3.3-70b-versatile", ["whisper-large-v3"]), false);
    assert.equal(roomListHas("groq", "whisper-large-v3", ["whisper-large-v3"]), true);
  });

  it("chưa có danh sách thì null", () => {
    assert.equal(roomListHas("groq", "x-model", null), null);
    assert.equal(roomListHas("groq", "x-model", []), null);
  });
});
