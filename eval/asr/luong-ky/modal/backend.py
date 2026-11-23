"""Chạy luồng Kỹ trên một máy (Modal GPU hoặc CPU để thử): nhận dạng bằng faster-whisper ngay trên máy thay cho Groq.

Dùng lại nguyên `pml.py`; chỉ thay hàm `transcribe` của nó bằng bản chạy tại chỗ.
Hợp nhất vẫn gọi Qwen4-Max (Alibaba) nên cần ALI_API_KEY và ALI_BASE.
"""
import os, sys, shutil, subprocess, tempfile, threading, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))          # eval/asr/luong-ky
os.environ.setdefault("VAD_MODEL", os.path.join(HERE, "silero_vad.int8.onnx"))

import numpy as np
from faster_whisper import WhisperModel
import pml

# Tên model Groq → model faster-whisper (bản CTranslate2)
FW_NAMES = {"whisper-large-v3-turbo": "mobiuslabsgmbh/faster-whisper-large-v3-turbo",
            "whisper-large-v3": "Systran/faster-whisper-large-v3"}
_models, _lock = {}, threading.Lock()

def _model(name):
    with _lock:
        if name not in _models:
            dev = os.environ.get("ASR_DEVICE", "cpu")
            _models[name] = WhisperModel(FW_NAMES[name], device=dev, compute_type="float16" if dev == "cuda" else "int8",
                                         num_workers=4, download_root=os.environ.get("FW_DIR"))
        return _models[name]

def transcribe_local(x, model="whisper-large-v3-turbo", language=None, prompt=None, temperature=None, words=False):
    """Trả kết quả cùng dạng `verbose_json` của Groq để `pml` dùng nguyên."""
    segs, _ = _model(model).transcribe(np.asarray(x, dtype=np.float32), language=language, initial_prompt=prompt,
                                       temperature=0.0, beam_size=5, word_timestamps=words, vad_filter=False,
                                       condition_on_previous_text=False)
    out, ws = [], []
    for s in segs:
        out.append({"start": s.start, "end": s.end, "text": s.text, "avg_logprob": s.avg_logprob,
                    "no_speech_prob": s.no_speech_prob, "compression_ratio": s.compression_ratio})
        for w in (s.words or []):
            ws.append({"word": w.word, "start": w.start, "end": w.end})
    return {"segments": out, "words": ws}

pml.transcribe = transcribe_local

PROFILES = {
    "ky": {"n": 4, "ovl": "all", "fuse": [["qwen4-max", "ali"]] * 3},
    "can-bang": {"n": 4, "fuse": [["qwen4-max", "ali"]] * 3},
}

def process(audio_path, lang, profile="ky"):
    """Tệp tiếng hoặc video bất kỳ → danh sách câu phụ đề {start, end, text} + thống kê."""
    work = tempfile.mkdtemp(prefix="asr-")
    old = os.getcwd()
    try:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", audio_path, "-ar", "16000", "-ac", "1", os.path.join(work, "job.wav")], check=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", audio_path, "-ar", "44100", "-ac", "2", os.path.join(work, "job44.wav")], check=True)
        os.chdir(work)
        t0 = time.time()
        segs, log, st = pml.run("job", PROFILES[profile], lang)
        st["giay_xu_ly"] = round(time.time() - t0, 1)
        return {"segs": segs, "stats": st}
    finally:
        os.chdir(old)
        shutil.rmtree(work, ignore_errors=True)

def to_srt(segs):
    def ts(x):
        x = max(0.0, x); return f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int((x % 1) * 1000):03d}"
    return "".join(f"{i}\n{ts(s['start'])} --> {ts(s['end'])}\n{s['text']}\n\n" for i, s in enumerate(segs, 1))

if __name__ == "__main__":      # thử trên máy: python3 backend.py video.mp4 zh [ky|can-bang]
    r = process(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "ky")
    print(to_srt(r["segs"])); print(r["stats"], file=sys.stderr)
