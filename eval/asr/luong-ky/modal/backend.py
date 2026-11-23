"""Chạy luồng nhận dạng trên một máy (Modal GPU, hoặc CPU để thử): faster-whisper tại chỗ thay cho Groq.

Dùng lại nguyên `pml.py`; chỉ thay `transcribe` (faster-whisper) và `demucs` (giữ model trong bộ nhớ).
Luồng và cách hợp nhất đọc từ `cau-hinh.json`. Chế độ hợp nhất: biến TYZO_FUSE = gpu | ali | khong.
  gpu : Qwen trên GPU Modal (LLM_BASE), 3 lần lấy bản giữa; máy đó lỗi/chưa bật xong thì sang Alibaba.
  ali : Alibaba (ALI_API_KEY, ALI_WORKSPACE), 1 lần, chỉ khi các bản nhận dạng lệch nhau.
  khong : không dùng model chữ, lấy bản được các lần nhận dạng đồng ý nhất.
"""
import json, os, sys, shutil, subprocess, tempfile, threading, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))          # eval/asr/luong-ky
os.environ.setdefault("VAD_MODEL", os.path.join(HERE, "silero_vad.int8.onnx"))

import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel
import pml

CFG = json.load(open(os.path.join(HERE, "cau-hinh.json")))
BOOT = {}                                          # thời gian từng bước lúc bật máy (giây)

# ---------- nhận dạng: faster-whisper ----------
FW_NAMES = {"whisper-large-v3-turbo": "mobiuslabsgmbh/faster-whisper-large-v3-turbo",
            "whisper-large-v3": "Systran/faster-whisper-large-v3"}
_models, _lock = {}, threading.Lock()

def _dev():
    return os.environ.get("ASR_DEVICE", "cpu")

def _model(name):
    with _lock:
        if name not in _models:
            _models[name] = WhisperModel(FW_NAMES[name], device=_dev(), compute_type="float16" if _dev() == "cuda" else "int8",
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

# ---------- tách giọng: Demucs giữ trong bộ nhớ (khỏi nạp lại mỗi lần ~5 s) ----------
_demucs = None

def demucs_inproc(F):
    global _demucs
    import torch
    from scipy import signal as S
    from demucs.pretrained import get_model
    from demucs.apply import apply_model
    if _demucs is None:
        _demucs = get_model("htdemucs").to(_dev()).eval()
    wav, sr = sf.read(f"{F}44.wav", dtype="float32", always_2d=True)            # (n, 2) 44,1 kHz
    x = torch.from_numpy(wav.T.copy())
    ref = x.mean(0); m, s = ref.mean(), ref.std() + 1e-8
    with torch.no_grad():
        out = apply_model(_demucs, ((x - m) / s)[None].to(_dev()), device=_dev(), split=True, overlap=0.25, progress=False)[0]
    voc = (out[_demucs.sources.index("vocals")] * s + m).mean(0).cpu().numpy()
    return S.resample_poly(voc, 160, 441).astype(np.float32)                    # 44,1 kHz → 16 kHz

pml.transcribe = transcribe_local
pml.demucs = demucs_inproc

# ---------- model chữ trên GPU Modal: gọi trước để máy bật song song lúc đang nhận dạng ----------
class LlmReady:
    def __init__(self):
        self.ok = False; self.stop = False
        base = os.environ.get("LLM_BASE")
        if base and os.environ.get("LLM_NO_HEALTH"):   # máy chủ không có /health (thử với Groq…)
            self.ok = True
        elif base:
            threading.Thread(target=self._poll, args=(base,), daemon=True).start()

    def _poll(self, base):
        t0 = time.time()
        while not self.stop and time.time() - t0 < 1500:
            try:
                if urllib.request.urlopen(base.rstrip("/") + "/health", timeout=20).status == 200:
                    self.ok = True; BOOT.setdefault("model_chu_san_sang_sau_s", round(time.time() - t0, 1)); return
            except Exception:
                time.sleep(3)

    def __call__(self):
        return self.ok

    def wait(self, limit=900):
        t0 = time.time()
        while not self.ok and time.time() - t0 < limit: time.sleep(2)
        return self.ok

def fuse_chain(mode, ready):
    h = CFG["hop_nhat"]
    ali = {"name": "ali", "models": [[h["ali"]["model"], "ali1"]] * h["ali"]["so_lan"], "when": "disagree", "thr": h["ali"]["chi_khi_lech"]}
    if mode == "gpu":
        if os.environ.get("ALI_API_KEY"):   # có dự phòng: máy model chữ chưa bật xong thì dùng Alibaba ngay
            return [{"name": "gpu", "models": [[os.environ.get("LLM_MODEL", h["gpu"]["model"]), "local"]] * h["gpu"]["so_lan"], "ready": ready}, ali]
        return [{"name": "gpu", "models": [[os.environ.get("LLM_MODEL", h["gpu"]["model"]), "local"]] * h["gpu"]["so_lan"], "ready": ready.wait}]
    if mode == "ali":
        return [ali]
    return []

def cost(stats_usage):
    """Tiền model chữ của lần chạy (USD), theo bảng giá trong cau-hinh.json. Model trên GPU riêng: 0 (đã tính vào GPU)."""
    gia = CFG["hop_nhat"]["gia_usd_1tr_token"]; total = 0.0
    for key, u in stats_usage.items():
        kind, model = key.split(":", 1)
        if kind == "ali" and model in gia:
            total += u["vao"] / 1e6 * gia[model][0] + u["ra"] / 1e6 * gia[model][1]
    return round(total, 5)

def process(audio_path, lang, profile=None):
    """Tệp tiếng hoặc video bất kỳ → danh sách câu phụ đề {start, end, text} + thống kê."""
    profile = profile or CFG["luong_mac_dinh"]
    if profile not in CFG["luong"]:
        raise ValueError(f"luồng '{profile}' không có; có: {', '.join(CFG['luong'])}")
    cfg = {k: v for k, v in CFG["luong"][profile].items() if k != "mo_ta"}
    mode = os.environ.get("TYZO_FUSE", "gpu" if os.environ.get("LLM_BASE") else ("ali" if os.environ.get("ALI_API_KEY") else "khong"))
    ready = LlmReady() if mode == "gpu" else None
    cfg["fuse_chain"] = fuse_chain(mode, ready)
    work = tempfile.mkdtemp(prefix="asr-")
    old = os.getcwd()
    pml.USAGE.clear()
    try:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", audio_path, "-ar", "16000", "-ac", "1", os.path.join(work, "job.wav")], check=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", audio_path, "-ar", "44100", "-ac", "2", os.path.join(work, "job44.wav")], check=True)
        os.chdir(work)
        t0 = time.time()
        segs, log, st = pml.run("job", cfg, lang)
        st["giay_xu_ly"] = round(time.time() - t0, 1)
        st["giay_tieng"] = round(sf.info("job.wav").duration, 1)
        st["luong"] = profile; st["che_do_hop_nhat"] = mode
        st["model_chu"] = dict(pml.USAGE); st["tien_model_chu_usd"] = cost(pml.USAGE)
        st["bat_may"] = dict(BOOT)
        return {"segs": segs, "stats": st}
    finally:
        if ready: ready.stop = True
        os.chdir(old)
        shutil.rmtree(work, ignore_errors=True)

def to_srt(segs):
    def ts(x):
        x = max(0.0, x); return f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int((x % 1) * 1000):03d}"
    return "".join(f"{i}\n{ts(s['start'])} --> {ts(s['end'])}\n{s['text']}\n\n" for i, s in enumerate(segs, 1))

if __name__ == "__main__":      # thử trên máy: python3 backend.py video.mp4 zh [ky|can-bang|nhanh]
    r = process(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
    print(to_srt(r["segs"])); print(json.dumps(r["stats"], ensure_ascii=False), file=sys.stderr)
