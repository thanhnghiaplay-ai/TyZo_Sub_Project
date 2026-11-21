import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanElevenlabsKey,
  elevenlabsErrorText,
  elevenlabsFormFields,
  elevenlabsLanguage,
  elevenlabsModel,
  segsFromElevenlabs,
  sentencesFromElevenlabs,
} from "./elevenlabs.ts";
import { asrHouse, asrTakesLink } from "./asr-house.ts";
import { authHeaders, modelIdsFrom, PROVIDER_IDS } from "./provider.ts";
import { modelRoleOf } from "./model-role.ts";

const w = (text: string, start: number, end: number) => ({ text, start, end, type: "word", logprob: -0.1 });
const sp = (start: number) => ({ text: " ", start, end: start, type: "spacing", logprob: 0 });

describe("bảng nhà ElevenLabs", () => {
  it("đã sẵn sàng, gửi key bằng xi-api-key, model nhận dạng khai cố định", () => {
    assert.ok(PROVIDER_IDS.includes("elevenlabs"));
    assert.deepEqual(authHeaders("elevenlabs", "k".repeat(30)), { "xi-api-key": "k".repeat(30) });
    assert.deepEqual(authHeaders("groq", "abc"), { Authorization: "Bearer abc" });
    assert.deepEqual(modelIdsFrom("elevenlabs", [{ model_id: "eleven_v3" }]), ["scribe_v3", "scribe_v2"]);
  });
  it("model thuộc nhà ElevenLabs, nhận link, là model nhận dạng", () => {
    for (const id of ["elevenlabs-scribe-v3", "elevenlabs-scribe-v2"]) {
      assert.equal(asrHouse(id), "elevenlabs");
      assert.equal(asrTakesLink(id), true);
      assert.equal(modelRoleOf(id), "asr");
    }
    assert.equal(modelRoleOf("scribe_v3"), "asr");
  });
});

describe("model và ngôn ngữ ElevenLabs", () => {
  it("đổi mã app sang model_id, lạ thì rỗng", () => {
    assert.equal(elevenlabsModel("elevenlabs-scribe-v3"), "scribe_v3");
    assert.equal(elevenlabsModel("elevenlabs-scribe-v2"), "scribe_v2");
    assert.equal(elevenlabsModel("soniox-stt-async"), "");
  });
  it("bốn ngôn ngữ nguồn, không rõ thì null", () => {
    for (const code of ["zh", "ko", "ja", "en"]) assert.equal(elevenlabsLanguage(code), code);
    assert.equal(elevenlabsLanguage(" JA "), "ja");
    assert.equal(elevenlabsLanguage("auto"), null);
  });
});

describe("elevenlabsFormFields", () => {
  it("gửi source_url, tắt nhãn âm thanh, có ngôn ngữ thì gửi language_code", () => {
    const fields = elevenlabsFormFields({ audioUrl: " https://x.test/a.mp3 ", appModel: "elevenlabs-scribe-v3", language: "zh" });
    assert.deepEqual(fields, [
      ["model_id", "scribe_v3"],
      ["source_url", "https://x.test/a.mp3"],
      ["tag_audio_events", "false"],
      ["timestamps_granularity", "word"],
      ["language_code", "zh"],
    ]);
  });
  it("ngôn ngữ lạ thì không gửi language_code", () => {
    const fields = elevenlabsFormFields({ audioUrl: "https://x.test/a.mp3", appModel: "elevenlabs-scribe-v2", language: "auto" });
    assert.equal(fields.some(([name]) => name === "language_code"), false);
  });
  it("từ chối link http và model của nhà khác", () => {
    assert.throws(() => elevenlabsFormFields({ audioUrl: "http://x.test/a.mp3", appModel: "elevenlabs-scribe-v3", language: "en" }), /https/);
    assert.throws(() => elevenlabsFormFields({ audioUrl: "https://x.test/a.mp3", appModel: "deepgram-nova-3", language: "en" }), /ElevenLabs/);
  });
});

describe("sentencesFromElevenlabs", () => {
  it("nối từ và khoảng trắng thành câu, ngắt ở dấu chấm, bỏ nhãn âm thanh", () => {
    const payload = {
      language_code: "eng",
      text: "Hello world. How are you?",
      audio_duration_secs: 12.5,
      words: [
        w("Hello", 0, 0.4),
        sp(0.4),
        w("world.", 0.5, 0.9),
        sp(0.9),
        { text: "(laughter)", start: 1, end: 1.5, type: "audio_event", logprob: 0 },
        w("How", 2, 2.2),
        sp(2.2),
        w("are", 2.3, 2.4),
        sp(2.4),
        w("you?", 2.5, 2.8),
      ],
    };
    const out = sentencesFromElevenlabs(payload, "en");
    assert.deepEqual(out.sentences, [
      { start: 0, end: 0.9, text: "Hello world." },
      { start: 2, end: 2.8, text: "How are you?" },
    ]);
    assert.equal(out.seconds, 12.5);
  });
  it("khoảng lặng dài thì tách câu; thiếu thời lượng thì lấy giờ câu cuối", () => {
    const out = sentencesFromElevenlabs({ words: [w("你好", 0, 0.5), w("再见", 3, 3.4)] }, "zh");
    assert.deepEqual(out.sentences.map((s) => s.text), ["你好", "再见"]);
    assert.equal(out.seconds, 3.4);
  });
  it("tiếng Trung nối liền, câu dài bị cắt ở 36 ký tự", () => {
    const words = Array.from({ length: 40 }, (_, i) => w("字", i * 0.1, i * 0.1 + 0.05));
    const out = sentencesFromElevenlabs({ language_code: "zho", words });
    assert.equal(out.sentences[0].text.length, 36);
    assert.equal(out.sentences.length, 2);
  });
  it("phản hồi nhiều kênh đọc kênh đầu; phản hồi rỗng không lỗi", () => {
    const out = sentencesFromElevenlabs({ transcripts: [{ words: [w("Hi.", 1, 1.3)] }], audio_duration_secs: 4 });
    assert.deepEqual(out, { sentences: [{ start: 1, end: 1.3, text: "Hi." }], seconds: 4 });
    assert.deepEqual(sentencesFromElevenlabs(null), { sentences: [], seconds: 0 });
  });
  it("câu → Seg sắp theo giờ", () => {
    const segs = segsFromElevenlabs([
      { start: 2, end: 3, text: " b " },
      { start: 0, end: 0, text: "a" },
      { start: 5, end: 6, text: "  " },
    ]);
    assert.deepEqual(segs.map((s) => [s.start, s.end, s.original]), [[0, 0.1, "a"], [2, 3, "b"]]);
  });
});

describe("lỗi và key ElevenLabs", () => {
  it("đổi mã lỗi thành câu tiếng Việt", () => {
    assert.match(elevenlabsErrorText(401, { detail: { status: "invalid_api_key", message: "Invalid API key" } }), /không hợp lệ/);
    assert.match(elevenlabsErrorText(400, { detail: { status: "quota_exceeded", message: "This request exceeds your quota" } }), /hết hạn mức/);
    assert.match(elevenlabsErrorText(403, { detail: { status: "missing_permissions", message: "" } }), /quyền/);
    assert.match(elevenlabsErrorText(429, null), /giới hạn tốc độ/);
    assert.match(elevenlabsErrorText(422, { detail: [{ loc: ["body", "source_url"], msg: "Could not download source_url", type: "value_error" }] }), /không tải được link/);
    assert.match(elevenlabsErrorText(503, null), /bận/);
    assert.match(elevenlabsErrorText(400, { detail: "Something odd" }), /ElevenLabs báo lỗi: Something odd/);
  });
  it("key khách: không nhận room, khoảng trắng hay quá ngắn", () => {
    assert.equal(cleanElevenlabsKey(`  sk_${"a".repeat(40)} `), `sk_${"a".repeat(40)}`);
    assert.throws(() => cleanElevenlabsKey("room"));
    assert.throws(() => cleanElevenlabsKey("short"));
    assert.throws(() => cleanElevenlabsKey(`sk_${"a".repeat(20)} x`));
  });
});
