import assert from "node:assert/strict";
import { test } from "node:test";
import { amzDate, awsEncode, awsEncodePath, presignUrl } from "./r2-sign.ts";

// Ví dụ chính thức của AWS (Authenticating Requests: Using Query Parameters).
test("presignUrl khớp chữ ký mẫu của AWS", async () => {
  const url = await presignUrl({
    method: "GET",
    target: { host: "examplebucket.s3.amazonaws.com", path: "/test.txt", region: "us-east-1", service: "s3" },
    creds: { accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
    expiresSeconds: 86400,
    now: new Date("2013-05-24T00:00:00Z"),
  });
  assert.ok(url.endsWith("X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404"));
  assert.ok(url.startsWith("https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request"));
});

test("presignUrl: PUT và GET ra chữ ký khác nhau, tên bucket kiểu path được giữ", async () => {
  const base = {
    target: { host: "acc.r2.cloudflarestorage.com", path: "/tyzo/u/1/a b.webm", region: "auto", service: "s3" },
    creds: { accessKeyId: "AK", secretAccessKey: "SK" },
    expiresSeconds: 600,
    now: new Date("2026-11-18T10:00:00Z"),
  } as const;
  const put = await presignUrl({ ...base, method: "PUT" });
  const get = await presignUrl({ ...base, method: "GET" });
  assert.notEqual(put.split("X-Amz-Signature=")[1], get.split("X-Amz-Signature=")[1]);
  assert.ok(put.startsWith("https://acc.r2.cloudflarestorage.com/tyzo/u/1/a%20b.webm?"));
  assert.ok(put.includes("X-Amz-Date=20261118T100000Z"));
  assert.ok(put.includes("X-Amz-Expires=600"));
});

test("presignUrl chặn thời hạn ngoài 1 giây đến 7 ngày", async () => {
  const input = {
    method: "GET",
    target: { host: "h", path: "/b/k", region: "auto", service: "s3" },
    creds: { accessKeyId: "a", secretAccessKey: "b" },
  } as const;
  await assert.rejects(() => presignUrl({ ...input, expiresSeconds: 0 }));
  await assert.rejects(() => presignUrl({ ...input, expiresSeconds: 604801 }));
});

test("awsEncode và awsEncodePath theo luật SigV4", () => {
  assert.equal(awsEncode("a b/c*d'e"), "a%20b%2Fc%2Ad%27e");
  assert.equal(awsEncodePath("/b/u 1/ä.webm"), "/b/u%201/%C3%A4.webm");
  assert.equal(amzDate(new Date("2026-11-18T10:00:00.123Z")), "20261118T100000Z");
});
