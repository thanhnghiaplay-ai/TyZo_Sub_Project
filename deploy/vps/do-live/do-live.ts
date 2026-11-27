// Đo Dịch trực tiếp thật: âm thanh → chữ gốc tạm → bản dịch tạm → câu chốt, qua cầu nối thật và Alibaba thật.
// Chạy TRONG container cầu nối (có sẵn LIVE_BRIDGE_SECRET, DATABASE_URL, thư viện) — xem deploy/vps/do-live/chay.sh.
// Cách dùng: do-live.ts <email> [cầu nối] [đích] [3.5|3.8] [số vòng]. Gửi 4 đoạn mẫu 30 s (zh/ja/ko/en) theo nhịp thời gian thực 100 ms/khung. Trừ Token của tài khoản được nhập như dùng thật.
// Không in khóa; kết quả JSON không chứa vé hay khóa.
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";
import { signLiveTicket } from "../../../src/lib/live/live-ticket.ts";
import { LIVE_MODEL_35, LIVE_MODEL_38 } from "../../../src/lib/live/live-price.ts";
import { measure, summarize, type Row } from "./live-measure.ts";

const [, , email, bridge = "wss://realtimehub.tyzo.site/live", target = "vi", modelArg = "3.5", roundsArg = "1"] = process.argv;
// RE6-005: chọn model (3.5 hoặc 3.8, mặc định theo app là 3.5), số vòng 1–10 để có đủ mẫu cho P95/P99.
const model = ({ "3.5": LIVE_MODEL_35, "3.8": LIVE_MODEL_38 } as Record<string, string>)[modelArg] ?? "";
const rounds = Number(roundsArg);
if (!model || !Number.isInteger(rounds) || rounds < 1 || rounds > 10) { console.error("Model chỉ nhận 3.5 hoặc 3.8; số vòng 1–10."); process.exit(1); }
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
const rows: Row[] = [];
for (let round = 0; round < rounds; round++) for (const lang of ["zh", "ja", "ko", "en"]) {
  const pcm = readFileSync(`${HERE}../do-modal/${lang}.wav`).subarray(44);
  const ticket = signLiveTicket(secret, { uid, sid: `do${Date.now().toString(36)}${lang}${round}`, model, target, source: "", audio: false, exp: Date.now() + 60_000 });
  const r = await measure({ url: `${bridge}?ticket=${ticket}`, lang, pcm });
  rows.push(r);
  console.log(`  ${lang}#${round + 1}: chữ gốc đầu ${r.firstSource_s} s · bản dịch đầu ${r.firstTranslation_s} s · câu cuối sau khi hết tiếng ${r.lastFinalAfterSpeechEnd_s} s · câu chốt ${r.finals} · ${r.ok ? "đạt" : r.errors.join("; ") || r.why}`);
  await new Promise((res) => setTimeout(res, 3000));
}
const summary = { bridge, target, model, rounds, ...summarize(rows) };
const out = `/tmp/do-live-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(out, JSON.stringify({ summary, rows }, null, 1));
console.log(JSON.stringify(summary, null, 1));
console.log(`✔ Đã lưu ${out} trong container — chụp phần trên gửi Claude.`);
