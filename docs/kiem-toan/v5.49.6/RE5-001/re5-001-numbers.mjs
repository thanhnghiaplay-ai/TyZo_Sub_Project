// RE5-001 tái hiện: cận tính trên thân gốc, nhà nhận thân đã chuẩn hóa (số mũ bị khai triển).
import { fromPreTrained } from "@lenml/tokenizer-qwen2_5";
const qwen = fromPreTrained(), enc = new TextEncoder();
const N = 400;
const props = `"x":{"type":"number","enum":[${Array(N * 10).fill("1e20").join(",")}]}`;
const original = `{"model":"qwen-plus","max_tokens":10,"messages":[{"role":"user","content":"a"}],"tools":[{"type":"function","function":{"name":"f","parameters":{"type":"object","properties":{${props}}}}}]}`;
const json = JSON.parse(original); json.enable_thinking = false;
const normalized = JSON.stringify(json);
const pyDumps = (v) => Array.isArray(v) ? "[" + v.map(pyDumps).join(", ") + "]" : v && typeof v === "object" ? "{" + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ": " + pyDumps(x)).join(", ") + "}" : JSON.stringify(v);
const sent = JSON.parse(normalized);
let s = "<|im_start|>system\nYou are Qwen, created by Alibaba Cloud. You are a helpful assistant.\n\n# Tools\n\nYou may call one or more functions to assist with the user query.\n\nYou are provided with function signatures within <tools></tools> XML tags:\n<tools>";
for (const t of sent.tools) s += "\n" + pyDumps(t);
s += "\n</tools>\n\nFor each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:\n<tool_call>\n{\"name\": <function-name>, \"arguments\": <args-json-object>}\n</tool_call><|im_end|>\n<|im_start|>user\na<|im_end|>\n<|im_start|>assistant\n";
const tokens = qwen.encode(s).length;
const ob = enc.encode(original).length, nb = enc.encode(normalized).length;
const r = { originalBytes: ob, normalizedBytes: nb, boundOnOriginal: 2 * ob + 512, boundOnNormalized: 2 * nb + 512, qwenTokens: tokens };
r.violatesOriginal = tokens > r.boundOnOriginal; r.violatesNormalized = tokens > r.boundOnNormalized;
console.log(JSON.stringify(r)); process.exitCode = r.violatesOriginal ? 0 : 1;
