import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describePacks, describeRentShow, describeRunDesk, describeStaffChange } from "./audit-note.ts";

const base = { maintenance: false, note: "", cap: 0, markup: 0, custom: {} };

describe("ghi chú audit", () => {
  it("nói rõ đóng và mở cửa trả theo lượt", () => {
    const closed = describeRunDesk(base, { ...base, maintenance: true, note: "Bảo trì tới tối nay" });
    assert.match(closed, /ĐÓNG cửa trả theo lượt/);
    assert.match(describeRunDesk({ ...base, maintenance: true, note: "Bảo trì tới tối nay" }, base), /MỞ cửa/);
  });

  it("ghi giá trước và sau", () => {
    const note = describeRunDesk(
      { ...base, markup: 10, custom: { "whisper-large-v3": { hour: 1000, inn: 0, out: 0 } } },
      { ...base, markup: 25, custom: { "whisper-large-v3": { hour: 1800, inn: 0, out: 0 } } },
    );
    assert.match(note, /10% → 25%/);
    assert.match(note, /whisper-large-v3: giá\/giờ 1\.000đ → 1\.800đ/);
  });

  it("không đổi gì thì nói thẳng", () => {
    assert.match(describeRunDesk(base, base), /không có gì đổi/);
  });

  it("thêm, đổi, gỡ cộng tác", () => {
    assert.equal(describeStaffChange("a@x.vn", null, "ho-tro").action, "them-cong-tac");
    assert.match(describeStaffChange("a@x.vn", "ho-tro", "quan-ly").note, /Hỗ trợ → Quản lý/);
    assert.equal(describeStaffChange("a@x.vn", "quan-ly", null).action, "go-cong-tac");
  });

  it("danh sách thuê phòng ghi model mở và đóng", () => {
    const note = describeRentShow({ groq: ["a", "b"], alibaba: [] }, { groq: ["b", "c"], alibaba: [] });
    assert.match(note, /mở groq: c/);
    assert.match(note, /đóng groq: a/);
  });

  it("gói dịch ghi bật tắt", () => {
    const note = describePacks([{ id: "1", name: "Cơ bản", enabled: true }], [{ id: "1", name: "Cơ bản", enabled: false }]);
    assert.match(note, /tắt gói Cơ bản/);
  });
});
