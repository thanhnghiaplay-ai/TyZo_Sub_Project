"""Prepare Korean FLEURS test WAVs from the official TSV and tar.gz on CPU."""
import argparse
import csv
import hashlib
import json
import re
import shutil
import struct
import tarfile
import tempfile
import unicodedata
from pathlib import Path


def normalize(text):
    text = unicodedata.normalize("NFC", text).casefold()
    return "".join(c for c in text if c.isalnum())


def wav_metadata(wav):
    """Read rate, channel count and frame count from a PCM or float RIFF/WAVE."""
    if len(wav) < 12 or wav[:4] != b"RIFF" or wav[8:12] != b"WAVE":
        raise ValueError("Expected RIFF/WAVE")
    limit = struct.unpack_from("<I", wav, 4)[0] + 8
    if limit > len(wav):
        raise ValueError("Truncated RIFF/WAVE")
    fmt = data_size = None
    offset = 12
    while offset + 8 <= limit:
        kind, size = struct.unpack_from("<4sI", wav, offset)
        start = offset + 8
        end = start + size
        if end > limit:
            raise ValueError("Truncated WAV chunk")
        if kind == b"fmt " and size >= 16:
            fmt = wav[start:end]
        elif kind == b"data":
            data_size = size
        offset = end + (size % 2)
    if fmt is None or data_size is None:
        raise ValueError("Missing WAV format or data")
    codec, channels, rate, _, alignment, bits = struct.unpack_from("<HHIIHH", fmt)
    if codec == 0xFFFE and len(fmt) >= 40:
        # WAVE_FORMAT_EXTENSIBLE stores its PCM or IEEE float codec in a GUID.
        if fmt[26:40] == bytes.fromhex("000000001000800000aa00389b71"):
            codec = struct.unpack_from("<H", fmt, 24)[0]
    if codec not in (1, 3) or channels == 0 or bits == 0 or bits % 8:
        raise ValueError("Unsupported WAV format")
    if alignment != channels * (bits // 8) or data_size % alignment:
        raise ValueError("Invalid WAV frame alignment")
    return rate, channels, data_size // alignment


def prepare(tsv, audio, output, revision):
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("Supply the full google/fleurs dataset commit.")
    if output.exists():
        raise FileExistsError(output)
    groups = {"MALE": [], "FEMALE": []}
    with tsv.open(encoding="utf-8", newline="") as source:
        for row in csv.reader(source, delimiter="\t", quoting=csv.QUOTE_NONE):
            prompt, name, raw, transcript, _, samples, gender = row
            if Path(name).name != name or not name.endswith(".wav"):
                raise ValueError(name)
            groups[gender.strip().upper()].append((int(prompt), name, raw, transcript, int(samples)))
    selected = {}
    prompts = set()
    for gender, rows in groups.items():
        count = 0
        for prompt, name, raw, transcript, samples in sorted(rows):
            if prompt in prompts or not normalize(transcript):
                continue
            if name in selected:
                raise ValueError(name)
            selected[name] = dict(id=prompt, wav=name, gender=gender, raw=raw,
                                  reference=transcript, cer_reference=normalize(transcript),
                                  samples=samples)
            prompts.add(prompt)
            count += 1
            if count == 4:
                break
        if count != 4:
            raise ValueError(f"Insufficient distinct prompts for {gender}")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent) as tmp:
        stage = Path(tmp) / "set"
        stage.mkdir()
        with tarfile.open(audio, "r|gz") as archive:
            for member in archive:
                name = Path(member.name).name
                if not member.isfile() or name not in selected:
                    continue
                with (stage / name).open("xb") as dest:
                    shutil.copyfileobj(archive.extractfile(member), dest)
                wav = (stage / name).read_bytes()
                try:
                    if wav_metadata(wav) != (16000, 1, selected[name]["samples"]):
                        raise ValueError("Unexpected rate, channel count or frame count")
                except ValueError as error:
                    raise ValueError(f"{name}: {error}") from error
                selected[name]["sha256"] = hashlib.sha256(wav).hexdigest()
        if any("sha256" not in item for item in selected.values()):
            raise ValueError("Missing selected WAV")
        manifest = dict(dataset="google/fleurs", revision=revision, config="ko_kr", split="test",
                        license="CC-BY-4.0", clips=list(selected.values()))
        (stage / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)
                                             + "\n", encoding="utf-8")
        stage.rename(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for arg in ("tsv", "audio", "output"):
        parser.add_argument(arg, type=Path)
    parser.add_argument("revision")
    prepare(**vars(parser.parse_args()))
