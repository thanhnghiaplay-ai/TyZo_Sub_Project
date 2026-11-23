import json, sys, time
sys.path.insert(0, ".")
from lib import transcribe, load, SR
from score import score
LANGS = ["zh", "ja", "ko", "en"]
def T(L): return json.load(open(f"in/{L}_dap_an.json"))
def whole(x, model="whisper-large-v3-turbo", lang=None):
    r = transcribe(x, model, lang, None, 0 if lang else None)
    return [{"start": s["start"], "end": s["end"], "text": s["text"]} for s in r["segments"]]
if __name__ == "__main__":
    out = {}
    for name, f in [("P0 như app (turbo, không khai ngôn ngữ)", lambda x, L: whole(x)),
                    ("P1 turbo + khai ngôn ngữ", lambda x, L: whole(x, lang=L)),
                    ("P1L large-v3 + khai ngôn ngữ", lambda x, L: whole(x, "whisper-large-v3", L))]:
        row = []
        for L in LANGS:
            segs = f(load(f"{L}.wav"), L); sc = score(segs, T(L), L)
            out[f"{name}|{L}"] = {"segs": segs, "score": sc}
            row.append(f"{L} {sc['er']*100:5.1f}% rác{len(sc['junk'])}")
        print(f"{name:42s} " + " | ".join(row), flush=True)
    json.dump(out, open("res_base.json", "w"), ensure_ascii=False, indent=1)
