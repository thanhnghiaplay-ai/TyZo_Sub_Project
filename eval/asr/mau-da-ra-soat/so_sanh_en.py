"""Chạy trong môi trường đã cài các phụ thuộc của công cụ chấm TyZo."""
import importlib.util
import sys
from pathlib import Path

data = Path(__file__).resolve().parent
if len(sys.argv) != 2:
    sys.exit("Cách dùng: python3 so_sanh_en.py /duong/dan/TyZo_Sub_Project")
entry = Path(sys.argv[1]).resolve() / "eval/asr/luong-ky/modal/so_sanh_asr.py"
if not entry.is_file():
    sys.exit(f"Thiếu công cụ so sánh: {entry}")
spec = importlib.util.spec_from_file_location("tyzo_compare", entry)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.ROOT = str(data)
module.OUT_DIR = str(data / "ket-qua-en")
module.SRT_DIR = str(data / "ket-qua-en" / "srt-test")
sys.argv = [str(entry), str(data / "thu-ngay"), "1", "nhanh,ky"]
module.main()
