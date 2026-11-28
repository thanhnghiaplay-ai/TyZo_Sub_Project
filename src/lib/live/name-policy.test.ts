import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { corePairs, namePolicyPrompt } from "./name-policy.ts";
import { tidyLiveText } from "./leftover-script.ts";
import { buildSessionUpdate } from "./qwen-protocol.ts";
import { LIVE_MODEL_35, LIVE_MODEL_38 } from "./live-price.ts";

// Dữ liệu giả lập theo ĐÍCH: bản dịch model có thể trả (tên nhân vật, địa danh, thuật ngữ, chữ dính liền).
const SAMPLES: Record<string, string[]> = {
  vi: ["Tôi gặp 王小明 ở 北京 hôm qua.", "Bạn phải luôn如一。", "Ca sĩ 아이유 hát ở 부산，rất hay！", "Tanaka đến 東京 dự hội nghị AI。", "Công ty ソニー ra mắt PlayStation 6."],
  en: ["I met 王小明 in Beijing。", "The hero 孫悟空 fought（again）.", "Kim Min-su lives in 서울, near Gangnam！", "We use the term 機械学習 here？"],
  zh: ["我在河内见到了 Nguyễn Văn An。", "田中先生去了 Seoul。", "这是 ChatGPT 的新功能，对吗？"],
  ja: ["王小明さんはハノイに行きました。", "김민수さんと Tokyo で会った。", "Nguyễn Văn An は 学生です。"],
  ko: ["왕샤오밍은 하노이에 갔다。", "田中 씨와 Tokyo에서 만났다.", "Nguyễn Văn An 학생입니다."],
};
const letters = (s: string) => [...s].filter((c) => /[\p{L}\p{N}]/u.test(c)).join("");

describe("RE7-004 · không lọc làm mất nội dung (hướng A)", () => {
  it("mọi chữ/số được giữ nguyên ở câu chốt, phần chờ và delta, cho cả 5 đích", () => {
    for (const [target, list] of Object.entries(SAMPLES))
      for (const s of list) {
        assert.equal(letters(tidyLiveText(s, target)), letters(s), `final ${target}: ${s}`);
        assert.equal(letters(tidyLiveText(s, target, false)), letters(s), `stash ${target}: ${s}`);
        // Cắt thành mẩu delta ở mọi vị trí 3 ký tự (kể cả giữa tên): ghép lại không mất chữ, khớp câu chốt.
        const parts = [...s].reduce<string[]>((a, c, i) => (i % 3 ? (a[a.length - 1] += c, a) : [...a, c]), []);
        const joined = parts.map((p) => tidyLiveText(p, target, false)).join("");
        assert.equal(letters(joined), letters(s), `delta ${target}: ${s}`);
        assert.equal(tidyLiveText(joined, target), tidyLiveText(s, target), `delta ghép = câu chốt ${target}: ${s}`);
      }
  });
  it("ca trước đây bị xóa nay được giữ; chỉ dấu câu toàn khổ đổi khi đích không dùng chữ CJK", () => {
    assert.equal(tidyLiveText("Bạn phải luôn如一。", "vi"), "Bạn phải luôn如一.");
    assert.equal(tidyLiveText("Tôi gặp 王小明 hôm qua.", "vi"), "Tôi gặp 王小明 hôm qua.");
    assert.equal(tidyLiveText("Ca sĩ 아이유 hát ở 부산，rất hay！", "vi"), "Ca sĩ 아이유 hát ở 부산, rất hay!");
    assert.equal(tidyLiveText("这是 ChatGPT 的新功能，对吗？", "zh"), "这是 ChatGPT 的新功能，对吗？");
  });
  it("hàm thuần, đồng bộ: không có lượt gọi AI nào trên đường streaming", () => {
    assert.equal(typeof tidyLiveText("x", "vi"), "string");
  });
});

describe("RE7-004 · hướng dẫn tên riêng (hướng D) và bảng thuật ngữ", () => {
  it("đủ 20 cặp có hướng giữa Anh/Trung/Nhật/Hàn/Việt, mỗi cặp có quy ước riêng và quy tắc giữ nguyên", () => {
    const pairs = corePairs();
    assert.equal(pairs.length, 20);
    assert.equal(new Set(pairs.map((p) => p.join(">"))).size, 20);
    const rules = new Set<string>();
    for (const [s, t] of pairs) {
      const p = namePolicyPrompt(s, t);
      assert.match(p, /keep the original name exactly/);
      assert.match(p, /Never omit, shorten, summarize/);
      assert.doesNotMatch(p, /undefined/);
      rules.add(p.split("\n")[2]);
    }
    assert.equal(rules.size, 20, "mỗi cặp một quy ước");
    assert.throws(() => namePolicyPrompt("vi", "vi"));
  });
  it("bảng thuật ngữ đứng đầu, bắt buộc, bỏ trùng/rỗng, tối đa 30", () => {
    const g = [{ source: "孫悟空", target: "Tôn Ngộ Không" }, { source: " ", target: "x" }, { source: "孫悟空", target: "Khác" },
      ...Array.from({ length: 40 }, (_, i) => ({ source: `名${i}`, target: `Tên${i}` }))];
    const p = namePolicyPrompt("zh", "vi", g);
    const lines = p.split("\n");
    assert.match(lines[1], /Glossary \(mandatory, overrides every other rule/);
    assert.equal(lines[2], "- 孫悟空 → Tôn Ngộ Không");
    assert.ok(p.indexOf("Glossary") < p.indexOf("Proper names"));
    assert.equal(lines.filter((l) => l.includes(" → ")).length - 1, 30, "30 thuật ngữ + 1 dòng ví dụ quy ước");
    assert.doesNotMatch(p, /Khác/);
  });
  it("bảng thuật ngữ vẫn đi qua translation.corpus.phrases; phiên không có trường hướng dẫn chưa được xác nhận", () => {
    for (const model of [LIVE_MODEL_35, LIVE_MODEL_38]) {
      const u = buildSessionUpdate({ model, target: "vi", audio: false, hotwords: { "王小明": "Vương Tiểu Minh" } }) as { session: Record<string, unknown> };
      assert.deepEqual((u.session.translation as { corpus: unknown }).corpus, { phrases: { "王小明": "Vương Tiểu Minh" } });
      assert.equal("instructions" in u.session, false);
    }
  });
});
