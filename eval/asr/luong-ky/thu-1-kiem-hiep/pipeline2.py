import os
"""Luồng TZ v2: tách giọng → VAD → turbo ×4 phiên bản tiếng → lọc bịa → hợp nhất cả nhóm theo âm (pinyin) → chia lại câu theo thời gian VAD."""
import json, re, subprocess, io, urllib.request, time
from concurrent.futures import ThreadPoolExecutor
import numpy as np, soundfile as sf
from pypinyin import lazy_pinyin
from lib import *
from pipeline import GLOSSARY, T, normalize_spans, bad

def slow(y, f=0.85):
    import tempfile, os
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, "s.wav"), os.path.join(d, "o.wav")
        sf.write(a, y.astype(np.float32), SR)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a, "-filter:a", f"atempo={f}", "-ar", "16000", b], check=True)
        return load(b)

def text_of(x, g, prompt=None, model=T, slowdown=None):
    y, _ = splice(x, g)
    if slowdown: y = slow(y, slowdown)
    r = transcribe(y, model, "zh", prompt, 0)
    keep = [s for s in r.get("segments", []) if not bad(s)]
    t = " ".join(CC.convert(s["text"]).strip() for s in keep)
    lp = round(float(np.mean([s["avg_logprob"] for s in keep])), 2) if keep else None
    return {"text": t, "lp": lp}

FUSE2 = """你是中文影视剧字幕的语音识别校对专家。同一段对白（可能包含几句话，来自不同角色）被语音识别用 4 种不同的音频处理各跑了一次，每个候选附有拼音和平均置信度（越接近 0 越可靠）。
识别常见错误：同音/近音错字（例如 zǐ shí 子时 被认成 jǐ shí 几时，chéng xī 城西 被认成 承西，chū bā 初八 被认成 出发）、漏字、繁体字、阿拉伯数字。
你的任务：还原演员实际说出的原话。
1. 逐字比较 4 个候选，多数一致的字直接采用。
2. 有分歧或明显不通顺时，比较拼音，在读音相同或相近的候选字里，选在剧情上下文中最通顺、最合理的写法。可以选择任何候选都没写出、但读音几乎一致的正确词（例如把 jǐ shí 改为 zǐ shí 子时）。
3. 术语表里的专有名词必须写对。
4. 绝不添加没有读音依据的内容，不润色，不改语气词；某处 4 个候选都完全不可理解时，保留最可能的读音对应字，不要编造整句。
5. 简体中文，中文标点，数字用汉字（例如 三百七十二、百分之五）。
术语表：{glossary}
前文：{prev}
只输出 JSON：{{"text": "还原后的整段原话"}}"""

def pick(txt):
    d = json.loads(txt)
    if isinstance(d, list):
        d = d[0] if d and isinstance(d[0], dict) else {"text": "".join(x for x in d if isinstance(x, str))}
    if isinstance(d, str): return d
    if isinstance(d.get("text"), str): return d["text"]
    v = [x for x in d.values() if isinstance(x, str)]
    return v[0] if v else ""

def fuse2(cands, prev, model):
    rows = []
    for name, c in zip("ABCD", cands):
        py = " ".join(lazy_pinyin(c["text"], style=1)) if c["text"] else ""
        rows.append(f"{name}（置信 {c['lp']}）：{c['text'] or '（空）'}\n   拼音：{py}")
    msg = [{"role": "system", "content": FUSE2.format(glossary="、".join(GLOSSARY), prev=prev or "（无）")},
           {"role": "user", "content": "\n".join(rows)}]
    return pick(chat(msg, model=model, response_format={"type": "json_object"}))

def chat_ali(messages, model="qwen4-max", **kw):
    body = json.dumps({"model": model, "messages": messages, "temperature": 0, "enable_thinking": False, **kw}).encode()
    for attempt in range(4):
      try:
        return _ali(body)
      except Exception as e:
        print("  [ali]", type(e).__name__, flush=True); time.sleep(5)
    raise RuntimeError("ali failed")

def _ali(body):
    req = urllib.request.Request(os.environ["ALI_BASE"] + "/compatible-mode/v1/chat/completions", body,
                                 {"Authorization": "Bearer " + os.environ.get("ALI_API_KEY", "x"), "Content-Type": "application/json", "User-Agent": "asr-bench/1.0"})
    return json.load(urllib.request.urlopen(req, timeout=240))["choices"][0]["message"]["content"]

def split_to_spans(text, g):
    """Chia đoạn đã sửa thành câu phụ đề theo dấu câu, rải lên các khoảng VAD theo số chữ."""
    parts = [p for p in re.split(r"(?<=[。！？!?；，,])", text) if p.strip()]
    total = sum(b - a for a, b in g); n = max(1, sum(len(p) for p in parts))
    times = []; acc = 0
    def at(frac):
        t = frac * total
        for a, b in g:
            if t <= b - a: return a + t
            t -= b - a
        return g[-1][1]
    out = []
    for p in parts:
        s = at(acc / n); acc += len(p); out.append({"start": s, "end": at(acc / n), "text": p})
    return out

def run2(mix, voc, fuse_model="openai/gpt-oss-120b", provider="groq", cands_n=4):
    spans = speech_spans(voc); groups = group(spans); vocn = normalize_spans(voc, spans)
    prompt = "、".join(GLOSSARY) + "。"
    def cands(g):
        c = [text_of(mix, g), text_of(vocn, g), text_of(mix, g, prompt=prompt), text_of(vocn, g, slowdown=0.85)]
        return c[:cands_n]
    with ThreadPoolExecutor(2) as ex: allc = list(ex.map(cands, groups))
    segs, log, prev = [], [], ""
    for g, c in zip(groups, allc):
        if fuse_model is None:
            text = c[0]["text"]
        else:
            import pipeline2
            f = (lambda m, model: chat_ali(m, model, response_format={"type": "json_object"})) if provider == "ali" else None
            if f:
                rows = []
                for name, cc in zip("ABCD", c):
                    py = " ".join(lazy_pinyin(cc["text"], style=1)) if cc["text"] else ""
                    rows.append(f"{name}（置信 {cc['lp']}）：{cc['text'] or '（空）'}\n   拼音：{py}")
                msg = [{"role": "system", "content": FUSE2.format(glossary="、".join(GLOSSARY), prev=prev or "（无）")}, {"role": "user", "content": "\n".join(rows)}]
                text = pick(f(msg, fuse_model))
            else:
                text = fuse2(c, prev, fuse_model)
        segs += split_to_spans(text, g); log.append({"t": [g[0][0], g[-1][1]], "c": [x["text"] for x in c], "out": text})
        prev = (prev + text)[-120:]
    return segs, log
