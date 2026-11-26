"""Địa chỉ máy model chữ trên Modal, dùng chung cho các công cụ trên VPS.

Máy chữ là hàm `llm` (cách thường) hoặc lớp `Llm` (khi bật snapshot_may_chu trong cau-hinh.json).
"""


def llm_url():
    import modal
    try:
        url = modal.Cls.from_name("tyzo-asr", "Llm")().serve.get_web_url()
        if url:
            return url.rstrip("/")
    except Exception:
        pass
    return modal.Function.from_name("tyzo-asr", "llm").get_web_url().rstrip("/")
