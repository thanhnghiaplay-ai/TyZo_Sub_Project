import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PAY_KEY, payState, readPayChoice, rememberPayChoice, rentAccess } from "./pay-status.ts";

const NOW = Date.parse("2026-11-21T12:00:00Z");
const base = { units: 0, plan: null, planUntil: null, trialLeft: 0 };
const plan = { ...base, plan: "tuan", planUntil: "2026-11-25T12:00:00Z" };
const trial = { ...base, trialLeft: 1 };

describe("trạng thái cách trả ở trang chủ", () => {
  it("chưa đọc được tài khoản: đang đọc, hoặc lỗi để thử lại; không đoán", () => {
    assert.deepEqual(payState({ choice: "key", account: null, failed: false, keys: [], turnOpen: true }), { kind: "reading" });
    assert.deepEqual(payState({ choice: "key", account: null, failed: true, keys: [], turnOpen: true }), { kind: "failed" });
  });

  it("chưa chọn lần nào: hai cách ngang hàng; cửa trả theo lượt đóng thì đi thẳng cách key", () => {
    assert.deepEqual(payState({ choice: null, account: trial, failed: false, keys: [], turnOpen: true }), { kind: "choose", turnOpen: true });
    assert.equal(payState({ choice: null, account: trial, failed: false, keys: [], turnOpen: false }).kind, "key-none");
  });

  it("thuê phòng: có key thì sẵn sàng; chưa có key thì không chặn, chỉ bước tiếp; hết hạn thì gia hạn hoặc dùng Token", () => {
    assert.deepEqual(payState({ choice: "key", account: plan, failed: false, keys: ["Groq"], turnOpen: true, now: NOW }), {
      kind: "key-ready",
      access: { kind: "plan", until: plan.planUntil },
      keys: ["Groq"],
    });
    assert.deepEqual(payState({ choice: "key", account: plan, failed: false, keys: [], turnOpen: true, now: NOW }), {
      kind: "key-none",
      access: { kind: "plan", until: plan.planUntil },
      turnOpen: true,
    });
    assert.equal(payState({ choice: "key", account: trial, failed: false, keys: [], turnOpen: true, now: NOW }).kind, "key-none", "dùng thử cũng cần key");
    assert.deepEqual(payState({ choice: "key", account: base, failed: false, keys: ["Groq"], turnOpen: true, now: NOW }), { kind: "key-expired", turnOpen: true });
    const expired = { ...plan, planUntil: "2026-11-20T00:00:00Z" };
    assert.equal(payState({ choice: "key", account: expired, failed: false, keys: ["Groq"], turnOpen: true, now: NOW }).kind, "key-expired");
  });

  it("trả theo lượt: còn hay hết Token; cửa đang bảo trì thì lùi về key", () => {
    assert.deepEqual(payState({ choice: "turn", account: { ...base, units: 500 }, failed: false, keys: [], turnOpen: true }), { kind: "turn", units: 500 });
    assert.deepEqual(payState({ choice: "turn", account: base, failed: false, keys: [], turnOpen: true }), { kind: "turn-empty" });
    assert.equal(payState({ choice: "turn", account: { ...plan, units: 500 }, failed: false, keys: ["Groq"], turnOpen: false, now: NOW }).kind, "key-ready");
  });

  it("gói còn hạn thắng dùng thử", () => {
    assert.equal(rentAccess({ ...plan, trialLeft: 1 }, NOW).kind, "plan");
    assert.equal(rentAccess(trial, NOW).kind, "trial");
  });

  it("nhớ cách trả trên máy; kho hỏng hay bị chặn thì coi như chưa chọn, không ném lỗi", () => {
    const data = new Map<string, string>();
    const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    assert.equal(readPayChoice(store), null);
    rememberPayChoice(store, "turn");
    assert.equal(data.get(PAY_KEY), "turn");
    assert.equal(readPayChoice(store), "turn");
    data.set(PAY_KEY, "lung tung");
    assert.equal(readPayChoice(store), null);
    const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } };
    assert.equal(readPayChoice(broken), null);
    assert.doesNotThrow(() => rememberPayChoice(broken, "key"));
  });
});
