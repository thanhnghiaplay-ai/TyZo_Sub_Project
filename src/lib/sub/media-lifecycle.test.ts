import assert from "node:assert/strict";
import { test } from "node:test";
import { waitForMetadata } from "../../components/pipeline-media.ts";
import { xhrPutSend } from "./r2-put.ts";
import { tyzoAsr } from "../providers/tyzo.ts";

test("R6-002: metadata waiter times out and can be canceled before/after waiting", async () => {
  const media=Object.assign(new EventTarget(),{readyState:0}) as unknown as HTMLVideoElement;
  await assert.rejects(waitForMetadata(media,5),/30 giây/);
  const abort=new AbortController();const waiting=waitForMetadata(media,1000,abort.signal);abort.abort();
  await assert.rejects(waiting,{name:'AbortError'});
  await assert.rejects(waitForMetadata(media,1000,abort.signal),{name:'AbortError'});
});

test("R6-005: stalled PUT is retryable while user cancel remains AbortError", async () => {
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'XMLHttpRequest');
  class Xhr {
    upload={onprogress:null};onload: null|(()=>void)=null;onerror: null|(()=>void)=null;onabort: null|(()=>void)=null;status=0;
    open(){} setRequestHeader(){} send(){} abort(){this.onabort?.();}
  }
  Object.defineProperty(globalThis,'XMLHttpRequest',{configurable:true,value:Xhr});
  try {
    assert.deepEqual(await xhrPutSend('http://fixture.test',new Blob(['synthetic']),'audio/wav',undefined,5)(()=>{}),{status:0});
    const abort=new AbortController();const waiting=xhrPutSend('http://fixture.test',new Blob(['synthetic']),'audio/wav',abort.signal,1000)(()=>{});abort.abort();
    await assert.rejects(waiting,{name:'AbortError'});
  } finally {if(descriptor)Object.defineProperty(globalThis,'XMLHttpRequest',descriptor);else Reflect.deleteProperty(globalThis,'XMLHttpRequest');}
});

test("R6-009: aborting FileReader stops TyZo encoding before any Modal request", async () => {
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'FileReader');let stopped=0;
  class Reader {
    onload:null|(()=>void)=null;onerror:null|(()=>void)=null;onabort:null|(()=>void)=null;
    readAsDataURL(){} abort(){stopped++;this.onabort?.();}
  }
  Object.defineProperty(globalThis,'FileReader',{configurable:true,value:Reader});
  try {
    const controller=new AbortController();
    const waiting=tyzoAsr.transcribe({key:'room',ticket:'synthetic-ticket',packed:{blob:new Blob(['synthetic'])},signal:controller.signal,model:'tyzo-modal-nhanh'} as Parameters<typeof tyzoAsr.transcribe>[0]);
    controller.abort();await assert.rejects(waiting,{name:'AbortError'});assert.equal(stopped,1);
  } finally {if(descriptor)Object.defineProperty(globalThis,'FileReader',descriptor);else Reflect.deleteProperty(globalThis,'FileReader');}
});
