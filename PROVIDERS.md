# Thêm nhà cung cấp mới (Groq, Alibaba, Deepgram, ElevenLabs, ...)

Bảng chung nằm ở `src/lib/sub/provider.ts` (`PROVIDERS`). Mỗi nhà là một dòng: nhãn, địa chỉ API, kiểu gửi key, khả năng (asr, chat, tts, live), trang lấy key, tên dòng lưu trong `room_settings`.

## Các bước, làm theo thứ tự, đẩy `work` sau mỗi bước

1. **Bảng chung**: thêm id vào `ProviderId`, thêm dòng vào `PROVIDERS` (đặt `ready: false` cho tới khi xong bước 7: nhà chưa `ready` không hiện ra Admin, khách, Hướng dẫn và bài kiểm «đủ hai cửa»; `ALL_PROVIDER_IDS` là cả bảng, `PROVIDER_IDS` chỉ nhà đã `ready`; khai `listPath` là đường kiểm key/đọc model, và `fixedModels` nếu nhà không có lệnh liệt kê model; `auth: "raw"` nếu key gửi không tiền tố, `auth: "xi"` nếu key đi trong header riêng `xi-api-key` như ElevenLabs; gọi chung thì dùng `authHeaders` thay vì tự đặt `Authorization`), thêm trường hợp vào `modelIdsFrom` nếu `/models` không theo dạng OpenAI. Thêm test ở `provider.test.ts`.
2. **Lõi thuần** (không import server): hàm dựng yêu cầu, đọc phản hồi ra `Seg`, bảng ngôn ngữ. Có test với phản hồi mẫu.
3. **Máy chủ**: file `*.server.ts` + server fn mỏng (mẫu: `ali-filetrans.server.ts`, `ali-filetrans.ts`). Key khách đi qua máy chủ, không lưu. Key phòng lấy từ `room_settings`.
4. **Model + nhà nhận dạng**: thêm vào `ASR_MODELS` (`models.ts`), `asrHouse` (`asr-house.ts`), kiểu `AsrModel` (`types.ts`).
5. **Giao diện khách**: ô key (`use-pipeline.ts`, kho trình duyệt), chọn model (`studio.tsx`), nhánh trong `start()` và nhánh chạy.
6. **Admin**: ô key phòng + danh sách model TỰ HIỆN cho nhà mới (`<ProviderKeyBoards />` ở `admin-desk.tsx` lặp theo `PROVIDER_IDS`, dùng chung `provider-room.ts`; ghi chú sinh từ khả năng ở `providerKeyNote`, không cần viết thêm), bảng giá (mẫu `alibaba-catalog.ts`), gói dịch (`service-pack-board.tsx`).
7. **Đủ HAI cửa, bắt buộc** (không để nhà mới chỉ chạy một cửa): Thuê phòng (key của khách) và Trả theo lượt (key phòng, giữ và trừ Token dịch). Dùng chung `room-asr.server.ts` (`assertRoomTicket`, `roomKeyOf`, `chargeRoomAsr`); giữ tiền ở `run-turn.ts`/`turn-quote.ts`/`holdGiay` đã chung cho mọi nhà (`room-turn.ts`, giá ở `price-rows.ts` + `price-books.server.ts`: khai giá nhà mới ở hai bảng này, không thêm nhánh), key `"room"` ở server nhận dạng của nhà, nhánh `roomPayRef` ở `use-pipeline.ts`, trừ Token dịch theo GIÁ GỐC của nhà (không có phần trăm chênh riêng từng nhà; chênh chỉ nằm ở giá gói Token dịch), giá tự cập nhật nếu nhà có trang giá. Bài kiểm `provider-doors.test.ts` tự chạy cho mọi nhà có khả năng asr và tsc báo lỗi nếu quên khai bảng giá của nhà mới.
8. **Chữ**: điều khoản (nhà nhận dữ liệu, nước đặt máy chủ), Hướng dẫn, CHANGELOG, `HANDOFF.md`, `PROJECT_STATUS.md`.

Mỗi bước xong phải: `npx tsc --noEmit` và `npm test` sạch rồi mới đẩy.
Không ghi key hay token vào code, tài liệu hay lịch sử git.

## Dịch trực tiếp theo khả năng (v5.2.1)
Không cần khai riêng: `liveModeOf` (`src/lib/live/live-show.ts`) suy từ danh mục model. Model loại `live` là `real` (Admin bật được); nhận dạng có `intake: "chunks"` là `chunked` (hiện nhưng chưa bật được, app chưa có đường chạy); còn lại không có dịch trực tiếp. Model live thật mới: thêm vào danh mục (`model-catalog.ts`) với kind `live` và vào `LIVE_MODELS`.

## Việc dùng mô hình chữ: dịch, phân tích phim, trau chuốt (v5.19.0)
Không viết riêng cho nhà nào. Mọi việc chữ chọn model qua một đường, theo **nhà của model** và **khả năng nhà khai**:

- **Bảng nhà** (`provider.ts`): nhà dịch được thì `caps` có `"chat"` và khai `chat: { path, tokenField, browserDirect }`
  (đường dạng OpenAI `chat/completions`; `tokenField` là tên trường giới hạn chữ trả về; `browserDirect: false` nếu trình duyệt
  không gọi thẳng được: key khách đi qua cửa chung, không lưu). Bài kiểm `provider.test.ts`: có `chat` thì phải khai đường.
- **Danh mục** (`models.ts` → `CHAT_MODELS`, trường `provider`): model dịch đã biết của nhà. Model lạ trên key được phân loại bằng
  `modelKindOf` (`model-catalog.ts`), model ảnh/nhúng/đọc ảnh/âm thanh không bị xem là model dịch.
- **Giá** (`price-rows.ts` → `BASE_ROWS`, `price-books.server.ts` → `ROW_LOADERS`): kiểu `Record<ProviderId, …>`, thiếu nhà là tsc đỏ.
  Token dịch luôn quy theo Whisper Turbo của Groq (`unitBook`), giá dịch tính theo bảng của đúng nhà.
- **Việc trong gói** (`service-pack.ts` → `ROLE_CAP`): mỗi việc cần một khả năng (nhận dạng → asr, dịch/ngữ cảnh/đối chiếu/tóm tắt → chat,
  thuyết minh → tts). `providersForRole` và `turnPackProblem` lọc theo khả năng, không danh sách tay.
- **Cửa phòng và cửa key khách**: một route chung `/api/model-call` (x-provider, x-path, x-run-ticket hoặc x-user-key).
  Quyết định ở `room-turn.ts` (`roomUse`, `dearestRoomChat`): nhà của model, key phòng, danh sách model phòng (`key-list.ts`), giá.
- **App** (`groq.ts` → `chatCall`, `use-pipeline.ts` → `chatKeyOf`, `autoPool`): đường gọi theo nhà của model, key riêng từng nhà;
  chế độ Tự động chỉ chọn model của nhà khách có key (hoặc phòng đang mở), xếp hạng tự nối model mọi nhà theo điểm.
- **Bài kiểm đủ hai cửa cho dịch** (`provider-doors.test.ts`): tự chạy cho mọi nhà có `"chat"`: có model, có giá, giữ được Token ở cửa phòng,
  Chủ mở được ở Thuê phòng, gói chọn được, Tự động chọn được khi chỉ có key nhà đó.

Thêm nhà dịch mới: khai `chat` ở bảng nhà, thêm model vào `CHAT_MODELS` với `provider`, thêm giá vào `BASE_ROWS` và cách nạp giá vào
`ROW_LOADERS`, rồi chạy test. Không phải sửa `run-turn.ts`, `model-call.ts`, `groq.ts` hay giao diện.
Điều khoản: thêm nhà vào câu «Câu thoại cần dịch … được gửi tới …» (`terms-document.tsx`) và nâng `TERMS_VERSION`.

## Giọng đọc (thuyết minh) theo nhà (v5.35.0)
Mỗi nhà đọc giọng một đường riêng, chưa gom: Orpheus (Groq, `groq.ts` `speakOrpheus`), Aura (Deepgram, `/api/room-deepgram`),
ElevenLabs Flash v2.5 (`/api/room-elevenlabs`, lõi `sub/eleven-voice.ts`). Nhà có `"tts"` thì việc Thuyết minh trong gói chọn được
nhà đó (`providersForRole("narration")`). Thêm giọng nhà mới: khai `"tts"`, model ở `model-catalog.ts` (kind `tts`), giá theo ký tự
(`usdPerMillionChars`) ở bảng giá của nhà, cửa phòng tính tiền bằng `chargeWith` đường `/audio/speech`, engine ở `narration.ts`
và `NarrationSettings`, ô chọn ở `studio.tsx`. Key khách dùng được giọng thì thêm nhà vào `rentKindsOf` (ô tick thuê phòng) và
kiểm `rentVoiceProblem(show, model, house)`.
