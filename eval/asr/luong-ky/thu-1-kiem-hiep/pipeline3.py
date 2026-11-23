"""Luồng TZ v3 = v2 + đo độ đồng thuận + gọi thêm large-v3 cho đoạn khó + chắn đầu ra model chữ + đánh dấu đoạn không nghe rõ."""
import json, re, itertools, time
from concurrent.futures import ThreadPoolExecutor
import numpy as np, jiwer
from pypinyin import lazy_pinyin
from lib import *
from pipeline import GLOSSARY, T, normalize_spans
from pipeline2 import text_of, split_to_spans, chat_ali, pick

FUSE3 = """你是中文影视剧字幕的语音识别校对专家。同一段对白（可能有几句、不同角色）被语音识别用多种音频处理各跑了一次，每个候选附拼音和平均置信度（越接近 0 越可靠）。
常见识别错误：同音/近音错字、漏字、繁体字、阿拉伯数字；在剧情里突兀出现的人名或不通顺的词组，多半是近音误识。
任务：还原演员实际说出的原话。
1. 逐字比较候选，多数一致的字直接采用。
2. 有分歧或不通顺时，比较拼音，在读音相同或相近的写法里选剧情上最通顺合理的，可以选候选里没写出但读音几乎一致的正确词。
3. 术语表的专有名词必须写对。
4. 不添加没有读音依据的内容，不润色。
5. 简体中文，中文标点，数字用汉字。
术语表：{glossary}
前文：{prev}
只输出 JSON：{{"text": "还原后的整段原话"}}，不要任何解释。"""

def cer(a, b):
    a, b = norm(a), norm(b)
    if not a and not b: return 0.0
    if not a or not b: return 1.0
    o = jiwer.process_characters(a, b); return (o.substitutions + o.deletions + o.insertions) / max(len(a), len(b))

def agreement(c):
    t = [x["text"] for x in c]
    return float(np.mean([cer(a, b) for a, b in itertools.combinations(t, 2)]))

def call_fuse(c, prev, model, provider):
    rows = [f"{n}（{x.get('src','')} 置信 {x['lp']}）：{x['text'] or '（空）'}\n   拼音：{' '.join(lazy_pinyin(x['text'], style=1)) if x['text'] else ''}"
            for n, x in zip("ABCDEFG", c)]
    msg = [{"role": "system", "content": FUSE3.format(glossary="、".join(GLOSSARY), prev=prev or "（无）")}, {"role": "user", "content": "\n".join(rows)}]
    if provider == "ali": return pick(chat_ali(msg, model, response_format={"type": "json_object"}))
    return pick(chat(msg, model=model, response_format={"type": "json_object"}))

META = re.compile(r"候选|拼音|无法|规则|置信|根据")

def run3(mix, voc, fuse_model="qwen4-max", provider="ali", escalate=True, unclear=0.55):
    spans = speech_spans(voc); groups = group(spans); vocn = normalize_spans(voc, spans)
    prompt = "、".join(GLOSSARY) + "。"
    def cands(g):
        c = [dict(text_of(mix, g), src="gốc"), dict(text_of(vocn, g), src="giọng"),
             dict(text_of(mix, g, prompt=prompt), src="gốc+thuật ngữ"), dict(text_of(vocn, g, slowdown=0.85), src="giọng chậm")]
        dis = agreement(c)
        if escalate and dis > 0.12:   # đoạn khó: hỏi thêm large-v3
            c += [dict(text_of(mix, g, model="whisper-large-v3"), src="gốc large-v3"), dict(text_of(vocn, g, model="whisper-large-v3"), src="giọng large-v3")]
        return c, dis
    with ThreadPoolExecutor(2) as ex: allc = list(ex.map(cands, groups))
    segs, log, prev, stats = [], [], "", {"escalated": 0, "unclear": 0, "guard": 0}
    for g, (c, dis) in zip(groups, allc):
        if len(c) > 4: stats["escalated"] += 1
        if dis > unclear:          # các lần nhận dạng không giống nhau chút nào: không đoán
            stats["unclear"] += 1; log.append({"t": [g[0][0], g[-1][1]], "dis": round(dis, 2), "c": [x["text"] for x in c], "out": "(không nghe rõ)"}); continue
        text = call_fuse(c, prev, fuse_model, provider)
        longest = max(len(norm(x["text"])) for x in c)
        med = float(np.median([len(norm(x["text"])) for x in c]))
        if META.search(text) or len(norm(text)) > 1.4 * longest + 4 or len(norm(text)) < 0.75 * med:   # chắn đầu ra lạ
            stats["guard"] += 1; text = min(c, key=lambda x: sum(cer(x["text"], y["text"]) for y in c))["text"]
        segs += split_to_spans(text, g); log.append({"t": [g[0][0], g[-1][1]], "dis": round(dis, 2), "c": [x["text"] for x in c], "out": text})
        prev = (prev + text)[-120:]
    return segs, log, stats
