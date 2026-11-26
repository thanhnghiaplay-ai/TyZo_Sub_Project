"""Mục 36 (CPU, chỉ đọc): so hai lượt mục 26 gần nhất theo từng ID.

In số lỗi cũ → mới của từng ID ở mỗi luồng, các đoạn bộ lọc câu chào đã bỏ (`stats.bo_chao`)
và toàn bộ đoạn có mốc thời gian của lượt mới ở các ID có lỗi thay đổi hoặc còn câu chào.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "luong-ky"))
from loc_chao import _PHRASES, _norm, is_outro  # noqa: E402


def has_outro(text):
    return any(p in _norm(text) for p in _PHRASES["ko"])


def main(cache):
    root = cache / ("set-" + (cache / "revision").read_text().strip())
    reports = sorted(root.glob("asr/*/report.json"), key=lambda p: p.stat().st_mtime_ns)
    if len(reports) < 2:
        sys.exit("Cần ít nhất hai báo cáo mục 26.")
    old_path, new_path = reports[-2], reports[-1]
    old, new = (json.loads(p.read_text()) for p in (old_path, new_path))
    print(f"Cũ: {old_path.parent.name[:12]}… · nhãn {old.get('identity', {}).get('deployment')}")
    print(f"Mới: {new_path.parent.name[:12]}… · nhãn {new.get('identity', {}).get('deployment')}")
    for profile in ("nhanh", "ky"):
        o, n = old["results"][profile]["clips"], new["results"][profile]["clips"]
        print(f"\n[{profile}] tổng {sum(c['errors'] for c in o.values())} → {sum(c['errors'] for c in n.values())} lỗi")
        for sha, clip in sorted(n.items(), key=lambda kv: kv[1]["id"]):
            before = o.get(sha, {}).get("errors")
            row = json.loads((new_path.parent / f"{profile}-{sha}.json").read_text())
            stats, segs = row["response"]["stats"], row["response"]["segs"]
            dropped = stats.get("bo_chao")
            left = [s for s in segs if has_outro(s["text"])]
            mark = f" · bỏ {dropped}" if dropped else (" · không có bo_chao (bản cũ?)" if dropped is None else "")
            print(f"  {clip['id']}: {before} → {clip['errors']} lỗi{mark}")
            if before != clip["errors"] or left or dropped:
                for s in segs:
                    flag = (" ← câu chào riêng một đoạn" if is_outro(s["text"], "ko")
                            else " ← câu chào dính trong đoạn" if has_outro(s["text"]) else "")
                    print(f"      {s['start']:.3f}–{s['end']:.3f} s · {s['text']}{flag}")
                for gap in stats.get("probe") or []:
                    texts = " | ".join(t for t in gap.get("c", []) if t.strip()) or "(trống)"
                    print(f"      dò khoảng lặng {gap.get('gap')} · {'NHẬN' if gap.get('ok') else 'bỏ'} · lệch {gap.get('d')} · {texts[:160]}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
