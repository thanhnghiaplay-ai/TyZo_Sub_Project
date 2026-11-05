import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { roleAtLeast, standingBlock } from "./staff-role.ts";

describe("quyền admin", () => {
  it("Hỗ trợ không khóa và không cấm", () => {
    assert.equal(roleAtLeast("ho-tro", "ho-tro"), true);
    assert.equal(roleAtLeast("ho-tro", "quan-ly"), false);
    assert.equal(roleAtLeast("quan-ly", "quan-ly"), true);
    assert.equal(roleAtLeast("quan-ly", "chu"), false);
    assert.equal(roleAtLeast("chu", "chu"), true);
    assert.equal(roleAtLeast(null, "ho-tro"), false);
  });

  it("hết hạn không phải bị khóa", () => {
    assert.equal(standingBlock("open", ""), null);
    assert.match(standingBlock("locked", "Dùng chung tài khoản") || "", /đang bị khóa/);
    assert.match(standingBlock("banned", "") || "", /bị cấm/);
  });
});
