import assert from "node:assert/strict";
import test from "node:test";
import { isTypingTarget, pastedLink, showHomeHero } from "./home-state.ts";

const idle = { hasSegs: false, running: false, analyzing: false, reviewHold: false, forced: false };

test("trang chủ gọn chỉ hiện khi chưa có gì để xem", () => {
  assert.equal(showHomeHero(idle), true);
  assert.equal(showHomeHero({ ...idle, hasSegs: true }), false);
  assert.equal(showHomeHero({ ...idle, running: true }), false);
  assert.equal(showHomeHero({ ...idle, analyzing: true }), false);
  assert.equal(showHomeHero({ ...idle, reviewHold: true }), false);
});

test("bấm mục trong menu trái thì hiện khung đầy đủ", () => {
  assert.equal(showHomeHero({ ...idle, forced: true }), false);
});

test("pastedLink chỉ nhận một link http/https trọn đoạn", () => {
  assert.equal(pastedLink("  https://a.com/phim.mp4 \n"), "https://a.com/phim.mp4");
  assert.equal(pastedLink("http://a.com/x"), "http://a.com/x");
  assert.equal(pastedLink("xem cái này https://a.com/phim.mp4"), null);
  assert.equal(pastedLink("https://a.com/a\nhttps://a.com/b"), null);
  assert.equal(pastedLink("ftp://a.com/phim.mp4"), null);
  assert.equal(pastedLink("javascript:alert(1)"), null);
  assert.equal(pastedLink("chỉ là chữ"), null);
  assert.equal(pastedLink(""), null);
  assert.equal(pastedLink("https://a.com/" + "x".repeat(3000)), null);
});

test("isTypingTarget nhận ô gõ chữ", () => {
  assert.equal(isTypingTarget({ tagName: "INPUT" } as unknown as EventTarget), true);
  assert.equal(isTypingTarget({ tagName: "textarea" } as unknown as EventTarget), true);
  assert.equal(isTypingTarget({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget), true);
  assert.equal(isTypingTarget({ tagName: "BUTTON" } as unknown as EventTarget), false);
  assert.equal(isTypingTarget(null), false);
});
