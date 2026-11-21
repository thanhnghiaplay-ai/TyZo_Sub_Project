import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { RELOAD_GAP_MS, RELOAD_KEY, claimAutoReload, isStaleBuildError } from "./stale-build.ts";

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe("trang mở từ bản cũ sau khi web lên bản mới", () => {
  it("nhận ra lỗi không tải được tệp bản cũ trên các trình duyệt", () => {
    assert.ok(isStaleBuildError(new Error("Failed to fetch dynamically imported module: https://x/assets/routes-DsYV_aeZ.js")));
    assert.ok(isStaleBuildError(new Error("error loading dynamically imported module")));
    assert.ok(isStaleBuildError(new Error("Importing a module script failed.")));
    assert.ok(!isStaleBuildError(new Error("Chưa đủ Token dịch.")));
    assert.ok(!isStaleBuildError(null));
  });

  it("tự tải lại một lần, không lặp trong 30 giây; máy chặn lưu thì không tự tải", () => {
    const store = memory();
    assert.equal(claimAutoReload(store, 1_000_000), true);
    assert.equal(store.getItem(RELOAD_KEY), "1000000");
    assert.equal(claimAutoReload(store, 1_000_000 + RELOAD_GAP_MS - 1), false);
    assert.equal(claimAutoReload(store, 1_000_000 + RELOAD_GAP_MS), true);
    assert.equal(claimAutoReload(null), false);
    const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
    assert.equal(claimAutoReload(broken), false);
  });

  it("màn lỗi vẫn hiện câu lỗi, có nút tải lại; gốc trang nghe vite:preloadError", () => {
    const view = readFileSync(new URL("./error-component.tsx", import.meta.url), "utf8");
    assert.match(view, /\{errorMessage\(error\)\}/);
    assert.match(view, /Tải lại trang/);
    const root = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf8");
    assert.match(root, /<StaleBuildGuard \/>/);
  });
});
