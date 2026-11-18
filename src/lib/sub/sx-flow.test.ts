import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { sentencesFromSoniox, sonioxSubmitBody } from "./soniox.ts";
import { startSonioxJob, stepSonioxJob, type SonioxRequest } from "./soniox-poll.ts";
import { pollUntilDone } from "./poll-loop.ts";

/** Máy chủ Soniox giả qua HTTP thật: POST /transcriptions, GET /transcriptions/{id}(/transcript), DELETE. */
type Job = { polls: number; readyAfter: number; mode: "ok" | "error"; deleted: boolean };
const jobs = new Map<string, Job>();
let nextId = 0;
let dropNext = 0;
let readyAfterForNew = 3;
let modeForNew: Job["mode"] = "ok";
let server: ReturnType<typeof createServer>;
let base = "";

function send(res: ServerResponse, status: number, body: unknown) {
  if (status === 204) {
    res.writeHead(204);
    return res.end();
  }
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function handle(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? "";
  if (req.method === "POST" && url === "/transcriptions") {
    const id = `sx${String(++nextId).padStart(6, "0")}`;
    jobs.set(id, { polls: 0, readyAfter: readyAfterForNew, mode: modeForNew, deleted: false });
    return send(res, 201, { id, status: "queued" });
  }
  const m = /^\/transcriptions\/([A-Za-z0-9_-]+)(\/transcript)?$/.exec(url);
  const job = m ? jobs.get(m[1]) : undefined;
  if (!m || !job || job.deleted) return send(res, 404, { message: "not found" });
  if (req.method === "DELETE") {
    job.deleted = true;
    return send(res, 204, null);
  }
  if (m[2]) {
    return send(res, 200, {
      tokens: [
        { text: "Hello", start_ms: 0, end_ms: 500 },
        { text: " world.", start_ms: 600, end_ms: 1200 },
      ],
    });
  }
  if (dropNext > 0) {
    dropNext -= 1;
    return req.socket.destroy();
  }
  job.polls += 1;
  if (job.polls < job.readyAfter) return send(res, 200, { id: m[1], status: "processing" });
  if (job.mode === "error") return send(res, 200, { id: m[1], status: "error", error_message: "Failed to fetch audio url" });
  return send(res, 200, { id: m[1], status: "completed", audio_duration_ms: 7000 });
}

before(async () => {
  server = createServer(handle);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const request: SonioxRequest = async (path, init) => {
  const method = init?.method ?? "GET";
  const response = await fetch(`${base}${path}`, { method, ...(init?.body ? { body: JSON.stringify(init.body), headers: { "content-type": "application/json" } } : {}) });
  const text = await response.text();
  return { status: response.status, payload: text ? JSON.parse(text) : null };
};

const body = sonioxSubmitBody({ audioUrl: "https://example.com/a.mp3", appModel: "soniox-stt-async", language: "en" });
const quick = { intervalMs: 1, maxWaitMs: 10_000, tooLongMessage: "quá lâu", sleep: async () => {} };

describe("Soniox: lệnh gửi và lệnh hỏi", () => {
  it("start chỉ POST một lần; mã lạ bị từ chối", async () => {
    const calls: string[] = [];
    const ok: SonioxRequest = async (path, init) => {
      calls.push(`${init?.method ?? "GET"} ${path}`);
      return { status: 201, payload: { id: "tr123456", status: "queued" } };
    };
    assert.equal(await startSonioxJob(ok, body), "tr123456");
    assert.deepEqual(calls, ["POST /transcriptions"]);
    await assert.rejects(startSonioxJob(async () => ({ status: 201, payload: { id: "../x" } }), body), /mã bản phiên âm/);
    await assert.rejects(startSonioxJob(async () => ({ status: 401, payload: { message: "bad" } }), body), /Key Soniox/);
  });

  it("step: đang chạy thì chỉ hỏi một lần và KHÔNG xóa; mã sai không gọi mạng", async () => {
    const calls: string[] = [];
    const req: SonioxRequest = async (path, init) => {
      calls.push(`${init?.method ?? "GET"} ${path}`);
      return { status: 200, payload: { status: "processing" } };
    };
    assert.deepEqual(await stepSonioxJob(req, "tr123456"), { state: "running" });
    assert.deepEqual(calls, ["GET /transcriptions/tr123456"]);
    await assert.rejects(stepSonioxJob(req, "../x"), /không hợp lệ/);
    assert.equal(calls.length, 1);
  });

  it("luồng chạy lâu qua máy chủ giả: ra câu, gộp đúng thời lượng, bản bị xóa", async () => {
    readyAfterForNew = 4;
    modeForNew = "ok";
    const jobId = await startSonioxJob(request, body);
    const out = await pollUntilDone({ ...quick, signal: new AbortController().signal, step: () => stepSonioxJob(request, jobId) });
    const done = sentencesFromSoniox(out.payload, "en");
    assert.ok(done.sentences.length >= 1);
    assert.equal(done.seconds, 7);
    assert.equal(jobs.get(jobId)?.polls, 4);
    assert.equal(jobs.get(jobId)?.deleted, true);
  });

  it("mạng bị cắt hai lần vẫn lấy được kết quả", async () => {
    readyAfterForNew = 2;
    dropNext = 2;
    const jobId = await startSonioxJob(request, body);
    const out = await pollUntilDone({ ...quick, signal: new AbortController().signal, step: () => stepSonioxJob(request, jobId) });
    assert.equal(sentencesFromSoniox(out.payload, "en").seconds, 7);
    assert.equal(jobs.get(jobId)?.deleted, true);
  });

  it("bản lỗi: dừng ngay, câu tiếng Việt, vẫn xóa", async () => {
    readyAfterForNew = 1;
    modeForNew = "error";
    const jobId = await startSonioxJob(request, body);
    await assert.rejects(pollUntilDone({ ...quick, signal: new AbortController().signal, step: () => stepSonioxJob(request, jobId) }), /không tải được link/);
    assert.equal(jobs.get(jobId)?.deleted, true);
    modeForNew = "ok";
  });

  it("hỏi lại sau khi xong thì lỗi (không có kết quả thứ hai)", async () => {
    readyAfterForNew = 1;
    const jobId = await startSonioxJob(request, body);
    await pollUntilDone({ ...quick, signal: new AbortController().signal, step: () => stepSonioxJob(request, jobId) });
    await assert.rejects(stepSonioxJob(request, jobId));
  });

  it("hủy giữa chừng thì dừng hỏi", async () => {
    readyAfterForNew = 50;
    const controller = new AbortController();
    const jobId = await startSonioxJob(request, body);
    let n = 0;
    await assert.rejects(
      pollUntilDone({ ...quick, signal: controller.signal, step: () => { n += 1; if (n === 3) controller.abort(); return stepSonioxJob(request, jobId); } }),
      (e: Error) => e.name === "AbortError",
    );
    assert.equal(n, 3);
  });
});
