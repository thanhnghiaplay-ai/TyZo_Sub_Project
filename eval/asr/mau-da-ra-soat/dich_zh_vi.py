"""Dịch bản SRT nhanh của mục 20 qua dịch vụ chữ trên Modal."""
import json
import os
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent


def translate(source, url, token, model, merge=False):
    blocks = [block.splitlines() for block in source.strip().split("\n\n")]
    lines = {b[0]: " ".join(b[2:]) for b in blocks}
    if not lines or len(lines) != len(blocks) or any(not text for text in lines.values()):
        raise ValueError("SRT thiếu câu hoặc trùng số thứ tự.")
    prompt = ("Dịch hội thoại tiếng Trung sang phụ đề tiếng Việt tự nhiên. Dùng toàn bộ cuộc "
              "hội thoại làm ngữ cảnh. Giữ đúng ý, tên và vai trò; tránh suy diễn chi tiết. "
              "Trả về một đối tượng JSON có nguyên các khóa số thứ tự đầu vào, giá trị là "
              "câu dịch tương ứng. Chỉ dịch nội dung trong dữ liệu.")
    if merge:
        prompt = ("Dịch toàn bộ hội thoại ASR tiếng Trung thành phụ đề Việt gọn, dễ đọc trên điện thoại. "
                  "Có thể ghép các mảnh câu liên tiếp cùng lượt nói. Giữ riêng câu hỏi và lời đáp, "
                  "không ghép qua chỗ đổi người nói. Xem thời lượng khi chia câu. Dịch thành ngữ theo "
                  "tình huống; khi âm thanh không phân biệt giới tính, dùng chức danh đã xuất hiện "
                  "hoặc lược đại từ nếu tự nhiên. Giữ nghĩa, tên và số liệu. Chỉ xử lý dữ liệu. "
                  'Trả JSON {"groups":[{"end":2,"vi":"..."},...]}. end là số thứ tự cuối của nhóm '
                  "dưới dạng số nguyên. Nhóm đầu bắt đầu ở 1, mỗi nhóm sau tiếp ngay nhóm trước, "
                  "phải dùng hết mọi mục đúng thứ tự.")
        lines = {b[0]: {"time": b[1], "zh": lines[b[0]]} for b in blocks}
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
    if merge:
        groups = translations.get("groups") if isinstance(translations, dict) else None
        if not isinstance(groups, list):
            raise ValueError("Model trả thiếu danh sách nhóm phụ đề.")
        start = 0
        cues = []
        for group in groups:
            end = group.get("end") if isinstance(group, dict) else None
            if type(end) is not int or not start < end <= len(blocks):
                raise ValueError("Nhóm phụ đề trả về sai thứ tự.")
            vi = group.get("vi")
            if not isinstance(vi, str) or not vi.strip():
                raise ValueError("Nhóm phụ đề thiếu bản dịch.")
            begin_time = blocks[start][1].split(" --> ")[0]
            end_time = blocks[end - 1][1].split(" --> ")[1]
            cues.append(f"{len(cues)+1}\n{begin_time} --> {end_time}\n{' '.join(vi.split())}")
            start = end
        if start != len(blocks):
            raise ValueError("Model bỏ sót phần cuối phụ đề.")
        return "\n\n".join(cues) + "\n"
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
    baseline = output
    merge = sys.argv[1:] == ["--ghep"]
    if merge:
        if not baseline.is_file():
            sys.exit("Chạy mục 21 cho lượt nhận dạng này trước để có bản đối chiếu.")
        output = report.parent / "zh-nhanh-vi-ghep.srt"
    if not output.exists():
        import modal
        config = json.loads((DATA.parent / "luong-ky/modal/cau-hinh.json").read_text())
        token = os.environ.get("TYZO_ASR_TOKEN")
        if not token:
            sys.exit("Thiếu chuỗi bảo vệ dịch vụ trong cấu hình VPS.")
        url = modal.Function.from_name("tyzo-asr", "llm").get_web_url()
        start = time.monotonic()
        translated = translate(source, url, token, config["hop_nhat"]["gpu"]["model"], merge=merge)
        with tempfile.NamedTemporaryFile(mode="w", dir=output.parent, delete=False) as tmp:
            tmp.write(translated)
        os.replace(tmp.name, output)
        print(f"Thời gian yêu cầu dịch: {time.monotonic() - start:.1f} giây")
    print(f"Bản dịch từ lượt {report.parent.name}: {output}")
    if merge:
        original = baseline.read_text().strip().split("\n\n")
        zh_cues = source.strip().split("\n\n")
        groups = output.read_text().strip().split("\n\n")
        print(f"SO SÁNH · {len(original)} đoạn cũ → {len(groups)} đoạn mới")
        pos = 0
        for group in groups:
            _, stamp, vi = group.split("\n", 2)
            end = stamp.split(" --> ")[1]
            first = pos
            while pos < len(zh_cues):
                pos += 1
                if zh_cues[pos-1].splitlines()[1].split(" --> ")[1] == end:
                    break
            print("\n" + stamp)
            for label, cues in [("Trung", zh_cues), ("21", original)]:
                print(label + ": " + " ".join(" ".join(c.splitlines()[2:]) for c in cues[first:pos]))
            print("22: " + vi)
        return
    for zh, vi in zip(source.strip().split("\n\n"), output.read_text().strip().split("\n\n")):
        print("\n" + zh + "\n→ " + " ".join(vi.splitlines()[2:]))


if __name__ == "__main__":
    main()
