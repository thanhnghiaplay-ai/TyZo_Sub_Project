import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allowMailSend, readMailPolicy, renderLetter } from "./mail-letter.ts";

describe("mẫu thư", () => {
  it("mặc định tắt và không nhận HTML", () => {
    const policy = readMailPolicy(undefined);
    assert.equal(policy.verifyOn, false);
    assert.equal(policy.verifyRequired, false);
    assert.equal(policy.resetOn, false);
    const letter = renderLetter(
      { ...policy, letters: { ...policy.letters, verify: { ...policy.letters.verify, body: "<b>" } } },
      "verify",
      "https://tyzo.vn/v",
    );
    assert.equal(letter.html.includes("<" + "b>"), false);
    assert.equal(letter.html.includes("&" + "lt;b"), true);
  });

  it("không bắt xác minh khi chưa bật gửi thư", () => {
    assert.equal(readMailPolicy(JSON.stringify({ verifyRequired: true })).verifyRequired, false);
  });

  it("chặn gửi dày trong bộ nhớ", () => {
    assert.equal(allowMailSend("a", 60, 2, 1_000), true);
    assert.equal(allowMailSend("a", 60, 2, 1_100), false);
    assert.equal(allowMailSend("a", 60, 2, 62_000), true);
    assert.equal(allowMailSend("a", 60, 2, 130_000), false);
  });
});
