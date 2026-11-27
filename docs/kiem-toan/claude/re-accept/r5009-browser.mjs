import { createRequire } from "node:module"; const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync } from "node:fs";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://127.0.0.1:17750/login");
await p.addScriptTag({ content: readFileSync(process.argv[2], "utf8") });
const r = await p.evaluate(async () => {
  const mk = (owner, key, n) => ({ key, source: "s", ownerId: owner, at: Date.now() + n, segs: [{ i: n }] , settings:{} });
  // 1) resolve only after commit: a fresh connection must see the row the moment storeSaved resolves
  const order = [];
  const origTx = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (...a) { const t = origTx.apply(this, a); t.addEventListener("complete", () => order.push("complete")); return t; };
  await SR.storeSaved(mk("fixture-a", "k1", 1)); order.push("resolved");
  IDBDatabase.prototype.transaction = origTx;
  const own = await SR.loadSaved("fixture-a", "k1");
  const other = await SR.loadSaved("fixture-b", "k1");
  // 2) abort keeps previous value
  const origPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...a) { const q = origPut.apply(this, a); this.transaction.abort(); return q; };
  await SR.storeSaved(mk("fixture-a", "k1", 2));
  IDBObjectStore.prototype.put = origPut;
  const after = await SR.loadSaved("fixture-a", "k1");
  return { firstCompleteBeforeResolve: order.indexOf("complete") > -1 && order.indexOf("complete") < order.indexOf("resolved"), order, own: own?.segs?.[0]?.i ?? null, other, abortPreserved: after?.segs?.[0]?.i === 1 };
});
console.log(JSON.stringify({ audit: "R5-009", ...r, browser: b.version() }));
await b.close();
