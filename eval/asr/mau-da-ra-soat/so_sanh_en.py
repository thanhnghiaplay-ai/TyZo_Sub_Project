"""Chạy trong môi trường đã cài các phụ thuộc của công cụ chấm TyZo."""
import importlib.util
import sys
from pathlib import Path

data = Path(__file__).resolve().parent
music = sys.argv[2:] == ["--nhac-nen"]
if len(sys.argv) != 2 and not music:
    sys.exit("Cách dùng: python3 so_sanh_en.py /duong/dan/TyZo_Sub_Project [--nhac-nen]")
entry = Path(sys.argv[1]).resolve() / "eval/asr/luong-ky/modal/so_sanh_asr.py"
if not entry.is_file():
    sys.exit(f"Thiếu công cụ so sánh: {entry}")
spec = importlib.util.spec_from_file_location("tyzo_compare", entry)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.ROOT = str(data)
out = data / ("ket-qua-en-nhac-nen" if music else "ket-qua-en")
clips = data / ("thu-nhac-nen" if music else "thu-ngay")
module.OUT_DIR = str(out)
module.SRT_DIR = str(out / "srt-test")
sys.argv = [str(entry), str(clips), "1", "nhanh,ky"]
module.main()
