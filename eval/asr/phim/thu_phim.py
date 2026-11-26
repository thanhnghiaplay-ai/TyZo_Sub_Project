"""Mục 38: thử trọn quy trình trên một đoạn phim thật (không có đáp án).

    thu_phim.py <tệp phim> [giây bắt đầu] [số giây] [ngôn ngữ] [luồng] [số máy song song]

Với số máy song song > 1: chia tiếng thành các phần (ít nhất 120 s, cắt ở chỗ lặng gần nhất), gửi cùng lúc,
rồi ghép phụ đề theo giờ. Tổng tiền GPU gần như không đổi, thời gian chờ giảm theo số máy.

1. Cắt đoạn, tách tiếng, nén Opus mono 16 kHz bằng ffmpeg trên VPS (CPU).
2. Gửi lên máy nhận dạng Modal (hỏi c/k), lưu phản hồi; chạy lại không gửi lần nữa.
3. Dịch sang tiếng Việt theo nhóm câu bằng máy model chữ Modal (hỏi c/k), lưu từng nhóm.
4. Ghi phụ đề gốc, phụ đề Việt, bản đặt cạnh nhau và in thời gian chờ, chi phí ước tính.
Kết quả ở /opt/tyzo-ai/test/phim/<tên tệp>-<bắt đầu>-<độ dài>/.
"""
import hashlib
import re
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


# Gói Starter của Modal: tối đa 10 GPU chạy cùng lúc cho cả tài khoản (email Modal 26/11/2026).
# Để 1 GPU cho máy model chữ, máy nhận dạng chạy cùng lúc tối đa 9.
MAX_ASR_MACHINES = 9
MIN_PART = 120   # phần ngắn hơn không đánh thức sẵn máy model chữ (backend: bat_san_tu_giay)


def duration(audio):
    """Độ dài tệp tiếng (giây), đọc dòng Duration của ffmpeg; 0 nếu không đọc được."""
    r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-i", str(audio)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", r.stderr)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]) if m else 0.0


def silences(audio):
    """Giữa các khoảng lặng ≥ 0,4 s (giây), tìm bằng ffmpeg silencedetect trên CPU."""
    r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-i", str(audio), "-af",
                        "silencedetect=noise=-35dB:d=0.4", "-f", "null", "-"], capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    return [(a + b) / 2 for a, b in zip(starts, ends)]


def plan_parts(length, workers, quiet):
    if workers <= 1 or length < 2 * MIN_PART:
        return [(0.0, float(length))]
    size = max(MIN_PART, length / workers)
    cuts, t = [0.0], size
    while t < length - MIN_PART / 2:
        near = [q for q in quiet if abs(q - t) <= min(30, size / 4) and q - cuts[-1] >= MIN_PART / 2]
        cut = min(near, key=lambda q: abs(q - t)) if near else t
        cuts.append(round(cut, 2))
        t = cut + size
    return list(zip(cuts, cuts[1:] + [float(length)]))


def recognize_parallel(audio, length, lang, profile, folder, workers):
    from concurrent.futures import ThreadPoolExecutor
    parts = plan_parts(length, workers, silences(audio) if workers > 1 else [])
    if len(parts) == 1:
        return recognize(audio, lang, profile, folder / f"nhan-dang-{profile}.json")
    print(f"Chia {len(parts)} phần: " + ", ".join(f"{a:.0f}–{b:.0f} s" for a, b in parts), flush=True)
    jobs = []
    for a, b in parts:
        piece = folder / f"phan-{a:.1f}-{b:.1f}.ogg"
        if not piece.exists():
            subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-ss", str(a), "-t", str(b - a),
                            "-i", str(audio), "-c:a", "libopus", "-b:a", "32k", str(piece)], check=True)
        jobs.append((a, b, piece, folder / f"nhan-dang-{profile}-phan-{a:.1f}-{b:.1f}.json"))
    t0 = time.monotonic()
    with ThreadPoolExecutor(min(workers, len(jobs))) as ex:
        results = list(ex.map(lambda j: recognize(j[2], lang, profile, j[3]), jobs))
    wall = round(time.monotonic() - t0, 1)
    segs, st = [], {"hop_nhat": {}, "model_chu": {}, "giay_xu_ly": 0.0, "giay_tieng": 0.0, "bo_chao": [],
                    "probe": [], "tien_model_chu_usd": 0.0, "phan": []}
    for (a, b, _, _), r in zip(jobs, results):
        rs = r["stats"]
        segs += [dict(x, start=x["start"] + a, end=x["end"] + a) for x in r["segs"]]
        for k, v in (rs.get("hop_nhat") or {}).items():
            st["hop_nhat"][k] = st["hop_nhat"].get(k, 0) + v
        for k, v in (rs.get("model_chu") or {}).items():
            d = st["model_chu"].setdefault(k, {"goi": 0, "vao": 0, "ra": 0})
            for f in d:
                d[f] += int(v.get(f, 0))
        st["giay_xu_ly"] += rs.get("giay_xu_ly") or 0
        st["giay_tieng"] += rs.get("giay_tieng") or 0
        st["bo_chao"] += rs.get("bo_chao") or []
        st["tien_model_chu_usd"] += rs.get("tien_model_chu_usd") or 0
        st["probe"] += [dict(p, gap=[p["gap"][0] + a, p["gap"][1] + a]) for p in rs.get("probe") or []]
        st.setdefault("kho", []).extend(dict(k, t=[k["t"][0] + a, k["t"][1] + a]) for k in rs.get("kho") or [])
        st["phan"].append({"tu": a, "den": b, "cho_s": r.get("cho_s"), "giay_xu_ly": rs.get("giay_xu_ly"),
                           "bat_may": rs.get("bat_may"), "bat_san_may_chu": rs.get("bat_san_may_chu")})
    st["giay_xu_ly"] = round(st["giay_xu_ly"], 1)
    st["bat_san_may_chu"] = any(p["bat_san_may_chu"] for p in st["phan"])
    st["bat_may"] = results[0]["stats"].get("bat_may", {})
    merged = {"segs": sorted(segs, key=lambda x: x["start"]), "stats": st, "cho_s": wall, "so_may": len(jobs)}
    write_json(folder / f"nhan-dang-{profile}.json", merged)
    for p in st["phan"]:
        bm = p["bat_may"] or {}
        print(f"  phần {p['tu']:.0f}–{p['den']:.0f} s · chờ {p['cho_s']} s · xử lý {p['giay_xu_ly']} s · "
              f"máy từ bản chụp {bm.get('khoi_phuc_tu_ban_chup')} · máy chữ sẵn sàng sau {bm.get('model_chu_san_sang_sau_s')} s")
    return merged


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


def translate(jobs, state, workers=8):
    """Dịch các nhóm song song (máy model chữ nhận tới 64 yêu cầu cùng lúc), giữ đúng thứ tự."""
    from concurrent.futures import ThreadPoolExecutor
    import threading
    lock = threading.Lock()
    if any(not j[0].exists() for j in jobs) and state["url"] is None:
        state["url"] = llm_url()

    def one(item):
        n, (saved, part, system, user, head) = item
        if not saved.exists():
            start = time.monotonic()
            text = chat(state["url"], state["token"], state["model"], system, user, max_tokens=60 * len(part) + 200)
            try:
                vi = parse(text, len(part))
            except ValueError as e:
                print(f"  nhóm {n}: {e}; dịch lại từng câu", flush=True)
                vi = [chat(state["url"], state["token"], state["model"], system,
                           head + "Phụ đề gốc:\n1. " + t, 200).partition(".")[2].strip() or t for t in part]
            write_json(saved, dict(src=part, vi=vi, seconds=round(time.monotonic() - start, 1)))
            print(f"  nhóm {n}/{len(jobs)}: {len(part)} câu · {time.monotonic() - start:.1f} s", flush=True)
            with lock:
                state["sent"] += 1
        return json.loads(saved.read_text())["vi"]

    with ThreadPoolExecutor(workers) as ex:
        parts = list(ex.map(one, enumerate(jobs, 1)))
    return [v for p in parts for v in p]


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    start = int(sys.argv[2]) if len(sys.argv) > 2 else 600
    length = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    lang = sys.argv[4] if len(sys.argv) > 4 else "ja"
    profile = sys.argv[5] if len(sys.argv) > 5 else "nhanh"
    workers = int(sys.argv[6]) if len(sys.argv) > 6 else 1
    limit = MAX_ASR_MACHINES
    if workers > limit:
        print(f"Giới hạn GPU của tài khoản: dùng tối đa {limit} máy nhận dạng (đã nhập {workers}).")
        workers = limit
    if not src.is_file():
        sys.exit(f"Không thấy tệp {src}")
    folder = OUT_ROOT / f"{src.stem}-{start}-{length}"
    folder.mkdir(parents=True, exist_ok=True)
    audio = folder / "tieng.ogg"
    print(f"Cắt {length} s từ giây {start} của {src.name} → {audio}")
    cut_audio(src, start, length, audio)
    real = duration(audio)
    print(f"Tệp tiếng: {audio.stat().st_size / 1e6:.2f} MB · dài {real:.1f} s")
    if real and real < length - 1:
        print(f"Phim chỉ còn {real:.1f} s từ mốc bắt đầu: chỉ nhận dạng {real:.1f} s (không gửi phần rỗng, tránh chữ bịa).")
        length = int(real + 0.999)

    saved = folder / f"nhan-dang-{profile}.json"
    if saved.exists() and ask("Đã có kết quả nhận dạng lưu. Nhận dạng lại bằng code mới trên Modal (tốn GPU; bản cũ được giữ)? (c/k): ") == "c":
        old = folder / f"cu-{time.strftime('%Y%m%d-%H%M%S')}"
        old.mkdir()
        for f in [saved, *folder.glob(f"nhan-dang-{profile}-phan-*.json")]:
            f.rename(old / f.name)
    many = f", chia tối đa {workers} máy chạy cùng lúc" if workers > 1 else ""
    if not saved.exists() and ask(f"Gửi {length} s {NAMES.get(lang, lang)} lên máy nhận dạng (luồng {profile}{many}, tốn GPU)? (c/k): ") != "c":
        sys.exit("Đã dừng, không gửi.")
    if saved.exists():
        print("Dùng kết quả nhận dạng đã lưu, không gửi lại.")
        result = json.loads(saved.read_text())
    else:
        result = recognize_parallel(audio, length, lang, profile, folder, workers)
    segs = [s for s in result["segs"] if s["text"].strip()]
    st = result["stats"]
    (folder / f"goc-{profile}.srt").write_text(srt([(s["start"], s["end"], s["text"].strip()) for s in segs]))
    print(f"\nNhận dạng: {len(segs)} câu · {result.get('so_may', 1)} máy · chờ {result.get('cho_s', '?')} s · xử lý {st.get('giay_xu_ly')} s"
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
