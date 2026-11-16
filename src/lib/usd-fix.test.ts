import assert from "node:assert/strict";
import test from "node:test";
import type { GroqLiveRow } from "./sub/groq-board.ts";
import { applyUsdFix, parseUsdFix, tokenPriceLine, tokensForUsd } from "./usd-fix.ts";

function row(over: Partial<GroqLiveRow> & { id: string }): GroqLiveRow {
  return {
    id: over.id,
    speed: null,
    usdIn: over.usdIn ?? null,
    usdOut: over.usdOut ?? null,
    usdPerHour: over.usdPerHour ?? null,
    usdPerMillionChars: over.usdPerMillionChars ?? null,
    unlisted: false,
    limits: [],
    contextTokens: null,
    maxCompletionTokens: null,
    maxFile: null,
  };
}

test("ô trống giữ số tự lấy, số dương thì phủ", () => {
  const fix = parseUsdFix(JSON.stringify({ "whisper-large-v3-turbo": { hour: 0.05, inn: 0 } }));
  const [next] = applyUsdFix([row({ id: "whisper-large-v3-turbo", usdPerHour: 0.04 })], fix);
  assert.equal(next.usdPerHour, 0.05);
  const kept = parseUsdFix(JSON.stringify({ "qwen-turbo": { inn: "", out: -1 } }));
  assert.equal(kept["qwen-turbo"], undefined);
});

test("một giờ Turbo đúng 3600 Token dịch", () => {
  assert.equal(tokensForUsd(0.04, 0.04), 3600);
  const line = tokenPriceLine(row({ id: "whisper-large-v3", usdPerHour: 0.08 }), 0.04);
  assert.match(line, /7\.200 Token dịch mỗi giờ tiếng/);
});
