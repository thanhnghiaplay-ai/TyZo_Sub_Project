import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isTransientNetworkError, pollUntilDone, type PollStep } from "./poll-loop.ts";

const noSleep = async () => {};
type R = { seconds: number };
const done: PollStep<R> = { state: "done", seconds: 12 };
const running: PollStep<R> = { state: "running" };

function steps(list: Array<PollStep<R> | Error>) {
  let i = 0;
  let calls = 0;
  return {
    step: async () => {
      calls += 1;
      const item = list[Math.min(i, list.length - 1)];
      i += 1;
      if (item instanceof Error) throw item;
      return item;
    },
    calls: () => calls,
  };
}
const base = { intervalMs: 3000, maxWaitMs: 10 * 60 * 1000, tooLongMessage: "quá lâu", sleep: noSleep };

describe("vòng hỏi lặp phía khách", () => {
  it("hỏi tới khi xong rồi dừng", async () => {
    const s = steps([running, running, done]);
    const out = await pollUntilDone({ ...base, step: s.step, signal: new AbortController().signal });
    assert.equal(out.seconds, 12);
    assert.equal(s.calls(), 3);
  });

  it("lỗi mạng tạm thời thì thử lại và vẫn lấy được kết quả", async () => {
    const s = steps([new Error("Failed to fetch"), new Error("Load failed"), done]);
    const out = await pollUntilDone({ ...base, step: s.step, signal: new AbortController().signal });
    assert.equal(out.state, "done");
    assert.equal(s.calls(), 3);
  });

  it("lỗi mạng liên tiếp quá số lần cho phép thì bỏ cuộc với câu rõ", async () => {
    const s = steps([new Error("Failed to fetch")]);
    await assert.rejects(pollUntilDone({ ...base, step: s.step, signal: new AbortController().signal, maxNetworkRetries: 2 }), /Mất kết nối/);
    assert.equal(s.calls(), 3);
  });

  it("lỗi thật của nhà (key sai, file hỏng) thì dừng ngay, không thử lại", async () => {
    const s = steps([new Error("AssemblyAI: key không đúng.")]);
    await assert.rejects(pollUntilDone({ ...base, step: s.step, signal: new AbortController().signal }), /key không đúng/);
    assert.equal(s.calls(), 1);
  });

  it("một lần thành công làm đếm lỗi mạng về 0", async () => {
    const net = new Error("timeout");
    const s = steps([net, net, running, net, net, done]);
    const out = await pollUntilDone({ ...base, step: s.step, signal: new AbortController().signal, maxNetworkRetries: 2 });
    assert.equal(out.state, "done");
  });

  it("hủy giữa chừng thì ném AbortError và không hỏi nữa", async () => {
    const controller = new AbortController();
    let calls = 0;
    const step = async (): Promise<PollStep<R>> => {
      calls += 1;
      controller.abort();
      return running;
    };
    await assert.rejects(pollUntilDone({ ...base, step, signal: controller.signal }), (e: Error) => e.name === "AbortError");
    assert.equal(calls, 1);
  });

  it("quá thời gian chờ tối đa thì báo câu được truyền vào", async () => {
    let t = 0;
    const s = steps([running]);
    await assert.rejects(
      pollUntilDone({ ...base, step: s.step, signal: new AbortController().signal, maxWaitMs: 10_000, now: () => (t += 4000) }),
      /quá lâu/,
    );
  });

  it("phân loại lỗi mạng đúng", () => {
    assert.equal(isTransientNetworkError(new Error("Failed to fetch")), true);
    assert.equal(isTransientNetworkError(new Error("Request timed out")), true);
    assert.equal(isTransientNetworkError(new Error("HTTP 503")), true);
    assert.equal(isTransientNetworkError(new Error("Không kết nối được Soniox.")), true);
    assert.equal(isTransientNetworkError(new Error("AssemblyAI: key không đúng.")), false);
    assert.equal(isTransientNetworkError("x"), false);
    const abort = new Error("Đã hủy.");
    abort.name = "AbortError";
    assert.equal(isTransientNetworkError(abort), false);
  });
});
