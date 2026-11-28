import assert from "node:assert/strict";
import { mock,test } from "node:test";
import { emptyJob } from "./job.ts";
let reads=0;
let fixtureTranscribe: ((tag: number) => Promise<{ language: string; segments: { text: string; start: number; end: number }[] }>) | undefined;
mock.module("../providers/index.ts", { namedExports: {
  asrRunnerOf: () => ({ id: "tyzo-modal", intake: "chunks", parallel: 2 }),
  transcribe: async (packed: { tag?: number }) => {
    reads++;
    if (fixtureTranscribe && packed.tag !== undefined) return fixtureTranscribe(packed.tag);
    return { language: "zh", segments: [{ text: "fixture", start: 0, end: 1 }] };
  },
} });
mock.module("../sub/vad.ts", { namedExports: {
  gateChunk: async (samples: Float32Array) => ({ samples, offset: 0 }),
} });
mock.module("../sub/codec.ts", { namedExports: {
  audioBufferTo16k: () => assert.fail("fixture uses predecoded PCM"),
  packAudio: async (samples: Float32Array) => ({ blob: new Blob(), tag: samples[0] }),
} });

test("R6-008: old language-check response cannot alter new run's cost/events after trial await",async()=>{
  const {createRecognizer}=await import('./recognize.ts');const job=emptyJob();job.runId=1;
  const check=createRecognizer({j:job,my:1,signal:new AbortController().signal,source:'zh',asrModel:'whisper-large-v3-turbo',
    audioContext: {} as AudioContext,token:'fixture',title:'',gloss:'',genre:'',threads:1,
    vad:()=>false,lineLocks:()=>({}),onWait:()=>{},publish:()=>{},progress:()=>{},say:()=>{},warnVad:()=>{},applyReady:()=>{},setHeardLang:()=>{},
    langCheck:()=>true,ensureTrial:async()=>{job.runId=2;job.asrCost=123;job.langEvents=[];},asrUsd:()=>1,ticket:()=>null,
  } as Parameters<typeof createRecognizer>[0]);
  await check.checkLanguage({language:'en',segments:[{text:'This synthetic sentence uses the wrong script',start:0,end:1}]},{blob:new Blob(['synthetic'])} as Parameters<typeof check.checkLanguage>[1],10,0,0);
  assert.equal(reads,1);assert.equal(job.asrCost,123);assert.deepEqual(job.langEvents,[]);
});


test("R6-008: obsolete language check cannot even alter suspicion or retry budget",async()=>{
  const {createRecognizer}=await import('./recognize.ts');const job=emptyJob();job.runId=2;
  const before=reads;
  const check=createRecognizer({j:job,my:1,signal:new AbortController().signal,source:'zh',langCheck:()=>true} as unknown as Parameters<typeof createRecognizer>[0]);
  const res={language:'en',segments:[{text:'This synthetic sentence uses the wrong script',start:0,end:1}]};
  await check.checkLanguage(res,{blob:new Blob(['synthetic'])} as Parameters<typeof check.checkLanguage>[1],10,0,0);
  assert.equal(reads,before);assert.equal(job.langSuspect,0);assert.equal(job.langRetryUsed,0);
});


test("Modal: chờ đoạn đang gửi rồi tiếp tục từ đệm, không gửi lại đoạn đã nhận", async () => {
  const { createRecognizer } = await import("./recognize.ts");
  const job = emptyJob();
  job.runId = 1;
  job.parts = Array.from({ length: 6 }, (_, i) => [i, i + 1]);
  job.pcm = Float32Array.from([0, 1, 2, 3, 4, 5]);
  const submitted: number[] = [];
  let allowCompletion!: () => void;
  const pending = new Promise<void>((resolve) => { allowCompletion = resolve; });
  let failFirst!: () => void;
  const fail = new Promise<void>((resolve) => { failFirst = resolve; });
  let secondStarted!: () => void;
  const second = new Promise<void>((resolve) => { secondStarted = resolve; });
  let resuming = false;
  fixtureTranscribe = async (tag) => {
    submitted.push(tag);
    if (!resuming && tag === 0) {
      await fail;
      throw new Error("409 fixture");
    }
    if (!resuming && tag === 1) {
      secondStarted();
      await pending;
    }
    return { language: "ja", segments: [{ text: "fixture", start: 0, end: 1 }] };
  };
  const ctx = {
    j: job, my: 1, signal: new AbortController().signal, source: "ja", asrModel: "tyzo-modal-nhanh",
    audioContext: {} as AudioContext, token: "room", title: "", gloss: "", genre: "", threads: 2,
    vad: () => false, lineLocks: () => ({}), onWait: () => {}, publish: () => {}, progress: () => {},
    say: () => {}, warnVad: () => {}, setHeardLang: () => {}, langCheck: () => false,
    ensureTrial: async () => {}, asrUsd: () => 0, ticket: () => "fixture",
    applyReady: () => { while (job.asrBuf.delete(job.nextPart)) job.nextPart++; },
  } as Parameters<typeof createRecognizer>[0];
  try {
    const rejected = assert.rejects(createRecognizer(ctx).transcribeRemaining(), /409 fixture/);
    await second;
    failFirst();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(job.nextPart, 0);
    allowCompletion();
    await rejected;
    assert.deepEqual(submitted, [0, 1]);
    assert.equal(job.asrBuf.has(1), true);
    resuming = true;
    await createRecognizer(ctx).transcribeRemaining();
    assert.equal(job.nextPart, 6);
    assert.deepEqual(submitted, [0, 1, 0, 2, 3, 4, 5]);
  } finally {
    fixtureTranscribe = undefined;
  }
});
