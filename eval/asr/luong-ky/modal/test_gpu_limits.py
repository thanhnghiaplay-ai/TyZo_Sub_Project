"""RE8-008: trần GPU tính từ cấu hình. Chạy: python3 -I -B test_gpu_limits.py (không cần modal)."""
import ast, json, os, unittest, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("gpu_limits", os.path.join(HERE, "gpu_limits.py"))
gl = importlib.util.module_from_spec(spec); spec.loader.exec_module(gl)
CFG = json.load(open(os.path.join(HERE, "cau-hinh.json")))
APP = open(os.path.join(HERE, "modal_app.py")).read()


class T(unittest.TestCase):
    def test_current_config_values(self):
        a = gl.asr_limits(CFG, None); l = gl.llm_limits(CFG, None); c = gl.llm_concurrency(CFG)
        self.assertEqual((a["max_containers"], a["buffer_containers"], a["scaledown_window"], a["timeout"], a["min_containers"]), (9, 2, 60, 1800, 0))
        self.assertEqual((l["max_containers"], l["scaledown_window"], l["timeout"], l["min_containers"]), (2, 60, 86400, 0))
        self.assertEqual((c["max_inputs"], c["target_inputs"]), (64, 64), "giữ hành vi co giãn cũ, chỉ thêm trần")

    def test_app_lane_fits_asr(self):
        self.assertLessEqual(gl.APP_MODAL_LANE, gl.asr_limits(CFG)["max_containers"])

    def test_bad_or_hostile_values_are_clamped(self):
        bad = {"gpu": {"may_chu_toi_da": 10_000, "may_nhan_dang_toi_da": "abc", "may_du_phong_nhan_dang": 99,
                       "tat_may_chu_sau_giay": 10**9, "tat_may_nhan_dang_sau_giay": -5, "yeu_cau_may_chu_toi_da": 0,
                       "yeu_cau_may_chu_muc_tieu": 10**6}}
        a = gl.asr_limits(bad, "500"); l = gl.llm_limits(bad, "-3"); c = gl.llm_concurrency(bad)
        self.assertEqual(l["max_containers"], 4)
        self.assertEqual(a["max_containers"], 9)
        self.assertEqual(a["buffer_containers"], 8)
        self.assertLess(a["buffer_containers"], a["max_containers"])
        self.assertEqual((l["scaledown_window"], a["scaledown_window"]), (1200, 2))
        self.assertEqual((a["min_containers"], l["min_containers"]), (9, 0))
        self.assertEqual((c["max_inputs"], c["target_inputs"]), (1, 1))
        for cfg in ({}, None, {"gpu": None}, {"gpu": [1]}, "x"):
            self.assertEqual(gl.llm_limits(cfg)["max_containers"], 2)

    def test_warm_never_exceeds_cap(self):
        self.assertEqual(gl.llm_limits({"gpu": {"may_chu_toi_da": 1}}, "3")["min_containers"], 1)

    def test_modal_app_uses_limits_everywhere(self):
        tree = ast.parse(APP)
        llm_kw = next(n for n in ast.walk(tree) if isinstance(n, ast.Assign) and getattr(n.targets[0], "id", "") == "LLM_KW")
        keys = {k.arg for k in llm_kw.value.keywords}
        self.assertTrue({"max_containers", "scaledown_window", "timeout", "min_containers"} <= keys, keys)
        self.assertNotIn("max_inputs=64", APP)
        self.assertEqual(APP.count('@modal.concurrent(max_inputs=LLM_CONC["max_inputs"], target_inputs=LLM_CONC["target_inputs"])'), 2)
        self.assertIn('max_containers=ASR_LIM["max_containers"]', APP)
        self.assertIn('"gpu_limits.py"), "/root/luong-ky/modal/gpu_limits.py")', APP, "ảnh máy chữ phải có gpu_limits.py")


if __name__ == "__main__":
    unittest.main()
