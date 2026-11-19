import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IMPORT_CHUNK, IMPORT_MAX_ROWS, importBatches, importSummary, parseImportText, planImport, type ExistingTerm } from "./glossary-import.ts";

const none = new Map<string, ExistingTerm>();

describe("parseImportText đọc file nhập", () => {
  it("JSON: danh sách hoặc {rows}, bỏ BOM, ô sai kiểu thành rỗng", () => {
    assert.deepEqual(parseImportText('\uFEFF[{"source":"師父","target":"sư phụ"}]'), [{ source: "師父", target: "sư phụ" }]);
    assert.deepEqual(parseImportText('{"rows":[{"source":"a","target":"b"},{"source":1,"target":null}]}'), [
      { source: "a", target: "b" },
      { source: "", target: "" },
    ]);
  });

  it("CSV có dòng tiêu đề, dấu ; hoặc tab, và dạng «gốc = dịch»", () => {
    const rows = parseImportText("source,target\n師父,sư phụ\n小和尚;tiểu hòa thượng\n方丈 = phương trượng");
    assert.deepEqual(rows, [
      { source: "師父", target: "sư phụ" },
      { source: "小和尚", target: "tiểu hòa thượng" },
      { source: "方丈", target: "phương trượng" },
    ]);
  });

  it("file trống, JSON hỏng, JSON sai dạng, quá nhiều dòng thì báo lỗi rõ", () => {
    assert.throws(() => parseImportText("  \n "), /trống/);
    assert.throws(() => parseImportText("[{"), /hỏng/);
    assert.throws(() => parseImportText('{"a":1}'), /danh sách từ/);
    const big = Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) => `a${i}=b${i}`).join("\n");
    assert.throws(() => parseImportText(big), /chia nhỏ/);
  });
});

describe("planImport phân loại trước khi ghi", () => {
  const existing = new Map<string, ExistingTerm>([
    ["師父", { target: "sư phụ", hidden: false }],
    ["方丈", { target: "trụ trì", hidden: false }],
    ["小和尚", { target: "tiểu hòa thượng", hidden: true }],
  ]);

  it("mới, đổi, giống hệt, hiện lại từ đang ẩn", () => {
    const plan = planImport(
      [
        { source: "山門", target: "sơn môn" },
        { source: "方丈", target: "phương trượng" },
        { source: "師父", target: "sư phụ" },
        { source: "小和尚", target: "tiểu hòa thượng" },
      ],
      existing,
    );
    assert.deepEqual(plan.add, [{ source: "山門", target: "sơn môn" }]);
    assert.equal(plan.change.length, 2);
    assert.deepEqual(plan.change[0], { source: "方丈", target: "phương trượng", old: "trụ trì", restore: false });
    assert.equal(plan.change[1]?.restore, true);
    assert.equal(plan.same, 1);
  });

  it("không phân biệt hoa thường ở từ gốc; lặp trong file cùng dịch thì bỏ, khác dịch thì từ chối dòng sau", () => {
    const plan = planImport(
      [
        { source: "Master", target: "sư phụ" },
        { source: "master", target: "sư phụ" },
        { source: "MASTER", target: "thầy" },
      ],
      none,
    );
    assert.equal(plan.add.length, 1);
    assert.equal(plan.duplicates, 1);
    assert.equal(plan.rejected.length, 1);
    assert.equal(plan.rejected[0]?.line, 3);
    assert.match(plan.rejected[0]?.reason || "", /dòng 1/);
  });

  it("từ chối dòng thiếu, quá dài; làm sạch ký tự điều khiển và khoảng trắng", () => {
    const plan = planImport(
      [
        { source: "", target: "x" },
        { source: "x", target: "" },
        { source: "a".repeat(81), target: "x" },
        { source: " cổ \u0007 sơn ", target: " núi  cổ " },
      ],
      none,
    );
    assert.deepEqual(
      plan.rejected.map((item) => item.line),
      [1, 2, 3],
    );
    assert.deepEqual(plan.add, [{ source: "cổ sơn", target: "núi cổ" }]);
    assert.equal(plan.total, 4);
  });
});

describe("importBatches và importSummary", () => {
  it("chỉ ghi dòng mới và dòng đổi, cắt lượt theo IMPORT_CHUNK", () => {
    const rows = Array.from({ length: IMPORT_CHUNK + 5 }, (_, i) => ({ source: `s${i}`, target: `t${i}` }));
    const plan = planImport(rows, new Map([["s0", { target: "t0", hidden: false }]]));
    const batches = importBatches(plan);
    assert.equal(plan.same, 1);
    assert.equal(batches.reduce((n, b) => n + b.length, 0), IMPORT_CHUNK + 4);
    assert.ok(batches.every((b) => b.length <= IMPORT_CHUNK));
    assert.equal(importBatches(planImport([], none)).length, 0);
  });

  it("tóm tắt có số liệu và ví dụ đổi cách dịch", () => {
    const plan = planImport(
      [
        { source: "方丈", target: "phương trượng" },
        { source: "山門", target: "sơn môn" },
        { source: "", target: "" },
      ],
      new Map([["方丈", { target: "trụ trì", hidden: false }]]),
    );
    const text = importSummary(plan);
    assert.match(text, /Đọc 3 dòng: 1 từ mới, 1 từ đổi/);
    assert.match(text, /1 dòng không dùng được/);
    assert.match(text, /«方丈»: trụ trì → phương trượng/);
  });
});
