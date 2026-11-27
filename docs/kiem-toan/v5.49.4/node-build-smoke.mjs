// Smoke bản dựng Node (NITRO_PRESET=node-server) bằng Chromium cài sẵn: máy tính + điện thoại, đếm lỗi console, chụp ảnh.
import { chromium } from "playwright";
const [base, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const res = [];
for (const [name, viewport] of [["desktop", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  for (const path of ["/gioi-thieu", "/login"]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
    const r = await page.goto(base + path, { waitUntil: "networkidle" });
    const text = (await page.locator("body").innerText()).trim().length;
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const shot = `${out}/node-build-${name}${path.replace(/\//g, "-")}.png`;
    await page.screenshot({ path: shot });
    res.push({ name, path, status: r?.status(), bodyChars: text, overflow, appErrors: errors.filter((e) => !/ERR_NAME_NOT_RESOLVED|grok\.com/.test(e)), externalBlocked: errors.filter((e) => /ERR_NAME_NOT_RESOLVED|grok\.com/.test(e)).length });
    await ctx.close();
  }
}
await browser.close();
console.log(JSON.stringify(res, null, 1));
process.exit(res.every((r) => r.status === 200 && r.bodyChars > 50 && !r.overflow && r.appErrors.length === 0) ? 0 : 1);
