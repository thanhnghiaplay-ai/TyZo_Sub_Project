import assert from "node:assert/strict";
import test from "node:test";
import { DEEPGRAM_BASE_ROWS, DEEPGRAM_MULTI_ID, DEEPGRAM_NOVA_ID } from "./deepgram-base.ts";
import { acceptDgQuote, mergeDeepgram, parseDeepgramPrices, parseDgConfig, withoutStruck } from "./deepgram-price.ts";

const MD = `
| Nova-3 Monolingual | $0.0048 ~~was $0.0077~~ / min | $0.0042 ~~was $0.0065~~ / min | - |
| Nova-3 Multilingual | $0.0058 ~~was $0.0092~~ / min | $0.0050 ~~was $0.0078~~ / min | - |
| Aura-2 | $0.030 /1k characters | $0.027 /1k characters | - |
`;
const HTML = `<tr><td>Nova-3 Monolingual</td><td>$0.0048 <s>$0.0077</s> / min</td></tr>
<tr><td>Nova-3 Multilingual</td><td>$0.0058 <del>$0.0092</del> / min</td></tr>
<tr><td>Aura-2</td><td>$0.030 /1k characters</td></tr>`;

test("đọc giá từ markdown, bỏ giá gạch", () => {
  const q = parseDeepgramPrices(MD);
  assert.equal(q.find((x) => x.id === DEEPGRAM_NOVA_ID)?.usdPerHour, 0.288);
  assert.equal(q.find((x) => x.id === DEEPGRAM_MULTI_ID)?.usdPerHour, 0.348);
  assert.equal(q.find((x) => x.id === "aura-2")?.usdPerMillionChars, 30);
});

test("đọc giá từ HTML có thẻ gạch", () => {
  const q = parseDeepgramPrices(HTML);
  assert.equal(q.length, 3);
  assert.equal(q[0].usdPerHour, 0.288);
});

test("withoutStruck bỏ cả hai kiểu", () => {
  assert.ok(!withoutStruck("a ~~b~~ <s>c</s> d").match(/[bc]/));
});

test("trang đổi dạng thì không đoán", () => {
  assert.deepEqual(parseDeepgramPrices("<p>Hello</p>"), []);
});

test("giá lệch quá xa bị bỏ, giữ dự phòng", () => {
  const base = DEEPGRAM_BASE_ROWS[0];
  assert.equal(acceptDgQuote({ id: base.id, usdPerHour: 99, usdPerMillionChars: null }, base), null);
  const merged = mergeDeepgram([{ id: base.id, usdPerHour: 99, usdPerMillionChars: null }]);
  assert.equal(merged[0].usdPerHour, base.usdPerHour);
  const ok = mergeDeepgram([{ id: base.id, usdPerHour: 0.3, usdPerMillionChars: null }]);
  assert.equal(ok[0].usdPerHour, 0.3);
});

test("cấu hình: mặc định, kẹp chu kỳ, hỏng thì mặc định", () => {
  assert.deepEqual(parseDgConfig(null), { auto: true, everyHours: 6 });
  assert.equal(parseDgConfig('{"auto":false,"everyHours":9999}').everyHours, 168);
  assert.equal(parseDgConfig('{"auto":false}').auto, false);
  assert.deepEqual(parseDgConfig("xx"), { auto: true, everyHours: 6 });
});
