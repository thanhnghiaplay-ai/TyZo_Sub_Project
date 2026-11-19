import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/** Nút (i): ghi chú giải thích gom vào đây cho gọn. Cảnh báo và lỗi vẫn hiện sẵn, không đưa vào (i). */
const tip = readFileSync(new URL("./info-tip.tsx", import.meta.url), "utf8");
const studio = readFileSync(new URL("./studio.tsx", import.meta.url), "utf8");

describe("InfoTip (i)", () => {
  it("bấm được trên điện thoại, rê chuột chỉ tính với chuột, có tên cho trình đọc màn hình, vùng chạm 44px", () => {
    assert.match(tip, /@radix-ui\/react-popover/);
    assert.match(tip, /pointerType !== "mouse"/);
    assert.match(tip, /aria-label=\{label\}/);
    assert.match(tip, /p-3/);
  });

  it("Studio dùng (i) cho ghi chú giải thích ở các tab, và ô chọn nhận tham số tip", () => {
    const uses = studio.match(/<InfoTip /g) ?? [];
    assert.ok(uses.length >= 8, `chỉ ${uses.length} chỗ dùng (i)`);
    assert.match(studio, /tip\?: ReactNode/);
  });

  it("các ghi chú giải thích đã chuyển vào (i) không còn hiện sẵn dưới ô điều khiển", () => {
    for (const gone of [
      "Chạm một câu để tua.</p>",
      "Tắt thì chỉ bỏ đoạn im.",
      "Hợp phim lẫn nhiều thứ tiếng.",
      "Một lần dịch giữ một lối.</p>",
    ]) {
      const hit = studio.split(gone).length - 1;
      assert.ok(hit <= (gone.startsWith("Tắt") || gone.startsWith("Hợp") ? 1 : 0), gone);
    }
  });
});
