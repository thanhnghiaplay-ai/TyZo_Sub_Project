import assert from "node:assert/strict";
import { test } from "node:test";
import { readMp4Range } from "./mp4-range.ts";
import { openMp4 } from "./mp4.ts";

test("R6-004: same-sized wrong range and changed total are rejected", async () => {
  for (const range of ["bytes 1-4/100", "bytes 0-3/101", "bytes 0-3/*", ""]) {
    await assert.rejects(readMp4Range(new Response(new Uint8Array(4), { status: 206, headers: { "content-range": range } }),0,4,100),/Content-Range/);
  }
  assert.equal((await readMp4Range(new Response(new Uint8Array([1,2,3,4]),{status:206,headers:{"content-range":"bytes 0-3/100"}}),0,4,100))[3],4);
});
test("R6-004: oversized streamed body is canceled before all chunks are consumed", async () => {
  let pulled=0;let canceled=false;
  const stream=new ReadableStream<Uint8Array>({pull(c){pulled++;c.enqueue(new Uint8Array(8));},cancel(){canceled=true;}},{highWaterMark:0});
  await assert.rejects(readMp4Range(new Response(stream,{status:206,headers:{"content-range":"bytes 0-3/100"}}),0,4,100),/vượt/);
  assert.ok(canceled);assert.ok(pulled<=2);
});

function concat(...parts:Uint8Array[]):Uint8Array { const out=new Uint8Array(parts.reduce((sum,p)=>sum+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out; }
function u32(...values:number[]) { const b=new Uint8Array(values.length*4);const v=new DataView(b.buffer);values.forEach((n,i)=>v.setUint32(i*4,n));return b; }
function box(tag:string,...parts:Uint8Array[]) { const body=concat(...parts);return concat(u32(body.length+8),new TextEncoder().encode(tag),body); }
function badMp4(count:number) {
  const entry=box('mp4a',new Uint8Array(28),box('esds',u32(0),new Uint8Array([5,2,0x12,0x10])));
  const samples=box('stbl',box('stsd',u32(0,1),entry),box('stts',u32(0,0)),box('stsz',u32(0,0,count)),box('stsc',u32(0,0)),box('stco',u32(0,0)));
  return box('moov',box('trak',box('mdia',box('hdlr',u32(0,0),new TextEncoder().encode('soun')),box('mdhd',u32(0,0,0,48000,1024)),box('minf',samples))));
}
test("R6-003: corrupt AAC sample count/truncated table fail before allocating sample arrays", async () => {
  for(const count of [20_000_001,500]){
    const data=badMp4(count);
    await assert.rejects(openMp4(async(a,b)=>data.slice(a,b),data.length,1024),/bảng mẫu MP4 không hợp lệ/);
  }
});
