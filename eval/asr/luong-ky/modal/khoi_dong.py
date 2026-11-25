"""Mục 33 (CPU, chỉ đọc): đo thời gian bật máy Modal từ các kết quả đã lưu, không gửi yêu cầu nào.

Nguồn:
  * Phản hồi nhận dạng có `stats.bat_may` (thời gian từng bước khi máy nhận dạng bật: nạp thư viện,
    Whisper, SepFormer, …, và `model_chu_san_sang_sau_s` = máy model chữ trả /health sau bao lâu).
    Các phản hồi do cùng một máy phục vụ mang cùng bộ số này, nên mỗi bộ số khác nhau = một lần bật máy.
    Nếu phản hồi có `elapsed` (người gọi chờ) và `stats.giay_xu_ly`, phần chênh = tải lên + xếp hàng + bật máy.
  * Bản dịch đã lưu (`dich-ko-vi/*.json`, trường `seconds`): yêu cầu chậm bất thường thường là lần bật máy chữ.

Dùng: khoi_dong.py <thư mục> [<thư mục> …]   (quét đệ quy mọi *.json nhỏ hơn 20 MB)
"""
import json
import statistics
import sys
from datetime import datetime
from pathlib import Path

SLOW_TRANSLATION_S = 30.0


def find_stats(node, out=None):
    """Mọi dict `stats` có khóa `bat_may` trong một JSON bất kỳ."""
    out = [] if out is None else out
    if isinstance(node, dict):
        if isinstance(node.get("bat_may"), dict):
            out.append(node)
            return out
        for value in node.values():
            find_stats(value, out)
    elif isinstance(node, list):
        for value in node:
            find_stats(value, out)
    return out


def scan(roots):
    asr, translations = [], []
    for root in roots:
        for path in sorted(Path(root).rglob("*.json")):
            try:
                if path.stat().st_size > 20 * 1024 * 1024:
                    continue
                data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            when = path.stat().st_mtime
            if path.parent.name == "dich-ko-vi" and isinstance(data, dict) and "seconds" in data and "vi" in data:
                translations.append((when, path, data))
                continue
            found = find_stats(data)
            elapsed = data.get("elapsed") if isinstance(data, dict) and len(found) == 1 else None
            for stats in found:
                asr.append((when, path, stats, elapsed))
    return asr, translations


def fmt_time(ts):
    return datetime.fromtimestamp(ts).strftime("%d/%m %H:%M:%S")


HOW = {"khop": "các bản khớp nhau, không gọi model chữ", "gpu": "model chữ trên GPU Modal",
       "ali": "Alibaba", "khong": "không model chữ nào trả lời, lấy bản ở giữa",
       "khong-ro": "lời không rõ, bỏ đoạn", "fuse": "model chữ (cấu hình cũ)"}


def fusion_report(asr):
    """Mỗi đoạn nhận dạng được hợp nhất bằng cách nào, và model chữ có thật sự được gọi không."""
    groups = {}
    for when, path, stats, elapsed in asr:
        key = (stats.get("che_do_hop_nhat", "?"), stats.get("luong", "?"))
        g = groups.setdefault(key, {"n": 0, "how": {}, "calls": {}, "ready": 0, "usd": 0.0})
        g["n"] += 1
        for how, count in (stats.get("hop_nhat") or {}).items():
            g["how"][how] = g["how"].get(how, 0) + count
        for model, use in (stats.get("model_chu") or {}).items():
            g["calls"][model] = g["calls"].get(model, 0) + int(use.get("goi", 0))
        g["ready"] += "model_chu_san_sang_sau_s" in stats.get("bat_may", {})
        g["usd"] += float(stats.get("tien_model_chu_usd") or 0)
    print("\n== Hợp nhất trong phản hồi nhận dạng ==")
    for (mode, profile), g in sorted(groups.items()):
        print(f"\nChế độ {mode} · luồng {profile} · {g['n']} phản hồi")
        for how, count in sorted(g["how"].items(), key=lambda kv: -kv[1]):
            print(f"  {count:4} đoạn · {how} ({HOW.get(how, '?')})")
        calls = ", ".join(f"{m}: {c} lần" for m, c in g["calls"].items()) or "không có lần gọi thành công"
        print(f"  Model chữ được gọi: {calls} · tiền model chữ ghi nhận {g['usd']:.5f} USD")
        print(f"  Phản hồi có số máy chữ sẵn sàng: {g['ready']}/{g['n']}")


def main(roots):
    asr, translations = scan(roots)
    asr.sort(key=lambda row: row[0])
    translations.sort(key=lambda row: row[0])
    print(f"Phản hồi nhận dạng có số bật máy: {len(asr)} · bản dịch đã lưu: {len(translations)}")

    boots = {}
    for when, path, stats, elapsed in asr:
        key = json.dumps(stats["bat_may"], sort_keys=True)
        boots.setdefault(key, []).append((when, path, stats, elapsed))

    print(f"\n== Máy nhận dạng: {len(boots)} lần bật máy khác nhau ==")
    totals, llm_ready = [], []
    for index, (key, rows) in enumerate(boots.items(), 1):
        boot = json.loads(key)
        first = rows[0]
        steps = " · ".join(f"{k}={v}" for k, v in boot.items())
        print(f"\nLần {index} · {len(rows)} phản hồi · tệp đầu {fmt_time(first[0])} · {first[1]}")
        print(f"  {steps or '(trống)'}")
        if isinstance(boot.get("bat_may_tong_s"), (int, float)):
            totals.append(boot["bat_may_tong_s"])
        if isinstance(boot.get("model_chu_san_sang_sau_s"), (int, float)):
            llm_ready.append(boot["model_chu_san_sang_sau_s"])
        for when, path, stats, elapsed in rows[:3]:
            work = stats.get("giay_xu_ly")
            if isinstance(elapsed, (int, float)) and isinstance(work, (int, float)):
                print(f"  {fmt_time(when)} · {stats.get('luong', '?')} · chờ {elapsed:.1f} s · xử lý {work:.1f} s"
                      f" · ngoài xử lý {elapsed - work:.1f} s · {path.name}")
        if len(rows) > 3:
            print(f"  … thêm {len(rows) - 3} phản hồi cùng máy")

    def summary(name, values):
        if values:
            print(f"  {name}: {len(values)} lần · nhỏ nhất {min(values):.1f} s · trung vị "
                  f"{statistics.median(values):.1f} s · lớn nhất {max(values):.1f} s")
        else:
            print(f"  {name}: chưa có số")

    print("\n== Tóm tắt ==")
    summary("Máy nhận dạng tự nạp xong (bat_may_tong_s, chưa gồm thời gian Modal cấp máy và tải ảnh)", totals)
    summary("Máy model chữ trả /health sau (đo từ máy nhận dạng)", llm_ready)

    fusion_report(asr)

    if translations:
        print(f"\n== Bản dịch đã lưu (yêu cầu > {SLOW_TRANSLATION_S:.0f} s đánh dấu có thể bật máy chữ) ==")
        fast = []
        for when, path, row in translations:
            seconds = row.get("seconds") or 0
            if seconds > SLOW_TRANSLATION_S:
                print(f"  {fmt_time(when)} · {seconds:.1f} s · ID {row.get('id')} · {path.name[:40]}…")
            else:
                fast.append(seconds)
        summary("Yêu cầu dịch khi máy đã bật", fast)
    print("\nGiờ theo thời điểm ghi tệp trên VPS. Một máy có thể phục vụ nhiều lượt nếu chưa tắt (chữ 5 phút, nhận dạng 60 s).")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main([p for p in sys.argv[1:] if Path(p).exists()])
