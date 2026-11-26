import json, sys
from pml import run
from score import score
import os
SETS = [tuple(x.split(":")) for x in os.environ.get("SETS", "zh2:zh,ja2:ja,ko:ko,en:en").split(",")]
CFGS = json.loads(sys.argv[1]); out = {}
for name, cfg in CFGS.items():
    row = []
    for F, L in SETS:
        truth = json.load(open(f"in/{F}_dap_an.json"))
        if cfg.get("whole"):
            from base import whole; from lib import load
            import time; t0 = time.time(); segs = whole(load(f"{F}.wav"), cfg.get("model", "whisper-large-v3-turbo"), cfg.get("lang") and L); log = []; st = {"time": {"total": round(time.time()-t0, 1)}}
        else:
            segs, log, st = run(F, cfg, L)
        sc = score(segs, truth, L)
        out[f"{name}|{F}"] = {"segs": segs, "log": log, "st": st, "score": sc}
        row.append(f"{F} {sc['er']*100:5.1f}%{'' if not sc['junk'] else ' rác'+str(len(sc['junk']))} ({st['time']['total']}s)")
    print(f"{name:26s} " + " | ".join(row), flush=True)
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
