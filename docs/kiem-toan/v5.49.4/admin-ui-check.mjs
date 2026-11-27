import { chromium } from "playwright";
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
for (const [name, viewport, scheme] of [["desktop-light", { width: 1280, height: 900 }, "light"], ["mobile-dark", { width: 390, height: 844 }, "dark"]]) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  const r = await page.request.post("http://127.0.0.1:8080/api/auth/sign-in/email", { data: { email: "chu@fixture.test", password: "Fixture-Only-Pass-9182" }, headers: { origin: "http://127.0.0.1:8080" } });
  await page.goto("http://127.0.0.1:8080/admin", { waitUntil: "networkidle" });
  // Admin → Dịch vụ → Cấu hình → trang mặc định «Trạng thái» (bảng sức chứa).
  if (viewport.width < 700) {
    await page.getByRole("button", { name: /Dịch vụ/ }).last().click().catch(() => {});
  } else {
    await page.getByText("Dịch vụ", { exact: false }).first().click().catch(() => {});
    await page.waitForTimeout(400);
    await page.getByText("Cấu hình", { exact: true }).first().click().catch(() => {});
  }
  await page.getByText("Công việc mất nhịp đang giữ chỗ").waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const before = await page.getByText(/Mã [0-9a-f]{24}/).count();
  const more = page.getByRole("button", { name: "Xem thêm hồ sơ" });
  const hasMore = await more.count();
  if (hasMore) { await more.click(); await page.waitForTimeout(1500); }
  const after = await page.getByText(/Mã [0-9a-f]{24}/).count();
  const alert = await page.getByRole("alert").filter({ hasText: "Việc chưa rõ" }).count();
  const shown = await page.getByText(/Đang hiện \d+\/\s*\d+ hồ sơ/).allTextContents();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const sec = page.getByText("Công việc mất nhịp đang giữ chỗ");
  if (await sec.count()) await sec.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/re3-006-admin-${name}.png`, fullPage: false });
  results.push({ name, signIn: r.status(), url: page.url(), before, hasMore, after, alert, shown, overflow, errors });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 1));
