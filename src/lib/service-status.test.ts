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
  SERVICE_TITLE_MAX,
  SITE_NOTE_DEFAULT,
  SITE_TITLE_DEFAULT,
  siteMaintenanceText,
  serviceBlock,
  siteBlock,
  siteOpenPath,
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
    const out = parseServiceStatus(JSON.stringify({ live: { state: "maintenance", title: "", note: "Nâng cấp cầu nối", until: NOW + HOUR } }));
    assert.equal(out.live.state, "maintenance");
    assert.equal(out.live.note, "Nâng cấp cầu nối");
    assert.equal(out.live.until, NOW + HOUR);
    assert.deepEqual(out.normal, { state: "active", title: "", note: "", until: null });
  });

  it("trạng thái lạ coi là Hoạt động, không khóa nhầm", () => {
    const out = parseServiceStatus(JSON.stringify({ live: { state: "dong-cua" }, normal: { state: 1 } }));
    assert.equal(inMaintenance(out, "live"), false);
    assert.equal(inMaintenance(out, "normal"), false);
  });

  it("nhóm đang Hoạt động thì bỏ lời nhắn dư và giờ hẹn", () => {
    const out = parseServiceStatus(JSON.stringify({ live: { state: "active", title: "", note: "cũ", until: NOW + HOUR } }));
    assert.equal(out.live.until, null);
  });
});

describe("cleanServiceStatus", () => {
  const idle = { state: "active", title: "", note: "", until: null };
  const ok = { live: idle, normal: idle, site: idle };

  it("nhận cả web và hai nhóm Hoạt động", () => {
    assert.deepEqual(cleanServiceStatus(ok, NOW), defaultServiceStatus());
  });

  it("nhận bảo trì có lời nhắn và giờ dự kiến, gọn khoảng trắng", () => {
    const out = cleanServiceStatus({ ...ok, normal: { state: "maintenance", title: "", note: "  Đang  nâng cấp \n máy chủ ", until: NOW + 2 * HOUR } }, NOW);
    assert.equal(out.normal.state, "maintenance");
    assert.equal(out.normal.note, "Đang nâng cấp máy chủ");
    assert.equal(out.normal.until, NOW + 2 * HOUR);
    assert.equal(out.live.state, "active");
  });

  it("từ chối đầu vào không phải đối tượng hoặc thiếu một nhóm", () => {
    assert.throws(() => cleanServiceStatus(null, NOW), /không đúng/);
    assert.throws(() => cleanServiceStatus("x", NOW), /không đúng/);
    assert.throws(() => cleanServiceStatus({ site: ok.site, live: ok.live }, NOW), /Thiếu trạng thái của Dịch bình thường/);
    assert.throws(() => cleanServiceStatus({ site: ok.site, normal: ok.normal }, NOW), /Thiếu trạng thái của Dịch trực tiếp/);
    // Màn hình cũ (chưa có mục Toàn web) lưu thì bị từ chối, không lỡ tay mở lại cả web.
    assert.throws(() => cleanServiceStatus({ live: ok.live, normal: ok.normal }, NOW), /Thiếu trạng thái của Toàn web/);
  });

  it("từ chối trạng thái lạ", () => {
    assert.throws(() => cleanServiceStatus({ ...ok, live: { state: "off" } }, NOW), /Dịch trực tiếp không đúng/);
  });

  it("từ chối lời nhắn quá dài", () => {
    const long = "a".repeat(SERVICE_NOTE_MAX + 1);
    assert.throws(() => cleanServiceStatus({ ...ok, live: { state: "maintenance", title: "", note: long } }, NOW), /dài quá/);
    const edge = "a".repeat(SERVICE_NOTE_MAX);
    assert.equal(cleanServiceStatus({ ...ok, live: { state: "maintenance", title: "", note: edge } }, NOW).live.note.length, SERVICE_NOTE_MAX);
  });

  it("giờ dự kiến phải ở tương lai và không quá một năm", () => {
    assert.throws(() => cleanServiceStatus({ ...ok, live: { state: "maintenance", until: NOW - HOUR } }, NOW), /tương lai/);
    assert.throws(() => cleanServiceStatus({ ...ok, live: { state: "maintenance", until: NOW + 400 * 24 * HOUR } }, NOW), /xa quá một năm/);
    assert.throws(() => cleanServiceStatus({ ...ok, live: { state: "maintenance", until: "mai" } }, NOW), /không đúng/);
  });

  it("nhóm Hoạt động thì bỏ giờ hẹn, không báo lỗi", () => {
    const out = cleanServiceStatus({ ...ok, live: { state: "active", title: "", note: "", until: NOW - HOUR } }, NOW);
    assert.equal(out.live.until, null);
  });
});

describe("serviceBlock", () => {
  it("Hoạt động thì không chặn", () => {
    assert.equal(serviceBlock(defaultServiceStatus(), "live", NOW), "");
    assert.equal(serviceBlock(defaultServiceStatus(), "normal", NOW), "");
  });

  it("chỉ chặn đúng nhóm đang bảo trì", () => {
    const s = status({ live: { state: "maintenance", title: "", note: "", until: null } });
    assert.notEqual(serviceBlock(s, "live", NOW), "");
    assert.equal(serviceBlock(s, "normal", NOW), "");
  });

  it("không có lời nhắn thì dùng câu mặc định có tên nhóm", () => {
    const s = status({ normal: { state: "maintenance", title: "", note: "", until: null } });
    assert.equal(serviceBlock(s, "normal", NOW), "Dịch bình thường đang bảo trì.");
  });

  it("có giờ dự kiến trong tương lai thì nhắc theo giờ Việt Nam", () => {
    const until = Date.UTC(2026, 10, 15, 13, 30, 0); // 20:30 giờ Việt Nam
    const s = status({ live: { state: "maintenance", title: "", note: "Nâng cấp", until } });
    assert.equal(serviceBlock(s, "live", NOW), "Nâng cấp Dự kiến mở lại lúc 20:30 15/11/2026.");
  });

  it("giờ dự kiến đã qua thì không nhắc nữa nhưng vẫn chặn", () => {
    const s = status({ live: { state: "maintenance", title: "", note: "Nâng cấp", until: NOW - HOUR } });
    assert.equal(serviceBlock(s, "live", NOW), "Nâng cấp");
  });
});

describe("railBadge", () => {
  it("chỉ gắn nhãn cho nhóm đang bảo trì", () => {
    const s = status({ live: { state: "maintenance", title: "", note: "", until: null } });
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
    const after = status({ live: { state: "maintenance", title: "", note: "Đổi cầu nối", until: null } });
    assert.equal(describeServiceChange(defaultServiceStatus(), after), "Dịch trực tiếp: ĐƯA VÀO BẢO TRÌ (Đổi cầu nối)");
  });

  it("báo mở lại", () => {
    const before = status({ normal: { state: "maintenance", title: "", note: "", until: null } });
    assert.equal(describeServiceChange(before, defaultServiceStatus()), "Dịch bình thường: MỞ LẠI, hoạt động");
  });

  it("báo đổi lời nhắn khi vẫn bảo trì", () => {
    const before = status({ live: { state: "maintenance", title: "", note: "a", until: null } });
    const after = status({ live: { state: "maintenance", title: "", note: "b", until: null } });
    assert.match(describeServiceChange(before, after), /sửa lời nhắn/);
  });

  it("không đổi gì thì nói rõ", () => {
    assert.equal(describeServiceChange(defaultServiceStatus(), defaultServiceStatus()), "Lưu lại, không có gì đổi");
  });

  it("hai nhóm cùng đổi thì ghi cả hai", () => {
    const after = status({ live: { state: "maintenance", title: "", note: "", until: null }, normal: { state: "maintenance", title: "", note: "", until: null } });
    const note = describeServiceChange(defaultServiceStatus(), after);
    assert.match(note, /Dịch trực tiếp/);
    assert.match(note, /Dịch bình thường/);
  });
});

describe("bảo trì Toàn web", () => {
  const down = { state: "maintenance" as const, title: "", note: "Nâng cấp máy chủ", until: null };

  it("bản lưu cũ chưa có site thì cả web vẫn Hoạt động", () => {
    const out = parseServiceStatus(JSON.stringify({ live: { state: "maintenance", title: "", note: "x", until: null }, normal: { state: "active" } }));
    assert.equal(out.site.state, "active");
    assert.equal(siteBlock(out, NOW), "");
    assert.equal(out.live.state, "maintenance");
  });

  it("đọc và kiểm site như hai nhóm kia", () => {
    const raw = { site: { state: "maintenance", title: "", note: "  Nâng  cấp ", until: NOW + HOUR }, live: { state: "active" }, normal: { state: "active" } };
    const clean = cleanServiceStatus(raw, NOW);
    assert.equal(clean.site.note, "Nâng cấp");
    assert.equal(clean.site.until, NOW + HOUR);
    assert.deepEqual(parseServiceStatus(JSON.stringify(clean)), clean);
    assert.throws(() => cleanServiceStatus({ ...raw, site: { state: "maintenance", until: NOW - HOUR } }, NOW), /Toàn web phải ở tương lai/);
    assert.throws(() => cleanServiceStatus({ ...raw, site: { state: "nghi" } }, NOW), /Toàn web không đúng/);
  });

  it("siteBlock có lời nhắn, giờ dự kiến, hoặc câu mặc định", () => {
    assert.equal(siteBlock(status({ site: down }), NOW), "Nâng cấp máy chủ");
    assert.equal(siteBlock(status({ site: { state: "maintenance", title: "", note: "", until: null } }), NOW), "Toàn web đang bảo trì.");
    const until = Date.UTC(2026, 10, 15, 13, 30, 0);
    assert.equal(siteBlock(status({ site: { ...down, until } }), NOW), "Nâng cấp máy chủ Dự kiến mở lại lúc 20:30 15/11/2026.");
  });

  it("cả web bảo trì thì chặn luôn cả hai nhóm dịch", () => {
    const s = status({ site: down });
    assert.equal(serviceBlock(s, "live", NOW), "Nâng cấp máy chủ");
    assert.equal(serviceBlock(s, "normal", NOW), "Nâng cấp máy chủ");
  });

  it("cả web bảo trì thì câu của web thắng câu của nhóm", () => {
    const s = status({ site: down, live: { state: "maintenance", title: "", note: "Riêng live", until: null } });
    assert.equal(serviceBlock(s, "live", NOW), "Nâng cấp máy chủ");
  });

  it("cả web Hoạt động thì nhóm nào bảo trì chỉ chặn nhóm đó", () => {
    const s = status({ live: { state: "maintenance", title: "", note: "Riêng live", until: null } });
    assert.equal(serviceBlock(s, "live", NOW), "Riêng live");
    assert.equal(serviceBlock(s, "normal", NOW), "");
  });

  it("Admin và Đăng nhập luôn mở, kể cả đường con và tham số", () => {
    for (const path of ["/admin", "/admin/", "/admin/anything", "/admin?tab=cau-hinh", "/admin#top", "/login", "/login/", "/login?token=abc"]) {
      assert.equal(siteOpenPath(path), true, path);
    }
  });

  it("mọi trang khác của khách bị che, không mở nhầm tên gần giống", () => {
    for (const path of ["/", "/dich-truc-tiep", "/goi", "/tai-khoan", "/tai-video", "/ctv", "/yeu-cau", "/huong-dan", "/dieu-khoan", "/administrator", "/admin-x", "/loginx", "/x/admin", ""]) {
      assert.equal(siteOpenPath(path), false, path);
    }
  });

  it("nhật ký ghi rõ Toàn web vào bảo trì và mở lại", () => {
    assert.equal(describeServiceChange(defaultServiceStatus(), status({ site: down })), "Toàn web: ĐƯA VÀO BẢO TRÌ (Nâng cấp máy chủ)");
    assert.equal(describeServiceChange(status({ site: down }), defaultServiceStatus()), "Toàn web: MỞ LẠI, hoạt động");
  });
});

describe("tiêu đề trang bảo trì", () => {
  const down = { state: "maintenance", title: "  TyZo_Sub  ", note: "Đang nâng cấp", until: null };
  const ok = { site: down, live: { state: "active" }, normal: { state: "active" } };

  it("cắt khoảng trắng thừa và lưu lại được", () => {
    const clean = cleanServiceStatus(ok, NOW);
    assert.equal(clean.site.title, "TyZo_Sub");
    assert.deepEqual(parseServiceStatus(JSON.stringify(clean)), clean);
  });

  it("tiêu đề quá dài thì báo lỗi bằng tiếng Việt", () => {
    const long = "a".repeat(SERVICE_TITLE_MAX + 1);
    assert.throws(() => cleanServiceStatus({ ...ok, site: { ...down, title: long } }, NOW), /Tiêu đề của Toàn web dài quá/);
  });

  it("bản lưu cũ chưa có tiêu đề thì tiêu đề trống, trang dùng câu mặc định", () => {
    const out = parseServiceStatus(JSON.stringify({ site: { state: "maintenance", note: "x" } }));
    assert.equal(out.site.title, "");
    assert.deepEqual(siteMaintenanceText(out.site), { title: SITE_TITLE_DEFAULT, note: "x" });
    assert.deepEqual(siteMaintenanceText(defaultServiceStatus().site), { title: SITE_TITLE_DEFAULT, note: SITE_NOTE_DEFAULT });
  });

  it("đổi tiêu đề khi đang bảo trì được ghi vào nhật ký", () => {
    const before = cleanServiceStatus(ok, NOW);
    const after = cleanServiceStatus({ ...ok, site: { ...down, title: "Nâng cấp lớn" } }, NOW);
    assert.match(describeServiceChange(before, after), /sửa tiêu đề, lời nhắn hoặc giờ dự kiến/);
  });
});
