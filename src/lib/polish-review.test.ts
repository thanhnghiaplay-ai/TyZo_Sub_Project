import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acceptAll, acceptOne, buildReview, hasPending, rejectOne, reviewCounts, revertAll, type SegLike } from "./polish-review.ts";
import type { PolishResult } from "./sub/polish.ts";

const segs = (): SegLike[] => [{ translation: "A" }, { translation: "B" }, { translation: "C" }, { translation: "D" }, { translation: "E" }, { translation: "F", edited: true }];
const results = (): PolishResult[] => [
  { text: "A+", status: "changed" },
  { text: "B", status: "same" },
  { text: "C", status: "refused", note: "Model từ chối câu này, giữ bản cũ." },
  { text: "D+", status: "changed" },
  { text: "E", status: "failed", note: "Lô bị lỗi" },
  { text: "F", status: "locked" },
];
const texts = (s: SegLike[]) => s.map((x) => x.translation);

describe("buildReview", () => {
  it("chỉ changed/refused/failed vào danh sách, same/locked/skipped chỉ đếm", () => {
    const r = buildReview(segs(), results());
    assert.deepEqual(r.entries.map((e) => [e.index, e.status]), [[0, "changed"], [2, "refused"], [3, "changed"], [4, "failed"]]);
    assert.equal(r.untouched, 2);
    assert.ok(r.entries.every((e) => e.decision === "pending"));
  });

  it("lập danh sách không ghi đè phụ đề", () => {
    const s = segs();
    buildReview(s, results());
    assert.deepEqual(texts(s), ["A", "B", "C", "D", "E", "F"]);
  });

  it("câu refused/failed giữ bản cũ, kèm note", () => {
    const r = buildReview(segs(), results());
    const refused = r.entries.find((e) => e.index === 2)!;
    assert.equal(refused.newText, "C");
    assert.match(refused.note ?? "", /từ chối/);
  });
});

describe("chấp nhận / hoàn tác từng câu", () => {
  it("chấp nhận ghi bản mới, hoàn tác trả bản cũ, không đổi mảng gốc", () => {
    const s = segs();
    const r0 = buildReview(s, results());
    const a = acceptOne(s, r0, 0);
    assert.equal(a.segs[0].translation, "A+");
    assert.equal(s[0].translation, "A");
    assert.equal(a.review.entries[0].decision, "accepted");
    const b = rejectOne(a.segs, a.review, 0);
    assert.equal(b.segs[0].translation, "A");
    assert.equal(b.review.entries[0].decision, "rejected");
  });

  it("từ chối khi còn chờ chỉ đánh dấu, không đổi phụ đề", () => {
    const s = segs();
    const b = rejectOne(s, buildReview(s, results()), 3);
    assert.deepEqual(texts(b.segs), texts(s));
    assert.equal(b.review.entries.find((e) => e.index === 3)!.decision, "rejected");
  });

  it("câu refused/failed không chấp nhận được", () => {
    const s = segs();
    const r0 = buildReview(s, results());
    assert.equal(acceptOne(s, r0, 2).segs, s);
    assert.equal(acceptOne(s, r0, 4).segs, s);
  });

  it("chấp nhận hai lần không đổi gì thêm", () => {
    const s = segs();
    const a = acceptOne(s, buildReview(s, results()), 0);
    const again = acceptOne(a.segs, a.review, 0);
    assert.equal(again.segs, a.segs);
  });

  it("câu người dùng sửa tay sau khi lập danh sách không bị đè, đánh dấu xung đột", () => {
    const s = segs();
    const r0 = buildReview(s, results());
    s[0] = { translation: "Tôi tự sửa", edited: true };
    const a = acceptOne(s, r0, 0);
    assert.equal(a.segs[0].translation, "Tôi tự sửa");
    assert.equal(a.review.entries[0].decision, "conflict");
  });

  it("bản hiện tại khác bản lúc lập danh sách (dù chưa gắn edited) cũng là xung đột", () => {
    const s = segs();
    const r0 = buildReview(s, results());
    s[3] = { translation: "D khác" };
    const a = acceptOne(s, r0, 3);
    assert.equal(a.segs[3].translation, "D khác");
    assert.equal(a.review.entries.find((e) => e.index === 3)!.decision, "conflict");
  });

  it("hoàn tác khi người dùng đã sửa tay câu đã chấp nhận thì giữ bản của người dùng", () => {
    const s = segs();
    const a = acceptOne(s, buildReview(s, results()), 0);
    const edited = a.segs.map((x, i) => (i === 0 ? { translation: "Sửa tay lại", edited: true } : x));
    const b = rejectOne(edited, a.review, 0);
    assert.equal(b.segs[0].translation, "Sửa tay lại");
    assert.equal(b.review.entries[0].decision, "conflict");
  });
});

describe("chấp nhận tất cả / quay lại bản cũ", () => {
  it("chấp nhận tất cả chỉ đổi câu changed, không đụng refused/failed/locked/same", () => {
    const s = segs();
    const a = acceptAll(s, buildReview(s, results()));
    assert.deepEqual(texts(a.segs), ["A+", "B", "C", "D+", "E", "F"]);
    assert.equal(reviewCounts(a.review).accepted, 2);
    assert.equal(hasPending(a.review), false);
  });

  it("quay lại bản cũ hoàn mọi câu đã chấp nhận", () => {
    const s = segs();
    const a = acceptAll(s, buildReview(s, results()));
    const b = revertAll(a.segs, a.review);
    assert.deepEqual(texts(b.segs), texts(s));
    assert.equal(reviewCounts(b.review).rejected, 2);
  });

  it("chấp nhận tất cả lấy lại cả câu đã từ chối trước đó", () => {
    const s = segs();
    const r0 = rejectOne(s, buildReview(s, results()), 0);
    const a = acceptAll(s, r0.review);
    assert.equal(a.segs[0].translation, "A+");
  });

  it("quay lại bản cũ giữ câu người dùng đã sửa tay sau khi chấp nhận", () => {
    const s = segs();
    const a = acceptAll(s, buildReview(s, results()));
    const mid = a.segs.map((x, i) => (i === 3 ? { translation: "Sửa tay D", edited: true } : x));
    const b = revertAll(mid, a.review);
    assert.deepEqual(texts(b.segs), ["A", "B", "C", "Sửa tay D", "E", "F"]);
    assert.equal(reviewCounts(b.review).conflict, 1);
  });
});

describe("reviewCounts và hasPending", () => {
  it("đếm đủ các nhóm", () => {
    const r = buildReview(segs(), results());
    assert.deepEqual(reviewCounts(r), { changed: 2, pending: 2, accepted: 0, rejected: 0, conflict: 0, refused: 1, failed: 1, untouched: 2 });
    assert.equal(hasPending(r), true);
  });
});
