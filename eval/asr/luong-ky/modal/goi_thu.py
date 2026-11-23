"""Gửi một video/tệp tiếng lên dịch vụ Modal, ghi phụ đề ra tệp .srt và in thời gian chờ.

    TYZO_ASR_URL=https://...modal.run TYZO_ASR_TOKEN=... python3 goi_thu.py video.mp4 zh [ky|can-bang]
"""
import base64, json, os, sys, time, urllib.request

path, lang = sys.argv[1], sys.argv[2]
profile = sys.argv[3] if len(sys.argv) > 3 else "ky"
body = json.dumps({"audio_b64": base64.b64encode(open(path, "rb").read()).decode(), "ext": path.rsplit(".", 1)[-1],
                   "lang": lang, "profile": profile}).encode()
req = urllib.request.Request(os.environ["TYZO_ASR_URL"], body, {"Content-Type": "application/json",
                             "Authorization": "Bearer " + os.environ["TYZO_ASR_TOKEN"], "User-Agent": "tyzo-asr-client/1.0"})
t = time.time()
r = json.load(urllib.request.urlopen(req, timeout=1800))
out = os.path.splitext(path)[0] + f".{profile}.srt"
open(out, "w").write(r["srt"])
print(f"Xong sau {time.time() - t:.1f} s (máy xử lý {r['stats'].get('giay_xu_ly')} s). Phụ đề: {out}")
print(json.dumps(r["stats"], ensure_ascii=False))
