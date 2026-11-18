import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { sentencesFromSpeechmatics, speechmaticsJobConfig } from "./speechmatics.ts";
import { startSpeechmaticsJob, stepSpeechmaticsJob, type SmRequest } from "./speechmatics-poll.ts";
import { pollUntilDone } from "./poll-loop.ts";

/** Máy chủ Speechmatics giả qua HTTP thật: POST /jobs, GET /jobs/{id}, GET /jobs/{id}/transcript, DELETE /jobs/{id}. */
type Job = { polls: number; readyAfter: number; mode: "ok" | "rejected"; deleted: boolean };
const jobs = new Map<string, Job>();
let nextId = 0;
let dropNext = 0;
let readyAfterForNew = 3;
let modeForNew: Job["mode"] = "ok";
let server: ReturnType<typeof createServer>;
let base = "";

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function handle(req: IncomingMessage, res: ServerResponse) {
  const url = (req.url ?? "").split("?")[0];
  if (req.method === "POST" && url === "/jobs") {
    const id = `sm${String(++nextId).padStart(6, "0")}`;
    jobs.set(id, { polls: 0, readyAfter: readyAfterForNew, mode: modeForNew, deleted: false });
    return send(res, 201, { id });
  }
  const m = /^\/jobs\/([A-Za-z0-9_-]+)(\/transcript)?$/.exec(url);
  const job = m ? jobs.get(m[1]) : undefined;
  if (!m || !job || job.deleted) return send(res, 404, { error: "not found" });
  if (req.method === "DELETE") {
    job.deleted = true;
    return send(res, 200, {});
  }
  if (m[2]) {
    return send(res, 200, {
      job: { duration: 7 },
      results: [
        { type: "word", start_time: 0, end_time: 0.5, alternatives: [{ content: "Hello" }] },
        { type: "word", start_time: 0.6, end_time: 1.2, alternatives: [{ content: "world" }] },
        { type: "punctuation", start_time: 1.2, end_time: 1.2, is_eos: true, alternatives: [{ content: "." }] },
      ],
    });
  }
  if (dropNext > 0) {
    dropNext -= 1;
    return req.socket.destroy();
  }
  job.polls += 1;
  if (job.polls < job.readyAfter) return send(res, 200, { job: { id: m[1], status: "running" } });
  if (job.mode === "rejected") return send(res, 200, { job: { id: m[1], status: "rejected", errors: [{ message: "unable to fetch audio from url" }] } });
  return send(res, 200, { job: { id: m[1], status: "done" } });
}

before(async () => {
  server = createServer(handle);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const request: SmRequest = async (path, init) => {
  const method = init?.method ?? "GET";
  const response = await fetch(`${base}${path}`, { method, ...(method === "POST" ? { body: JSON.stringify(init?.config ?? {}), headers: { "content-type": "application/json" } } : {}) });
  const text = await response.text();
  return { status: response.status, payload: text ? JSON.parse(text) : null };
};

const config = speechmaticsJobConfig({ audioUrl: "https://example.com/a.mp3", appModel: "speechmatics-standard", language: "en" });
const quick = { intervalMs: 1, maxWaitMs: 10_000, tooLongMessage: "quá lâu", sleep: async () => {} };

describe("Speechmatics: lệnh gửi và lệnh hỏi", () => {
  it("start chỉ POST một lần; mã lạ bị từ chối", async () => {
    const calls: string[] = [];
    const ok: SmRequest = async (path, init) => {
      calls.push(`${init?.method ?? "GET"} ${path}`);
      return { status: 201, payload: { id: "job123456" } };
    };
    assert.equal(await startSpeechmaticsJob(ok, config), "job123456");
    assert.deepEqual(calls, ["POST /jobs"]);
    await assert.rejects(startSpeechmaticsJob(async () => ({ status: 201, payload: { id: "../x" } }), config), /mã job/);
    await assert.rejects(startSpeechmaticsJob(async () => ({ status: 401, payload: { error: "bad" } }), config), /Key Speechmatics/);
  });

  it("step: đang chạy thì chỉ hỏi một lần và KHÔNG xóa; mã sai không gọi mạng", async () => {
    const calls: string[] = [];
    const req: SmRequest = async (path, init) => {
      calls.push(`${init?.method ?? "GET"} ${path}`);
      return { status: 200, payload: { job: { status: "running" } } };
    };
    assert.deepEqual(await stepSpeechmaticsJob(req, "job123456"), { state: "running" });
    assert.deepEqual(calls, ["GET /jobs/job123456"]);
    await assert.rejects(stepSpeechmaticsJob(req, "../x"), /không hợp lệ/);
    assert.equal(calls.length, 1);
  });

  it("luồng chạy lâu qua máy chủ giả: ra câu, đúng thời lượng, job bị xóa", async () => {
    readyAfterForNew = 4;
    modeForNew = "ok";
    const jobId = await startSpeechmaticsJob(request, config);
    const out = await pollUntilDone({ ...quick, signal: new AbortController().signal, step: () => stepSpeechmaticsJob(request, jobId) });
    const done = sentencesFromSpeechmatics(out.payload, "en");
    assert.ok(done.sentences.length >= 1);
    assert.equal(done.seconds, 7);
    assert.equal(jobs.get(jobId)?.polls, 4);
    assert.equal(jobs.get(jobId)?.deleted, true);
  });

  it("mạng bị cắt hai lần vẫn lấy được kết quả", async () => {
    readyAfterForNew = 2;
    dropNext = 2;
    const jobId = await startSpeechmaticsJob(request, config);
    const out = await pollUntilDone({ ...quick, signal: new AbortController().signal, step: () => stepSpeechmaticsJob(request, jobId) });
    assert.equal(sentencesFromSpeechmatics(out.payload, "en").seconds, 7);
    assert.equal(jobs.get(jobId)?.deleted, true);
  });

  it("job bị từ chối: dừng ngay, câu tiếng Việt, vẫn xóa", async () => {
    readyAfterForNew = 1;
    modeForNew = "rejected";
    const jobId = await startSpeechmaticsJob(request, config);
    await assert.rejects(pollUntilDone({ ...quick, signal: new AbortController().signal, step: () => stepSpeechmaticsJob(request, jobId) }), /không tải được link/);
    assert.equal(jobs.get(jobId)?.deleted, true);
    modeForNew = "ok";
  });

  it("hỏi lại sau khi xong thì lỗi (không có kết quả thứ hai)", async () => {
    readyAfterForNew = 1;
    const jobId = await startSpeechmaticsJob(request, config);
    await pollUntilDone({ ...quick, signal: new AbortController().signal, step: () => stepSpeechmaticsJob(request, jobId) });
    await assert.rejects(stepSpeechmaticsJob(request, jobId));
  });

  it("hủy giữa chừng thì dừng hỏi", async () => {
    readyAfterForNew = 50;
    const controller = new AbortController();
    const jobId = await startSpeechmaticsJob(request, config);
    let n = 0;
    await assert.rejects(
      pollUntilDone({ ...quick, signal: controller.signal, step: () => { n += 1; if (n === 3) controller.abort(); return stepSpeechmaticsJob(request, jobId); } }),
      (e: Error) => e.name === "AbortError",
    );
    assert.equal(n, 3);
  });
});
