// Cầu nối Dịch trực tiếp chạy riêng.
// Chạy: npm run live:bridge   (cần DATABASE_URL, LIVE_BRIDGE_SECRET; Workspace ID qua ALIBABA_WORKSPACE_ID hoặc cài đặt phòng)
import { createServer } from "node:http";
import pg from "pg";
import type { Sql } from "../src/lib/db.ts";
import { writeFileSync } from "node:fs";
import { attachLiveBridge, LiveRegistry } from "../src/lib/live/live-bridge.ts";
import { cleanIdleStopMs } from "../src/lib/live/live-latency.ts";
import { saveLatency } from "../src/lib/live/live-latency-store.ts";
import { createLiveBilling } from "../src/lib/live/live-billing.ts";
import { loadLiveBook } from "../src/lib/live/live-book.ts";
import { asrPerSecond } from "../src/lib/run-bill.ts";
import { loadPriceBook } from "../src/lib/run-board.server.ts";
import { tokensForBase, TURBO_ASR } from "../src/lib/token-math.ts";
import { loadLiveUpstream } from "../src/lib/live/live-upstream.ts";
import { cleanSilenceMs } from "../src/lib/live/qwen-protocol.ts";
import { isConnectionError } from "../src/lib/live/db-retry.ts";

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
// Giữ kết nối ấm 50 giây (mặc định 10 giây): bảng giá đọc lại mỗi 60 giây nên luôn có một kết nối sẵn,
// khỏi mở kết nối mới tới Neon Singapore (0,3–1 giây) đúng lúc khách bấm Bắt đầu. Không giữ lâu hơn:
// Neon cắt kết nối nhàn rỗi, dùng lại kết nối đã bị cắt sẽ gặp ECONNRESET (v5.42.0 giữ 5 phút, cầu nối sập).
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 50_000, keepAlive: true });
pool.on("error", (error) => console.log(new Date().toISOString(), `kết nối cơ sở dữ liệu lỗi: ${String(error)}`));
const runQuery = async (text: string, values: unknown[]) => {
  try {
    return (await pool.query(text, values)).rows;
  } catch (error) {
    // Kết nối bị cắt giữa chừng (Neon, mạng): thử lại một lần bằng kết nối mới. Lỗi câu lệnh thì không thử lại.
    if (!isConnectionError(error)) throw error;
    console.log(new Date().toISOString(), `truy vấn gặp lỗi kết nối, thử lại: ${String(error)}`);
    return (await pool.query(text, values)).rows;
  }
};
const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
  let text = strings[0];
  for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
  return runQuery(text, values);
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
/** Đọc lại giá Turbo. Lỗi thì giữ giá cũ và ghi nhật ký, không bao giờ làm sập cầu nối. */
async function refreshTurbo() {
  try {
    const book = await loadPriceBook(sql);
    const per = book ? asrPerSecond({ rate: book.rate, rows: book.rows, desk: { markup: 0, custom: {} } }, TURBO_ASR) : null;
    turboPerSecond = per && per > 0 ? per : 0;
  } catch (error) {
    console.log(new Date().toISOString(), `đọc giá Turbo lỗi, giữ giá cũ: ${String(error)}`);
  }
}

// Lưới an toàn: lời hứa bị từ chối mà quên bắt chỉ được ghi lại, không được giết cả cầu nối
// (Node 22 mặc định thoát, cắt mọi phiên đang dịch của khách).
process.on("unhandledRejection", (reason) => console.log(new Date().toISOString(), `lỗi chưa bắt (cầu nối vẫn chạy): ${String(reason)}`));

// Số phiên đang chạy ghi ra tệp, để lệnh «tyzo» đọc (docker exec) và chỉ cập nhật khi không ai đang dịch.
const SESSIONS_FILE = process.env.LIVE_SESSIONS_FILE || "/tmp/tyzo-phien";
const registry = new LiveRegistry();
const writeCount = (count: number) => {
  try {
    writeFileSync(SESSIONS_FILE, `${count}\n`);
  } catch {
    /* không ghi được thì tyzo coi như không biết, cập nhật như cũ */
  }
};
registry.onChange = writeCount;
writeCount(0);

attachLiveBridge(server, {
  secret,
  upstream: (model) => loadLiveUpstream(sql, model, process.env.ALIBABA_WORKSPACE_ID),
  billing: createLiveBilling(sql, { book: () => loadLiveBook(sql) }),
  toGiay: (base) => (turboPerSecond > 0 ? tokensForBase(base, turboPerSecond) : null),
  // Qwen 3.5: chỉnh thời gian chờ im lặng bằng biến LIVE_SILENCE_MS (200–6000), không cần sửa mã.
  silenceMs: cleanSilenceMs(process.env.LIVE_SILENCE_MS),
  // Tự dừng khi không nghe thấy tiếng quá LIVE_IDLE_STOP_MIN phút (mặc định 5, 0 = tắt).
  idleStopMs: cleanIdleStopMs(process.env.LIVE_IDLE_STOP_MIN),
  registry,
  onStats: (stats) =>
    void saveLatency(sql, stats).catch((error) => console.log(new Date().toISOString(), `ghi số đo lỗi: ${String(error)}`)),
  log: (message) => console.log(new Date().toISOString(), message),
});

// Tắt (cập nhật, khởi động lại): dừng nhẹ mọi phiên để trả phần dịch cuối và nhả Token giữ thừa, rồi mới thoát.
let shuttingDown = false;
const shutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(new Date().toISOString(), `nhận ${signal}, dừng nhẹ ${registry.size} phiên`);
  server.close();
  registry.stopAll("cap-nhat", "Cầu nối đang cập nhật nên phiên dừng. Bấm Bắt đầu lại sau khoảng một phút.");
  const deadline = Date.now() + 9_000;
  const wait = setInterval(() => {
    if (registry.size === 0 || Date.now() > deadline) {
      clearInterval(wait);
      void pool.end().finally(() => process.exit(0));
    }
  }, 200);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

void refreshTurbo().then(() => {
  setInterval(() => void refreshTurbo(), 60_000);
  server.listen(port, () => console.log(`Cầu nối Dịch trực tiếp đang nghe cổng ${port}, đường /live`));
});
