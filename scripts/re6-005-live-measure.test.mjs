/**
 * RE6-005: đo Dịch trực tiếp với cầu nối giả (ws trên loopback). Kiểm đồng hồ monotonic, dọn bộ đếm khi đóng sớm,
 * lượt lỗi/thiếu mốc tách khỏi phân vị, P50/95/99. Corpus đa ngôn ngữ cho bộ lọc chữ sót (delta = final, tên riêng).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { WebSocketServer } from "ws";
import { measure, pct, speechSpan, summarize } from "../deploy/vps/do-live/live-measure.ts";
import { dropLeftoverScript } from "../src/lib/live/leftover-script.ts";

function tone(ms, startMs = 500, endMs = ms - 500) {
  const pcm = Buffer.alloc((ms / 1000) * 32000);
  for (let i = 0; i < pcm.length / 2; i++) {
    const t = (i / 16000) * 1000;
    pcm.writeInt16LE(t >= startMs && t < endMs ? Math.round(8000 * Math.sin(i / 3)) : 0, i * 2);
  }
  return pcm;
}

async function bridge(behaviour) {
  const wss = new WebSocketServer({ port: 0, host: "127.0.0.1" });
  const got = { frames: 0, afterStop: 0 };
  wss.on("connection", (ws) => {
    let stopped = false;
    ws.send(JSON.stringify({ type: "ready" }));
    ws.on("message", (d, bin) => {
      if (bin) { got.frames++; if (stopped) got.afterStop++; return; }
      if (JSON.parse(d.toString()).type === "stop") {
        stopped = true;
        ws.send(JSON.stringify({ type: "event", event: { kind: "translation", final: true, text: "x" } }));
        ws.close(1000);
      }
    });
    behaviour(ws, got);
  });
  await new Promise((r) => wss.on("listening", r));
  return { url: `ws://127.0.0.1:${wss.address().port}/live`, got, close: () => new Promise((r) => wss.close(r)) };
}

test("RE6-005: phân vị dùng cách làm tròn lên, không trả -Infinity khi rỗng", () => {
  assert.equal(pct([], 50), null);
  const xs = Array.from({ length: 100 }, (_, i) => i + 1);
  assert.deepEqual([pct(xs, 50), pct(xs, 95), pct(xs, 99)], [50, 95, 99]);
  assert.equal(speechSpan(Buffer.alloc(32000)), null, "đoạn im lặng không bịa mốc tiếng nói");
});

test("RE6-005: lượt đủ mốc đo theo đồng hồ monotonic, tính từ lúc bắt đầu có tiếng", async () => {
  const b = await bridge((ws) => {
    setTimeout(() => ws.send(JSON.stringify({ type: "event", event: { kind: "source-delta" } })), 40);
    setTimeout(() => ws.send(JSON.stringify({ type: "event", event: { kind: "translation-delta" } })), 80);
  });
  let fake = 1_000_000; // đồng hồ giả chỉ tăng, độc lập Date.now
  const r = await measure({ url: b.url, lang: "zh", pcm: tone(1000, 100, 900), frameMs: 20, now: () => (fake += 1) });
  await b.close();
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.onsetMs, 100);
  assert.ok(r.firstSource_s != null && r.finals === 1);
});

test("RE6-005: cầu nối đóng sớm → dừng bộ đếm, không gửi khung sau khi đóng, lượt bị đếm là lỗi riêng", async () => {
  const b = await bridge((ws) => setTimeout(() => ws.close(1011, "boom"), 60));
  const r = await measure({ url: b.url, lang: "ja", pcm: tone(3000), frameMs: 10 });
  const framesAtClose = b.got.frames;
  await new Promise((res) => setTimeout(res, 200));
  await b.close();
  assert.equal(r.ok, false);
  assert.equal(r.why, "dong-1011");
  assert.equal(b.got.frames, framesAtClose, "không còn khung nào sau khi đóng");
  assert.equal(r.framesAfterClose, 0);
  const s = summarize([r]);
  assert.deepEqual(s.failed, { "dong-1011": 1 });
  assert.equal(s.onsetToSourceReceive_s.n, 0);
  assert.equal(s.onsetToSourceReceive_s.p99, null);
});

test("RE6-005: hết giờ → terminate, dọn bộ đếm, lượt het-gio", async () => {
  const b = await bridge(() => {});
  const r = await measure({ url: b.url, lang: "ko", pcm: tone(30000), frameMs: 10, timeoutMs: 150 });
  const n = b.got.frames;
  await new Promise((res) => setTimeout(res, 150));
  await b.close();
  assert.equal(r.why, "het-gio");
  assert.equal(b.got.frames, n);
});

test("RE6-005: summarize tách lỗi/thiếu mốc khỏi phân vị và có P50/P95/P99", () => {
  const base = { connectMs: 1, onsetMs: 0, offsetMs: 0, finals: 1, framesAfterClose: 0, errors: [], usage: null, why: "dong-1000" };
  const rows = [
    ...Array.from({ length: 20 }, (_, i) => ({ ...base, lang: "zh", ok: true, firstSource_s: (i + 1) / 10, firstTranslation_s: 1, lastFinalAfterSpeechEnd_s: 2 })),
    { ...base, lang: "en", ok: false, firstSource_s: null, firstTranslation_s: null, lastFinalAfterSpeechEnd_s: null },
    { ...base, lang: "en", ok: false, firstSource_s: 0.1, firstTranslation_s: 0.2, lastFinalAfterSpeechEnd_s: null, finals: 0 },
    { ...base, lang: "en", ok: false, firstSource_s: 9, firstTranslation_s: 9, lastFinalAfterSpeechEnd_s: 9, errors: ["x"] },
  ];
  const s = summarize(rows);
  assert.equal(s.samples, 23); assert.equal(s.ok, 20);
  assert.deepEqual(s.failed, { "thieu-chu-goc": 1, "thieu-cau-chot": 1, loi: 1 });
  assert.deepEqual(s.onsetToSourceReceive_s, { n: 20, p50: 1, p95: 1.9, p99: 2, max: 2 });
  assert.match(s.note, /chưa gồm thời gian vẽ/);
});

// Corpus đa ngôn ngữ: (đích, câu chốt từ model, các mẩu delta, kỳ vọng).
const CORPUS = [
  ["vi", "Anh Nguyễn Văn An đến Hà Nội năm 2026.", ["Anh Nguyễn ", "Văn An đến ", "Hà Nội năm 2026."], "Anh Nguyễn Văn An đến Hà Nội năm 2026."],
  ["vi", "Bạn phải luôn如一.", ["Bạn phải ", "luôn如", "一."], "Bạn phải luôn."],
  ["en", "Mr. Müller met Sørensen in Zürich.", ["Mr. Müller ", "met Sørensen ", "in Zürich."], "Mr. Müller met Sørensen in Zürich."],
  ["en", "Привет, Иван! Hello, Yusuf — مرحبا.", ["Привет, Иван! ", "Hello, Yusuf — مرحبا."], "Привет, Иван! Hello, Yusuf — مرحبا."],
  ["vi", "Cô ấy nói สวัสดี với tôi.", ["Cô ấy nói ", "สวัสดี với tôi."], "Cô ấy nói สวัสดี với tôi."],
  ["vi", "Tôi gặp Tanaka-san ở Tokyo。", ["Tôi gặp Tanaka-san ", "ở Tokyo。"], "Tôi gặp Tanaka-san ở Tokyo."],
  ["ja", "田中さんは東京に行きました。", ["田中さんは", "東京に行きました。"], "田中さんは東京に行きました。"],
];

test("RE6-005: corpus đa ngôn ngữ — chữ Latin/Cyrillic/Ả Rập/Thái và tên riêng phiên âm không bị mất; delta khớp final", () => {
  for (const [target, final, deltas, want] of CORPUS) {
    assert.equal(dropLeftoverScript(final, target), want, final);
    const joined = deltas.map((d) => dropLeftoverScript(d, target, false)).join("");
    assert.equal(dropLeftoverScript(joined, target), want, `delta ${final}`);
  }
});

test("RE6-005: GIỚI HẠN ĐÃ BIẾT — tên riêng viết bằng chữ Hán/kana/Hangul trong bản dịch tiếng Việt bị bỏ", () => {
  // Ghi lại hành vi hiện tại để Chủ quyết chính sách; không tự đổi đầu ra khách hàng.
  assert.equal(dropLeftoverScript("Tôi gặp 王小明 hôm qua.", "vi"), "Tôi gặp hôm qua.");
  assert.equal(dropLeftoverScript("Ca sĩ 아이유 hát.", "vi"), "Ca sĩ hát.");
});
