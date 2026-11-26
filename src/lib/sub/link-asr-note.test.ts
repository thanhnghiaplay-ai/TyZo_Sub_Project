import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALI_FILETRANS_ASR } from "./asr-house.ts";
import { linkAsrNote } from "./link-asr-note.ts";

const SHARED =
  "nhận link tải thẳng, không phải trang xem, và không cắt đoạn trên máy. Kho tạm bật thì chọn được tệp trên máy: âm thanh tách trên máy, gửi lên kho tạm rồi xóa khi xong.";

describe("chữ nhà nhận link", () => {
  it("Whisper không hiện đoạn này", () => {
    assert.equal(linkAsrNote("whisper-large-v3-turbo"), null);
    assert.equal(linkAsrNote("whisper-large-v3"), null);
  });

  it("TyZo cắt đoạn trên máy nên không hiện; Alibaba nhận link", () => {
    assert.equal(linkAsrNote("tyzo-modal-nhanh"), null);
    assert.ok(linkAsrNote(ALI_FILETRANS_ASR)?.includes(SHARED));
    assert.match(linkAsrNote(ALI_FILETRANS_ASR) ?? "", /^Alibaba /);
    assert.equal((linkAsrNote(ALI_FILETRANS_ASR) ?? "").includes("Groq"), false);
  });
});
