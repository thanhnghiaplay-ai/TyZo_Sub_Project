import os
import json, urllib.request, subprocess, sys
H=os.environ["ALI_BASE"] + "/api/v1/services/aigc/multimodal-generation/generation"
for l in json.load(open("script.json")):
    out=f"tts/{l['id']:02d}.wav"
    body=json.dumps({"model":"qwen3-tts-flash","input":{"text":l["text"],"voice":l["voice"],"language_type":"Chinese"}}).encode()
    req=urllib.request.Request(H,body,{"Authorization":"Bearer "+os.environ.get("ALI_API_KEY","x"),"Content-Type":"application/json"})
    try:
        r=json.load(urllib.request.urlopen(req,timeout=60)); url=r["output"]["audio"]["url"]
    except Exception as e:
        print(l["id"], "ERR", e, getattr(e,'read',lambda:b'')()[:300]); continue
    urllib.request.urlretrieve(url,"tmp.wav")
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i","tmp.wav","-ar","16000","-ac","1",out],check=True)
    print(l["id"], l["voice"], "ok")
