import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { canonical, EVALUATORS, parseRiskSettings, RISK_RULES, riskDefaults, riskReport, shortDev, shortUa, type RiskFacts } from "./risk-rules.ts";

const NOW = "2026-11-22T12:00:00.000Z";
const ago = (h: number) => new Date(new Date(NOW).getTime() - h * 3600 * 1000).toISOString();
const base = (): RiskFacts => ({ now: NOW, active: true, events: [], appIps: [], linked: [], appeals: [], blocks: [], claims: [], selfRefs: [] });
const P = riskDefaults();

describe("luật phát hiện", () => {
  it("mọi luật có điều khoản, cách phát hiện, ngưỡng mặc định trong khoảng", () => {
    for (const rule of RISK_RULES) {
      assert.ok(rule.termsRef && rule.title, rule.id);
      if (rule.id !== "thu-cong") assert.ok(rule.termsText, rule.id);
      for (const p of rule.params) assert.ok(p.min <= p.def && p.def <= p.max, `${rule.id}.${p.key}`);
      assert.ok(rule.autos.includes(rule.autoDefault));
      assert.ok(rule.how(P[rule.id].p).length > 10);
    }
  });

  it("dùng chung: đủ 3 máy và 3 mạng trong 24 giờ thì dựng cờ, kèm bảng từng lần", () => {
    const f = base();
    f.events = [
      { at: ago(1), kind: "hien-dien", ip: "1.1.1.1", device: "aaaaaaaaaaaa", ua: "Chrome/1 Android" },
      { at: ago(2), kind: "hien-dien", ip: "2.2.2.2", device: "bbbbbbbbbbbb", ua: "Safari/1 iPhone" },
      { at: ago(3), kind: "dang-nhap", ip: "3.3.3.3", device: "cccccccccccc", ua: "Firefox/1 Windows" },
    ];
    const hit = EVALUATORS["dung-chung"](f, P["dung-chung"].p);
    assert.ok(hit);
    assert.match(hit.summary, /3 máy khác nhau và 3 địa chỉ mạng/);
    assert.equal(hit.sections[2].rows.length, 3);
    // Ngoài 24 giờ thì không tính; tài khoản hết hạn thì không xét.
    f.events[2].at = ago(30);
    assert.equal(EVALUATORS["dung-chung"](f, P["dung-chung"].p), null);
    f.events[2].at = ago(3);
    assert.equal(EVALUATORS["dung-chung"]({ ...f, active: false }, P["dung-chung"].p), null);
  });

  it("bán lại: tính cả máy ứng dụng Android", () => {
    const f = base();
    f.events = Array.from({ length: 5 }, (_, i) => ({ at: ago(i + 1), kind: "hien-dien", ip: `9.9.9.${i}`, device: `dev${i}xxxxxxxx`, ua: "" }));
    f.appIps = Array.from({ length: 3 }, (_, i) => ({ device: `app${i}`, name: "Xiaomi", ip: `8.8.8.${i}`, firstAt: ago(5), lastAt: ago(1), uses: 3 }));
    assert.ok(EVALUATORS["ban-lai"](f, P["ban-lai"].p));
    f.appIps = f.appIps.slice(0, 2);
    assert.equal(EVALUATORS["ban-lai"](f, P["ban-lai"].p), null);
  });

  it("nhiều tài khoản lấy dùng thử: cần đủ số tài khoản và số đã dùng thử", () => {
    const f = base();
    f.linked = [
      { email: "a@x.vn", via: "may", value: "devdevdevdev", at: ago(10), trial: true, createdAt: ago(20) },
      { email: "b@x.vn", via: "mang", value: "5.5.5.5", at: ago(10), trial: true, createdAt: ago(20) },
    ];
    assert.ok(EVALUATORS["dung-thu-nhieu-tk"](f, P["dung-thu-nhieu-tk"].p));
    f.linked[1].trial = false;
    assert.equal(EVALUATORS["dung-thu-nhieu-tk"](f, P["dung-thu-nhieu-tk"].p), null);
  });

  it("yêu cầu hỗ trợ lặp lại: 6 trong 24 giờ", () => {
    const f = base();
    f.appeals = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, at: ago(i), status: "cho", excerpt: "xin gỡ" }));
    assert.ok(EVALUATORS["ho-tro-lap"](f, P["ho-tro-lap"].p));
    f.appeals.pop();
    assert.equal(EVALUATORS["ho-tro-lap"](f, P["ho-tro-lap"].p), null);
  });

  it("quá tải: 15 lần bị chặn trong 1 giờ", () => {
    const f = base();
    f.blocks = Array.from({ length: 15 }, () => ({ at: ago(0.5), action: "live-open" }));
    assert.ok(EVALUATORS["qua-tai"](f, P["qua-tai"].p));
    f.blocks = f.blocks.slice(1);
    assert.equal(EVALUATORS["qua-tai"](f, P["qua-tai"].p), null);
  });

  it("báo chuyển khoản giả: chỉ tính đơn đã quá số giờ chờ và không có tiền", () => {
    const f = base();
    f.claims = [
      { order: "o1", code: "TZ1", amount: 99000, claimedAt: ago(5), status: "Hết hạn", paid: false },
      { order: "o2", code: "TZ2", amount: 99000, claimedAt: ago(6), status: "Hết hạn", paid: false },
      { order: "o3", code: "TZ3", amount: 99000, claimedAt: ago(7), status: "Hết hạn", paid: false },
      { order: "o4", code: "TZ4", amount: 99000, claimedAt: ago(0.5), status: "Đã báo chuyển", paid: false },
      { order: "o5", code: "TZ5", amount: 99000, claimedAt: ago(8), status: "Đã trả", paid: true },
    ];
    const hit = EVALUATORS["chung-tu-gia"](f, P["chung-tu-gia"].p);
    assert.ok(hit);
    assert.equal(hit.sections[0].rows.length, 3);
    f.claims[0].paid = true;
    assert.equal(EVALUATORS["chung-tu-gia"](f, P["chung-tu-gia"].p), null);
  });

  it("CTV tự giới thiệu và máy ứng dụng nhiều nơi", () => {
    const f = base();
    f.selfRefs = [{ guest: "k@x.vn", via: "mang", value: "7.7.7.7", guestAt: ago(2), ctvAt: ago(3) }];
    assert.ok(EVALUATORS["ctv-tu-gioi-thieu"](f, P["ctv-tu-gioi-thieu"].p));
    f.appIps = Array.from({ length: 6 }, (_, i) => ({ device: "d1", name: "Xiaomi", ip: `6.6.6.${i}`, firstAt: ago(3), lastAt: ago(1), uses: 1 }));
    const hit = EVALUATORS["may-ung-dung"](f, P["may-ung-dung"].p);
    assert.deepEqual(hit?.extra, { devices: ["d1"] });
  });

  it("cài đặt lạ bị kẹp về khoảng an toàn, kiểu tự xử lý lạ về mặc định", () => {
    const s = parseRiskSettings(JSON.stringify({ "dung-chung": { on: false, p: { may: 1, mang: 999 } }, "qua-tai": { auto: "cam" } }));
    assert.equal(s["dung-chung"].on, false);
    assert.equal(s["dung-chung"].p.may, 2);
    assert.equal(s["dung-chung"].p.mang, 50);
    assert.equal(s["qua-tai"].auto, "khoa");
    assert.deepEqual(parseRiskSettings("không phải json"), riskDefaults());
  });

  it("hồ sơ: băm ổn định, chữ có đủ điều khoản, kết luận và bảng", () => {
    const ev = { hoSo: "RR-1", taoLuc: NOW, taiKhoan: { email: "a@x.vn", taoLuc: ago(100) }, luat: { ma: "qua-tai", ten: "Quá tải", dieuKhoan: "Mục 10", trichDan: "Cố tình tấn công.", cachPhatHien: "x", deXuat: "Cấm" }, ketLuan: "Bị chặn 20 lần", bang: [{ title: "Bảng", columns: ["A"], rows: [["1"]] }] };
    const a = canonical(ev);
    const b = canonical({ ...ev, luat: { ...ev.luat }, bang: ev.bang });
    assert.equal(a, b);
    const hash = createHash("sha256").update(a).digest("hex");
    const text = riskReport(ev, hash);
    for (const part of ["HỒ SƠ VI PHẠM RR-1", hash, "«Cố tình tấn công.»", "KẾT LUẬN: Bị chặn 20 lần", "--- Bảng (1 dòng) ---"]) assert.ok(text.includes(part), part);
  });

  it("đọc trình duyệt gọn", () => {
    assert.equal(shortUa("Mozilla/5.0 (Linux; Android 12) Chrome/120 Mobile Safari/537"), "Chrome · Android");
    assert.equal(shortUa("okhttp/4.12.0"), "Ứng dụng");
  });
});

describe("không bắt oan", () => {
  it("bán lại: nhiều địa chỉ mạng nhưng chỉ 1–2 máy (điện thoại đổi mạng) thì không tính", () => {
    const f = base();
    f.events = Array.from({ length: 20 }, (_, i) => ({ at: ago(i + 1), kind: "hien-dien", ip: `10.0.0.${i}`, device: i % 2 ? "maymot1234567" : "mayhai1234567", ua: "" }));
    assert.equal(EVALUATORS["ban-lai"](f, P["ban-lai"].p), null);
  });
});

describe("mã máy trong hồ sơ", () => {
  it("hai máy cùng phần đầu vẫn phân biệt được", () => {
    assert.notEqual(shortDev("maydungchung0xxxx"), shortDev("maydungchung1xxxx"));
    assert.equal(shortDev("0123456789abcdef0123456789abcdef"), "0123456789abcdef0123456789abcdef");
    assert.equal(shortDev(""), "—");
  });
});

import { createHmac } from "node:crypto";
import { sweepMessage, sweepTimeOk } from "./sweep-sign.ts";

describe("chữ ký quét đêm", () => {
  it("chỉ nhận trong 5 phút, cùng cách ký với lệnh openssl trên VPS", () => {
    assert.ok(sweepTimeOk(1000, 1200));
    assert.equal(sweepTimeOk(1000, 1301), false);
    assert.equal(sweepTimeOk(Number.NaN, 1000), false);
    // printf 'risk-sweep:1700000000' | openssl dgst -sha256 -hmac 'khoa-thu-...' -hex
    const sign = createHmac("sha256", "khoa-thu-0123456789abcdefghij").update(sweepMessage(1700000000.9)).digest("hex");
    assert.equal(sweepMessage(1700000000.9), "risk-sweep:1700000000");
    assert.equal(sign.length, 64);
  });
});
