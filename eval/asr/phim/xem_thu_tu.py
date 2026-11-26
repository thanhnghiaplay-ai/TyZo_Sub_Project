"""Mục 39 (CPU, chỉ đọc): soi thứ tự thời gian và câu lặp trong kết quả nhận dạng đã lưu của mục 38.

    xem_thu_tu.py <thư mục kết quả mục 38> [luồng]

In: số đo của lượt nhận dạng, các câu có giờ bắt đầu lùi so với câu trước, các câu lặp gần nhau
(cùng chữ sau chuẩn hóa, cách nhau dưới 15 s), câu chồng giờ lên câu trước, và các khoảng dò lặng đã nhận.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path


def norm(text):
    return re.sub(r"[^\w]|_", "", unicodedata.normalize("NFKC", text).lower())


def main(folder, profile="nhanh"):
    data = json.loads((Path(folder) / f"nhan-dang-{profile}.json").read_text())
    segs, st = data["segs"], data["stats"]
    print(f"Chờ {data.get('cho_s')} s · xử lý {st.get('giay_xu_ly')} s cho {st.get('giay_tieng')} s tiếng · "
          f"{len(segs)} câu · hợp nhất {st.get('hop_nhat')} · gọi model chữ {st.get('model_chu')} · "
          f"bật sẵn máy chữ {st.get('bat_san_may_chu')} · máy chữ sẵn sàng sau "
          f"{st.get('bat_may', {}).get('model_chu_san_sang_sau_s')} s · bỏ câu chào {st.get('bo_chao')} · "
          f"thời gian {st.get('time')}")
    back, dup, overlap = [], [], []
    for i in range(1, len(segs)):
        a, b = segs[i - 1], segs[i]
        if b["start"] < a["start"] - 0.05:
            back.append(i)
        elif b["start"] < a["end"] - 0.3:
            overlap.append(i)
        for j in range(max(0, i - 6), i):
            if norm(segs[j]["text"]) and norm(segs[j]["text"]) == norm(b["text"]) and abs(segs[j]["start"] - b["start"]) < 15:
                dup.append((j, i))
                break

    def show(i):
        s = segs[i]
        return f"#{i + 1} {s['start']:.2f}–{s['end']:.2f} {s['text']}"

    print(f"\nGiờ lùi so với câu trước: {len(back)} chỗ")
    for i in back:
        print(f"  {show(i - 1)}\n   → {show(i)}")
    print(f"\nChồng giờ lên câu trước (> 0,3 s): {len(overlap)} chỗ")
    for i in overlap[:15]:
        print(f"  {show(i - 1)}\n   → {show(i)}")
    print(f"\nCâu lặp gần nhau (cùng chữ, cách < 15 s): {len(dup)} cặp")
    for j, i in dup:
        print(f"  {show(j)}\n   = {show(i)}")
    probes = [p for p in st.get("probe", []) if p.get("ok")]
    print(f"\nKhoảng lặng dò được và nhận: {len(probes)}")
    for p in probes:
        print(f"  {p['gap']} · lệch {p['d']} · {' | '.join(p.get('c', []))[:150]}")


if __name__ == "__main__":
    main(sys.argv[1], *(sys.argv[2:3]))
