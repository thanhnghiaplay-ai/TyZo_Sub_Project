import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dropLeftoverScript, keepsSourceScript } from "./leftover-script.ts";

describe("Dịch trực tiếp: bỏ chữ gốc sót trong bản dịch", () => {
  it("bỏ chữ Hán sót khi dịch sang tiếng Việt (ca thật 28/11/2026)", () => {
    assert.equal(dropLeftoverScript("Bạn phải luôn如一.", "vi"), "Bạn phải luôn.");
    assert.equal(dropLeftoverScript("Xin chào 你好 bạn。", "vi"), "Xin chào bạn.");
  });
  it("bỏ kana, Hangul; đổi dấu câu toàn khổ", () => {
    assert.equal(dropLeftoverScript("Cảm ơn ありがとう，hẹn gặp 안녕！", "vi"), "Cảm ơn, hẹn gặp!");
    assert.equal(dropLeftoverScript("Hello カタカナー world？", "en"), "Hello world?");
  });
  it("giữ nguyên khi đích là Trung, Nhật, Hàn, Quảng Đông", () => {
    for (const t of ["zh", "ja", "ko", "yue", "zh-TW"]) {
      assert.ok(keepsSourceScript(t));
      assert.equal(dropLeftoverScript("你好，こんにちは。", t), "你好，こんにちは。");
    }
  });
  it("mẩu tạm: chỉ bỏ ký tự, không cắt khoảng trắng đầu/cuối", () => {
    assert.equal(dropLeftoverScript(" luôn如", "vi", false), " luôn");
    assert.equal(dropLeftoverScript("一 ", "vi", false), " ");
  });
  it("chữ Việt có dấu, số và chữ Latin không bị đụng", () => {
    const s = "Đừng vì vinh hoa phú quý nhất thời, năm 2026 (OK).";
    assert.equal(dropLeftoverScript(s, "vi"), s);
  });
});

describe("cầu nối dùng bộ lọc cho mọi chữ dịch gửi xuống", () => {
  it("translation (câu, phần chờ) và translation-delta đều qua dropLeftoverScript với đích của vé", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("./live-bridge.ts", import.meta.url), "utf8");
    assert.match(src, /event\.kind === "translation"\) \{\s*send\(client, \{ type: "event", event: \{ \.\.\.event, text: dropLeftoverScript\(event\.text, ticket\.target, event\.final\), stash: dropLeftoverScript\(event\.stash, ticket\.target, false\)/);
    assert.match(src, /event\.kind === "translation-delta"\) \{\s*send\(client, \{ type: "event", event: \{ \.\.\.event, delta: dropLeftoverScript\(event\.delta, ticket\.target, false\)/);
  });
});
