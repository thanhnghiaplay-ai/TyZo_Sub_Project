/**
 * RE8-010: header xác thực proxy Modal cho lời gọi GPU từ máy chủ web. fetch giả, KHÔNG gọi Modal.
 * Kiểm: gửi ở POST và mọi lần hỏi lại 303; không gửi khi chưa cấu hình; cấu hình dở dang dừng trước khi gọi;
 * lỗi không lộ giá trị; bí mật không xuất hiện ở mã khách, Android hay kho.
 */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
import { after, beforeEach, describe, it } from "node:test";
import { UncertainUpstreamError } from "../billing/upstream-outcome.ts";
import { modalProxyHeaders, recognizeModalWav, isTransientModalError } from "./tyzo-modal.server.ts";

const exec = promisify(execFile);
const KEY = "wk-fixture-key-123";
const SECRET = "ws-fixture-secret-456";
const PRICE = { gpuUsdPerHour: 0.8, overhead: 3 };
const original = globalThis.fetch;
const saved = { ...process.env };
let calls: { url: string; method: string; headers: Record<string, string> }[] = [];

function fakeModal(redirects: number) {
  let left = redirects;
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    calls.push({ url: String(input), method: init?.method ?? "GET", headers });
    // Mô phỏng proxy Modal khi bật requires_proxy_auth: thiếu header → 401 trước khi tới máy.
    if (process.env.FAKE_REQUIRE === "1" && (headers["modal-key"] !== KEY || headers["modal-secret"] !== SECRET))
      return new Response("missing credentials", { status: 401 });
    const res = left-- > 0
      ? new Response(null, { status: 303, headers: { location: "https://tyzo--asr-run.modal.run/result/abc" } })
      : Response.json({ segs: [{ text: "你好", start: 0, end: 1 }], stats: { giay_xu_ly: 3.6, tien_model_chu_usd: 0 } });
    Object.defineProperty(res, "url", { value: String(input) }); // fetch thật luôn có url
    return res;
  }) as typeof fetch;
}
const run = () => recognizeModalWav(new Uint8Array(64), "zh", "nhanh", 0, new AbortController().signal, PRICE);

beforeEach(() => {
  calls = [];
  for (const k of ["TYZO_PROXY_KEY", "TYZO_PROXY_SECRET", "FAKE_REQUIRE"]) delete process.env[k];
  process.env.TYZO_ASR_URL = "https://tyzo--asr-run.modal.run";
  process.env.TYZO_ASR_TOKEN = "asr-token-fixture";
});
after(() => {
  globalThis.fetch = original;
  process.env = saved;
});

describe("RE8-010 · header proxy Modal phía máy chủ", () => {
  it("chưa cấu hình: không gửi header (endpoint chưa bật xác thực chạy như cũ)", async () => {
    fakeModal(1);
    const r = await run();
    assert.equal(r.segments.length, 1);
    assert.ok(calls.every((c) => !("modal-key" in c.headers) && !("modal-secret" in c.headers)));
  });

  it("đã cấu hình: gửi ở POST và ở CẢ 3 lần hỏi lại 303; endpoint bật xác thực nhận được", async () => {
    process.env.TYZO_PROXY_KEY = KEY;
    process.env.TYZO_PROXY_SECRET = SECRET;
    process.env.FAKE_REQUIRE = "1";
    fakeModal(3);
    const r = await run();
    assert.equal(r.segments.length, 1);
    assert.equal(calls.length, 4);
    assert.equal(calls[0].method, "POST");
    for (const c of calls) assert.deepEqual([c.headers["modal-key"], c.headers["modal-secret"]], [KEY, SECRET]);
  });

  it("endpoint đã bật xác thực mà máy chủ thiếu token: 401 rõ ràng, coi là bị từ chối (không phải mất phản hồi)", async () => {
    process.env.FAKE_REQUIRE = "1";
    fakeModal(0);
    await assert.rejects(run(), (e: Error) => /HTTP 401/.test(e.message) && e.constructor.name === "ModalHttpError");
  });

  it("giữ câu đầu đoạn có đệm thời gian âm trong phản hồi Modal", async () => {
    globalThis.fetch = async () => Response.json({
      segs: [{ text: "最初の言葉", start: 0.02 - 0.15, end: 0.7 }, { text: "次の言葉", start: 0.9, end: 1.8 }],
      stats: { giay_xu_ly: 3.6, tien_model_chu_usd: 0 },
    });
    const result = await recognizeModalWav(new Uint8Array(64), "ja", "ky", 12, new AbortController().signal, PRICE);
    assert.deepEqual(result.segments.map(({ original, start, end }) => [original, start, end]), [
      ["最初の言葉", 12, 12.7],
      ["次の言葉", 12.9, 13.8],
    ]);
    assert.ok(result.usd > 0);
  });

  it("từ chối câu có thời gian sai ngoài phần đệm đầu đoạn", async () => {
    for (const [start, end] of [[-1, 0.5], [-0.1, -0.05], [0.6, 0.5]]) {
      globalThis.fetch = async () => Response.json({
        segs: [{ text: "字", start, end }],
        stats: { giay_xu_ly: 3.6, tien_model_chu_usd: 0 },
      });
      await assert.rejects(run(), /thiếu chữ hoặc sai thời gian/);
    }
  });

  it("chỉ 429 của POST đầu là từ chối có thể thử gửi lại", async () => {
    globalThis.fetch = (async () => new Response(null, { status: 429 })) as typeof fetch;
    await assert.rejects(run(), isTransientModalError);
  });

  for (const status of [401, 404, 429]) {
    it(`HTTP ${status} khi hỏi kết quả 303 cần đối soát và không được gửi lại POST`, async () => {
      const methods: string[] = [];
      globalThis.fetch = (async (_url: URL, init?: RequestInit) => {
        methods.push(init?.method ?? "GET");
        if (init?.method !== "POST") return new Response(null, { status });
        const redirect = new Response(null, { status: 303, headers: { location: "/result/abc" } });
        Object.defineProperty(redirect, "url", { value: "https://tyzo--asr-run.modal.run" });
        return redirect;
      }) as typeof fetch;
      await assert.rejects(run(), (error: unknown) =>
        error instanceof UncertainUpstreamError && !isTransientModalError(error));
      assert.deepEqual(methods, ["POST", "GET"]);
    });
  }

  it("cấu hình dở dang hoặc sai dạng: lỗi trước khi gọi GPU, thông báo không chứa giá trị", async () => {
    fakeModal(0);
    for (const env of [{ TYZO_PROXY_KEY: KEY }, { TYZO_PROXY_SECRET: SECRET }, { TYZO_PROXY_KEY: "wk bad", TYZO_PROXY_SECRET: SECRET },
      { TYZO_PROXY_KEY: "x".repeat(201), TYZO_PROXY_SECRET: SECRET }]) {
      assert.throws(() => modalProxyHeaders(env), (e: Error) => !e.message.includes(KEY) && !e.message.includes(SECRET));
      Object.assign(process.env, env);
      await assert.rejects(run(), (e: Error) => !e.message.includes(SECRET) && !e.message.includes(KEY));
      for (const k of ["TYZO_PROXY_KEY", "TYZO_PROXY_SECRET"]) delete process.env[k];
    }
    assert.equal(calls.length, 0, "không gọi Modal khi cấu hình sai");
  });

  it("server function kiểm cấu hình proxy trước khi giữ Token", () => {
    const src = readFileSync(new URL("../tyzo-modal-call.ts", import.meta.url), "utf8");
    const check = src.indexOf("modalProxyHeaders();");
    assert.ok(check > 0 && check < src.indexOf("runModalPartWith(sql"), "kiểm trước runModalPartWith");
  });

  it("bí mật chỉ ở phía máy chủ: không có trong mã khách, Android, workflow hay giá trị thật trong kho", async () => {
    const root = new URL("../../../", import.meta.url).pathname;
    const { stdout } = await exec("git", ["-C", root, "grep", "-l", "TYZO_PROXY_", "--", ".", ":(exclude)graphify-out/**"]);
    const hits = stdout.trim().split("\n").filter(Boolean);
    const allowed = /^(src\/lib\/sub\/tyzo-modal\.server\.ts|src\/lib\/sub\/re8-010\.test\.ts|eval\/asr\/luong-ky\/modal\/(modal_auth|modal_app|test_modal_auth)\.py|eval\/asr\/luong-ky\/modal\/cau-hinh\.json|eval\/asr\/luong-ky\/pml\.py|deploy\/modal\/tyzo-ai\.sh|deploy\/vps\/do-modal\/do-modal\.py|docs\/.*)$/;
    assert.deepEqual(hits.filter((f) => !allowed.test(f)), [], "chỉ mã máy chủ, script quản trị và hồ sơ được nhắc tới");
    assert.ok(!hits.some((f) => f.startsWith("android/") || /\.tsx$/.test(f) || f.startsWith(".github/")));
    let values = "";
    try {
      values = (await exec("git", ["-C", root, "grep", "-nE", "TYZO_PROXY_(KEY|SECRET)=(wk|ws)-"])).stdout.trim();
    } catch (e) {
      if ((e as { code?: number }).code !== 1) throw e; // git grep trả 1 = không có dòng nào khớp (đúng mong muốn)
    }
    assert.equal(values, "", "không có giá trị token thật trong kho");
  });
});
