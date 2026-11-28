/**
 * Kiểm toán v5.49 SPLIT-008: nhiều luồng dịch không được nhận cùng một lô câu trong lúc chờ đổi phiếu.
 * Chạy: node --experimental-strip-types --experimental-test-module-mocks --import ./scripts/register-ts.mjs --test <tệp>
 */
import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { PaidRoomCallError } from "../sub/http-deadline.ts";

const calls: string[][] = [];
let paidFixture: ((texts: string[]) => Promise<string[]>) | undefined;
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
      if (paidFixture) return paidFixture(texts);
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


test("dịch trả theo lượt: lỗi một lô dừng gửi thêm, giữ kết quả của lô đã gửi", async () => {
  const { createTranslator } = await import("./translate.ts");
  calls.length = 0;
  const segs = Array.from({ length: 24 }, (_, i) => ({ original: `câu ${i}`, translation: null as string | null, start: i, end: i + 1, busy: false }));
  const j = { segs, runId: 1, uses: {}, cooling: new Map(), blocked: new Set(), gate: { blockedUntil: 0 } } as never;
  const ref = <T,>(current: T) => ({ current });
  let secondStarted!: () => void;
  let finishSecond!: () => void;
  const second = new Promise<void>((resolve) => { secondStarted = resolve; });
  const finish = new Promise<void>((resolve) => { finishSecond = resolve; });
  paidFixture = async (texts) => {
    if (texts[0] === "câu 0") {
      await second;
      throw new PaidRoomCallError("Phiếu không đủ phần giữ.");
    }
    secondStarted();
    await finish;
    return texts.map((t) => `dịch ${t}`);
  };
  try {
    const { translateRemaining } = createTranslator({
      j, my: 1, signal: new AbortController().signal, source: "ja", target: "vi", mode: "auto", chosen: "m", genre: "", gloss: "",
      title: "", notes: "", extra: "", profile: "can-bang" as never, allowEnterprise: false, baseGloss: false, threads: 2, modelSig: "auto",
      ticket: () => "t", ticketPart: () => "chat", preRef: ref(false), reviewRef: ref(false), roomPayRef: ref(true), userTermsRef: ref([]),
      pauseForNewBible: ref(false), chatKeyOf: () => ({}) as never, autoPool: () => new Set(["openai/gpt-oss-120b"]), ensureAnalysis: async () => null,
      releaseAsrTicket: async () => {}, ensureChatTicket: async () => {},
      setReviewHold: () => {}, publish: () => {}, progress: () => {}, say: () => {}, onWait: () => {},
    });
    let reported = false;
    const result = assert.rejects(translateRemaining(() => true), /Phiếu không đủ phần giữ/).then(() => { reported = true; });
    await second;
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(reported, false, "chưa được đóng phiếu trong lúc lô khác còn kết quả đang về");
    finishSecond();
    await result;
    assert.deepEqual(calls.map((group) => group[0]), ["câu 0", "câu 8"]);
    assert.ok(segs.slice(8, 16).every((seg) => seg.translation?.startsWith("dịch")));
    assert.ok(segs.slice(16).every((seg) => seg.translation === null && !seg.busy));
  } finally {
    paidFixture = undefined;
  }
});
