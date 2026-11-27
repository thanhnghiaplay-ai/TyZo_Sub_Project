/* global __ENV, __ITER */
// k6 loopback acceptance for the production Node build, using public pages.
import http from "k6/http";
import { check, sleep } from "k6";

const base = __ENV.TYZO_AUDIT_WEB_BASE || "http://127.0.0.1:17750";
if (!/^http:\/\/127\.0\.0\.1:[0-9]+$/.test(base)) throw new Error("Loopback base URL required");

export const options = {
  scenarios: {
    visitors: {
      executor: "constant-vus",
      vus: 300,
      duration: __ENV.TYZO_AUDIT_WEB_DURATION || "60m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<300"],
    checks: ["rate>0.99"],
  },
};

export default function () {
  const path = __ITER % 4 === 0 ? "/login" : "/gioi-thieu";
  const response = http.get(base + path, { tags: { name: path }, timeout: "5s" });
  check(response, {
    "HTTP 200 with rendered HTML": (r) =>
      r.status === 200 && (r.headers["Content-Type"] || "").includes("text/html") && r.body.length > 1024,
  });
  sleep(2 + Math.random() * 3);
}
