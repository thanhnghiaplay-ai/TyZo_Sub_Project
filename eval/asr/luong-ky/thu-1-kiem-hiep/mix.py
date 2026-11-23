import json, numpy as np, soundfile as sf, subprocess
from scipy import signal
SR=16000; rng=np.random.default_rng(7)
def load(i, tempo=None):
    f=f"tts/{i:02d}.wav"
    if tempo:
        subprocess.run(["ffmpeg","-y","-loglevel","error","-i",f,"-filter:a",f"atempo={tempo}","-ar","16000","fast.wav"],check=True); f="fast.wav"
    x,_=sf.read(f); x=x/ (np.sqrt(np.mean(x**2))+1e-9)*0.08; return x
def rms(x): return np.sqrt(np.mean(x**2))+1e-9
def bp(x,lo,hi,o=4): b,a=signal.butter(o,[lo/(SR/2),hi/(SR/2)],'band'); return signal.lfilter(b,a,x)
def lp(x,f,o=4): b,a=signal.butter(o,f/(SR/2)); return signal.lfilter(b,a,x)
def t(n): return np.arange(n)/SR
def music(sec, sing=False, drums=True, seed=0):
    n=int(sec*SR); tt=t(n); out=np.zeros(n); r=np.random.default_rng(seed)
    chords=[[220,277,330],[196,247,294],[175,220,262],[196,247,311]]
    for k in range(int(sec/2)+1):
        s,e=k*2*SR,min(n,(k+1)*2*SR)
        for f in chords[k%4]:
            for h,a in [(1,1),(2,.4),(3,.2),(4,.1)]:
                out[s:e]+=a*0.05*np.sin(2*np.pi*f*h*tt[s:e])
        out[s:e]+=0.12*np.sin(2*np.pi*chords[k%4][0]/2*tt[s:e])
    if drums:
        beat=int(0.5*SR)
        for s in range(0,n,beat):
            L=min(3000,n-s); env=np.exp(-np.arange(L)/600)
            out[s:s+L]+=0.5*np.sin(2*np.pi*(60+80*np.exp(-np.arange(L)/300))*np.arange(L)/SR)*env
            if (s//beat)%2==1:
                L2=min(2500,n-s); out[s:s+L2]+=0.25*bp(r.standard_normal(L2),1500,6000)*np.exp(-np.arange(L2)/500)
            L3=min(800,n-s); out[s:s+L3]+=0.05*bp(r.standard_normal(L3),6000,7900)*np.exp(-np.arange(L3)/150)
    if sing:  # giai điệu như người hát "a—" có vibrato và formant: bẫy ảo giác
        notes=[440,494,523,587,523,494,440,392]; nl=int(0.75*SR); voice=np.zeros(n)
        for k,s in enumerate(range(0,n,nl)):
            e=min(n,s+nl); tt2=np.arange(e-s)/SR; f0=notes[k%8]*(1+0.01*np.sin(2*np.pi*5.5*tt2))
            ph=2*np.pi*np.cumsum(f0)/SR; v=sum(np.sin(h*ph)/h for h in range(1,15))
            v=v*np.minimum(1,np.minimum(tt2*20,(tt2[-1]-tt2+1e-3)*20)); voice[s:e]=v
        voice=bp(voice,700,1300,2)*3+bp(voice,200,900,2)*2
        out+=0.6*voice/rms(voice)*rms(out)
    return out/rms(out)
def rain(n): x=bp(rng.standard_normal(n),800,7000); return x/rms(x)
def boom(n):
    L=int(1.2*SR); x=lp(rng.standard_normal(L),400)*np.exp(-np.arange(L)/(0.25*SR)); x[:400]+=rng.standard_normal(400)
    return x/np.abs(x).max()
def reverb(x,dec=0.9):
    L=int(dec*SR); ir=rng.standard_normal(L)*np.exp(-np.arange(L)/(dec*SR/6)); ir[0]=1; ir[int(0.18*SR)]+=0.6; ir[int(0.37*SR)]+=0.4
    y=signal.fftconvolve(x,ir)[:len(x)+L]; return y/rms(y)*rms(x)
def phone(x): y=bp(x,300,3400,6); y=np.tanh(y/ (rms(y)*3))*rms(y)*3; return y/rms(y)*rms(x)
script={l["id"]:l for l in json.load(open("script.json"))}
total=int(210*SR); speech=np.zeros(total); bed=np.zeros(total); truth=[]; pos=0.0
def put(arr,buf,at): s=int(at*SR); e=min(len(buf),s+len(arr)); buf[s:e]+=arr[:e-s]
def say(i,x,at,note):
    put(x,speech,at); truth.append({"id":i,"start":round(at,2),"end":round(at+len(x)/SR,2),"text":script[i]["text"],"note":note}); return at+len(x)/SR
# 0–14 s: nhạc mở đầu có tiếng hát, không lời thoại
put(music(14,sing=True,seed=1)*0.06,bed,0); pos=14.5
# đối thoại trên nền nhạc (SNR ~ +4 dB)
st=pos
for i in [1,2,3,4]: pos=say(i,load(i),pos+0.6,"nhạc nền SNR~4dB")
x=load(5)*0.12; x=x+0.004*rng.standard_normal(len(x)); pos=say(5,x,pos+0.8,"thì thầm, nhỏ hơn ~18 dB")
put(music(pos-st+1,seed=2)*0.05,bed,st)
# mưa + sấm
st=pos+0.5; pos=st+2.5; pos=say(6,load(6),pos,"mưa to + sấm đè lên câu"); 
put(rain(int((pos-st+2)*SR))*0.06,bed,st); put(boom(0)*0.35,bed,st+3.2); pos+=1.5
# đánh nhau: trống to, nổ đè, nói nhanh
st=pos; pos=say(7,load(7),pos+0.8,"đánh nhau, nổ, SNR~0dB")
pos=say(8,load(8,1.45),pos+0.3,"nói nhanh x1.45 + nổ"); pos=say(9,load(9,1.45),pos+0.2,"nói nhanh x1.45 + nổ")
pos=say(10,load(10),pos+0.5,"cười + trống")
put(music(pos-st+1,seed=3)*0.09,bed,st)
for b in [st+1.5,st+4.2,st+6.0,st+8.5]: put(boom(0)*0.4,bed,b)
# 18 s nhạc có tiếng hát không lời + 8 s gần im: bẫy ảo giác
put(music(18,sing=True,seed=4)*0.07,bed,pos+1); pos+=19
put(0.0008*rng.standard_normal(int(8*SR)),bed,pos); pos+=8
# điện thoại: số, tên, chen tiếng Anh
st=pos; pos=say(11,phone(load(11)),pos+0.5,"qua điện thoại, số tiền, tên riêng"); pos=say(12,phone(load(12)),pos+0.4,"điện thoại, chen tiếng Anh, giọng nữ Anh")
put(0.01*rain(int((pos-st+1)*SR)),bed,st)
# hang động: vang + giọng Tứ Xuyên
st=pos; pos=say(13,reverb(load(13)),pos+1.0,"vang hang động"); pos=say(14,reverb(load(14)),pos+0.5,"vang + giọng Tứ Xuyên")
for d in np.arange(st,pos,0.7): put(0.05*np.sin(2*np.pi*1800*t(800))*np.exp(-np.arange(800)/120),bed,d)
pos+=0.8
# nói chồng
a=load(15); b=load(16); s15=pos+0.5; say(15,a,s15,"hai người nói chồng"); s16=s15+len(a)/SR-1.0; pos=say(16,b,s16,"chồng lên câu trước 1 giây")
put(0.005*rain(int(6*SR)),bed,s15)
# bài hát to đè lời
st=pos+1; pos=say(17,load(17),st+2.0,"bài hát to đè lời, SNR~-2dB"); pos=say(18,load(18),pos+0.6,"bài hát to đè lời, SNR~-2dB")
put(music(pos-st+5,sing=True,seed=5)*0.11,bed,st); pos+=5
mix=(speech+bed)[:int(pos*SR)]; mix=mix/np.abs(mix).max()*0.89
sf.write("test.wav",mix,SR); sf.write("clean_speech.wav",speech[:len(mix)],SR)
json.dump(truth,open("truth.json","w"),ensure_ascii=False,indent=1)
print("dài", round(pos,1),"giây")
for x in truth: print(x["id"],x["start"],x["end"],x["note"])
