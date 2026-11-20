import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runScore } from "./asr-score-view.ts";

const SPARSE = `1
00:00:00,000 --> 00:00:29,980
词曲 李宗盛

2
00:00:30,000 --> 00:00:32,640
谁就也会让你失望后天
`;

describe("runScore (Admin chấm SRT)", () => {
  it("đòi nhập khi ô trống và báo khi không đọc được mốc giờ", () => {
    const empty = runScore({ srt: "  ", lang: "zh" });
    assert.equal(empty.ok, false);
    const bad = runScore({ srt: "chỉ là chữ thường", lang: "zh" });
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.match(bad.error, /mốc giờ/);
  });

  it("SRT thưa (clip Tiểu hòa thượng, 2 câu/34 giây) là «Không đạt», có dòng chữ mỗi giây", () => {
    const run = runScore({ srt: SPARSE, lang: "zh", durationText: "34" });
    assert.ok(run.ok);
    if (!run.ok) return;
    assert.equal(run.verdict.status, "fail");
    assert.equal(run.statusLabel, "Không đạt");
    assert.ok(run.rows.some(([label]) => label === "Chữ mỗi giây"));
    assert.ok(run.verdict.fails.some((reason) => reason.startsWith("quá thưa")));
  });

  it("độ dài video sai thì báo lỗi, chấp nhận dấu phẩy", () => {
    assert.equal(runScore({ srt: SPARSE, lang: "zh", durationText: "abc" }).ok, false);
    assert.equal(runScore({ srt: SPARSE, lang: "zh", durationText: "0" }).ok, false);
    assert.equal(runScore({ srt: SPARSE, lang: "zh", durationText: "34,5" }).ok, true);
  });

  it("có đáp án thì thêm dòng sai khác; không có thì không thêm", () => {
    const without = runScore({ srt: SPARSE, lang: "zh" });
    const withRef = runScore({ srt: SPARSE, lang: "zh", reference: "词曲 李宗盛\n谁就也会让你失望后天" });
    assert.ok(without.ok && withRef.ok);
    if (!without.ok || !withRef.ok) return;
    assert.ok(!without.rows.some(([l]) => l.startsWith("Sai khác")));
    const row = withRef.rows.find(([l]) => l.startsWith("Sai khác"));
    assert.equal(row?.[1], "0%");
  });
});
