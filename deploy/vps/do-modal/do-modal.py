#!/usr/bin/env python3
"""Đo GPU TyZo Modal thật từ VPS (RE5-005/GPU). Chạy: python3 /opt/tyzo/deploy/vps/do-modal/do-modal.py

Hỏi địa chỉ (TYZO_ASR_URL) và token (TYZO_ASR_TOKEN, chữ không hiện) — lấy trên Vercel → Settings → Environment Variables.
Token chỉ nằm trong bộ nhớ khi chạy, không ghi ra tệp. Gửi đúng định dạng app (WAV mono 16 kHz, base64 trong JSON).
Đo: lần đầu (máy GPU khởi động lạnh), các lần sau (máy nóng), 4 lệnh song song. Dừng ngay khi chi ước tính chạm trần.
Kết quả: /opt/tyzo-do-modal-<giờ>.json (không có token) — gửi tệp này cho Claude.
"""
import base64, getpass, json, os, statistics, sys, threading, time, urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CLIPS = ["zh", "ja", "ko", "en"]
GPU_USD_PER_HOUR = 0.8  # L40 theo Chủ; chỉ để chặn trần, số thật lấy từ stats
BUDGET_USD = float(os.environ.get("TRAN_USD", "1.0"))

url = input("Dán TYZO_ASR_URL (https://….modal.run): ").strip()
u = urllib.parse.urlparse(url)
if u.scheme != "https" or not u.hostname or not u.hostname.endswith(".modal.run") or u.username or u.password:
    sys.exit("✘ Địa chỉ phải là https://….modal.run")
token = getpass.getpass("Dán TYZO_ASR_TOKEN (chữ không hiện): ").strip()
if not token:
    sys.exit("✘ Chưa có token")
profile = (input("Hồ sơ [nhanh/ky, Enter = nhanh]: ").strip() or "nhanh")
if profile not in ("nhanh", "ky"):
    sys.exit("✘ Hồ sơ chỉ nhận nhanh hoặc ky")

spent = 0.0
rows = []
lock = threading.Lock()


def call(lang, tag):
    global spent
    with lock:
        if spent >= BUDGET_USD:
            return None
    audio = open(os.path.join(HERE, f"{lang}.wav"), "rb").read()
    body = json.dumps({"token": token, "audio_b64": base64.b64encode(audio).decode(), "ext": "wav", "lang": lang, "profile": profile}).encode()
    t0 = time.time()
    row = {"tag": tag, "lang": lang, "audio_s": round((len(audio) - 44) / 32000, 1)}
    try:
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
        target = url
        while True:  # Modal trả 303 khi việc dài; đi theo như app
            try:
                with urllib.request.urlopen(req, timeout=1800) as r:
                    data = json.loads(r.read()); row["http"] = r.status; break
            except urllib.error.HTTPError as e:
                if e.code == 303 and e.headers.get("location"):
                    target = urllib.parse.urljoin(target, e.headers["location"])
                    req = urllib.request.Request(target, method="GET"); continue
                row["http"] = e.code; data = None; break
        row["seconds"] = round(time.time() - t0, 2)
        if data:
            st = data.get("stats") or {}
            row["stats"] = {k: v for k, v in st.items() if isinstance(v, (int, float, str))}
            row["segments"] = len(data.get("segs") or [])
            usd = (st.get("giay_xu_ly", 0) / 3600) * GPU_USD_PER_HOUR + st.get("tien_model_chu_usd", 0)
            row["usd_est"] = round(usd, 5)
            with lock:
                spent += usd
    except Exception as e:  # mạng, timeout
        row["seconds"] = round(time.time() - t0, 2); row["error"] = str(e)[:160]
    with lock:
        rows.append(row)
    print(f"  {tag:10} {lang} {row.get('http','—')} {row['seconds']} s  câu={row.get('segments','—')}  ~{row.get('usd_est','?')} USD", flush=True)
    return row


print(f"Trần chi: {BUDGET_USD} USD. Bắt đầu đo…")
call("zh", "lanh")                      # lần đầu: máy GPU khởi động lạnh
for rnd in range(3):                     # máy nóng: 3 vòng × 4 ngôn ngữ
    for lang in CLIPS:
        call(lang, f"nong-{rnd + 1}")
threads = [threading.Thread(target=call, args=(lang, "song-song")) for lang in CLIPS]
[t.start() for t in threads]; [t.join() for t in threads]

warm = [r["seconds"] for r in rows if r["tag"].startswith("nong") and r.get("http") == 200]
par = [r["seconds"] for r in rows if r["tag"] == "song-song" and r.get("http") == 200]
pct = lambda xs, p: sorted(xs)[min(len(xs) - 1, int(round(p / 100 * (len(xs) - 1))))] if xs else None
summary = {
    "profile": profile, "budget_usd": BUDGET_USD, "spent_usd_est": round(spent, 4), "calls": len(rows),
    "cold_s": next((r["seconds"] for r in rows if r["tag"] == "lanh"), None),
    "warm_s": {"n": len(warm), "p50": pct(warm, 50), "p95": pct(warm, 95), "max": max(warm) if warm else None},
    "parallel4_s": {"n": len(par), "max": max(par) if par else None},
    "realtime_factor_warm": round(statistics.median(warm) / 30, 3) if warm else None,
    "errors": [r for r in rows if r.get("http") != 200],
}
out = f"/opt/tyzo-do-modal-{time.strftime('%Y%m%d-%H%M%S')}.json"
json.dump({"summary": summary, "rows": rows}, open(out, "w"), ensure_ascii=False, indent=1)
print(json.dumps(summary, ensure_ascii=False, indent=1))
print(f"✔ Đã lưu {out} — gửi tệp này (hoặc ảnh phần trên) cho Claude.")
