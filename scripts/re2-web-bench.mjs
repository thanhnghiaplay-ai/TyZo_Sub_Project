import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
const origin='http://127.0.0.1:8081';
const reports=[];
for(const concurrency of [1,5,25,50,100,200,300]){
 const times=[];const statuses={};let bytes=0;
 const start=performance.now();
 await Promise.all(Array.from({length:concurrency},async()=>{
  const t=performance.now();const r=await fetch(origin+'/gioi-thieu',{signal:AbortSignal.timeout(30000)});const text=await r.text();
  assert.ok(text.includes('TyZo'));statuses[r.status]=(statuses[r.status]??0)+1;bytes+=Buffer.byteLength(text);times.push(performance.now()-t);
 }));
 times.sort((a,b)=>a-b);const q=p=>Number(times[Math.min(times.length-1,Math.ceil(times.length*p)-1)].toFixed(2));
 const row={concurrency,p50Ms:q(.5),p95Ms:q(.95),p99Ms:q(.99),statuses,totalBytes:bytes,elapsedMs:Number((performance.now()-start).toFixed(2)),target:'local production-build public SSR, not browser sessions'};
 reports.push(row);console.log(JSON.stringify(row));assert.equal(statuses[200],concurrency);
}
writeFileSync('/workspace/tyzo-results/evidence/web-load-results.json',JSON.stringify(reports,null,2));
