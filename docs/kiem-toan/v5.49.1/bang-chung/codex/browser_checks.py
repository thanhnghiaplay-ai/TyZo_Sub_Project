import json,pathlib,threading,functools
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).parent
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'browser')))
threading.Thread(target=server.serve_forever,daemon=True).start()
result={'fixture_origin_only':True,'business_services_called':False,'checks':[]}
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,chromium_sandbox=True)
  context=browser.new_context(service_workers='block')
  page=context.new_page();page.goto(f'http://127.0.0.1:{server.server_port}/')
  report=page.evaluate('''async () => {
    const saved=await import('/saved-runs.mjs');
    const original={key:'same-file',ownerId:'A',at:new Date().toISOString(),fileName:'synthetic.wav',source:'zh',target:'vi',bible:null,segs:[{start:0,end:1,original:'synthetic',translation:'edited subtitle',edited:true}]};
    await saved.storeSaved(original);
    if(await saved.loadSaved('B','same-file')!==null) throw Error('cross-account read');
    if(await saved.loadSaved('','same-file')!==null) throw Error('anonymous read');
    await saved.storeSaved({...original,ownerId:'B',segs:[{...original.segs[0],translation:'B subtitle'}]});
    await saved.dropSaved('B','same-file');
    const a=await saved.loadSaved('A','same-file');
    if(a.segs[0].translation!=='edited subtitle'||!a.segs[0].edited) throw Error('owner isolation/edited data lost');
    const legacy=await new Promise((resolve,reject)=>{const r=indexedDB.open('tyzo-saved-runs',1);r.onupgradeneeded=()=>r.result.createObjectStore('runs',{keyPath:'key'});r.onerror=reject;r.onsuccess=()=>resolve(r.result)});
    await new Promise((resolve,reject)=>{const t=legacy.transaction('runs','readwrite');t.objectStore('runs').put({...original,key:'legacy',ownerId:undefined});t.oncomplete=resolve;t.onerror=reject});legacy.close();
    if(await saved.loadSaved('A','legacy')!==null) throw Error('legacy wrongly assigned');
    // Transaction abort after request success must not leave a readable record.
    const originalPut=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(value){const req=originalPut.call(this,value);req.addEventListener('success',()=>this.transaction.abort());return req};
    try{await saved.storeSaved({...original,key:'aborted'})}finally{IDBObjectStore.prototype.put=originalPut}
    if(await saved.loadSaved('A','aborted')!==null) throw Error('aborted write persisted');
    const playback=await import('/audio-playback.mjs');
    const audio=new Audio();let advanced=0;const settings={volume:0,rate:1,followPlayback:false};
    const data=new Uint8Array(44+16000*2*20);const view=new DataView(data.buffer);
    const str=(at,text)=>[...text].forEach((c,i)=>view.setUint8(at+i,c.charCodeAt(0)));
    str(0,'RIFF');view.setUint32(4,data.length-8,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,data.length-44,true);
    const url=URL.createObjectURL(new Blob([data],{type:'audio/wav'}));
    const pending=playback.playAudio(audio,url,settings,1,()=>advanced++);
    pending.catch(()=>{});
    playback.cancelAudioPlayback(audio);audio.pause();audio.src='';
    await Promise.race([pending,new Promise((_,reject)=>setTimeout(()=>reject(Error('stop promise hung')),1000))]);
    if(advanced!==0)throw Error('old queue advanced');URL.revokeObjectURL(url);
    return ['R5-008: real IndexedDB account A/B/anonymous isolation and edited subtitles preserved','R5-009: aborted transaction did not persist','R7-006: native Audio cancellation settles without advancing old queue'];
  }''')
  result['checks'].extend(report)
  page.reload()
  assert page.evaluate("async()=>{const s=await import('/saved-runs.mjs');return (await s.loadSaved('A','same-file')).segs[0].translation}")=='edited subtitle'
  result['checks'].append('R5-008: owner A survives actual page reload')
  browser.close()
 result['status']='PASS'
except Exception as error:
 result.update(status='FAIL',error=str(error))
finally:
 server.shutdown();(ROOT/'browser-checks.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
raise SystemExit(0 if result['status']=='PASS' else 1)
