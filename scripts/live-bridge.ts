// Cầu nối Dịch trực tiếp chạy riêng.
// Chạy: npm run live:bridge   (cần DATABASE_URL, LIVE_BRIDGE_SECRET; Workspace ID qua ALIBABA_WORKSPACE_ID hoặc cài đặt phòng)
import { createServer } from "node:http";
import pg from "pg";
import type { Sql } from "../src/lib/db.ts";
import { attachLiveBridge } from "../src/lib/live/live-bridge.ts";
import { createLiveBilling } from "../src/lib/live/live-billing.ts";
import { loadLiveBook, loadLiveCap } from "../src/lib/live/live-book.ts";
import { loadLiveUpstream } from "../src/lib/live/live-upstream.ts";

const secret = (process.env.LIVE_BRIDGE_SECRET ?? "").trim();
if (secret.length < 24) {
  console.error("Thiếu LIVE_BRIDGE_SECRET (tối thiểu 24 ký tự). Dùng cùng giá trị với máy chủ chính.");
  process.exit(1);
}
if (!process.env.DATABASE_URL?.trim()) {
  console.error("Thiếu DATABASE_URL. Cầu nối phải dùng cùng cơ sở dữ liệu với máy chủ chính để giữ và trừ ví thật.");
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

attachLiveBridge(server, {
  secret,
  upstream: (model) => loadLiveUpstream(sql, model, process.env.ALIBABA_WORKSPACE_ID),
  billing: createLiveBilling(sql, { book: () => loadLiveBook(sql), cap: () => loadLiveCap(sql) }),
  log: (message) => console.log(new Date().toISOString(), message),
});

server.listen(port, () => console.log(`Cầu nối Dịch trực tiếp đang nghe cổng ${port}, đường /live`));
