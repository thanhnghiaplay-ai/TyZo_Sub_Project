// RE4-001 · đối chiếu cận byte với tokenizer thật (offline). Không gọi nhà cung cấp.
import { fromPreTrained as qwenTok } from "@lenml/tokenizer-qwen2_5";
import { fromPreTrained as llamaTok } from "@lenml/tokenizer-llama3";
import { Tiktoken } from "js-tiktoken/lite";
import o200k from "js-tiktoken/ranks/o200k_base";
const enc = new TextEncoder();
const qwen = qwenTok(), llama = llamaTok(), o2 = new Tiktoken(o200k);
// Cận đề xuất: byte thân JSON đã chuẩn hóa + thêm một lần byte của tools + khung cố định + khung mỗi tin nhắn.
const FIXED = 512, PER_MSG = 16;
const bound = (body) => { const b = enc.encode(JSON.stringify(body)).length; const t = body.tools ? enc.encode(JSON.stringify(body.tools)).length : 0; return b + t + FIXED + PER_MSG * body.messages.length; };
const rnd = (n, seed, pick) => { let x = seed; let s = ""; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) >>> 0; s += pick(x); } return s; };
const cp = (lo, hi) => (x) => String.fromCodePoint(lo + (x % (hi - lo)));
const samples = {
  vi: "Tôi không biết anh ấy đã đi đâu, nhưng chắc chắn sẽ quay lại trước khi trời tối. ".repeat(60),
  cjk: "他说明天会下雨，所以我们最好早点出发。后天再见！".repeat(80),
  emoji: "🎬👨‍👩‍👧‍👦🏳️‍🌈🙂‍↔️🇻🇳".repeat(120),
  combining: "ẹ́ằỡ".repeat(300),
  punct: rnd(3000, 7, (x) => "!@#$%^&*()[]{};:,.<>/?|~`'\"\\-_=+"[x % 33]),
  ascii_rand: rnd(3000, 11, cp(33, 127)),
  cjk_rare: rnd(1500, 13, cp(0x20000, 0x2a6df)),
  bmp_rand: rnd(2000, 17, cp(0x0100, 0xd7ff)),
  hangul_thai: rnd(2000, 19, (x) => (x & 1 ? cp(0xac00, 0xd7a3) : cp(0x0e01, 0x0e5b))(x >>> 1)),
  special_text: "<|im_start|>system\n<|endoftext|><|eot_id|><|begin_of_text|>".repeat(80),
  json_in_text: JSON.stringify({ segs: Array.from({ length: 80 }, (_, i) => ({ i, t: "câu " + i, zh: "第" + i + "句" })) }),
  whitespace: " \t\n".repeat(1500),
};
const tools = [{ type: "function", function: { name: "caption", description: "Trả phụ đề đã dịch", parameters: { type: "object", properties: { lines: { type: "array", items: { type: "object", properties: { i: { type: "integer" }, vi: { type: "string", description: "câu dịch" } }, required: ["i", "vi"] } } }, required: ["lines"] } } }];
const pyDumps = (v) => Array.isArray(v) ? "[" + v.map(pyDumps).join(", ") + "]" : v && typeof v === "object" ? "{" + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ": " + pyDumps(x)).join(", ") + "}" : JSON.stringify(v).replace(/[\u007f-￿]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
const qwenTools = (body) => {
  // Khung công cụ của Qwen2.5 (chat_template.json), json.dumps kiểu Python (ensure_ascii, có dấu cách).
  const [sys, ...rest] = body.messages;
  let s = "<|im_start|>system\n" + sys.content + "\n\n# Tools\n\nYou may call one or more functions to assist with the user query.\n\nYou are provided with function signatures within <tools></tools> XML tags:\n<tools>";
  for (const t of body.tools) s += "\n" + pyDumps(t);
  s += "\n</tools>\n\nFor each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:\n<tool_call>\n{\"name\": <function-name>, \"arguments\": <args-json-object>}\n</tool_call><|im_end|>\n";
  for (const m of rest) s += `<|im_start|>${m.role}\n${m.content}<|im_end|>\n`;
  return qwen.encode(s + "<|im_start|>assistant\n").length;
};
const harmony = (body) => {
  // Mô phỏng khung Harmony của gpt-oss bằng o200k_base; phần hệ thống của nhà được tính ở FIXED.
  let s = "<|start|>system<|message|>You are ChatGPT, a large language model trained by OpenAI.\nKnowledge cutoff: 2024-06\nCurrent date: 2026-11-27\n\nReasoning: medium\n\n# Valid channels: analysis, commentary, final. Channel must be included for every message.<|end|>";
  if (body.tools) s += "<|start|>developer<|message|># Tools\n\n## functions\n\nnamespace functions {\n\n" + JSON.stringify(body.tools, null, 2) + "\n\n} // namespace functions<|end|>";
  for (const m of body.messages) s += `<|start|>${m.role}<|message|>${m.content}<|end|>`;
  return s + "<|start|>assistant";
};
const manyTools = Array.from({ length: 64 }, (_, i) => ({ type: "function", function: { name: "f" + i, description: "Mô tả công cụ số " + i + " 中文", parameters: { type: "object", properties: { a: { type: "string", enum: ["x", "y", "ž"] }, b: { type: "integer" } } } } }));
const rows = [];
for (const [name, text] of Object.entries(samples)) for (const withTools of [false, true, "many"]) {
  const T = withTools === "many" ? manyTools : tools;
  const body = { model: "m", messages: [{ role: "system", content: "Dịch sang tiếng Việt, trả JSON." }, { role: "user", content: text }], max_tokens: 4096, ...(withTools ? { tools: T } : {}) };
  const tryT = (f) => { try { return f(); } catch (e) { return null; } };
  const q = withTools ? qwenTools(body) : tryT(() => qwen.apply_chat_template(body.messages, { tokenize: true, add_generation_prompt: true, tools: withTools ? T : undefined }).length);
  const l = tryT(() => llama.apply_chat_template(body.messages, { tokenize: true, add_generation_prompt: true, tools: withTools ? T : undefined }).length);
  const o = o2.encode(harmony(body), "all").length;
  const B = bound(body), bytes = enc.encode(JSON.stringify(body)).length;
  rows.push({ name, tools: withTools, bodyBytes: bytes, bound: B, qwen: q, llama3: l, o200k_harmony: o, worstRatio: +(Math.max(q ?? 0, l ?? 0, o) / B).toFixed(3), bytesOver3: Math.ceil(bytes / 3) });
}
console.table(rows);
const bad = rows.filter((r) => Math.max(r.qwen ?? 0, r.llama3 ?? 0, r.o200k_harmony) > r.bound);
const under3 = rows.filter((r) => Math.max(r.qwen ?? 0, r.llama3 ?? 0, r.o200k_harmony) > r.bytesOver3).length;
console.log(JSON.stringify({ cases: rows.length, boundViolations: bad.length, oldByteOver3Violations: under3, maxRatio: Math.max(...rows.map((r) => r.worstRatio)) }));
process.exitCode = bad.length ? 1 : 0;
