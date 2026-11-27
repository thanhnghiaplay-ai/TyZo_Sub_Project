# RE6-004 · Trần chi của công cụ đo Modal

Baseline `30ed3ba`. Công cụ `deploy/vps/do-modal/do-modal.py` chỉ chạy tay từ VPS và không nằm trong luồng tính tiền khách. Mọi phép thử dùng máy chủ Modal giả trên loopback. Không gọi Modal hay GPU thật.

## Lỗi trước sửa

Script kiểm trần trước nhưng chỉ cộng chi phí sau khi có kết quả, nên 4 lệnh song song đều vượt qua phép kiểm. Lệnh hết giờ hoặc lỗi tính bằng 0. Không có hạn chót tổng hay giới hạn số lần chuyển hướng, và stats không được kiểm. Xem [before.txt](before.txt).

## Thay đổi

- Tách lớp `Meter` có thể kiểm thử. Hỏi URL và token chỉ trong `main()`.
- **Giữ chỗ:** trước mỗi lệnh giữ phần chi xấu nhất, bằng `CALL_DEADLINE_S/3600 × GPU_USD_PER_HOUR + MODEL_CAP_USD`, dưới khóa. Lệnh chỉ được gửi khi `đã chi + đang giữ + giữ chỗ ≤ trần`. Lệnh không đủ chỗ thì bỏ qua và được đếm trong `skipped_for_budget`.
- **Chi phí không rõ:** lỗi mạng, hết giờ, HTTP khác 200, thiếu stats hoặc stats không hữu hạn, âm hay không phải số đều tính bằng toàn bộ phần giữ chỗ. Phần này cũng được ghi riêng ở `unknown_usd_reserved`. Lệnh vượt phần giữ chỗ được đánh dấu `vuot_giu_cho`.
- **Hạn chót và chuyển hướng:** hạn chót tổng theo đồng hồ monotonic cho cả chuỗi 303, tối đa `MAX_REDIRECTS` lần. Chỉ đi theo chuyển hướng cùng máy và cùng scheme. Token chỉ nằm trong thân POST đầu tiên.
- **Ghi rõ giới hạn:** `budget_kind` là «trần ước tính của script, không tuyệt đối». `not_counted` nêu thời gian máy chờ và khởi động Modal sau lệnh. Cấu hình NaN, âm hoặc vô hạn bị từ chối.

## Kiểm thử

`python3 -I -B deploy/vps/do-modal/test_do_modal.py`, và bản bọc `node --test scripts/re6-004-do-modal.test.mjs`: 8/8 đạt. Các ca gồm chi phí biết trước, 4 luồng với trần đủ 2 lệnh (tối đa 2 lệnh chạy cùng lúc), lượt đầy đủ 17 lệnh dừng ở 4 lệnh, timeout tính phần giữ chỗ, NaN, số âm, chuỗi, thiếu stats, HTTP 500, vòng 303 bị giới hạn theo số lần và hạn chót, 303 cùng máy được đi theo còn khác máy bị từ chối, cấu hình xấu và token không xuất hiện trong kết quả. Xem [test-summary.txt](test-summary.txt).

## Còn lại

Đo Modal thật cần Chủ duyệt chi GPU. Giá `GPU_USD_PER_HOUR=0.8` và `MODEL_CAP_USD=0.02` là tham số ước tính cần đối chiếu hóa đơn Modal.
