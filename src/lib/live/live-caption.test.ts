import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { captionRows, cleanHotwords, HOTWORD_MAX, packSavedLive, parseCaptionPrefs, parseHotwords, parseSavedLive, CAPTION_DEFAULT } from "./live-caption.ts";
import { parseLiveOpen } from "./live-open-rules.ts";
import { signLiveTicket, verifyLiveTicket } from "./live-ticket.ts";
import { buildSessionUpdate } from "./qwen-protocol.ts";
import { LIVE_MODEL_38 } from "./live-price.ts";
import type { LiveLine } from "./live-transcript.ts";

const line = (id: string, translation: string, source = "", stash = ""): LiveLine => ({
  id,
  startMs: 0,
  endMs: 0,
  source,
  sourceStash: "",
  translation,
  translationStash: stash,
  speaker: "",
  final: false,
});

describe("tùy chỉnh phụ đề", () => {
  it("đọc tùy chỉnh đã lưu, sai thì về mặc định, số dòng 1 đến 4", () => {
    assert.deepEqual(parseCaptionPrefs(null), CAPTION_DEFAULT);
    assert.deepEqual(parseCaptionPrefs({ size: "xl", lines: 9, source: true, solid: false }), { size: "xl", lines: 4, source: true, solid: false });
    assert.equal(parseCaptionPrefs({ size: "huge", lines: 0 }).size, "m");
    assert.equal(parseCaptionPrefs({ lines: 0 }).lines, 1);
  });
  it("lấy các dòng mới nhất có chữ, cũ trước mới sau", () => {
    const rows = captionRows([line("a", "Một"), line("b", ""), line("c", "Hai", "二"), line("d", "", "", "Ba đang")], 2);
    assert.deepEqual(rows.map((row) => row.id), ["c", "d"]);
    assert.equal(rows[1].pending, "Ba đang");
    assert.equal(rows[0].source, "二");
    assert.deepEqual(captionRows([], 2), []);
  });
});

describe("từ cần giữ đúng", () => {
  it("mỗi dòng «gốc = dịch», chỉ có gốc thì giữ nguyên, bỏ dòng trống và trùng", () => {
    assert.deepEqual(parseHotwords("李逍遥 = Lý Tiêu Dao\n\n灵儿→Linh Nhi\nTyZo\n李逍遥 = Khác"), { "李逍遥": "Lý Tiêu Dao", "灵儿": "Linh Nhi", TyZo: "TyZo" });
    assert.deepEqual(parseHotwords("a".repeat(41)), {});
  });
  it("tối đa 30 cặp; vé chỉ nhận chuỗi", () => {
    const many = Array.from({ length: 40 }, (_, i) => `w${i}`).join("\n");
    assert.equal(Object.keys(parseHotwords(many)).length, HOTWORD_MAX);
    assert.deepEqual(cleanHotwords({ a: "b", c: 3, " ": "x" }), { a: "b" });
    assert.deepEqual(cleanHotwords(["a"]), {});
  });
  it("đi từ xin vé qua vé ký tới lệnh mở phiên Qwen", () => {
    const open = parseLiveOpen({ model: LIVE_MODEL_38, target: "vi", source: "zh", audio: false, words: { "李逍遥": "Lý Tiêu Dao" } });
    assert.deepEqual(open.words, { "李逍遥": "Lý Tiêu Dao" });
    assert.equal("words" in parseLiveOpen({ model: LIVE_MODEL_38, target: "vi", source: "", audio: false, words: {} }), false);
    const token = signLiveTicket("s", { uid: "u", sid: "x", model: LIVE_MODEL_38, target: "vi", source: "zh", audio: false, words: open.words, exp: 2000 });
    const ticket = verifyLiveTicket("s", token, 1000);
    assert.deepEqual(ticket?.words, { "李逍遥": "Lý Tiêu Dao" });
    const update = buildSessionUpdate({ model: LIVE_MODEL_38, target: "vi", audio: false, hotwords: ticket?.words });
    assert.deepEqual((update?.session as { translation: unknown }).translation, { language: "vi", corpus: { phrases: { "李逍遥": "Lý Tiêu Dao" } } });
  });
  it("vé cũ không có danh sách vẫn hợp lệ", () => {
    const token = signLiveTicket("s", { uid: "u", sid: "x", model: LIVE_MODEL_38, target: "vi", source: "", audio: false, exp: 2000 });
    const ticket = verifyLiveTicket("s", token, 1000);
    assert.ok(ticket);
    assert.equal("words" in (ticket ?? {}), false);
  });
});

describe("bản lưu phiên trước", () => {
  it("lưu câu có chữ, đọc lại; dữ liệu hỏng thì bỏ", () => {
    const packed = packSavedLive(
      [
        { start: 0, end: 1, original: "你好", translation: "Xin chào" },
        { start: 1, end: 2, original: " ", translation: null },
      ],
      123,
    );
    assert.deepEqual(packed, { at: 123, cues: [{ start: 0, end: 1, original: "你好", translation: "Xin chào" }] });
    assert.deepEqual(parseSavedLive(JSON.stringify(packed)), packed);
    assert.equal(packSavedLive([], 1), null);
    assert.equal(parseSavedLive("{hỏng"), null);
    assert.equal(parseSavedLive(JSON.stringify({ at: 1, cues: [{ start: "x" }] })), null);
  });
});
