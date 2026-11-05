import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canSeeLog, canSkipToOwner, nextHold, roleAtLeast, standingBlock } from "./staff-role.ts";

describe("quyền admin", () => {
  it("Hỗ trợ không khóa và không cấm", () => {
    assert.equal(roleAtLeast("ho-tro", "ho-tro"), true);
    assert.equal(roleAtLeast("ho-tro", "quan-ly"), false);
    assert.equal(roleAtLeast("quan-ly", "quan-ly"), true);
    assert.equal(roleAtLeast("quan-ly", "chu"), false);
    assert.equal(roleAtLeast("chu", "chu"), true);
    assert.equal(roleAtLeast(null, "ho-tro"), false);
  });

  it("báo cấp trên và chỉ xem log cấp dưới", () => {
    assert.equal(nextHold("ho-tro", 1), "quan-ly");
    assert.equal(nextHold("ho-tro", 0), "chu");
    assert.equal(nextHold("quan-ly", 0), "chu");
    assert.equal(canSkipToOwner(0, 2 * 60 * 60 * 1000, "ho-tro"), true);
    assert.equal(canSkipToOwner(0, 2 * 60 * 60 * 1000 - 1, "ho-tro"), false);
    assert.equal(canSkipToOwner(0, 9 * 60 * 60 * 1000, "chu"), false);
    assert.equal(canSeeLog("ho-tro", "user"), true);
    assert.equal(canSeeLog("ho-tro", "quan-ly"), false);
    assert.equal(canSeeLog("quan-ly", "ho-tro"), true);
    assert.equal(canSeeLog("quan-ly", "chu"), false);
    assert.equal(canSeeLog("chu", "chu"), true);
  });

  it("hết hạn không phải bị khóa", () => {
    assert.equal(standingBlock("open", ""), null);
    assert.match(standingBlock("locked", "Dùng chung tài khoản") || "", /đang bị khóa/);
    assert.match(standingBlock("banned", "") || "", /bị cấm/);
  });
});
