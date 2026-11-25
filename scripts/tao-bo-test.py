#!/usr/bin/env python3
"""Tạo bộ test FLEURS 4 ngôn ngữ, giữ transcript chuẩn từ dataset."""
import argparse, json, subprocess, sys
from pathlib import Path

LANGS = {"en": "en_us", "zh": "cmn_hans_cn", "ja": "jpn", "ko": "kor"}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--per-lang', type=int, default=3)
    ap.add_argument('--split', default='test')
    a = ap.parse_args()
    try:
        from datasets import load_dataset
    except ImportError:
        sys.exit('Thiếu datasets. Cài: python -m pip install datasets soundfile')
    import soundfile as sf
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    manifest = []
    for short, lang in LANGS.items():
        ds = load_dataset('google/fleurs', lang, split=a.split, trust_remote_code=True)
        for i, row in enumerate(ds.select(range(min(a.per_lang, len(ds))))):
            stem = f'{short}-{i+1}'
            base = {'en': 'en', 'zh': 'zh', 'ja': 'ja', 'ko': 'ko'}[short] if i == 0 else stem
            wav = out / f'{base}.wav'
            sf.write(wav, row['audio']['array'], row['audio']['sampling_rate'])
            ref = out / f'{base}.txt'; ref.write_text(row['transcription'].strip(), encoding='utf-8')
            duration = len(row['audio']['array']) / row['audio']['sampling_rate']
            (out / 'dap-an').mkdir(exist_ok=True)
            (out / 'dap-an' / f'{base}_dap_an.json').write_text(json.dumps([{'n': 1, 'start': 0.0, 'end': round(duration, 3), 'speaker': 'unknown', 'text': row['transcription'].strip()}], ensure_ascii=False, indent=2), encoding='utf-8')
            # Tạo MP4 tùy chọn, không làm hỏng nếu VPS chưa có ffmpeg.
            mp4 = out / f'{stem}.mp4'
            try:
                subprocess.run(['ffmpeg','-y','-loglevel','error','-f','lavfi','-i','color=c=black:s=640x360:r=1','-i',str(wav),'-shortest','-c:v','libx264','-c:a','aac',str(mp4)], check=True)
            except (FileNotFoundError, subprocess.CalledProcessError):
                mp4 = None
            manifest.append({'id': stem, 'lang': short, 'source_lang': lang, 'audio': str(wav), 'video': str(mp4) if mp4 else None, 'reference': str(ref), 'referenceStatus': 'dataset transcript', 'source': 'google/fleurs', 'split': a.split})
    (out/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Đã tạo {len(manifest)} mẫu tại {out}')

if __name__ == '__main__': main()
