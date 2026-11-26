"""CPU-only, read-only: lay ID 1673 side by side from saved files (reference, nhanh, ky, Vietnamese).

Shows each character edit against the reference, the saved segments around the phrase
연합 규약 (Articles of Confederation), and the saved Vietnamese translation, so the point
where "Các Điều khoản Hợp bang" became "thương mại liên bang" can be located without any
Modal request. With --dich-chuan it sends at most one Modal text request: the reference
Korean sentence of 1673, with the same prompt, model and parameters as item 27.
"""
import json
import sys
from pathlib import Path

from prepare import normalize
from score import distance

HERE = Path(__file__).resolve().parent
CASE_ID = 1673
PHRASE = "연합규약"  # Articles of Confederation, normalized
KO_HINTS = ("연합", "규약", "연방", "교역", "통상", "무역", "상업", "우선")
VI_HINTS = ("Điều khoản", "Hợp bang", "Liên bang", "liên bang", "thương mại", "ưu tiên", "13")


def edits(ref, hyp):
    """Levenshtein backtrace -> list of (op, ref_index, ref_char, hyp_char)."""
    rows = [list(range(len(hyp) + 1))]
    for i, r in enumerate(ref, 1):
        row = [i]
        for j, h in enumerate(hyp, 1):
            row.append(min(row[-1] + 1, rows[-1][j] + 1, rows[-1][j - 1] + (r != h)))
        rows.append(row)
    i, j, out = len(ref), len(hyp), []
    while i or j:
        if i and j and rows[i][j] == rows[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]):
            if ref[i - 1] != hyp[j - 1]:
                out.append(("thay", i - 1, ref[i - 1], hyp[j - 1]))
            i, j = i - 1, j - 1
        elif i and rows[i][j] == rows[i - 1][j] + 1:
            out.append(("thiếu", i - 1, ref[i - 1], ""))
            i -= 1
        else:
            out.append(("thừa", i, "", hyp[j - 1]))
            j -= 1
    return out[::-1]


def find_report(root, sha):
    for path in sorted(root.glob("asr/*/report.json"), key=lambda p: p.stat().st_mtime_ns, reverse=True):
        results = json.loads(path.read_text())["results"]
        if all(sha in results.get(p, {}).get("clips", {}) for p in ("nhanh", "ky")):
            return path
    sys.exit(f"Thiếu báo cáo mục 26 có ID {CASE_ID} ở cả nhanh và ky.")


def main(cache):
    cases = json.loads((HERE / "ko-vi-cases.json").read_text())
    case = next(c for c in cases["cases"] if c["id"] == CASE_ID)
    sha = case["sha256"]
    root = cache / ("set-" + cases["revision"])
    path = find_report(root, sha)
    report = json.loads(path.read_text())
    print(f"Báo cáo: {path}\nconfig_id: {report['config_id']}")
    first = None
    for profile in ("nhanh", "ky"):
        clip = report["results"][profile]["clips"][sha]
        if clip["id"] != CASE_ID:
            raise ValueError(f"SHA-256 không ứng với ID {CASE_ID} ở {profile}")
        ref, hyp = normalize(clip["reference"]), normalize(clip["text"])
        if first is None:
            first = clip["reference"]
            print(f"\nHàn chuẩn: {clip['reference']}")
            start = ref.find(PHRASE)
            print(f"Cụm 연합 규약 ở ký tự {start}–{start + len(PHRASE) - 1} của câu chuẩn hóa")
        ops = edits(ref, hyp)
        if len(ops) != distance(ref, hyp) or len(ops) != clip["errors"]:
            raise ValueError(f"Số lỗi không khớp báo cáo ở {profile}")
        print(f"\n[{profile}] {len(ops)}/{len(ref)} lỗi · {clip['text']}")
        for op, at, r, h in ops:
            near = " ← trong/sát cụm 연합 규약" if start - 1 <= at <= start + len(PHRASE) else ""
            print(f"  {op} @{at}: '{r}' → '{h}' · ngữ cảnh chuẩn «{ref[max(0, at-4):at+5]}»{near}")
        print("  có trong bản chép: " + ", ".join(k for k in KO_HINTS if k in hyp))
        saved = json.loads((path.parent / f"{profile}-{sha}.json").read_text())
        if (saved["sha256"], saved["profile"], saved["config_id"]) != (sha, profile, report["config_id"]):
            raise ValueError(f"Phản hồi lưu không khớp ở {profile}")
        for seg in saved["response"]["segs"]:
            times = " ".join(f"{k}={v:.3f}" for k, v in seg.items() if isinstance(v, (int, float)))
            print(f"  đoạn {times or '?'} · {seg['text']}")
    out = path.parent / "dich-ko-vi"
    files = sorted(out.glob(f"{CASE_ID}-*.json")) if out.is_dir() else []
    if not files:
        print("\nChưa có bản dịch đã lưu cho ID 1673 (mục 27).")
    for file in files:
        row = json.loads(file.read_text())
        same = normalize(row["text"]) == normalize(report["results"]["nhanh"]["clips"][sha]["text"])
        print(f"\nBản dịch {file.name} · model {row.get('model')} · đầu vào {'= bản chép nhanh' if same else 'KHÁC bản chép nhanh'}")
        print(f"  {row['vi']}")
        print("  có trong bản dịch: " + ", ".join(k for k in VI_HINTS if k in row["vi"]))
    print(f"\nĐáp án Việt tạm: {case['reference_vi']}")


def translate_reference(cache):
    import fcntl
    from translate import request
    cases = json.loads((HERE / "ko-vi-cases.json").read_text())
    case = next(c for c in cases["cases"] if c["id"] == CASE_ID)
    sha = case["sha256"]
    path = find_report(cache / ("set-" + cases["revision"]), sha)
    clips = json.loads(path.read_text())["results"]["nhanh"]["clips"]
    reference, asr = clips[sha]["reference"], clips[sha]["text"]
    model = json.loads((HERE.parent / "luong-ky/modal/cau-hinh.json").read_text())["hop_nhat"]["gpu"]["model"]
    out = path.parent / "dich-ko-vi"
    out.mkdir(exist_ok=True)
    print(f"Báo cáo: {path}\nModel: {model}\nHàn chuẩn: {reference}")
    with (out / "run.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        saved = None
        for name in sorted(out.glob(f"{CASE_ID}-chuan-*.json")):
            row = json.loads(name.read_text())
            if row["text"] == reference and row["model"] == model:
                saved = name
        if saved is None:
            answer = input("Chưa có bản dịch câu chuẩn. Gửi 1 yêu cầu Modal chữ? (c/k): ") if sys.stdin.isatty() else "k"
            if answer.strip().lower() != "c":
                sys.exit("Đã dừng, không gửi yêu cầu.")
            saved, _ = request(reference, model, out, CASE_ID, sha, tag="chuan-")
        else:
            print("Dùng bản dịch đã lưu, không gửi yêu cầu.")
    rows = [("Từ câu Hàn chuẩn", json.loads(saved.read_text()))]
    for name in sorted(out.glob(f"{CASE_ID}-*.json")):
        row = json.loads(name.read_text())
        if "-chuan-" not in name.name and row["text"] == asr and row["model"] == model:
            rows.append(("Từ bản chép nhanh (mục 27)", row))
    for label, row in rows:
        print(f"\n{label} · {row.get('seconds') or 0:.1f} s · {row['vi']}")
        print("  có trong bản dịch: " + ", ".join(k for k in VI_HINTS if k in row["vi"]))
    print(f"\nĐáp án Việt tạm: {case['reference_vi']}")
    print(f"Tệp: {saved}")


if __name__ == "__main__":
    if sys.argv[1] == "--dich-chuan":
        translate_reference(Path(sys.argv[2]))
    else:
        main(Path(sys.argv[1]))
