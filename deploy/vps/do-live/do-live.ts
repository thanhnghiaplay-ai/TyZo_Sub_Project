// Đo Dịch trực tiếp thật: âm thanh → chữ gốc tạm → bản dịch tạm → câu chốt, qua cầu nối thật và Alibaba thật.
// Chạy TRONG container cầu nối (có sẵn LIVE_BRIDGE_SECRET, DATABASE_URL, thư viện) — xem deploy/vps/do-live/chay.sh.
// Gửi 4 đoạn mẫu 30 s (zh/ja/ko/en) theo nhịp thời gian thực 100 ms/khung. Trừ Token của tài khoản được nhập như dùng thật.
// Không in khóa; kết quả JSON không chứa vé hay khóa.
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";
import WebSocket from "ws";
import { signLiveTicket } from "../../../src/lib/live/live-ticket.ts";
import { LIVE_MODEL_38 } from "../../../src/lib/live/live-price.ts";

const [, , email, bridge = "wss://realtimehub.tyzo.site/live", target = "vi"] = process.argv;
const secret = (process.env.LIVE_BRIDGE_SECRET ?? "").trim();
if (!email || !secret || !process.env.DATABASE_URL) {
  console.error("Cách dùng: do-live.ts <email tài khoản> [địa chỉ cầu nối] [đích=vi]; cần LIVE_BRIDGE_SECRET và DATABASE_URL.");
  process.exit(1);
}
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const found = await db.query(`select id from "user" where lower(email) = lower($1)`, [email]);
await db.end();
if (!found.rows.length) { console.error("✘ Không thấy tài khoản có email này."); process.exit(1); }
const uid = String(found.rows[0].id);

const HERE = new URL(".", import.meta.url).pathname;
const pct = (xs: number[], p: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.round((p / 100) * (xs.length - 1)))] : null);
const r1 = (x: number | null | undefined) => (x == null ? null : Math.round(x) / 1000);

/** Mốc có tiếng nói đầu và cuối (năng lượng khung 100 ms vượt ngưỡng), tính bằng ms từ đầu đoạn. */
function speechSpan(pcm: Buffer) {
  const frame = 3200; const rms: number[] = [];
  for (let o = 0; o + frame <= pcm.length; o += frame) {
    let s = 0; for (let i = o; i < o + frame; i += 2) { const v = pcm.readInt16LE(i); s += v * v; }
    rms.push(Math.sqrt(s / (frame / 2)));
  }
  const thr = Math.max(300, (pct(rms, 90) ?? 0) * 0.15);
  const first = rms.findIndex((v) => v > thr); const last = rms.length - 1 - [...rms].reverse().findIndex((v) => v > thr);
  return { onsetMs: Math.max(0, first) * 100, offsetMs: (last + 1) * 100 };
}

async function measure(lang: string) {
  const wav = readFileSync(`${HERE}../do-modal/${lang}.wav`);
  const pcm = wav.subarray(44);
  const { onsetMs, offsetMs } = speechSpan(pcm);
  const ticket = signLiveTicket(secret, { uid, sid: `do${Date.now().toString(36)}${lang}`, model: LIVE_MODEL_38, target, source: "", audio: false, exp: Date.now() + 60_000 });
  return new Promise<Record<string, unknown>>((resolve) => {
    const ws = new WebSocket(`${bridge}?ticket=${ticket}`);
    let t0 = 0; let sentEnd = 0;
    const srcT: number[] = []; const trT: number[] = []; const finals: number[] = []; const errors: string[] = [];
    let usage: unknown = null; let opened = 0; const tOpen = Date.now();
    const done = (why: string) => {
      const gaps = (ts: number[]) => ts.slice(1).map((t, i) => t - ts[i]);
      resolve({
        lang, why, connectMs: opened ? opened - tOpen : null, audioMs: Math.round(pcm.length / 32), onsetMs, offsetMs,
        firstSourcePartial_s: srcT.length ? r1(srcT[0] - onsetMs) : null,
        firstTranslationPartial_s: trT.length ? r1(trT[0] - onsetMs) : null,
        sourceUpdateGap_s: { p50: r1(pct(gaps(srcT), 50)), p95: r1(pct(gaps(srcT), 95)) },
        translationUpdateGap_s: { p50: r1(pct(gaps(trT), 50)), p95: r1(pct(gaps(trT), 95)) },
        finals: finals.length, lastFinalAfterSpeechEnd_s: finals.length ? r1(finals[finals.length - 1] - offsetMs) : null,
        sendEndToClose_s: sentEnd ? r1(Date.now() - t0 - sentEnd) : null, usage, errors,
      });
    };
    const kill = setTimeout(() => { ws.terminate(); done("het-gio"); }, 120_000);
    ws.on("message", (data, isBinary) => {
      if (isBinary) return;
      const m = JSON.parse(data.toString()) as { type: string; event?: { kind: string; final?: boolean; usage?: unknown; message?: string }; message?: string };
      const now = () => Date.now() - t0;
      if (m.type === "ready") {
        opened = Date.now(); t0 = Date.now(); let off = 0;
        const timer = setInterval(() => {
          if (off >= pcm.length) { clearInterval(timer); sentEnd = Date.now() - t0; ws.send(JSON.stringify({ type: "stop" })); return; }
          ws.send(pcm.subarray(off, off + 3200)); off += 3200;
        }, 100);
      } else if (m.type === "event" && m.event) {
        const k = m.event.kind;
        if (k === "source" || k === "source-delta") srcT.push(now());
        if (k === "translation" || k === "translation-delta") { trT.push(now()); if (m.event.final) finals.push(now()); }
        if (k === "usage") usage = m.event.usage;
        if (k === "error") errors.push(String(m.event.message).slice(0, 160));
      } else if (m.type === "error") errors.push(String(m.message).slice(0, 160));
    });
    ws.on("close", (code) => { clearTimeout(kill); done(`dong-${code}`); });
    ws.on("error", (e) => errors.push(String(e).slice(0, 160)));
  });
}

const rows = [];
for (const lang of ["zh", "ja", "ko", "en"]) {
  const r = await measure(lang);
  rows.push(r);
  console.log(`  ${lang}: chữ gốc đầu ${r.firstSourcePartial_s} s · bản dịch đầu ${r.firstTranslationPartial_s} s · câu cuối sau khi hết tiếng ${r.lastFinalAfterSpeechEnd_s} s · câu chốt ${r.finals} · ${(r.errors as string[]).join("; ") || "không lỗi"}`);
  await new Promise((res) => setTimeout(res, 3000));
}
const col = (k: string) => rows.map((r) => r[k] as number | null).filter((x): x is number => x != null);
const summary = {
  bridge, target, model: LIVE_MODEL_38, clips: rows.length,
  firstSourcePartial_s: { p50: pct(col("firstSourcePartial_s"), 50), max: Math.max(...col("firstSourcePartial_s")) },
  firstTranslationPartial_s: { p50: pct(col("firstTranslationPartial_s"), 50), max: Math.max(...col("firstTranslationPartial_s")) },
  lastFinalAfterSpeechEnd_s: { p50: pct(col("lastFinalAfterSpeechEnd_s"), 50), max: Math.max(...col("lastFinalAfterSpeechEnd_s")) },
  errors: rows.flatMap((r) => r.errors as string[]),
};
const out = `/tmp/do-live-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(out, JSON.stringify({ summary, rows }, null, 1));
console.log(JSON.stringify(summary, null, 1));
console.log(`✔ Đã lưu ${out} trong container — chụp phần trên gửi Claude.`);
