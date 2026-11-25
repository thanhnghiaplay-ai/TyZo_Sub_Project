"""Mục 32: so ba cách dịch Hàn → Việt trên 8 bản chép nhanh đã lưu và câu Hàn chuẩn 1673.

  goc       lời nhắc mục 27, chỉ có bản chép
  ngucanh   lời nhắc có hướng dẫn ngữ cảnh + chủ đề video
  thuatngu  như ngucanh + bảng thuật ngữ (bỏ qua khi ID không có thuật ngữ: trùng ngucanh)

Bản chép đi qua bộ lọc câu chào (luong-ky/loc_chao.py) như luồng hiện tại. Yêu cầu trùng thân với
mục 27/30 dùng lại tệp đã lưu. Đếm số yêu cầu còn thiếu và hỏi c/k trước khi gửi lên Modal chữ.
"""
import fcntl
import hashlib
import json
import sys
from pathlib import Path

from prepare import normalize
from translate import PROMPT, request

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "luong-ky"))
from loc_chao import drop_misplaced_outro  # noqa: E402

PROMPT_CONTEXT = (
    "Dịch toàn bộ lời chép tiếng Hàn sau sang tiếng Việt tự nhiên. "
    "Giữ đúng ý, tên riêng và số liệu. Lời chép do máy nghe nên có thể sai vài chữ; "
    "dựa vào chủ đề video để chọn cách hiểu hợp lý, nhưng không thêm ý không có trong lời chép. "
    "Nếu có bảng thuật ngữ, dùng đúng cách dịch trong bảng cho các cụm đó hoặc cụm nghe gần giống. "
    "Dùng thuật ngữ tiếng Việt chuẩn cho sự kiện, văn bản và khái niệm chuyên môn. "
    "Chỉ trả bản dịch, không giải thích.")


def user_message(text, case, glossary):
    lines = [f"Chủ đề video: {case['topic']}"]
    if glossary and case["glossary"]:
        lines.append("Thuật ngữ (Hàn → Việt):")
        lines += [f"- {ko} → {vi}" for ko, vi in case["glossary"].items()]
    lines += ["", "Lời chép tiếng Hàn:", text]
    return "\n".join(lines)


def checks(vi, case):
    low = vi.lower()
    bad = [w for w in case.get("must", []) if w.lower() not in low]
    if case.get("any") and not any(w.lower() in low for w in case["any"]):
        bad.append("/".join(case["any"]))
    bad += [f"không được có '{w}'" for w in case.get("must_not", []) if w.lower() in low]
    return bad


def body_key(model, system, text):
    payload = dict(model=model, temperature=0, max_tokens=512,
                   chat_template_kwargs={"enable_thinking": False},
                   messages=[dict(role="system", content=system), dict(role="user", content=text)])
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False).encode()).hexdigest()


def main(cache):
    cases = json.loads((HERE / "ko-vi-cases.json").read_text())
    extra = json.loads((HERE / "ko-vi-ngu-canh.json").read_text())["cases"]
    root = cache / ("set-" + cases["revision"])
    for path in sorted(root.glob("asr/*/report.json"), key=lambda p: p.stat().st_mtime_ns, reverse=True):
        clips = json.loads(path.read_text())["results"]["nhanh"]["clips"]
        if all(clips.get(c["sha256"], {}).get("id") == c["id"] for c in cases["cases"]):
            break
    else:
        sys.exit("Thiếu báo cáo mục 26 có đủ 8 bản chép nhanh.")
    model = json.loads((HERE.parent / "luong-ky/modal/cau-hinh.json").read_text())["hop_nhat"]["gpu"]["model"]
    out = path.parent / "dich-ko-vi"
    out.mkdir(exist_ok=True)
    print(f"Báo cáo: {path}\nModel: {model}")

    jobs = []  # (id, sha, nguồn, cách, system, user, tag)
    for case in sorted(cases["cases"], key=lambda c: c["id"]):
        sha, cid = case["sha256"], case["id"]
        row = json.loads((path.parent / f"nhanh-{sha}.json").read_text())
        segs = row["response"]["segs"]
        if normalize(" ".join(s["text"] for s in segs)) != normalize(clips[sha]["text"]):
            raise ValueError(f"Đoạn lưu không khớp ở ID {cid}")
        keep, _ = drop_misplaced_outro(segs, "ko")
        sources = [("chép nhanh", " ".join(s["text"] for s in keep), "")]
        if cid == 1673:
            sources.append(("Hàn chuẩn", clips[sha]["reference"], "chuan-"))
        ex = extra[str(cid)]
        for source, text, prefix in sources:
            jobs.append((cid, sha, source, "goc", PROMPT, text, prefix))
            jobs.append((cid, sha, source, "ngucanh", PROMPT_CONTEXT, user_message(text, ex, False), prefix + "ngucanh-"))
            if ex["glossary"]:
                jobs.append((cid, sha, source, "thuatngu", PROMPT_CONTEXT, user_message(text, ex, True), prefix + "thuatngu-"))

    missing = [j for j in jobs if not (out / f"{j[0]}-{j[6]}{body_key(model, j[4], j[5])}.json").exists()]
    print(f"{len(jobs)} bản dịch cần có · đã lưu {len(jobs) - len(missing)} · còn thiếu {len(missing)}")
    if missing:
        answer = input(f"Gửi {len(missing)} yêu cầu Modal chữ? (c/k): ") if sys.stdin.isatty() else "k"
        if answer.strip().lower() != "c":
            sys.exit("Đã dừng, không gửi yêu cầu.")
    url = None
    results = {}
    with (out / "run.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        for cid, sha, source, how, system, text, tag in jobs:
            saved, url = request(text, model, out, cid, sha, url, tag=tag, system=system)
            results[(cid, source, how)] = json.loads(saved.read_text())

    passed = {}
    for case in sorted(cases["cases"], key=lambda c: c["id"]):
        cid, ex = case["id"], extra[str(case["id"])]
        for source in ("chép nhanh", "Hàn chuẩn"):
            if (cid, source, "goc") not in results:
                continue
            print(f"\n{cid} · từ {source}")
            for how in ("goc", "ngucanh", "thuatngu"):
                row = results.get((cid, source, how))
                if row is None:
                    continue
                bad = checks(row["vi"], ex)
                key = (source, how)
                passed[key] = passed.get(key, [0, 0])
                passed[key][0] += not bad
                passed[key][1] += 1
                mark = "đạt" if not bad else "thiếu " + "; ".join(bad)
                print(f"  {how:8} · {row.get('seconds') or 0:5.1f} s · {mark}\n           {row['vi']}")
        print(f"  đáp án tạm: {case['reference_vi']}")
    print("\nTổng số câu đạt kiểm tra từ khóa:")
    for (source, how), (ok, n) in passed.items():
        print(f"  từ {source} · {how}: {ok}/{n}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
