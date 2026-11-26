"""Mục 35: bật máy model chữ bằng một câu rất ngắn và đo thời gian chờ. Hỏi c/k trước khi gửi.

Nếu máy đang tắt, yêu cầu này làm máy bật (khoảng 30 s khi có bản chụp, 1,5–3 phút nếu không; sau đó
máy chạy không theo `tat_may_chu_sau_giay` rồi tự tắt). Không lưu nội dung trả lời, chỉ in thời gian.
"""
import json
import os
import sys
import time
import urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dia_chi_llm import llm_url  # noqa: E402


def ask_once(url, token, model):
    body = json.dumps(dict(model=model, temperature=0, max_tokens=8,
                           chat_template_kwargs={"enable_thinking": False},
                           messages=[dict(role="user", content="Trả lời đúng một chữ: OK")])).encode()
    req = urllib.request.Request(url + "/v1/chat/completions", body, {
        "Content-Type": "application/json", "Authorization": "Bearer " + token})
    start = time.monotonic()
    print("Bắt đầu lúc " + time.strftime("%H:%M:%S", time.gmtime()) + " UTC, đang chờ...", flush=True)
    with urllib.request.urlopen(req, timeout=1500) as response:
        json.load(response)
    seconds = time.monotonic() - start
    print(f"Máy model chữ trả lời sau {seconds:.1f} s.", flush=True)
    return seconds


def main(rounds=1, gap=0):
    token = os.environ.get("TYZO_ASR_TOKEN", "")
    if not token:
        sys.exit("Thiếu chuỗi bảo vệ dịch vụ chữ.")
    cfg = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "cau-hinh.json")))
    model = cfg["hop_nhat"]["gpu"]["model"]
    off = cfg["gpu"].get("tat_may_chu_sau_giay", 300)
    if rounds == 1:
        print("Gửi 1 câu ngắn tới máy model chữ. Nếu máy đang tắt sẽ tốn thời gian bật máy GPU L40S"
              f" (khoảng 30 s khi có bản chụp, lâu hơn sau mỗi lần triển khai) và {off} s máy chạy không trước khi tự tắt.")
    else:
        print(f"Bật máy model chữ {rounds} lần, mỗi lần 1 câu ngắn, chờ {gap} s giữa hai lần để máy tự tắt"
              f" (máy tắt sau {off} s rảnh). Mỗi lần tốn một lần bật máy GPU L40S và {off} s máy chạy không."
              f" Tổng thời gian khoảng {rounds * (gap + 120) // 60} phút.")
    answer = input("Gửi? (c/k): ") if sys.stdin.isatty() else "k"
    if answer.strip().lower() != "c":
        sys.exit("Đã dừng, không gửi yêu cầu.")
    url = llm_url()
    results = []
    for i in range(rounds):
        if i:
            print(f"Chờ {gap} s cho máy tự tắt...", flush=True)
            time.sleep(gap)
        print(f"\nLần {i + 1}/{rounds}", flush=True)
        try:
            results.append((time.strftime("%H:%M:%S", time.gmtime()), ask_once(url, token, model)))
        except Exception as e:
            print(f"Lỗi: {type(e).__name__}: {str(e)[:200]}", flush=True)
            results.append((time.strftime("%H:%M:%S", time.gmtime()), None))
    if rounds > 1:
        print("\nTóm tắt (giờ UTC lúc trả lời · thời gian chờ; khoảng 30 s là khôi phục từ bản chụp):")
        for i, (when, sec) in enumerate(results, 1):
            print(f"  Lần {i}: {when} · " + (f"{sec:.1f} s" if sec is not None else "lỗi"))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--lap":
        main(rounds=int(sys.argv[2]), gap=int(sys.argv[3]))
    else:
        main()
