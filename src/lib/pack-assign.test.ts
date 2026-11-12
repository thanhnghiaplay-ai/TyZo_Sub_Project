import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkServicePacks, providersIn } from "./service-pack.ts";

describe("gói giao việc cho từng nhà", () => {
  it("một gói được gán Groq nhận dạng và Alibaba dịch", () => {
    const [pack] = checkServicePacks([
      {
        id: "pack_ab12cd",
        name: "Phim Trung",
        note: "",
        enabled: true,
        doors: ["turn"],
        roles: {
          asr: { provider: "groq", model: "whisper-large-v3-turbo" },
          translate: { provider: "alibaba", model: "qwen-plus" },
        },
      },
    ]);
    assert.deepEqual(providersIn(pack), ["groq", "alibaba"]);
    assert.equal(pack.roles.asr?.model, "whisper-large-v3-turbo");
    assert.equal(pack.roles.translate?.provider, "alibaba");
  });

  it("thiếu việc nhận dạng thì không lưu", () => {
    assert.throws(
      () =>
        checkServicePacks([
          {
            id: "pack_ab12cd",
            name: "Thiếu",
            note: "",
            enabled: true,
            doors: ["rent"],
            roles: { translate: { provider: "groq", model: "chat-model" } },
          },
        ]),
      /nhận dạng/,
    );
  });
});
