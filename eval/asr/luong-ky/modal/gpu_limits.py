"""RE8-008: giới hạn tự co giãn GPU của app Modal, tính THUẦN từ cau-hinh.json (không import modal) để kiểm thử được.

Modal (tài liệu «Scaling out», «Input concurrency», «Timeouts»):
- max_containers: trần số máy của một Function. Không đặt = không có trần từ phía app (chỉ còn hạn mức workspace).
- buffer_containers: số máy rảnh giữ sẵn khi đang có việc (tính tiền).
- scaledown_window: máy rảnh bao lâu thì tắt (tính tiền suốt thời gian chờ).
- min_containers: số máy luôn bật (tính tiền cả lúc không có việc).
- @modal.concurrent(max_inputs, target_inputs): trần cứng số yêu cầu mỗi máy; target_inputs là mức autoscaler nhắm tới.
- timeout: 1 s – 24 giờ; yêu cầu web tối đa 150 s bất kể timeout.
Mọi số đều bị kẹp vào khoảng an toàn để cấu hình gõ sai không mở GPU không giới hạn.
"""


def _int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _clamp(value, low, high):
    return max(low, min(high, value))


# Hồ sơ cấu hình (RE8-001/RE8-008, Chủ đồng ý chuẩn bị 28/11): «hien_tai» = như cũ, dùng để rollback;
# «thu_nghiem» = máy chữ tối đa 2, nhận dạng tối đa 9, 1 máy dự phòng, máy nhận dạng tắt sau 30 s rảnh.
# Máy model chữ GIỮ 60 s chờ tắt: máy nhận dạng gọi /health 30 s một lần để giữ máy chữ bật trong lúc làm việc.
PROFILES = {
    "hien_tai": {},
    "thu_nghiem": {"may_chu_toi_da": 2, "may_nhan_dang_toi_da": 9, "may_du_phong_nhan_dang": 1,
                   "tat_may_nhan_dang_sau_giay": 30},
}


def profile_name(cfg):
    g = cfg.get("gpu") if isinstance(cfg, dict) else None
    name = g.get("ho_so_gpu") if isinstance(g, dict) else None
    return name if name in PROFILES else "hien_tai"


def _gpu(cfg):
    g = cfg.get("gpu") if isinstance(cfg, dict) else None
    g = dict(g) if isinstance(g, dict) else {}
    g.update(PROFILES[profile_name(cfg)])
    return g


def proxy_auth(cfg):
    """RE8-010: chỉ bật khi cau-hinh.json ghi đúng `true` (không coi "true", 1… là bật). Mặc định tắt = như cũ."""
    return _gpu(cfg).get("xac_thuc_proxy") is True


# Cửa nhận việc của app (src/lib/billing/work-admission.ts DEFAULT_ADMISSION.modal) cho tối đa 8 đoạn GPU cùng lúc.
APP_MODAL_LANE = 8


def asr_limits(cfg, warm_env=None):
    g = _gpu(cfg)
    max_c = _clamp(_int(g.get("may_nhan_dang_toi_da"), 9), 1, 16)
    buffer = _clamp(_int(g.get("may_du_phong_nhan_dang"), 2), 0, min(8, max_c - 1))
    return {
        "max_containers": max_c,
        "buffer_containers": buffer,
        "scaledown_window": _clamp(_int(g.get("tat_may_nhan_dang_sau_giay"), 60), 2, 1200),
        "timeout": 1800,
        "min_containers": _clamp(_int(warm_env, 0), 0, max_c),
    }


def llm_limits(cfg, warm_env=None):
    """Máy model chữ (vLLM, một máy nhận tối đa 64 yêu cầu). Trần mặc định 2 máy: 8 đoạn nhận dạng đồng thời gửi
    vài yêu cầu chữ mỗi đoạn, dưới 64 yêu cầu của một máy; máy thứ hai chỉ để chịu đợt dồn hoặc máy đầu lỗi."""
    g = _gpu(cfg)
    max_c = _clamp(_int(g.get("may_chu_toi_da"), 2), 1, 4)
    return {
        "max_containers": max_c,
        "scaledown_window": _clamp(_int(g.get("tat_may_chu_sau_giay"), 300), 2, 1200),
        # Giữ 24 giờ như cũ: tiến trình vLLM chạy suốt đời máy; yêu cầu web vẫn bị Modal cắt ở 150 s.
        "timeout": 24 * 3600,
        "min_containers": _clamp(_int(warm_env, 0), 0, max_c),
    }


def llm_concurrency(cfg):
    g = _gpu(cfg)
    max_inputs = _clamp(_int(g.get("yeu_cau_may_chu_toi_da"), 64), 1, 128)
    return {"max_inputs": max_inputs, "target_inputs": _clamp(_int(g.get("yeu_cau_may_chu_muc_tieu"), max_inputs), 1, max_inputs)}
