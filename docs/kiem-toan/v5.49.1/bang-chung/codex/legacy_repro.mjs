import ts from '/workspace/TyZo_Sub_Project/node_modules/typescript/lib/typescript.js';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root='/workspace/TyZo-ccr-9f1afcc8-iv7067';
const original=(file)=>execFileSync('git',['show','d5a2fed:src/'+file],{cwd:root,encoding:'utf8'});
const load=async(code)=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const id=process.argv[2];
if(id==='R3-008') {
 const source=original('lib/app-link.server.ts');const body=source.slice(source.indexOf('export function callerIp()'),source.indexOf('/** Gỡ mọi máy'));
 const request=new Request('http://fixture.test',{headers:{'cf-connecting-ip':'203.0.113.7','x-forwarded-for':'198.51.100.99'}});
 const m=await load('const getRequest=()=>globalThis.fixtureRequest;'+body);globalThis.fixtureRequest=request;
 const observed=m.callerIp();console.log('legacy observed IP',observed,'expected trusted tunnel IP 203.0.113.7');assert.equal(observed,'203.0.113.7');
}
if(id==='R7-001') {
 const src=original('lib/sub/polish.ts');const token=src.match(/const TOKEN_RE =[^\n]+/)[0];const funcs=src.slice(src.indexOf('function tokensOf'),src.indexOf('const SPLITTABLE'));
 const refusal=src.match(/const REFUSAL_RE =[^\n]+/)[0];const m=await load(token+refusal+funcs);
 const result=m.judgePolished('Tôi không nợ 12 đô.','Tôi nợ 120 đô.');console.log('legacy changed facts accepted:',result);assert.equal(result.status,'failed');
}
if(id==='R8-004') {
 const m=await load(original('lib/stale-build.ts'));const mem=new Map();const store={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};
 const observed=m.claimAutoReload(store,1000000,true);console.log('legacy reload while task active:',observed);assert.equal(observed,false);
}
if(id==='R7-006') {
 const src=original('lib/sub/narration.ts');const fn=src.slice(src.indexOf('function playUrl('),src.indexOf('function base64ToBlob'));
 const m=await load('const fitBoost=()=>1;export '+fn);const audio={src:'',volume:0,playbackRate:1,play:async()=>{},pause:()=>{}};
 const pending=m.playUrl(audio,'fixture',{volume:0,rate:1,followPlayback:false},1,()=>{});audio.pause();audio.src='';
 const result=await Promise.race([pending.then(()=>true,()=>true),new Promise(r=>setTimeout(()=>r(false),30))]);console.log('legacy stopped waiter settled:',result);assert.equal(result,true);
}
