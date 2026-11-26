import assert from "node:assert/strict";
import { mock,test } from "node:test";
import { emptyJob } from "./job.ts";
let reads=0;
mock.module("../providers/index.ts",{namedExports:{asrRunnerOf:()=>({}),transcribe:async()=>{reads++;return {language:'zh',segments:[{text:'fixture',start:0,end:1}]};}}});

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
