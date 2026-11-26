"""CPU-only: apply the automatic outro filter (luong-ky/loc_chao.py) to all saved FLEURS responses.

Unlike item 28, nothing is chosen by hand: every saved segment of both profiles goes through
the same rule that pml.run now applies on Modal. Prints each dropped segment and the CER before/after.
"""
import json
import sys
from pathlib import Path

from prepare import normalize
from score import distance

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "luong-ky"))
from loc_chao import drop_misplaced_outro  # noqa: E402


def compare(report_path):
    report = json.loads(report_path.read_text())
    print(f"Báo cáo: {report_path}")
    for profile in ("nhanh", "ky"):
        result = report["results"][profile]
        clips = result["clips"]
        if result["missing_ids"] or len(clips) != 8:
            raise ValueError(f"Báo cáo thiếu mẫu cho {profile}")
        before = after = characters = 0
        for sha, clip in sorted(clips.items(), key=lambda kv: kv[1]["id"]):
            ref, text = normalize(clip["reference"]), normalize(clip["text"])
            errors = distance(ref, text)
            if errors != clip["errors"] or len(ref) != clip["characters"]:
                raise ValueError(f"Điểm gốc không khớp ở ID {clip['id']}")
            row = json.loads((report_path.parent / f"{profile}-{sha}.json").read_text())
            segs = row["response"]["segs"]
            if (row["config_id"] != report["config_id"] or row["sha256"] != sha or row["profile"] != profile
                    or normalize(" ".join(s["text"] for s in segs)) != text):
                raise ValueError(f"Đoạn lưu không khớp ở ID {clip['id']}")
            keep, dropped = drop_misplaced_outro(segs, "ko")
            revised = distance(ref, normalize(" ".join(s["text"] for s in keep)))
            for seg in dropped:
                print(f"{profile} · {clip['id']} · bỏ {seg['start']:.3f}–{seg['end']:.3f} s «{seg['text']}» · "
                      f"{errors} → {revised} lỗi")
            before += errors
            after += revised
            characters += len(ref)
        print(f"{profile}: {before}/{characters} ({before/characters:.2%}) → "
              f"{after}/{characters} ({after/characters:.2%})")


if __name__ == "__main__":
    cache = Path(sys.argv[1])
    root = cache / ("set-" + (cache / "revision").read_text().strip())
    reports = list(root.glob("asr/*/report.json"))
    if not reports:
        sys.exit("Thiếu báo cáo mục 26.")
    compare(max(reports, key=lambda path: path.stat().st_mtime_ns))
