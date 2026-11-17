# Thêm nhà cung cấp mới (Groq, Alibaba, Deepgram, ...)

Bảng chung nằm ở `src/lib/sub/provider.ts` (`PROVIDERS`). Mỗi nhà là một dòng: nhãn, địa chỉ API, kiểu gửi key, khả năng (asr, chat, tts, live), trang lấy key, tên dòng lưu trong `room_settings`.

## Các bước, làm theo thứ tự, đẩy `work` sau mỗi bước

1. **Bảng chung**: thêm id vào `ProviderId`, thêm dòng vào `PROVIDERS`, thêm trường hợp vào `modelIdsFrom` nếu `/models` không theo dạng OpenAI. Thêm test ở `provider.test.ts`.
2. **Lõi thuần** (không import server): hàm dựng yêu cầu, đọc phản hồi ra `Seg`, bảng ngôn ngữ. Có test với phản hồi mẫu.
3. **Máy chủ**: file `*.server.ts` + server fn mỏng (mẫu: `ali-filetrans.server.ts`, `ali-filetrans.ts`). Key khách đi qua máy chủ, không lưu. Key phòng lấy từ `room_settings`.
4. **Model + nhà nhận dạng**: thêm vào `ASR_MODELS` (`models.ts`), `asrHouse` (`asr-house.ts`), kiểu `AsrModel` (`types.ts`).
5. **Giao diện khách**: ô key (`use-pipeline.ts`, kho trình duyệt), chọn model (`studio.tsx`), nhánh trong `start()` và nhánh chạy.
6. **Admin**: ô key phòng + danh sách model TỰ HIỆN cho nhà mới (`<ProviderKeyBoards />` ở `admin-desk.tsx` lặp theo `PROVIDER_IDS`, dùng chung `provider-room.ts`; ghi chú sinh từ khả năng ở `providerKeyNote`, không cần viết thêm), bảng giá (mẫu `alibaba-catalog.ts`), gói dịch (`service-pack-board.tsx`).
7. **Đủ HAI cửa, bắt buộc** (không để nhà mới chỉ chạy một cửa): Thuê phòng (key của khách) và Trả theo lượt (key phòng, giữ và trừ Token dịch). Dùng chung `room-asr.server.ts` (`assertRoomTicket`, `roomKeyOf`, `chargeRoomAsr`); thêm nhánh nhà vào `run-turn.ts` (giữ tiền), `turn-quote.ts` và `holdGiay` (`token-math.ts`), key `"room"` ở server nhận dạng của nhà, nhánh `roomPayRef` ở `use-pipeline.ts`, trừ Token dịch theo GIÁ GỐC của nhà (không có phần trăm chênh riêng từng nhà; chênh chỉ nằm ở giá gói Token dịch), giá tự cập nhật nếu nhà có trang giá. Bài kiểm `provider-doors.test.ts` tự chạy cho mọi nhà có khả năng asr và tsc báo lỗi nếu quên khai bảng giá của nhà mới.
8. **Chữ**: điều khoản (nhà nhận dữ liệu, nước đặt máy chủ), Hướng dẫn, CHANGELOG, `HANDOFF.md`, `PROJECT_STATUS.md`.

Mỗi bước xong phải: `npx tsc --noEmit` và `npm test` sạch rồi mới đẩy.
Không ghi key hay token vào code, tài liệu hay lịch sử git.

## Dịch trực tiếp theo khả năng (v5.2.1)
Không cần khai riêng: `liveModeOf` (`src/lib/live/live-show.ts`) suy từ danh mục model. Model loại `live` là `real` (Admin bật được); nhận dạng có `intake: "chunks"` là `chunked` (hiện nhưng chưa bật được, app chưa có đường chạy); còn lại không có dịch trực tiếp. Model live thật mới: thêm vào danh mục (`model-catalog.ts`) với kind `live` và vào `LIVE_MODELS`.
