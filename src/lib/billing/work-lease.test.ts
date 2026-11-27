/**
 * RE3-003: nhịp sống của lease. Tối đa MỘT nhịp đang chạy mỗi lease; CSDL chậm không làm chồng truy vấn;
 * dừng giữa nhịp chờ nhịp đó xong; mất lease (0 dòng / quá hạn) được báo, không nuốt im.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import * as lease from "./work-lease.ts";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("RE3-003: CSDL treo lâu hơn nhịp → không chồng nhịp (tối đa 1 đang chạy)", async () => {
  let running = 0,
    peak = 0,
    calls = 0;
  const stop = lease.startBeat(async () => {
    calls += 1;
    running += 1;
    peak = Math.max(peak, running);
    await wait(120); // CSDL chậm: mỗi nhịp 120 ms, nhịp đặt 20 ms
    running -= 1;
    return [{ id: "x" }];
  }, 20);
  await wait(500);
  await stop();
  assert.equal(peak, 1, `có ${peak} nhịp chạy cùng lúc`);
  assert.ok(calls >= 2, `chỉ ${calls} nhịp`);
});

test("RE3-003: dừng giữa nhịp → stop() chờ nhịp đang chạy, không có nhịp mới sau stop", async () => {
  let started = 0,
    finished = 0;
  const stop = lease.startBeat(async () => {
    started += 1;
    await wait(100);
    finished += 1;
    return [1];
  }, 10);
  await wait(40);
  const p = stop();
  assert.ok(p && typeof (p as Promise<void>).then === "function", "stop() phải trả promise chờ được");
  await p;
  assert.equal(started, finished, "stop() trả về khi nhịp còn đang chạy");
  const after = started;
  await wait(100);
  assert.equal(started, after, "có nhịp mới sau khi đã dừng");
});

test("RE3-003: nhịp cập nhật 0 dòng (lease đã bị thay/đánh unknown) → báo mất lease, ngừng nhịp", async () => {
  const lost: string[] = [];
  let calls = 0;
  const startBeat = lease.startBeat as unknown as (
    b: () => Promise<unknown>,
    o: { everyMs: number; onLost: (why: string) => void },
  ) => () => Promise<void>;
  const stop = startBeat(
    async () => {
      calls += 1;
      return calls >= 2 ? [] : [{ id: "x" }];
    },
    { everyMs: 15, onLost: (why) => lost.push(why) },
  );
  await wait(150);
  await stop();
  assert.deepEqual(lost, ["fenced"]);
  assert.equal(calls, 2, "vẫn nhịp tiếp sau khi đã mất lease");
});

test("RE3-003: lỗi liên tục tới quá hạn lease → báo mất lease theo hạn, đếm lỗi (không nuốt im)", async () => {
  const lost: string[] = [];
  const startBeat = lease.startBeat as unknown as (
    b: () => Promise<unknown>,
    o: { everyMs: number; staleMs: number; onLost: (why: string) => void },
  ) => () => Promise<void>;
  const before = (lease as unknown as { leaseMetrics?: () => { failures: number } }).leaseMetrics?.().failures ?? -1;
  const stop = startBeat(
    async () => {
      throw new Error("db down");
    },
    { everyMs: 10, staleMs: 80, onLost: (why) => lost.push(why) },
  );
  await wait(200);
  await stop();
  assert.deepEqual(lost, ["deadline"]);
  const metrics = (lease as unknown as { leaseMetrics?: () => { failures: number } }).leaseMetrics;
  assert.ok(metrics, "thiếu số đo lease");
  assert.ok(metrics().failures > before);
});

test("RE3-003: nhịp có jitter ±10% để các lease không dồn cùng lúc", () => {
  const nextDelay = (lease as unknown as { nextDelay?: (ms: number, r: number) => number }).nextDelay;
  assert.ok(nextDelay, "thiếu hàm jitter");
  assert.equal(nextDelay(30_000, 0), 27_000);
  assert.equal(nextDelay(30_000, 0.5), 30_000);
  assert.equal(nextDelay(30_000, 0.999999), 32_999);
});
