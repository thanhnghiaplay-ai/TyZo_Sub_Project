import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { captionChunks, captionLayout, captionSentences } from "./caption-layout.ts";

// Cùng các trường hợp với android/tools/CaptionLayoutCheck.kt: web và ứng dụng sắp chữ giống nhau.
describe("sắp chữ phụ đề dịch trực tiếp", () => {
  it("tách câu theo dấu câu, gộp chấm lửng", () => {
    assert.deepEqual(captionSentences("Bạn có mệt không? Mệt. Có khó không"), { list: ["Bạn có mệt không?", "Mệt.", "Có khó không"], closed: false });
    assert.deepEqual(captionSentences("Khó. Bỏ không?"), { list: ["Khó.", "Bỏ không?"], closed: true });
    assert.deepEqual(captionSentences("Thôi... Đi"), { list: ["Thôi...", "Đi"], closed: false });
  });

  it("câu dài chia đều, cắt ở dấu phẩy gần giữa hoặc khoảng trắng; không để đuôi một chữ; chữ Trung cắt cứng", () => {
    // Trường hợp thấy khi thử 23/11/2026: trước đây ra «…gánh vác thay» + «tôi?».
    assert.deepEqual(captionChunks("Nếu tôi từ bỏ, thì ai sẽ gánh vác thay tôi?", 42), ["Nếu tôi từ bỏ,", "thì ai sẽ gánh vác thay tôi?"]);
    assert.deepEqual(captionChunks("Nếu tôi từ bỏ, thì ai sẽ gánh vác thay cho tôi?", 42), ["Nếu tôi từ bỏ,", "thì ai sẽ gánh vác thay cho tôi?"]);
    assert.deepEqual(captionChunks("Dù có khó đến đâu, cũng không thể để cha mẹ phải chịu khổ thêm nữa", 42), ["Dù có khó đến đâu, cũng không thể", "để cha mẹ phải chịu khổ thêm nữa"]);
    assert.deepEqual(captionChunks("一二三四五六七八九十", 4), ["一二三四", "五六七", "八九十"]);
    for (const text of ["Nếu tôi từ bỏ, thì ai sẽ gánh vác thay cho tôi?", "Dù có khó đến đâu, cũng không thể để cha mẹ phải chịu khổ thêm nữa, mãi mãi về sau"]) {
      const parts = captionChunks(text, 42);
      assert.ok(parts.every((p) => [...p].length <= 42), parts.join(" | "));
      assert.ok(parts.every((p) => p.split(" ").length >= 2), "không có đoạn chỉ một chữ: " + parts.join(" | "));
    }
  });

  it("bài hát một mục dài chưa chốt: một câu xong + câu đang nói, không dồn cả đoạn", () => {
    const song = { text: "Bạn có mệt không? Mệt. Có khó không? Khó. Bạn có muốn từ bỏ không? Có. Nhưng bạn có thể từ bỏ được không", stash: "Không", final: false };
    assert.deepEqual(captionLayout([song], 1, 42, false), { done: ["Có."], live: "Nhưng bạn có thể từ bỏ được không Không" });
    assert.deepEqual(captionLayout([song], 2, 42, true).done, ["Bạn có muốn từ bỏ không?", "Có."]);
  });

  it("hai mục, đã chốt hết, câu đang nói dài, rỗng", () => {
    assert.deepEqual(captionLayout([{ text: "Thật đáng tiếc.", stash: "", final: true }, { text: "Anh ấy", stash: "sẽ đến", final: false }], 1, 42, false), {
      done: ["Thật đáng tiếc."],
      live: "Anh ấy sẽ đến",
    });
    assert.deepEqual(captionLayout([{ text: "A b. C d.", stash: "", final: true }], 1, 42, false), { done: ["C d."], live: "" });
    assert.deepEqual(captionLayout([{ text: "", stash: "Dù có khó đến đâu, cũng không thể để cha mẹ phải chịu khổ thêm nữa", final: false }], 1, 42, false), {
      done: ["Dù có khó đến đâu, cũng không thể"],
      live: "để cha mẹ phải chịu khổ thêm nữa",
    });
    assert.deepEqual(captionLayout([], 1, 42, false), { done: [], live: "" });
  });
});
