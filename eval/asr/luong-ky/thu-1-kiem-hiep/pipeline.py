"""Luồng TZ: tách giọng → VAD → turbo ×3 phiên bản → lọc bịa → hợp nhất bằng model chữ."""
import json, re, sys
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from lib import *

GLOSSARY = ["李家庄", "玄天剑", "慕容雪", "观音庙", "天机秘录", "王掌柜"]
T = "whisper-large-v3-turbo"

def normalize_spans(x, spans):
    """Mỗi câu đưa về cùng độ to: câu thì thầm được kéo lên ngang câu thường."""
    y = np.zeros_like(x)
    for a, b in spans:
        s, e = int(a*SR), int(b*SR); seg = x[s:e]
        y[s:e] = seg / (np.sqrt(np.mean(seg**2)) + 1e-9) * 0.08
    return y

def bad(seg):
    t = CC.convert(seg["text"]).strip()
    if not t or BAIT.search(t): return True
    if seg.get("compression_ratio", 0) > 2.4: return True
    if seg.get("no_speech_prob", 0) > 0.6 and seg.get("avg_logprob", 0) < -0.8: return True
    return False

def per_span(x, g, prompt=None, model=T):
    """Nhận dạng một nhóm câu, trả chữ + điểm tin cậy cho TỪNG câu VAD."""
    y, tm = splice(x, g); r = transcribe(y, model, "zh", prompt, 0)
    out = [{"text": "", "lp": []} for _ in g]
    for s in r.get("segments", []):
        if bad(s): continue
        mid = (remap(s["start"], tm) + remap(s["end"], tm)) / 2
        k = min(range(len(g)), key=lambda i: 0 if g[i][0] <= mid <= g[i][1] else min(abs(mid-g[i][0]), abs(mid-g[i][1])))
        out[k]["text"] += CC.convert(s["text"]).strip() + " "; out[k]["lp"].append(s["avg_logprob"])
    for o in out:
        o["text"] = o["text"].strip(); o["lp"] = round(float(np.mean(o["lp"])), 2) if o["lp"] else None
    return out

FUSE = """你是中文影视字幕的语音识别校对员。同一段对白被语音识别跑了三次（不同音频处理），结果可能有同音错字、漏字或幻觉。
请为每一句输出最可能的【原话】：
- 以三个候选为依据，优先多数一致的字；分歧时依据上下文语义、剧情逻辑和术语表选择读音相近且合理的字（例如同音字、近音字）。
- 术语表中的专有名词必须写对。
- 不要润色、不要改写语气、不要补充候选里没有读音依据的内容；如果三个候选都是空的或明显是噪音幻觉，输出空字符串。
- 一律用简体中文，标点用中文标点。
术语表：{glossary}
前文：{prev}
只输出JSON：{{"lines": ["第1句", "第2句", ...]}}，数量必须等于{n}。"""

def fuse(cands, prev, model):
    n = len(cands[0]); rows = []
    for i in range(n):
        rows.append(f"第{i+1}句：A=「{cands[0][i]['text']}」(置信{cands[0][i]['lp']}) B=「{cands[1][i]['text']}」(置信{cands[1][i]['lp']}) C=「{cands[2][i]['text']}」(置信{cands[2][i]['lp']})")
    msg = [{"role": "system", "content": FUSE.format(glossary="、".join(GLOSSARY), prev=prev or "（无）", n=n)},
           {"role": "user", "content": "\n".join(rows)}]
    txt = chat(msg, model=model, response_format={"type": "json_object"})
    lines = json.loads(txt)["lines"]
    if len(lines) != n: raise ValueError("so dong lech")
    return lines

def run(mix, voc, fuse_model="qwen/qwen3.8-27b", mode="fuse"):
    spans = speech_spans(voc); groups = group(spans)
    vocn = normalize_spans(voc, spans)
    prompt = "、".join(GLOSSARY) + "。"
    def cands(g):
        return [per_span(mix, g), per_span(vocn, g), per_span(mix, g, prompt=prompt)]
    with ThreadPoolExecutor(2) as ex: allc = list(ex.map(cands, groups))
    segs, prev, log = [], "", []
    for g, c in zip(groups, allc):
        if mode == "best":   # không dùng model chữ: chọn ứng viên tin cậy cao nhất từng câu
            lines = [max((cc[i] for cc in c), key=lambda o: (o["lp"] is not None, o["lp"] or -9))["text"] for i in range(len(g))]
        elif mode == "A":
            lines = [o["text"] for o in c[0]]
        else:
            lines = fuse(c, prev, fuse_model)
        for (a, b), t, *cc in zip(g, lines, *c):
            segs.append({"start": a, "end": b, "text": t}); log.append({"t": [a, b], "A": cc[0]["text"], "B": cc[1]["text"], "C": cc[2]["text"], "out": t})
        prev = "".join(lines)[-80:]
    return segs, log
