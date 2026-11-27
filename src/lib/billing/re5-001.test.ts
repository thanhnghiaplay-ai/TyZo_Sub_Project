/**
 * RE5-001 (v5.49.6): tái hiện các đường vượt cận 2×byte+512 của cửa trả theo lượt.
 * Test `todo` = lỗi đã tái hiện, chờ sửa ở mức HIGH; khi sửa xong bỏ `todo` để thành hồi quy.
 * Bằng chứng tokenizer: docs/kiem-toan/v5.49.6/RE5-001/.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { promptTokenBound, readRequest } from "./run-gate.ts";
import { modelKindOf } from "../sub/model-catalog.ts";

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
    it(`${route}: chargeWith nhận thân đã chuẩn hóa (cùng thân gửi nhà)`, { todo: "RE5-001: chờ sửa mức HIGH" }, () => {
      const src = readFileSync(route, "utf8");
      const call = src.slice(src.indexOf("await chargeWith({"), src.indexOf("send:", src.indexOf("await chargeWith({")));
      assert.match(call, /body: parsed\.body \?\? body/);
    });
  }

  it("model có công cụ chạy tại nhà (Groq compound) không được xem là model dịch trả theo lượt", { todo: "RE5-001: chờ sửa mức HIGH" }, () => {
    for (const id of ["groq/compound", "groq/compound-mini"]) assert.notEqual(modelKindOf("groq", id), "chat", id);
  });
});
