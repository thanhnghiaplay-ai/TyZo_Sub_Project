import assert from "node:assert/strict";
import { test } from "node:test";

import { trustedClientIp as readIp } from "./request-ip.server.ts";

test("R3-008: tunnel trusts only CF's configured IP header, never spoofed XFF", () => {
  const request = new Request("http://fixture.test", { headers: {
    "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.99", "x-real-ip": "198.51.100.98",
  } });
  assert.equal(readIp(request, "cf-connecting-ip"), "203.0.113.7");
});

test("R3-008: missing trusted header fails closed without trying untrusted headers", () => {
  const request = new Request("http://fixture.test", { headers: { "x-forwarded-for": "198.51.100.99" } });
  assert.equal(readIp(request, "cf-connecting-ip"), "");
});

test("R3-008: overwritten XFF chain uses the first valid address", () => {
  assert.equal(readIp(new Request("http://fixture.test", { headers: { "x-forwarded-for": "203.0.113.7, 127.0.0.1" } }), "x-forwarded-for"), "203.0.113.7");
});

test("R3-008: malformed IP, unknown header and multi-valued CF header are rejected", () => {
  for (const ip of ["not-an-ip", "203.0.113.7, 198.51.100.1", "203.0.113.7:123", "a".repeat(500)]) {
    assert.equal(readIp(new Request("http://fixture.test", { headers: { "cf-connecting-ip": ip } }), "cf-connecting-ip"), "");
  }
  assert.equal(readIp(new Request("http://fixture.test", { headers: { "x-forwarded-for": "203.0.113.7" } }), "untrusted-header"), "");
});
