import assert from "node:assert/strict";
import test from "node:test";
import { pickForRole, type AutoCandidate } from "./pack-auto.ts";
import { buildPackBooks } from "./pack-books.ts";
import { asrPerSecond } from "./run-bill.ts";
import { ALIBABA_ROWS } from "./sub/alibaba-catalog.ts";
import { ALL_PROVIDER_IDS } from "./sub/provider.ts";
import { ASR_MODELS } from "./sub/models.ts";
import { asrHouse } from "./sub/asr-house.ts";

const books = buildPackBooks({ rate: 25000, groqRows: [] });

test("sổ giá có đủ mọi nhà trong ALL_PROVIDER_IDS và Alibaba có giá nhận dạng", () => {
  for (const id of ALL_PROVIDER_IDS) assert.ok(books[id], `thiếu sổ giá ${id}`);
  for (const m of ASR_MODELS.filter((row) => asrHouse(row.id) === "alibaba")) {
    assert.ok(asrPerSecond(books.alibaba, m.id) != null, `alibaba: ${m.id} chưa có giá`);
  }
});

test("markup Alibaba chỉ áp cho Alibaba", () => {
  const b = buildPackBooks({ rate: 25000, groqRows: [], alibabaMarkup: 10 });
  assert.equal(b.alibaba.desk.markup, 10);
  assert.equal(b["tyzo-modal"].desk.markup, 0);
});

test("bảng tự kéo Alibaba thay giá trong code; thiếu thì giữ; số sửa tay vẫn thắng", () => {
  const ali = ALIBABA_ROWS.map((row) => (row.id === "qwen-turbo" ? { ...row, usdIn: 0.08 } : row));
  const pulled = buildPackBooks({ rate: 25000, groqRows: [], alibabaRows: ali });
  assert.equal(pulled.alibaba.rows.find((row) => row.id === "qwen-turbo")?.usdIn, 0.08);
  assert.equal(books.alibaba.rows.find((row) => row.id === "qwen-turbo")?.usdIn, 0.05);
  const fixed = buildPackBooks({
    rate: 25000,
    groqRows: [],
    alibabaRows: ali,
    usdFix: { "qwen-turbo": { hour: null, inn: 1, out: null, chars: null } },
  });
  assert.equal(fixed.alibaba.rows.find((row) => row.id === "qwen-turbo")?.usdIn, 1);
});

test("Dựng gói tự động chọn được model nhận dạng Alibaba khi chỉ có nhà đó", () => {
  const candidates: AutoCandidate[] = ASR_MODELS.filter((row) => asrHouse(row.id) === "alibaba").map((row) => ({ provider: "alibaba", model: row.id }));
  const pick = pickForRole("asr", "balanced", { candidates, books });
  assert.equal(pick?.provider, "alibaba");
});
