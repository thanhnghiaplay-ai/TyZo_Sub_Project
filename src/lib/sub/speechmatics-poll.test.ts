import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { speechmaticsJobConfig } from "./speechmatics.ts";
import { runSpeechmaticsJob, type SmRequest } from "./speechmatics-poll.ts";

const config = speechmaticsJobConfig({ audioUrl: "https://example.com/a.mp3", appModel: "speechmatics-standard", language: "en" });

/** Yêu cầu giả: trả lần lượt các phản hồi cho GET trạng thái; POST, transcript và DELETE có trả lời riêng; ghi lại mọi lệnh gọi. */
function fake(opts: { post?: { status: number; payload: unknown }; polls: Array<{ status: number; payload: unknown }>; transcript?: { status: number; payload: unknown } }) {
  const calls: string[] = [];
  const configs: unknown[] = [];
  let index = 0;
  const request: SmRequest = async (path, init) => {
    const method = init?.method ?? "GET";
    calls.push(`${method} ${path}`);
    if (method === "POST") {
      configs.push(init?.config);
      return opts.post ?? { status: 201, payload: { id: "job123456" } };
    }
    if (method === "DELETE") return { status: 200, payload: {} };
    if (path.includes("/transcript")) return opts.transcript ?? { status: 200, payload: { results: [], job: { duration: 5 } } };
    const reply = opts.polls[Math.min(index, opts.polls.length - 1)];
    index += 1;
    return reply;
  };
  return { request, calls, configs };
}

const noSleep = async () => {};
const running = { status: 200, payload: { job: { id: "job123456", status: "running" } } };
const done = { status: 200, payload: { job: { id: "job123456", status: "done" } } };

describe("vòng gửi rồi hỏi Speechmatics", () => {
  it("gửi POST kèm config, hỏi tới khi done, lấy transcript json-v2, rồi xóa job", async () => {
    const { request, calls, configs } = fake({ polls: [running, running, done], transcript: { status: 200, payload: { job: { duration: 9 }, results: [] } } });
    const result = (await runSpeechmaticsJob({ request, config, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep })) as { job: { duration: number } };
    assert.equal(result.job.duration, 9);
    assert.deepEqual(calls, [
      "POST /jobs",
      "GET /jobs/job123456",
      "GET /jobs/job123456",
      "GET /jobs/job123456",
      "GET /jobs/job123456/transcript?format=json-v2",
      "DELETE /jobs/job123456?force=true",
    ]);
    assert.deepEqual(configs[0], config);
  });

  it("job rejected thì báo lý do tiếng Việt và vẫn xóa", async () => {
    const rejected = { status: 200, payload: { job: { status: "rejected", errors: [{ message: "unable to fetch audio from url" }] } } };
    const { request, calls } = fake({ polls: [running, rejected] });
    await assert.rejects(runSpeechmaticsJob({ request, config, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep }), /không tải được link/);
    assert.equal(calls[calls.length - 1], "DELETE /jobs/job123456?force=true");
  });

  it("POST bị từ chối (401) thì báo lỗi key và không gọi GET hay DELETE", async () => {
    const { request, calls } = fake({ post: { status: 401, payload: { error: "Invalid token" } }, polls: [done] });
    await assert.rejects(runSpeechmaticsJob({ request, config, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep }), /Key Speechmatics không hợp lệ/);
    assert.deepEqual(calls, ["POST /jobs"]);
  });

  it("POST không trả mã job hợp lệ thì báo lỗi, không hỏi tiếp", async () => {
    const { request, calls } = fake({ post: { status: 201, payload: { id: "../x" } }, polls: [done] });
    await assert.rejects(runSpeechmaticsJob({ request, config, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep }), /không trả mã job/);
    assert.deepEqual(calls, ["POST /jobs"]);
  });

  it("quá hạn chót thì báo lỗi rõ và vẫn xóa job", async () => {
    let clock = 0;
    const { request, calls } = fake({ polls: [running] });
    await assert.rejects(
      runSpeechmaticsJob({ request, config, deadlineMs: 10_000, intervalMs: 3000, now: () => clock, sleep: async (ms) => { clock += ms; } }),
      /quá lâu/,
    );
    assert.equal(calls[calls.length - 1], "DELETE /jobs/job123456?force=true");
  });

  it("hỏi trạng thái lỗi 5xx thì báo lỗi và vẫn xóa", async () => {
    const { request, calls } = fake({ polls: [{ status: 503, payload: null }] });
    await assert.rejects(runSpeechmaticsJob({ request, config, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep }), /đang bận/);
    assert.equal(calls[calls.length - 1], "DELETE /jobs/job123456?force=true");
  });

  it("lấy transcript lỗi thì báo lỗi, không trả kết quả rỗng; xóa job lỗi không làm hỏng kết quả", async () => {
    const bad = fake({ polls: [done], transcript: { status: 500, payload: null } });
    await assert.rejects(runSpeechmaticsJob({ request: bad.request, config, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep }), /đang bận/);
    const calls: string[] = [];
    const request: SmRequest = async (path, init) => {
      calls.push(`${init?.method ?? "GET"} ${path}`);
      if (init?.method === "POST") return { status: 201, payload: { id: "job123456" } };
      if (init?.method === "DELETE") throw new Error("mạng đứt");
      if (path.includes("/transcript")) return { status: 200, payload: { ok: true } };
      return done;
    };
    const result = await runSpeechmaticsJob({ request, config, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep });
    assert.deepEqual(result, { ok: true });
  });
});
