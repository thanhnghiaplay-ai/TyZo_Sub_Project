"""Luồng nhiều thứ tiếng: tách giọng → VAD → turbo nhiều phiên bản → lọc bịa → đồng thuận → (large-v3 khi khó) → hợp nhất bằng model chữ → chắn."""
import json, re, os, itertools, subprocess, tempfile, time, unicodedata
from concurrent.futures import ThreadPoolExecutor
import numpy as np, soundfile as sf
from pypinyin import lazy_pinyin
import pykakasi
from lib import transcribe, chat, load, SR, speech_spans, group, splice, voice_filter, CC
import score as SC
KK = pykakasi.kakasi()
TURBO, LARGE = "whisper-large-v3-turbo", "whisper-large-v3"
NAMES = {"zh": "Mandarin Chinese (Simplified)", "ja": "Japanese", "ko": "Korean", "en": "English"}
BAIT = re.compile(r"点赞|订阅|转发|打赏|栏目|字幕由|谢谢观看|感谢观看|请不吝|明镜|下期再见|ご視聴|チャンネル登録|字幕|시청해|구독|좋아요|자막|独播剧场|优优|yoyo|television series|字幕组|中文字幕|thanks? for watching|subscribe|like and share|amara|請不吝|ご覧いただき", re.I)
INTERJ = re.compile(r"^(啊|呀|哈|嗯|呃|哦|哇|唔|嘿|ああ|あ|ん|う|うわ|わあ|ひゃ|きゃ|ふふ|은|음|으|아|어|까|꺄|악|윽|누|와|우|ugh|oh|ah|aah|uh|um|hmm|ha|whoa|ow|ooh|yeah)+$", re.I)

def interjection_only(t, lang):
    n = re.sub(r"[^\w]|_", "", t.lower())
    return bool(n) and bool(INTERJ.match(n)) and len(n) <= 12

def demucs(L):
    out = f"sep/htdemucs/{L}44/vocals.wav"
    if os.environ.get("NOCACHE") and os.path.exists(out):
        os.remove(out)
    if not os.path.exists(out):
        import sys
        dev = ["-d", os.environ["ASR_DEVICE"]] if os.environ.get("ASR_DEVICE") else []
        subprocess.run([sys.executable, "-m", "demucs", "--two-stems=vocals", "-n", "htdemucs", *dev, "-o", "sep", f"{L}44.wav"], check=True, capture_output=True)
    return load(out)

def agc(x, win=0.5, max_gain_db=20, target=0.08):
    """Nén dải động: đoạn nhỏ (thì thầm) được kéo lên, tối đa +20 dB, đổi mức mượt."""
    w = int(win * SR); n = len(x) // w + 1
    r = np.array([np.sqrt(np.mean(x[i*w:(i+1)*w]**2)) + 1e-6 for i in range(n)])
    gain = np.minimum(target / r, 10 ** (max_gain_db / 20))
    gain = np.convolve(gain, np.ones(3) / 3, "same")
    g = np.interp(np.arange(len(x)), np.arange(n) * w + w / 2, gain)
    y = x * g; return np.clip(y, -0.99, 0.99)

def norm_spans(x, spans, target=0.08):
    y = np.zeros_like(x)
    for a, b in spans:
        s, e = int(a*SR), int(b*SR); seg = x[s:e]; y[s:e] = seg / (np.sqrt(np.mean(seg**2)) + 1e-9) * target
    return y

def slow(y, f=0.85):
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, "s.wav"), os.path.join(d, "o.wav"); sf.write(a, y.astype(np.float32), SR)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a, "-filter:a", f"atempo={f}", "-ar", "16000", b], check=True); return load(b)

def bad(seg):
    t = seg["text"].strip()
    return (not t) or bool(BAIT.search(t)) or seg.get("compression_ratio", 0) > 2.4 or (seg.get("no_speech_prob", 0) > 0.6 and seg.get("avg_logprob", 0) < -0.8)

from lib import remap
HALLU_ONLY = {"ko": ["감사합니다", "시청해주셔서감사합니다", "구독과좋아요부탁드립니다"], "ja": ["ご視聴ありがとうございました", "ありがとうございました", "おやすみなさい"],
              "zh": ["谢谢", "谢谢观看", "谢谢大家", "别忘了"], "en": ["thank you", "thanks for watching", "you", "bye", "thank you for watching"]}

def hallu_only(t, lang):
    n = SC.norm(t, lang).replace(" ", "")
    return any(n == SC.norm(h, lang).replace(" ", "") for h in HALLU_ONLY[lang])

def text_of(x, g, lang, model=TURBO, slowdown=None, prompt=None, words=False):
    y, tm = splice(x, g)
    if slowdown: y = slow(y, slowdown)
    r = transcribe(y, model, lang, prompt, 0, words=words)
    keep = [s for s in r.get("segments", []) if not bad(s) and not hallu_only(s["text"], lang)]
    sep = " " if lang in ("en", "ko") else ""
    t = sep.join(s["text"].strip() for s in keep)
    if lang == "zh": t = CC.convert(t)
    lp = round(float(np.mean([s["avg_logprob"] for s in keep])), 2) if keep else None
    out = {"text": t, "lp": lp}
    if words and not slowdown:
        ok = [(s["start"], s["end"]) for s in keep]
        ws = [w for w in r.get("words", []) if any(a - 0.05 <= (w["start"] + w["end"]) / 2 <= b + 0.05 for a, b in ok)]
        out["words"] = [{"w": CC.convert(w["word"]) if lang == "zh" else w["word"], "s": remap(w["start"], tm), "e": remap(w["end"], tm)} for w in ws]
    return out

def dist(a, b, lang):
    a, b = SC.norm(a, lang), SC.norm(b, lang)
    if not a and not b: return 0.0
    if not a or not b: return 1.0
    S, D, I, N = SC.err(a, b, lang); return min(1.0, (S + D + I) / max(N, 1))

def agreement(c, lang):
    return float(np.mean([dist(x["text"], y["text"], lang) for x, y in itertools.combinations(c, 2)]))

def reading(t, lang):
    if not t: return ""
    if lang == "zh": return " ".join(lazy_pinyin(t, style=1))
    if lang == "ja": return "".join(x["hira"] for x in KK.convert(t))
    return ""

FUSE = """You are an expert subtitle proofreader for {lname} film/video dialogue. The same stretch of audio (it may contain several lines from different speakers, casual speech and modern slang) was transcribed several times by a speech recognizer, each time from a differently processed version of the audio. Each candidate has a mean confidence (closer to 0 = more reliable){rhint}.
Typical recognizer errors: homophones / near-sound mistakes, misheard slang, dropped words, a word split wrongly, wrong script.
Reconstruct EXACTLY what was said:
1. Candidates are complementary: some versions catch quiet/whispered lines that others miss entirely. Keep EVERY phrase that at least two candidates contain (in time order), even if other candidates are empty there. For the wording of each phrase, take what the majority agree on.
2. Where they disagree or the text makes no sense, compare how they SOUND and choose the spelling that sounds the same or nearly the same and makes sense in the conversation (including well-known slang). You may choose a correct word none of them wrote if it sounds almost identical.
2b. Candidates marked SPEAKER-SEPARATED come from splitting two simultaneous speakers. If such a candidate contains a whole line that the other candidates garbled or missed (because two people talked at once), include that line as its own sentence, right after the line it overlapped with. Do not merge two speakers' words into one sentence.
3. Never add content that has no acoustic support in the candidates; do not paraphrase, polish or translate.
4. Drop pure non-verbal noises: screaming, moaning, groaning, laughter with no words. Recognizers often write these as bursts like 啊啊 / うわー / 까아 까아 / 으아악 / "I'm sorry, oh yeah" / "aah" that do not fit the conversation — delete such fragments entirely. Keep real words and an interjection that starts a real sentence.
5. Output in {lname}{extra}.
Previous context: {prev}
Return JSON only: {{"text": "<reconstructed dialogue>"}}"""
EXTRA = {"zh": ", simplified characters, Chinese punctuation, numbers in Chinese characters", "ja": ", natural Japanese orthography (kanji/kana as normally written), Japanese punctuation",
         "ko": ", standard Korean spelling and spacing", "en": ", standard spelling and punctuation"}
RH = {"zh": ", plus pinyin", "ja": ", plus a hiragana reading", "ko": "", "en": ""}

def ali(messages, model):
    import urllib.request
    body = json.dumps({"model": model, "messages": messages, "temperature": 0, "enable_thinking": False, "response_format": {"type": "json_object"}}).encode()
    for k in range(4):
        try:
            req = urllib.request.Request(os.environ["ALI_BASE"] + "/compatible-mode/v1/chat/completions", body,
                                         {"Authorization": "Bearer " + os.environ.get("ALI_API_KEY", "x"), "Content-Type": "application/json", "User-Agent": "asr-bench/1.0"})
            return json.load(urllib.request.urlopen(req, timeout=240))["choices"][0]["message"]["content"]
        except Exception as e:
            print("  [ali]", e, flush=True); time.sleep(4)
    raise RuntimeError("ali")

def pick(txt):
    try: d = json.loads(txt)
    except Exception: return ""
    if isinstance(d, list): d = d[0] if d and isinstance(d[0], dict) else {"text": " ".join(x for x in d if isinstance(x, str))}
    if isinstance(d, str): return d
    if isinstance(d.get("text"), str): return d["text"]
    v = [x for x in d.values() if isinstance(x, str)]; return v[0] if v else ""

def fuse(c, prev, lang, model, provider):
    rows = []
    for n, x in zip("ABCDEFGHIJ", c):
        r = reading(x["text"], lang)
        tag = " [SPEAKER-SEPARATED: contains only ONE of two people talking at the same time]" if x.get("src", "").startswith("speaker") else ""
        rows.append(f"{n}{tag} (conf {x['lp']}): {x['text'] or '(empty)'}" + (f"\n   reading: {r}" if r else ""))
    msg = [{"role": "system", "content": FUSE.format(lname=NAMES[lang], rhint=RH[lang], extra=EXTRA[lang], prev=prev or "(none)")},
           {"role": "user", "content": "\n".join(rows)}]
    if provider == "ali": return pick(ali(msg, model))
    try:
        return pick(chat(msg, model=model, response_format={"type": "json_object"}))
    except RuntimeError:
        return pick(re.search(r"\{.*\}", chat(msg, model=model) or "{}", re.S).group(0) if re.search(r"\{.*\}", chat(msg, model=model) or "", re.S) else "{}")

META = re.compile(r"candidate|confidence|reading:|候选|拼音|cannot|unable", re.I)

def split_to_spans(text, g, lang):
    parts = [p for p in re.split(r"(?<=[。！？!?；，,、])\s*|(?<=[.])\s+", text) if p.strip()]
    total = sum(b - a for a, b in g); n = max(1, sum(len(p) for p in parts))
    def at(fr):
        t = fr * total
        for a, b in g:
            if t <= b - a: return a + t
            t -= b - a
        return g[-1][1]
    out, acc = [], 0
    for p in parts:
        s = at(acc / n); acc += len(p); out.append({"start": s, "end": at(acc / n), "text": p})
    return out

def gaps_of(groups, dur, min_gap=1.0):
    out, prev = [], 0.0
    for g in groups:
        if g[0][0] - prev >= min_gap: out.append([prev, g[0][0]])
        prev = g[-1][1]
    if dur - prev >= min_gap: out.append([prev, dur])
    res = []
    for a, b in out:          # khoảng dài thì chia ≤ 12 s
        while b - a > 12: res.append([a, a + 12]); a += 12
        res.append([a, b])
    return res

def probe_gap(mix, gap, L, dmix=None):
    """Dò một khoảng VAD bỏ qua (thì thầm dưới nhạc). Chỉ nhận khi các lần nhận dạng khớp nhau."""
    from scipy import signal as S
    g = [gap]; agc = norm_spans(mix, g, 0.1); vf = norm_spans(voice_filter(mix), g, 0.1)
    b, a = S.butter(4, [1500 / (SR / 2), 7000 / (SR / 2)], "band"); hi = norm_spans(S.lfilter(b, a, mix), g, 0.1)
    jobs = [lambda: text_of(mix, g, L, words=True), lambda: text_of(agc, g, L, words=True), lambda: text_of(vf, g, L, words=True),
            lambda: text_of(agc, g, L, LARGE, words=True), lambda: text_of(hi, g, L, words=True), lambda: text_of(hi, g, L, LARGE, words=True)]
    if dmix is not None: jobs.append(lambda: text_of(norm_spans(dmix, g, 0.1), g, L, words=True))
    with ThreadPoolExecutor(len(jobs)) as ex: c = list(ex.map(lambda f: f(), jobs))
    nonempty = [x for x in c if SC.norm(x["text"], L) and not interjection_only(x["text"], L)]
    if len(nonempty) < 3: return None, c, 1.0
    d = agreement(nonempty, L)
    return (c if d < 0.5 else None), c, d

import difflib
def align(text, c, g, lang):
    """Đặt mốc cho từng câu phụ đề bằng cách khớp chữ với mốc từng chữ của các ứng viên."""
    parts = [p for p in re.split(r"(?<=[。！？!?；，,、])\s*|(?<=[.])\s+", text) if p.strip()]
    def chars(s): return re.sub(r"[^\w]|_", "", unicodedata.normalize("NFKC", s).lower())
    tracks = []
    for x in c:
        if not x.get("words"): continue
        seq, ts = [], []
        for w in x["words"]:
            cs = chars(w["w"])
            for i, ch in enumerate(cs):
                seq.append(ch); ts.append(w["s"] + (w["e"] - w["s"]) * (i + 0.5) / len(cs))
        tracks.append(("".join(seq), ts))
    if not tracks: return split_to_spans(text, g, lang)
    out = []
    for p in parts:
        cp = chars(p); best = None
        for seq, ts in tracks:
            sm = difflib.SequenceMatcher(None, cp, seq, autojunk=False)
            bl = [b for b in sm.get_matching_blocks() if b.size]
            m = sum(b.size for b in bl)
            if m and (best is None or m > best[0]): best = (m, [ts[b.b + k] for b in bl for k in range(b.size)])
        if best and best[0] >= max(1, 0.3 * len(cp)): out.append({"start": min(best[1]) - 0.15, "end": max(best[1]) + 0.15, "text": p})
        else: out.append({"start": None, "end": None, "text": p})
    for i, o in enumerate(out):   # câu không khớp chữ nào: đặt giữa hai câu bên cạnh
        if o["start"] is None:
            a = next((out[j]["end"] for j in range(i - 1, -1, -1) if out[j]["end"] is not None), g[0][0])
            b = next((out[j]["start"] for j in range(i + 1, len(out)) if out[j]["start"] is not None), g[-1][1])
            o["start"], o["end"] = a, max(a + 0.3, b)
    return out

_SEP = None
def sepformer(y):
    global _SEP
    import torch
    from scipy import signal as S
    if _SEP is None:
        from speechbrain.inference.separation import SepformerSeparation
        _SEP = SepformerSeparation.from_hparams(source="speechbrain/sepformer-libri2mix", savedir=os.environ.get("SEP_DIR", "pretrained/sepformer-libri2mix"),
                                                run_opts={"device": os.environ.get("ASR_DEVICE", "cpu")})
    with torch.no_grad():
        est = _SEP.separate_batch(torch.tensor(S.resample_poly(y, 1, 2).astype(np.float32))[None])
    return [S.resample_poly(est[0, :, k].float().cpu().numpy(), 2, 1)[:len(y)] for k in range(2)]

def overlap_cands(voc, g, L):
    """Tách người nói trên từng đoạn VAD (≤ 8 s). Đoạn nào có hai người cùng nói thì thêm lời của từng người."""
    out = []
    for a, b in g:
        if b - a < 1.0: continue
        a2, b2 = max(0, a - 0.2), b + 0.2
        r = _overlap_one(voc, [[a2, b2]], L)
        out += r
    if not out: return []
    # gộp: mỗi kênh thành một ứng viên riêng cho cả nhóm
    return out

def _overlap_one(voc, g, L):
    """Tách hai người nói. Chỉ trả ứng viên khi hai kênh cùng có tiếng to ≥ 0,8 s (nói chồng thật)."""
    y, tm = splice(voc, g)
    ch = sepformer(y)
    w = int(0.1 * SR); n = min(len(c) for c in ch) // w
    e = [np.array([np.sqrt(np.mean(c[i*w:(i+1)*w]**2)) + 1e-9 for i in range(n)]) for c in ch]
    top = max(e[0].max(), e[1].max())
    both = (20*np.log10(e[0]/top) > -18) & (20*np.log10(e[1]/top) > -18) & (np.abs(20*np.log10(e[0]/e[1])) < 10)
    if both.sum() * 0.1 < 0.8: return []
    out = []
    for k, c in enumerate(ch):
        c = c / (np.abs(c).max() + 1e-9) * 0.5
        r = transcribe(c, TURBO, L, None, 0, words=True)
        keep = [s for s in r.get("segments", []) if not bad(s) and not hallu_only(s["text"], L)]
        t = (" " if L in ("en", "ko") else "").join(s["text"].strip() for s in keep)
        if L == "zh": t = CC.convert(t)
        ok = [(s["start"], s["end"]) for s in keep]
        ws = [x for x in r.get("words", []) if any(a - 0.05 <= (x["start"] + x["end"]) / 2 <= b + 0.05 for a, b in ok)]
        out.append({"text": t, "lp": round(float(np.mean([s["avg_logprob"] for s in keep])), 2) if keep else None, "src": f"speaker-separated #{k+1}",
                    "words": [{"w": CC.convert(x["word"]) if L == "zh" else x["word"], "s": remap(x["start"], tm), "e": remap(x["end"], tm)} for x in ws]})
    return out

def run(F, cfg, L=None):
    L = L or F
    t0 = time.time()
    mix = load(f"{F}.wav")
    voc = demucs(F) if cfg.get("sep", True) else voice_filter(mix)
    t_sep = time.time() - t0
    if cfg.get("novad"):   # không chặn bằng VAD: cắt cả bài thành đoạn ≤ 25 s ở chỗ nhỏ tiếng nhất
        dur = len(mix) / SR; spans, a = [], 0.0
        w = int(0.2 * SR); en = np.array([np.mean(mix[i:i+w]**2) for i in range(0, len(mix) - w, w)])
        while a < dur - 0.1:
            if dur - a <= 25: spans.append([a, dur]); break
            lo, hi = int((a + 15) / 0.2), int((a + 25) / 0.2); cut = (lo + int(np.argmin(en[lo:hi]))) * 0.2
            spans.append([a, cut]); a = cut
        groups = [[s] for s in spans]
    else:
        spans = speech_spans(voc, thr=cfg.get("vad", 0.5)); groups = group(spans, max_len=cfg.get("maxlen", 25))
    dmix = None
    if cfg.get("dfn"):
        from dfn import denoise
        dmix = denoise(mix)
        if cfg["dfn"] == "chain":      # kiểu Google: Demucs → DeepFilterNet, mọi bước sau dùng bản đã khử ồn
            voc = denoise(voc); spans = speech_spans(voc, thr=cfg.get("vad", 0.5)); groups = group(spans, max_len=cfg.get("maxlen", 25))
    vocn = norm_spans(voc, spans)
    def cands(g):
        second = (lambda: text_of(agc(voice_filter(mix)), g, L, words=True)) if cfg.get("agc") else (lambda: text_of(vocn, g, L, words=True))
        jobs = [lambda: text_of(mix, g, L, words=True), second]
        if cfg.get("n", 4) >= 3: jobs.append(lambda: text_of(voice_filter(mix), g, L, words=True))
        if cfg.get("n", 4) >= 4: jobs.append(lambda: text_of(vocn, g, L, slowdown=0.85))
        if cfg.get("dfn") == "add":    # thêm bản: tiếng gốc đã khử ồn, và bản đó chỉnh âm lượng từng câu
            jobs += [lambda: text_of(dmix, g, L, words=True), lambda: text_of(norm_spans(dmix, g), g, L, words=True)]
        with ThreadPoolExecutor(len(jobs)) as ex: c = list(ex.map(lambda f: f(), jobs))
        d = agreement(c, L)
        if cfg.get("esc", True) and d > cfg.get("esc_thr", 0.12):
            with ThreadPoolExecutor(2) as ex: c += list(ex.map(lambda f: f(), [lambda: text_of(mix, g, L, LARGE, words=True), lambda: text_of(vocn, g, L, LARGE, words=True)]))
        if cfg.get("ovl") and (cfg.get("ovl") == "all" or d > cfg.get("esc_thr", 0.12)):
            c += overlap_cands(voc_raw, g, L)
        return c, d
    voc_raw = voc
    with ThreadPoolExecutor(cfg.get("par", 3)) as ex: allc = list(ex.map(cands, groups))
    st_probe = []
    if cfg.get("probe", True) and not cfg.get("novad"):
        gaps = gaps_of(groups, len(mix) / SR)
        with ThreadPoolExecutor(3) as ex: pr = list(ex.map(lambda gp: probe_gap(mix, gp, L, dmix if cfg.get("dfn") == "add" else None), gaps))
        for gp, (ok, c, d) in zip(gaps, pr):
            st_probe.append({"gap": [round(gp[0], 1), round(gp[1], 1)], "d": round(d, 2), "c": [x["text"] for x in c], "ok": ok is not None})
            if ok is not None: groups.append([gp]); allc.append((ok, 0.0))
        order = sorted(range(len(groups)), key=lambda i: groups[i][0][0]); groups = [groups[i] for i in order]; allc = [allc[i] for i in order]
    t_asr = time.time() - t0 - t_sep
    segs, log, prev, st = [], [], "", {"esc": 0, "unclear": 0, "guard": 0}
    def one(args):
        g, (c, d) = args
        if d > cfg.get("unclear", 0.6): return None
        if not cfg.get("fuse"): return c[0]["text"]
        if isinstance(cfg["fuse"], list):   # nhiều model song song → lấy bản ở giữa (giống các bản kia nhất)
            def safe(mp):
                try: return fuse(c, "", L, mp[0], mp[1])
                except Exception as e: print("  [fuse]", mp[0], e, flush=True); return None
            with ThreadPoolExecutor(len(cfg["fuse"])) as ex: outs = [o for o in ex.map(safe, cfg["fuse"]) if o]
            if not outs: return c[0]["text"]
            return min(outs, key=lambda o: sum(dist(o, q, L) for q in outs))
        return fuse(c, "", L, cfg["fuse"], cfg.get("prov", "groq"))
    # hợp nhất song song (không chờ nhau) để giảm độ trễ; ngữ cảnh trước = chữ của ứng viên A
    with ThreadPoolExecutor(4) as ex: outs = list(ex.map(one, zip(groups, allc)))
    for g, (c, d), text in zip(groups, allc, outs):
        if len(c) > cfg.get("n", 4): st["esc"] += 1
        if text is None:
            st["unclear"] += 1; log.append({"t": [g[0][0], g[-1][1]], "d": round(d, 2), "c": [x["text"] for x in c], "out": "(?)"}); continue
        L2 = [len(SC.norm(x["text"], L)) for x in c]
        if cfg.get("fuse") and not isinstance(cfg["fuse"], list) and False: pass
        if cfg.get("fuse") and (META.search(text) or len(SC.norm(text, L)) > 1.4 * max(L2) + 4 or len(SC.norm(text, L)) < 0.6 * float(np.median(L2))):
            st["guard"] += 1; text = min(c, key=lambda x: sum(dist(x["text"], y["text"], L) for y in c))["text"]
        segs += [s for s in align(text, c, g, L) if not interjection_only(s["text"], L)]; log.append({"t": [round(g[0][0], 1), round(g[-1][1], 1)], "d": round(d, 2), "c": [x["text"] for x in c], "out": text})
    st["probe"] = st_probe
    st["time"] = {"sep": round(t_sep, 1), "asr": round(t_asr, 1), "total": round(time.time() - t0, 1)}
    return segs, log, st
