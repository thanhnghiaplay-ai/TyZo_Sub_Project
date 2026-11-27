// RE4-001: so usage.prompt_tokens thật của Groq/Alibaba với cận giữ Token (promptTokenBound), dùng đúng readRequest của app.
// Key do proxy chèn; script không đọc key. Trần đầu ra 64 token mỗi lệnh.
import { promptTokenBound, readRequest } from "../../../../src/lib/billing/run-gate.ts";
import { catalogFor } from "../../../../src/lib/sub/model-catalog.ts";
const HOUSES = {
  groq: { url: "https://api.groq.com/openai/v1", field: "max_completion_tokens" as const },
  alibaba: { url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", field: "max_tokens" as const },
};
const sys = "Dịch sang tiếng Việt. Chỉ trả bản dịch.";
const tool = [{ type: "function", function: { name: "caption", description: "Trả phụ đề đã dịch", parameters: { type: "object", properties: { lines: { type: "array", items: { type: "string" } } }, required: ["lines"] } } }];
const inputs: Record<string, Record<string, unknown>> = {
  vi: { messages: [{ role: "system", content: sys }, { role: "user", content: "Tôi không biết anh ấy đã đi đâu. ".repeat(40) }] },
  cjk: { messages: [{ role: "system", content: sys }, { role: "user", content: "他说明天会下雨，所以我们最好早点出发。".repeat(40) }] },
  emoji_tool: { messages: [{ role: "system", content: sys }, { role: "user", content: "🎬👨‍👩‍👧‍👦🙂 Xin chào 你好 ".repeat(30) }], tools: tool },
  numbers_tool: { messages: [{ role: "user", content: "ok" }], tools: [{ type: "function", function: { name: "f", parameters: { type: "object", properties: { x: { type: "number", enum: Array(1500).fill(1e20) } } } } }] },
};
const enc = new TextEncoder();
const rows: unknown[] = [];
for (const [house, h] of Object.entries(HOUSES)) {
  const have = new Set(((await (await fetch(`${h.url}/models`)).json()) as { data: { id: string }[] }).data.map((m) => m.id));
  for (const m of catalogFor(house as "groq", "chat")) {
    if (!have.has(m.id)) { rows.push({ house, model: m.id, skip: "key không có model" }); continue; }
    for (const [name, extra] of Object.entries(inputs)) {
      const raw = name === "numbers_tool"
        ? `{"model":"${m.id}","max_tokens":64,"messages":[{"role":"user","content":"ok"}],"tools":[{"type":"function","function":{"name":"f","parameters":{"type":"object","properties":{"x":{"type":"number","enum":[${Array(1500).fill("1e20").join(",")}]}}}}}]}`
        : JSON.stringify({ model: m.id, max_tokens: 64, ...extra });
      const parsed = await readRequest("/chat/completions", "application/json", enc.encode(raw).buffer as ArrayBuffer, h.field);
      if (!parsed?.body) { rows.push({ house, model: m.id, input: name, problem: parsed?.problem }); continue; }
      const bound = promptTokenBound(parsed.body.byteLength, m.contextTokens ?? null);
      const r = await fetch(`${h.url}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer proxy-injected" }, body: parsed.body });
      const d = (await r.json()) as { usage?: { prompt_tokens?: number; completion_tokens?: number }; error?: { message?: string } };
      const p = d.usage?.prompt_tokens;
      rows.push({ house, model: m.id, input: name, http: r.status, sentBytes: parsed.body.byteLength, bound, prompt: p ?? null, completion: d.usage?.completion_tokens ?? null,
        ratio: p ? +(p / bound).toFixed(3) : null, overBound: p != null ? p > bound : null, error: d.error?.message?.slice(0, 120) });
      await new Promise((res) => setTimeout(res, 2500));
    }
  }
}
console.log(JSON.stringify(rows, null, 1));
