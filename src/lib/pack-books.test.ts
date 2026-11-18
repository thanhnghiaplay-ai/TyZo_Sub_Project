import assert from "node:assert/strict";
import test from "node:test";
import { pickForRole, type AutoCandidate } from "./pack-auto.ts";
import { buildPackBooks } from "./pack-books.ts";
import { asrPerSecond } from "./run-bill.ts";
import { ALIBABA_ROWS } from "./sub/alibaba-catalog.ts";
import { ASSEMBLYAI_BASE_ROWS } from "./sub/assemblyai-base.ts";
import { DEEPGRAM_ROWS } from "./sub/deepgram-catalog.ts";
import { SPEECHMATICS_BASE_ROWS } from "./sub/speechmatics-base.ts";
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

test("số Chủ sửa tay phủ giá gốc, ô trống giữ nguyên", () => {
  const id = ASSEMBLYAI_BASE_ROWS[0].id;
  const before = asrPerSecond(books.assemblyai, id);
  const fixed = buildPackBooks({
    rate: 25000,
    groqRows: [],
    usdFix: { [id]: { hour: 9, inn: null, out: null, chars: null } },
  });
  const after = asrPerSecond(fixed.assemblyai, id);
  assert.notEqual(before, after);
  assert.equal(after, Math.round(9 * 25000) / 3600);
  assert.equal(asrPerSecond(fixed.speechmatics, SPEECHMATICS_BASE_ROWS[0].id), asrPerSecond(books.speechmatics, SPEECHMATICS_BASE_ROWS[0].id));
});

test("bảng tự kéo Alibaba và Deepgram thay giá trong code; thiếu thì giữ; số sửa tay vẫn thắng", () => {
  const ali = ALIBABA_ROWS.map((row) => (row.id === "qwen-turbo" ? { ...row, usdIn: 0.08 } : row));
  const dgId = DEEPGRAM_ROWS[0].id;
  const dg = DEEPGRAM_ROWS.map((row) => (row.id === dgId ? { ...row, usdPerHour: 0.3 } : row));
  const pulled = buildPackBooks({ rate: 25000, groqRows: [], alibabaRows: ali, deepgramRows: dg });
  assert.equal(pulled.alibaba.rows.find((row) => row.id === "qwen-turbo")?.usdIn, 0.08);
  assert.equal(pulled.deepgram.rows.find((row) => row.id === dgId)?.usdPerHour, 0.3);
  assert.equal(books.alibaba.rows.find((row) => row.id === "qwen-turbo")?.usdIn, 0.05);
  assert.equal(books.deepgram.rows.find((row) => row.id === dgId)?.usdPerHour, DEEPGRAM_ROWS[0].usdPerHour);
  const fixed = buildPackBooks({
    rate: 25000,
    groqRows: [],
    alibabaRows: ali,
    usdFix: { "qwen-turbo": { hour: null, inn: 1, out: null, chars: null } },
  });
  assert.equal(fixed.alibaba.rows.find((row) => row.id === "qwen-turbo")?.usdIn, 1);
  assert.equal(fixed.deepgram.rows.find((row) => row.id === dgId)?.usdPerHour, DEEPGRAM_ROWS[0].usdPerHour);
});

test("Dựng gói tự động chọn được model nhận dạng của 3 nhà mới khi chỉ có nhà đó", () => {
  for (const house of ["assemblyai", "speechmatics", "soniox"] as const) {
    const candidates: AutoCandidate[] = ASR_MODELS.filter((row) => asrHouse(row.id) === house).map((row) => ({ provider: house, model: row.id }));
    const pick = pickForRole("asr", "balanced", { candidates, books });
    assert.equal(pick?.provider, house);
  }
});
