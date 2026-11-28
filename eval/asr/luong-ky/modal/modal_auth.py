"""RE8-010: header xác thực proxy Modal (requires_proxy_auth) cho mọi lời gọi endpoint GPU TyZo.

Modal («Proxy Auth Tokens», modal.com/docs/guide/webhook-proxy-auth): endpoint web mặc định công khai; bật
requires_proxy_auth=True thì người gọi phải gửi `Modal-Key: <token id>` và `Modal-Secret: <token secret>`.
Hai giá trị là BÍ MẬT PHÍA MÁY CHỦ: biến môi trường TYZO_PROXY_KEY / TYZO_PROXY_SECRET (Vercel, VPS, bí mật Modal
`tyzo-asr`). Không bao giờ ghi vào kho, ứng dụng Android, trang web hay nhật ký; lỗi cũng không in giá trị.
Endpoint chưa bật xác thực thì bỏ qua header thừa, nên phía gọi có thể gửi trước khi bật (thứ tự triển khai an toàn).
"""
import os


class ProxyAuthConfigError(ValueError):
    pass


def _ok(v):
    return isinstance(v, str) and 0 < len(v) <= 200 and v == v.strip() and not any(c.isspace() for c in v)


def proxy_headers(env=None):
    """{} khi chưa cấu hình; đủ hai header khi có cả hai; cấu hình dở dang hoặc sai dạng → lỗi (không in giá trị)."""
    env = os.environ if env is None else env
    key, secret = env.get("TYZO_PROXY_KEY") or "", env.get("TYZO_PROXY_SECRET") or ""
    if not key and not secret:
        return {}
    if not (_ok(key) and _ok(secret)):
        raise ProxyAuthConfigError("Cấu hình xác thực proxy Modal chưa đủ hoặc sai dạng (TYZO_PROXY_KEY/TYZO_PROXY_SECRET).")
    return {"Modal-Key": key, "Modal-Secret": secret}
