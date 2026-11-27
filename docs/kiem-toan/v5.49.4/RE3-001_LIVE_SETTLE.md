# RE3-001 (P0) — Quyết toán usage Dịch trực tiếp nguyên tử

Baseline `6d906ba`. Chỉ dữ liệu tổng hợp trên PostgreSQL 16 riêng (`127.0.0.1:55439/tyzo_test`, schema `thu_*` tạm). Alibaba giả; không gọi nhà thật.

## Nguyên nhân gốc (đã tái hiện)
`live-bridge.ts` (baseline 361–405): `spend` lưu quan sát chi phí bền (commit riêng) rồi mới `charge` từng phiếu bằng lệnh rời.
1. Lỗi sau journal → phiếu không bị trừ, phiên vẫn đóng và **nhả phần giữ** → thiếu tiền; journal vẫn có chi phí.
2. Lặp lại cùng mã (mất ACK, thử lại) → `duplicate` → bỏ qua khoản trừ.
3. `counter.latest` tiến trước khi quyết toán xong; các tin xử lý song song nên báo cáo sau vẫn quyết toán trên mức đã tiến (mất phần lỗi).

Bằng chứng TRƯỚC: `bang-chung/re3-001-before-fault-2.log` — lỗi trước `update token_slices`: **2210 Token so với 3220** của phiên đối chứng; mất ACK sau commit journal: 2210/3220. (`re3-001-before-fault.log` là lần chạy hỏng do bộ thử chưa nạp ví; giữ nguyên, không xóa.)

## Sửa
- `migrations/0053_live_usage_receipts.sql` (chỉ thêm bảng): biên nhận theo phiên/kết nối/quan sát, lưu cost/base/chi phí NCC/taken/**shortfall**/allocation.
- `src/lib/live/live-settle.ts`: MỘT giao dịch = biên nhận + `provider_spend_events` + trừ các phiếu (mới→cũ). Trùng mã → trả kết quả đã lưu (không dùng journal làm chứng cứ đã trừ); khác số liệu → từ chối. Cộng tổng hợp ngày sau commit (lỗi → pending, `drainSpendJournal` cộng lại như R08).
- `live-bridge.ts`: hàng đợi quyết toán tuần tự mỗi phiên; bộ đếm cộng dồn chỉ tiến **sau commit**; gửi lại đúng biên nhận 3 lần (150/600 ms); đang lỗi thì không gửi tiếng mới; vẫn chưa rõ → dừng phiên, **không nhả phiếu**, admission `unknown`, log mã biên nhận + số Token; khi đóng phiên phát lại biên nhận (CSDL hồi thì quyết toán nốt phần còn lại). Mã kết nối gồm nonce tiến trình → restart không trùng mã. Thiếu giá Token (toGiay null) giờ dừng để đối soát thay vì miễn phí ngầm.
- `live-billing.ts`: thêm `settle`. Đường `spend+charge` rời chỉ còn cho fixture.
- Không đổi giá, quy Token, làm tròn, điều khoản.

## SAU
| Nhãn | Kết quả |
|---|---|
| `re3-001-after-fault-2` | 6/6: đối chứng; lỗi trước trừ phiếu; lỗi sau ghi journal trong giao dịch; mất ACK sau commit; CSDL mất kéo dài (charged 0, phiếu còn giữ, `unknown`); CSDL hồi trước đóng (bằng đối chứng) |
| `re3-001-after-settle-unit` | 6/6: 20 lần đồng thời cùng mã → 1 lần trừ, 1 quan sát; lỗi giữa hai phiếu → rollback toàn bộ, thử lại đúng 150 (100+50); vượt giữ → taken 80, shortfall 120, không lấy thêm gói; xung đột mã; tổng hợp lỗi → pending rồi drain; bảo toàn Token |
| `re3-001-after-related-2` | 121/121 (live-bridge-audit R08/R09, cumulative, journal, re2-regression, token-flow…) |
| `re3-001-after-native-bench-3` | WS thật + PG thật 1…300: accepted 129, supplierCalls 258 = expected 258, ledgerViolations 0, duplicateCharges 0 (`-2` thất bại chỉ vì đường ghi tệp; giữ nguyên) |

## Còn lại / giới hạn
- Chưa thử với Alibaba thật, mạng thật, nhiều tiến trình cầu nối thật. Biên nhận bị chặn khi CSDL chết hẳn chỉ còn trong log tiến trình (không thể ghi CSDL lúc đó) → cần Chủ/Admin đối soát theo log + admission `unknown`.
- Phiếu giữ lại khi chưa rõ sẽ được `releaseStaleWith` nhả sau 6 giờ như cơ chế cũ; nếu muốn khác là quyết định nghiệp vụ.
- Trạng thái: **PASS (fixture/PG thật), PARTIAL (chưa staging/nhà thật)**.

## Rollback
Revert commit checkpoint này. Bảng `live_usage_receipts` để nguyên (chỉ thêm, ứng dụng cũ bỏ qua); không xóa journal/ledger. Nếu đã có biên nhận shortfall > 0 thì đối soát trước khi revert.
