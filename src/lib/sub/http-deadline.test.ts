import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { DeadlineError, withDeadlines } from "./http-deadline.ts";

let server: Server;
let base = "";
const open = new Set<import("node:net").Socket>();

before(async () => {
  server = createServer((req, res) => {
    if (req.url === "/ok") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ hello: "world" }));
    } else if (req.url === "/stall-body") {
      // Đầu về ngay, thân gửi nửa chừng rồi đứng im.
      res.writeHead(200, { "content-type": "application/json" });
      res.write('{"hello":');
    } else if (req.url === "/stall-header") {
      // Không gửi gì cả.
    } else if (req.url === "/slow-ok") {
      // Thân về chậm nhưng vẫn trong hạn.
      res.writeHead(200, { "content-type": "application/json" });
      res.write('{"hello":');
      setTimeout(() => res.end('"slow"}'), 80);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  server.on("connection", (socket) => {
    open.add(socket);
    socket.on("close", () => open.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  for (const socket of open) socket.destroy();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const get = (path: string) => (signal: AbortSignal) => fetch(base + path, { signal });
const json = (response: Response) => response.json() as Promise<{ hello: string }>;

describe("withDeadlines", () => {
  it("đọc xong trong hạn thì trả dữ liệu", async () => {
    const data = await withDeadlines(get("/ok"), json, { headerMs: 2000, bodyMs: 2000 });
    assert.equal(data.hello, "world");
  });

  it("thân về chậm nhưng còn trong hạn body thì vẫn đọc được", async () => {
    const data = await withDeadlines(get("/slow-ok"), json, { headerMs: 2000, bodyMs: 2000 });
    assert.equal(data.hello, "slow");
  });

  it("đầu về rồi thân đứng giữa chừng thì hết hạn body, không treo", async () => {
    const started = Date.now();
    await assert.rejects(
      withDeadlines(get("/stall-body"), json, { headerMs: 2000, bodyMs: 150 }),
      (error: unknown) => error instanceof DeadlineError && error.phase === "body" && error.ms === 150,
    );
    assert.ok(Date.now() - started < 1500, "phải dừng sớm theo hạn body");
  });

  it("máy chủ không gửi đầu thì hết hạn header", async () => {
    await assert.rejects(
      withDeadlines(get("/stall-header"), json, { headerMs: 150, bodyMs: 2000 }),
      (error: unknown) => error instanceof DeadlineError && error.phase === "header",
    );
  });

  it("người dùng hủy giữa lúc đọc thân thì ném AbortError, không phải hết hạn", async () => {
    const user = new AbortController();
    const run = withDeadlines(get("/stall-body"), json, { signal: user.signal, headerMs: 2000, bodyMs: 2000 });
    setTimeout(() => user.abort(), 100);
    await assert.rejects(run, (error: unknown) => error instanceof Error && error.name === "AbortError" && !(error instanceof DeadlineError));
  });

  it("đã hủy từ trước thì không gửi gì", async () => {
    const user = new AbortController();
    user.abort();
    let sent = false;
    await assert.rejects(
      withDeadlines(
        (signal) => {
          sent = true;
          return fetch(base + "/ok", { signal });
        },
        json,
        { signal: user.signal },
      ),
      (error: unknown) => error instanceof Error && error.name === "AbortError",
    );
    assert.equal(sent, false);
  });

  it("lỗi gốc không phải hạn chót thì giữ nguyên, ví dụ JSON hỏng", async () => {
    await assert.rejects(
      withDeadlines(get("/ok"), async (response) => JSON.parse((await response.text()) + "}"), { headerMs: 2000, bodyMs: 2000 }),
      (error: unknown) => error instanceof SyntaxError,
    );
  });
});
