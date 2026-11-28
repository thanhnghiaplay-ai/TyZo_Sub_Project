# Kế hoạch nghiệm thu thật: GPU, Android, API (chờ Chủ duyệt)

Chưa chạy. Mỗi gói cần Chủ duyệt riêng. Số tiền là **dự toán tối đa**, đã cộng dự phòng. Công cụ đo dừng khi chạm trần ước tính, nhưng không có trần tuyệt đối từ nhà cung cấp. Đối chiếu số cuối bằng hóa đơn Modal, Alibaba và Groq.

Giá dùng để dự toán:
- Modal L4 0,80 USD/giờ, theo Chủ (`MODAL_PRICE_DEFAULT`).
- Modal L40S cho máy model chữ: dùng 2,00 USD/giờ làm cận trên. **Cần Chủ xác nhận theo bảng giá Modal.**
- Qwen LiveTranslate: âm vào 7,5 USD/triệu token, chữ ra 20 USD/triệu (`live-price.ts`).
- Các model chat: theo `models.ts` và `alibaba-catalog.ts`.

## A. GPU Modal (tổng trần đề xuất: 5,50 USD)

| Mã | Việc | Cách đo | Dự toán tối đa |
|---|---|---|---|
| G1 | Vòng đời một đoạn lẻ (lạnh → chạy → chờ → tắt), hồ sơ nhanh | `do-modal.py` 1 đoạn, chờ 5 phút, đọc mục usage của app trên hóa đơn Modal so với `giay_xu_ly` | 0,10 USD |
| G2 | Phim 74 phút, hồ sơ nhanh | Chạy qua app trên staging bằng tài khoản thử; so hóa đơn với tổng `provider_usd` và chứng từ `modal:*` | 1,20 USD |
| G3 | Phim 74 phút, hồ sơ kỹ (có máy model chữ L40S) | Như G2; ghi thêm giờ L40S | 2,50 USD |
| G4 | 8 khách cùng lúc × 1 đoạn | `do-modal.py`, chế độ song song 8 | 0,30 USD |
| G5 | Deploy trần máy model chữ (RE8-008, `may_chu_toi_da` = 2, đã có trong mã `6becccd`) rồi đo lại G3 rút gọn. Xác nhận Modal không mở quá 2 máy L40S | Chủ chạy `tyzo-ai` → «Cập nhật» | 0,60 USD |
| G7 | Endpoint không có khóa có làm máy bật không (RE8-008): gửi 3 yêu cầu sai token tới `Asr.run` và máy model chữ, xem log và số máy trên Modal | Nếu máy bật, cần bật `requires_proxy_auth` (phải thêm bí mật, deploy) | 0,10 USD |
| G8 | Phương án RE8-001 «dự phòng 1 + chờ tắt 30 s»: chạy lại G1 và G4 sau khi đổi `cau-hinh.json` | So chi phí và P95 với mô phỏng; giữ phương án nếu P95 đợt 8 khách tăng ≤ 10% | 0,40 USD |
| G6 | Crash giữa ghi USD và chứng từ trên staging | Dừng tiến trình đúng mốc bằng điểm ngắt thử. Không cần GPU mới nếu dùng lượt G1 | 0 USD |

**Tiêu chí đạt:**
- Mỗi lượt có đúng một chứng từ `modal:<attempt>`.
- Tổng chứng từ lệch hóa đơn ≤ 10% với phim dài.
- Với việc ngắn: ghi tỷ lệ thật để Chủ quyết hệ số bù hoặc phí tối thiểu (RE8-001).

## B. Android trên thiết bị thật (tổng trần: 1,50 USD cho phiên Dịch trực tiếp)

**Cần chuẩn bị:**
- Máy Android 10 và 14 (hoặc 15).
- APK từ GitHub Actions `Android thử`.
- Tài khoản thử có Token thử.
- Máy phát video có tiếng Trung, Nhật, Hàn, Anh.

| Mã | Việc | Tiêu chí | Dự toán |
|---|---|---|---|
| D1 | Liên kết, gỡ liên kết (online và offline), đổi tài khoản | AZ-002, AZ-008: không lẫn lịch sử; gỡ khi offline phải báo lỗi | 0 |
| D2 | Phiên Dịch trực tiếp 4 × 3 phút (zh/ja/ko/en → vi), mô hình 3.5 và 3.8 | Có phụ đề; Token trừ khớp biên nhận; xuất SRT/VTT/TXT đúng | ≈ 0,20 USD (cận 0,60) |
| D3 | Lưu và đồng bộ khi mất mạng giữa chừng, tắt ứng dụng, khởi động lại | AZ-003, AZ-004: không báo «đã đồng bộ» khi server chưa lưu | ≈ 0,05 USD |
| D4 | Cập nhật ứng dụng (R3-006 / RE8-007): cài APK 0.13 rồi dùng APK thử 0.14 (artifact CI run 46113317257). Các ca: tải xong, lỗi mạng, hủy ở thanh thông báo, tắt ứng dụng khi đang tải rồi mở lại, bấm nhiều lần | Không bao giờ kẹt «Đang tải…»; tải xong lúc ứng dụng tắt thì mở lại phải hiện màn cài. Cần trang web thử báo có bản 0.14 (staging hoặc `ANDROID_APK_URL` thử) | 0 |
| D5 | Quyền MediaProjection, bị thu hồi quyền, màn hình khóa, pin yếu | Báo lỗi rõ, không mất phiên đã lưu | ≈ 0,10 USD |
| D6 | Render phụ đề (RE6-005): onset → chữ hiện, quay màn hình 60 fps | P50/P95 của độ trễ hiển thị | ≈ 0,10 USD |

**R3-006 đã sửa ở RE8-007** (`659ddeb`, bản 0.14): CI đã dựng APK, logic đạt trên JVM. Chỉ còn D4 trên thiết bị thật.

## C. API thật (tổng trần: 2,00 USD)

| Mã | Việc | Dự toán tối đa |
|---|---|---|
| A1 | Usage thật của 5 model chưa đo (RE8-003): llama-3.3-70b, llama-3.1-8b, muse-spark-open, minimax-m2.7 (cần key có quyền enterprise), qwen-turbo. Mỗi model 3 lệnh, thân 3–33 KB, trần ra 64–512 | 0,50 USD (model enterprise chưa có giá nên lấy cận trên) |
| A2 | Token suy luận của Groq (RE8-005): gpt-oss-120b `reasoning_effort` low/high, 5 lệnh, trần 4.096. So `completion_tokens`, `reasoning_tokens` và trần | 0,05 USD |
| A3 | Giá bậc qwen-turbo và qwen-max (RE8-004): đọc tài liệu giá quốc tế (miễn phí). Tùy chọn 1 lệnh trên 256K đầu vào để xác nhận bậc | 0,40 USD (bỏ phần tùy chọn thì 0) |
| A4 | Giá token cache (RE8-002): qwen-plus 3 lệnh lặp cùng tiền tố 2.000 token, đọc `cached_tokens` và hóa đơn | 0,02 USD |
| A5 | Prompt tên riêng và `corpus.phrases` (RE7-004): 20 cặp × 30 s âm thanh mẫu, kiểm tên được giữ hoặc phiên âm | 0,50 USD |
| A6 | Usage trong cửa trả theo lượt: 10 lệnh qua staging, so dự toán, trừ và chứng từ | 0,10 USD |

**Tổng trần toàn kế hoạch: 9,00 USD** (A 5,50 + B 1,50 + C 2,00). Cập nhật sau RE8: thêm G7 và G8, G5 đã có mã. Chủ có thể duyệt từng gói riêng.

**Điều kiện an toàn cho mọi gói:**
- Chỉ dùng staging và tài khoản thử. Không dùng database production.
- Token gửi qua biểu mẫu bảo mật hoặc proxy. Không ghi vào kho.
- Kết quả lưu vào `docs/kiem-toan/` và che mã tổ chức.
- Gặp lỗi bất thường thì dừng gói đó.

## Cập nhật sau RE8 (28/11/2026)

- **G5** dùng mã đã có (`gpu_limits.py`).
- **G7 và G8** là gói mới.
- **D4** dùng APK thử 0.14.
- **Không** đề xuất đo tải 200 khách thật (quá đắt). Năng lực cửa 16 / máy 16 chỉ có số mô phỏng; nâng dần khi có tải thật.
- **Tiền đề không tốn phí:** Chủ đặt hạn mức chi của workspace trên Modal trước mọi gói A.
