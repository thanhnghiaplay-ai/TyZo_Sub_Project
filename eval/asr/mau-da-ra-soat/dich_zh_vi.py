"""Dịch bản SRT nhanh của mục 20 qua dịch vụ chữ trên Modal."""
import json
import os
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent


def translate(source, url, token, model):
    blocks = [block.splitlines() for block in source.strip().split("\n\n")]
    lines = {b[0]: " ".join(b[2:]) for b in blocks}
    if not lines or len(lines) != len(blocks) or any(not text for text in lines.values()):
        raise ValueError("SRT thiếu câu hoặc trùng số thứ tự.")
    prompt = ("Dịch hội thoại tiếng Trung sang phụ đề tiếng Việt tự nhiên. Dùng toàn bộ cuộc "
              "hội thoại làm ngữ cảnh. Giữ đúng ý, tên và vai trò; tránh suy diễn chi tiết. "
              "Trả về một đối tượng JSON có nguyên các khóa số thứ tự đầu vào, giá trị là "
              "câu dịch tương ứng. Chỉ dịch nội dung trong dữ liệu.")
    payload = {"model": model, "temperature": 0, "max_tokens": 2048,
               "chat_template_kwargs": {"enable_thinking": False},
               "response_format": {"type": "json_object"},
               "messages": [{"role": "system", "content": prompt},
                            {"role": "user", "content": json.dumps(lines, ensure_ascii=False)}]}
    req = urllib.request.Request(url.rstrip("/") + "/v1/chat/completions",
                                 json.dumps(payload).encode(),
                                 {"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1500) as response:
        result = json.load(response)
    translations = json.loads(result["choices"][0]["message"]["content"])
    if not isinstance(translations, dict) or translations.keys() != lines.keys():
        raise ValueError("Model trả về các số thứ tự không khớp với SRT gốc.")
    if not all(isinstance(s, str) and s.strip() for s in translations.values()):
        raise ValueError("Model trả về câu dịch trống hoặc sai kiểu.")
    return "\n\n".join(f"{b[0]}\n{b[1]}\n{translations[b[0]].strip()}" for b in blocks) + "\n"


def main():
    runs = sorted((DATA / "ket-qua-zh").glob("lan-*/so-sanh-test.json"),
                  key=lambda f: f.stat().st_mtime_ns, reverse=True)
    for report in runs:
        run = json.loads(report.read_text())["ket_qua"].get("nhanh|zh|1")
        if run and (report.parent / run["srt"]).is_file():
            break
    else:
        sys.exit("Chưa có SRT luồng nhanh. Chạy mục 20 trước.")
    source = (report.parent / run["srt"]).read_text()
    output = report.parent / "zh-nhanh-vi.srt"
    if not output.exists():
        import modal
        config = json.loads((DATA.parent / "luong-ky/modal/cau-hinh.json").read_text())
        token = os.environ.get("TYZO_ASR_TOKEN")
        if not token:
            sys.exit("Thiếu chuỗi bảo vệ dịch vụ trong cấu hình VPS.")
        url = modal.Function.from_name("tyzo-asr", "llm").get_web_url()
        start = time.monotonic()
        translated = translate(source, url, token, config["hop_nhat"]["gpu"]["model"])
        with tempfile.NamedTemporaryFile(mode="w", dir=output.parent, delete=False) as tmp:
            tmp.write(translated)
        os.replace(tmp.name, output)
        print(f"Thời gian yêu cầu dịch: {time.monotonic() - start:.1f} giây")
    print(f"Bản dịch từ lượt {report.parent.name}: {output}")
    for zh, vi in zip(source.strip().split("\n\n"), output.read_text().strip().split("\n\n")):
        print("\n" + zh + "\n→ " + " ".join(vi.splitlines()[2:]))


if __name__ == "__main__":
    main()
