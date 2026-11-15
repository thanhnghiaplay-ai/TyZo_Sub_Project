import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanServiceStatus,
  defaultServiceStatus,
  describeServiceChange,
  inMaintenance,
  inputToUntil,
  parseServiceStatus,
  railBadge,
  SERVICE_NOTE_MAX,
  serviceBlock,
  untilLabel,
  untilToInput,
  type ServiceStatus,
} from "./service-status.ts";

const NOW = Date.UTC(2026, 10, 15, 3, 0, 0); // 10:00 giờ Việt Nam
const HOUR = 60 * 60 * 1000;

function status(patch: Partial<ServiceStatus> = {}): ServiceStatus {
  return { ...defaultServiceStatus(), ...patch };
}

describe("parseServiceStatus", () => {
  it("thiếu, rỗng hay hỏng thì cả hai nhóm Hoạt động", () => {
    for (const raw of [undefined, null, "", "{", "null", "[]", "123", '"x"']) {
      assert.deepEqual(parseServiceStatus(raw), defaultServiceStatus(), String(raw));
    }
  });

  it("đọc đúng từng nhóm, nhóm kia vẫn Hoạt động", () => {
    const out = parseServiceStatus(JSON.stringify({ live: { state: "maintenance", note: "Nâng cấp cầu nối", until: NOW + HOUR } }));
    assert.equal(out.live.state, "maintenance");
    assert.equal(out.live.note, "Nâng cấp cầu nối");
    assert.equal(out.live.until, NOW + HOUR);
    assert.deepEqual(out.normal, { state: "active", note: "", until: null });
  });

  it("trạng thái lạ coi là Hoạt động, không khóa nhầm", () => {
    const out = parseServiceStatus(JSON.stringify({ live: { state: "dong-cua" }, normal: { state: 1 } }));
    assert.equal(inMaintenance(out, "live"), false);
    assert.equal(inMaintenance(out, "normal"), false);
  });

  it("nhóm đang Hoạt động thì bỏ lời nhắn dư và giờ hẹn", () => {
    const out = parseServiceStatus(JSON.stringify({ live: { state: "active", note: "cũ", until: NOW + HOUR } }));
    assert.equal(out.live.until, null);
  });
});

describe("cleanServiceStatus", () => {
  const ok = { live: { state: "active", note: "", until: null }, normal: { state: "active", note: "", until: null } };

  it("nhận hai nhóm Hoạt động", () => {
    assert.deepEqual(cleanServiceStatus(ok, NOW), defaultServiceStatus());
  });

  it("nhận bảo trì có lời nhắn và giờ dự kiến, gọn khoảng trắng", () => {
    const out = cleanServiceStatus({ ...ok, normal: { state: "maintenance", note: "  Đang  nâng cấp \n máy chủ ", until: NOW + 2 * HOUR } }, NOW);
    assert.equal(out.normal.state, "maintenance");
    assert.equal(out.normal.note, "Đang nâng cấp máy chủ");
    assert.equal(out.normal.until, NOW + 2 * HOUR);
    assert.equal(out.live.state, "active");
  });

  it("từ chối đầu vào không phải đối tượng hoặc thiếu một nhóm", () => {
    assert.throws(() => cleanServiceStatus(null, NOW), /không đúng/);
    assert.throws(() => cleanServiceStatus("x", NOW), /không đúng/);
    assert.throws(() => cleanServiceStatus({ live: ok.live }, NOW), /Thiếu trạng thái của Dịch bình thường/);
    assert.throws(() => cleanServiceStatus({ normal: ok.normal }, NOW), /Thiếu trạng thái của Dịch trực tiếp/);
  });

  it("từ chối trạng thái lạ", () => {
    assert.throws(() => cleanServiceStatus({ ...ok, live: { state: "off" } }, NOW), /Dịch trực tiếp không đúng/);
  });

  it("từ chối lời nhắn quá dài", () => {
    const long = "a".repeat(SERVICE_NOTE_MAX + 1);
    assert.throws(() => cleanServiceStatus({ ...ok, live: { state: "maintenance", note: long } }, NOW), /dài quá/);
    const edge = "a".repeat(SERVICE_NOTE_MAX);
    assert.equal(cleanServiceStatus({ ...ok, live: { state: "maintenance", note: edge } }, NOW).live.note.length, SERVICE_NOTE_MAX);
  });

  it("giờ dự kiến phải ở tương lai và không quá một năm", () => {
    assert.throws(() => cleanServiceStatus({ ...ok, live: { state: "maintenance", until: NOW - HOUR } }, NOW), /tương lai/);
    assert.throws(() => cleanServiceStatus({ ...ok, live: { state: "maintenance", until: NOW + 400 * 24 * HOUR } }, NOW), /xa quá một năm/);
    assert.throws(() => cleanServiceStatus({ ...ok, live: { state: "maintenance", until: "mai" } }, NOW), /không đúng/);
  });

  it("nhóm Hoạt động thì bỏ giờ hẹn, không báo lỗi", () => {
    const out = cleanServiceStatus({ ...ok, live: { state: "active", note: "", until: NOW - HOUR } }, NOW);
    assert.equal(out.live.until, null);
  });
});

describe("serviceBlock", () => {
  it("Hoạt động thì không chặn", () => {
    assert.equal(serviceBlock(defaultServiceStatus(), "live", NOW), "");
    assert.equal(serviceBlock(defaultServiceStatus(), "normal", NOW), "");
  });

  it("chỉ chặn đúng nhóm đang bảo trì", () => {
    const s = status({ live: { state: "maintenance", note: "", until: null } });
    assert.notEqual(serviceBlock(s, "live", NOW), "");
    assert.equal(serviceBlock(s, "normal", NOW), "");
  });

  it("không có lời nhắn thì dùng câu mặc định có tên nhóm", () => {
    const s = status({ normal: { state: "maintenance", note: "", until: null } });
    assert.equal(serviceBlock(s, "normal", NOW), "Dịch bình thường đang bảo trì.");
  });

  it("có giờ dự kiến trong tương lai thì nhắc theo giờ Việt Nam", () => {
    const until = Date.UTC(2026, 10, 15, 13, 30, 0); // 20:30 giờ Việt Nam
    const s = status({ live: { state: "maintenance", note: "Nâng cấp", until } });
    assert.equal(serviceBlock(s, "live", NOW), "Nâng cấp Dự kiến mở lại lúc 20:30 15/11/2026.");
  });

  it("giờ dự kiến đã qua thì không nhắc nữa nhưng vẫn chặn", () => {
    const s = status({ live: { state: "maintenance", note: "Nâng cấp", until: NOW - HOUR } });
    assert.equal(serviceBlock(s, "live", NOW), "Nâng cấp");
  });
});

describe("railBadge", () => {
  it("chỉ gắn nhãn cho nhóm đang bảo trì", () => {
    const s = status({ live: { state: "maintenance", note: "", until: null } });
    assert.equal(railBadge(s, "live"), "Bảo trì");
    assert.equal(railBadge(s, "normal"), undefined);
  });
});

describe("untilLabel", () => {
  it("luôn theo giờ Việt Nam", () => {
    assert.equal(untilLabel(Date.UTC(2026, 11, 31, 17, 5, 0)), "00:05 01/01/2027");
  });
});

describe("ô chọn giờ dự kiến", () => {
  it("đọc ô datetime-local như giờ Việt Nam", () => {
    assert.equal(inputToUntil("2026-11-15T20:30"), Date.UTC(2026, 10, 15, 13, 30, 0));
    assert.equal(inputToUntil("2027-01-01T00:05"), Date.UTC(2026, 11, 31, 17, 5, 0));
  });

  it("đi và về đều giữ nguyên", () => {
    const ms = Date.UTC(2026, 10, 15, 13, 30, 0);
    assert.equal(untilToInput(ms), "2026-11-15T20:30");
    assert.equal(inputToUntil(untilToInput(ms)), ms);
  });

  it("trống hoặc sai dạng thì không có giờ", () => {
    assert.equal(untilToInput(null), "");
    assert.equal(inputToUntil(""), null);
    assert.equal(inputToUntil("mai 8 giờ"), null);
    assert.equal(inputToUntil("2026-11-15"), null);
  });
});

describe("describeServiceChange", () => {
  it("báo nhóm nào vào bảo trì kèm lời nhắn", () => {
    const after = status({ live: { state: "maintenance", note: "Đổi cầu nối", until: null } });
    assert.equal(describeServiceChange(defaultServiceStatus(), after), "Dịch trực tiếp: ĐƯA VÀO BẢO TRÌ (Đổi cầu nối)");
  });

  it("báo mở lại", () => {
    const before = status({ normal: { state: "maintenance", note: "", until: null } });
    assert.equal(describeServiceChange(before, defaultServiceStatus()), "Dịch bình thường: MỞ LẠI, hoạt động");
  });

  it("báo đổi lời nhắn khi vẫn bảo trì", () => {
    const before = status({ live: { state: "maintenance", note: "a", until: null } });
    const after = status({ live: { state: "maintenance", note: "b", until: null } });
    assert.match(describeServiceChange(before, after), /sửa lời nhắn/);
  });

  it("không đổi gì thì nói rõ", () => {
    assert.equal(describeServiceChange(defaultServiceStatus(), defaultServiceStatus()), "Lưu lại, không có gì đổi");
  });

  it("hai nhóm cùng đổi thì ghi cả hai", () => {
    const after = status({ live: { state: "maintenance", note: "", until: null }, normal: { state: "maintenance", note: "", until: null } });
    const note = describeServiceChange(defaultServiceStatus(), after);
    assert.match(note, /Dịch trực tiếp/);
    assert.match(note, /Dịch bình thường/);
  });
});
