"""Dịch vụ nhận dạng trên Modal: máy nhận dạng (GPU L4) + máy model chữ (Qwen3.8-27B, GPU L40S). Cả hai tự tắt khi không có việc.

Cài và quản lý bằng lệnh `tyzo-ai` (deploy/modal/tyzo-ai.sh). Làm tay:
    modal secret create tyzo-asr ALI_API_KEY=sk-... ALI_WORKSPACE=ws-... TYZO_ASR_TOKEN=... TYZO_FUSE=gpu
    modal deploy eval/asr/luong-ky/modal/modal_app.py
Biến lúc deploy (tùy chọn): TYZO_ASR_WARM / TYZO_LLM_WARM = số máy luôn bật (mặc định 0).

Gọi: POST <địa chỉ Asr.run>  JSON {"token", "audio_b64", "ext", "lang", "profile"} → {"srt", "segs", "stats"}. Xem goi_thu.py.
Luồng (profile) và cách hợp nhất: cau-hinh.json.
"""
import json, os
import modal

HERE = os.path.dirname(os.path.abspath(__file__))
LUONG = os.path.dirname(HERE)
# Trên máy Modal tệp này nằm ở /root, còn cấu hình được chép vào /root/luong-ky/modal.
_CFG_PATH = next((p for p in (os.path.join(HERE, "cau-hinh.json"), "/root/luong-ky/modal/cau-hinh.json") if os.path.exists(p)), None)
CFG = json.load(open(_CFG_PATH)) if _CFG_PATH else {   # dự phòng: không thấy tệp thì dùng mặc định, không làm máy lỗi
    "hop_nhat": {"gpu": {"model": "Qwen/Qwen3.8-27B-FP8"}}, "gpu": {"nhan_dang": ["L4", "A10"], "model_chu": ["L40S", "A100-80GB"]}}
SECRET = modal.Secret.from_name("tyzo-asr")
LLM_MODEL = CFG["hop_nhat"]["gpu"]["model"]

asr_image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install(
        "torch==2.15.0", "torchaudio==2.11.1", "demucs==4.1.0", "speechbrain==1.1.2", "faster-whisper==1.2.1",
        "onnxruntime==1.29.0", "numpy==2.5.5", "scipy==1.18.1", "soundfile", "jiwer", "opencc-python-reimplemented",
        "cn2an", "pykakasi", "pypinyin", "fastapi[standard]",
        "qwen-asr==0.0.6",                                   # Qwen3-ASR (luồng thử «qwen…»); ghim transformers==4.57.6
        "nvidia-cublas-cu12", "nvidia-cudnn-cu12==9.*",   # faster-whisper (CTranslate2) cần CUDA 12
    )
    .env({"ASR_DEVICE": "cuda", "HF_HOME": "/cache/hf", "TORCH_HOME": "/cache/torch", "FW_DIR": "/cache/fw",
          "SEP_DIR": "/cache/sepformer-libri2mix", "VAD_MODEL": "/root/luong-ky/modal/silero_vad.int8.onnx",
          "LD_LIBRARY_PATH": "/usr/local/lib/python3.12/site-packages/nvidia/cublas/lib:/usr/local/lib/python3.12/site-packages/nvidia/cudnn/lib"})
    .add_local_dir(LUONG, "/root/luong-ky", ignore=["**/__pycache__", "ket-qua/**", "thu-1-kiem-hiep/**", "modal/mau/**"])
)
llm_image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install("vllm==0.34.0")
    # 7fce2aa đặt cả TRITON_CACHE_DIR và XDG_CACHE_HOME dưới /cache: máy chữ lỗi «runtime initialization» liên tục.
    # Thử lại riêng TRITON_CACHE_DIR (bộ đệm biên dịch kernel Triton) để lần bật sau không biên dịch lại.
    .env({"HF_HOME": "/cache/hf", "VLLM_CACHE_ROOT": "/cache/vllm", "TRITON_CACHE_DIR": "/cache/triton"})
    .add_local_file(os.path.join(HERE, "cau-hinh.json"), "/root/luong-ky/modal/cau-hinh.json")
)
asr_cache = modal.Volume.from_name("tyzo-asr-cache", create_if_missing=True)
llm_cache = modal.Volume.from_name("tyzo-llm-cache", create_if_missing=True)
app = modal.App("tyzo-asr")


LLM_SNAPSHOT = bool(CFG["gpu"].get("snapshot_may_chu", False))   # đổi trong cau-hinh.json rồi «Cập nhật»
LLM_KW = dict(image=llm_image, gpu=CFG["gpu"]["model_chu"], volumes={"/cache": llm_cache}, secrets=[SECRET],
              scaledown_window=int(CFG["gpu"].get("tat_may_chu_sau_giay", 300)), timeout=24 * 3600,
              min_containers=int(os.environ.get("TYZO_LLM_WARM") or 0))


def _count_triton():
    try:
        return sum(len(files) for _, _, files in os.walk("/cache/triton"))
    except OSError:
        return 0


def _gpu_name():
    import subprocess
    try:
        return subprocess.run(["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"], capture_output=True,
                              text=True, timeout=20).stdout.strip().replace("\n", ", ") or "?"
    except Exception:
        return "?"


def _start_vllm():
    """Chạy vLLM dạng OpenAI (khóa bằng TYZO_ASR_TOKEN) trong tiến trình con, trả tiến trình."""
    import subprocess, time
    print(f"[tyzo] may chu bat {time.strftime('%H:%M:%S', time.gmtime())} UTC; GPU {_gpu_name()}; "
          f"bo dem Triton {_count_triton()} tep", flush=True)
    return subprocess.Popen(["vllm", "serve", LLM_MODEL, "--host", "0.0.0.0", "--port", "8000",
                             "--api-key", os.environ["TYZO_ASR_TOKEN"], "--max-model-len", "8192",
                             "--gpu-memory-utilization", "0.92", "--enforce-eager",          # enforce-eager: bật máy nhanh hơn
                             "--limit-mm-per-prompt", json.dumps({"image": 0, "video": 0})])


def _wait_ready_and_save(limit=1500):
    """Chờ vLLM trả /health 200 rồi lưu Volume một lần (giữ bộ đệm Triton). Lỗi lưu chỉ in ra, không làm hỏng máy."""
    import time, urllib.request
    t0 = time.time()
    ok = False
    while time.time() - t0 < limit:
        try:
            if urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=5).status == 200:
                ok = True
                break
        except Exception:
            time.sleep(3)
    try:
        llm_cache.commit()
        print(f"[tyzo] san sang sau {time.time() - t0:.0f} s; da luu Volume, bo dem Triton {_count_triton()} tep", flush=True)
    except Exception as e:
        print(f"[tyzo] luu Volume loi: {type(e).__name__}: {str(e)[:200]}", flush=True)
    return ok


if LLM_SNAPSHOT:
    # Chụp bộ nhớ (cả GPU) sau khi vLLM đã nạp model và sẵn sàng: lần bật sau khôi phục từ bản chụp thay vì nạp lại.
    # Modal tự chạy lại theo cách thường nếu khôi phục GPU lỗi. Bản chụp làm lại sau mỗi lần triển khai.
    @app.cls(**LLM_KW, enable_memory_snapshot=True, experimental_options={"enable_gpu_snapshot": True})
    @modal.concurrent(max_inputs=64)
    class Llm:
        @modal.enter(snap=True)
        def start(self):
            import time
            self.proc = _start_vllm()
            if not _wait_ready_and_save():
                raise RuntimeError("vLLM không sẵn sàng trong 1500 s")
            print(f"[tyzo] chup bo nho luc {time.strftime('%H:%M:%S', time.gmtime())} UTC; GPU {_gpu_name()}", flush=True)

        @modal.enter(snap=False)
        def restored(self):
            import time
            print(f"[tyzo] may chu nhan viec {time.strftime('%H:%M:%S', time.gmtime())} UTC; GPU {_gpu_name()}", flush=True)

        @modal.web_server(port=8000, startup_timeout=1500)
        def serve(self):
            """Máy model chữ: cổng 8000 do vLLM mở trong start()."""

    def llm_web_url():
        return Llm().serve.get_web_url()
else:
    @app.function(**LLM_KW)
    @modal.concurrent(max_inputs=64)
    @modal.web_server(port=8000, startup_timeout=1500)
    def llm():
        """Máy model chữ: vLLM dạng OpenAI, khóa bằng TYZO_ASR_TOKEN. Bật khi có yêu cầu, tắt khi rảnh quá `tat_may_chu_sau_giay`."""
        import threading
        threading.Thread(target=_wait_ready_and_save, daemon=True).start()
        _start_vllm()

    def llm_web_url():
        return llm.get_web_url()


ASR_SNAPSHOT = bool(CFG["gpu"].get("snapshot_nhan_dang", False))   # đổi trong cau-hinh.json rồi «Cập nhật»


@app.cls(gpu=CFG["gpu"]["nhan_dang"], image=asr_image, volumes={"/cache": asr_cache}, secrets=[SECRET],
         scaledown_window=60, timeout=1800, max_containers=9, min_containers=min(9, int(os.environ.get("TYZO_ASR_WARM") or 0)),
         # Đang có việc thì giữ sẵn N máy rảnh: khách đến cùng lúc không phải xếp hàng chờ máy mới khởi động (đo 28/11: 4 lệnh song song bị xử lý lần lượt, người cuối chờ 31 s).
         buffer_containers=max(0, min(8, int(CFG["gpu"].get("may_du_phong_nhan_dang", 2)))),
         enable_memory_snapshot=ASR_SNAPSHOT,
         **({"experimental_options": {"enable_gpu_snapshot": True}} if ASR_SNAPSHOT else {}))
class Asr:
    @modal.enter(snap=ASR_SNAPSHOT)
    def load(self):
        import sys, time
        t0 = time.time()
        sys.path.insert(0, "/root/luong-ky/modal")
        import backend
        self.backend = backend; B = backend.BOOT
        B["nap_thu_vien_s"] = round(time.time() - t0, 1)
        if os.environ.get("TYZO_FUSE", "gpu") == "gpu":
            try:
                os.environ["LLM_BASE"] = llm_web_url(); os.environ["LLM_KEY"] = os.environ["TYZO_ASR_TOKEN"]
                # không đánh thức máy model chữ lúc bật máy nhận dạng: process() chỉ đánh thức khi tệp đủ dài
            except Exception as e:
                B["loi_dia_chi_model_chu"] = str(e)[:200]
        t = time.time(); backend._model("whisper-large-v3-turbo"); B["nap_turbo_s"] = round(time.time() - t, 1)
        t = time.time(); backend._model("whisper-large-v3"); B["nap_large_v3_s"] = round(time.time() - t, 1)
        if os.environ.get("TYZO_QWEN_PRELOAD") == "1":      # chỉ nạp sẵn khi cần đo Qwen3-ASR: nạp thêm làm bật máy chậm hơn
            t = time.time(); backend.qwen_engine.load("qwen3-asr-1.7b", "cuda", os.environ.get("HF_HOME")); B["nap_qwen3_asr_s"] = round(time.time() - t, 1)
        import numpy as np, pml
        t = time.time(); pml.sepformer(np.zeros(16000, dtype=np.float32)); B["nap_sepformer_s"] = round(time.time() - t, 1)
        t = time.time()
        from demucs.pretrained import get_model                 # nạp sẵn model tách giọng để nằm trong bản chụp
        backend._demucs = get_model("htdemucs").to(backend._dev()).eval(); B["nap_demucs_s"] = round(time.time() - t, 1)
        t = time.time(); asr_cache.commit(); B["luu_o_s"] = round(time.time() - t, 1)
        B["bat_may_tong_s"] = round(time.time() - t0, 1)
        self._loaded_at = time.time()
        self._task = os.environ.get("MODAL_TASK_ID", "")
        print(f"[tyzo] may nhan dang nap xong sau {B['bat_may_tong_s']} s", flush=True)

    @modal.enter(snap=False)
    def ready(self):
        """Chạy sau khi khôi phục từ bản chụp (hoặc ngay sau load nếu không chụp). Ghi máy này có khôi phục không."""
        import time
        B = self.backend.BOOT
        task = os.environ.get("MODAL_TASK_ID", "")
        # máy khôi phục là một tác vụ mới (mã tác vụ khác máy đã chụp); máy vừa tạo bản chụp thì giữ nguyên mã
        if task and self._task:
            B["khoi_phuc_tu_ban_chup"] = ASR_SNAPSHOT and task != self._task
        else:
            B["khoi_phuc_tu_ban_chup"] = None    # không đọc được mã tác vụ: không kết luận
        B["ma_tac_vu"] = [self._task[-6:], task[-6:]]
        B["cach_nap_xong_s"] = round(time.time() - self._loaded_at, 1)
        B["nhan_viec_luc"] = time.strftime("%H:%M:%S", time.gmtime())
        print(f"[tyzo] may nhan dang nhan viec {B['nhan_viec_luc']} UTC; tu ban chup {B['khoi_phuc_tu_ban_chup']}", flush=True)

    @modal.fastapi_endpoint(method="POST")
    def run(self, item: dict):
        """Nhận JSON {"token", "audio_b64", "ext", "lang", "profile"}; việc quá 150 s thì Modal trả 303 để hỏi lại kết quả."""
        import base64, hmac, tempfile, traceback
        from fastapi import HTTPException
        from fastapi.responses import JSONResponse
        if not hmac.compare_digest(str(item.get("token", "")), os.environ["TYZO_ASR_TOKEN"]):
            raise HTTPException(401, "sai mã")
        lang = item.get("lang")
        if lang not in ("zh", "ja", "ko", "en", "yue", "ru", "cs", "vi"):
            raise HTTPException(400, "ngôn ngữ không hỗ trợ")
        try:
            with tempfile.NamedTemporaryFile(suffix="." + str(item.get("ext", "wav"))) as f:
                f.write(base64.b64decode(item["audio_b64"])); f.flush()
                r = self.backend.process(f.name, lang, item.get("profile"))
        except Exception:
            # trả đoạn lỗi về cho người gọi (không chứa key: key nằm trong biến môi trường)
            return JSONResponse({"loi": traceback.format_exc()[-3000:]}, status_code=500)
        return {"srt": self.backend.to_srt(r["segs"]), **r}
