// Cầu nối Dịch trực tiếp chạy riêng.
// Chạy: npm run live:bridge   (cần DATABASE_URL, LIVE_BRIDGE_SECRET; Workspace ID qua ALIBABA_WORKSPACE_ID hoặc cài đặt phòng)
import { createServer } from "node:http";
import pg from "pg";
import type { Sql } from "../src/lib/db.ts";
import { attachLiveBridge } from "../src/lib/live/live-bridge.ts";
import { createLiveBilling } from "../src/lib/live/live-billing.ts";
import { loadLiveBook } from "../src/lib/live/live-book.ts";
import { asrPerSecond } from "../src/lib/billing/run-bill.ts";
import { loadPriceBook } from "../src/lib/run-board.server.ts";
import { tokensForBase, TURBO_ASR } from "../src/lib/billing/token-math.ts";
import { loadLiveUpstream } from "../src/lib/live/live-upstream.ts";
import { cleanSilenceMs, cleanVadThreshold } from "../src/lib/live/qwen-protocol.ts";

const secret = (process.env.LIVE_BRIDGE_SECRET ?? "").trim();
if (secret.length < 24) {
  console.error("Thiếu LIVE_BRIDGE_SECRET (tối thiểu 24 ký tự). Dùng cùng giá trị với máy chủ chính.");
  process.exit(1);
}
if (!process.env.DATABASE_URL?.trim()) {
  console.error("Thiếu DATABASE_URL. Cầu nối phải dùng cùng cơ sở dữ liệu với máy chủ chính để giữ và trừ gói giây.");
  process.exit(1);
}
const port = Number(process.env.PORT ?? process.env.LIVE_BRIDGE_PORT ?? 8787);
// Nối thẳng Postgres bằng `pg`. Không chạy migration: máy chủ chính đã chạy khi build.
// Cùng cách đọc kiểu số như src/lib/db.ts (int8 → số, date và interval giữ chữ).
pg.types.setTypeParser(20, Number);
pg.types.setTypeParser(1082, (value: string) => value);
pg.types.setTypeParser(1186, (value: string) => value);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
  let text = strings[0];
  for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
  return (await pool.query(text, values)).rows;
}) as unknown as Sql;

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("ok");
    return;
  }
  response.writeHead(404);
  response.end();
});

let turboPerSecond = 0;
/** Đọc lại giá Turbo. Lỗi (vd. Neon cắt kết nối, ECONNRESET) thì giữ giá cũ, không làm sập cầu nối. */
async function refreshTurbo() {
  try {
    const book = await loadPriceBook(sql);
    const per = book ? asrPerSecond({ rate: book.rate, rows: book.rows, desk: { markup: 0, custom: {} } }, TURBO_ASR) : null;
    turboPerSecond = per && per > 0 ? per : 0;
  } catch (error) {
    console.log(new Date().toISOString(), `đọc giá Turbo lỗi, giữ giá cũ: ${String(error)}`);
  }
}

// Lỗi quên bắt chỉ ghi nhật ký; Node 22 mặc định thoát, cắt mọi phiên đang dịch.
process.on("unhandledRejection", (reason) => console.log(new Date().toISOString(), `lỗi chưa bắt (cầu nối vẫn chạy): ${String(reason)}`));
pool.on("error", (error) => console.log(new Date().toISOString(), `kết nối cơ sở dữ liệu lỗi: ${String(error)}`));

attachLiveBridge(server, {
  secret,
  upstream: (model) => loadLiveUpstream(sql, model, process.env.ALIBABA_WORKSPACE_ID),
  billing: createLiveBilling(sql, { book: () => loadLiveBook(sql) }),
  toGiay: (base) => (turboPerSecond > 0 ? tokensForBase(base, turboPerSecond) : null),
  // Qwen 3.5: chỉnh thời gian chờ im lặng bằng biến LIVE_SILENCE_MS (200–6000), không cần sửa mã.
  silenceMs: cleanSilenceMs(process.env.LIVE_SILENCE_MS),
  // Qwen 3.5: độ nhạy nhận tiếng, LIVE_VAD_THRESHOLD (0,1–0,9, mặc định 0,2). Cao hơn thì nhạc nền ít làm câu dài.
  vadThreshold: cleanVadThreshold(process.env.LIVE_VAD_THRESHOLD),
  log: (message) => console.log(new Date().toISOString(), message),
});

void refreshTurbo().then(() => {
  setInterval(() => void refreshTurbo(), 60_000);
  server.listen(port, () => console.log(`Cầu nối Dịch trực tiếp đang nghe cổng ${port}, đường /live`));
});
