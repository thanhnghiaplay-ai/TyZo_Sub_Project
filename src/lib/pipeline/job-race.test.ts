import { startJobOnce } from "./job.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyJob, commitDecodedJob } from "./job.ts";

test("R6-001: late A decode cannot overwrite the edited/current run B", async () => {
  const job=emptyJob();job.runId=1;
  let complete!: (value:Float32Array)=>void;
  const old=new Promise<Float32Array>((r)=>{complete=r;}).then((pcm)=>commitDecodedJob(job,1,pcm,'A'));
  job.runId=2;const current=new Float32Array([2]);
  assert.equal(commitDecodedJob(job,2,current,'B'),true);
  complete(new Float32Array([1]));
  assert.equal(await old,false);assert.equal(job.pcm,current);assert.equal(job.pcmId,'B');
});


test("hai lần bấm chỉ mở một phiếu và có thể tiếp tục sau lỗi", async () => {
  const gate = { current: false };
  let calls = 0;
  let fail!: (error: Error) => void;
  const pending = startJobOnce(gate, async () => {
    calls++;
    await new Promise<void>((_, reject) => { fail = reject; });
  });
  await startJobOnce(gate, async () => { calls++; });
  assert.equal(calls, 1);
  fail(new Error("lỗi giả lập"));
  await assert.rejects(pending, /lỗi giả lập/);
  await startJobOnce(gate, async () => { calls++; });
  assert.equal(calls, 2);
});
