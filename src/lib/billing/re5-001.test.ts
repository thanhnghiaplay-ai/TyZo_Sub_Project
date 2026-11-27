/**
 * RE5-001 (v5.49.6): tái hiện các đường vượt cận 2×byte+512 của cửa trả theo lượt.
 * Đã tái hiện ở 0ef9539 (todo), sửa sau đó; nay là hồi quy.
 * Bằng chứng tokenizer: docs/kiem-toan/v5.49.6/RE5-001/.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { promptTokenBound, readRequest } from "./run-gate.ts";
import { payPerTurnChat } from "../sub/model-catalog.ts";

const enc = (s: string) => {
  const u = new TextEncoder().encode(s);
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
};
// 4 byte "1e20" → 21 byte "100000000000000000000" sau JSON.parse/stringify; Qwen tách mỗi chữ số một token.
const expanding = `{"model":"qwen-plus","max_tokens":10,"messages":[{"role":"user","content":"a"}],"tools":[{"type":"function","function":{"name":"f","parameters":{"type":"object","properties":{"x":{"type":"number","enum":[${Array(4000).fill("1e20").join(",")}]}}}}}]}`;

describe("RE5-001: cận đầu vào phải tính trên đúng thân gửi cho nhà", () => {
  it("cơ chế: thân chuẩn hóa dài hơn thân gốc hơn 4 lần, cận theo thân gốc thấp hơn số chữ số gửi đi", async () => {
    const original = enc(expanding);
    const parsed = await readRequest("/chat/completions", "application/json", original, "max_tokens");
    assert.equal(parsed?.problem, null);
    const sent = parsed!.body!.byteLength;
    assert.ok(sent > 4 * original.byteLength, `${sent} vs ${original.byteLength}`);
    // Mỗi chữ số là một token với tokenizer Qwen: 4000 × 21 chữ số > cận tính trên thân gốc.
    assert.ok(4000 * 21 > promptTokenBound(original.byteLength, 1_000_000));
    assert.ok(4000 * 21 < promptTokenBound(sent, 1_000_000));
  });

  for (const route of ["src/routes/api/model-call.ts", "src/routes/api/room-groq.ts"]) {
    it(`${route}: cận giữ trước và lệnh gửi nhà dùng cùng một thân đã chuẩn hóa`, () => {
      const src = readFileSync(route, "utf8");
      assert.match(src, /const outbound = parsed\.body \?\? body!?;/);
      const start = src.indexOf("await chargeWith({");
      const call = src.slice(start, src.indexOf("});", src.indexOf("send:", start)));
      const bodies = [...call.matchAll(/\bbody(?::\s*([^,}]+))?[,}]/g)].map((m) => (m[1] ?? "body").trim());
      assert.deepEqual(bodies, ["outbound", "outbound"], call);
    });
  }

  it("chỉ model dịch trong danh mục đi cửa trả theo lượt: chặn Groq compound và model lạ", () => {
    for (const id of ["groq/compound", "groq/compound-mini", "some-new-model", "meta-llama/llama-4-scout-17b-16e-instruct"])
      assert.equal(payPerTurnChat("groq", id), false, id);
    assert.equal(payPerTurnChat("alibaba", "qwen-long"), false);
    for (const id of ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"]) assert.equal(payPerTurnChat("groq", id), true, id);
    for (const id of ["qwen-turbo", "qwen-plus", "qwen-max"]) assert.equal(payPerTurnChat("alibaba", id), true, id);
    for (const route of ["src/routes/api/model-call.ts", "src/routes/api/room-groq.ts"]) {
      const src = readFileSync(route, "utf8");
      const check = src.indexOf("payPerTurnChat(");
      assert.ok(check > 0 && check < src.indexOf("await chargeWith({"), `${route}: kiểm danh mục trước khi giữ/gọi nhà`);
    }
  });
});
