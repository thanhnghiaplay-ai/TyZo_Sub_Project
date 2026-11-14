// Thử cầu nối bằng dòng lệnh, chưa cần giao diện.
// Chuẩn bị âm thanh: ffmpeg -i vao.mp3 -ac 1 -ar 16000 -f s16le vao.pcm
// Chạy: node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/live-try.ts <user_id> <vao.pcm> [đích=en] [model] [ws://địa-chỉ/live]
import { readFileSync, writeFileSync } from "node:fs";
import WebSocket from "ws";
import { signLiveTicket } from "../src/lib/live/live-ticket.ts";
import { LIVE_MODEL_38 } from "../src/lib/live/live-price.ts";

const [, , userId, file, target = "en", model = LIVE_MODEL_38, bridge = "ws://localhost:8787/live"] = process.argv;
const secret = (process.env.LIVE_BRIDGE_SECRET ?? "").trim();
if (!userId || !file || !secret) {
  console.error("Cách dùng: live-try.ts <user_id> <vao.pcm> [đích] [model] [địa chỉ cầu nối]; cần LIVE_BRIDGE_SECRET.");
  process.exit(1);
}
const ticket = signLiveTicket(secret, {
  uid: userId,
  sid: `cli${Date.now().toString(36)}`,
  model,
  target,
  source: "",
  audio: true,
  exp: Date.now() + 60_000,
});
const pcm = readFileSync(file);
const ws = new WebSocket(`${bridge}?ticket=${ticket}`);
const heard: Buffer[] = [];

ws.on("message", (data, isBinary) => {
  if (isBinary) return void heard.push(data as Buffer);
  const message = JSON.parse(data.toString()) as { type: string; [key: string]: unknown };
  console.log(JSON.stringify(message));
  if (message.type === "ready") {
    // Gửi theo nhịp thời gian thật: 100 ms mỗi khung.
    const chunk = 16000 * 2 * 0.1;
    let offset = 0;
    const timer = setInterval(() => {
      if (offset >= pcm.length) {
        clearInterval(timer);
        ws.send(JSON.stringify({ type: "stop" }));
        return;
      }
      ws.send(pcm.subarray(offset, offset + chunk));
      offset += chunk;
    }, 100);
  }
});
ws.on("close", (code, reason) => {
  if (heard.length) {
    writeFileSync("live-out.pcm", Buffer.concat(heard));
    console.log("Tiếng dịch lưu ở live-out.pcm (PCM 16 bit, 24 kHz, mono).");
  }
  console.log(`Đóng ${code} ${reason.toString()}`);
});
ws.on("error", (error) => console.error("Lỗi:", String(error)));
