import assert from "node:assert/strict";
import test from "node:test";
import { LINK_WARN, videoLinkBroken, videoLinkProblem } from "./link-check.ts";

test("ô trống không báo lỗi", () => {
  assert.equal(videoLinkProblem(""), null);
  assert.equal(videoLinkProblem("   "), null);
});

test("link file trực tiếp hợp lệ", () => {
  assert.equal(videoLinkProblem("https://cdn.example.com/a/phim.mp4"), null);
  assert.equal(videoLinkProblem("https://cdn.example.com/phim.MKV?token=abc"), null);
});

test("trang xem, chữ thường, giao thức lạ bị cảnh báo", () => {
  assert.equal(videoLinkProblem("https://www.youtube.com/watch?v=abc"), LINK_WARN);
  assert.equal(videoLinkProblem("khong phai link"), LINK_WARN);
  assert.equal(videoLinkProblem("ftp://host/phim.mp4"), LINK_WARN);
});

test("chỉ chặn khi link hỏng hẳn", () => {
  assert.equal(videoLinkBroken("khong phai link"), true);
  assert.equal(videoLinkBroken("ftp://host/phim.mp4"), true);
  assert.equal(videoLinkBroken("https://www.youtube.com/watch?v=abc"), false);
  assert.equal(videoLinkBroken(""), false);
});
