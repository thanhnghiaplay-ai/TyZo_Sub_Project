import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("TZ-008: nút bắt đầu trong lúc chuẩn bị", () => {
  const hook = read("./use-pipeline.ts");
  const studio = read("./studio.tsx");

  it("bấm bắt đầu: đặt starting trước lần await đầu và trả về trong finally, kể cả khi lỗi", () => {
    const body = hook.slice(hook.indexOf("const start = useCallback(() => startJobOnce("), hook.indexOf("[startRun]);"));
    assert.match(body, /holdPageActivity\(\);\s*setStarting\(true\);\s*try \{\s*await startRun\(\);\s*\} finally \{\s*setStarting\(false\);\s*release\(\);/);
  });

  it("nút chính báo «Đang chuẩn bị…» và bị khóa; Hủy vẫn ưu tiên khi đang chạy", () => {
    const label = hook.slice(hook.indexOf("const buttonLabel = useMemo"), hook.indexOf("[running, starting, mediaId"));
    assert.ok(label.indexOf('if (running) return "Hủy"') < label.indexOf('if (starting) return "Đang chuẩn bị…"'));
    assert.match(studio, /disabled=\{!app\.running && \(!online \|\| normalDown \|\| app\.starting\)\}/);
    assert.match(hook, /\n {4}starting,\n/);
  });

  it("nút Tiếp tục nhỏ ở thanh trên không hiện trong lúc đang chuẩn bị (nhãn đã đổi)", () => {
    assert.match(studio, /app\.buttonLabel === "Tiếp tục"/);
  });
});
