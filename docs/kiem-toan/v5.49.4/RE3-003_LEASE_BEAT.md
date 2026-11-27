# RE3-003 (P1) — Nhịp sống lease không chồng truy vấn

## Nguyên nhân gốc
`startBeat` (baseline work-lease.ts 13–22) dùng `setInterval`: không chờ promise nhịp trước, lỗi bị `catch(() => undefined)` nuốt, câu UPDATE không có timeout và không cho biết còn trúng dòng hay không. CSDL chậm hơn chu kỳ → nhịp chồng chất giữ thêm kết nối pool (đúng lúc pool đang căng); mất lease không ai biết; `stop()` không chờ nhịp đang chạy.

## TRƯỚC
`re3-003-before-lease-2.log` (test mới chạy với work-lease.ts của baseline): **0/5** — **6 nhịp chạy cùng lúc** khi mỗi nhịp 120 ms/chu kỳ 20 ms; `stop()` không chờ; cập nhật 0 dòng và lỗi liên tục không được báo; không có jitter. (`re3-003-before-lease.log` là bản test trước khi đổi test jitter sang hàm thuần; giữ nguyên.)

## Sửa
- `work-lease.ts`: lịch `setTimeout` nối tiếp (single-flight), jitter ±10% (`nextDelay`), `onLost("fenced")` khi UPDATE…RETURNING rỗng, `onLost("deadline")` khi quá `LEASE_STALE − 1 nhịp` không có nhịp thành công, số đo `leaseMetrics()` (beats/failures/lost/inFlight/slowestMs), `stop()` trả promise chờ nhịp đang chạy, `boundedBeat` = giao dịch ngắn `set_config('statement_timeout', 10s, true)` (timeout thật ở máy chủ).
- Áp vào: admission (`beginWork`, thêm `returning id`), cửa gọi nhà (`beatGateCall`), đoạn TyZo Modal (`returning 1`). Nơi gọi `await stopBeat()` trong `finally`.
- Mất lease không tự nhả suất/không gửi lại (giữ nguyên chính sách unknown của Chủ); quyết toán vẫn tự chặn theo mã lượt/trạng thái (R01, RE-001).

## SAU
| Nhãn | Kết quả |
|---|---|
| `re3-003-after-lease` | 5/5 test đơn vị |
| `re3-003-after-related` | 111/111: thêm PG thật — dòng bị khóa từ kết nối khác (CSDL treo) → nhịp bị máy chủ hủy sau 150 ms, peak=1, lỗi được đếm, `deadline` đúng; lease đã quét unknown → nhịp 0 dòng; hoàn tất muộn ghi done một lần; cùng modal-race, re2, run-gate, gate-reserve, upstream-outcome, async-asr, live-bridge-audit |

## Giới hạn
Thời gian thu nhỏ trong test (40 ms / 600 ms / 150 ms) thay cho 30 s / 150 s / 10 s; chưa chạy treo CSDL thật >150 s trên staging. `onLost` hiện ghi `console.warn` + số đo; chưa có trang Admin hiển thị `leaseMetrics` (đề xuất). Trạng thái: **PASS fixture/PG thật; PARTIAL staging**.

## Rollback
Revert checkpoint 3 (không migration). Hàm `startBeat` cũ tương thích chữ ký số; nơi gọi `await stopBeat()` vẫn chạy với hàm cũ (await undefined).
