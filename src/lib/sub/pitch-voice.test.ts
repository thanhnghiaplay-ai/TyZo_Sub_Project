import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyLineLocks, assignVoices, lineLockId, measurePitch } from "./pitch-voice.ts";
import { acceptSegment } from "./text.ts";
import type { Seg } from "./types.ts";

function tone(hz: number, seconds = 1, rate = 16000, amp = 0.2) {
  const n = Math.floor(seconds * rate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * hz * i) / rate);
  return out;
}

function near(hz: number | null, want: number) {
  assert.ok(hz !== null, "không đo được");
  assert.ok(Math.abs(hz - want) < 8, `${hz} lệch ${want}`);
}

describe("measurePitch", () => {
  it("đo được cao độ, kể cả khoảng giữa", () => {
    near(measurePitch(tone(110), 16000), 110);
    near(measurePitch(tone(170), 16000), 170);
    near(measurePitch(tone(220), 16000), 220);
  });

  it("bỏ hai đầu câu", () => {
    const rate = 16000;
    const edge = tone(320, 0.1, rate);
    const body = tone(110, 0.8, rate);
    const clip = new Float32Array(edge.length + body.length + edge.length);
    clip.set(edge, 0);
    clip.set(body, edge.length);
    clip.set(edge, edge.length + body.length);
    near(measurePitch(clip, rate), 110);
  });

  it("im lặng, ồn và đoạn quá ngắn thì không đo", () => {
    assert.equal(measurePitch(new Float32Array(16000), 16000), null);
    const noise = new Float32Array(16000);
    for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 0.4 - 0.2;
    assert.equal(measurePitch(noise, 16000), null);
    assert.equal(measurePitch(tone(110, 0.15), 16000), null);
    const sweep = new Float32Array(16000);
    let phase = 0;
    for (let i = 0; i < sweep.length; i++) {
      const hz = 80 + (220 * i) / sweep.length;
      phase += (2 * Math.PI * hz) / 16000;
      sweep[i] = 0.2 * Math.sin(phase);
    }
    assert.equal(measurePitch(sweep, 16000), null);
  });
});

type Row = { pitchHz?: number; voice?: "female" | "male" };

describe("assignVoices", () => {
  it("hai nhóm rõ thì thấp là nam, cao là nữ", () => {
    const segs: Row[] = [{ pitchHz: 110 }, { pitchHz: 118 }, { pitchHz: 210 }, { pitchHz: 225 }];
    assignVoices(segs);
    assert.deepEqual(
      segs.map((seg) => seg.voice),
      ["male", "male", "female", "female"],
    );
  });

  it("một bên nói ít vẫn tách được nam và nữ", () => {
    const segs: Row[] = [110, 112, 115, 118, 120, 125, 128, 130, 220, 225].map((hz) => ({ pitchHz: hz }));
    assignVoices(segs);
    assert.deepEqual(
      segs.map((seg) => seg.voice),
      ["male", "male", "male", "male", "male", "male", "male", "male", "female", "female"],
    );
  });

  it("một nhóm thì không gán", () => {
    const one: Row[] = [{ pitchHz: 150 }, { pitchHz: 158 }, { pitchHz: 162 }];
    assignVoices(one);
    assert.deepEqual(
      one.map((seg) => seg.voice),
      [undefined, undefined, undefined],
    );
  });

  it("câu nằm giữa hai nhóm thì giữ giọng dự phòng", () => {
    const segs: Row[] = [{ pitchHz: 100 }, { pitchHz: 108 }, { pitchHz: 160 }, { pitchHz: 220 }, { pitchHz: 230 }];
    assignVoices(segs);
    assert.equal(segs[0].voice, "male");
    assert.equal(segs[1].voice, "male");
    assert.equal(segs[2].voice, undefined);
    assert.equal(segs[3].voice, "female");
    assert.equal(segs[4].voice, "female");
  });

  it("gắn cao độ lúc nhận dạng, gán giọng khi có câu kia", () => {
    const segs: Seg[] = [];
    acceptSegment(segs, 0, 0.2, 1.4, "Xin chào", 0, {}, tone(110, 2));
    assert.ok(segs[0]?.pitchHz && segs[0].pitchHz < 140);
    assert.equal(segs[0].voice, undefined);
    acceptSegment(segs, 2, 0.2, 1.4, "Tạm biệt", 0, {}, tone(220, 2));
    assignVoices(segs);
    assert.equal(segs[0].voice, "male");
    assert.equal(segs[1].voice, "female");
  });

  it("câu dưới 0,5 giây không gán cao độ, câu đã khóa không bị đo đè", () => {
    const short: Seg[] = [];
    acceptSegment(short, 0, 0, 0.4, "Ừ", 0, { no_speech_prob: 0.2, avg_logprob: -0.2 }, tone(110, 0.4));
    assert.equal(short[0]?.pitchHz, undefined);
    const segs: Array<{ pitchHz?: number; voice?: "female" | "male"; voiceLock?: "female" | "male" }> = [
      { pitchHz: 110, voiceLock: "female" },
      { pitchHz: 220 },
    ];
    assignVoices(segs);
    assert.equal(segs[0].voice, "female");
    assert.equal(segs[1].voice, "female");
    const locked: Array<{ start: number; original: string; pitchHz?: number; voice?: "female" | "male"; voiceLock?: "female" | "male" }> = [
      { start: 1.2, original: "Ừ", pitchHz: 110 },
    ];
    applyLineLocks(locked, { [lineLockId(locked[0])]: "male" });
    assignVoices([{ ...locked[0] }, { pitchHz: 220 }]);
    assert.equal(locked[0].voice, "male");
  });
});
