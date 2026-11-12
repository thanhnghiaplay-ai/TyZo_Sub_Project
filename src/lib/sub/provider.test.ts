import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { modelListUrl } from "./provider.ts";

describe("địa chỉ danh sách model", () => {
  it("Groq và Alibaba không dùng chung máy", () => {
    assert.match(modelListUrl("groq"), /api\.groq\.com/);
    assert.match(modelListUrl("alibaba"), /dashscope-intl\.aliyuncs\.com/);
    assert.notEqual(modelListUrl("groq"), modelListUrl("alibaba"));
  });
});
