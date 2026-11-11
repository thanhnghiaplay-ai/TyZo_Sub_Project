import test from "node:test";
import assert from "node:assert/strict";
import { chooseBetter, countScripts, meanLogprob, needsLangCheck, normalizeLang, scriptMismatch } from "./lang-check.ts";

const seg = (text: string, avg_logprob?: number) => ({ text, avg_logprob });

test("đếm chữ viết", () => {
  const c = countScripts("你好 hello こんにちは 안녕");
  assert.deepEqual([c.han, c.kana, c.hangul, c.latin], [2, 5, 2, 5]);
});

test("zh: câu tiếng Trung thường không lệch, lẫn vài chữ Anh vẫn không lệch", () => {
  assert.equal(scriptMismatch("zh", "这个项目黄了，你我都脱不了干系。别拿话噎我。"), false);
  assert.equal(scriptMismatch("zh", "我们的 project 已经 deadline 了，你说 OK 不 OK？"), false);
});

test("zh: câu tiếng Anh hoặc tiếng Nhật đủ dài thì lệch", () => {
  assert.equal(scriptMismatch("zh", "Don't spill the beans yet, we are on thin ice"), true);
  assert.equal(scriptMismatch("zh", "今度ぜひ飲みに行きましょう。前向きに検討します"), true);
});

test("ja: có kana thì khớp, chỉ có chữ Hán dài thì nghi là tiếng Trung", () => {
  assert.equal(scriptMismatch("ja", "今度ぜひ飲みに行きましょう"), false);
  assert.equal(scriptMismatch("ja", "这个项目黄了你我都脱不了干系"), true);
});

test("ko và en", () => {
  assert.equal(scriptMismatch("ko", "그럼 내일 다시 이야기합시다 안녕히 가세요"), false);
  assert.equal(scriptMismatch("ko", "Let us talk again tomorrow my friend"), true);
  assert.equal(scriptMismatch("en", "Spill what? You haven't told me squat."), false);
  assert.equal(scriptMismatch("en", "这个项目黄了你我都脱不了干系"), true);
});

test("đoạn quá ngắn hoặc mã lạ thì không kết luận", () => {
  assert.equal(scriptMismatch("zh", "OK"), false);
  assert.equal(scriptMismatch("", "Don't spill the beans yet, we are on thin ice"), false);
  assert.equal(scriptMismatch("vi", "Don't spill the beans yet, we are on thin ice"), false);
});

test("meanLogprob theo độ dài chữ, thiếu số thì null", () => {
  assert.equal(meanLogprob({ segments: [seg("a")] }), null);
  const m = meanLogprob({ segments: [seg("aaaa", -1), seg("b", -0.2)] });
  assert.ok(m !== null && Math.abs(m - (-1 * 4 + -0.2 * 1) / 5) < 1e-9);
});

test("needsLangCheck: lệch chữ hoặc độ tin thấp", () => {
  assert.equal(needsLangCheck("zh", { segments: [seg("Don't spill the beans yet, we are on thin ice", -0.3)] }), true);
  assert.equal(needsLangCheck("zh", { segments: [seg("这个项目黄了，你我都脱不了干系。", -1.1)] }), true);
  assert.equal(needsLangCheck("zh", { segments: [seg("这个项目黄了，你我都脱不了干系。", -0.3)] }), false);
  assert.equal(needsLangCheck("zh", { segments: [] }), false);
  assert.equal(needsLangCheck("", { segments: [seg("x", -2)] }), false);
});

test("normalizeLang", () => {
  assert.equal(normalizeLang("english"), "en");
  assert.equal(normalizeLang("Chinese"), "zh");
  assert.equal(normalizeLang("ja"), "ja");
  assert.equal(normalizeLang("vietnamese"), "");
  assert.equal(normalizeLang(undefined), "");
});

test("chooseBetter: chữ viết khớp lại thì lấy bản tự nhận", () => {
  const forced = { language: "chinese", segments: [seg("Don't spill the beans yet, we are on thin ice", -0.9)] };
  const auto = { language: "english", segments: [seg("Don't spill the beans yet, we are on thin ice", -0.2)] };
  assert.equal(chooseBetter("zh", forced, auto), "auto");
});

test("chooseBetter: tự nhận cùng ngôn ngữ, hoặc ngoài bốn ngôn ngữ, hoặc không rõ hơn thì giữ bản ép", () => {
  const forced = { segments: [seg("这个项目黄了，你我都脱不了干系。", -1.0)] };
  assert.equal(chooseBetter("zh", forced, { language: "chinese", segments: [seg("这个项目黄了", -0.1)] }), "forced");
  assert.equal(chooseBetter("zh", forced, { language: "vietnamese", segments: [seg("Xin chào các bạn", -0.1)] }), "forced");
  assert.equal(chooseBetter("zh", forced, { language: "english", segments: [seg("the project is dead and so are we", -0.9)] }), "forced");
  assert.equal(chooseBetter("zh", forced, { language: "english", segments: [] }), "forced");
});

test("chooseBetter: chữ viết vẫn lệch nhưng độ tin cao hơn rõ thì chấp nhận khi khớp chữ của ngôn ngữ đoán", () => {
  const forced = { segments: [seg("这个项目黄了，你我都脱不了干系。", -1.2)] };
  const auto = { language: "japanese", segments: [seg("今度ぜひ飲みに行きましょう", -0.3)] };
  assert.equal(chooseBetter("zh", forced, auto), "auto");
});
