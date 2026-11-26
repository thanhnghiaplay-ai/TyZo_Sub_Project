"""Bộ nhận dạng thử Qwen3-ASR (Alibaba, Apache 2.0) trên GPU, thay faster-whisper để so sánh công bằng.

Trả kết quả cùng dạng `verbose_json` của Groq/faster-whisper nên `pml.py` dùng nguyên, không phải sửa.
Chọn bằng trường "engine" của một luồng trong cau-hinh.json (ví dụ luồng "qwen-nhanh").
Chưa chạy trên GPU thật: Qwen3-ASR không trả độ tin cậy từng câu, nên avg_logprob/no_speech_prob là số giữ chỗ (xem NEUTRAL).
"""
import threading, zlib
import numpy as np

SR = 16000
MODELS = {"qwen3-asr-1.7b": "Qwen/Qwen3-ASR-1.7B", "qwen3-asr-0.6b": "Qwen/Qwen3-ASR-0.6B"}
ALIGNER = "Qwen/Qwen3-ForcedAligner-0.6B"
# mã ngôn ngữ của app → tên Qwen3-ASR (ngôn ngữ lạ thì để model tự đoán)
LANG = {"zh": "Chinese", "ja": "Japanese", "ko": "Korean", "en": "English", "yue": "Cantonese",
        "ru": "Russian", "cs": "Czech", "vi": "Vietnamese"}
# Qwen3-ASR không đưa độ tin cậy; giữ chỗ trung tính để lọc `bad()` của pml không loại nhầm và không ép model chữ tin thêm.
NEUTRAL = {"avg_logprob": -0.3, "no_speech_prob": 0.0}

_models, _lock, _call_lock = {}, threading.Lock(), threading.Lock()


def is_qwen(name):
    return bool(name) and name in MODELS


def load(name, device="cuda", cache_dir=None):
    """Nạp model (kèm model khớp mốc từng chữ) một lần; gọi lại thì dùng bản đã nạp."""
    with _lock:
        if name not in _models:
            import torch
            from qwen_asr import Qwen3ASRModel
            dev = "cuda:0" if device == "cuda" else "cpu"
            kw = {"cache_dir": cache_dir} if cache_dir else {}
            _models[name] = Qwen3ASRModel.from_pretrained(
                MODELS[name], dtype=torch.bfloat16 if device == "cuda" else torch.float32, device_map=dev,
                max_inference_batch_size=8, max_new_tokens=512,
                forced_aligner=ALIGNER,
                forced_aligner_kwargs={"dtype": torch.bfloat16 if device == "cuda" else torch.float32, "device_map": dev, **kw},
                **kw)
        return _models[name]


def transcribe(model, x, language=None, prompt=None, words=False):
    """`model` là Qwen3ASRModel (hoặc bản giả khi kiểm thử). Một đoạn tiếng 16 kHz → {"segments": [...], "words": [...]}."""
    x = np.asarray(x, dtype=np.float32)
    if len(x) < SR // 2:                         # dưới 0,5 s: model không nhận
        return {"segments": [], "words": []}
    with _call_lock:                             # nhiều luồng gọi cùng lúc thì xếp hàng (một GPU)
        r = model.transcribe(audio=(x, SR), language=LANG.get(language), context=prompt or "",
                             return_time_stamps=bool(words))[0]
    text = (r.text or "").strip()
    if not text:
        return {"segments": [], "words": []}
    ws = [{"word": it.text, "start": float(it.start_time), "end": float(it.end_time)} for it in (getattr(r, "time_stamps", None) or [])]
    start, end = (ws[0]["start"], ws[-1]["end"]) if ws else (0.0, len(x) / SR)
    raw = text.encode("utf-8")
    seg = {"start": start, "end": end, "text": text, "compression_ratio": len(raw) / max(1, len(zlib.compress(raw))), **NEUTRAL}
    return {"segments": [seg], "words": ws}
