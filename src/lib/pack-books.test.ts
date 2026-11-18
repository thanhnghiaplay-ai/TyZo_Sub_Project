import assert from "node:assert/strict";
import test from "node:test";
import { pickForRole, type AutoCandidate } from "./pack-auto.ts";
import { buildPackBooks } from "./pack-books.ts";
import { asrPerSecond } from "./run-bill.ts";
import { ALL_PROVIDER_IDS } from "./sub/provider.ts";
import { ASR_MODELS } from "./sub/models.ts";
import { asrHouse } from "./sub/asr-house.ts";

const books = buildPackBooks({ rate: 25000, groqRows: [] });

test("sổ giá có đủ mọi nhà trong ALL_PROVIDER_IDS và mỗi nhà nhận dạng có dòng giá", () => {
  for (const id of ALL_PROVIDER_IDS) assert.ok(books[id], `thiếu sổ giá ${id}`);
  for (const house of ["deepgram", "assemblyai", "speechmatics", "soniox"] as const) {
    for (const m of ASR_MODELS.filter((row) => asrHouse(row.id) === house)) {
      assert.ok(asrPerSecond(books[house], m.id) != null, `${house}: ${m.id} chưa có giá`);
    }
  }
});

test("markup Alibaba chỉ áp cho Alibaba", () => {
  const b = buildPackBooks({ rate: 25000, groqRows: [], alibabaMarkup: 10 });
  assert.equal(b.alibaba.desk.markup, 10);
  assert.equal(b.assemblyai.desk.markup, 0);
});

test("Dựng gói tự động chọn được model nhận dạng của 3 nhà mới khi chỉ có nhà đó", () => {
  for (const house of ["assemblyai", "speechmatics", "soniox"] as const) {
    const candidates: AutoCandidate[] = ASR_MODELS.filter((row) => asrHouse(row.id) === house).map((row) => ({ provider: house, model: row.id }));
    const pick = pickForRole("asr", "balanced", { candidates, books });
    assert.equal(pick?.provider, house);
  }
});
