import json, re, unicodedata, itertools
import jiwer, opencc, cn2an, pykakasi
CC = opencc.OpenCC("t2s"); KK = pykakasi.kakasi()

def norm(s, lang, kana=False):
    s = unicodedata.normalize("NFKC", s).lower()
    if lang == "zh":
        s = CC.convert(s)
        try: s = cn2an.transform(s, "an2cn")
        except Exception: pass
    if lang == "ja" and kana:
        s = "".join(x["hira"] for x in KK.convert(s))
    if lang == "en":
        s = s.replace("’", "'")
        s = re.sub(r"[^a-z0-9' ]", " ", s); return " ".join(s.split())
    return re.sub(r"[^\w]|_", "", s)

def err(ref, hyp, lang):
    if lang == "en":
        o = jiwer.process_words(ref or "x", hyp or "")
        n = len(ref.split())
    else:
        o = jiwer.process_characters(ref or "x", hyp or " ")
        n = len(ref)
    return o.substitutions, o.deletions, o.insertions, n

def is_speech(t): return not t["text"].startswith("[")

def score(segs, truth, lang, kana=False):
    sp = [t for t in truth if is_speech(t)]
    ns = [t for t in truth if not is_speech(t)]
    def in_ns(s):
        m = (s["start"] + s["end"]) / 2
        return any(t["start"] <= m <= t["end"] for t in ns) and not any(t["start"] <= m <= t["end"] for t in sp)
    nsout = [s["text"].strip() for s in segs if in_ns(s) and s["text"].strip()]
    segs = [s for s in segs if not in_ns(s)]
    hyp = (" " if lang == "en" else "").join(norm(s["text"], lang, kana) for s in segs)
    hyp = " ".join(hyp.split()) if lang == "en" else hyp
    # hai câu nói chồng: chấp nhận mọi thứ tự
    best = None
    overl = [i for i in range(len(sp) - 1) if sp[i + 1]["start"] < sp[i]["end"]]
    orders = [sp]
    for i in overl:
        o2 = sp[:]; o2[i], o2[i + 1] = o2[i + 1], o2[i]; orders.append(o2)
    for order in orders:
        ref = (" " if lang == "en" else "").join(norm(t["text"], lang, kana) for t in order)
        S, D, I, N = err(ref, hyp, lang)
        r = (S + D + I) / N
        if best is None or r < best["er"]:
            best = {"er": round(r, 3), "S": S, "D": D, "I": I, "N": N}
    junk = []
    for s in segs:
        m = (s["start"] + s["end"]) / 2
        if not any(t["start"] - 0.3 <= m <= t["end"] + 0.3 for t in sp) and norm(s["text"], lang):
            junk.append(s["text"].strip())
    best["junk"] = junk; best["ns"] = nsout
    return best
