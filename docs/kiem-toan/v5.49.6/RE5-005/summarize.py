"""Tóm tắt một lượt mixed-soak: admission, live WebSocket fixture, web k6, runtime. Đối số: <thư mục lượt>."""
import csv, glob, json, os, statistics as st, sys
run = sys.argv[1]; ai = os.path.join(run, "ai")
it = [json.loads(l) for l in open(os.path.join(ai, "iterations.jsonl"))]
out = {"meta": open(os.path.join(run, "meta.txt")).read().split("\n"), "exit": open(os.path.join(run, "exit.txt")).read().split(),
       "result": json.load(open(os.path.join(ai, "result.json"))), "iterations": len(it),
       "iterationMs": {"median": st.median(x["ms"] for x in it), "max": max(x["ms"] for x in it)},
       "nonZeroExits": [x for x in it if x["live_exit"] or x["adm_exit"]],
       "pgRssKb": {"first": it[0]["pg_rss_kb"], "last": it[-1]["pg_rss_kb"], "max": max(x["pg_rss_kb"] for x in it)}}
adm = {}
for f in sorted(glob.glob(os.path.join(ai, "adm-*.json"))):
    try: d = json.load(open(f))
    except Exception: continue
    for r in d["results"] + ([d["burst"]] if isinstance(d.get("burst"), dict) else []):
        k = f"clients={r['clients']}" if "clients" in r else f"burst={r.get('burst')}"
        a = adm.setdefault(k, {"runs": 0, "ok": 0, "busy": 0, "uncertain": 0, "error": 0, "p95": [], "p99": [], "max": [], "starved": 0, "violations": 0})
        a["runs"] += 1
        for c in ("ok", "busy", "uncertain", "error"): a[c] += r.get(c, 0)
        for c in ("p95", "p99", "max"): a[c].append(r[c])
        a["starved"] += (r.get("fairness") or {}).get("starved", 0)
        v = r.get("violations") or {}; a["violations"] += v.get("lane", 0) + v.get("provider", 0) + v.get("model", 0)
for a in adm.values():
    for c in ("p95", "p99", "max"): xs = a[c]; a[c] = {"median": round(st.median(xs), 2), "worst": round(max(xs), 2)}
out["admission"] = adm
# RE5-005: theo lane — latency p95 (trung vị/tệ nhất qua các vòng) và khoảng chờ dài nhất của một khách.
lanes = {}
for f in sorted(glob.glob(os.path.join(ai, "adm-*.json"))):
    try: d = json.load(open(f))
    except Exception: continue
    for r in d["results"]:
        for lane, v in (r.get("lanes") or {}).items():
            a = lanes.setdefault(f"clients={r['clients']}/{lane}", {"runs": 0, "p95": [], "p99": [], "maxGapMax": []})
            a["runs"] += 1; a["p95"].append(v["p95"]); a["p99"].append(v["p99"]); a["maxGapMax"].append(v["maxGapMs"]["max"])
for a in lanes.values():
    for c in ("p95", "p99", "maxGapMax"):
        xs = a[c]; a[c] = {"median": round(st.median(xs), 2), "worst": round(max(xs), 2)}
out["admissionByLane"] = lanes
live = {}; ledger = {"runs": 0, "ledgerViolations": 0, "duplicateCharges": 0, "supplierCallsMismatch": 0, "accepted": 0}
for f in sorted(glob.glob(os.path.join(ai, "live-*.json"))):
    try: d = json.load(open(f))
    except Exception: continue
    for r in d["reports"]:
        a = live.setdefault(r["concurrency"], {"runs": 0, "statuses": {}, "acceptedP95": [], "peakSockets": 0})
        a["runs"] += 1; a["peakSockets"] = max(a["peakSockets"], r["peakUpstreamSockets"])
        for s, n in r["statuses"].items(): a["statuses"][s] = a["statuses"].get(s, 0) + n
        if r.get("acceptedP95Ms") is not None: a["acceptedP95"].append(r["acceptedP95Ms"])
    ledger["runs"] += 1; ledger["accepted"] += d.get("accepted", 0)
    ledger["ledgerViolations"] += d.get("ledgerViolations", 0); ledger["duplicateCharges"] += d.get("duplicateCharges", 0)
    ledger["supplierCallsMismatch"] += int(d.get("supplierCalls") != d.get("expectedObservations"))
for a in live.values():
    xs = a.pop("acceptedP95"); a["acceptedP95Ms"] = {"median": round(st.median(xs), 2), "worst": round(max(xs), 2)} if xs else None
out["live"] = {"scope": d.get("scope"), "byConcurrency": live, "ledger": ledger}
k = json.load(open(os.path.join(run, "k6-web.json")))["metrics"]
out["web"] = {"http_req_duration": k["http_req_duration"], "http_req_failed": k["http_req_failed"], "checks": k["checks"], "http_reqs": k["http_reqs"], "iterations": k.get("iterations")}
rows = list(csv.DictReader(open(os.path.join(run, "runtime.csv"))))
num = lambda c: [float(r[c]) for r in rows if r[c]]
out["runtime"] = {"samples": len(rows), "pgConnectionsMax": max(num("pg_connections")), "pgLockWaitsMax": max(num("pg_lock_waits")),
                  "nodeWebRssKb": {"first": num("node_web_rss_kb")[0], "last": num("node_web_rss_kb")[-1], "max": max(num("node_web_rss_kb"))},
                  "nodeWebCpuMedian": st.median(num("node_web_cpu")), "k6RssKbMax": max(num("k6_rss_kb"))}
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
