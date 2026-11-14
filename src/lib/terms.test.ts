import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { TERMS_KEY, TERMS_VERSION, hasAcceptedTerms, rememberTermsAccepted, termsGate } from "./terms.ts";

const g = globalThis as { localStorage?: unknown };
const original = g.localStorage;

function fakeStorage(seed: Record<string, string> = {}, broken = false) {
  const data = { ...seed };
  g.localStorage = {
    getItem: (key: string) => {
      if (broken) throw new Error("chặn");
      return key in data ? data[key] : null;
    },
    setItem: (key: string, value: string) => {
      if (broken) throw new Error("chặn");
      data[key] = value;
    },
  };
  return data;
}

afterEach(() => {
  g.localStorage = original;
});

describe("termsGate", () => {
  it("đã đồng ý bản này thì vào thẳng, kể cả khi chưa biết đã đăng nhập chưa", () => {
    assert.equal(termsGate({ accepted: true, pending: true, signedIn: false }), "enter");
    assert.equal(termsGate({ accepted: true, pending: false, signedIn: true }), "enter");
  });

  it("chưa đồng ý: đợi biết đăng nhập chưa rồi mới quyết", () => {
    assert.equal(termsGate({ accepted: false, pending: true, signedIn: false }), "wait");
  });

  it("chưa có tài khoản thì sang trang đăng nhập, đã có tài khoản thì hỏi lại điều khoản", () => {
    assert.equal(termsGate({ accepted: false, pending: false, signedIn: false }), "login");
    assert.equal(termsGate({ accepted: false, pending: false, signedIn: true }), "ask");
  });
});

describe("đồng ý trên máy", () => {
  it("giữ khóa cũ nên người đã đồng ý bản hiện tại không bị hỏi lại", () => {
    assert.equal(TERMS_KEY, "gterms");
    fakeStorage({ gterms: TERMS_VERSION });
    assert.equal(hasAcceptedTerms(), true);
  });

  it("bản cũ hoặc chưa có thì chưa đồng ý (điều khoản đổi là hỏi lại)", () => {
    fakeStorage({ gterms: "2020-01-01.1" });
    assert.equal(hasAcceptedTerms(), false);
    fakeStorage();
    assert.equal(hasAcceptedTerms(), false);
  });

  it("ghi rồi đọc lại được", () => {
    const data = fakeStorage();
    assert.equal(rememberTermsAccepted(), true);
    assert.equal(data.gterms, TERMS_VERSION);
    assert.equal(hasAcceptedTerms(), true);
  });

  it("máy không cho lưu thì không vỡ, chỉ báo chưa đồng ý", () => {
    fakeStorage({}, true);
    assert.equal(rememberTermsAccepted(), false);
    assert.equal(hasAcceptedTerms(), false);
  });
});
