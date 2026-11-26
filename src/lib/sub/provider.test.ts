import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_PROVIDER_IDS, PROVIDERS, PROVIDER_IDS, PROVIDER_LABEL, authHeader, isProviderId, modelIdsFrom, modelListUrl, providerHas, providerKeyNote, providerChat, clientKeyPlaceholder } from "./provider.ts";

describe("địa chỉ danh sách model", () => {
  it("Groq và Alibaba không dùng chung máy", () => {
    assert.match(modelListUrl("groq"), /api\.groq\.com/);
    assert.match(modelListUrl("alibaba"), /dashscope-intl\.aliyuncs\.com/);
    assert.notEqual(modelListUrl("groq"), modelListUrl("alibaba"));
  });
});

describe("bảng nhà cung cấp", () => {
  it("mỗi nhà có nhãn, dòng lưu riêng và không trùng dòng lưu của nhà khác", () => {
    const seen = new Set<string>();
    for (const id of PROVIDER_IDS) {
      assert.equal(PROVIDERS[id].id, id);
      assert.ok(PROVIDER_LABEL[id].length > 0);
      for (const name of Object.values(PROVIDERS[id].settings)) {
        if (name === "run_key" || name === "run_desk" || name === "run_models") continue; // Groq giữ tên cũ
        assert.ok(!seen.has(name), `trùng ${name}`);
        seen.add(name);
      }
    }
  });
  it("Groq lưu key ở dòng run_key mà cả app đang đọc, không phải một tên mới", () => {
    assert.equal(PROVIDERS.groq.settings.key, "run_key");
    assert.equal(PROVIDERS.groq.settings.models, "run_models");
    assert.equal(PROVIDERS.groq.settings.desk, "run_desk");
  });
  it("kiểu gửi key đúng từng nhà", () => {
    assert.equal(authHeader("groq", "abc"), "Bearer abc");
    assert.equal(authHeader("alibaba", "abc"), "Bearer abc");
  });
  it("mỗi nhà khai cách nhận âm thanh (intake) hợp lệ", () => {
    const allowed = ["chunks", "link", "upload", "stream"];
    for (const id of PROVIDER_IDS) assert.ok(allowed.includes(PROVIDERS[id].intake), `${id} thiếu intake`);
    assert.equal(PROVIDERS.groq.intake, "chunks");
    assert.equal(PROVIDERS.alibaba.intake, "link");
    assert.equal(PROVIDERS["tyzo-modal"].intake, "chunks");
  });
  it("isProviderId chỉ nhận nhà có trong bảng", () => {
    assert.ok(isProviderId("tyzo-modal"));
    assert.ok(!isProviderId("deepgram"));
    assert.ok(!isProviderId("toString"));
    assert.ok(!isProviderId("openai"));
  });
  it("khả năng từng nhà", () => {
    assert.ok(providerHas("tyzo-modal", "asr"));
    assert.ok(!providerHas("tyzo-modal", "chat"));
    assert.ok(providerHas("groq", "chat"));
  });
});

describe("đọc danh sách model", () => {
  it("dạng OpenAI (Groq, Alibaba)", () => {
    assert.deepEqual(modelIdsFrom("groq", { data: [{ id: "a" }, { id: "b" }, {}] }), ["a", "b"]);
  });
  it("phản hồi lạ thì ra danh sách rỗng", () => {
    assert.deepEqual(modelIdsFrom("alibaba", null), []);
    assert.deepEqual(modelIdsFrom("groq", "x"), []);
  });
});

describe("ghi chú key phòng sinh từ khả năng của nhà", () => {
  it("nhà có khả năng dịch bằng mô hình thì không nhắc nhà khác dịch thay", () => {
    assert.doesNotMatch(providerKeyNote("groq"), /Dịch bằng nhà/);
    assert.doesNotMatch(providerKeyNote("alibaba"), /Dịch bằng nhà/);
  });
  it("Alibaba nêu đủ khả năng: nhận dạng, dịch bằng mô hình, dịch trực tiếp", () => {
    assert.match(providerKeyNote("alibaba"), /Alibaba làm: nhận dạng giọng, dịch bằng mô hình, dịch trực tiếp/);
  });
  it("nhà có khả năng dịch phải khai đường dịch, nhà không dịch thì không khai", () => {
    for (const id of PROVIDER_IDS) {
      assert.equal(Boolean(providerChat(id)), PROVIDERS[id].caps.includes("chat"), id);
      if (PROVIDERS[id].caps.includes("chat")) assert.match(PROVIDERS[id].chat!.path, /^\//, id);
    }
  });
  it("mọi nhà đều có ghi chú, và ghi chú nhắc cửa Trả theo lượt lẫn Thuê phòng", () => {
    for (const id of PROVIDER_IDS) {
      const note = providerKeyNote(id);
      assert.ok(note.includes(PROVIDERS[id].label), `${id} thiếu nhãn`);
      assert.match(note, /Trả theo lượt/);
      assert.match(note, /Thuê phòng/);
    }
  });
});

describe("khóa kho và chữ mẫu ô key của khách", () => {
  it("mỗi nhà có khóa kho riêng, không trùng nhau (key khách chỉ lưu trên máy khách)", () => {
    const seen = new Set<string>();
    for (const id of PROVIDER_IDS) {
      const name = PROVIDERS[id].clientStore;
      assert.ok(name.length > 0, `${id} thiếu clientStore`);
      assert.ok(!seen.has(name), `trùng khóa kho ${name}`);
      seen.add(name);
    }
  });
  it("giữ đúng khóa kho cũ để khách đã lưu key không mất key", () => {
    assert.equal(PROVIDERS.groq.clientStore, "gk");
    assert.equal(PROVIDERS.alibaba.clientStore, "gali");
  });
  it("chữ mẫu giữ đúng như các ô viết tay trước đây", () => {
    assert.equal(clientKeyPlaceholder("groq"), "gsk_… chỉ lưu trên máy này");
    assert.equal(clientKeyPlaceholder("alibaba"), "sk-… chỉ lưu trên máy này");
  });
});

describe("chỉ còn ba nhà", () => {
  it("Groq, Alibaba và TyZo; năm nhà cũ đã xóa", () => {
    assert.deepEqual([...ALL_PROVIDER_IDS].sort(), ["alibaba", "groq", "tyzo-modal"]);
    for (const id of ["deepgram", "assemblyai", "speechmatics", "soniox", "elevenlabs"]) assert.equal(isProviderId(id), false);
  });
});
