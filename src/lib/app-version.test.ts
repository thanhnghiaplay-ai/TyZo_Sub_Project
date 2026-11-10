import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { APP_VERSION, CHANGELOG } from "./app-version.ts";

const BANNED =
  /(máy chủ|Singapore|Neon|Vercel|database|cơ sở dữ liệu|migration|webhook|Admin|quản trị|giá biểu|doanh thu|key phòng|token|chuyển cấp|quyền Chủ|\.(tsx?|sql|mjs|json)\b)/i;

describe("CHANGELOG cho khách", () => {
  it("dòng đầu khớp APP_VERSION", () => {
    assert.equal(CHANGELOG[0]?.version, APP_VERSION);
  });

  it("đủ 3 lớp, ngắn gọn", () => {
    for (const note of CHANGELOG) {
      assert.ok(note.title.length > 0 && note.title.length <= 90, `${note.version}: tiêu đề`);
      assert.ok(note.points.length >= 1 && note.points.length <= 4, `${note.version}: số dòng`);
      for (const point of note.points) {
        assert.ok(point.length <= 100, `${note.version}: «${point}» quá 100 ký tự`);
      }
    }
  });

  it("không có từ nội bộ", () => {
    for (const note of CHANGELOG) {
      for (const text of [note.title, ...note.points]) {
        assert.doesNotMatch(text, BANNED, `${note.version}: «${text}»`);
      }
    }
  });
});
