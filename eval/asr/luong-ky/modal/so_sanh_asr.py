"""So Whisper turbo với Qwen3-ASR trên 4 clip thử (Trung, Nhật, Hàn, Anh) qua dịch vụ Modal, chấm bằng score.py.

    python3 so_sanh_asr.py <thư mục có zh2.mp4 ja2.mp4 ko.mp4 en.mp4> [số lần chạy=3] [luồng,luồng,...|all]
Mặc định so TẤT CẢ luồng trong cau-hinh.json (thêm luồng mới vào đó là tự được so). Mỗi luồng chạy nhiều lần vì kết quả tự dao động.
Cuối cùng xếp hạng và chỉ ra luồng tốt nhất. Phụ đề từng lần chạy lưu ở <ra>/srt-test/<clip>.<luồng>.<lần>.srt (xem bằng xem_srt_test.py hoặc tyzo-ai → «Xem srt test»).
Tên tệp: zh2, ja2, ko, en (đuôi mp4/wav/mp3/m4a). Đáp án lấy ở ../dap-an/<tên>_dap_an.json.
Địa chỉ và chuỗi bảo vệ: TYZO_ASR_URL / TYZO_ASR_TOKEN hoặc /opt/tyzo-ai/tyzo-ai.conf. Máy phải được cài với «tyzo-ai» đặt QWEN_PRELOAD=1.
Chạy tuần tự từng việc (luồng Qwen dùng biến chung của máy, không được chạy chung với luồng khác). Kết quả: <ra>/so-sanh-test.json, với <ra> = biến TYZO_TEST_OUT, không có thì ../ket-qua
"""
import base64, json, os, statistics, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)
from score import score

SETS = [("zh2", "zh"), ("ja2", "ja"), ("ko", "ko"), ("en", "en")]
OUT_DIR = os.environ.get("TYZO_TEST_OUT") or os.path.join(ROOT, "ket-qua")
SRT_DIR = os.path.join(OUT_DIR, "srt-test")
CFG = json.load(open(os.path.join(HERE, "cau-hinh.json"), encoding="utf-8"))

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
    arg = sys.argv[3] if len(sys.argv) > 3 else "all"
    profiles = list(CFG["luong"]) if arg == "all" else arg.split(",")
    for p in profiles:
        if p not in CFG["luong"]: sys.exit(f"Luồng '{p}' không có. Có: {', '.join(CFG['luong'])}")
    clips = []
    for F, L in SETS:
        p = next((os.path.join(folder, F + e) for e in (".mp4", ".wav", ".mp3", ".m4a") if os.path.exists(os.path.join(folder, F + e))), None)
        if p: clips.append((F, L, p))
        else: print(f"(bỏ qua {F}: không thấy tệp trong {folder})")
    if not clips: sys.exit(f"Không có clip nào trong {folder} (cần: zh2, ja2, ko, en với đuôi mp4/wav/mp3/m4a).")
    os.makedirs(SRT_DIR, exist_ok=True)
    gia = CFG["gia_gpu_usd_gio"][CFG["gpu"]["nhan_dang"][0]]
    out, table, loi = {}, {}, {}
    # đo theo từng luồng, từng clip; luồng nào lỗi thì ghi lại rồi đi tiếp luồng sau
    for prof in profiles:
        print(f"\n== Luồng {prof}: {CFG['luong'][prof].get('mo_ta', '')}", flush=True)
        for F, L, p in clips:
            truth = json.load(open(os.path.join(ROOT, "dap-an", f"{F}_dap_an.json"), encoding="utf-8"))
            ers, secs, junk, sdi, n_tot, audio, usd = [], [], 0, 0, 0, 0.0, 0.0
            for i in range(runs):
                try:
                    r, cho = goi(p, L, prof)
                except Exception as e:
                    loi[f"{prof}|{F}|{i}"] = str(e)[-600:]
                    print(f"  {prof:16s} {F:4s} lần {i+1}: LỖI {str(e)[:160]}", flush=True)
                    break
                sc = score(r["segs"], truth, L); st = r["stats"]
                open(os.path.join(SRT_DIR, f"{F}.{prof}.{i+1}.srt"), "w", encoding="utf-8").write(r.get("srt", ""))
                xl = st.get("giay_xu_ly") or cho
                ers.append(sc["er"]); secs.append(xl); junk += len(sc["junk"])
                sdi += sc["S"] + sc["D"] + sc["I"]; n_tot += sc["N"]; audio += st.get("giay_tieng") or 0
                usd += (xl / 3600 * gia) + (st.get("tien_model_chu_usd") or 0)
                out[f"{prof}|{F}|{i+1}"] = {"er": sc["er"], "S": sc["S"], "D": sc["D"], "I": sc["I"], "N": sc["N"], "junk": sc["junk"],
                                           "xu_ly_s": st.get("giay_xu_ly"), "cho_s": round(cho, 1), "nhan_dang": st.get("nhan_dang"),
                                           "giay_tieng": st.get("giay_tieng"), "usd": round((xl / 3600 * gia) + (st.get("tien_model_chu_usd") or 0), 5),
                                           "srt": f"srt-test/{F}.{prof}.{i+1}.srt", "ra": " ".join(s_["text"] for s_ in r["segs"])}
                print(f"  {prof:16s} {F:4s} lần {i+1}: lỗi {sc['er']*100:5.1f}%  xử lý {xl}s  rác {len(sc['junk'])}", flush=True)
            if ers: table[(prof, F)] = dict(mean=statistics.mean(ers), lo=min(ers), hi=max(ers), sec=statistics.mean(secs), junk=junk, sdi=sdi, n=n_tot, audio=audio, usd=usd)
            json.dump({"ket_qua": out, "loi": loi}, open(os.path.join(OUT_DIR, "so-sanh-test.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)  # lưu dần, tắt giữa chừng không mất

    ok = [p for p in profiles if all((p, F) in table for F, _, _ in clips)]
    print("\nLỗi chữ trung bình (thấp–cao) · giây xử lý trung bình · số câu rác")
    print(f"{'Luồng':18s}" + "".join(f"{F:>26s}" for F, _, _ in clips))
    for prof in profiles:
        cells = ["{:>26s}".format("{:.1f}% ({:.1f}–{:.1f}) {:.0f}s r{}".format(t["mean"]*100, t["lo"]*100, t["hi"]*100, t["sec"], t["junk"]) if (t := table.get((prof, F))) else "lỗi/không chạy") for F, _, _ in clips]
        print(f"{prof:18s}" + "".join(cells))

    # xếp hạng: lỗi gộp theo số chữ của mọi clip (clip dài có trọng số lớn hơn), chỉ xếp luồng chạy được đủ mọi clip
    rank = []
    for prof in ok:
        ts = [table[(prof, F)] for F, _, _ in clips]
        n = sum(t["n"] for t in ts); au = sum(t["audio"] for t in ts)
        rank.append(dict(luong=prof, loi=sum(t["sdi"] for t in ts) / max(n, 1), xl=statistics.mean(t["sec"] for t in ts),
                         rac=sum(t["junk"] for t in ts), usd_gio=(sum(t["usd"] for t in ts) / au * 3600) if au else 0))
    rank.sort(key=lambda x: x["loi"])
    if rank:
        print("\nXẾP HẠNG (lỗi chữ gộp mọi clip, thấp là tốt)")
        print(f"{'#':>2s} {'Luồng':18s} {'Lỗi':>7s} {'Giây xử lý TB':>14s} {'Câu rác':>8s} {'USD/giờ phim':>13s}")
        for k, x in enumerate(rank, 1):
            print(f"{k:>2d} {x['luong']:18s} {x['loi']*100:6.1f}% {x['xl']:14.0f} {x['rac']:8d} {x['usd_gio']:13.2f}")
        best = rank[0]
        near = [x for x in rank if x["loi"] - best["loi"] <= 0.04]     # chênh dưới 4 điểm chưa chắc là thật
        re_nhat = min(near, key=lambda x: x["usd_gio"]); nhanh = min(near, key=lambda x: x["xl"])
        print(f"\n★ Luồng chính xác nhất: {best['luong']} (lỗi {best['loi']*100:.1f}%)")
        if len(near) > 1:
            print(f"  Các luồng chênh dưới 4 điểm coi như ngang nhau: {', '.join(x['luong'] for x in near)}")
            print(f"  Trong nhóm đó: re_nhat nhất = {re_nhat['luong']} ({re_nhat['usd_gio']:.2f} USD/giờ), nhanh nhất = {nhanh['luong']} ({nhanh['xl']:.0f} s)")
        json.dump({"xep_hang": rank, "tot_nhat": best["luong"], "ngang_nhau": [x["luong"] for x in near], "so_lan_chay": runs, "clip": [F for F, _, _ in clips]},
                  open(os.path.join(OUT_DIR, "so-sanh-test-xep-hang.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if loi: print(f"\nCó {len(loi)} lần chạy lỗi (chi tiết trong so-sanh-test.json, mục «loi»). Luồng lỗi ở clip nào thì không được xếp hạng.")
    print(f"\nKết quả: {OUT_DIR}/so-sanh-test.json · phụ đề: {SRT_DIR}")
    print("Chênh dưới ~4 điểm giữa hai luồng chưa chắc là thật (luồng Kỹ tự dao động 2,3–5,4% giữa các lần chạy).")

if __name__ == "__main__":
    main()
