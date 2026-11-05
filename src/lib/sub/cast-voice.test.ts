import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { narrationChoice, voiceGenderForLine } from "./cast-voice.ts";

const pair = {
  characters: [
    { name: "Minh", gender: "male", self: "anh", addressed: "em" },
    { name: "Lan", gender: "female", self: "em", addressed: "anh" },
  ],
};

const bothToi = {
  characters: [
    { name: "Nam", gender: "male", self: "tôi", addressed: "ông" },
    { name: "Hoa", gender: "female", self: "tôi", addressed: "bà" },
  ],
};

describe("voiceGenderForLine", () => {
  it("tiền tố Tên: vẫn là bằng chứng mạnh", () => {
    assert.equal(voiceGenderForLine("Minh: Đi thôi", "Đi thôi", pair), "male");
    assert.equal(voiceGenderForLine("", "Lan: Đi đâu?", pair), "female");
  });

  it("không đoán anh/em khi từ đó cũng là cách gọi người kia", () => {
    for (const line of ["Anh yêu em", "Anh ơi, mình đi đâu đấy?", "Anh đi đâu vậy?", "Em đói rồi", "Em đi đâu đấy?"]) {
      assert.equal(voiceGenderForLine("", line, pair), null, line);
    }
  });

  it("hai người cùng tự xưng tôi thì không đoán", () => {
    assert.equal(voiceGenderForLine("", "Tôi đi đây.", bothToi), null);
  });

  it("vẫn đoán khi tự xưng không trùng cách gọi của ai khác", () => {
    const bible = {
      characters: [
        { name: "Minh", gender: "male", self: "tao", addressed: "mày" },
        { name: "Lan", gender: "female", self: "tôi", addressed: "cô" },
      ],
    };
    assert.equal(voiceGenderForLine("", "Tao đi đây.", bible), "male");
    assert.equal(voiceGenderForLine("", "Nhắc Minh giữa câu.", bible), null);
  });
});

describe("narrationChoice", () => {
  it("bảng nhân vật thắng cao độ, không khớp thì dùng cao độ", () => {
    assert.deepEqual(narrationChoice(true, "female", "Minh: Đi thôi", "Đi thôi", "female", pair), { gender: "male", locked: true });
    assert.deepEqual(narrationChoice(true, "female", "Anh ơi", "Anh ơi", "female", pair), { gender: "female", locked: true });
    assert.deepEqual(narrationChoice(true, "male", "Ừ", "Ừ", undefined, pair), { gender: "male", locked: false });
    assert.deepEqual(narrationChoice(false, "female", "Minh: Đi thôi", "Đi thôi", "male", pair), { gender: "female", locked: false });
  });
});
