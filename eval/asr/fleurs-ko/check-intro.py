"""CPU-only counterfactual for two reviewed FLEURS clips in a saved run."""
import json
import sys
from pathlib import Path

from prepare import normalize
from score import distance

GREETING = normalize("다음 영상에서 만나요.")
REVIEWED = {1662, 1663}


def compare(report_path):
    report = json.loads(report_path.read_text())
    print(f"Báo cáo: {report_path}")
    for profile in ("nhanh", "ky"):
        result = report["results"][profile]
        clips = result["clips"]
        if result["missing_ids"] or len(clips) != 8 or not REVIEWED.issubset(
            {clip["id"] for clip in clips.values()}
        ):
            raise ValueError(f"Báo cáo thiếu mẫu cho {profile}")
        before = after = characters = 0
        for sha, clip in clips.items():
            ref = normalize(clip["reference"])
            text = normalize(clip["text"])
            errors = distance(ref, text)
            if errors != clip["errors"] or len(ref) != clip["characters"]:
                raise ValueError(f"Điểm gốc không khớp ở ID {clip['id']}")
            before += errors
            characters += len(ref)
            if clip["id"] in REVIEWED:
                saved = report_path.parent / f"{profile}-{sha}.json"
                row = json.loads(saved.read_text())
                segments = row["response"]["segs"]
                parts = [seg["text"] for seg in segments]
                if (row["config_id"] != report["config_id"] or row["sha256"] != sha
                        or row["profile"] != profile or not parts
                        or normalize(parts[0]) != GREETING or normalize(" ".join(parts)) != text):
                    raise ValueError(f"Đoạn lưu không khớp ở ID {clip['id']}")
                revised = distance(ref, normalize(" ".join(parts[1:])))
                print(f"{profile} · {clip['id']} · {errors} → {revised} lỗi")
                errors = revised
            after += errors
        print(f"{profile}: {before}/{characters} ({before/characters:.2%}) → "
              f"{after}/{characters} ({after/characters:.2%})")


if __name__ == "__main__":
    cache = Path(sys.argv[1])
    root = cache / ("set-" + (cache / "revision").read_text().strip())
    reports = list(root.glob("asr/*/report.json"))
    if not reports:
        sys.exit("Thiếu báo cáo mục 26.")
    compare(max(reports, key=lambda path: path.stat().st_mtime_ns))
