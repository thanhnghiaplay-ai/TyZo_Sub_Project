import io, json, re, time, urllib.request, uuid
import numpy as np, soundfile as sf, onnxruntime as ort
from scipy import signal
import opencc

SR = 16000
GROQ = "https://api.groq.com/openai/v1"
CC = opencc.OpenCC("t2s")


# ---------- Groq ----------
def _multipart(fields, wav_bytes):
    b = uuid.uuid4().hex
    out = io.BytesIO()
    for k, v in fields.items():
        if v is None:
            continue
        vals = v if isinstance(v, list) else [v]
        for x in vals:
            out.write(f"--{b}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{x}\r\n".encode())
    out.write(f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.wav\"\r\nContent-Type: audio/wav\r\n\r\n".encode())
    out.write(wav_bytes)
    out.write(f"\r\n--{b}--\r\n".encode())
    return out.getvalue(), b


import hashlib, os
os.makedirs("cache", exist_ok=True)
CALLS = {"n": 0, "sec": 0.0}


def transcribe(x, model="whisper-large-v3-turbo", language=None, prompt=None, temperature=None):
    key = hashlib.sha1(x.astype(np.float32).tobytes() + repr((model, language, prompt, temperature)).encode()).hexdigest()
    path = f"cache/{key}.json"
    if os.path.exists(path):
        return json.load(open(path))
    r = _transcribe(x, model, language, prompt, temperature)
    CALLS["n"] += 1; CALLS["sec"] += max(10.0, len(x) / SR)
    json.dump(r, open(path, "w"))
    return r


def _transcribe(x, model, language, prompt, temperature):
    buf = io.BytesIO()
    sf.write(buf, x.astype(np.float32), SR, format="WAV", subtype="PCM_16")
    fields = {"model": model, "response_format": "verbose_json", "language": language,
              "prompt": prompt, "temperature": temperature}
    body, b = _multipart(fields, buf.getvalue())
    for attempt in range(12):
        req = urllib.request.Request(GROQ + "/audio/transcriptions", body,
                                     {"Authorization": "Bearer " + os.environ.get("GROQ_API_KEY", "x"), "User-Agent": "asr-bench/1.0", "Content-Type": f"multipart/form-data; boundary={b}"})
        try:
            return json.load(urllib.request.urlopen(req, timeout=120))
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                wait = float(e.headers.get("retry-after") or 0) or 5 * (attempt + 1)
                print(f"  [{e.code}] chờ {wait:.0f}s", flush=True); time.sleep(min(wait, 90)); continue
            raise RuntimeError(e.read()[:300])
    raise RuntimeError("retry exhausted")


def chat(messages, model="openai/gpt-oss-120b", **kw):
    body = json.dumps({"model": model, "messages": messages, "temperature": 0, **kw}).encode()
    for attempt in range(12):
        req = urllib.request.Request(GROQ + "/chat/completions", body, {"Authorization": "Bearer " + os.environ.get("GROQ_API_KEY", "x"), "User-Agent": "asr-bench/1.0", "Content-Type": "application/json"})
        try:
            return json.load(urllib.request.urlopen(req, timeout=180))["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                time.sleep(3 * (attempt + 1)); continue
            raise RuntimeError(e.read()[:300])


# ---------- âm thanh ----------
def load(path):
    x, sr = sf.read(path)
    if x.ndim > 1:
        x = x.mean(1)
    if sr != SR:
        x = signal.resample_poly(x, SR, sr)
    return x


def voice_filter(x):
    """Giống ý voice-filter.ts của app: 150 Hz–6 kHz + đưa âm lượng về mức đều."""
    b, a = signal.butter(2, [150 / (SR / 2), 6000 / (SR / 2)], "band")
    y = signal.lfilter(b, a, x)
    return y / (np.sqrt(np.mean(y ** 2)) + 1e-9) * 0.1


# ---------- Silero VAD ----------
_vad = None


def vad_probs(x):
    global _vad
    if _vad is None:
        _vad = ort.InferenceSession("silero_vad.int8.onnx")
    h = np.zeros((2, 1, 64), np.float32); c = np.zeros((2, 1, 64), np.float32)
    out = []
    for i in range(0, len(x) - 512, 512):
        p, h, c = _vad.run(None, {"x": x[i:i + 512][None].astype(np.float32), "h": h, "c": c})
        out.append(float(p[0, 0]))
    return np.array(out)


def speech_spans(x, thr=0.5, neg=0.35, min_speech=0.25, min_sil=0.35, pad=0.25):
    pr = vad_probs(x / (np.abs(x).max() + 1e-9) * 0.9)
    w = 512 / SR
    spans, on, st, sil = [], False, 0, 0
    for i, p in enumerate(pr):
        if p >= thr:
            if not on:
                on, st = True, i
            sil = 0
        elif on and p < neg:
            sil += 1
            if sil * w >= min_sil:
                e = i - sil + 1
                if (e - st) * w >= min_speech:
                    spans.append([st * w, e * w])
                on, sil = False, 0
    if on:
        spans.append([st * w, len(pr) * w])
    dur = len(x) / SR
    return [[max(0, a - pad), min(dur, b + pad)] for a, b in spans]


def group(spans, max_len=25.0, max_gap=1.2):
    """Gộp các câu gần nhau thành đoạn ≤ max_len giây để Whisper có ngữ cảnh."""
    groups = []
    for a, b in spans:
        if groups and a - groups[-1][-1][1] <= max_gap and b - groups[-1][0][0] <= max_len:
            groups[-1].append([a, b])
        else:
            groups.append([[a, b]])
    return groups


def splice(x, spans, gap=0.3):
    """Ghép các câu của một nhóm, chèn 0,3 giây im giữa chúng; trả kèm bảng đổi thời gian."""
    parts, tmap, t = [], [], 0.0
    z = np.zeros(int(gap * SR))
    for a, b in spans:
        seg = x[int(a * SR):int(b * SR)]
        tmap.append((t, t + len(seg) / SR, a))
        parts += [seg, z]; t += len(seg) / SR + gap
    return np.concatenate(parts), tmap


def remap(t, tmap):
    for s, e, a in tmap:
        if t <= e + 0.3:
            return a + max(0.0, t - s)
    s, e, a = tmap[-1]
    return a + (t - s)


# ---------- chấm điểm ----------
import cn2an
BAIT = re.compile(r"点赞|订阅|转发|打赏|栏目|字幕|谢谢观看|感谢观看|请不吝|明镜|下期再见|subscribe|thank you for watching", re.I)


def norm(s, num=True):
    s = CC.convert(s).lower()
    if num:
        try:
            s = cn2an.transform(s, "an2cn")
        except Exception:
            pass
    return re.sub(r"[^\w]|_", "", s)


def lev(a, b):
    import jiwer
    if not a:
        return len(b)
    return jiwer.process_characters(a, b).substitutions + jiwer.process_characters(a, b).deletions + jiwer.process_characters(a, b).insertions if b else len(a)


def score(segs, truth):
    """segs: [{start,end,text}] theo giờ gốc. CER toàn bài + từng câu + chữ bịa ngoài vùng có lời."""
    ref_all = "".join(norm(t["text"]) for t in truth)
    hyp_all = "".join(norm(s["text"]) for s in sorted(segs, key=lambda s: s["start"]))
    import jiwer
    o = jiwer.process_characters(ref_all, hyp_all or " ")
    cer = (o.substitutions + o.deletions + o.insertions) / len(ref_all)
    # chữ bịa: đoạn nhận dạng không chạm vùng có lời nào (±0,6 giây)
    halluc = []
    for s in segs:
        mid_hit = any(s["start"] < t["end"] + 0.6 and s["end"] > t["start"] - 0.6 for t in truth)
        if (not mid_hit and norm(s["text"])) or BAIT.search(CC.convert(s["text"])):
            halluc.append(s["text"].strip())
    # từng câu: gom chữ của đoạn có tâm nằm trong câu
    per = []
    for t in truth:
        hyp = "".join(norm(s["text"]) for s in segs
                      if t["start"] - 0.6 <= (s["start"] + s["end"]) / 2 <= t["end"] + 0.6)
        r = norm(t["text"])
        oo = jiwer.process_characters(r, hyp or " ")
        per.append(round((oo.substitutions + oo.deletions + oo.insertions) / len(r), 2))
    return {"cer": round(cer, 3), "sub": o.substitutions, "del": o.deletions, "ins": o.insertions,
            "halluc": halluc, "per_line": per, "hyp": hyp_all}
