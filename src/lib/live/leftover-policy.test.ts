import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { preserveLeftoverScript as keep } from "./leftover-policy.ts";
import { dropLeftoverScript } from "./leftover-script.ts";

// Ma trận so sánh: [đích, câu, hành vi HIỆN TẠI (dropLeftoverScript), hành vi ĐỀ XUẤT (preserveLeftoverScript)].
const MATRIX: [string, string, string, string][] = [
  ["vi", "Bạn phải luôn如一.", "Bạn phải luôn.", "Bạn phải luôn."], // dính liền: vẫn bỏ (ca thật 28/11)
  ["vi", "Tôi gặp 王小明 hôm qua.", "Tôi gặp hôm qua.", "Tôi gặp 王小明 hôm qua."], // tên riêng: giữ
  ["vi", "Ca sĩ 아이유 hát.", "Ca sĩ hát.", "Ca sĩ 아이유 hát."],
  ["en", "I met 田中 in Tokyo.", "I met in Tokyo.", "I met 田中 in Tokyo."],
  ["vi", "Công ty ソニー ra mắt.", "Công ty ra mắt.", "Công ty ソニー ra mắt."],
  ["vi", "Xin chào 你好 bạn。", "Xin chào bạn.", "Xin chào 你好 bạn."], // ĐÁNH ĐỔI: từ thường đứng riêng cũng được giữ
  ["vi", "Cảm ơn ありがとう，hẹn gặp 안녕！", "Cảm ơn, hẹn gặp!", "Cảm ơn ありがとう, hẹn gặp 안녕!"], // ĐÁNH ĐỔI
  ["vi", "Anh Nguyễn Văn An đến Hà Nội.", "Anh Nguyễn Văn An đến Hà Nội.", "Anh Nguyễn Văn An đến Hà Nội."],
  ["ja", "田中さんは東京に行きました。", "田中さんは東京に行きました。", "田中さんは東京に行きました。"],
];

describe("RE7-004 · phương án bảo toàn tên riêng CJK (chưa nối, chờ Chủ duyệt)", () => {
  it("ma trận hiện tại ↔ đề xuất", () => {
    for (const [t, s, now, next] of MATRIX) {
      assert.equal(dropLeftoverScript(s, t), now, `hiện tại: ${s}`);
      assert.equal(keep(s, t).text, next, `đề xuất: ${s}`);
    }
  });
  it("danh sách giữ (thuật ngữ/tên khai báo) thắng cả khi dính liền", () => {
    assert.equal(keep("Đội王者thắng.", "vi").text, "Độithắng.");
    assert.equal(keep("Đội王者thắng.", "vi", { keep: ["王者"] }).text, "Đội王者thắng.");
  });
  it("báo phần bỏ và phần giữ để đo/giám sát", () => {
    assert.deepEqual(keep("Bạn luôn如一, gặp 王小明.", "vi"), { text: "Bạn luôn, gặp 王小明.", dropped: ["如一"], kept: ["王小明"] });
  });
  it("mẩu tạm (delta): quyết định dựa trên ký tự kề trong CÙNG mẩu — ghép delta có thể khác câu chốt", () => {
    // Đã biết: «luôn» và «如一» ở hai mẩu khác nhau thì mẩu «如一» không thấy chữ kề → được giữ ở delta, bị bỏ ở câu chốt.
    // Nếu duyệt phương án này, cầu nối cần lọc delta theo phần cuối của mẩu trước (giữ 1 ký tự ngữ cảnh) hoặc chỉ lọc câu chốt.
    const deltas = ["Bạn phải luôn", "如一."].map((d) => keep(d, "vi", { whole: false }).text).join("");
    assert.equal(deltas, "Bạn phải luôn如一.");
    assert.equal(keep("Bạn phải luôn如一.", "vi").text, "Bạn phải luôn.");
  });
});
