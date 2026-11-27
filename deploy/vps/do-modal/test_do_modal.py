"""RE6-004: kiểm Meter trong do-modal.py với máy chủ Modal giả trên loopback. Không gọi Modal thật."""
import importlib.util, json, os, threading, time, unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

spec = importlib.util.spec_from_file_location("do_modal", os.path.join(os.path.dirname(__file__), "do-modal.py"))
dm = importlib.util.module_from_spec(spec); spec.loader.exec_module(dm)

MODE = {"v": "ok"}
INFLIGHT = {"now": 0, "max": 0}
L = threading.Lock()


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body=None, loc=None):
        self.send_response(code)
        if loc:
            self.send_header("Location", loc)
        b = json.dumps(body).encode() if body is not None else b""
        self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0)); self.rfile.read(n)
        with L:
            INFLIGHT["now"] += 1; INFLIGHT["max"] = max(INFLIGHT["max"], INFLIGHT["now"])
        try:
            m = MODE["v"]
            if m == "slow":
                time.sleep(0.3)
            if m == "hang":
                time.sleep(3); return self._send(200, {"stats": {"giay_xu_ly": 1}})
            if m == "loop":
                return self._send(303, loc="/wait")
            if m == "offhost":
                return self._send(303, loc="http://evil.example/x")
            if m == "redirect-once":
                return self._send(303, loc="/done")
            stats = {"ok": {"giay_xu_ly": 36, "tien_model_chu_usd": 0.001}, "slow": {"giay_xu_ly": 36},
                     "nan": {"giay_xu_ly": float("nan")}, "neg": {"giay_xu_ly": -5}, "str": {"giay_xu_ly": "36"},
                     "nostats": None, "500": None}[m]
            if m == "500":
                return self._send(500, {"error": "x"})
            # json.dumps(nan) → NaN (Python json.loads đọc lại được), mô phỏng stats hỏng
            self._send(200, {"segs": [1, 2], **({"stats": stats} if stats is not None else {})})
        finally:
            with L:
                INFLIGHT["now"] -= 1

    def do_GET(self):
        if self.path == "/done":
            return self._send(200, {"segs": [1], "stats": {"giay_xu_ly": 36}})
        return self._send(303, loc="/wait")


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()
        cls.url = f"http://127.0.0.1:{cls.srv.server_address[1]}/run"

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def meter(self, mode, **kw):
        MODE["v"] = mode; INFLIGHT.update(now=0, max=0)
        kw.setdefault("deadline", 36); kw.setdefault("gpu_rate", 1.0); kw.setdefault("model_cap", 0.0)
        return dm.Meter(self.url, "tok-secret", "nhanh", read_clip=lambda lang: b"\0" * 32044, log=lambda *_: None, **kw)

    def test_known_cost_counts(self):
        m = self.meter("ok", budget=1.0)  # giữ chỗ 0.01/lệnh, thực 0.011
        m.call("zh", "lanh")
        self.assertAlmostEqual(m.spent, 0.011)
        self.assertEqual(m.held, 0)
        self.assertTrue(m.rows[0].get("vuot_giu_cho"))

    def test_parallel_cannot_exceed_budget(self):
        m = self.meter("slow", budget=0.025)  # chỉ đủ chỗ cho 2 lệnh 0.01
        ts = [threading.Thread(target=m.call, args=(lang, "song-song")) for lang in dm.CLIPS]
        [t.start() for t in ts]; [t.join() for t in ts]
        self.assertEqual(len(m.rows), 2); self.assertEqual(m.skipped, 2)
        self.assertLessEqual(INFLIGHT["max"], 2)
        self.assertLessEqual(m.spent, 0.025)

    def test_full_run_stays_under_budget(self):
        m = self.meter("ok", budget=0.05, model_cap=0.001)  # giữ chỗ 0.011 → tối đa 4 lệnh
        s = m.run()
        self.assertLessEqual(s["spent_usd_est"], 0.05 + 1e-9)
        self.assertEqual(s["calls"], 4); self.assertEqual(s["skipped_for_budget"], 13)
        self.assertIn("không tuyệt đối", s["budget_kind"])

    def test_timeout_charges_reserve_as_unknown(self):
        m = self.meter("hang", budget=1.0, deadline=0.5)
        t0 = time.monotonic(); m.call("ja", "nong-1")
        self.assertLess(time.monotonic() - t0, 2.5)
        r = m.rows[0]
        self.assertIn("error", r); self.assertTrue(r["usd_unknown"])
        self.assertAlmostEqual(m.unknown, m.reserve); self.assertAlmostEqual(m.spent, m.reserve)

    def test_invalid_stats_are_unknown(self):
        for mode in ("nan", "neg", "str", "nostats", "500"):
            with self.subTest(mode=mode):
                m = self.meter(mode, budget=1.0)
                m.call("ko", "nong-1")
                self.assertTrue(m.rows[0]["usd_unknown"]); self.assertAlmostEqual(m.spent, m.reserve)

    def test_redirect_cap_and_deadline(self):
        m = self.meter("loop", budget=1.0, max_redirects=5)
        m.call("en", "nong-1")
        self.assertIn("chuyển hướng", m.rows[0]["error"]); self.assertTrue(m.rows[0]["usd_unknown"])
        m = self.meter("loop", budget=1.0, max_redirects=10**6, deadline=0.3)
        t0 = time.monotonic(); m.call("en", "nong-1")
        self.assertLess(time.monotonic() - t0, 2); self.assertIn("hạn chót", m.rows[0]["error"])

    def test_redirect_same_host_followed_offhost_refused(self):
        m = self.meter("redirect-once", budget=1.0)
        m.call("zh", "nong-1")
        self.assertEqual(m.rows[0]["http"], 200); self.assertAlmostEqual(m.spent, 0.01)
        m = self.meter("offhost", budget=1.0)
        m.call("zh", "nong-1")
        self.assertIn("máy khác", m.rows[0]["error"])

    def test_bad_config_rejected_and_token_not_in_rows(self):
        for bad in (float("nan"), -1.0, float("inf")):
            with self.assertRaises(ValueError):
                self.meter("ok", budget=bad)
        m = self.meter("ok", budget=1.0); m.call("zh", "lanh")
        self.assertNotIn("tok-secret", json.dumps({"s": m.summary(), "r": m.rows}))


if __name__ == "__main__":
    unittest.main()
