"""Chạy trong môi trường đã cài các phụ thuộc của công cụ chấm TyZo."""
import importlib.util
import json
import re
import sys
import tempfile
from pathlib import Path

data = Path(__file__).resolve().parent
cases = {
    "": ("thu-ngay", "ket-qua-en"),
    "--nhac-nen": ("thu-nhac-nen", "ket-qua-en-nhac-nen"),
    "--noi-chong": ("thu-noi-chong", "ket-qua-en-noi-chong"),
}
mode = sys.argv[2] if len(sys.argv) == 3 else ""
if len(sys.argv) not in (2, 3) or mode not in cases:
    sys.exit("Cách dùng: python3 so_sanh_en.py /duong/dan/TyZo_Sub_Project [--nhac-nen | --noi-chong]")
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
if mode == "--noi-chong":
    module.ROOT = str(clips)
    out.mkdir(exist_ok=True)
    out = Path(tempfile.mkdtemp(prefix="lan-", dir=out))
module.OUT_DIR = str(out)
module.SRT_DIR = str(out / "srt-test")
sys.argv = [str(entry), str(clips), "1", "nhanh,ky"]
module.main()

if mode == "--noi-chong":
    answers = json.loads((clips / "dap-an/en_dap_an.json").read_text())
    targets = re.findall(r"[a-z']+", answers[1]["text"].lower())
    results_file = out / "so-sanh-test.json"
    results = json.loads(results_file.read_text())["ket_qua"] if results_file.exists() else {}
    print("\nGIỌNG THỨ HAI · Daniel · " + answers[1]["text"])
    for profile in ("nhanh", "ky"):
        run = results.get(f"{profile}|en|1")
        if run is None:
            print(f"{profile}: thiếu kết quả.")
            continue
        heard = set(re.findall(r"[a-z']+", run["ra"].lower()))
        missing = [word for word in targets if word not in heard]
        print(f"{profile}: thiếu {len(missing)}/{len(targets)} từ · " + ", ".join(missing))
        print(f"  Bản chép: {run['ra']}")
