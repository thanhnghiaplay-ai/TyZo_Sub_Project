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
    .env({"HF_HOME": "/cache/hf", "VLLM_CACHE_ROOT": "/cache/vllm"})
    .add_local_file(os.path.join(HERE, "cau-hinh.json"), "/root/luong-ky/modal/cau-hinh.json")
)
asr_cache = modal.Volume.from_name("tyzo-asr-cache", create_if_missing=True)
llm_cache = modal.Volume.from_name("tyzo-llm-cache", create_if_missing=True)
app = modal.App("tyzo-asr")


@app.function(image=llm_image, gpu=CFG["gpu"]["model_chu"], volumes={"/cache": llm_cache}, secrets=[SECRET],
              scaledown_window=300, timeout=24 * 3600, min_containers=int(os.environ.get("TYZO_LLM_WARM") or 0))
@modal.concurrent(max_inputs=64)
@modal.web_server(port=8000, startup_timeout=1500)
def llm():
    """Máy model chữ: vLLM dạng OpenAI, khóa bằng TYZO_ASR_TOKEN. Bật khi máy nhận dạng gọi /health, tắt sau 5 phút rảnh."""
    import subprocess
    subprocess.Popen(["vllm", "serve", LLM_MODEL, "--host", "0.0.0.0", "--port", "8000",
                      "--api-key", os.environ["TYZO_ASR_TOKEN"], "--max-model-len", "8192",
                      "--gpu-memory-utilization", "0.92", "--enforce-eager",          # enforce-eager: bật máy nhanh hơn
                      "--limit-mm-per-prompt", json.dumps({"image": 0, "video": 0})])


@app.cls(gpu=CFG["gpu"]["nhan_dang"], image=asr_image, volumes={"/cache": asr_cache}, secrets=[SECRET],
         scaledown_window=60, timeout=1800, min_containers=int(os.environ.get("TYZO_ASR_WARM") or 0))
class Asr:
    @modal.enter()
    def load(self):
        import sys, time
        t0 = time.time()
        sys.path.insert(0, "/root/luong-ky/modal")
        import backend
        self.backend = backend; B = backend.BOOT
        B["nap_thu_vien_s"] = round(time.time() - t0, 1)
        if os.environ.get("TYZO_FUSE", "gpu") == "gpu":
            try:
                os.environ["LLM_BASE"] = llm.get_web_url(); os.environ["LLM_KEY"] = os.environ["TYZO_ASR_TOKEN"]
                backend.LlmReady()      # gọi trước để máy model chữ bật song song
            except Exception as e:
                B["loi_dia_chi_model_chu"] = str(e)[:200]
        t = time.time(); backend._model("whisper-large-v3-turbo"); B["nap_turbo_s"] = round(time.time() - t, 1)
        t = time.time(); backend._model("whisper-large-v3"); B["nap_large_v3_s"] = round(time.time() - t, 1)
        import numpy as np, pml
        t = time.time(); pml.sepformer(np.zeros(16000, dtype=np.float32)); B["nap_sepformer_s"] = round(time.time() - t, 1)
        t = time.time(); asr_cache.commit(); B["luu_o_s"] = round(time.time() - t, 1)
        B["bat_may_tong_s"] = round(time.time() - t0, 1)

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
