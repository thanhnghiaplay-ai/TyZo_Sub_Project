import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { legacyMarkupOf, parseRunDesk } from "../run-desk.ts";
import { formatRoomTokens, packPriceVnd, tokensForBase } from "./token-math.ts";

describe("quy giây dịch", () => {
  it("1 giây Turbo là 1 đơn vị, model đắt hơn thì nhiều hơn", () => {
    assert.equal(tokensForBase(30_000, 0.3), 100_000);
    assert.equal(tokensForBase(0.3, 0.3), 1);
    assert.equal(tokensForBase(0, 0.3), 0);
    assert.equal(tokensForBase(10, 0), null);
  });

  it("giá gói là số giây nhân giá Turbo, phần chênh và đệm, làm tròn lên", () => {
    assert.equal(packPriceVnd(100_000, 0.3, 50, 1.2), 54_000);
    assert.equal(packPriceVnd(1, 0.2, 0, 1), 1);
    assert.equal(packPriceVnd(10, 0, 50, 1.2), null);
    assert.equal(packPriceVnd(10, 0.3, 50, 0), null);
  });
});


describe("bỏ phần trăm chênh theo nhà", () => {
it("giá model ở trả theo lượt nói bằng Token dịch, không còn đồng", () => {
  const groq = {
    rate: 25000,
    rows: [
      { id: "whisper-large-v3-turbo", usdPerHour: 0.04, usdPerMillionChars: null, usdIn: null, usdOut: null },
    ],
  } as never;
  const text = formatRoomTokens({ usdPerHour: 0.08, usdPerMillionChars: null, usdIn: null, usdOut: null }, groq);
  assert.match(text ?? "", /Token dịch\/giờ$/);
  assert.doesNotMatch(text ?? "", /đ\b/);
  // model đắt gấp đôi Turbo thì đúng gấp đôi Token dịch mỗi giờ
  const turbo = formatRoomTokens({ usdPerHour: 0.04, usdPerMillionChars: null, usdIn: null, usdOut: null }, groq);
  const num = (t: string | null) => Number((t ?? "").replace(/\./g, "").match(/^\d+/)?.[0] ?? 0);
  assert.ok(num(text) > num(turbo));
  assert.equal(formatRoomTokens({ usdPerHour: 0.04, usdPerMillionChars: null, usdIn: null, usdOut: null }, { rate: 25000, rows: [] } as never), null);
});

it("phần trăm chênh Groq/Alibaba không còn được cộng, số cũ chỉ để ước phiếu cũ", () => {
  const raw = JSON.stringify({ markup: 30, cap: 0 });
  assert.equal(parseRunDesk(raw).markup, 0);
  assert.equal(legacyMarkupOf(raw), 30);
  assert.equal(legacyMarkupOf(null), 0);
});
});

describe("một tên gọi: Token dịch", () => {
  it("chữ khách thấy không còn «gói giây» hay «giây dịch»", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const root = new URL("../..", import.meta.url).pathname;
    // Lịch sử (CHANGELOG khách, nhật ký Admin) giữ nguyên chữ cũ; test không đọc chính nó.
    const skip = new Set(["app-version.ts", "admin-log.server.ts", "token-math.test.ts"]);
    const bad: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(name) && !skip.has(name) && !/\.test\.ts$/.test(name)) {
          const text = readFileSync(full, "utf8");
          if (/gói giây|giây dịch|Gói giây/.test(text)) bad.push(full.replace(root, ""));
        }
      }
    };
    walk(root);
    assert.deepEqual(bad, []);
  });
});
