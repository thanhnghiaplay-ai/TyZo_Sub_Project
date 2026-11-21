import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { formatSpan, grantRow, localRow, mergeHistory, shortModel, ticketRow, type TicketRecord } from "./history-view.ts";
import { LOCAL_RUNS_MAX, addLocalRun, readLocalRuns } from "./local-runs.ts";

const base: TicketRecord = {
  id: "a".repeat(24),
  fileName: "Tap 1.mp4",
  seconds: 754,
  held: 0,
  charged: 812,
  released: 410,
  status: "da-tru",
  unit: "token",
  asrModel: "whisper-large-v3-turbo",
  chatModel: "openai/gpt-oss-120b",
  createdAt: "2026-11-21T08:00:00Z",
  closedAt: "2026-11-21T08:05:00Z",
};

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe("lịch sử lượt dịch", () => {
  it("một lượt: tên tệp, thời lượng, model, trừ và trả lại bao nhiêu Token dịch", () => {
    const row = ticketRow(base);
    assert.equal(row.title, "Tap 1.mp4");
    assert.match(row.detail, /12 phút 34 giây/);
    assert.match(row.detail, /whisper-large-v3-turbo · gpt-oss-120b/);
    assert.equal(row.money, "trừ 812 Token dịch · trả lại 410 Token dịch");
    assert.equal(row.state, "Xong");
  });

  it("đang giữ, lỗi không trừ, phiếu đồng cũ", () => {
    assert.match(ticketRow({ ...base, status: "dang-giu", held: 900, charged: 0, released: 0 }).money, /đang giữ 900 Token dịch/);
    const failed = ticketRow({ ...base, status: "loi", charged: 0, released: 900 });
    assert.equal(failed.state, "Lỗi, không trừ");
    assert.equal(failed.tone, "bad");
    assert.match(ticketRow({ ...base, unit: "vnd", charged: 5000, released: 0 }).money, /5\.000 đ/);
  });

  it("nhận ra phân tích nội dung, trau chuốt, đọc thuyết minh", () => {
    assert.equal(ticketRow({ ...base, fileName: "Phân tích nội dung" }).kind, "analysis");
    assert.equal(ticketRow({ ...base, fileName: "Trau chuốt bản dịch" }).kind, "polish");
    const speech = ticketRow({ ...base, id: "tts-u1-2026-11-21" });
    assert.equal(speech.kind, "speech");
    assert.equal(speech.title, "Đọc thuyết minh trong ngày");
  });

  it("lượt thuê phòng trên máy: không trừ Token, ghi số câu; gộp xếp mới nhất trước", () => {
    const local = localRow({ at: "2026-11-21T09:00:00Z", file: "b.mkv", seconds: 60, asr: "whisper-large-v3", chat: "qwen-plus", lines: 12, ok: true }, 0);
    assert.match(local.money, /không trừ Token dịch/);
    assert.match(local.state, /12 câu/);
    const merged = mergeHistory([ticketRow(base), local]);
    assert.equal(merged[0].title, "b.mkv");
  });

  it("gói Token: còn bao nhiêu, hạn; hết hạn thì ghi phần đã mất", () => {
    const now = Date.parse("2026-11-21T00:00:00Z");
    assert.match(grantRow({ id: "g", tokens: 10000, left: 2500, expiresAt: "2026-12-01T00:00:00Z", createdAt: "" }, now).detail, /Còn 2\.500/);
    const old = grantRow({ id: "g", tokens: 10000, left: 300, expiresAt: "2026-11-01T00:00:00Z", createdAt: "" }, now);
    assert.equal(old.expired, true);
    assert.match(old.detail, /đã mất 300/);
  });

  it("định dạng gọn", () => {
    assert.equal(formatSpan(45), "45 giây");
    assert.equal(formatSpan(3720), "1 giờ 2 phút");
    assert.equal(shortModel("auto"), "Tự động");
  });
});

describe("lượt thuê phòng ghi trên máy", () => {
  it("mới nhất trước, giữ tối đa 50, dữ liệu hỏng thì rỗng", () => {
    const store = memory();
    for (let i = 0; i < LOCAL_RUNS_MAX + 5; i++) addLocalRun(store, { at: `2026-11-21T00:00:${String(i % 60).padStart(2, "0")}Z`, file: `f${i}`, seconds: 1, asr: "", chat: "", lines: 1, ok: true });
    const runs = readLocalRuns(store);
    assert.equal(runs.length, LOCAL_RUNS_MAX);
    assert.equal(runs[0].file, `f${LOCAL_RUNS_MAX + 4}`);
    store.setItem("tyzo_runs", "{hỏng");
    assert.deepEqual(readLocalRuns(store), []);
  });
});

describe("máy chủ chỉ trả lịch sử của chính người đăng nhập", () => {
  it("lọc theo context.userId, không nhận mã người dùng từ máy khách; tài khoản và luồng dịch đã nối", () => {
    const room = readFileSync(new URL("./history-room.ts", import.meta.url), "utf8");
    assert.match(room, /middleware\(\[authMiddleware\]\)/);
    assert.match(room, /where user_id = \$\{context\.userId\} and/);
    assert.match(room, /where user_id = \$\{context\.userId\} order by created_at desc limit 20/);
    assert.doesNotMatch(room, /data\.userId/);
    const panel = readFileSync(new URL("../components/account-panel.tsx", import.meta.url), "utf8");
    assert.match(panel, /<HistoryPanel buys=\{rows\} \/>/);
    const pipe = readFileSync(new URL("../components/use-pipeline.ts", import.meta.url), "utf8");
    assert.match(pipe, /if \(!roomPayRef\.current\) \{\s*const picked = audioFile \|\| file;\s*addLocalRun\(/);
  });
});
