"""Score saved Korean ASR transcripts on CPU. Input predictions are JSON Lines."""
import argparse
import json
from pathlib import Path

from prepare import normalize


def distance(reference, prediction):
    previous = list(range(len(prediction) + 1))
    for index, expected in enumerate(reference, 1):
        current = [index]
        for j, actual in enumerate(prediction, 1):
            current.append(min(current[-1] + 1, previous[j] + 1,
                               previous[j - 1] + (expected != actual)))
        previous = current
    return previous[-1]


def score(manifest, predictions):
    clips = {clip["sha256"]: clip for clip in manifest["clips"]}
    if len(clips) != 8 or len(manifest["clips"]) != 8:
        raise ValueError("Expected 8 distinct reference WAVs")
    reports = {profile: {} for profile in ("nhanh", "ky")}
    for row in predictions:
        profile, sha = row["profile"], row["sha256"]
        if not row["config_id"].strip() or sha not in clips or sha in reports[profile]:
            raise ValueError(f"Invalid configuration, unknown WAV or duplicate: {profile} {sha}")
        clip = clips[sha]
        reference = normalize(clip["reference"])
        if not reference:
            raise ValueError(f"Empty reference: {sha}")
        prediction = normalize(row["text"])
        reports[profile][sha] = dict(id=clip["id"], config_id=row["config_id"],
                                     reference=clip["reference"], text=row["text"],
                                     errors=distance(reference, prediction), characters=len(reference))
    result = {}
    for profile, rows in reports.items():
        if len({row["config_id"] for row in rows.values()}) > 1:
            raise ValueError(f"Mixed configurations for {profile}")
        missing = [clip["id"] for sha, clip in clips.items() if sha not in rows]
        errors = sum(row["errors"] for row in rows.values())
        characters = sum(row["characters"] for row in rows.values())
        result[profile] = dict(clips=rows, missing_ids=missing,
                               cer=errors / characters if not missing else None)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("predictions", type=Path)
    args = parser.parse_args()
    with args.predictions.open(encoding="utf-8") as source:
        result = score(json.loads(args.manifest.read_text(encoding="utf-8")),
                       (json.loads(line) for line in source if line.strip()))
    print(json.dumps(result, ensure_ascii=False, indent=2))
