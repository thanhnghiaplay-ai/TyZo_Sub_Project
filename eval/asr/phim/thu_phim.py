"""Mục 38: thử trọn quy trình trên một đoạn phim thật (không có đáp án).

    thu_phim.py <tệp phim> [giây bắt đầu] [số giây] [ngôn ngữ] [luồng]

1. Cắt đoạn, tách tiếng, nén Opus mono 16 kHz bằng ffmpeg trên VPS (CPU).
2. Gửi lên máy nhận dạng Modal (hỏi c/k), lưu phản hồi; chạy lại không gửi lần nữa.
3. Dịch sang tiếng Việt theo nhóm câu bằng máy model chữ Modal (hỏi c/k), lưu từng nhóm.
4. Ghi phụ đề gốc, phụ đề Việt, bản đặt cạnh nhau và in thời gian chờ, chi phí ước tính.
Kết quả ở /opt/tyzo-ai/test/phim/<tên tệp>-<bắt đầu>-<độ dài>/.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
MODAL_DIR = HERE.parent / "luong-ky" / "modal"
sys.path.insert(0, str(MODAL_DIR))
from dia_chi_llm import llm_url  # noqa: E402

OUT_ROOT = Path(os.environ.get("TYZO_TEST_OUT", "/opt/tyzo-ai/test")) / "phim"
NAMES = {"ja": "tiếng Nhật", "ko": "tiếng Hàn", "zh": "tiếng Trung", "en": "tiếng Anh"}
BATCH = 20


def conf(key):
    try:
        value = ""
        for line in open("/opt/tyzo-ai/tyzo-ai.conf"):
            if line.startswith(key + "="):
                value = line.split("=", 1)[1].strip()
        return value
    except OSError:
        return ""


def ask(question):
    if not sys.stdin.isatty():
        return "k"
    return input(question).strip().lower()


def write_json(path, value):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    os.replace(tmp, path)


def ts(seconds):
    ms = int(round(max(seconds, 0) * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def srt(cues):
    return "".join(f"{i}\n{ts(a)} --> {ts(b)}\n{t}\n\n" for i, (a, b, t) in enumerate(cues, 1))


def cut_audio(src, start, length, out):
    if out.exists():
        return
    if not shutil.which("ffmpeg"):
        sys.exit("VPS chưa có ffmpeg. Cài bằng: apt-get install -y ffmpeg (menu sẽ hỏi trước khi cài).")
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-ss", str(start), "-t", str(length), "-i", str(src),
                    "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libopus", "-b:a", "32k", str(out)], check=True)


class Redirect(urllib.request.HTTPRedirectHandler):
    """Modal trả 303 cho việc quá 150 s; hỏi lại cho tới khi xong."""
    max_repeats = 1000
    max_redirections = 1000

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        print(f"  … máy đang xử lý, hỏi lại kết quả ({time.strftime('%H:%M:%S')})", flush=True)
        return urllib.request.Request(newurl, headers={"User-Agent": "tyzo-asr-client/1.0"})


def recognize(audio, lang, profile, saved):
    if saved.exists():
        print("Dùng kết quả nhận dạng đã lưu, không gửi lại.")
        return json.loads(saved.read_text())
    url, token = os.environ.get("TYZO_ASR_URL") or conf("URL"), os.environ.get("TYZO_ASR_TOKEN") or conf("TYZO_ASR_TOKEN")
    if not url or not token:
        sys.exit("Thiếu địa chỉ hoặc chuỗi bảo vệ dịch vụ nhận dạng.")
    import base64
    body = json.dumps({"token": token, "audio_b64": base64.b64encode(audio.read_bytes()).decode(), "ext": "ogg",
                       "lang": lang, **({"profile": profile} if profile else {})}).encode()
    req = urllib.request.Request(url, body, {"Content-Type": "application/json", "User-Agent": "tyzo-asr-client/1.0"})
    start = time.monotonic()
    print(f"Gửi nhận dạng lúc {time.strftime('%H:%M:%S')}…", flush=True)
    result = json.load(urllib.request.build_opener(Redirect).open(req, timeout=3600))
    if "loi" in result:
        sys.exit("Máy nhận dạng báo lỗi:\n" + result["loi"][-1500:])
    result["cho_s"] = round(time.monotonic() - start, 1)
    write_json(saved, result)
    return result


def chat(url, token, model, system, user, max_tokens):
    body = json.dumps(dict(model=model, temperature=0, max_tokens=max_tokens,
                           chat_template_kwargs={"enable_thinking": False},
                           messages=[dict(role="system", content=system), dict(role="user", content=user)]),
                      ensure_ascii=False).encode()
    req = urllib.request.Request(url + "/v1/chat/completions", body, {
        "Content-Type": "application/json", "Authorization": "Bearer " + token})
    with urllib.request.urlopen(req, timeout=1500) as response:
        result = json.load(response)
    choice = result["choices"][0]
    if choice.get("finish_reason") == "length":
        raise ValueError("bản dịch bị cắt vì quá dài")
    return choice["message"]["content"].strip()


def parse(text, n):
    out = {}
    for line in text.splitlines():
        head, sep, rest = line.strip().partition(".")
        if sep and head.strip().isdigit():
            out[int(head)] = rest.strip()
    if sorted(out) != list(range(1, n + 1)):
        raise ValueError(f"trả {len(out)} dòng, cần {n}")
    return [out[i] for i in range(1, n + 1)]


def plan(lines, lang, title, model, folder):
    """Các nhóm câu cần dịch: (tệp lưu, câu gốc, lời nhắc hệ thống, lời nhắc người dùng)."""
    system = (f"Bạn dịch phụ đề phim {NAMES.get(lang, lang)} sang tiếng Việt tự nhiên, ngắn gọn, dễ đọc trên điện thoại. "
              "Lời gốc do máy nghe nên có thể sai vài chữ; dựa vào các câu xung quanh để hiểu đúng, không thêm ý. "
              "Giữ tên riêng và số liệu. Xưng hô hợp với quan hệ nhân vật nếu đoán được. "
              "Trả đúng số dòng, mỗi dòng dạng `số. bản dịch`, không giải thích.")
    head = f"Tên phim: {title}\n" if title else ""
    jobs = []
    for i in range(0, len(lines), BATCH):
        part = lines[i:i + BATCH]
        user = head + "Phụ đề gốc:\n" + "\n".join(f"{k}. {t}" for k, t in enumerate(part, 1))
        key = hashlib.sha256((model + system + user).encode()).hexdigest()[:16]
        jobs.append((folder / f"dich-{i // BATCH + 1:03d}-{key}.json", part, system, user, head))
    return jobs


def translate(jobs, state):
    results = []
    for n, (saved, part, system, user, head) in enumerate(jobs, 1):
        if not saved.exists():
            if state["url"] is None:
                state["url"] = llm_url()
            start = time.monotonic()
            text = chat(state["url"], state["token"], state["model"], system, user, max_tokens=60 * len(part) + 200)
            try:
                vi = parse(text, len(part))
            except ValueError as e:
                print(f"  nhóm {n}: {e}; dịch lại từng câu", flush=True)
                vi = [chat(state["url"], state["token"], state["model"], system,
                           head + "Phụ đề gốc:\n1. " + t, 200).partition(".")[2].strip() or t for t in part]
            write_json(saved, dict(src=part, vi=vi, seconds=round(time.monotonic() - start, 1)))
            print(f"  nhóm {n}: {len(part)} câu · {time.monotonic() - start:.1f} s", flush=True)
            state["sent"] += 1
        results += json.loads(saved.read_text())["vi"]
    return results


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    start = int(sys.argv[2]) if len(sys.argv) > 2 else 600
    length = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    lang = sys.argv[4] if len(sys.argv) > 4 else "ja"
    profile = sys.argv[5] if len(sys.argv) > 5 else "nhanh"
    if not src.is_file():
        sys.exit(f"Không thấy tệp {src}")
    folder = OUT_ROOT / f"{src.stem}-{start}-{length}"
    folder.mkdir(parents=True, exist_ok=True)
    audio = folder / "tieng.ogg"
    print(f"Cắt {length} s từ giây {start} của {src.name} → {audio}")
    cut_audio(src, start, length, audio)
    print(f"Tệp tiếng: {audio.stat().st_size / 1e6:.2f} MB")

    saved = folder / f"nhan-dang-{profile}.json"
    if not saved.exists() and ask(f"Gửi {length} s {NAMES.get(lang, lang)} lên máy nhận dạng (luồng {profile}, tốn GPU)? (c/k): ") != "c":
        sys.exit("Đã dừng, không gửi.")
    result = recognize(audio, lang, profile, saved)
    segs = [s for s in result["segs"] if s["text"].strip()]
    st = result["stats"]
    (folder / f"goc-{profile}.srt").write_text(srt([(s["start"], s["end"], s["text"].strip()) for s in segs]))
    print(f"\nNhận dạng: {len(segs)} câu · chờ {result.get('cho_s', '?')} s · xử lý {st.get('giay_xu_ly')} s"
          f" cho {st.get('giay_tieng')} s tiếng · hợp nhất {st.get('hop_nhat')} · gọi model chữ {st.get('model_chu')}"
          f" · bật sẵn máy chữ {st.get('bat_san_may_chu')} · bỏ câu chào {st.get('bo_chao')}"
          f" · máy chữ sẵn sàng sau {st.get('bat_may', {}).get('model_chu_san_sang_sau_s')} s")
    cfg = json.loads((MODAL_DIR / "cau-hinh.json").read_text())
    rate = cfg["gia_gpu_usd_gio"][cfg["gpu"]["nhan_dang"][0]]
    work = st.get("giay_xu_ly") or result.get("cho_s") or 0
    print(f"Ước tính tiền nhận dạng: {work / 3600 * rate + st.get('tien_model_chu_usd', 0):.4f} USD"
          f" (GPU {cfg['gpu']['nhan_dang'][0]} {rate} USD/giờ, chưa tính bật máy và chạy không)")
    if not segs:
        sys.exit("Không có câu nào để dịch.")

    title_file = folder / "ten-phim.txt"
    title = title_file.read_text().strip() if title_file.exists() else ""
    model = cfg["hop_nhat"]["gpu"]["model"]
    lines = [s["text"].strip() for s in segs]
    jobs = plan(lines, lang, title, model, folder)
    if any(not j[0].exists() for j in jobs) and sys.stdin.isatty():
        typed = input(f"Tên phim để làm ngữ cảnh (Enter = {title or 'bỏ qua'}): ").strip()
        if typed and typed != title:
            title = typed
            title_file.write_text(title + "\n")
            jobs = plan(lines, lang, title, model, folder)
    missing = sum(not j[0].exists() for j in jobs)
    if missing and ask(f"Dịch sang tiếng Việt: {missing}/{len(jobs)} nhóm chưa có, gửi {missing} yêu cầu máy model chữ? (c/k): ") != "c":
        sys.exit("Đã dừng trước khi dịch. Phụ đề gốc đã lưu.")
    token = os.environ.get("TYZO_ASR_TOKEN") or conf("TYZO_ASR_TOKEN")
    state = dict(url=None, token=token, model=model, sent=0)
    t0 = time.monotonic()
    vi = translate(jobs, state)
    if state["sent"]:
        print(f"Dịch xong {state['sent']} nhóm trong {time.monotonic() - t0:.1f} s (gồm thời gian bật máy chữ nếu đang tắt)")
    cues = [(s["start"], s["end"], v) for s, v in zip(segs, vi)]
    (folder / f"viet-{profile}.srt").write_text(srt(cues))
    pairs = "\n\n".join(f"{ts(s['start'])[:8]}  {s['text'].strip()}\n          → {v}" for s, v in zip(segs, vi))
    (folder / f"canh-nhau-{profile}.txt").write_text(pairs + "\n")
    long_lines = [v for v in vi if len(v) > 42]
    fast = [v for s, v in zip(segs, vi) if len(v) / max(s["end"] - s["start"], 0.5) > 17]
    print(f"\nPhụ đề Việt: {len(vi)} câu · {len(long_lines)} câu dài hơn 42 ký tự · {len(fast)} câu cần đọc nhanh hơn 17 ký tự/giây")
    print(f"Tệp: {folder}/goc-{profile}.srt · viet-{profile}.srt · canh-nhau-{profile}.txt\n")
    print(pairs[:3000])


if __name__ == "__main__":
    main()
