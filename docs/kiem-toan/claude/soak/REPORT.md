# Soak hỗn hợp · PASS cục bộ (một mạch 3.614 s)

Lượt 2 của Codex chạy trong `/workspace/tyzo-audit-mixed-final`, nhưng thư mục đó không còn ở máy Claude, nên không đọc được artifact cuối. Lượt này chạy lại **một mạch** bằng `docs/kiem-toan/codex/integration-load-soak/mixed-soak.sh`, không cộng thời gian với lượt nào khác.

- Mã: `b829fd9`, bản Node `NITRO_PRESET=node-server` dựng trong thư mục riêng, chạy bằng người dùng thường `tyzo`, loopback `127.0.0.1:17750`, env sạch (PGlite).
- Node 22.23.5, k6 0.55.0, PostgreSQL **16.15** loopback cổng 55439, CSDL `tyzo_test`. Máy không có 17.12. Upstream giả; không có GPU, nhà cung cấp thật hay âm thanh trình duyệt.
- Thời gian: 15:29:00Z → 16:30:10Z. AI `elapsed=3614`, 199 vòng, `ai_exit=0`, `web_exit=0`.

## Admission (tyzo_admit, 4 pool × 10 kết nối, mỗi vòng 3 s, 199 vòng)

| Mức | ok | busy | lỗi/không chắc | p95 trung vị / tệ nhất (ms) | p99 tệ nhất | vượt cap |
|---|---|---|---|---|---|---|
| 25 | 113.687 | 0 | 0/0 | 29,7 / 138,8 | 304,5 | 0 |
| 50 | 199.653 | 21.294 | 0/0 | 37,1 / 226,0 | 345,4 | 0 |
| 100 | 267.681 | 125.598 | 0/0 | 57,5 / 468,1 | 579,6 | 0 |
| 200 | 211.936 | 228.843 | 0/0 | 157,4 / 629,7 | 793,1 | 0 |
| đợt 300 | 14.303 | 45.397 | 0/0 | 295,5 / 768,3 | 810,4 | 0 |

Đói (khách không được nhận lần nào trong cửa sổ 3 s): 4, 12 và 377 lượt khách cộng dồn ở mức 50, 100 và 200, xuất hiện ở 149/199 vòng. Cửa sổ đo (3 s) bằng đúng ngưỡng chống đói (3 s), lại có CPU bị k6, Node và live bench chiếm cùng lúc. Chạy lại cửa sổ 10 s khi máy rảnh (`admission-10s-idle.json`): **0 đói ở mọi mức**, 0 vượt cap, mức 200 p95 274,8 ms và p99 349,2 ms. Kết luận: không có khách bị bỏ đói quá ngưỡng, nhưng **chưa chứng minh được 0 đói trong 3 s khi tải hỗn hợp**. Cần đo lại trên staging.

## Live WebSocket fixture (cầu nối thật + PostgreSQL thật, usage giả có replay)

Ở mọi vòng, số socket nhà tối đa là 24 (bằng cap). Sổ cái: 0 vi phạm, 0 trừ trùng, 199/199 vòng có số lệnh nhà khớp số quan sát, 29.156 phiên được nhận. Bảng dưới là p95 của phiên được nhận (ms), trung vị / tệ nhất:

| Đồng thời | 200 | 429 | p95 |
|---|---|---|---|
| 1 | 199 | 0 | 109 / 135 |
| 25 | 4.777 | 198 | 298 / 575 |
| 100 | 4.784 | 15.116 | 267 / 500 |
| 300 | 7.162 | 52.538 | 475 / 910 |

Số này là thời gian mở phiên và quyết toán qua fixture. **Không phải độ trễ từ âm thanh đến chữ hiển thị**, chỉ số đó chưa đo được (cần nhà cung cấp thật, trình duyệt có âm thanh thật và ngân sách thử).

## Web (k6, 300 VU, 61 phút, `/gioi-thieu` và `/login`)

313.340 yêu cầu (85,5 yêu cầu/s), 0% lỗi, kiểm tra nội dung đạt 100%. Thời gian phản hồi: p50 4,9 ms, p90 10,3 ms, p95 13,4 ms, tối đa 1.229 ms. Ngưỡng `p95<300` và `failed<1%` đạt.

## Runtime

- PostgreSQL: tối đa 43 kết nối. Chờ khóa cao nhất 40, trong 15:54–16:04, rồi tự về 0. RSS tăng từ 139 lên 151 MB.
- Node web: RSS tăng từ 555 MB lên 724 MB trong 20 phút đầu, rồi **đứng ở 724 MB** suốt 35 phút còn lại (tăng do khởi động, không thấy rò). CPU trung vị 38,6%.

## Sự cố trong lượt

Lúc khoảng 15:41Z (giây 750), Claude lỡ chạy một lệnh test `gate-reserve`/`run-gate` (khoảng 15 s) trên cùng CSDL `tyzo_test`. Các vòng 42–44 ngay sau đó vẫn exit 0, và cả lượt không có vòng nào lỗi. Từ đó mọi test khác chạy trên CSDL riêng `tyzo_dev`. Nếu cần một lượt sạch tuyệt đối, chạy lại một mạch.

Tệp: `summary.json` (tổng hợp bằng `summarize.py`), `iterations.jsonl`, `runtime.csv`, `k6-web.json`, `meta.txt`, `exit.txt`, `result.json`, mẫu vòng đầu và cuối trong `samples/`.
