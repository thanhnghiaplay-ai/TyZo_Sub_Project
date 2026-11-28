# RE8-008 · Trần GPU máy model chữ và cấu hình tự co giãn Modal (Medium)

Baseline `fe2b42a`. Mã nằm ở `6becccd`. **Chưa deploy.** Cấu hình chỉ có hiệu lực khi Chủ chạy `tyzo-ai` và chọn «Cập nhật». Không gọi Modal, không thuê GPU.

## Kiểm toàn bộ cấu hình (`eval/asr/luong-ky/modal/modal_app.py`, `cau-hinh.json`)

| Thiết lập | Máy nhận dạng (L4, A10) | Máy model chữ (L40S, vLLM) trước sửa | Sau sửa |
|---|---|---|---|
| `max_containers` | 9 | **không đặt (không giới hạn)** | **2** (`may_chu_toi_da`, kẹp 1–4) |
| `buffer_containers` | 2 (kẹp 0–8) | — | Nhận dạng: kẹp 0..min(8, max−1) |
| `scaledown_window` | 60 s | 60 s (`tat_may_chu_sau_giay`) | Như cũ, kẹp 2–1200 |
| `min_containers` | env `TYZO_ASR_WARM` (≤ 9) | env `TYZO_LLM_WARM` (không kẹp) | Kẹp ≤ trần |
| `timeout` | 1.800 s | 24 giờ | Như cũ. Yêu cầu web vẫn bị Modal cắt ở 150 s |
| `@modal.concurrent` | — | `max_inputs=64` | `max_inputs=64`, `target_inputs=64` (giữ cách co giãn cũ) |
| Bản chụp bộ nhớ | bật | bật | Như cũ |

**Sửa:**
- Phần tính trần tách ra `gpu_limits.py`, là Python thuần đọc `cau-hinh.json` và không import `modal`, nên kiểm được trong CI.
- Mọi giá trị đều bị kẹp, để cấu hình gõ sai hay âm không mở GPU vô hạn. `gpu: null` hoặc kiểu lạ thì dùng mặc định.
- `modal_app.py` dùng các trần này cho cả hai nhóm máy. Ảnh của máy model chữ được chép thêm `gpu_limits.py` để không lỗi import.

## Đối chiếu tài liệu Modal

- [Scaling out](https://modal.com/docs/guide/scale):
  - `max_containers` là trần số máy của một Function;
  - `buffer_containers` giữ máy rảnh sẵn khi có việc;
  - `scaledown_window` là thời gian máy rảnh trước khi tắt;
  - `min_containers` là số máy luôn bật;
  - `update_autoscaler()` đổi các giá trị này mà không deploy, nhưng lần deploy sau ghi đè.
- [Input concurrency](https://modal.com/docs/guide/concurrent-inputs) và [modal.concurrent](https://modal.com/docs/reference/modal.concurrent): `max_inputs` là trần cứng mỗi máy, `target_inputs` là mức autoscaler nhắm tới.
- [Timeouts](https://modal.com/docs/guide/timeouts) và [Request timeouts](https://modal.com/docs/guide/webhook-timeouts): `timeout` từ 1 s tới 24 giờ; mọi Web Function có trần 150 s cho mỗi yêu cầu HTTP.
- [Proxy auth](https://modal.com/docs/guide/webhook-proxy-auth): endpoint web mặc định công khai; bật được `requires_proxy_auth=True` với header `Modal-Key`/`Modal-Secret`.

## Năng lực và đề xuất trần cho 100–200 khách

Mô phỏng ở `scripts/gpu-sim.mjs` (xem [RE8-001](../RE8-001/REPORT.md)):
- Một máy nhận dạng xử lý khoảng 387 đoạn 30 s mỗi giờ (9,3 s mỗi đoạn).
- Cửa nhận việc 8 đoạn cho năng lực khoảng 3.100 đoạn/giờ.

| Mức tải giờ cao điểm | Cửa 8, máy 9 (hiện tại) | Cửa 16, máy 16 |
|---|---|---|
| 100 khách × video 10 phút | P95 66,5 s, tối đa 9 máy | P95 66,5 s |
| 200 khách × video 10 phút (4.000 đoạn/giờ) | **Bão hòa:** P95 1.251 s | P95 66,5 s, chi phí +18%, thu/chi 1,87 |

**Đề xuất (chờ Chủ duyệt):**
- **Máy model chữ:** tối đa 2. Một máy nhận 64 yêu cầu; 8 đoạn «kỹ» cùng lúc chỉ gửi khoảng 32 yêu cầu. Mô phỏng 40 khách «kỹ» dồn cùng lúc: có trần thì tối đa 2 máy; không trần thì mở nhiều máy L40S hơn (có test).
- **Máy nhận dạng:** giữ 9 máy, cửa 8 cho tới khoảng 100 khách giờ cao điểm. Khi cao điểm vượt khoảng 3.000 đoạn/giờ (khoảng 150–200 khách), nâng cả cửa nhận việc `modal` (Admin) và `may_nhan_dang_toi_da` lên 16 cùng lúc. Nâng một bên thì hoặc không có tác dụng, hoặc làm hàng chờ dồn.
- **Bật `requires_proxy_auth`** cho endpoint nhận dạng và máy model chữ (ghi ở mục rủi ro bên dưới).
- **Đặt hạn mức chi** của workspace trên Modal (cài đặt thanh toán). Đây là trần cứng duy nhất nằm ngoài mã. Tôi chưa xác minh được tên chính xác của mục cài đặt này.

## Giới hạn ngân sách trước khi khởi tạo GPU

| Lớp | Có trước khi gọi GPU | Ghi chú |
|---|---|---|
| Phiếu Token | Có. `runModalPartWith` chỉ gọi khi `held − modal_reserved ≥ mức giữ` | MAIN-023 |
| Cửa nhận việc | Có. Lane `modal` 8, mỗi khách 3 | Mô phỏng và test RE6-009 |
| Máy nhận dạng | `max_containers` 9 | Modal áp |
| Máy model chữ | **Có từ RE8-008:** `max_containers` 2 | Trước đây không có |
| Hóa đơn tổng | Không có trong mã | Cần hạn mức chi của workspace Modal |

## Rủi ro còn mở

- **Endpoint công khai:** `Asr.run` (fastapi_endpoint) kiểm token **bên trong** máy, còn vLLM kiểm `--api-key` cũng bên trong máy. Tài liệu Modal không nói yêu cầu không có khóa có làm máy bật hay không. Nếu có, ai biết URL cũng đánh thức được GPU (kèm 2 máy dự phòng). Cách khắc phục là `requires_proxy_auth=True`, nhưng cần tạo token Modal, đưa vào Vercel (`TYZO_ASR_URL` gọi kèm header) và bí mật `tyzo-asr` (máy nhận dạng gọi máy chữ), rồi deploy. Chưa làm.
- **timeout 24 giờ của máy chữ:** giữ nguyên, vì tiến trình vLLM sống suốt đời máy. Hạ xuống có thể làm máy khởi động lại giữa việc. Cần đo thật.

## Kiểm thử

- `eval/asr/luong-ky/modal/test_gpu_limits.py`: 5/5 (bọc bởi `scripts/re8-008-gpu-limits.test.mjs`). Các ca: giá trị hiện tại, cửa 8 ≤ 9 máy, giá trị xấu bị kẹp, máy luôn bật ≤ trần, `modal_app.py` dùng đúng trần ở mọi chỗ, ảnh máy chữ có `gpu_limits.py`.
- `src/lib/billing/re6-009.test.ts`: cập nhật để đọc trần bằng chính hàm Python.
- `scripts/re8-001-gpu-sim.test.mjs`: có ca máy chữ có trần và không trần.

Kết quả: [test-summary.txt](test-summary.txt).

**Chưa nghiệm thu thật:** deploy và đo G5 trong [kế hoạch](../RE6-009/ACCEPTANCE_PLAN.md).
