/**
 * Kiểm toán R7-004: câu khách sửa tay trong lúc máy đang dịch giữ nguyên chữ của khách và không tính cho model.
 * Chạy: node --experimental-strip-types --experimental-test-module-mocks --import ./scripts/register-ts.mjs --test <tệp>
 */
import assert from "node:assert/strict";
import { mock, test } from "node:test";

type Seg = { original: string; translation: string | null; start: number; end: number; busy: boolean; edited?: boolean; model?: string };
const segs: Seg[] = Array.from({ length: 6 }, (_, i) => ({ original: `câu ${i}`, translation: null, start: i, end: i + 1, busy: false }));

mock.module("../sub/groq.ts", {
  namedExports: {
    contextBlock: () => "",
    sleep: (ms: number) => new Promise((r) => setTimeout(r, Math.min(ms, 5))),
    throwIfAborted: (signal: AbortSignal) => {
      if (signal.aborted) throw Object.assign(new Error("dừng"), { name: "AbortError" });
    },
    translateIndexes: async () => [],
    translateWithRepair: async (texts: string[]) => {
      // Khách sửa câu 2 trong khi lô đang ở nhà.
      if (texts.includes("câu 2")) Object.assign(segs[2], { edited: true, translation: "khách sửa tay" });
      await new Promise((r) => setTimeout(r, 10));
      return texts.map((t) => `dịch ${t}`);
    },
  },
});
const glossary = await import("../sub/glossary.ts");
mock.module("../sub/glossary.ts", { namedExports: { ...glossary, loadRunGlossary: async () => ({ terms: [], sources: [], error: false }) } });

test("R7-004: câu sửa tay trong lúc dịch giữ chữ khách, không ghi model, không cộng vào thống kê model", async () => {
  const { createTranslator } = await import("./translate.ts");
  const j = { segs, runId: 1, uses: {} as Record<string, number>, cooling: new Map(), blocked: new Set(), gate: { blockedUntil: 0 } };
  const ref = <T,>(current: T) => ({ current });
  const { translateRemaining } = createTranslator({
    j: j as never, my: 1, signal: new AbortController().signal, source: "ja", target: "vi", mode: "manual", chosen: "m", genre: "", gloss: "",
    title: "", notes: "", extra: "", profile: "can-bang" as never, allowEnterprise: false, baseGloss: false, threads: 2, modelSig: "m",
    ticket: () => "t", ticketPart: () => "chat", preRef: ref(false), reviewRef: ref(false), roomPayRef: ref(true), userTermsRef: ref([]),
    pauseForNewBible: ref(false), chatKeyOf: () => ({}) as never, autoPool: () => [] as never, ensureAnalysis: async () => null,
    releaseAsrTicket: async () => {}, ensureChatTicket: async () => {},
    setReviewHold: () => {}, publish: () => {}, progress: () => {}, say: () => {}, onWait: () => {},
  });
  await translateRemaining(() => true);
  assert.equal(segs[2].translation, "khách sửa tay");
  assert.equal(segs[2].model, undefined);
  assert.ok(segs.filter((_, i) => i !== 2).every((s) => s.translation === `dịch ${s.original}` && s.model === "m"));
  assert.deepEqual(j.uses, { m: 5 });
});
