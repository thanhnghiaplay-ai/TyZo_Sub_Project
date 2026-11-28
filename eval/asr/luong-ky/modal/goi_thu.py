"""Gửi một video/tệp tiếng lên dịch vụ Modal, ghi phụ đề ra tệp .srt, in thời gian chờ và tiền.

    python3 goi_thu.py video.mp4 zh [luồng]          (hoặc: tyzo-ai kiem-tra video.mp4 zh)
    Có thể thay video.mp4 bằng link tải trực tiếp (https://…/video.mp4).
    Địa chỉ và chuỗi bảo vệ: biến TYZO_ASR_URL / TYZO_ASR_TOKEN, không có thì đọc /opt/tyzo-ai/tyzo-ai.conf.
    Video thử có sẵn: eval/asr/luong-ky/modal/mau/zh_thu_38s.mp4 (tiếng Trung, 38 giây, giọng máy tự dựng).
"""
import base64, json, os, sys, time, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from modal_auth import proxy_headers  # noqa: E402  RE8-010

HERE = os.path.dirname(os.path.abspath(__file__))

def conf(key):
    try:
        for line in open("/opt/tyzo-ai/tyzo-ai.conf"):
            if line.startswith(key + "="): v = line.split("=", 1)[1].strip()
        return v
    except Exception:
        return ""

URL = os.environ.get("TYZO_ASR_URL") or conf("URL")
TOKEN = os.environ.get("TYZO_ASR_TOKEN") or conf("TYZO_ASR_TOKEN")
if not URL or not TOKEN:
    sys.exit("Thiếu địa chỉ hoặc chuỗi bảo vệ: chạy tyzo-ai → 1. Cài đặt, hoặc đặt TYZO_ASR_URL và TYZO_ASR_TOKEN.")

path, lang = sys.argv[1], sys.argv[2]
profile = sys.argv[3] if len(sys.argv) > 3 else None
if path.startswith("http://") or path.startswith("https://"):   # link tải trực tiếp video
    local = os.path.join(os.path.expanduser("~"), "video_thu." + (path.split("?")[0].rsplit(".", 1)[-1] if "." in path.split("/")[-1] else "mp4"))
    print("Đang tải video về VPS…")
    urllib.request.urlretrieve(path, local); path = local
body = json.dumps({"token": TOKEN, "audio_b64": base64.b64encode(open(path, "rb").read()).decode(), "ext": path.rsplit(".", 1)[-1],
                   "lang": lang, **({"profile": profile} if profile else {})}).encode()
req = urllib.request.Request(URL, body, {"Content-Type": "application/json", "User-Agent": "tyzo-asr-client/1.0", **proxy_headers()})

# Modal: việc quá 150 giây được trả 303 về một địa chỉ hỏi lại kết quả, lặp tới khi xong → cho phép hỏi lại nhiều lần.
class Doi(urllib.request.HTTPRedirectHandler):
    max_repeats = 1000
    max_redirections = 1000
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        print(f"  … máy đang xử lý ({time.time() - t:.0f} s), hỏi lại kết quả", flush=True)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

print("Đang gửi lên Modal… (máy đang tắt thì phải chờ máy bật)", flush=True)
t = time.time()
try:
    r = json.load(urllib.request.build_opener(Doi).open(req, timeout=3600))
except urllib.error.HTTPError as e:
    noi_dung = e.read().decode("utf-8", "replace")
    try: noi_dung = json.loads(noi_dung).get("loi") or noi_dung
    except Exception: pass
    print(f"LỖI {e.code} sau {time.time() - t:.0f} s:\n{noi_dung[-2500:]}")
    print("Xem thêm: tyzo-ai nhat-ky")
    sys.exit(1)
cho = time.time() - t
st = r["stats"]
out = os.path.splitext(path)[0] + f".{st.get('luong', profile or 'ky')}.srt"
open(out, "w").write(r["srt"])

# tóm tắt
try:
    cfg = json.load(open(os.path.join(HERE, "cau-hinh.json")))
    gia_l4 = cfg["gia_gpu_usd_gio"][cfg["gpu"]["nhan_dang"][0]]
except Exception:
    gia_l4 = 0.8
xu_ly = st.get("giay_xu_ly") or 0; tieng = st.get("giay_tieng") or 0
tien_gpu = xu_ly / 3600 * gia_l4; tien_chu = st.get("tien_model_chu_usd", 0) or 0
print()
print(f"✔ Xong: khách chờ {cho:.1f} s, máy xử lý {xu_ly} s cho {tieng} s tiếng (luồng {st.get('luong')}, hợp nhất {st.get('che_do_hop_nhat')}).")
if cho - xu_ly > 20:
    print(f"  Chờ máy bật: khoảng {cho - xu_ly:.0f} s. Chi tiết bật máy: {json.dumps(st.get('bat_may', {}), ensure_ascii=False)}")
print(f"  Cách hợp nhất từng nhóm câu: {json.dumps(st.get('hop_nhat', {}), ensure_ascii=False)}  (gpu = Qwen trên GPU, ali = Alibaba, khop = các lần nghe đã khớp nên khỏi gọi)")
print(f"  Tiền lần này: GPU nhận dạng ~{tien_gpu:.4f} USD + Alibaba {tien_chu:.4f} USD (máy model chữ tính riêng theo giây bật).")
if tieng:
    print(f"  Quy ra 1 giờ phim: GPU nhận dạng ~{tien_gpu / tieng * 3600:.3f} USD, Alibaba ~{tien_chu / tieng * 3600:.3f} USD.")
print(f"  Phụ đề: {out}")
print(f"  Số liệu đầy đủ: {json.dumps(st, ensure_ascii=False)}")
