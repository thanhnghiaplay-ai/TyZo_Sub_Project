"""Translate the eight saved nhanh transcripts independently using Modal's text model."""
import fcntl
import hashlib
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

from run import write_json
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "luong-ky" / "modal"))
from dia_chi_llm import llm_url  # noqa: E402
from modal_auth import proxy_headers  # noqa: E402  RE8-010

HERE = Path(__file__).resolve().parent
PROMPT = ("Dịch toàn bộ lời chép tiếng Hàn sau sang tiếng Việt tự nhiên. "
          "Giữ đúng ý, tên riêng và số liệu. Chỉ trả bản dịch, không giải thích.")


def request(text, model, out, clip_id, sha, url=None, tag="", system=PROMPT):
    """Translate one Korean text, reusing the saved reply for the same request body."""
    payload = dict(model=model, temperature=0, max_tokens=512,
                   chat_template_kwargs={"enable_thinking": False},
                   messages=[dict(role="system", content=system), dict(role="user", content=text)])
    body = json.dumps(payload, ensure_ascii=False).encode()
    key = hashlib.sha256(body).hexdigest()
    saved = out / f"{clip_id}-{tag}{key}.json"
    if saved.exists():
        return saved, url
    token = os.environ.get("TYZO_ASR_TOKEN", "")
    if not token:
        raise ValueError("Thiếu chuỗi bảo vệ dịch vụ chữ.")
    if url is None:
        import modal
        url = llm_url()
    req = urllib.request.Request(url + "/v1/chat/completions", body, {
        "Content-Type": "application/json", "Authorization": "Bearer " + token, **proxy_headers()})
    start = time.monotonic()
    with urllib.request.urlopen(req, timeout=1500) as response:
        result = json.load(response)
    choice = result["choices"][0]
    vi = choice["message"]["content"].strip()
    if not vi or choice.get("finish_reason") == "length":
        raise ValueError(f"Bản dịch thiếu ở ID {clip_id}.")
    write_json(saved, dict(id=clip_id, sha256=sha, model=model, text=text, vi=vi,
                           seconds=time.monotonic()-start, usage=result.get("usage")))
    return saved, url


def translate(cache):
    cases = json.loads((HERE / "ko-vi-cases.json").read_text())
    root = cache / ("set-" + cases["revision"])
    reports = sorted(root.glob("asr/*/report.json"), key=lambda p: p.stat().st_mtime_ns, reverse=True)
    for path in reports:
        clips = json.loads(path.read_text())["results"]["nhanh"]["clips"]
        if all(clips.get(c["sha256"], {}).get("id") == c["id"] for c in cases["cases"]):
            break
    else:
        sys.exit("Thiếu báo cáo mục 26 có đủ 8 bản chép nhanh.")
    model = json.loads((HERE.parent / "luong-ky/modal/cau-hinh.json").read_text())["hop_nhat"]["gpu"]["model"]
    out = path.parent / "dich-ko-vi"
    out.mkdir(exist_ok=True)
    url = None
    print(f"Báo cáo mục 26: {path}", flush=True)
    with (out / "run.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        for case in cases["cases"]:
            clip = clips[case["sha256"]]
            text = clip["text"]
            saved, url = request(text, model, out, clip["id"], case["sha256"], url)
            print(f"{clip['id']} · {json.loads(saved.read_text())['vi']}", flush=True)
    print(f"Đã có đủ 8 bản dịch · {out}")


if __name__ == "__main__":
    translate(Path(sys.argv[1]))
