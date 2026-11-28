import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keepsSourceScript, tidyLiveText } from "./leftover-script.ts";

describe("Dịch trực tiếp: chỉnh hình thức bản dịch, không xóa chữ (RE7-004)", () => {
  it("giữ chữ Hán/kana/Hangul trong bản dịch tiếng Việt (trước đây bị xóa)", () => {
    assert.equal(tidyLiveText("Bạn phải luôn如一.", "vi"), "Bạn phải luôn如一.");
    assert.equal(tidyLiveText("Xin chào 你好 bạn。", "vi"), "Xin chào 你好 bạn.");
  });
  it("đổi dấu câu toàn khổ, giữ kana/Hangul", () => {
    assert.equal(tidyLiveText("Cảm ơn ありがとう，hẹn gặp 안녕！", "vi"), "Cảm ơn ありがとう, hẹn gặp 안녕!");
    assert.equal(tidyLiveText("Hello カタカナー world？", "en"), "Hello カタカナー world?");
  });
  it("giữ nguyên khi đích là Trung, Nhật, Hàn, Quảng Đông", () => {
    for (const t of ["zh", "ja", "ko", "yue", "zh-TW"]) {
      assert.ok(keepsSourceScript(t));
      assert.equal(tidyLiveText("你好，こんにちは。", t), "你好，こんにちは。");
    }
  });
  it("mẩu tạm: không cắt khoảng trắng đầu/cuối, không bỏ ký tự", () => {
    assert.equal(tidyLiveText(" luôn如", "vi", false), " luôn如");
    assert.equal(tidyLiveText("一 ", "vi", false), "一 ");
    assert.equal(tidyLiveText("，", "vi", false), ", ");
  });
  it("chữ Việt có dấu, số và chữ Latin không bị đụng", () => {
    const s = "Đừng vì vinh hoa phú quý nhất thời, năm 2026 (OK).";
    assert.equal(tidyLiveText(s, "vi"), s);
  });
});

describe("cầu nối dùng bộ chỉnh hình thức cho mọi chữ dịch gửi xuống", () => {
  it("translation (câu, phần chờ) và translation-delta đều qua tidyLiveText với đích của vé; không còn bộ lọc xóa chữ", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("./live-bridge.ts", import.meta.url), "utf8");
    assert.match(src, /event\.kind === "translation"\) \{\s*send\(client, \{ type: "event", event: \{ \.\.\.event, text: tidyLiveText\(event\.text, ticket\.target, event\.final\), stash: tidyLiveText\(event\.stash, ticket\.target, false\)/);
    assert.match(src, /event\.kind === "translation-delta"\) \{\s*send\(client, \{ type: "event", event: \{ \.\.\.event, delta: tidyLiveText\(event\.delta, ticket\.target, false\)/);
    assert.doesNotMatch(src, /dropLeftoverScript/);
  });
});
