"""Dịch bản SRT nhanh của mục 20 qua dịch vụ chữ trên Modal."""
import base64
import json
import os
import sys
import tempfile
import time
import urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "luong-ky" / "modal"))
from dia_chi_llm import llm_url  # noqa: E402

DATA = Path(__file__).resolve().parent


def translate(source, url, token, model, merge=False, mobile=False):
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
    if mobile:
        prompt += (" Đây là cuộc họp công sở. Khi chưa rõ vai vế, ưu tiên lược xưng hô hoặc dùng "
                   "tôi, bạn, chúng ta theo ngữ cảnh; giữ vai của từng người xuyên suốt. "
                   "Với người thứ ba chưa rõ giới tính, lặp chức danh hoặc lược chủ ngữ. "
                   "Dịch nghĩa thực tế của thành ngữ trong công việc. Mỗi khung phụ đề diễn đạt "
                   "một ý ngắn dễ đọc. Tách câu dài tại ranh giới mục đầu vào phù hợp, ưu tiên "
                   "1–2 dòng ngắn; tránh để từ đệm, hô ngữ lóe lên riêng. Đọc lại toàn bộ "
                   "để kiểm tra ai giao việc cho ai và ai nhận việc trước khi trả JSON.")
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


def track(srt):
    def seconds(stamp):
        h, m, s = stamp.replace(",", ".").split(":")
        return int(h) * 3600 + int(m) * 60 + float(s)

    cues = []
    for block in srt.strip().split("\n\n"):
        _, stamp, text = block.split("\n", 2)
        start, end = map(seconds, stamp.split(" --> "))
        cues.append([start, end, text])
    return cues


def mobile_preview(output, previous):
    versions = {"22": track(previous.read_text()), "23": track(output.read_text())}
    audio = base64.b64encode((DATA / "cho-duyet/zh.wav").read_bytes()).decode("ascii")
    page = (DATA / "xem_phu_de.html").read_text().replace("__AUDIO__", audio)
    tracks = json.dumps(versions, ensure_ascii=False).replace("<", "\\u003c")
    preview = output.with_name("trung-viet-22-23.html")
    preview.write_text(page.replace("__TRACKS__", tracks))
    for version, cues in versions.items():
        peak = max(len(text) / max(0.001, end-start) for start, end, text in cues)
        print(f"Mục {version}: {len(cues)} đoạn · đoạn đọc nhanh nhất {peak:.1f} ký tự/giây")
    print(f"Tải tệp này qua SFTP, mở bằng trình duyệt điện thoại: {preview}")


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
    mobile = sys.argv[1:] == ["--dien-thoai"]
    merge = mobile or sys.argv[1:] == ["--ghep"]
    if merge:
        if not baseline.is_file():
            sys.exit("Chạy mục 21 cho lượt nhận dạng này trước để có bản đối chiếu.")
        output = report.parent / "zh-nhanh-vi-ghep.srt"
    if mobile:
        previous = output
        if not previous.is_file():
            sys.exit("Chạy mục 22 trước để có bản so sánh.")
        output = report.parent / "zh-nhanh-vi-dien-thoai.srt"
    if not output.exists():
        import modal
        config = json.loads((DATA.parent / "luong-ky/modal/cau-hinh.json").read_text())
        token = os.environ.get("TYZO_ASR_TOKEN")
        if not token:
            sys.exit("Thiếu chuỗi bảo vệ dịch vụ trong cấu hình VPS.")
        url = llm_url()
        start = time.monotonic()
        translated = translate(source, url, token, config["hop_nhat"]["gpu"]["model"], merge=merge, mobile=mobile)
        with tempfile.NamedTemporaryFile(mode="w", dir=output.parent, delete=False) as tmp:
            tmp.write(translated)
        os.replace(tmp.name, output)
        print(f"Thời gian yêu cầu dịch: {time.monotonic() - start:.1f} giây")
    print(f"Bản dịch từ lượt {report.parent.name}: {output}")
    if mobile:
        mobile_preview(output, previous)
        print(output.read_text())
        return
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
