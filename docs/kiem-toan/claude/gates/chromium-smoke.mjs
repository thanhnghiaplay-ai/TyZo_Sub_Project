import { createRequire } from "node:module"; const { chromium } = createRequire(import.meta.url)("playwright");
const b = await chromium.launch(); const out = [];
for (const [name, vp] of [["desktop", { width: 1280, height: 800 }], ["mobile", { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp }); const errs = [];
  p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  for (const path of ["/gioi-thieu", "/login"]) {
    const r = await p.goto("http://127.0.0.1:17750" + path, { waitUntil: "networkidle" }).catch((e) => ({ status: () => String(e) }));
    const info = await p.evaluate(() => ({ text: document.body.innerText.length, overflow: document.documentElement.scrollWidth > innerWidth, css: [...document.styleSheets].some((s) => { try { return s.cssRules.length > 50; } catch { return false; } }) }));
    await p.screenshot({ path: `./shot-${name}${path.replace("/", "-")}.png` });
    out.push({ name, path, status: r.status(), ...info, errors: errs.filter((e) => !/fonts\.googleapis|grok\.com|ERR_/.test(e)).slice(0, 3) });
  }
  const api = await p.request.get("http://127.0.0.1:17750/api/app-me"); out.push({ name, path: "/api/app-me", withoutDevice: api.status() });
}
console.log(out.map((o) => JSON.stringify(o)).join("\n")); await b.close();
