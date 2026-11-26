"""Xem phụ đề (.srt) của lần «So sánh test», đặt cạnh đáp án.

    python3 xem_srt_test.py                    liệt kê clip và luồng đã có, kèm lỗi
    python3 xem_srt_test.py <clip>             in đáp án + phụ đề MỌI luồng của clip (mỗi luồng lấy lần chạy ít lỗi nhất)
    python3 xem_srt_test.py <clip> <luồng>     chỉ in một luồng
    python3 xem_srt_test.py <clip> <luồng> <lần>   chọn lần chạy cụ thể
Thư mục kết quả: TYZO_TEST_OUT, không có thì ../ket-qua (cùng chỗ với so_sanh_asr.py).
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.environ.get("TYZO_TEST_OUT") or os.path.join(ROOT, "ket-qua")
SRT = os.path.join(OUT, "srt-test")

def load():
    try: return json.load(open(os.path.join(OUT, "so-sanh-test.json"), encoding="utf-8")).get("ket_qua", {})
    except Exception: return {}

def runs(res):
    d = {}
    for k, v in res.items():
        prof, clip, i = k.split("|"); d.setdefault(clip, {}).setdefault(prof, {})[int(i)] = v
    return d

def ts(x):
    return f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int((x % 1) * 1000):03d}"

def truth_srt(clip):
    try: t = json.load(open(os.path.join(ROOT, "dap-an", f"{clip}_dap_an.json"), encoding="utf-8"))
    except Exception: return None
    return "".join(f"{i}\n{ts(s['start'])} --> {ts(s['end'])}\n{s['text']}\n\n" for i, s in enumerate(t, 1))

def main():
    d = runs(load())
    if not d: sys.exit(f"Chưa có kết quả trong {OUT}. Chạy «So sánh test» trước.")
    if len(sys.argv) < 2:
        for clip, profs in d.items():
            print(f"\n{clip}:")
            for prof, rr in sorted(profs.items(), key=lambda kv: min(v["er"] for v in kv[1].values())):
                best = min(rr, key=lambda i: rr[i]["er"])
                print(f"  {prof:16s} {len(rr)} lần · ít lỗi nhất {rr[best]['er']*100:5.1f}% (lần {best})")
        return
    clip = sys.argv[1]
    if clip not in d: sys.exit(f"Không có clip '{clip}'. Có: {', '.join(d)}")
    only = sys.argv[2] if len(sys.argv) > 2 else None
    if only and only not in d[clip]: sys.exit(f"Clip {clip} không có luồng '{only}'. Có: {', '.join(d[clip])}")
    t = truth_srt(clip)
    if t and not only: print(f"######## ĐÁP ÁN {clip} ########\n{t}")
    for prof, rr in sorted(d[clip].items(), key=lambda kv: min(v["er"] for v in kv[1].values())):
        if only and prof != only: continue
        i = int(sys.argv[3]) if len(sys.argv) > 3 else min(rr, key=lambda k: rr[k]["er"])
        if i not in rr: sys.exit(f"Luồng {prof} không có lần {i}. Có: {sorted(rr)}")
        v = rr[i]
        print(f"######## {clip} · {prof} · lần {i} · lỗi {v['er']*100:.1f}% · rác {len(v['junk'])} · xử lý {v.get('xu_ly_s')}s ########")
        try: print(open(os.path.join(OUT, v["srt"]), encoding="utf-8").read())
        except Exception: print("(không đọc được tệp srt)")
        if v["junk"]: print("Câu rác:", " | ".join(v["junk"]), "\n")

if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:      # thoát less giữa chừng
        try: sys.stdout.close()
        except Exception: pass
