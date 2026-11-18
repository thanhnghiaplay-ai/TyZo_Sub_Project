import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assemblyaiSubmitBody } from "./assemblyai.ts";
import { runAssemblyaiJob, type AaiRequest } from "./assemblyai-poll.ts";

const body = assemblyaiSubmitBody({ audioUrl: "https://example.com/a.mp3", appModel: "assemblyai-universal-2", language: "en" });

/** Yêu cầu giả: trả lần lượt các phản hồi cho POST/GET, ghi lại mọi lệnh gọi. */
function fake(replies: Array<{ status: number; payload: unknown }>) {
  const calls: Array<{ path: string; method: string }> = [];
  let index = 0;
  const request: AaiRequest = async (path, init) => {
    const method = init?.method ?? "GET";
    calls.push({ path, method });
    if (method === "DELETE") return { status: 200, payload: {} };
    const reply = replies[Math.min(index, replies.length - 1)];
    index += 1;
    return reply;
  };
  return { request, calls };
}

const noSleep = async () => {};

describe("vòng gửi rồi hỏi AssemblyAI", () => {
  it("gửi POST, hỏi GET tới khi completed, rồi xóa bản phiên âm", async () => {
    const { request, calls } = fake([
      { status: 200, payload: { id: "abc123def", status: "queued" } },
      { status: 200, payload: { id: "abc123def", status: "processing" } },
      { status: 200, payload: { id: "abc123def", status: "completed", audio_duration: 12 } },
    ]);
    const result = (await runAssemblyaiJob({ request, body, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep })) as { audio_duration: number };
    assert.equal(result.audio_duration, 12);
    assert.deepEqual(
      calls.map((c) => `${c.method} ${c.path}`),
      ["POST /transcript", "GET /transcript/abc123def", "GET /transcript/abc123def", "DELETE /transcript/abc123def"],
    );
  });

  it("bản phiên âm status error thì báo lỗi tiếng Việt và vẫn xóa", async () => {
    const { request, calls } = fake([
      { status: 200, payload: { id: "abc123def", status: "queued" } },
      { status: 200, payload: { id: "abc123def", status: "error", error: "Download error, unable to access url" } },
    ]);
    await assert.rejects(runAssemblyaiJob({ request, body, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep }), /không tải được link/);
    assert.equal(calls[calls.length - 1].method, "DELETE");
  });

  it("POST bị từ chối (401) thì báo lỗi key và không gọi GET hay DELETE", async () => {
    const { request, calls } = fake([{ status: 401, payload: { error: "Invalid API key" } }]);
    await assert.rejects(runAssemblyaiJob({ request, body, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep }), /Key AssemblyAI không hợp lệ/);
    assert.equal(calls.length, 1);
  });

  it("thiếu mã bản phiên âm thì báo lỗi, không hỏi tiếp", async () => {
    const { request, calls } = fake([{ status: 200, payload: { status: "queued" } }]);
    await assert.rejects(runAssemblyaiJob({ request, body, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep }), /không trả mã/);
    assert.equal(calls.length, 1);
  });

  it("quá hạn chót thì báo lỗi và xóa bản phiên âm", async () => {
    let clock = 0;
    const { request, calls } = fake([{ status: 200, payload: { id: "abc123def", status: "processing" } }]);
    await assert.rejects(
      runAssemblyaiJob({
        request,
        body,
        deadlineMs: 10_000,
        intervalMs: 3000,
        now: () => clock,
        sleep: async (ms) => {
          clock += ms;
        },
      }),
      /quá lâu/,
    );
    assert.equal(calls[calls.length - 1].method, "DELETE");
  });

  it("lỗi khi hỏi GET (429) thì báo giới hạn tốc độ và vẫn xóa", async () => {
    const { request, calls } = fake([
      { status: 200, payload: { id: "abc123def", status: "queued" } },
      { status: 429, payload: {} },
    ]);
    await assert.rejects(runAssemblyaiJob({ request, body, deadlineMs: 60_000, intervalMs: 3000, sleep: noSleep }), /giới hạn tốc độ/);
    assert.equal(calls[calls.length - 1].method, "DELETE");
  });

  it("nhịp hỏi không nhanh hơn 1 giây dù cấu hình nhỏ hơn", async () => {
    const waits: number[] = [];
    const { request } = fake([
      { status: 200, payload: { id: "abc123def", status: "queued" } },
      { status: 200, payload: { id: "abc123def", status: "completed" } },
    ]);
    await runAssemblyaiJob({
      request,
      body,
      deadlineMs: 60_000,
      intervalMs: 10,
      sleep: async (ms) => {
        waits.push(ms);
      },
    });
    assert.deepEqual(waits, [1000]);
  });
});
