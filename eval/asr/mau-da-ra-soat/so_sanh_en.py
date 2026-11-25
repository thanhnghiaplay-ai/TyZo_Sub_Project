"""Chạy trong môi trường đã cài các phụ thuộc của công cụ chấm TyZo."""
import importlib.util
import json
import sys
import tempfile
from pathlib import Path

data = Path(__file__).resolve().parent
cases = {
    "": ("thu-ngay", "ket-qua-en"),
    "--tieng-trung": ("cho-duyet", "ket-qua-zh"),
    "--nhac-nen": ("thu-nhac-nen", "ket-qua-en-nhac-nen"),
    "--xem-noi-chong": ("thu-noi-chong", "ket-qua-en-noi-chong"),
    "--noi-chong": ("thu-noi-chong", "ket-qua-en-noi-chong"),
}
mode = sys.argv[2] if len(sys.argv) == 3 else ""
if len(sys.argv) not in (2, 3) or mode not in cases:
    sys.exit("Cách dùng: python3 so_sanh_en.py /duong/dan/TyZo_Sub_Project [--nhac-nen | --noi-chong | --xem-noi-chong | --tieng-trung]")
clip_dir, result_dir = cases[mode]
entry = Path(sys.argv[1]).resolve() / "eval/asr/luong-ky/modal/so_sanh_asr.py"
if not entry.is_file():
    sys.exit(f"Thiếu công cụ so sánh: {entry}")
spec = importlib.util.spec_from_file_location("tyzo_compare", entry)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
clips = data / clip_dir
out = data / result_dir
module.ROOT = str(data)
overlap = mode in ("--noi-chong", "--xem-noi-chong")
if mode == "--tieng-trung":
    module.SETS = [("zh", "zh")]
if overlap:
    from score import norm, err
    answers = json.loads((clips / "dap-an/en_dap_an.json").read_text())
    emma, daniel = [norm(line["text"], "en").split() for line in answers]
    # Mẫu dựng này có đúng một câu ngắn của Daniel chen giữa lời Emma.
    references = [" ".join(emma[:i] + daniel + emma[i:]) for i in range(len(emma) + 1)]

    def overlap_errors(text):
        hyp = norm(text, "en")
        return min((err(ref, hyp, "en") for ref in references), key=lambda v: sum(v[:3]))

    original_score = module.score

    def score_overlap(segs, truth, lang):
        result = original_score(segs, truth, lang)
        counts = overlap_errors(" ".join(seg["text"] for seg in segs))
        result.update(zip(("S", "D", "I", "N"), counts))
        result["er"] = round(sum(counts[:3]) / counts[3], 3)
        return result

    module.score = score_overlap
    module.ROOT = str(clips)

if mode == "--xem-noi-chong":
    files = list(out.glob("lan-*/so-sanh-test.json"))
    if not files:
        sys.exit("Chưa có kết quả mục 18.")
    out = max(files, key=lambda path: path.stat().st_mtime_ns).parent
else:
    if overlap or mode == "--tieng-trung":
        out.mkdir(exist_ok=True)
        out = Path(tempfile.mkdtemp(prefix="lan-", dir=out))
    module.OUT_DIR = str(out)
    module.SRT_DIR = str(out / "srt-test")
    sys.argv = [str(entry), str(clips), "1", "nhanh,ky"]
    module.main()

if overlap:
    print(f"\nChấm lời nói chồng · {out.name}")
    results_file = out / "so-sanh-test.json"
    results = json.loads(results_file.read_text())["ket_qua"] if results_file.exists() else {}
    for profile in ("nhanh", "ky"):
        run = results.get(f"{profile}|en|1")
        if run is None:
            print(f"{profile}: thiếu kết quả.")
            continue
        subs, dels, ins, total = overlap_errors(run["ra"])
        heard = set(norm(run["ra"], "en").split())
        missing = [word for word in daniel if word not in heard]
        print(f"{profile}: {subs + dels + ins}/{total} lỗi từ · Daniel thiếu {len(missing)}/{len(daniel)} từ")
        if missing:
            print("  Từ thiếu của Daniel:", ", ".join(missing))
        print(f"  Bản chép: {run['ra']}")

if mode == "--tieng-trung":
    from jiwer import process_characters
    from score import norm

    answers = json.loads((data / "dap-an/zh_dap_an.json").read_text())
    ref = "".join(norm(line["text"], "zh") for line in answers)
    result_file = out / "so-sanh-test.json"
    results = json.loads(result_file.read_text())["ket_qua"] if result_file.exists() else {}
    print("\nTIẾNG TRUNG · Đáp án → bản chép (sau chuẩn hóa giản thể)")
    for profile in ("nhanh", "ky"):
        run = results.get(f"{profile}|zh|1")
        if run is None:
            print(f"{profile}: thiếu kết quả.")
            continue
        print(f"{profile}: thay {run['S']}, thiếu {run['D']}, thừa {run['I']} · {run['N']} ký tự đáp án")
        hyp = norm(run["ra"], "zh")
        for part in process_characters(ref, hyp).alignments[0]:
            if part.type != "equal":
                expected = ref[part.ref_start_idx:part.ref_end_idx] or "∅"
                actual = hyp[part.hyp_start_idx:part.hyp_end_idx] or "∅"
                print(f"  {expected} → {actual}")
