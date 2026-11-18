import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { packDoorsText, packSummary } from "./pack-summary.ts";

test("tóm tắt một dòng theo nhà", () => {
  assert.equal(
    packSummary({ roles: { asr: { provider: "alibaba", model: "qwen-audio-3.0-asr-flash-filetrans" }, translate: { provider: "groq", model: "openai/gpt-oss-120b" } } }),
    "Nhận dạng: Alibaba · Dịch: Groq",
  );
});

test("việc liền nhau cùng nhà thì gộp, khác nhà thì tách", () => {
  const text = packSummary({
    roles: {
      asr: { provider: "groq", model: "whisper-large-v3-turbo" },
      translate: { provider: "groq", model: "openai/gpt-oss-120b" },
      context: { provider: "alibaba", model: "qwen-plus" },
      review: { provider: "alibaba", model: "qwen-plus" },
      narration: { provider: "groq", model: "canopylabs/orpheus-v1-english" },
    },
  });
  assert.equal(text, "Nhận dạng, Dịch: Groq · Ngữ cảnh, Đối chiếu: Alibaba · Thuyết minh: Groq");
});

test("gói chưa chọn việc nào", () => {
  assert.equal(packSummary({ roles: {} }), "Chưa chọn việc nào");
});

test("hai cửa một dòng", () => {
  assert.equal(packDoorsText({ doors: ["turn", "rent"] }), "Trả theo lượt · Thuê phòng");
  assert.equal(packDoorsText({ doors: ["rent"] }), "Thuê phòng");
});

test("danh sách gói thu gọn, xóa phải hỏi lại", () => {
  const source = readFileSync(new URL("../components/service-pack-board.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("packSummary("), "danh sách phải hiện dòng tóm tắt");
  assert.ok(source.includes("askConfirm("), "xóa gói phải hỏi lại");
  assert.ok(source.includes("aria-expanded"), "bấm vào dòng mới mở phần sửa");
});
