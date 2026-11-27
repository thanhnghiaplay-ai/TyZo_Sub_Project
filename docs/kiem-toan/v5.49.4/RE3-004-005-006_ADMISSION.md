# RE3-004 / 005 / 006 (P1) — Cửa nhận việc: khóa toàn cục, cap nhà/model, suất unknown

Migration `0054_admission_kernel.sql` (chỉ thêm cột `ref`, 3 chỉ mục, hàm `tyzo_admit`). Không đổi giới hạn đã lưu.

## Nguyên nhân gốc
- **004**: mỗi lần vào cửa là một giao dịch nhiều lệnh (khóa → đọc cấu hình → quét lease → đếm → chèn → COMMIT); khóa toàn cục giữ suốt ~6 lượt khứ hồi mạng, nên dưới tải các yêu cầu xếp hàng tuần tự. Neon ở xa làm nặng thêm.
- **005**: `from active where lane = …` lọc lane TRƯỚC khi đếm nhà/model → giới hạn "mỗi nhà/mỗi model" thực chất là mỗi lane; batch + live cùng nhà vượt cap. Job async đang gửi bị đếm hai lần (suất + job).
- **006**: unknown giữ suất (đúng, để tránh gửi trùng) nhưng không có đường mở lại theo bằng chứng ngoài Chủ bấm tay; Admin chỉ thấy 20 hồ sơ, không cảnh báo; sau sự cố CSDL diện rộng có thể cạn suất dù các lệnh đã quyết toán xong.

## TRƯỚC (`re3-004-before-bench.log`, PG16 cục bộ, 4 pool × 10, upstream giả 50–200 ms, 8 s/nhóm)
| Khách | Nhận | 429 | p50 | p95 | p99 | Vượt cap |
|---|---|---|---|---|---|---|
| 25 | 1588 | 0 | 1.39 | 3.65 | 42.27 | 0 |
| 50 | 2785 | 313 | 2.82 | 10.10 | 42.59 | 0 |
| 100 | 2866 | 857 | 83.02 | 132.27 | 155.37 | 0 |
| 200 | 1739 | 2008 | 233.18 | **300.07** | **330.82** | **alibaba 41 > 40** |
| đợt 300 | 72 | 228 | 132.04 | 369.59 | **389.21** | 0 |

## Sửa
- `tyzo_admit(...)`: một câu lệnh tự commit; trong hàm: khóa toàn cục → đọc cấu hình (công tắc tắt có hiệu lực ngay) → đánh unknown lease quá hạn (chỉ mục riêng) → đếm → chèn. Bất biến toàn cục giữ nguyên (không chia khóa).
- Đếm: lane & người dùng theo lane; **nhà và model trên mọi lane**; job async có suất cùng `ref = call_id` không đếm lại.
- `liveReserve` (mặc định **0 = như cũ**): batch/modal không dùng N suất cuối của mỗi nhà. Chủ chỉnh trong Admin.
- `ref` gắn: mã lệnh gọi nhà (run-gate), job async (cùng giao dịch), đoạn Modal `modal:ticket:part:attempt`, phiên live `live:sid`.
- `sweepAdmissions` (≤ mỗi 15 s/tiến trình, lỗi giãn tới 5 phút, lô 50): chỉ mở unknown khi có bằng chứng ĐỊNH ĐOẠT (`run_gate_calls` xong/lỗi; job async done/failed và lệnh không ở trạng thái mất phản hồi; đoạn Modal xong), ghi `room_audit` `tu-doi-soat-suat` + bằng chứng. Không mở theo thời gian. `mat-phan-hoi`/`can-doi-soat`/`dang-chay`/không ref → giữ, chờ Chủ.
- Admin: phân trang con trỏ (20/trang, "Xem thêm hồ sơ"), tổng số, mã khách, liên kết `ref`, cảnh báo khi unknown ≥ 25% cap lane.

## SAU (`re3-004-after-bench.log`, cùng tải)
| Khách | Nhận | 429 | p50 | p95 | p99 | Vượt cap |
|---|---|---|---|---|---|---|
| 25 | 1558 | 0 | 0.62 | 1.17 | 44.08 | 0 |
| 50 | 2797 | 317 | 0.95 | 2.53 | 18.69 | 0 |
| 100 | 3940 | 2011 | 1.21 | 4.71 | 46.13 | 0 |
| 200 | 4085 | 4982 | 35.42 | **67.81** | **102.16** | 0 (alibaba 40/40) |
| đợt 300 | 72 | 228 | 73.88 | 169.78 | **176.89** | 0 |
0 lỗi, 0 deadlock ở mọi nhóm. 429 cao là do giới hạn cấu hình (vd. `perModel` 24 cho Whisper), không phải do khóa.

Test: `re3-005-006-after-3` 6/6 (cap nhà/model mọi lane với 40 yêu cầu đồng thời; liveReserve; job async không đếm đôi; unknown chỉ mở khi có bằng chứng, 3 bản đối soát chạy đua mở đúng 2 suất mỗi suất 1 lần, có nhật ký; người có unknown không bằng chứng vẫn 409; sự cố 30 suất mở theo lô 20+10 rồi nhận việc lại). `re3-004-006-after-related` 187/187 (toàn bộ billing + live + backend-audit, PG thật).

## Quyết định cần Chủ (không tự đổi)
- **Sức chứa 100–200 khách**: với mặc định `perModel 24`, `perProvider 40`, `live 48`, tối đa 24 lệnh Whisper/24 phiên live một model cùng lúc; phần còn lại nhận 429 + Retry-After. Nâng giới hạn phụ thuộc hạn mức tài khoản Groq/Alibaba (rate limit, chi phí) → Chủ quyết, chỉnh trong Admin.
- Giá trị `liveReserve` (đề xuất 4–8 nếu muốn ưu tiên Dịch trực tiếp).

## Giới hạn
PG cục bộ (RTT ≈ 0); trên Neon RTT lớn hơn nên lợi ích của 004 còn lớn hơn nhưng chưa đo. Chưa thử nhiều tiến trình Node thật/VPS. Giao diện Admin mới chưa kiểm bằng trình duyệt ở checkpoint này (xem đợt kiểm UI cuối).

## Rollback
Revert checkpoint 4. Hàm/cột/chỉ mục mới để lại vô hại (mã cũ không dùng). Không xóa `room_audit`. Lưu ý: mã cũ lại đếm nhà/model theo lane.
