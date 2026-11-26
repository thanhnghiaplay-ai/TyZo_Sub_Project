/**
 * Kiểm toán v5.49 SPLIT-008: nhiều luồng dịch không được nhận cùng một lô câu trong lúc chờ đổi phiếu.
 * Chạy: node --experimental-strip-types --experimental-test-module-mocks --import ./scripts/register-ts.mjs --test <tệp>
 */
import assert from "node:assert/strict";
import { mock, test } from "node:test";

const calls: string[][] = [];
mock.module("../sub/groq.ts", {
  namedExports: {
    contextBlock: () => "",
    sleep: (ms: number) => new Promise((r) => setTimeout(r, Math.min(ms, 5))),
    throwIfAborted: (signal: AbortSignal) => {
      if (signal.aborted) throw Object.assign(new Error("dừng"), { name: "AbortError" });
    },
    translateIndexes: async () => [],
    translateWithRepair: async (texts: string[]) => {
      calls.push(texts);
      await new Promise((r) => setTimeout(r, 20));
      return texts.map((t) => `dịch ${t}`);
    },
  },
});

const glossary = await import("../sub/glossary.ts");
let glossaryLoads = 0;
const glossaryNotices: string[] = [];
mock.module("../sub/glossary.ts", { namedExports: { ...glossary,
  loadRunGlossary: async () => { glossaryLoads++; return { terms: [], sources: [], error: true }; },
} });

test("4 luồng dịch, đổi phiếu mất 50 ms: mỗi câu chỉ gửi đi dịch một lần", async () => {
  const { createTranslator } = await import("./translate.ts");
  const segs = Array.from({ length: 6 }, (_, i) => ({ original: `câu ${i}`, translation: null as string | null, start: i, end: i + 1, busy: false }));
  const j = { segs, runId: 1, uses: {}, cooling: new Map(), blocked: new Set(), gate: { blockedUntil: 0 } } as never;
  let switched: Promise<void> | null = null;
  const ref = <T,>(current: T) => ({ current });
  const { translateRemaining } = createTranslator({
    j, my: 1, signal: new AbortController().signal, source: "ja", target: "vi", mode: "manual", chosen: "m", genre: "", gloss: "",
    title: "", notes: "", extra: "", profile: "can-bang" as never, allowEnterprise: false, baseGloss: false, threads: 4, modelSig: "m",
    ticket: () => "t", ticketPart: () => "chat", preRef: ref(false), reviewRef: ref(false), roomPayRef: ref(true), userTermsRef: ref([]),
    pauseForNewBible: ref(false), chatKeyOf: () => ({}) as never, autoPool: () => [] as never, ensureAnalysis: async () => null,
    releaseAsrTicket: async () => {},
    ensureChatTicket: () => (switched ??= new Promise((r) => setTimeout(r, 50))),
    setReviewHold: () => {}, publish: () => {}, progress: () => {}, say: (message) => { glossaryNotices.push(message); }, onWait: () => {},
  });
  await translateRemaining(() => true);
  const sent = calls.flat();
  assert.equal(sent.length, new Set(sent).size, `câu bị gửi trùng: ${JSON.stringify(calls)}`);
  assert.ok(segs.every((s) => s.translation?.startsWith("dịch")));
  assert.equal(glossaryLoads, 2, "R7-003: retry glossary once, shared between workers");
  assert.equal(glossaryNotices.filter((text) => text.includes("thuật ngữ")).length, 1, "R7-003: warn once when glossary unavailable");
});
