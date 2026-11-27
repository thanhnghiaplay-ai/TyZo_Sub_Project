import assert from "node:assert/strict";
import { test } from "node:test";
import { cumulativeUsageDelta, hasBillableUsage, readUsage } from "./live-cost.ts";
import { parseServerEvent } from "./qwen-protocol.ts";
const zero = { audioIn: 0, textIn: 0, imageIn: 0, textOut: 0, audioOut: 0 };
test("cumulative high-water marks ignore repeats, older packets, and the non-billed fixed prompt", () => {
  const a = cumulativeUsageDelta(zero, {
    audioIn: 500,
    textIn: 50,
    imageIn: 10,
    textOut: 5,
    audioOut: 0,
  });
  assert.deepEqual(a.usage, { audioIn: 500, textIn: 0, imageIn: 10, textOut: 5, audioOut: 0 });
  const b = cumulativeUsageDelta(a.next, {
    audioIn: 1000,
    textIn: 50,
    imageIn: 12,
    textOut: 10,
    audioOut: 3,
  });
  assert.deepEqual(b.usage, { audioIn: 500, textIn: 0, imageIn: 2, textOut: 5, audioOut: 3 });
  assert.deepEqual(cumulativeUsageDelta(b.next, a.next).usage, zero);
  assert.deepEqual(cumulativeUsageDelta(b.next, b.next).usage, zero);
});
test("video/image tokens follow the provider schema and malformed usage stays uncertain", () => {
  assert.equal(
    readUsage({ input_tokens_details: { video_tokens: 17, image_tokens: 99 } }).imageIn,
    17,
  );
  const good = {
    input_tokens_details: { audio_tokens: 0, video_tokens: 17, text_tokens: 50 },
    output_tokens_details: { text_tokens: 1, audio_tokens: 0 },
  };
  assert.equal(hasBillableUsage(good), true);
  for (const bad of [
    null,
    {},
    { input_tokens_details: { audio_tokens: 1 } },
    { ...good, input_tokens_details: { audio_tokens: -1 } },
    { ...good, output_tokens_details: { text_tokens: Infinity } },
    { ...good, input_tokens_details: { audio_tokens: "1" } },
    { ...good, input_tokens_details: { audio_tokens: 1, video_tokens: NaN } },
  ]) {
    assert.equal(hasBillableUsage(bad), false);
    const parsed = parseServerEvent({
      type: "response.done",
      response: { usage: bad, status: "completed" },
    })[0];
    assert.ok(parsed.kind === "usage" && parsed.uncertain);
  }
});
