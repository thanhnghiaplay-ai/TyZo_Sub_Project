#!/usr/bin/env python3
"""Đo GPU TyZo Modal thật từ VPS (RE5-005/GPU). Chạy: python3 /opt/tyzo/deploy/vps/do-modal/do-modal.py

Hỏi địa chỉ (TYZO_ASR_URL) và token (TYZO_ASR_TOKEN, chữ không hiện) — lấy trên Vercel → Settings → Environment Variables.
Token chỉ nằm trong bộ nhớ khi chạy, không ghi ra tệp. Gửi đúng định dạng app (WAV mono 16 kHz, base64 trong JSON).
Đo: lần đầu (máy GPU khởi động lạnh), các lần sau (máy nóng), 4 lệnh song song.

RE6-004 · trần chi là TRẦN ƯỚC TÍNH CỦA SCRIPT, không phải trần tuyệt đối của Modal:
- Trước mỗi lệnh giữ chỗ chi phí xấu nhất (hạn chót × giá GPU + trần tiền model). Lệnh nào không đủ chỗ trong trần thì
  không gửi, kể cả khi chạy song song.
- Lệnh lỗi, hết giờ, stats thiếu hoặc không hợp lệ (không hữu hạn, âm; thiếu tiền model khác với tiền model = 0) → chi phí KHÔNG RÕ, tính bằng toàn bộ phần giữ chỗ.
- Mỗi lệnh có hạn chót tổng (CALL_DEADLINE_S) cho kết nối, tiêu đề, thân và cả chuỗi chuyển hướng (máy trả nhỏ giọt
  vẫn bị cắt đúng hạn); thân phản hồi tối đa MAX_RESPONSE_BYTES, tối đa MAX_REDIRECTS lần, chỉ cùng máy https.
- Modal vẫn tính tiền máy chờ (scaledown) và khởi động sau lệnh cuối; script không thấy phần đó. Xem hóa đơn Modal.
Kết quả: /opt/tyzo-do-modal-<giờ>.json (không có token) — gửi tệp này cho Claude.
"""
import base64, getpass, http.client, json, math, os, socket, statistics, sys, threading, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
CLIPS = ["zh", "ja", "ko", "en"]
GPU_USD_PER_HOUR = float(os.environ.get("GPU_USD_PER_HOUR", "0.8"))  # L40 theo Chủ; chỉ để chặn trần, số thật lấy từ stats
BUDGET_USD = float(os.environ.get("TRAN_USD", "1.0"))
CALL_DEADLINE_S = float(os.environ.get("CALL_DEADLINE_S", "600"))
MODEL_CAP_USD = float(os.environ.get("MODEL_CAP_USD", "0.02"))  # trần tiền model chữ mỗi lệnh
MAX_REDIRECTS = int(os.environ.get("MAX_REDIRECTS", "20"))
MAX_RESPONSE_BYTES = int(os.environ.get("MAX_RESPONSE_BYTES", str(16 * 1024 * 1024)))


def finite_nonneg(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v >= 0


class Meter:
    def __init__(self, url, token, profile, budget=BUDGET_USD, deadline=CALL_DEADLINE_S, gpu_rate=GPU_USD_PER_HOUR,
                 model_cap=MODEL_CAP_USD, max_redirects=MAX_REDIRECTS, max_bytes=MAX_RESPONSE_BYTES, read_clip=None, log=print):
        for name, v in (("budget", budget), ("deadline", deadline), ("gpu_rate", gpu_rate), ("model_cap", model_cap)):
            if not finite_nonneg(v):
                raise ValueError(f"{name} phải là số hữu hạn không âm")
        self.url, self.token, self.profile = url, token, profile
        self.budget, self.deadline, self.max_redirects, self.max_bytes = budget, deadline, max_redirects, max_bytes
        self.reserve = deadline / 3600 * gpu_rate + model_cap
        self.gpu_rate, self.model_cap = gpu_rate, model_cap
        self.spent = 0.0      # đã biết + không rõ (tính đủ phần giữ chỗ)
        self.unknown = 0.0    # phần trong spent là không rõ
        self.held = 0.0       # đang giữ chỗ cho lệnh đang chạy
        self.skipped = 0
        self.rows = []
        self.lock = threading.Lock()
        self.read_clip = read_clip or (lambda lang: open(os.path.join(HERE, f"{lang}.wav"), "rb").read())
        self.log = log
        self.host = urllib.parse.urlparse(url).hostname

    def _take(self):
        with self.lock:
            if self.spent + self.held + self.reserve > self.budget + 1e-12:
                self.skipped += 1
                return False
            self.held += self.reserve
            return True

    def _settle(self, usd):
        with self.lock:
            self.held -= self.reserve
            if usd is None:
                self.spent += self.reserve; self.unknown += self.reserve
            else:
                self.spent += usd

    def _once(self, method, target, body, end):
        """Một lần gửi. Hạn chót tổng tính cả kết nối, tiêu đề và thân: tới hạn thì đóng socket (RE7-001).
        Thân phản hồi bị giới hạn MAX_RESPONSE_BYTES."""
        p = urllib.parse.urlparse(target)
        left = end - time.monotonic()
        if left <= 0:
            raise TimeoutError("hết hạn chót lệnh")
        conn = (http.client.HTTPSConnection if p.scheme == "https" else http.client.HTTPConnection)(p.hostname, p.port, timeout=left)
        fired = threading.Event()
        held = []  # giữ socket riêng: getresponse() có thể đặt conn.sock = None khi máy chủ sẽ đóng kết nối

        def cut():
            fired.set()
            for sk in held or ([conn.sock] if conn.sock is not None else []):
                try:
                    sk.shutdown(socket.SHUT_RDWR)
                except OSError:
                    pass

        guard = threading.Timer(left, cut); guard.daemon = True; guard.start()
        try:
            path = (p.path or "/") + (f"?{p.query}" if p.query else "")
            conn.connect(); held.append(conn.sock)
            if fired.is_set():
                raise TimeoutError("hết hạn chót lệnh")
            conn.request(method, path, body=body, headers={"Content-Type": "application/json"} if body is not None else {})
            r = conn.getresponse()
            n = r.getheader("content-length")
            if n is not None and (not n.isdigit() or int(n) > self.max_bytes):
                raise ValueError("phản hồi quá lớn")
            buf = bytearray()
            while True:
                if time.monotonic() >= end:
                    raise TimeoutError("hết hạn chót lệnh")
                chunk = r.read(65536)
                if not chunk:
                    break
                buf += chunk
                if len(buf) > self.max_bytes:
                    raise ValueError("phản hồi quá lớn")
            return r.status, r.getheader("location"), bytes(buf)
        except (OSError, http.client.HTTPException) as e:
            if fired.is_set() or time.monotonic() >= end:
                raise TimeoutError("hết hạn chót lệnh") from e
            raise
        finally:
            guard.cancel(); conn.close()

    def _request(self, row):
        end = time.monotonic() + self.deadline
        body = json.dumps({"token": self.token, "audio_b64": base64.b64encode(row.pop("_audio")).decode(), "ext": "wav",
                           "lang": row["lang"], "profile": self.profile}).encode()
        method, target, hops = "POST", self.url, 0
        while True:
            status, loc, raw = self._once(method, target, body, end)
            if status in (301, 302, 303, 307, 308) and loc:
                hops += 1
                if hops > self.max_redirects:
                    raise RuntimeError(f"quá {self.max_redirects} lần chuyển hướng")
                nxt = urllib.parse.urljoin(target, loc)
                p = urllib.parse.urlparse(nxt)
                if p.hostname != self.host or p.scheme != urllib.parse.urlparse(self.url).scheme:
                    raise RuntimeError("chuyển hướng sang máy khác")
                method, target, body = "GET", nxt, None  # token chỉ đi trong POST đầu
                continue
            row["http"] = status
            if status != 200:
                return None
            data = json.loads(raw)
            return data if isinstance(data, dict) else None

    def cost_of(self, data):
        """(usd, trạng thái). usd=None nếu không rõ. RE7-002: thiếu `tien_model_chu_usd` là KHÔNG RÕ, khác với 0;
        backend luôn trả khóa này (0 khi không dùng model chữ), như modalCostUsd của app."""
        st = (data or {}).get("stats")
        if not isinstance(st, dict):
            return None, "thieu-stats"
        g = st.get("giay_xu_ly")
        if not finite_nonneg(g):
            return None, "thieu-giay" if g is None else "giay-khong-hop-le"
        if "tien_model_chu_usd" not in st:
            return None, "thieu-tien-model"
        m = st["tien_model_chu_usd"]
        if not finite_nonneg(m):
            return None, "tien-model-khong-hop-le"
        return g / 3600 * self.gpu_rate + m, "model-0" if m == 0 else "du"

    def call(self, lang, tag):
        if not self._take():
            return None
        row = {"tag": tag, "lang": lang}
        t0 = time.monotonic()
        usd = None
        try:
            audio = self.read_clip(lang)
            row["audio_s"] = round((len(audio) - 44) / 32000, 1)
            row["_audio"] = audio
            data = self._request(row)
            row["seconds"] = round(time.monotonic() - t0, 2)
            if data is None:
                row["cost_status"] = "khong-co-ket-qua"
            else:
                st = data.get("stats") or {}
                row["stats"] = {k: v for k, v in st.items() if isinstance(v, (int, float, str))} if isinstance(st, dict) else {}
                row["segments"] = len(data.get("segs") or [])
                usd, row["cost_status"] = self.cost_of(data)
                if usd is not None:
                    row["usd_est"] = round(usd, 5)
                    if usd > self.reserve:
                        row["vuot_giu_cho"] = True
        except Exception as e:  # mạng, timeout, chuyển hướng, phản hồi quá lớn
            row["error"] = str(e)[:160]
            row["cost_status"] = "het-gio" if isinstance(e, TimeoutError) else "loi"
        finally:
            row.pop("_audio", None)
            row.setdefault("seconds", round(time.monotonic() - t0, 2))
            if usd is None:
                row["usd_unknown"] = True
            self._settle(usd)
            with self.lock:
                self.rows.append(row)
        self.log(f"  {tag:10} {lang} {row.get('http','—')} {row['seconds']} s  câu={row.get('segments','—')}  "
                 f"~{row.get('usd_est','không rõ')} USD")
        return row

    def run(self):
        self.call("zh", "lanh")
        for rnd in range(3):
            for lang in CLIPS:
                self.call(lang, f"nong-{rnd + 1}")
        threads = [threading.Thread(target=self.call, args=(lang, "song-song")) for lang in CLIPS]
        [t.start() for t in threads]; [t.join() for t in threads]
        return self.summary()

    def summary(self):
        rows = self.rows
        warm = [r["seconds"] for r in rows if r["tag"].startswith("nong") and r.get("http") == 200]
        par = [r["seconds"] for r in rows if r["tag"] == "song-song" and r.get("http") == 200]
        pct = lambda xs, p: sorted(xs)[min(len(xs) - 1, int(round(p / 100 * (len(xs) - 1))))] if xs else None
        return {
            "profile": self.profile, "budget_usd": self.budget, "budget_kind": "trần ước tính của script, không tuyệt đối",
            "reserve_per_call_usd": round(self.reserve, 5), "spent_usd_est": round(self.spent, 5),
            "unknown_usd_reserved": round(self.unknown, 5), "calls": len(rows), "skipped_for_budget": self.skipped,
            "cold_s": next((r["seconds"] for r in rows if r["tag"] == "lanh"), None),
            "warm_s": {"n": len(warm), "p50": pct(warm, 50), "p95": pct(warm, 95), "max": max(warm) if warm else None},
            "parallel4_s": {"n": len(par), "max": max(par) if par else None},
            "realtime_factor_warm": round(statistics.median(warm) / 30, 3) if warm else None,
            "errors": [r for r in rows if r.get("http") != 200],
            "not_counted": "Thời gian máy chờ/khởi động Modal sau lệnh; đối chiếu hóa đơn Modal.",
        }


def main():
    url = input("Dán TYZO_ASR_URL (https://….modal.run): ").strip()
    u = urllib.parse.urlparse(url)
    if u.scheme != "https" or not u.hostname or not u.hostname.endswith(".modal.run") or u.username or u.password:
        sys.exit("✘ Địa chỉ phải là https://….modal.run")
    token = getpass.getpass("Dán TYZO_ASR_TOKEN (chữ không hiện): ").strip()
    if not token:
        sys.exit("✘ Chưa có token")
    profile = (input("Hồ sơ [nhanh/ky, Enter = nhanh]: ").strip() or "nhanh")
    if profile not in ("nhanh", "ky"):
        sys.exit("✘ Hồ sơ chỉ nhận nhanh hoặc ky")
    m = Meter(url, token, profile)
    print(f"Trần ước tính: {m.budget} USD (giữ chỗ {m.reserve:.4f} USD/lệnh; không phải trần tuyệt đối của Modal). Bắt đầu đo…")
    summary = m.run()
    out = f"/opt/tyzo-do-modal-{time.strftime('%Y%m%d-%H%M%S')}.json"
    json.dump({"summary": summary, "rows": m.rows}, open(out, "w"), ensure_ascii=False, indent=1)
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    print(f"✔ Đã lưu {out} — gửi tệp này (hoặc ảnh phần trên) cho Claude.")


if __name__ == "__main__":
    main()
