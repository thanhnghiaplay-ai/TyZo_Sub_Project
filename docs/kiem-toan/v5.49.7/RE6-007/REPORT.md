# RE6-007 · Hiệu năng và đúng đắn của tyzo_admit (0057)

Baseline `0a1c405`. Chạy trên PostgreSQL 18.7 (`postgres:18.7-bookworm`, Docker, loopback, `max_connections=500`), 4 CPU, Node 22.23.5. CSDL thử được tạo bằng `scripts/migrate.mjs` (59 migration), dữ liệu tổng hợp. Không sửa migration.

## Đúng đắn (7/7 đạt)

`TYZO_TEST_PG_URL=… node --test scripts/re6-007-admission-pg.test.mjs`. Xem [test-summary.txt](test-summary.txt).

- **Ký tự lạ:** mã khách, nhà và model có `"`, `,`, `[]`, `{}`, `\`, emoji, dấu tiếng Việt, khoảng trắng hoặc `'`. Khóa mảng JSON không bị lẫn. Ví dụ `u1","batch` và `u1` có suất riêng độc lập.
- **Điều kiện được xét:** 5k khách đã rời đi (quá 6 s), 5k khách mới chờ dưới 3 s và 5k khách không chung tài nguyên đều không chặn khách mới.
- **Thứ tự và vị trí:** 1k khách chờ đủ điều kiện, chung lane, trần lane 10. Khách mới nhận `busy:11` và khách chờ đầu tiên được nhận.
- **Không giữ chỗ khi chính khách chờ không nhận được suất:** model của họ đã đầy thì khách mới vẫn vào.
- **Phần dành cho live:** batch dừng ở `perProvider − liveReserve`. 1k khách chờ batch không giữ phần dành cho live.
- **Burst 300 đồng thời**, trộn 3 lane × 3 nhà × 4 model với 1k khách chờ: không vượt trần lane, nhà, model, suất riêng hay phần không-live.

## Đo (ms) · [benchmark.json](benchmark.json)

| Khách chờ chung lane, không ai giữ chỗ (xấu nhất) | p50 | p99 |
|---|---|---|
| 0 | 1.57 | 4.51 |
| 1 000 | 4.42 | 4.84 |
| 5 000 | 17.72 | 23.92 |

| Burst 300 (kết nối mở sẵn) | Tổng thời gian | p99 |
|---|---|---|
| 0 khách chờ | 958 | 946 |
| 1 000 | 1 102 | 1 090 |
| 5 000 | 1 784 | 1 771 |

| Đồng thời (1k khách chờ, 10 lượt mỗi luồng) | lượt/s | p50 | p99 |
|---|---|---|---|
| 25 | 198 | 123 | 142 |
| 50 | 201 | 244 | 294 |
| 100 | 293 | 205 | 619 |
| 200 | 475 | 398 | 559 |

## Kết luận: chưa tối ưu

Khóa toàn cục làm các lượt nhận việc chạy nối tiếp, khoảng 1,6–3 ms mỗi lượt khi không có khách chờ. Vòng lặp khách chờ cộng thêm khoảng 2,9 ms mỗi 1k khách. Ở 1k khách chờ, burst 300 chỉ chậm hơn 15% (0,96 → 1,10 s). Chỉ từ khoảng 5k khách chờ cùng lúc thì vòng lặp mới chiếm phần lớn thời gian, khoảng 18 ms mỗi lượt và tối đa khoảng 55 lượt/s. Mức đó vượt xa quy mô hiện tại: tổng trần mặc định khoảng 104 suất và `MAX_PENDING_ADMISSIONS=32` mỗi tiến trình. Theo tiêu chí «chỉ tối ưu khi có bằng chứng», giữ nguyên 0057.

Khuyến nghị: theo dõi số dòng `work_waiters` có `seen_at` trong 6 s. Nếu thường xuyên vượt 1 000 thì mở việc tối ưu, ví dụ dừng vòng lặp sớm khi tài nguyên của khách mới đã hết và tính vị trí bằng truy vấn đếm. Cách này đổi ngữ nghĩa vị trí nên cần Chủ duyệt.
