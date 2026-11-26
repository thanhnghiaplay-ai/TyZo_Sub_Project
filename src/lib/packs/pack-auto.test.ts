import assert from "node:assert/strict";
import test from "node:test";
import { AUTO_LEVELS, autoRoles, buildAutoPack, compareLevels, onlyKeyed, onlyRentOpen, pickForRole, type AutoCandidate } from "./pack-auto.ts";
import type { PriceBook } from "../billing/run-bill.ts";
import { checkServicePack } from "../service-pack.ts";
import { ALIBABA_ROWS } from "../sub/alibaba-catalog.ts";
import type { GroqLiveRow } from "../sub/groq-board.ts";

const row = (id: string, over: Partial<GroqLiveRow> = {}): GroqLiveRow => ({
  id, speed: null, usdIn: null, usdOut: null, usdPerHour: null, usdPerMillionChars: null,
  unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null, ...over,
});
const desk = { markup: 0, custom: {} };
const groq: PriceBook = {
  rate: 25000, desk,
  rows: [
    row("openai/gpt-oss-20b", { usdIn: 0.075, usdOut: 0.3 }),
    row("openai/gpt-oss-120b", { usdIn: 0.15, usdOut: 0.6 }),
    row("qwen/qwen3.8-27b", { usdIn: 0.8, usdOut: 4 }),
    row("openai/gpt-oss-safeguard-20b", { usdIn: 0.075, usdOut: 0.3 }),
    row("whisper-large-v3-turbo", { usdPerHour: 0.04 }),
    row("whisper-large-v3", { usdPerHour: 0.111 }),
    row("canopylabs/orpheus-v1-english", { usdPerMillionChars: 22 }),
  ],
};
const alibaba: PriceBook = { rate: 25000, desk, rows: ALIBABA_ROWS };
const books = { groq, alibaba };

const C = (provider: AutoCandidate["provider"], model: string): AutoCandidate => ({ provider, model });
const all: AutoCandidate[] = [
  C("groq", "openai/gpt-oss-20b"), C("groq", "openai/gpt-oss-120b"), C("groq", "qwen/qwen3.8-27b"),
  C("groq", "openai/gpt-oss-safeguard-20b"), C("groq", "whisper-large-v3-turbo"), C("groq", "whisper-large-v3"),
  C("groq", "canopylabs/orpheus-v1-english"),
  C("alibaba", "qwen-turbo"), C("alibaba", "qwen-plus"), C("alibaba", "qwen-max"),
  C("alibaba", "qwen-audio-3.0-asr-flash-filetrans"),
];

test("ba mức lồng nhau: model dịch Tiết kiệm không đắt hơn Cân bằng, Cân bằng không đắt hơn Chất lượng", () => {
  const cost = (m: string, p: AutoCandidate["provider"]) => {
    const r = (p === "groq" ? groq : alibaba).rows.find((x) => x.id === m)!;
    return (r.usdIn ?? 0) * 12 * 60 + (r.usdOut ?? 0) * 8 * 60;
  };
  const [save, balanced, best] = AUTO_LEVELS.map((l) => pickForRole("translate", l, { candidates: all, books })!);
  assert.ok(cost(save.model, save.provider) <= cost(balanced.model, balanced.provider));
  assert.ok(cost(balanced.model, balanced.provider) <= cost(best.model, best.provider));
});

test("Chất lượng chọn điểm cao nhất, hòa điểm thì lấy rẻ hơn; lời gốc CJK ưu tiên điểm tiếng Á", () => {
  assert.equal(pickForRole("translate", "best", { candidates: all, books })?.model, "openai/gpt-oss-120b");
  assert.equal(pickForRole("translate", "best", { candidates: all, books, lang: "cjk" })?.model, "qwen/qwen3.8-27b");
});

test("Tiết kiệm chọn model rẻ nhất vượt ngưỡng điểm sàn", () => {
  assert.equal(pickForRole("translate", "save", { candidates: all, books })?.model, "qwen-turbo");
  const weakOnly = [C("groq", "openai/gpt-oss-20b")];
  assert.equal(pickForRole("translate", "save", { candidates: weakOnly, books })?.model, "openai/gpt-oss-20b");
});

test("mỗi việc chỉ nhận đúng loại model: dịch không lấy whisper, orpheus, safeguard; nhận dạng chỉ lấy model nhận dạng", () => {
  for (const level of AUTO_LEVELS) {
    const t = pickForRole("translate", level, { candidates: all, books })!;
    assert.ok(!/whisper|orpheus|safeguard|asr/.test(t.model), t.model);
    const a = pickForRole("asr", level, { candidates: all, books })!;
    assert.ok(/whisper|asr|nova/.test(a.model), a.model);
  }
  assert.equal(pickForRole("narration", "best", { candidates: all, books })?.model, "canopylabs/orpheus-v1-english");
});

test("nhận dạng chọn được cả hai nhà", () => {
  const only = (p: AutoCandidate["provider"]) => all.filter((c) => c.provider === p);
  for (const p of ["groq", "alibaba"] as const) {
    const got = pickForRole("asr", "best", { candidates: only(p), books });
    assert.equal(got?.provider, p);
  }
});

test("autoRoles: nhận dạng và dịch luôn có (mặc định Cân bằng), việc không bắt buộc mặc định tắt", () => {
  const out = autoRoles({ levels: {}, candidates: all, books });
  assert.ok(out.roles.asr && out.roles.translate);
  assert.equal(out.roles.review, undefined);
  assert.equal(out.roles.narration, undefined);
  assert.deepEqual(out.missing, []);
  const withMore = autoRoles({ levels: { review: "best", narration: "save", asr: "off" }, candidates: all, books });
  assert.ok(withMore.roles.review && withMore.roles.narration && withMore.roles.asr);
});

test("thiếu giá hoặc thiếu điểm thì bỏ qua và báo missing, không đoán", () => {
  const noPrice = autoRoles({ levels: { review: "balanced" }, candidates: all, books: { groq: { ...groq, rows: [] } } });
  assert.ok(noPrice.missing.includes("translate"));
  const unknown = autoRoles({ levels: {}, candidates: [C("groq", "mo-hinh-la")], books });
  assert.deepEqual(unknown.missing.sort(), ["asr", "translate"]);
});

test("buildAutoPack: gói nháp (tắt), hợp lệ với checkServicePack, ghi chú nêu mức đã dùng", () => {
  const levels = { translate: "best", review: "save" } as const;
  const { roles } = autoRoles({ levels, candidates: all, books });
  const pack = buildAutoPack({ id: "pack_abc123def456", levels, roles })!;
  assert.equal(pack.enabled, false);
  assert.deepEqual(pack.doors, ["turn", "rent"]);
  assert.equal(pack.name, "Gói tự động · Chất lượng");
  assert.match(pack.note, /Dịch: Chất lượng/);
  assert.match(pack.note, /Đối chiếu: Tiết kiệm/);
  assert.deepEqual(pack.roles, roles);
  assert.deepEqual(checkServicePack(pack).roles, roles);
});

test("buildAutoPack: thiếu nhận dạng hoặc dịch thì không dựng gói", () => {
  assert.equal(buildAutoPack({ id: "pack_abc123def456", levels: {}, roles: { translate: { provider: "groq", model: "openai/gpt-oss-120b" } } }), null);
});

test("onlyRentOpen: chỉ giữ model đã mở cho thuê phòng, chưa lưu danh sách thì không lọc", () => {
  const show = { groq: ["openai/gpt-oss-120b", "whisper-large-v3-turbo"], alibaba: ["qwen-audio-3.0-asr-flash-filetrans"], "tyzo-modal": [] };
  const kept = onlyRentOpen(all, show);
  assert.deepEqual(kept.map((c) => c.model).sort(), ["openai/gpt-oss-120b", "qwen-audio-3.0-asr-flash-filetrans", "whisper-large-v3-turbo"]);
  assert.equal(onlyRentOpen(all, null), all);
  const out = autoRoles({ levels: {}, candidates: kept, books });
  assert.equal(out.roles.translate?.model, "openai/gpt-oss-120b");
  assert.ok(out.roles.asr);
});

test("onlyKeyed: chỉ giữ model của nhà đã có key, chưa đọc được key thì không lọc", () => {
  const keyed = { groq: true, alibaba: false };
  const kept = onlyKeyed(all, keyed);
  assert.ok(kept.length > 0);
  assert.ok(kept.every((c) => c.provider === "groq"));
  assert.equal(onlyKeyed(all, null), all);
  assert.deepEqual(onlyKeyed(all, {}), []);
  const out = autoRoles({ levels: { translate: "best" }, candidates: kept, books });
  assert.notEqual(out.roles.translate?.provider, "alibaba");
  assert.notEqual(out.roles.asr?.provider, "alibaba");
});

test("compareLevels: khớp pickForRole, điểm tăng và giá không đảo giữa ba mức", () => {
  for (const role of ["asr", "translate"] as const) {
    const view = compareLevels(role, { candidates: all, books });
    for (const level of AUTO_LEVELS) {
      const pick = pickForRole(role, level, { candidates: all, books });
      assert.equal(view[level]?.model, pick?.model);
      assert.equal(view[level]?.provider, pick?.provider);
    }
    assert.ok(view.save && view.balanced && view.best);
    assert.ok(view.save.score <= view.balanced.score && view.balanced.score <= view.best.score);
    assert.ok(view.save.cost <= view.balanced.cost && view.balanced.cost <= view.best.cost);
  }
});

test("compareLevels: không có model hợp lệ thì cả ba mức là null", () => {
  const view = compareLevels("translate", { candidates: [], books });
  assert.deepEqual(view, { save: null, balanced: null, best: null });
});
