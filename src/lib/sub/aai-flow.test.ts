import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { assemblyaiSubmitBody, sentencesFromAssemblyai } from "./assemblyai.ts";
import { startAssemblyaiJob, stepAssemblyaiJob, type AaiRequest } from "./assemblyai-poll.ts";
import { pollUntilDone } from "./poll-loop.ts";

/** Máy chủ AssemblyAI giả qua HTTP thật: POST /transcript, GET và DELETE /transcript/{id}. */
type Job = { polls: number; readyAfter: number; fail?: boolean; deleted: boolean };
const jobs = new Map<string, Job>();
let nextId = 0;
let dropNext = 0; // số lần GET kế tiếp bị cắt kết nối giữa chừng (giả lập mạng chập chờn)
let server: ReturnType<typeof createServer>;
let base = "";
let readyAfterForNew = 3;
let failNew = false;

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function handle(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? "";
  if (req.method === "POST" && url === "/transcript") {
    const id = `job${String(++nextId).padStart(6, "0")}`;
    jobs.set(id, { polls: 0, readyAfter: readyAfterForNew, fail: failNew, deleted: false });
    return send(res, 200, { id, status: "queued" });
  }
  const match = /^\/transcript\/([A-Za-z0-9_-]+)$/.exec(url);
  const job = match ? jobs.get(match[1]) : undefined;
  if (!match || !job || job.deleted) return send(res, 404, { error: "not found" });
  if (req.method === "DELETE") {
    job.deleted = true;
    return send(res, 200, {});
  }
  if (dropNext > 0) {
    dropNext -= 1;
    return req.socket.destroy();
  }
  job.polls += 1;
  if (job.polls < job.readyAfter) return send(res, 200, { id: match[1], status: "processing" });
  if (job.fail) return send(res, 200, { id: match[1], status: "error", error: "Tệp âm thanh hỏng" });
  return send(res, 200, {
    id: match[1],
    status: "completed",
    audio_duration: 7,
    words: [
      { text: "Hello", start: 0, end: 500 },
      { text: "world.", start: 600, end: 1200 },
    ],
  });
}

before(async () => {
  server = createServer(handle);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const request: AaiRequest = async (path, init) => {
  const response = await fetch(`${base}${path}`, { method: init?.method ?? "GET", ...(init?.body ? { body: init.body, headers: { "content-type": "application/json" } } : {}) });
  const text = await response.text();
  return { status: response.status, payload: text ? JSON.parse(text) : null };
};

const body = assemblyaiSubmitBody({ audioUrl: "https://example.com/a.mp3", appModel: "assemblyai-universal-2", language: "en" });
const quick = { intervalMs: 1, maxWaitMs: 10_000, tooLongMessage: "quá lâu", sleep: async () => {} };

async function run(signal = new AbortController().signal) {
  const jobId = await startAssemblyaiJob(request, body);
  const out = await pollUntilDone<{ payload: unknown }>({ ...quick, signal, step: () => stepAssemblyaiJob(request, jobId) });
  return { jobId, out };
}

describe("luồng gửi, hỏi lặp qua máy chủ AssemblyAI giả", () => {
  it("chạy lâu: hỏi nhiều lần, xong thì ra câu và bản phiên âm bị xóa", async () => {
    readyAfterForNew = 4;
    failNew = false;
    const { jobId, out } = await run();
    const done = sentencesFromAssemblyai(out.payload, "en");
    assert.ok(done.sentences.length >= 1);
    assert.equal(done.seconds, 7);
    assert.equal(jobs.get(jobId)?.polls, 4);
    assert.equal(jobs.get(jobId)?.deleted, true);
  });

  it("mạng chập chờn: bị cắt kết nối hai lần vẫn lấy được kết quả", async () => {
    readyAfterForNew = 2;
    dropNext = 2;
    const { jobId, out } = await run();
    assert.equal(sentencesFromAssemblyai(out.payload, "en").seconds, 7);
    assert.equal(jobs.get(jobId)?.deleted, true);
  });

  it("nhà báo lỗi file: dừng ngay với câu tiếng Việt và vẫn xóa bản phiên âm", async () => {
    readyAfterForNew = 1;
    failNew = true;
    const jobId = await startAssemblyaiJob(request, body);
    await assert.rejects(pollUntilDone({ ...quick, signal: new AbortController().signal, step: () => stepAssemblyaiJob(request, jobId) }));
    assert.equal(jobs.get(jobId)?.deleted, true);
    failNew = false;
  });

  it("hỏi lại sau khi đã xong: bản đã xóa nên lỗi, không có kết quả thứ hai", async () => {
    readyAfterForNew = 1;
    const { jobId } = await run();
    await assert.rejects(stepAssemblyaiJob(request, jobId));
  });

  it("hủy giữa chừng: dừng hỏi", async () => {
    readyAfterForNew = 50;
    const controller = new AbortController();
    const jobId = await startAssemblyaiJob(request, body);
    let n = 0;
    await assert.rejects(
      pollUntilDone({ ...quick, signal: controller.signal, step: () => { n += 1; if (n === 3) controller.abort(); return stepAssemblyaiJob(request, jobId); } }),
      (e: Error) => e.name === "AbortError",
    );
    assert.equal(n, 3);
  });
});
