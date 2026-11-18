import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sonioxSubmitBody } from "./soniox.ts";
import { runSonioxJob, type SonioxRequest } from "./soniox-poll.ts";

const body = sonioxSubmitBody({ audioUrl: "https://example.com/a.mp3", appModel: "soniox-stt-async", language: "en" });
const DEL = "DELETE /transcriptions/tr123456";

/** Yêu cầu giả: trả lần lượt các phản hồi cho GET trạng thái; POST, transcript và DELETE có trả lời riêng; ghi lại mọi lệnh gọi. */
function fake(opts: { post?: { status: number; payload: unknown }; polls: Array<{ status: number; payload: unknown }>; transcript?: { status: number; payload: unknown } }) {
  const calls: string[] = [];
  const bodies: unknown[] = [];
  let index = 0;
  const request: SonioxRequest = async (path, init) => {
    const method = init?.method ?? "GET";
    calls.push(`${method} ${path}`);
    if (method === "POST") {
      bodies.push(init?.body);
      return opts.post ?? { status: 201, payload: { id: "tr123456", status: "queued" } };
    }
    if (method === "DELETE") return { status: 204, payload: null };
    if (path.endsWith("/transcript")) return opts.transcript ?? { status: 200, payload: { tokens: [] } };
    const reply = opts.polls[Math.min(index, opts.polls.length - 1)];
    index += 1;
    return reply;
  };
  return { request, calls, bodies };
}

const noSleep = async () => {};
const processing = { status: 200, payload: { id: "tr123456", status: "processing" } };
const completed = { status: 200, payload: { id: "tr123456", status: "completed", audio_duration_ms: 9000 } };

describe("vòng gửi rồi hỏi Soniox", () => {
  it("gửi POST kèm body, hỏi tới khi completed, lấy transcript, gộp thời lượng, rồi xóa", async () => {
    const { request, calls, bodies } = fake({ polls: [processing, processing, completed], transcript: { status: 200, payload: { tokens: [{ text: "Hi" }] } } });
    const result = (await runSonioxJob({ request, body, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep })) as { tokens: unknown[]; audio_duration_ms: number };
    assert.equal(result.audio_duration_ms, 9000);
    assert.equal(result.tokens.length, 1);
    assert.deepEqual(calls, [
      "POST /transcriptions",
      "GET /transcriptions/tr123456",
      "GET /transcriptions/tr123456",
      "GET /transcriptions/tr123456",
      "GET /transcriptions/tr123456/transcript",
      DEL,
    ]);
    assert.deepEqual(bodies[0], body);
  });

  it("bản phiên âm error thì báo lý do tiếng Việt và vẫn xóa", async () => {
    const failed = { status: 200, payload: { status: "error", error_message: "Failed to fetch audio url" } };
    const { request, calls } = fake({ polls: [processing, failed] });
    await assert.rejects(runSonioxJob({ request, body, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep }), /không tải được link/);
    assert.equal(calls[calls.length - 1], DEL);
  });

  it("POST bị từ chối (401) thì báo lỗi key và không gọi GET hay DELETE", async () => {
    const { request, calls } = fake({ post: { status: 401, payload: { message: "bad key" } }, polls: [completed] });
    await assert.rejects(runSonioxJob({ request, body, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep }), /Key Soniox không hợp lệ/);
    assert.deepEqual(calls, ["POST /transcriptions"]);
  });

  it("POST không trả mã hợp lệ thì báo lỗi, không hỏi tiếp", async () => {
    const { request, calls } = fake({ post: { status: 201, payload: { id: "../x" } }, polls: [completed] });
    await assert.rejects(runSonioxJob({ request, body, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep }), /không trả mã/);
    assert.deepEqual(calls, ["POST /transcriptions"]);
  });

  it("quá hạn chót thì báo lỗi rõ và vẫn xóa", async () => {
    let clock = 0;
    const { request, calls } = fake({ polls: [processing] });
    await assert.rejects(
      runSonioxJob({ request, body, deadlineMs: 10_000, intervalMs: 3000, now: () => clock, sleep: async (ms) => { clock += ms; } }),
      /quá lâu/,
    );
    assert.equal(calls[calls.length - 1], DEL);
  });

  it("hỏi trạng thái lỗi 5xx thì báo lỗi và vẫn xóa", async () => {
    const { request, calls } = fake({ polls: [{ status: 503, payload: null }] });
    await assert.rejects(runSonioxJob({ request, body, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep }), /đang bận/);
    assert.equal(calls[calls.length - 1], DEL);
  });

  it("lấy transcript lỗi thì báo lỗi; xóa lỗi không làm hỏng kết quả", async () => {
    const bad = fake({ polls: [completed], transcript: { status: 500, payload: null } });
    await assert.rejects(runSonioxJob({ request: bad.request, body, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep }), /đang bận/);
    const request: SonioxRequest = async (path, init) => {
      if (init?.method === "POST") return { status: 201, payload: { id: "tr123456" } };
      if (init?.method === "DELETE") throw new Error("mạng đứt");
      if (path.endsWith("/transcript")) return { status: 200, payload: { ok: true } };
      return completed;
    };
    const result = await runSonioxJob({ request, body, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep });
    assert.deepEqual(result, { ok: true, audio_duration_ms: 9000 });
  });
});
