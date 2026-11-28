# RE8-010 · Bảo vệ endpoint GPU bằng xác thực proxy Modal (Medium)

Baseline `e80a957`. Mã nằm ở `b547cd8`. **PASS_LOCAL, chưa deploy.** Mọi phép thử dùng proxy Modal giả và `fetch` giả; không gọi Modal.

## Tài liệu Modal

Trang modal.com không phân giải được trong mạng của phiên này, nên tôi đối chiếu qua kết quả tìm kiếm trên chính trang tài liệu:
- Web Function mặc định công khai.
- Bật bằng `requires_proxy_auth=True` trên `fastapi_endpoint`, `asgi_app`, `wsgi_app`, `web_server`.
- Người gọi gửi `Modal-Key` và `Modal-Secret`, hoặc ghép bằng dấu chấm thành `Authorization: Bearer`.
- Workspace có thể chặn deploy URL không xác thực.
- **Chưa có nguồn xác nhận** yêu cầu bị từ chối có làm máy bật hay không. Gói G7 sẽ đo.

[Proxy Auth Tokens](https://modal.com/docs/guide/webhook-proxy-auth)

## Thay đổi

- **`eval/asr/luong-ky/modal/modal_app.py`:** `requires_proxy_auth=PROXY_AUTH` cho `Asr.run` và cả hai dạng máy model chữ. `PROXY_AUTH` lấy từ `cau-hinh.json` → `xac_thuc_proxy`, **mặc định `false` = như cũ**. Chỉ `true` đúng kiểu mới bật; `"true"` hay `1` không bật.
- **`modal_auth.py` (mới):** `proxy_headers()` đọc `TYZO_PROXY_KEY` và `TYZO_PROXY_SECRET`.
  - Không đặt cả hai → không gửi header.
  - Đặt một nửa hoặc sai dạng → lỗi, và thông báo không in giá trị.
  - Dùng chung cho `asr_client`, `goi_thu`, `bat_may_chu`, các script dịch Hàn/Trung, `pml.local_chat` và lệnh `/health` trong `backend.py`.
- **Web (`src/lib/sub/tyzo-modal.server.ts`):** `modalProxyHeaders()` gửi header ở POST và **mọi lần hỏi lại 303**. `tyzo-modal-call.ts` kiểm cấu hình **trước khi giữ Token**.
- **`deploy/vps/do-modal/do-modal.py`:** nhận token proxy tùy chọn, nhập ẩn chữ hoặc từ biến môi trường, chỉ giữ trong bộ nhớ.
- **`deploy/modal/tyzo-ai.sh`:**
  - mục **40** nhập token, lưu vào `tyzo-ai.conf` (chmod 600) và bí mật Modal `tyzo-asr`;
  - xuất token cho các script thử khi đã nhập.
- **Hồ sơ GPU thử nghiệm** `ho_so_gpu` (Nhiệm vụ 2, xem [HUONG_DAN.md](HUONG_DAN.md)): `thu_nghiem` = máy chữ 2, nhận dạng 9, dự phòng 1, máy nhận dạng tắt sau 30 s. `hien_tai` là bản cũ, dùng để rollback và **đang được chọn**.

## Kiểm thử

| Bộ | Kết quả | Nội dung |
|---|---|---|
| `src/lib/sub/re8-010.test.ts` | 6/6 | Chưa cấu hình thì không gửi header. Đã cấu hình thì có header ở POST và 3 lần 303, proxy giả bật xác thực vẫn nhận. Endpoint bật mà thiếu token → `ModalHttpError` 401. Cấu hình dở dang hoặc sai dạng → lỗi, **0 lần gọi Modal**, thông báo không chứa giá trị. Server function kiểm cấu hình trước khi giữ Token. `git grep`: bí mật chỉ ở mã máy chủ, script quản trị và hồ sơ, không ở `android/`, `.tsx` hay `.github/`, không có giá trị thật trong kho |
| `eval/asr/luong-ky/modal/test_modal_auth.py` | 9/9 | Bảng cấu hình. Cờ chỉ bật với `true`. Đủ 3 decorator dùng cờ. Hồ sơ thử nghiệm và rollback đúng số; hồ sơ lạ → như cũ; `cau-hinh.json` đang ở `hien_tai`. `asr_client` gửi header qua 303 tới proxy giả; thiếu token → 401. `local_chat` giữ Bearer của vLLM và thêm header proxy. `/health` dùng header. Các script dùng hàm chung |
| `deploy/vps/do-modal/test_do_modal.py` | 12/12 | Thêm: header ở POST và 303; chưa cấu hình thì không gửi; token không có trong kết quả |
| `eval/asr/luong-ky/modal/test_gpu_limits.py` | 5/5 | Như cũ |

Kết quả: [test-summary.txt](test-summary.txt).

## Còn lại

- Deploy và đo G7: yêu cầu không có khóa trả 401 và không làm máy bật.
- Tạo token, đặt trên Vercel và VPS, theo [HUONG_DAN.md](HUONG_DAN.md).
- Xác minh tài liệu Modal trực tiếp khi mạng cho phép.
