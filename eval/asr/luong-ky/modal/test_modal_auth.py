"""RE8-010 + hồ sơ GPU thử nghiệm: header proxy Modal và cờ requires_proxy_auth. Proxy Modal GIẢ trên loopback.
Chạy: python3 -I -B test_modal_auth.py (không cần modal, không gọi Modal)."""
import ast, importlib.util, json, os, sys, threading, unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


auth = load("modal_auth", os.path.join(HERE, "modal_auth.py"))
gl = load("gpu_limits", os.path.join(HERE, "gpu_limits.py"))
CFG = json.load(open(os.path.join(HERE, "cau-hinh.json")))
APP = open(os.path.join(HERE, "modal_app.py")).read()
KEY, SECRET = "wk-fixture", "ws-fixture"
SEEN = []


class Proxy(BaseHTTPRequestHandler):
    """Giả proxy Modal bật requires_proxy_auth: thiếu/sai header → 401 (máy không nhận việc)."""
    def log_message(self, *a):
        pass

    def _auth(self):
        SEEN.append((self.command, self.path, self.headers.get("Modal-Key"), self.headers.get("Modal-Secret"), self.headers.get("Authorization")))
        if (self.headers.get("Modal-Key"), self.headers.get("Modal-Secret")) != (KEY, SECRET):
            self.send_response(401); self.end_headers(); return False
        return True

    def _json(self, obj):
        b = json.dumps(obj).encode(); self.send_response(200); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if not self._auth(): return
        if self.path == "/run":
            self.send_response(303); self.send_header("Location", "/result/1"); self.end_headers(); return
        self._json({"choices": [{"message": {"content": "{}"}}], "usage": {"prompt_tokens": 1, "completion_tokens": 1}})

    def do_GET(self):
        if not self._auth(): return
        self._json({"segs": [], "stats": {}})


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), Proxy)
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()
        cls.base = f"http://127.0.0.1:{cls.srv.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def setUp(self):
        SEEN.clear()
        for k in ("TYZO_PROXY_KEY", "TYZO_PROXY_SECRET"):
            os.environ.pop(k, None)

    def test_proxy_headers(self):
        self.assertEqual(auth.proxy_headers({}), {})
        self.assertEqual(auth.proxy_headers({"TYZO_PROXY_KEY": KEY, "TYZO_PROXY_SECRET": SECRET}), {"Modal-Key": KEY, "Modal-Secret": SECRET})
        for bad in ({"TYZO_PROXY_KEY": KEY}, {"TYZO_PROXY_SECRET": SECRET}, {"TYZO_PROXY_KEY": "wk x", "TYZO_PROXY_SECRET": SECRET},
                    {"TYZO_PROXY_KEY": "x" * 201, "TYZO_PROXY_SECRET": SECRET}, {"TYZO_PROXY_KEY": " wk", "TYZO_PROXY_SECRET": SECRET}):
            with self.assertRaises(auth.ProxyAuthConfigError) as cm:
                auth.proxy_headers(bad)
            self.assertNotIn(SECRET, str(cm.exception)); self.assertNotIn(KEY, str(cm.exception))

    def test_flag_default_off_and_only_true_enables(self):
        self.assertIs(gl.proxy_auth(CFG), False, "mặc định tắt = như cũ")
        for v, want in ((True, True), ("true", False), (1, False), (None, False), (False, False)):
            self.assertIs(gl.proxy_auth({"gpu": {"xac_thuc_proxy": v}}), want, repr(v))

    def test_decorators_use_flag(self):
        tree = ast.parse(APP)
        calls = [n for n in ast.walk(tree) if isinstance(n, ast.Call) and getattr(n.func, "attr", "") in ("fastapi_endpoint", "web_server")]
        self.assertEqual(len(calls), 3, "Asr.run + 2 dạng máy model chữ")
        for c in calls:
            kw = {k.arg: k.value for k in c.keywords}
            self.assertIn("requires_proxy_auth", kw)
            self.assertEqual(getattr(kw["requires_proxy_auth"], "id", None), "PROXY_AUTH")

    def test_profiles_trial_and_rollback(self):
        cur = {"gpu": dict(CFG["gpu"], ho_so_gpu="hien_tai")}
        trial = {"gpu": dict(CFG["gpu"], ho_so_gpu="thu_nghiem")}
        a, l = gl.asr_limits(cur), gl.llm_limits(cur)
        self.assertEqual((a["max_containers"], a["buffer_containers"], a["scaledown_window"], l["max_containers"], l["scaledown_window"]), (9, 2, 60, 2, 60))
        a, l = gl.asr_limits(trial), gl.llm_limits(trial)
        self.assertEqual((a["max_containers"], a["buffer_containers"], a["scaledown_window"], l["max_containers"], l["scaledown_window"]), (9, 1, 30, 2, 60),
                         "thử nghiệm: máy chữ 2, nhận dạng 9, dự phòng 1, nhận dạng tắt sau 30 s; máy chữ giữ 60 s (nhịp /health 30 s)")
        self.assertEqual(gl.profile_name({"gpu": {"ho_so_gpu": "16-may"}}), "hien_tai", "hồ sơ lạ → như cũ")
        self.assertEqual(gl.profile_name(CFG), "hien_tai", "cau-hinh.json đang ở hồ sơ cũ (chưa áp dụng thử nghiệm)")

    def test_asr_client_sends_headers_through_303(self):
        import asr_client
        os.environ.update(TYZO_PROXY_KEY=KEY, TYZO_PROXY_SECRET=SECRET)
        r, _ = asr_client.request_asr(b"x", "wav", "zh", "nhanh", self.base + "/run", "tok")
        self.assertEqual(r, {"segs": [], "stats": {}})
        self.assertEqual([(m, p, k, s) for m, p, k, s, _ in SEEN], [("POST", "/run", KEY, SECRET), ("GET", "/result/1", KEY, SECRET)])

    def test_asr_client_without_token_rejected(self):
        import asr_client
        with self.assertRaises(RuntimeError) as cm:
            asr_client.request_asr(b"x", "wav", "zh", "nhanh", self.base + "/run", "tok")
        self.assertIn("401", str(cm.exception))

    def test_local_chat_keeps_vllm_bearer_and_adds_proxy(self):
        sys.path.insert(0, os.path.dirname(HERE))
        src = open(os.path.join(os.path.dirname(HERE), "pml.py")).read()
        tree = ast.parse(src)
        fns = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in ("_proxy_headers", "local_chat", "_count")}
        ns = {"os": os, "json": json, "__file__": os.path.join(os.path.dirname(HERE), "pml.py")}
        for name in ("_proxy_headers", "local_chat"):
            exec(compile(ast.Module(body=[fns[name]], type_ignores=[]), "pml.py", "exec"), ns)
        ns["_count"] = lambda *a: None
        os.environ.update(TYZO_PROXY_KEY=KEY, TYZO_PROXY_SECRET=SECRET, LLM_BASE=self.base, LLM_KEY="vllm-key")
        try:
            self.assertEqual(ns["local_chat"]([{"role": "user", "content": "x"}], "m"), "{}")
        finally:
            os.environ.pop("LLM_BASE"); os.environ.pop("LLM_KEY")
        self.assertEqual(SEEN[-1][2:], (KEY, SECRET, "Bearer vllm-key"))

    def test_backend_health_poll_uses_proxy_headers(self):
        src = open(os.path.join(HERE, "backend.py")).read()
        self.assertIn('urllib.request.Request(base.rstrip("/") + "/health", headers=pml_proxy_headers())', src)
        self.assertIn("pml_proxy_headers = pml._proxy_headers", src)

    def test_scripts_use_shared_helper(self):
        for rel in ("goi_thu.py", "bat_may_chu.py", "asr_client.py", "../../fleurs-ko/translate.py", "../../mau-da-ra-soat/dich_zh_vi.py"):
            self.assertIn("**proxy_headers()", open(os.path.join(HERE, rel)).read(), rel)


if __name__ == "__main__":
    unittest.main()
