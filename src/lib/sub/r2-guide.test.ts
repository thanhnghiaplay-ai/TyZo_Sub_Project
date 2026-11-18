import assert from "node:assert/strict";
import { test } from "node:test";
import { R2_ENV_NAMES, R2_STEPS, r2CorsRules } from "./r2-guide.ts";

test("r2CorsRules: chỉ giữ origin hợp lệ, bỏ dấu / cuối và trùng", () => {
  const rules = JSON.parse(r2CorsRules(["https://a.vn/", "https://a.vn", "javascript:alert(1)", "https://b.vn/x", " http://localhost:8080 "]));
  assert.deepEqual(rules[0].AllowedOrigins, ["https://a.vn", "http://localhost:8080"]);
  assert.deepEqual(rules[0].AllowedMethods, ["PUT"]);
  assert.deepEqual(rules[0].AllowedHeaders, ["content-type"]);
});

test("hướng dẫn nhắc đủ bốn biến môi trường", () => {
  const text = R2_STEPS.join(" ");
  for (const name of R2_ENV_NAMES) assert.ok(text.includes(name), name);
});
