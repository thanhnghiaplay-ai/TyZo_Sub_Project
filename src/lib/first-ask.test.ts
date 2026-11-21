import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { USE_CHOICES, USE_KEY, readUse, rememberUse, shouldAsk, usePreset } from "./first-ask.ts";

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe("câu hỏi lần đầu", () => {
  it("chưa hỏi thì null; trả lời hoặc Bỏ qua thì nhớ; giá trị lạ coi như chưa hỏi", () => {
    const store = memory();
    assert.equal(readUse(store), null);
    rememberUse(store, "hoc");
    assert.equal(readUse(store), "hoc");
    rememberUse(store, "skip");
    assert.equal(readUse(store), "skip");
    store.setItem(USE_KEY, "la");
    assert.equal(readUse(store), null);
  });

  it("máy chặn đọc thì không hỏi (không làm phiền mỗi lần vào)", () => {
    const broken = { getItem: () => { throw new Error("chặn"); }, setItem: () => { throw new Error("chặn"); } };
    assert.equal(readUse(broken), "skip");
    assert.doesNotThrow(() => rememberUse(broken, "phim"));
  });

  it("một câu hỏi một lúc: không hỏi khi đang chọn cách trả hay đang đọc tài khoản", () => {
    assert.equal(shouldAsk(null, "choose"), false);
    assert.equal(shouldAsk(null, "reading"), false);
    assert.equal(shouldAsk(null, "key-none"), true);
    assert.equal(shouldAsk(null, "off"), true);
    assert.equal(shouldAsk("skip", "turn"), false);
    assert.equal(shouldAsk("phim", "turn"), false);
  });

  it("mỗi câu trả lời có câu báo; chỉ Học ngoại ngữ đổi cài đặt (tắt Thuyết minh) và nói rõ", () => {
    for (const choice of USE_CHOICES) assert.ok(usePreset(choice.id).tip.length > 10, choice.id);
    assert.equal(usePreset("hoc").narration, false);
    assert.match(usePreset("hoc").tip, /tắt Thuyết minh/);
    for (const id of ["phim", "lam-phu-de", "khac"] as const) assert.equal(usePreset(id).narration, undefined);
  });

  it("câu báo chỉ đúng tên nút đang có", () => {
    const exportMenu = readFileSync(new URL("../components/export-menu.tsx", import.meta.url), "utf8");
    assert.match(usePreset("lam-phu-de").tip, /Tải phụ đề/);
    assert.match(exportMenu, /Tải phụ đề/);
    const studio = readFileSync(new URL("../components/studio.tsx", import.meta.url), "utf8");
    assert.match(studio, /<FirstAskCard /);
  });
});
