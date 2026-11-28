import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { RELOAD_GAP_MS, RELOAD_KEY, UPDATE_RELOAD_WARNING, claimAutoReload, confirmUpdateReload, isStaleBuildError } from "./stale-build.ts";
import { holdPageActivity, hasPageActivity } from "./page-activity.ts";

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe("trang mở từ bản cũ sau khi web lên bản mới", () => {
  it("R8-004: active tasks block reload without consuming the later reload allowance", () => {
    const first = holdPageActivity();
    const second = holdPageActivity();
    const store = memory();
    assert.equal(claimAutoReload(store, 1_000_000, hasPageActivity()), false);
    assert.equal(store.getItem(RELOAD_KEY), null);
    first(); first();
    assert.equal(hasPageActivity(), true);
    second();
    assert.equal(claimAutoReload(store, 1_000_000, hasPageActivity()), true);
  });
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

  it("TZ-009: nút Tải lại của thông báo bản mới không bỏ mất việc đang chạy", async () => {
    let asked = 0;
    const yes = async () => { asked++; return true; };
    const no = async () => { asked++; return false; };
    const boom = async () => { throw new Error("x"); };
    assert.equal(await confirmUpdateReload(false, no), true);
    assert.equal(asked, 0);
    assert.equal(await confirmUpdateReload(true, yes), true);
    assert.equal(await confirmUpdateReload(true, no), false);
    assert.equal(await confirmUpdateReload(true, boom), false);
    assert.equal(asked, 2);
    assert.equal(UPDATE_RELOAD_WARNING.danger, true);
    const banner = readFileSync(new URL("../components/update-banner.tsx", import.meta.url), "utf8");
    assert.match(banner, /confirmUpdateReload\(hasPageActivity\(\), askConfirm\)/);
    assert.doesNotMatch(banner, /onClick=\{\(\) => window\.location\.reload\(\)\}/);
  });
});
