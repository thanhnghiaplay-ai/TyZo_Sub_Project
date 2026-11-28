"""Client for the deployed TyZo ASR endpoint."""
import base64
import json
import time
import urllib.error
import urllib.request

from modal_auth import proxy_headers   # RE8-010: Modal-Key/Modal-Secret khi endpoint bật requires_proxy_auth


class Doi(urllib.request.HTTPRedirectHandler):      # Modal trả 303 cho việc quá 150 s: hỏi lại tới khi xong
    max_repeats = 1000; max_redirections = 1000

def request_asr(audio, ext, lang, profile, url, token):
    body = json.dumps({"token": token, "audio_b64": base64.b64encode(audio).decode(), "ext": ext,
                       "lang": lang, "profile": profile}).encode()
    req = urllib.request.Request(url, body, {"Content-Type": "application/json", "User-Agent": "tyzo-asr-client/1.0", **proxy_headers()})
    t = time.time()
    try:
        r = json.load(urllib.request.build_opener(Doi).open(req, timeout=3600))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{profile}: lỗi HTTP {e.code}") from None
    return r, time.time() - t
