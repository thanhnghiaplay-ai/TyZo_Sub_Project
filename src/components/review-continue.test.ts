import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { customerVisiblePrice } from "../lib/turn-pack.ts";

const studio = readFileSync(new URL("./studio.tsx", import.meta.url), "utf8");
const steps = readFileSync(new URL("./steps-bar.tsx", import.meta.url), "utf8");
const pipeline = readFileSync(new URL("./use-pipeline.ts", import.meta.url), "utf8");

describe("Bước cuối khi lượt đang chờ xem bảng nhân vật", () => {
  it("nút chính là Dịch tiếp, tự đóng tab trên điện thoại đứng rồi cho dịch tiếp", () => {
    assert.match(studio, /step\.last && app\.reviewHold \?/);
    assert.match(studio, /data-step-continue[\s\S]{0,300}onClick=\{continueAfterReview\}[\s\S]{0,60}Dịch tiếp/);
    assert.match(studio, /const continueAfterReview = \(\) => \{\s*if \(isStudioSheet\(\)\) setSheetOpen\(false\);\s*app\.approveBible\(\);/);
    // Nút Dịch tiếp ở đầu trang dùng cùng đường.
    assert.doesNotMatch(studio, /onClick=\{app\.approveBible\}/);
  });

  it("Hủy luôn hỏi lại, không dừng ngay", () => {
    assert.match(studio, /const askStop = async \(\) => \{[\s\S]{0,400}askConfirm\([\s\S]{0,400}if \(ok\) app\.cancel\(\);/);
    assert.match(studio, /if \(app\.running\) void askStop\(\);/);
    assert.match(studio, /data-step-stop[\s\S]{0,200}askStop/);
    assert.doesNotMatch(studio, /if \(app\.running\) app\.cancel\(\);/);
  });

  it("thanh tiến độ ghi đang chờ bạn, không ghi «Đang: Dịch»", () => {
    assert.match(studio, /<StepsBar report=\{app\.stages\} waiting=\{app\.reviewHold \?/);
    assert.match(steps, /waiting \?[\s\S]{0,200}Đang chờ bạn/);
  });

  it("câu giá khi đang chạy nói đã giữ, không nói «giữ trước khi chạy»", () => {
    assert.match(customerVisiblePrice(1000, 1500), /Giữ 1\.500 trước khi chạy/);
    const running = customerVisiblePrice(1000, 1500, true);
    assert.doesNotMatch(running, /trước khi chạy/);
    assert.match(running, /đã giữ/);
    assert.match(studio, /<TurnPackList\s+running=\{app\.running\}/);
  });

  it("hộp Làm lại nói đúng Token dịch khi trả theo lượt, không nói chung chung «phí Groq»", () => {
    assert.doesNotMatch(pipeline, /tính phí Groq thêm một lần/);
    assert.match(pipeline, /trừ thêm Token dịch cho cả nhận dạng lẫn dịch/);
  });

  it("đang chạy mà mở Cài đặt dịch thì báo đổi model áp dụng cho lần sau", () => {
    assert.match(studio, /data-model-locked[\s\S]{0,200}áp dụng cho lần dịch lại sau/);
  });
});
