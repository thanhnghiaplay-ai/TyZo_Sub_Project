# Thêm nhà cung cấp mới (Groq, Alibaba, Deepgram, ...)

Bảng chung nằm ở `src/lib/sub/provider.ts` (`PROVIDERS`). Mỗi nhà là một dòng: nhãn, địa chỉ API, kiểu gửi key, khả năng (asr, chat, tts, live), trang lấy key, tên dòng lưu trong `room_settings`.

## Các bước, làm theo thứ tự, đẩy `work` sau mỗi bước

1. **Bảng chung**: thêm id vào `ProviderId`, thêm dòng vào `PROVIDERS`, thêm trường hợp vào `modelIdsFrom` nếu `/models` không theo dạng OpenAI. Thêm test ở `provider.test.ts`.
2. **Lõi thuần** (không import server): hàm dựng yêu cầu, đọc phản hồi ra `Seg`, bảng ngôn ngữ. Có test với phản hồi mẫu.
3. **Máy chủ**: file `*.server.ts` + server fn mỏng (mẫu: `ali-filetrans.server.ts`, `ali-filetrans.ts`). Key khách đi qua máy chủ, không lưu. Key phòng lấy từ `room_settings`.
4. **Model + nhà nhận dạng**: thêm vào `ASR_MODELS` (`models.ts`), `asrHouse` (`asr-house.ts`), kiểu `AsrModel` (`types.ts`).
5. **Giao diện khách**: ô key (`use-pipeline.ts`, kho trình duyệt), chọn model (`studio.tsx`), nhánh trong `start()` và nhánh chạy.
6. **Admin**: ô key phòng + danh sách model: thêm `<ProviderKeyBoard provider="id" />` ở `admin-desk.tsx` (dùng chung `provider-room.ts`, không viết lại), bảng giá (mẫu `alibaba-catalog.ts`), gói dịch (`service-pack-board.tsx`).
7. **Trả theo lượt (key phòng)**: chỉ làm khi được yêu cầu. Cần giữ và trừ Token dịch (mẫu `chargeRoomAsr`).
8. **Chữ**: điều khoản (nhà nhận dữ liệu, nước đặt máy chủ), Hướng dẫn, CHANGELOG, `HANDOFF.md`, `PROJECT_STATUS.md`.

Mỗi bước xong phải: `npx tsc --noEmit` và `npm test` sạch rồi mới đẩy.
Không ghi key hay token vào code, tài liệu hay lịch sử git.
