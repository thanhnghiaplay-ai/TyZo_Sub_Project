"""So Whisper turbo với Qwen3-ASR trên 4 clip thử (Trung, Nhật, Hàn, Anh) qua dịch vụ Modal, chấm bằng score.py.

    python3 so_sanh_asr.py <thư mục có zh2.mp4 ja2.mp4 ko.mp4 en.mp4> [số lần chạy=3] [luồng,luồng,...]
Mặc định so: nhanh (Whisper) ↔ qwen-nhanh ↔ qwen-0.6b-nhanh, rồi ky ↔ qwen. Mỗi cặp chạy nhiều lần vì kết quả tự dao động.
Tên tệp: zh2, ja2, ko, en (đuôi mp4/wav/mp3/m4a). Đáp án lấy ở ../dap-an/<tên>_dap_an.json.
Địa chỉ và chuỗi bảo vệ: TYZO_ASR_URL / TYZO_ASR_TOKEN hoặc /opt/tyzo-ai/tyzo-ai.conf. Máy phải được cài với «tyzo-ai» đặt QWEN_PRELOAD=1.
Chạy tuần tự từng việc (luồng Qwen dùng biến chung của máy, không được chạy chung với luồng khác). Kết quả: ../ket-qua/so-sanh-qwen-asr.json
"""
import base64, json, os, statistics, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)
from score import score

SETS = [("zh2", "zh"), ("ja2", "ja"), ("ko", "ko"), ("en", "en")]

def conf(key):
    v = ""
    try:
        for line in open("/opt/tyzo-ai/tyzo-ai.conf"):
            if line.startswith(key + "="): v = line.split("=", 1)[1].strip()
    except Exception:
        pass
    return v

URL = os.environ.get("TYZO_ASR_URL") or conf("URL"); TOKEN = os.environ.get("TYZO_ASR_TOKEN") or conf("TYZO_ASR_TOKEN")

class Doi(urllib.request.HTTPRedirectHandler):      # Modal trả 303 cho việc quá 150 s: hỏi lại tới khi xong
    max_repeats = 1000; max_redirections = 1000

def goi(path, lang, profile):
    body = json.dumps({"token": TOKEN, "audio_b64": base64.b64encode(open(path, "rb").read()).decode(), "ext": path.rsplit(".", 1)[-1],
                       "lang": lang, "profile": profile}).encode()
    req = urllib.request.Request(URL, body, {"Content-Type": "application/json", "User-Agent": "tyzo-asr-client/1.0"})
    t = time.time()
    try:
        r = json.load(urllib.request.build_opener(Doi).open(req, timeout=3600))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{profile}: lỗi {e.code}: {e.read().decode('utf-8', 'replace')[-600:]}")
    return r, time.time() - t

def main():
    if not URL or not TOKEN: sys.exit("Thiếu địa chỉ hoặc chuỗi bảo vệ (TYZO_ASR_URL, TYZO_ASR_TOKEN).")
    folder = sys.argv[1]; runs = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    profiles = sys.argv[3].split(",") if len(sys.argv) > 3 else ["nhanh", "qwen-nhanh", "qwen-0.6b-nhanh", "ky", "qwen"]
    clips = []
    for F, L in SETS:
        p = next((os.path.join(folder, F + e) for e in (".mp4", ".wav", ".mp3", ".m4a") if os.path.exists(os.path.join(folder, F + e))), None)
        if p: clips.append((F, L, p))
        else: print(f"(bỏ qua {F}: không thấy tệp trong {folder})")
    out, table = {}, {}
    for prof in profiles:
        for F, L, p in clips:
            truth = json.load(open(os.path.join(ROOT, "dap-an", f"{F}_dap_an.json")))
            ers, secs, junk = [], [], 0
            for i in range(runs):
                r, cho = goi(p, L, prof)
                sc = score(r["segs"], truth, L)
                ers.append(sc["er"]); secs.append(r["stats"].get("giay_xu_ly", cho)); junk += len(sc["junk"])
                out[f"{prof}|{F}|{i}"] = {"er": sc["er"], "S": sc["S"], "D": sc["D"], "I": sc["I"], "N": sc["N"], "junk": sc["junk"],
                                         "xu_ly_s": r["stats"].get("giay_xu_ly"), "cho_s": round(cho, 1), "nhan_dang": r["stats"].get("nhan_dang"),
                                         "ra": " ".join(s["text"] for s in r["segs"])}
                print(f"  {prof:16s} {F:4s} lần {i+1}: lỗi {sc['er']*100:5.1f}%  xử lý {secs[-1]}s  rác {len(sc['junk'])}", flush=True)
            table[(prof, F)] = (statistics.mean(ers), min(ers), max(ers), statistics.mean(secs), junk)
    print("\nLỗi chữ trung bình (thấp–cao) · giây xử lý trung bình · số câu rác")
    print(f"{'Luồng':18s}" + "".join(f"{F:>26s}" for F, _, _ in clips))
    for prof in profiles:
        print(f"{prof:18s}" + "".join("{:>26s}".format("{:.1f}% ({:.1f}–{:.1f}) {:.0f}s r{}".format(table[(prof, F)][0]*100, table[(prof, F)][1]*100, table[(prof, F)][2]*100, table[(prof, F)][3], table[(prof, F)][4])) for F, _, _ in clips))
    json.dump(out, open(os.path.join(ROOT, "ket-qua", "so-sanh-qwen-asr.json"), "w"), ensure_ascii=False, indent=1)
    print("\nChênh dưới ~4 điểm giữa hai luồng chưa chắc là thật (luồng Kỹ tự dao động 2,3–5,4% giữa các lần chạy).")

if __name__ == "__main__":
    main()
