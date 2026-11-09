import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankAuto, resolveVoiceLane, voiceLaneOf } from "./models.ts";

const base = {
  profile: "balanced" as const,
  texts: ["à"],
  sourceLang: "zh",
  genre: "daily",
  glossaryHit: false,
  allowEnterprise: true,
  available: null,
  cooling: new Map<string, number>(),
  blocked: new Set<string>(),
  escalate: false,
};

describe("bốn lối dịch", () => {
  it("câu ngắn ở lối cân bằng không rơi về model nhỏ", () => {
    assert.equal(rankAuto({ ...base, sourceLang: "en", texts: ["Hi"] })[0], "openai/gpt-oss-120b");
  });

  it("một lối chỉ lấy model của lối đó", () => {
    const open = new Set(["openai/gpt-oss-20b", "llama-3.3-70b-versatile"]);
    assert.equal(resolveVoiceLane("clear", open, true), null);
    assert.equal(resolveVoiceLane("soul", open, true), "llama-3.3-70b-versatile");
    assert.equal(resolveVoiceLane("soul", open, false), null);
    assert.equal(voiceLaneOf("openai/gpt-oss-120b"), "clear");
  });
});
