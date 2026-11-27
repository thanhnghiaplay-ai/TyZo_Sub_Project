// So độ trễ Dịch trực tiếp theo model/tham số, nối THẲNG tới Alibaba (bỏ qua cầu nối; không trừ Token khách, chỉ tốn
// hạn mức key Alibaba của phòng). Chạy trong container cầu nối: deploy/vps/do-live/chay-direct.sh. Không in key.
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";
import WebSocket from "ws";
import { LIVE_MODEL_35, LIVE_MODEL_38 } from "../../../src/lib/live/live-price.ts";
import { liveUpstreamUrl, validWorkspaceId } from "../../../src/lib/live/live-upstream.ts";
import { audioAppend, buildSessionUpdate, parseServerEvent, SESSION_FINISH } from "../../../src/lib/live/qwen-protocol.ts";

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const setting = async (k: string) => (await db.query("select value from room_settings where key = $1", [k])).rows[0]?.value?.trim() as string | undefined;
const key = await setting("alibaba_key");
const ws0 = process.env.ALIBABA_WORKSPACE_ID?.trim();
const workspace = validWorkspaceId(ws0) ? ws0 : await setting("alibaba_workspace");
await db.end();
if (!key || !validWorkspaceId(workspace)) { console.error("✘ Phòng chưa có key hoặc Workspace Alibaba."); process.exit(1); }

type Variant = { name: string; model: string; session: (lang: string) => Record<string, unknown> };
const base = (model: string, lang: string, extra: { source?: string; silenceMs?: number; vadThreshold?: number } = {}) =>
  buildSessionUpdate({ model, target: "vi", audio: false, ...extra })!;
const variants: Variant[] = [
  { name: "3.8 như app", model: LIVE_MODEL_38, session: (l) => base(LIVE_MODEL_38, l) },
  { name: "3.8 speaker_detection 0.2", model: LIVE_MODEL_38, session: (l) => {
    const s = base(LIVE_MODEL_38, l) as { session: Record<string, unknown> };
    s.session.audio = { input: { turn_detection: { type: "speaker_detection", threshold: 0.2 } } };
    return s;
  } },
  { name: "3.5 như phòng (tự dò, 300ms, 0.5)", model: LIVE_MODEL_35, session: (l) => base(LIVE_MODEL_35, l, { silenceMs: 300, vadThreshold: 0.5 }) },
  { name: "3.5 báo nguồn (300ms, 0.5)", model: LIVE_MODEL_35, session: (l) => base(LIVE_MODEL_35, l, { source: l, silenceMs: 300, vadThreshold: 0.5 }) },
  { name: "3.5 báo nguồn (200ms, 0.2)", model: LIVE_MODEL_35, session: (l) => base(LIVE_MODEL_35, l, { source: l, silenceMs: 200, vadThreshold: 0.2 }) },
];

const HERE = new URL(".", import.meta.url).pathname;
const pct = (xs: number[], p: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.round((p / 100) * (xs.length - 1)))] : null);
const s3 = (x: number | null) => (x == null ? null : Math.round(x) / 1000);
const ONSET_MS = 200; const offsetOf = (pcm: Buffer) => Math.round(pcm.length / 32) - 300; // đo trước: lời bắt đầu ~0,2 s, kết thúc gần cuối đoạn

function run(v: Variant, lang: string) {
  const pcm = readFileSync(`${HERE}../do-modal/${lang}.wav`).subarray(44);
  return new Promise<{ src: number | null; tr: number | null; last: number | null; finals: number; err: string[] }>((resolve) => {
    const ws = new WebSocket(liveUpstreamUrl(workspace!, v.model), { headers: { Authorization: `Bearer ${key}` } });
    let t0 = 0; const src: number[] = []; const tr: number[] = []; const fin: number[] = []; const err: string[] = []; let started = false;
    const end = () => resolve({ src: src.length ? src[0] - ONSET_MS : null, tr: tr.length ? tr[0] - ONSET_MS : null,
      last: fin.length ? fin[fin.length - 1] - offsetOf(pcm) : null, finals: fin.length, err });
    const kill = setTimeout(() => { ws.terminate(); }, 120_000);
    ws.on("open", () => ws.send(JSON.stringify(v.session(lang))));
    ws.on("message", (data) => {
      for (const e of parseServerEvent(JSON.parse(data.toString()))) {
        const now = Date.now() - t0;
        if (e.kind === "ready" && !started) {
          started = true; t0 = Date.now(); let off = 0;
          const timer = setInterval(() => {
            if (off >= pcm.length) { clearInterval(timer); ws.send(SESSION_FINISH); return; }
            ws.send(audioAppend(pcm.subarray(off, off + 3200))); off += 3200;
          }, 100);
        } else if (e.kind === "source" || e.kind === "source-delta") src.push(now);
        else if (e.kind === "translation" || e.kind === "translation-delta") { tr.push(now); if ("final" in e && e.final) fin.push(now); }
        else if (e.kind === "error") err.push(e.message.slice(0, 140));
        else if (e.kind === "finished") ws.close();
      }
    });
    ws.on("close", () => { clearTimeout(kill); end(); });
    ws.on("error", (e) => err.push(String(e).slice(0, 140)));
  });
}

const out: Record<string, unknown>[] = [];
for (const v of variants) {
  const rows = [];
  for (const lang of ["zh", "ja", "ko", "en"]) { rows.push({ lang, ...(await run(v, lang)) }); await new Promise((r) => setTimeout(r, 2000)); }
  const col = (k: "src" | "tr" | "last") => rows.map((r) => r[k]).filter((x): x is number => x != null);
  const sum = { variant: v.name, chuGocDau_p50: s3(pct(col("src"), 50)), chuGocDau_max: s3(Math.max(...col("src"))),
    banDichDau_p50: s3(pct(col("tr"), 50)), cauCuoiSauHetTieng_p50: s3(pct(col("last"), 50)),
    cauChot: rows.map((r) => r.finals).join("/"), loi: rows.flatMap((r) => r.err) };
  out.push({ ...sum, rows });
  console.log(`${v.name.padEnd(32)} chữ gốc đầu p50 ${sum.chuGocDau_p50} s (max ${sum.chuGocDau_max}) · dịch đầu p50 ${sum.banDichDau_p50} s · câu cuối ${sum.cauCuoiSauHetTieng_p50} s · chốt ${sum.cauChot} · ${sum.loi.length ? "LỖI " + sum.loi[0] : "không lỗi"}`);
}
const file = `/tmp/do-live-direct-${Date.now()}.json`;
writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`✔ Xong. Chụp bảng trên gửi Claude.`);
