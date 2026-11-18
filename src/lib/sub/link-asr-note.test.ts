import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALI_FILETRANS_ASR } from "./asr-house.ts";
import { ASSEMBLYAI_PRO_ASR, ASSEMBLYAI_V2_ASR } from "./assemblyai.ts";
import { DEEPGRAM_ASR } from "./deepgram.ts";
import { linkAsrNote } from "./link-asr-note.ts";
import { SONIOX_ASYNC_ASR } from "./soniox.ts";
import { SPEECHMATICS_ENHANCED_ASR, SPEECHMATICS_STANDARD_ASR } from "./speechmatics.ts";

const SHARED =
  "nhận link tải thẳng, không phải trang xem, và không cắt đoạn trên máy. Kho tạm bật thì chọn được tệp trên máy: âm thanh tách trên máy, gửi lên kho tạm rồi xóa khi xong.";

describe("chữ nhà nhận link", () => {
  it("Whisper không hiện đoạn này", () => {
    assert.equal(linkAsrNote("whisper-large-v3-turbo"), null);
    assert.equal(linkAsrNote("whisper-large-v3"), null);
  });

  it("các nhà nhận link dùng một khuôn, chỉ khác lời riêng", () => {
    const ids = [
      DEEPGRAM_ASR,
      ASSEMBLYAI_PRO_ASR,
      ASSEMBLYAI_V2_ASR,
      SPEECHMATICS_STANDARD_ASR,
      SPEECHMATICS_ENHANCED_ASR,
      SONIOX_ASYNC_ASR,
      ALI_FILETRANS_ASR,
    ];
    for (const id of ids) {
      assert.ok(linkAsrNote(id)?.includes(SHARED), id);
    }
    assert.match(linkAsrNote(DEEPGRAM_ASR) ?? "", /^Deepgram /);
    assert.match(linkAsrNote(ASSEMBLYAI_V2_ASR) ?? "", /^AssemblyAI /);
    assert.match(linkAsrNote(ALI_FILETRANS_ASR) ?? "", /^Alibaba /);
    assert.match(linkAsrNote(SPEECHMATICS_ENHANCED_ASR) ?? "", /Key phải đúng vùng tài khoản/);
    assert.equal((linkAsrNote(DEEPGRAM_ASR) ?? "").includes("vùng tài khoản"), false);
    assert.match(linkAsrNote(SONIOX_ASYNC_ASR) ?? "", /đã nạp tiền/);
    assert.match(linkAsrNote(DEEPGRAM_ASR) ?? "", /Dịch vẫn cần key Groq/);
    assert.equal((linkAsrNote(ALI_FILETRANS_ASR) ?? "").includes("Groq"), false);
  });
});
