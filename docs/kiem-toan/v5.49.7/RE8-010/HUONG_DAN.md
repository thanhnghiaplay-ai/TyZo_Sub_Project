# Hướng dẫn bật xác thực proxy Modal cho endpoint GPU (RE8-010)

**Chưa làm bước nào trên Modal, Vercel hay VPS thật.** Tài liệu này để Chủ tự làm khi duyệt (gói G7 trong `RE6-009/ACCEPTANCE_PLAN.md`).

**Nguyên tắc:** hai giá trị token chỉ nằm phía máy chủ, gồm biến môi trường Vercel, tệp `tyzo-ai.conf` (chmod 600) trên VPS và bí mật Modal `tyzo-asr`. **Không** đưa vào kho, ứng dụng Android, trang web, ảnh chụp màn hình hay khung chat.

## Thứ tự bắt buộc

Đặt token cho mọi phía gọi **trước**, rồi mới bật xác thực. Nếu bật trước, mọi lượt nhận dạng sẽ bị 401.

### Bước 1: Tạo token proxy trên Modal

modal.com → **Settings** → **Proxy Auth Tokens** → **New token**. Chép **Token ID** (dạng `wk-…`) và **Token Secret** (dạng `ws-…`). Secret chỉ hiện một lần.

### Bước 2: Đặt token cho máy nhận dạng (gọi máy model chữ)

Trên VPS: chạy `tyzo-ai` → chọn **40** «Token xác thực proxy Modal» → dán Token ID → dán Token Secret (chữ không hiện).

Mục 40 tự lưu vào bí mật `tyzo-asr` rồi đưa dịch vụ lên lại. Lúc này `xac_thuc_proxy` vẫn là `false`, nên mọi thứ chạy như cũ.

### Bước 3: Đặt token cho web

Vercel → project web → **Settings** → **Environment Variables** → **Add**:

| Key | Value | Environment |
|---|---|---|
| `TYZO_PROXY_KEY` | Token ID | Production (và Preview nếu dùng) |
| `TYZO_PROXY_SECRET` | Token Secret | Production (và Preview nếu dùng) |

Sau đó **Redeploy** bản đang chạy. Web gửi header kèm theo; endpoint chưa bật xác thực thì bỏ qua header này.

Nếu chỉ đặt **một** trong hai biến, web sẽ báo «Cấu hình xác thực TyZo Modal chưa đủ hoặc sai dạng» và **không** gọi GPU, không giữ Token. Sửa bằng cách đặt đủ cả hai hoặc xóa cả hai.

### Bước 4: Công cụ đo trên VPS (tùy chọn)

`do-modal.py` hỏi Token ID và Secret (Enter để bỏ qua), hoặc đọc từ biến môi trường `TYZO_PROXY_KEY`/`TYZO_PROXY_SECRET`. Các script thử của `tyzo-ai` tự lấy từ `tyzo-ai.conf`.

### Bước 5: Bật xác thực

Sửa `eval/asr/luong-ky/modal/cau-hinh.json` trong kho (nhánh Chủ chọn): `"xac_thuc_proxy": true`. Sau đó trên VPS: `tyzo-ai` → **3** «Cập nhật bản mới».

### Bước 6: Kiểm tra ngay sau khi bật

1. `tyzo-ai` → **2** «Kiểm tra»: phải chạy được (có token).
2. Trên web, chạy một đoạn TyZo Modal bằng tài khoản thử: phải có phụ đề.
3. **G7:** gửi một yêu cầu **không** có header tới địa chỉ `Asr.run` (lấy ở mục 10). Kết quả phải là **401**. Xem Modal → app `tyzo-asr` → Containers: số máy không được tăng.

## Rollback (khoảng 1 phút, không mất dữ liệu)

- **Cách 1, khuyên dùng:** đặt `"xac_thuc_proxy": false` trong `cau-hinh.json`, rồi `tyzo-ai` → **3**. Phía gọi vẫn gửi header nhưng endpoint bỏ qua.
- **Nếu token bị lộ:** Modal → Proxy Auth Tokens → **Revoke**. Tạo token mới, rồi làm lại Bước 2 và Bước 3.
- **Gỡ hẳn:** xóa hai biến trên Vercel và Redeploy; `tyzo-ai` → **40** → Enter (xóa token).

## Hồ sơ cấu hình GPU thử nghiệm (Nhiệm vụ 2 của RE8)

`cau-hinh.json` → `"ho_so_gpu"`:

| Hồ sơ | Máy chữ tối đa | Nhận dạng tối đa | Dự phòng | Nhận dạng tắt sau | Máy chữ tắt sau |
|---|---|---|---|---|---|
| `hien_tai` (đang dùng, rollback) | 2 | 9 | 2 | 60 s | 60 s |
| `thu_nghiem` | 2 | 9 | 1 | **30 s** | 60 s (giữ: máy nhận dạng gọi `/health` mỗi 30 s) |

- **Áp dụng:** đổi `"ho_so_gpu": "thu_nghiem"` rồi «Cập nhật».
- **Rollback:** đổi lại `"hien_tai"` rồi «Cập nhật».

Chưa nâng lên 16 máy. Chưa áp dụng production.

## Kiểm tra tương thích

| Phía gọi | Gửi header | Ghi chú |
|---|---|---|
| Web → `Asr.run` (`src/lib/sub/tyzo-modal.server.ts`) | POST và **mọi lần hỏi lại 303** | Chỉ gửi tới `*.modal.run` đã kiểm. Kiểm cấu hình trước khi giữ Token |
| Máy nhận dạng → máy model chữ (`pml.local_chat`, `backend.py` `/health`) | Có | Vẫn giữ `Authorization: Bearer` của vLLM. Lỗi cấu hình thì chuyển sang Alibaba như khi máy chữ lỗi |
| VPS `do-modal.py` | POST và 303 | Token chỉ nằm trong bộ nhớ |
| Script `tyzo-ai` (goi_thu, asr_client, bat_may_chu, dịch Hàn/Trung) | Có | Đọc từ biến môi trường do `tyzo-ai` xuất |
| Cầu nối Dịch trực tiếp, ứng dụng Android | Không liên quan | Không gọi GPU Modal |

Nguồn: [Modal · Proxy Auth Tokens](https://modal.com/docs/guide/webhook-proxy-auth), [Modal · Web endpoints](https://modal.com/docs/guide/webhooks).
