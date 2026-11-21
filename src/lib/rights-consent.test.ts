import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RIGHTS_KEY, RIGHTS_TEXT, isMediaHash, mediaHash, rememberRights, rightsConfirmed } from "./rights-consent.ts";

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
}

describe("xác nhận quyền với nội dung, mỗi tệp một lần", () => {
  it("chưa xác nhận thì hỏi; xác nhận rồi thì cùng tệp không hỏi lại, tệp khác vẫn hỏi", () => {
    const store = memory();
    const a = "file:tap1.mp4:100:1|";
    assert.equal(rightsConfirmed(a, store), false);
    rememberRights(a, store);
    assert.equal(rightsConfirmed(a, store), true);
    assert.equal(rightsConfirmed("file:tap2.mp4:100:1|", store), false);
    assert.equal(rightsConfirmed("", store), false, "chưa chọn tệp thì không coi là đã xác nhận");
  });

  it("chỉ lưu mã băm, không lưu tên tệp", () => {
    const store = memory();
    rememberRights("file:Ten Phim Bi Mat.mp4:1:1|", store);
    const saved = store.data.get(RIGHTS_KEY) ?? "";
    assert.ok(!/Ten Phim|mp4/i.test(saved), saved);
    assert.ok(isMediaHash(mediaHash("x")));
    assert.equal(mediaHash("x"), mediaHash("x"));
    assert.notEqual(mediaHash("x"), mediaHash("y"));
  });

  it("kho hỏng hoặc bị chặn thì vẫn chạy (hỏi lại lần sau), không ném lỗi", () => {
    const broken = { getItem: () => "{not json", setItem: () => { throw new Error("blocked"); } };
    assert.equal(rightsConfirmed("file:a", broken), false);
    assert.doesNotThrow(() => rememberRights("file:a", broken));
    assert.equal(rightsConfirmed("file:a", null), false);
  });

  it("câu xác nhận nêu đủ: công cụ theo yêu cầu, quyền của người dùng, tự chịu trách nhiệm, gỡ khi có khiếu nại", () => {
    assert.match(RIGHTS_TEXT, /theo yêu cầu/);
    assert.match(RIGHTS_TEXT, /sở hữu nội dung|cho phép/);
    assert.match(RIGHTS_TEXT, /tự chịu trách nhiệm/);
    assert.match(RIGHTS_TEXT, /khiếu nại/);
  });
});
