# Kiểm tra bản tích hợp trước soak

## CODEX-PGLITE-BUILD · PASS trên bản Node local

Nitro gộp PGlite vào _libs nhưng thiếu pglite.data/pglite.wasm, thư viện mở tệp tương đối với import.meta.url. Bản Node công khai vẫn trả HTML trong khi bootstrap DB fail, nên đã chủ động dừng soak lượt đầu và giữ kết quả dở riêng. Cấu hình traceDeps giữ module và tệp runtime đi chung. Bản Node Node 22 chạy từ .output, có cả hai tệp và không lặp lại lỗi bootstrap. Cổng Vercel và Web xem checkpoint tích hợp tiếp theo. Rollback: revert riêng tùy chọn trace trên nhánh thử nếu trình đóng gói mới đã xử lý được tệp.

## Changelog · PASS

Mục 5.49.5 ban đầu vượt giới hạn độ dài, cụm từ và số bản. Rút gọn theo bài kiểm và chuyển mục 5.35.0 nguyên văn sang tài liệu lịch sử. Kết quả trong regression.log.

## RE4-001, bổ sung đối chiếu Alibaba · PARTIAL

Bảng fallback có cửa sổ quá thấp cho qwen-plus và qwen-max. Mô tả API xác nhận max_tokens legacy có thể không tính reasoning. Đã cập nhật metadata theo tài liệu hiện hành, giữ giá; chặn reasoning/nhà chạy tool trong cửa trả theo lượt, đặt enable_thinking=false cho qwen-plus. Thiếu cận xác minh qwen-turbo khiến yêu cầu trả theo lượt của model này fail closed; cấu hình, giá và đường key riêng vẫn tồn tại. Mức giữ toàn ngữ cảnh vẫn quá bảo thủ cho một số phiếu ngắn. Cần usage thật và cận chặt hơn theo request trước khi chốt. 48/48 test PASS cho cổng sửa mã, pricing, DB loopback và changelog.

Nguồn: https://www.alibabacloud.com/help/en/model-studio/text-generation-model ; https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions ; https://www.alibabacloud.com/help/en/model-studio/deep-thinking ; https://console.groq.com/docs/api-reference .
