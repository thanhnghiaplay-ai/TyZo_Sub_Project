import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maskFileName } from "./mask-file-name.ts";

describe("che tên tệp trong Admin", () => {
  it("giữ 2 ký tự đầu và đuôi, che phần còn lại", () => {
    assert.equal(maskFileName("phim nhay cam 2024.mp4"), "ph•••.mp4");
    assert.equal(maskFileName("a.mkv"), "a•••.mkv");
  });
  it("không lộ nội dung và trả rỗng khi không có tên", () => {
    assert.ok(!maskFileName("noi dung nhay cam.mp4").includes("nhay"));
    assert.equal(maskFileName(""), "");
    assert.equal(maskFileName(null), "");
  });
  it("tệp không có đuôi vẫn bị che", () => {
    assert.equal(maskFileName("abcdef"), "ab•••");
  });
});
