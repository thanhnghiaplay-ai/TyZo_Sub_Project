import os
import json, urllib.request, subprocess, sys, numpy as np, soundfile as sf
sys.path.insert(0, "thu-1-kiem-hiep")
from scipy import signal
SR = 16000; rng = np.random.default_rng(3)
H = __import__("pml").ali_base() + "/api/v1/services/aigc/multimodal-generation/generation"
exec(open("thu-1-kiem-hiep/mix.py").read().split("script={l")[0].split("SR=16000; rng=np.random.default_rng(7)")[1])  # lấy hàm nhạc, nổ, lọc
def tts(text, voice, lt):
    body = json.dumps({"model": "qwen3-tts-flash", "input": {"text": text, "voice": voice, "language_type": lt}}).encode()
    r = json.load(urllib.request.urlopen(urllib.request.Request(H, body, {"Authorization": "Bearer " + os.environ.get("ALI_API_KEY", "x"), "Content-Type": "application/json"})))
    urllib.request.urlretrieve(r["output"]["audio"]["url"], "q.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", "q.wav", "-ar", "16000", "-ac", "1", "q16.wav"], check=True)
    x, _ = sf.read("q16.wav"); return x / (np.sqrt(np.mean(x**2)) + 1e-9) * 0.08
def scream(sec):
    n = int(sec*SR); tt = np.arange(n)/SR; f = 700 + 500*np.sin(2*np.pi*0.7*tt) + 30*np.sin(2*np.pi*6*tt)
    ph = 2*np.pi*np.cumsum(f)/SR; x = sum(np.sin(h*ph)/h for h in range(1, 12)) + 0.3*rng.standard_normal(n)
    x = bp(x, 400, 5000) * np.minimum(1, np.minimum(tt*8, (tt[-1]-tt)*8)); return x/rms(x)*0.1
def moan(sec):
    n = int(sec*SR); tt = np.arange(n)/SR; f = 140 + 15*np.sin(2*np.pi*0.8*tt); ph = 2*np.pi*np.cumsum(f)/SR
    x = sum(np.sin(h*ph)/h**1.5 for h in range(1, 10)); x = bp(x, 100, 1500) * (0.5+0.5*np.sin(2*np.pi*0.6*tt)**2); return x/rms(x)*0.025
VO = {"zh": ("Chinese", {"A": "Cherry", "B": "Ethan", "C": "Elias"}), "ja": ("Japanese", {"A": "Cherry", "B": "Ethan", "C": "Jennifer"})}
for L in ["zh", "ja"]:
    lt, vs = VO[L]; TR = json.load(open(f"in/{L}_dap_an.json")); speech = np.zeros(int(40*SR)); new = []; pos = 0.2
    for i, q in enumerate(TR):
        who = q["speaker"][0]; whisper = "thì thầm" in q["speaker"]
        if q["text"].startswith("["):
            x = scream(2.5) if "hét" in q["text"] else moan(2.0)
        else:
            x = tts(q["text"], vs[who], lt)
            if whisper:   # thì thầm: nhỏ hơn ~12 dB, bỏ trầm, thêm hơi thở
                x = bp(x, 400, 7000); x = x/rms(x)*0.02 + 0.002*bp(rng.standard_normal(len(x)), 1000, 7000)
        start = pos if not (i > 0 and TR[i]["start"] < TR[i-1]["end"]) else new[-1]["start"] + 0.25   # câu nói chồng
        s = int(start*SR); speech[s:s+len(x)] += x
        nq = dict(q, start=round(start, 2), end=round(start+len(x)/SR, 2)); new.append(nq)
        pos = max(pos, nq["end"]) + 0.25
    dur = pos + 0.5; speech = speech[:int(dur*SR)]
    bed = music(dur, seed=11)*0.025                       # nhạc nền nhẹ cả bài
    a, b = int(8*SR), int(19*SR); bed[a:b] += music(11, sing=True, seed=12)[:b-a]*0.06   # nhạc to giây 8–19
    mix = speech + bed; mix = mix/np.abs(mix).max()*0.89
    sf.write(f"{L}2_audio.wav", mix, SR)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x202030:s=1280x720:r=25", "-i", f"{L}2_audio.wav", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", f"{L}2_video.mp4"], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{L}2_video.mp4", "-ar", "16000", "-ac", "1", f"{L}2.wav"], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{L}2_video.mp4", "-ar", "44100", "-ac", "2", f"{L}244.wav"], check=True)
    json.dump(new, open(f"in/{L}2_dap_an.json", "w"), ensure_ascii=False, indent=1)
    x = mix; print(L, round(dur, 1), "s;", " ".join(f"{q['n']}:{20*np.log10(rms(speech[int(q['start']*SR):int(q['end']*SR)]*0.89/np.abs(speech+bed).max())/rms(bed[int(q['start']*SR):int(q['end']*SR)]*0.89/np.abs(speech+bed).max())):.0f}dB" for q in new))
