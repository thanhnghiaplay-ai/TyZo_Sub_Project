# Thử Whisper (sherpa-onnx, cục bộ, không cần Groq) trên một file wav 16 kHz mono. KHÔNG hỗ trợ prompt, nên không thay được Groq; chỉ để biết âm thanh có nghe ra được không.
# Cách dùng: tải model từ https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models (sherpa-onnx-whisper-turbo hoặc -large-v3), giải nén vào /tmp/real/, đặt wav ở /tmp/real/real16k.wav, chạy: python3 scripts/whisper-local-check.py turbo
import sys, numpy as np, scipy.io.wavfile as wf, sherpa_onnx, time
name=sys.argv[1]; d=f"/tmp/real/sherpa-onnx-whisper-{name}/"
pre="turbo" if name=="turbo" else "large-v3"
r=sherpa_onnx.OfflineRecognizer.from_whisper(encoder=d+f"{pre}-encoder.int8.onnx",decoder=d+f"{pre}-decoder.int8.onnx",tokens=d+f"{pre}-tokens.txt",language="zh",task="transcribe",num_threads=4)
sr,x=wf.read("/tmp/real/real16k.wav"); x=x.astype(np.float32)/32768
def dec(seg):
    s=r.create_stream(); s.accept_waveform(16000,seg); r.decode_stream(s); return s.result.text.strip()
for win,hop in [(30,30),(20,20),(15,15),(10,10)]:
    t=time.time(); out=[]
    for st in np.arange(0,len(x)/16000,hop):
        seg=x[int(st*16000):int(min(len(x)/16000,st+win)*16000)]
        if len(seg)<16000: continue
        out.append(f"[{st:4.0f}s] {dec(seg)}")
    print(f"--- {name} cửa sổ {win}s ({time.time()-t:.0f}s)"); print("\n".join(out))
