import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALIBABA_ROWS } from "./alibaba-catalog.ts";
import { acceptQuote, mergeAlibaba, parseSingaporePrices } from "./alibaba-price.ts";

const PAGE = `
<h2>Singapore</h2>
<table>
<tr><td>qwen-turbo</td><td>International</td><td>$0.05</td><td>$0.20</td></tr>
<tr><td>qwen-plus</td><td>International</td><td>$0.40</td><td>$1.20</td></tr>
<tr><td>qwen3-asr-flash</td><td>International</td><td>0.000035 per second</td></tr>
<tr><td>qwen3-asr-flash-realtime</td><td>International</td><td>0.000090 per second</td></tr>
<tr><td>qwen-audio-3.0-asr-flash-filetrans</td><td>International</td><td>$0.000035/second</td></tr>
<tr><td>qwen3-tts-flash</td><td>International</td><td>$10 per million characters</td></tr>
</table>
<h2>China (Beijing)</h2>
<table>
<tr><td>qwen-turbo</td><td>$0.01</td><td>$0.02</td></tr>
<tr><td>qwen3-asr-flash</td><td>0.000032 per second</td></tr>
</table>
`;

describe("giá Alibaba vùng Singapore", () => {
  it("lấy Singapore, không lấy giá Trung Quốc, không nhầm model dài hơn", () => {
    const quotes = parseSingaporePrices(PAGE, ALIBABA_ROWS.map((row) => row.id));
    const turbo = quotes.find((row) => row.id === "qwen-turbo");
    const asr = quotes.find((row) => row.id === "qwen3-asr-flash");
    const file = quotes.find((row) => row.id === "qwen-audio-3.0-asr-flash-filetrans");
    assert.equal(turbo?.usdIn, 0.05);
    assert.equal(turbo?.usdOut, 0.2);
    assert.equal(asr?.usdPerHour, 0.000035 * 3600);
    assert.equal(file?.usdPerHour, 0.000035 * 3600);
    assert.equal(quotes.some((row) => row.id === "qwen3-asr-flash-realtime"), false);
  });

  it("giá lệch quá xa thì bỏ, model chưa có giá dự phòng nhận mức hợp lý", () => {
    const flash = ALIBABA_ROWS.find((row) => row.id === "qwen3-asr-flash");
    assert.equal(acceptQuote({ id: "qwen3-asr-flash", usdIn: null, usdOut: null, usdPerHour: 0.126, usdPerMillionChars: null }, flash)?.usdPerHour, 0.126);
    assert.equal(acceptQuote({ id: "qwen3-asr-flash", usdIn: null, usdOut: null, usdPerHour: 0.000035, usdPerMillionChars: null }, flash), null);
    const rows = mergeAlibaba([{ id: "qwen-turbo", usdIn: 99, usdOut: 99, usdPerHour: null, usdPerMillionChars: null }]);
    assert.equal(rows.find((row) => row.id === "qwen-turbo")?.usdIn, 0.05);
  });
});
