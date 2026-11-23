"""Gửi một video/tệp tiếng lên dịch vụ Modal, ghi phụ đề ra tệp .srt và in thời gian chờ.

    TYZO_ASR_URL=https://...modal.run TYZO_ASR_TOKEN=... python3 goi_thu.py video.mp4 zh [ky|can-bang]
    Có thể thay video.mp4 bằng link tải trực tiếp (https://…/video.mp4).
    Video thử có sẵn: eval/asr/luong-ky/modal/mau/zh_thu_38s.mp4 (tiếng Trung, 38 giây, giọng máy tự dựng).
"""
import base64, json, os, sys, time, urllib.request, urllib.error

path, lang = sys.argv[1], sys.argv[2]
if path.startswith("http://") or path.startswith("https://"):   # dán link tải trực tiếp video
    local = os.path.join(os.path.expanduser("~"), "video_thu." + (path.split("?")[0].rsplit(".", 1)[-1] if "." in path.split("/")[-1] else "mp4"))
    print("Đang tải video về VPS…")
    urllib.request.urlretrieve(path, local); path = local
profile = sys.argv[3] if len(sys.argv) > 3 else "ky"
body = json.dumps({"token": os.environ["TYZO_ASR_TOKEN"], "audio_b64": base64.b64encode(open(path, "rb").read()).decode(), "ext": path.rsplit(".", 1)[-1],
                   "lang": lang, "profile": profile}).encode()
req = urllib.request.Request(os.environ["TYZO_ASR_URL"], body, {"Content-Type": "application/json", "User-Agent": "tyzo-asr-client/1.0"})
# Modal: việc quá 150 giây được trả 303 về một địa chỉ hỏi lại kết quả, lặp tới khi xong → cho phép hỏi lại nhiều lần.
class Doi(urllib.request.HTTPRedirectHandler):
    max_repeats = 1000
    max_redirections = 1000
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        print(f"  … máy đang xử lý ({time.time() - t:.0f} s), hỏi lại kết quả", flush=True)
        return super().redirect_request(req, fp, code, msg, headers, newurl)
t = time.time()
try:
    r = json.load(urllib.request.build_opener(Doi).open(req, timeout=1800))
except urllib.error.HTTPError as e:
    noi_dung = e.read().decode("utf-8", "replace")
    try: noi_dung = json.loads(noi_dung).get("loi") or noi_dung
    except Exception: pass
    print(f"LỖI {e.code} sau {time.time() - t:.0f} s:\n{noi_dung[-2500:]}")
    print("Xem thêm: modal app logs tyzo-asr")
    sys.exit(1)
out = os.path.splitext(path)[0] + f".{profile}.srt"
open(out, "w").write(r["srt"])
print(f"Xong sau {time.time() - t:.1f} s (máy xử lý {r['stats'].get('giay_xu_ly')} s). Phụ đề: {out}")
print(json.dumps(r["stats"], ensure_ascii=False))
