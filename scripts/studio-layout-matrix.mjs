#!/usr/bin/env node
/**
 * Đo khung phòng chiếu ở nhiều cỡ màn hình bằng CSS đã build, rồi thoát 1 nếu có
 * khung chồng nhau, bị cắt, quá thấp, méo tỉ lệ hình hoặc tràn ngang.
 *
 * Cách chạy: `npx vite build && node scripts/studio-layout-matrix.mjs`
 * Tùy chọn: `node scripts/studio-layout-matrix.mjs đường/dẫn/styles.css`
 *
 * Khung HTML ở dưới mô phỏng cấu trúc trong src/components/studio.tsx, nên đổi
 * cấu trúc đó (thêm hoặc bỏ lớp bọc) thì sửa cả ở đây.
 */
import { chromium } from "playwright";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const VIEWPORTS = [
  [320, 568], [360, 640], [390, 844], [430, 932],
  [568, 320], [667, 375], [844, 390], [932, 430],
  [700, 1000], [768, 1024], [820, 1180],
  [1024, 600], [1024, 768], [1180, 820], [1280, 650], [1280, 700], [1280, 720],
  [1366, 768], [1440, 900], [1920, 1080],
];

function findCss(arg) {
  if (arg) return arg;
  const dir = join(fileURLToPath(new URL("..", import.meta.url)), ".vercel/output/static/assets");
  const file = existsSync(dir) ? readdirSync(dir).find((name) => /^styles-.*\.css$/.test(name)) : undefined;
  if (!file) throw new Error("Chưa có CSS đã build. Chạy `npx vite build` trước.");
  return join(dir, file);
}

export function pageHtml(css, sheetOpen) {
  const cues = Array.from({ length: 30 }, (_, i) => `<div class="grid grid-cols-[1fr_auto] gap-2 border-b border-line py-3"><button class="grid gap-1 text-left"><span class="text-xs">0:${String(i).padStart(2, "0")}</span><span class="font-medium">Câu dịch số ${i} khá dài để thử xuống dòng trên màn hình hẹp</span><span class="text-sm">Original ${i}</span></button><div class="grid gap-2"><button class="min-tap rounded-full border px-3 text-sm">Sửa</button><button class="min-tap rounded-full border px-3 text-sm">Đổi giọng</button></div></div>`).join("");
  const fields = Array.from({ length: 14 }, (_, i) => `<label class="grid gap-1 text-sm">Trường ${i}<input class="min-tap rounded-xl border px-3"/></label>`).join("");
  const tabs = ["Key Sub", "Phim", "Nhân vật", "Nghe", "Kiểm tra"].map((t) => `<button class="min-tap shrink-0 rounded-full border px-4 text-sm">${t}</button>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>${css}</style></head><body><div id="root"><main class="studio-shell">
<header class="grid shrink-0 gap-1"><div class="flex items-start justify-between gap-2"><p class="text-xs font-semibold">Phòng chiếu TyZo Sub</p><span>v3.10.2 🔔</span></div><h1 class="text-xl font-semibold">Phụ đề video</h1><p class="text-sm">Mô tả ngắn của phòng chiếu.</p></header>
<nav class="room-nav"><button class="min-tap rounded-full border px-4 text-sm">Tài khoản</button></nav>
<div class="flex shrink-0 flex-wrap items-center gap-2"><button class="min-tap rounded-xl border px-3 text-sm">Chọn video</button><button class="min-tap rounded-xl border px-3 text-sm">Xuất SRT</button><button class="min-tap rounded-xl px-3 text-sm">Tải và dịch</button></div>
<div role="tablist" class="studio-tabs">${tabs}</div>
<div class="studio-stage${sheetOpen ? " is-sheet" : ""}"><section class="studio-workspace"><div class="studio-video"><div class="player-stack"><div class="relative aspect-video rounded-2xl bg-black"></div><p class="gesture-hint">Kéo ngang để tua. Kéo dọc bên phải chỉnh tiếng, bên trái chỉnh sáng. Chạm đúp hai mé để nhảy.</p></div></div>
<section class="studio-cues grid gap-2 rounded-2xl border p-4"><h2 class="font-semibold">Bản dịch</h2><p class="text-sm">Chạm một câu để tua.</p><div class="studio-cue-scroll">${cues}</div></section></section>
<div class="studio-tools${sheetOpen ? " is-open" : ""}"><div class="studio-tool-card"><div class="studio-sheet-bar"><button class="studio-sheet-close">X</button></div><section class="grid gap-3 p-4">${fields}</section></div></div></div>
</main></div></body></html>`;
}

const MEASURE = () => {
  const box = (selector) => {
    const el = document.querySelector(selector);
    if (!el || getComputedStyle(el).display === "none") return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right };
  };
  const shell = document.querySelector(".studio-shell");
  const sr = shell.getBoundingClientRect();
  return {
    shell: { top: sr.top, bottom: sr.bottom, scrolls: shell.scrollHeight > shell.clientHeight + 1 },
    video: box(".studio-video"),
    player: box(".aspect-video"),
    cues: box(".studio-cues"),
    tools: box(".studio-tools"),
    xOverflow: document.documentElement.scrollWidth > innerWidth,
  };
};

const hit = (a, b) => a && b && a.x < b.r - 1 && b.x < a.r - 1 && a.y < b.b - 1 && b.y < a.b - 1;

/** @returns {string[]} */
export function problems(m, mode, shellViewport) {
  const out = [];
  const [w, h] = shellViewport;
  if (hit(m.video, m.cues)) out.push("video chồng bản dịch");
  if (hit(m.video, m.tools)) out.push("video chồng công cụ");
  if (hit(m.cues, m.tools)) out.push("bản dịch chồng công cụ");
  if (m.xOverflow) out.push("tràn ngang");
  if (m.player) {
    if (m.player.h < 70) out.push(`video quá thấp (${Math.round(m.player.h)}px)`);
    const ratio = m.player.w / m.player.h;
    if (Math.abs(ratio - 16 / 9) > 0.04) out.push(`video méo tỉ lệ (${ratio.toFixed(2)})`);
  }
  if (m.cues && m.cues.h < 90) out.push(`bản dịch quá thấp (${Math.round(m.cues.h)}px)`);
  if (mode === "open" && m.tools && m.tools.h < 100) out.push(`công cụ quá thấp (${Math.round(m.tools.h)}px)`);
  if (m.shell.scrolls === false) {
    for (const [name, box] of [["video", m.video], ["bản dịch", m.cues], ["công cụ", m.tools]]) {
      if (box && (box.b > h + 1 || box.r > w + 1)) out.push(`${name} bị cắt khỏi màn hình`);
    }
  }
  return out;
}

async function main() {
  const css = readFileSync(findCss(process.argv[2]), "utf8");
  // CHROMIUM_PATH: dùng Chromium có sẵn khi bản Playwright của dự án chưa tải trình duyệt của nó.
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  let bad = 0;
  for (const mode of ["closed", "open"]) {
    for (const [w, h] of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.setContent(pageHtml(css, mode === "open"));
      const m = await page.evaluate(MEASURE);
      await page.close();
      const list = problems(m, mode, [w, h]);
      if (list.length) bad += 1;
      const fmt = (b) => (b ? `${Math.round(b.w)}x${Math.round(b.h)}` : "-");
      console.log(`${list.length ? "LỖI " : "ok   "} ${mode.padEnd(6)} ${w}x${h}  video=${fmt(m.player)} bản dịch=${fmt(m.cues)} công cụ=${fmt(m.tools)}${m.shell.scrolls ? " (khung cuộn)" : ""}${list.length ? "  <- " + list.join("; ") : ""}`);
    }
  }
  await browser.close();
  console.log(bad ? `\n${bad} cỡ màn hình có lỗi.` : "\nTất cả cỡ màn hình đạt.");
  process.exit(bad ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
