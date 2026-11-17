import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LIVE_MODELS } from "./live-open-rules.ts";
import { cleanLiveShow, liveCandidates, liveModeFor, liveOpenModels, liveOpenProblem, liveTickable, parseLiveShow } from "./live-show.ts";
import { LIVE_MODEL_35, LIVE_MODEL_38 } from "./live-price.ts";

describe("dịch trực tiếp theo khả năng model", () => {
  it("Qwen LiveTranslate là real; Whisper (cắt đoạn) là chunked; link-only và giọng đọc là none", () => {
    assert.equal(liveModeFor("alibaba", LIVE_MODEL_38), "real");
    assert.equal(liveModeFor("groq", "whisper-large-v3-turbo"), "chunked");
    assert.equal(liveModeFor("deepgram", "deepgram-nova-3"), "none");
    assert.equal(liveModeFor("alibaba", "qwen-audio-3.0-asr-flash-filetrans"), "none");
    assert.equal(liveModeFor("groq", "canopylabs/orpheus-v1-english"), "none");
  });

  it("mọi model trong LIVE_MODELS (đường chạy thật) đều là real", () => {
    for (const id of LIVE_MODELS) assert.equal(liveTickable(liveModeFor("alibaba", id)), true, id);
  });

  it("chỉ model real tick được; chunked hiện nhưng chưa tick được", () => {
    const rows = liveCandidates();
    assert.ok(rows.some((row) => row.mode === "chunked" && !liveTickable(row.mode)));
    assert.deepEqual(cleanLiveShow([LIVE_MODEL_38, "whisper-large-v3-turbo", "x", 5]), [LIVE_MODEL_38]);
  });

  it("chưa lưu thì mở hết model real; đã lưu thì chỉ model được tick", () => {
    assert.equal(liveOpenProblem(null, LIVE_MODEL_35), "");
    assert.equal(liveOpenProblem([LIVE_MODEL_38], LIVE_MODEL_35) === "", false);
    assert.equal(liveOpenProblem([LIVE_MODEL_38], LIVE_MODEL_38), "");
    assert.notEqual(liveOpenProblem(null, "whisper-large-v3-turbo"), "");
    assert.deepEqual(liveOpenModels([LIVE_MODEL_38], LIVE_MODELS), [LIVE_MODEL_38]);
  });

  it("đọc danh sách lưu", () => {
    assert.equal(parseLiveShow(null), null);
    assert.equal(parseLiveShow("rác"), null);
    assert.deepEqual(parseLiveShow(JSON.stringify([LIVE_MODEL_38, "!!"])), [LIVE_MODEL_38]);
  });
});
