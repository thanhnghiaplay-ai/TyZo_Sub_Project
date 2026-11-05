import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatLiveDetail, formatLivePrice, formatUsdCost, parseGroqModelsHtml } from "./groq-board.ts";

const html = `
<table>
<tr><td>GPT OSS 20B openai/gpt-oss-20b 1000 $0.075 input $0.30 output 250K TPM 1K RPM 131,072 65,536 -</td></tr>
<tr><td>Whisper Large V3 Turbo whisper-large-v3-turbo - $0.04 per hour 400K ASH 400 RPM - - 100 MB</td></tr>
<tr><td>Llama 3.3 70B llama-3.3-70b-versatile 280 Contact Sales Contact Sales 131,072 32,768 -</td></tr>
</table>
`;

describe("bảng giá Groq", () => {
  it("đọc giá, hạn mức và token rồi viết bằng tiếng Việt, đơn vị đồng", () => {
    const rows = parseGroqModelsHtml(html);
    assert.equal(rows.length, 3);
    const chat = rows[0];
    assert.equal(chat.id, "openai/gpt-oss-20b");
    assert.equal(chat.usdIn, 0.075);
    assert.equal(chat.usdOut, 0.3);
    assert.equal(chat.contextTokens, 131072);
    assert.equal(chat.maxCompletionTokens, 65536);
    assert.equal(formatLivePrice(chat, 25000), "1.875 đ vào / 7.500 đ ra mỗi triệu token");
    assert.match(formatLiveDetail(chat), /1\.000 token\/giây/);
    assert.match(formatLiveDetail(chat), /cửa sổ 131\.072 token/);
    assert.match(formatLiveDetail(chat), /tối đa 65\.536 token mỗi lần trả lời/);
    assert.match(formatLiveDetail(chat), /250\.000 token\/phút/);
    assert.match(formatLiveDetail(chat), /1\.000 yêu cầu\/phút/);
    const asr = rows[1];
    assert.equal(asr.usdPerHour, 0.04);
    assert.equal(formatLivePrice(asr, 25000), "1.000 đ/giờ");
    assert.match(formatLiveDetail(asr), /400\.000 giây\/giờ/);
    assert.match(formatLiveDetail(asr), /file tối đa 100 MB/);
    assert.equal(formatLivePrice(rows[2], 25000), "Groq không niêm yết");
    assert.equal(formatUsdCost(0.012, 25000), "khoảng 300 đ");
    assert.equal(formatUsdCost(0, 25000), "0 đ");
  });
});
