"""Dịch vụ nhận dạng luồng Kỹ trên Modal (GPU L4, tự tắt khi không có việc).

Triển khai (trên VPS hoặc máy của Chủ, KHÔNG dán token vào chat):
    pip install modal && modal token new          # đăng nhập Modal một lần
    modal secret create tyzo-asr ALI_API_KEY=... ALI_BASE=https://... TYZO_ASR_TOKEN=<chuỗi ngẫu nhiên dài>
    modal deploy eval/asr/luong-ky/modal/modal_app.py

Gọi: POST <địa chỉ Modal in ra>  header "Authorization: Bearer <TYZO_ASR_TOKEN>"
     body JSON {"audio_b64": "...", "ext": "mp4", "lang": "zh", "profile": "ky" | "can-bang"}
     trả {"srt": "...", "segs": [...], "stats": {...}}. Xem goi_thu.py.
"""
import os
import modal

HERE = os.path.dirname(os.path.abspath(__file__))
LUONG = os.path.dirname(HERE)

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install(
        "torch==2.15.0", "torchaudio==2.11.1", "demucs==4.1.0", "speechbrain==1.1.2", "faster-whisper==1.2.1",
        "onnxruntime==1.29.0", "numpy==2.5.5", "scipy==1.18.1", "soundfile", "jiwer", "opencc-python-reimplemented",
        "cn2an", "pykakasi", "pypinyin", "fastapi[standard]",
    )
    .env({"ASR_DEVICE": "cuda", "HF_HOME": "/cache/hf", "TORCH_HOME": "/cache/torch", "FW_DIR": "/cache/fw",
          "SEP_DIR": "/cache/sepformer-libri2mix", "VAD_MODEL": "/root/luong-ky/modal/silero_vad.int8.onnx"})
    .add_local_dir(LUONG, "/root/luong-ky", ignore=["**/__pycache__", "ket-qua/**", "thu-1-kiem-hiep/**"])
)
cache = modal.Volume.from_name("tyzo-asr-cache", create_if_missing=True)
app = modal.App("tyzo-asr")


@app.cls(gpu="L4", image=image, volumes={"/cache": cache}, secrets=[modal.Secret.from_name("tyzo-asr")],
         scaledown_window=60, timeout=1800)
class Asr:
    @modal.enter()
    def load(self):
        import sys
        sys.path.insert(0, "/root/luong-ky/modal")
        import backend
        self.backend = backend
        # nạp sẵn model để lần gọi đầu đỡ chậm; tải về lưu trong Volume cho lần bật máy sau
        backend._model("whisper-large-v3-turbo"); backend._model("whisper-large-v3")
        import numpy as np, pml
        pml.sepformer(np.zeros(16000, dtype=np.float32))
        cache.commit()

    @modal.fastapi_endpoint(method="POST")
    async def run(self, request: "fastapi.Request"):  # noqa: F821
        import asyncio, base64, hmac, tempfile
        from fastapi import HTTPException
        want = "Bearer " + os.environ["TYZO_ASR_TOKEN"]
        if not hmac.compare_digest(request.headers.get("authorization", ""), want):
            raise HTTPException(401, "sai mã")
        body = await request.json()
        lang = body.get("lang")
        if lang not in ("zh", "ja", "ko", "en", "yue", "ru", "cs", "vi"):
            raise HTTPException(400, "ngôn ngữ không hỗ trợ")
        with tempfile.NamedTemporaryFile(suffix="." + body.get("ext", "wav")) as f:
            f.write(base64.b64decode(body["audio_b64"])); f.flush()
            r = await asyncio.to_thread(self.backend.process, f.name, lang, body.get("profile", "ky"))
        return {"srt": self.backend.to_srt(r["segs"]), **r}
