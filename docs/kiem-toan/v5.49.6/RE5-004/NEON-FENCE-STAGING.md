# RE5-004-C · Diễn tập khóa ghi trên branch Neon thử (27/11/2026)

Project `TyZo_Sub` (bitter-meadow-04766982). Chủ cấp Neon API key qua biểu mẫu bảo mật (proxy tự chèn key; Claude không thấy giá trị). Claude tạo branch con `thu-chuyen` từ `production` cùng endpoint ghi và endpoint chỉ đọc, thử trên branch đó, rồi xóa branch. Production không bị ghi. Truy vấn chạy qua cổng SQL HTTPS của Neon, vì máy Claude không có DNS và không mở được TCP 5432.

## Đọc trên bản sao của production (chỉ đọc)
- `_migrations` có 0053…**0057**. Bản dựng Vercel của `36a39be` đã chạy migrate thành công trên Neon production.
- `run_gate_calls` **trống**: chưa từng có lệnh trả theo lượt, nên **không có lệnh `can-doi-soat`** nào giữa hai lần đẩy main. Việc cần truy đã đóng.
- `room_accounts`: 9 tài khoản (thử; Chủ xác nhận chưa có khách).

## Khóa ghi
| Cách | Kết quả |
|---|---|
| `ALTER DATABASE neondb SET default_transaction_read_only = on` | **KHÔNG khóa được.** Lệnh chạy thành công nhưng phiên sau vẫn `off` và `insert` vẫn vào. Đề xuất ban đầu cho RE5-004-C bị bác bỏ. |
| Tắt endpoint ghi bằng Neon API (`PATCH /endpoints/{id}` `disabled:true`) | **Khóa được hoàn toàn:** mọi kết nối bị từ chối ("The endpoint has been disabled"). Mở lại (`disabled:false`) thì chạy bình thường, dữ liệu còn nguyên. |
| Endpoint **chỉ đọc** cùng branch, trong lúc endpoint ghi đang tắt | **Đọc được** (dùng cho chép và đối soát lần cuối). Ghi bị từ chối ("cannot execute INSERT in a read-only transaction"). Gói Free cho phép tạo endpoint này. |

## Thiết kế đề xuất cho Neon → VPS (chưa viết vào tyzo.sh, cần mức HIGH)
1. Tạo hoặc bật endpoint chỉ đọc cho branch production.
2. Tắt endpoint ghi: web Vercel hết ghi được. Ghi `neon-khoa` vào nhật ký `${CONF}.chuyen`.
3. Chép từ endpoint chỉ đọc, nạp vào VPS, đối soát bảng kê với endpoint chỉ đọc.
4. Khớp thì giữ endpoint ghi tắt cho tới khi DNS và web đã sang VPS. Ghi `xong`.
5. Lỗi ở bất kỳ bước nào thì bật lại endpoint ghi và ghi `da-mo-lai`.

Cần: Neon API key trên VPS (chỉ dùng lúc chuyển), project id và endpoint id; mọi lệnh API đều kiểm mã trả về.

## Môi trường
Đã thêm 3 host endpoint của branch thử vào allowlist môi trường cá nhân `TyZo_Sub_Project`. Branch đã xóa nên các host này không còn dùng; Chủ có thể gỡ trong Settings. Neon API key vẫn lưu ở môi trường: thu hồi ở Neon → Account settings → API keys → `claude-thu` khi không cần.
