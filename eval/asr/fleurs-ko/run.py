"""Plan, resume and score a Korean FLEURS run on the VPS."""
import argparse
import fcntl
import hashlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path

from score import score

MODAL = Path(__file__).resolve().parents[1] / "luong-ky" / "modal"
sys.path.append(str(MODAL))
from asr_client import request_asr

PROFILES = ("nhanh", "ky")


def write_json(path, value):
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, encoding="utf-8",
                                     delete=False) as target:
        try:
            json.dump(value, target, ensure_ascii=False, indent=2)
            target.write("\n")
            target.flush()
            os.fsync(target.fileno())
            os.replace(target.name, path)
        finally:
            Path(target.name).unlink(missing_ok=True)


def run(cache, deployment):
    revision = (cache / "revision").read_text().strip()
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("Revision FLEURS không hợp lệ.")
    root = cache / f"set-{revision}"
    manifest = json.loads((root / "manifest.json").read_text())
    if tuple(manifest[key] for key in ("dataset", "revision", "config", "split")) != (
            "google/fleurs", revision, "ko_kr", "test"):
        raise ValueError("Manifest không đúng tập FLEURS tiếng Hàn.")
    score(manifest, [])
    audio = {}
    for clip in manifest["clips"]:
        name = clip["wav"]
        if Path(name).name != name:
            raise ValueError("Tên WAV không hợp lệ.")
        data = (root / name).read_bytes()
        if hashlib.sha256(data).hexdigest() != clip["sha256"]:
            raise ValueError(f"WAV không khớp manifest: {name}")
        audio[clip["sha256"]] = data

    cfg = json.loads((MODAL / "cau-hinh.json").read_text())
    url = os.environ.get("TYZO_ASR_URL", "")
    mode = os.environ.get("TYZO_FUSE", "")
    if not url or mode not in ("gpu", "ali", "khong"):
        raise ValueError("Thiếu địa chỉ ASR hoặc chế độ hợp nhất.")
    identity = dict(deployment=deployment, url=url, mode=mode, lang="ko",
                    profiles={p: cfg["luong"][p] for p in PROFILES}, fusion=cfg["hop_nhat"])
    config_id = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    out = root / "asr" / config_id
    out.mkdir(parents=True, exist_ok=True)
    with (out / "run.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        compare(manifest, audio, out, config_id, cfg, identity)


def compare(manifest, audio, out, config_id, cfg, identity):
    rows, pending = [], []
    for profile in PROFILES:
        for clip in manifest["clips"]:
            sha = clip["sha256"]
            path = out / f"{profile}-{sha}.json"
            if not path.exists():
                pending.append((profile, clip, path))
                continue
            row = json.loads(path.read_text())
            if (row["profile"], row["sha256"], row["config_id"], row["lang"]) != (
                    profile, sha, config_id, "ko"):
                raise ValueError(f"Bản chép không khớp cấu hình: {path.name}")
            rows.append(row)
    score(manifest, rows)
    print(f"Khớp {len(rows)}/16 bản chép · còn thiếu {len(pending)} lượt GPU.")
    if pending:
        try:
            answer = input(f"Nhập c để chạy {len(pending)} lượt còn thiếu (c/k): ")
        except EOFError:
            answer = ""
        if answer.strip().lower() != "c":
            return
        token = os.environ.get("TYZO_ASR_TOKEN", "")
        if not token:
            raise ValueError("Thiếu chuỗi bảo vệ ASR.")
        rate = cfg["gia_gpu_usd_gio"][cfg["gpu"]["nhan_dang"][0]]
        for profile, clip, path in pending:
            sha = clip["sha256"]
            print(f"Đang chạy {profile} · ID {clip['id']}", flush=True)
            response, elapsed = request_asr(audio[sha], "wav", "ko", profile, identity["url"], token)
            stats = response["stats"]
            if (stats["luong"], stats["che_do_hop_nhat"]) != (profile, identity["mode"]):
                raise ValueError("Modal trả về luồng hoặc chế độ hợp nhất khác cấu hình.")
            seconds = stats.get("giay_xu_ly")
            rate_seconds = seconds if seconds is not None else elapsed
            row = dict(profile=profile, sha256=sha, config_id=config_id, lang="ko",
                       text=" ".join(segment["text"] for segment in response["segs"]),
                       seconds=seconds, elapsed=elapsed,
                       estimated_usd=rate_seconds / 3600 * rate + stats["tien_model_chu_usd"],
                       response=response)
            write_json(path, row)
            rows.append(row)
    results = score(manifest, rows)
    report = out / "report.json"
    write_json(report, dict(config_id=config_id, identity=identity, results=results))
    for profile in PROFILES:
        items = [row for row in rows if row["profile"] == profile]
        cer = results[profile]["cer"]
        wait = sum(row["elapsed"] for row in items)
        usd = sum(row["estimated_usd"] for row in items)
        print(f"{profile}: CER {cer:.2%} · tổng thời gian chờ {wait:.1f} s · ước tính {usd:.5f} USD")
    print(f"Kết quả: {report}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("cache", type=Path)
    parser.add_argument("deployment", help="Mã phiên bản deploy trên Modal, giữ nguyên khi chạy tiếp")
    args = parser.parse_args()
    try:
        run(args.cache, args.deployment)
    except (OSError, ValueError, KeyError, RuntimeError) as error:
        sys.exit(f"Dừng lượt đo: {error}")
