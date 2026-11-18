import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_PROVIDER_IDS, PROVIDERS, PROVIDER_IDS, PROVIDER_LABEL, authHeader, isProviderId, modelIdsFrom, modelListUrl, providerHas, providerKeyNote, clientKeyPlaceholder } from "./provider.ts";

describe("địa chỉ danh sách model", () => {
  it("Groq và Alibaba không dùng chung máy", () => {
    assert.match(modelListUrl("groq"), /api\.groq\.com/);
    assert.match(modelListUrl("alibaba"), /dashscope-intl\.aliyuncs\.com/);
    assert.notEqual(modelListUrl("groq"), modelListUrl("alibaba"));
  });
  it("Deepgram có máy riêng", () => {
    assert.equal(modelListUrl("deepgram"), "https://api.deepgram.com/v1/models");
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
    assert.equal(authHeader("deepgram", "abc"), "Token abc");
  });
  it("mỗi nhà khai cách nhận âm thanh (intake) hợp lệ", () => {
    const allowed = ["chunks", "link", "upload", "stream"];
    for (const id of PROVIDER_IDS) assert.ok(allowed.includes(PROVIDERS[id].intake), `${id} thiếu intake`);
    assert.equal(PROVIDERS.groq.intake, "chunks");
    assert.equal(PROVIDERS.alibaba.intake, "link");
    assert.equal(PROVIDERS.deepgram.intake, "link");
  });
  it("isProviderId chỉ nhận nhà có trong bảng", () => {
    assert.ok(isProviderId("deepgram"));
    assert.ok(!isProviderId("toString"));
    assert.ok(!isProviderId("openai"));
  });
  it("khả năng từng nhà", () => {
    assert.ok(providerHas("deepgram", "asr"));
    assert.ok(providerHas("deepgram", "tts"));
    assert.ok(!providerHas("deepgram", "chat"));
    assert.ok(providerHas("groq", "chat"));
  });
});

describe("đọc danh sách model", () => {
  it("dạng OpenAI (Groq, Alibaba)", () => {
    assert.deepEqual(modelIdsFrom("groq", { data: [{ id: "a" }, { id: "b" }, {}] }), ["a", "b"]);
  });
  it("dạng Deepgram: stt và tts, bỏ trùng", () => {
    const ids = modelIdsFrom("deepgram", {
      stt: [{ canonical_name: "nova-3" }, { name: "nova-2" }],
      tts: [{ canonical_name: "aura-2-thalia-en" }, { canonical_name: "nova-3" }],
    });
    assert.deepEqual(ids, ["nova-3", "nova-2", "aura-2-thalia-en"]);
  });
  it("phản hồi lạ thì ra danh sách rỗng", () => {
    assert.deepEqual(modelIdsFrom("deepgram", null), []);
    assert.deepEqual(modelIdsFrom("groq", "x"), []);
  });
});

describe("ghi chú key phòng sinh từ khả năng của nhà", () => {
  it("nhà không dịch bằng mô hình thì nhắc dịch vẫn bằng nhà có khả năng dịch", () => {
    const note = providerKeyNote("deepgram");
    assert.match(note, /Deepgram làm: nhận dạng giọng, đọc thành tiếng/);
    assert.match(note, /Dịch vẫn bằng Groq/);
  });
  it("nhà có khả năng dịch bằng mô hình thì không nhắc nhà khác dịch thay", () => {
    assert.doesNotMatch(providerKeyNote("groq"), /Dịch vẫn bằng/);
  });
  it("nhà dịch trực tiếp (Alibaba) nêu đúng khả năng và dịch vẫn bằng Groq", () => {
    const note = providerKeyNote("alibaba");
    assert.match(note, /Alibaba làm: nhận dạng giọng, dịch trực tiếp/);
    assert.match(note, /Dịch vẫn bằng Groq/);
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
    assert.equal(PROVIDERS.deepgram.clientStore, "gdg");
  });
  it("chữ mẫu giữ đúng như các ô viết tay trước đây", () => {
    assert.equal(clientKeyPlaceholder("groq"), "gsk_… chỉ lưu trên máy này");
    assert.equal(clientKeyPlaceholder("alibaba"), "sk-… chỉ lưu trên máy này");
    assert.equal(clientKeyPlaceholder("deepgram"), "Key Deepgram, chỉ lưu trên máy này");
  });
});

describe("AssemblyAI (đã ready), Speechmatics, Soniox (đang làm dở, ready: false)", () => {
  const NEW = ["assemblyai", "speechmatics", "soniox"] as const;
  it("AssemblyAI đã hiện ra Admin, khách; hai nhà còn lại chỉ có trong bảng đầy đủ (ALL_PROVIDER_IDS)", () => {
    for (const id of NEW) {
      assert.ok(ALL_PROVIDER_IDS.includes(id));
      assert.equal(isProviderId(id), true);
    }
    assert.equal(PROVIDERS.assemblyai.ready, true);
    assert.ok(PROVIDER_IDS.includes("assemblyai"));
    for (const id of ["speechmatics", "soniox"] as const) {
      assert.equal(PROVIDERS[id].ready, false);
      assert.equal(PROVIDER_IDS.includes(id), false);
    }
    for (const id of ["groq", "alibaba", "deepgram"] as const) assert.ok(PROVIDER_IDS.includes(id));
  });
  it("địa chỉ API mỗi nhà một máy riêng", () => {
    assert.equal(PROVIDERS.assemblyai.api, "https://api.assemblyai.com/v2");
    assert.match(PROVIDERS.speechmatics.api, /^https:\/\/[a-z0-9]+\.asr\.api\.speechmatics\.com\/v2$/);
    assert.equal(PROVIDERS.soniox.api, "https://api.soniox.com/v1");
  });
  it("AssemblyAI gửi key không tiền tố, hai nhà kia dùng Bearer", () => {
    assert.equal(authHeader("assemblyai", "abc"), "abc");
    assert.equal(authHeader("speechmatics", "abc"), "Bearer abc");
    assert.equal(authHeader("soniox", "abc"), "Bearer abc");
  });
  it("nhà không có lệnh liệt kê model dùng danh sách khai cố định, bất kể phản hồi", () => {
    assert.deepEqual(modelIdsFrom("assemblyai", {}), ["universal-3-5-pro", "universal-2"]);
    assert.deepEqual(modelIdsFrom("assemblyai", { data: [{ id: "x" }] }), ["universal-3-5-pro", "universal-2"]);
    assert.deepEqual(modelIdsFrom("speechmatics", null), ["standard", "enhanced"]);
    assert.match(modelListUrl("assemblyai"), /\/v2\/transcript\?limit=1$/);
    assert.match(modelListUrl("speechmatics"), /\/v2\/jobs\/\?limit=1$/);
  });
  it("Soniox đọc danh sách model từ khóa models (và vẫn đọc data)", () => {
    assert.equal(modelListUrl("soniox"), "https://api.soniox.com/v1/models");
    assert.deepEqual(modelIdsFrom("soniox", { models: [{ id: "stt-async-v5" }, { id: "" }, {}] }), ["stt-async-v5"]);
    assert.deepEqual(modelIdsFrom("soniox", { data: [{ id: "a" }] }), ["a"]);
  });
  it("tên dòng lưu và kho trình duyệt không trùng nhà nào trong bảng đầy đủ", () => {
    const names = new Set<string>();
    const stores = new Set<string>();
    for (const id of ALL_PROVIDER_IDS) {
      for (const name of Object.values(PROVIDERS[id].settings)) {
        if (id === "groq") continue;
        assert.ok(!names.has(name), `trùng ${name}`);
        names.add(name);
      }
      assert.ok(!stores.has(PROVIDERS[id].clientStore), `trùng kho ${PROVIDERS[id].clientStore}`);
      stores.add(PROVIDERS[id].clientStore);
    }
  });
});
