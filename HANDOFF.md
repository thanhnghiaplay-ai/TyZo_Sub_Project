## SẮP XẾP LẠI GIAO DIỆN (bắt đầu 18/11/2026, nhánh work) — Admin trước, trang khách sau
Ý CHỦ: giao diện rối (quá nhiều mục, khó dùng trên điện thoại, mục sắp sai nhóm/thứ tự). Chủ CHƯA xác định cách sắp, đã xem bản mô phỏng và CHỐT làm theo đề xuất dưới. Chỉ đổi cách sắp xếp, KHÔNG đổi chức năng, quyền, dữ liệu, giá, điều khoản. Mỗi bước: sửa → tsc, eslint, npm test (~3 phút) → commit → đẩy work → ghi mục này → bước sau.
THỨ TỰ: [XONG] 1 menu và tên nhóm → [XONG] 2 tách tab «Cấu hình» thành 6 trang con bấm ngang (mục BƯỚC 2 XONG dưới) → [CHƯA] 3 tách «Tài khoản khách» ra khỏi tab «Phiếu và việc» (hiện gộp thống kê + tìm tài khoản + phiếu, nằm ở run-desk-board.tsx part ops) → [CHƯA] 4 điện thoại: thanh dưới 4 nút (Tổng quan, Việc, Dịch vụ, Menu), nhãn tab ngắn → [CHƯA] 5 trang khách (Studio): rà lại, Chủ chưa chỉ rõ chỗ nào; PHẢI hỏi hoặc mô phỏng cho Chủ duyệt trước khi sửa.
BƯỚC 1 XONG: `src/lib/admin-groups.ts` (mới, thuần, tách khỏi admin-nav.tsx để test được) giữ ADMIN_GROUPS: Khách và việc [viec] · Dịch vụ [cau-hinh] · Tiền [tien, ctv] · Nội dung [thuat-ngu, thu, giao-dien] · Hệ thống [so-do, chat-luong, thao-tac, nhat-ky]; Tổng quan đứng riêng đầu, «Về phòng» cuối (admin-nav.tsx). Nhãn tab `viec` đổi thành «Phiếu và việc» (admin-tabs.ts). Test mới `src/lib/admin-groups.test.ts` (mỗi tab đúng một nhóm), đã thêm vào script test ở package.json. Ghi admin-log. Không nâng APP_VERSION (khách không thấy khác). Kiểm: tsc sạch, eslint 0 lỗi, npm test 825/825.
BƯỚC 2 XONG: tab «Cấu hình» (Chủ) nay là `ConfigTab` ở `src/components/admin-config.tsx` (admin-desk.tsx chỉ còn một dòng gọi nó). Thanh chọn ngang 6 trang con, danh sách ở `src/lib/admin-config-pages.ts` (+ test): Trạng thái [ServiceStatusBoard, SupportBoard] · Nhà cung cấp [ProviderKeyBoards] · Gói và giá [RunDeskBoard part=price, GiayPackBoard, Fold Gói dịch] · Thuê phòng [RentShowBoard] · Dịch trực tiếp [LiveWorkspaceBoard, LiveShowBoard] · Cổng nạp [PaySettings]. Trang không chọn chỉ bị ẩn bằng style display none (không gỡ), nên ô nhập dở không mất khi chuyển trang; hệ quả: mọi khối vẫn tải dữ liệu ngay khi mở tab Cấu hình như trước. Khối nào có Fold thì vẫn đóng sẵn. Trang con không nhớ giữa các lần mở (luôn về Trạng thái), chưa đưa lên địa chỉ/lịch sử trình duyệt. Kiểm: tsc sạch, eslint 0 lỗi, `npm run build` qua, npm test qua.
CHƯA LÀM Ở BƯỚC 2: chưa bấm thử trình duyệt/điện thoại thật (thanh chọn cuộn ngang trên màn hẹp chưa nhìn tận mắt); nhãn tab «Cấu hình» ở menu chưa đổi thành «Dịch vụ» (nhóm đã tên Dịch vụ, tab vẫn là Cấu hình) — có thể đổi ở bước 4 cùng nhãn ngắn.
LƯU Ý CHO BƯỚC 2 TRỞ ĐI: «Chất lượng» đã chuyển từ nhóm Tiền sang Hệ thống. Tab Cấu hình dựng ở admin-desk.tsx (khoảng dòng 340 đến 370); id tab ở src/lib/admin-tabs.ts (có test đếm 12 tab cho Chủ, 5 tab cho Quản lý/Hỗ trợ: không đổi id tab). Muốn thêm trang con thì giữ id tab cũ `cau-hinh`, thêm trạng thái trang con bên trong, đừng thêm id tab mới trừ khi sửa cả admin-tabs.test.ts. Code tách file nhỏ, mỗi file một việc.
VIỆC CHỦ: chưa bấm thử trên điện thoại thật; xem menu mới ở /admin và báo nếu muốn đổi tên nhóm.

## GÓI TỰ ĐỘNG BẰNG THANH KÉO (bắt đầu 17/11/2026, nhánh work)
Ý CHỦ: gói dịch đang chọn tay → muốn bảng kéo thanh cho từng việc (nhận dạng, dịch, ngữ cảnh, đối chiếu, tóm tắt, thuyết minh), hệ thống tự chọn model trong mọi model đang mở, rồi từ đó tạo gói. CHỦ CHỐT: thanh là BA MỨC RỜI (Tiết kiệm / Cân bằng / Chất lượng), không kéo liên tục.
THỨ TỰ: [XONG] 1 điểm model (`src/lib/sub/model-grade.ts` + test) → [XONG] 2 hàm tự chọn model thuần có test (`src/lib/pack-auto.ts`) → [XONG] 3 bảng kéo thanh `src/components/pack-auto-board.tsx` gắn trong `service-pack-board.tsx`, có giá ước từ `quotePack` → [XONG] 4 nút Tạo gói (sinh `ServicePack` nháp, enabled=false).
QUY TẮC ĐÃ CHỐT: gói LƯU CỐ ĐỊNH model đã chọn lúc tạo (giá model đổi thì gói không tự đổi), có nút «chọn lại». Cách chọn tay hiện nay giữ nguyên làm phương án ghi đè. Ràng buộc theo việc: nhận dạng = mọi nhà có asr; dịch/ngữ cảnh/đối chiếu/tóm tắt = chỉ Groq và Alibaba, bỏ whisper/orpheus/tts/guard; thuyết minh = Orpheus (Aura trả bằng Token dịch, không đưa vào gói).
BƯỚC 1 XONG: `gradeOf(model)` trả {quality, speed, asian} thang 0 đến 10. Model chat Groq lấy từ CHAT_MODELS (speed chia 100). ĐIỂM ALIBABA, NHẬN DẠNG VÀ ORPHEUS LÀ ƯỚC LƯỢNG CỦA NGƯỜI LÀM, CHƯA ĐO: Chủ xem lại ở `GRADE_FIX` trong model-grade.ts. Model lạ trả null, tự chọn sẽ bỏ qua.
BƯỚC 2 XONG: `pickForRole(role, level, {candidates, books, lang})` và `autoRoles({levels, candidates, books, lang})` → `{roles, missing}`. Mức: save = rẻ nhất có điểm ≥ SAVE_FLOOR (6); balanced = rẻ nhất trong nhóm cách điểm tốt nhất ≤ BALANCED_BAND (1,5); best = điểm cao nhất, hòa thì rẻ hơn. Ba mức lồng nhau nên giá không đảo. `lang: "cjk"` tính điểm = 0,6 chất lượng + 0,4 tiếng Á. Nhận dạng + dịch luôn có (mặc định Cân bằng); context/review/summary/narration mặc định "off". Model thiếu điểm hoặc thiếu giá bị bỏ và liệt kê ở `missing`. `candidates` do người gọi lọc (model Chủ đã tick, key chạy được); hàm KHÔNG tự đọc danh sách tick.
VIỆC BƯỚC 3: dựng danh sách `candidates` từ bảng model đang mở (`getAlibabaDesk`/`loadGroqBoard`, danh sách tick ở rent-show), ba nút mức cho mỗi việc ở `service-pack-board.tsx`, hiện giá ước bằng `quotePack` (cửa trả theo lượt và thuê phòng), hiện model được chọn.
BƯỚC 3 XONG: `PackAutoBoard` (props `candidates`, `books`, `onDraft?`) hiện thanh ba mức cho từng việc (việc không bắt buộc thêm «Tắt»), nút chọn lời gốc thường/Trung-Nhật-Hàn, model được chọn từng việc, giá gốc ước 10 phút và khoản giữ ví cửa trả theo lượt. `service-pack-board.tsx` dựng `autoCandidates` (mọi model trong `choices`, KHÔNG lọc theo ô tick thuê phòng/live) và `autoBooks` (markup 0) rồi đặt bảng này phía trên danh sách gói. CHƯA tạo gói: `onDraft` đã báo bản nháp ra ngoài để bước 4 dùng. CHƯA bấm thử trên trình duyệt (chỉ có tsc, eslint, test logic ở pack-auto.test.ts).
VIỆC BƯỚC 4: nút «Tạo gói» dùng `autoRoles` → `ServicePack` mới (id `pack_` + 12 ký tự như `freshPack`, tên «Gói tự động» + mức, enabled=false, doors cả hai cửa), thêm vào `packs` (chưa lưu cho tới khi Chủ bấm «Lưu gói»), lưu cố định model đã chọn, có nút «Chọn lại» ở gói tạo từ bảng này (cần nhớ mức đã dùng; có thể lưu vào `note`). Cân nhắc lọc `candidates` theo model Chủ đã mở.
BƯỚC 4 XONG: `buildAutoPack({id, levels, lang, roles})` ở pack-auto.ts (test ở pack-auto.test.ts, kiểm qua `checkServicePack`) dựng gói nháp: tên «Gói tự động · <mức dịch>», doors cả hai cửa, enabled=false, ghi chú liệt kê mức từng việc, model LƯU CỐ ĐỊNH. Nút «Tạo gói từ bảng này» ở `PackAutoBoard` (prop `onCreate`) → `createAutoPack` trong service-pack-board.tsx thêm gói vào danh sách, hiện toast, CHƯA lưu cho tới khi Chủ bấm «Lưu gói».
KHÔNG LÀM (cố ý): nút «Chọn lại» ở từng gói (ServicePack không có trường nhớ mức; muốn chọn lại thì xóa gói rồi tạo gói mới từ bảng). `autoCandidates` chưa lọc theo ô tick Chủ đã mở. Chưa bấm thử trình duyệt thật. Chưa đẩy main (main đang v5.2.3, work có thêm 4 bước này, chưa nâng số phiên bản vì khách chưa thấy gì khác).
VIỆC CHỦ: xem lại điểm ước lượng ở `GRADE_FIX` (model-grade.ts); mở trang quản lý gói trên điện thoại, thử kéo từng mức, tạo gói nháp, kiểm giá ước rồi Lưu gói.
BƯỚC 4 XONG: `buildAutoPack({id, levels, lang, roles})` → `ServicePack` nháp (enabled=false, hai cửa, tên «Gói tự động · <mức dịch>», ghi chú liệt kê mức từng việc; null nếu thiếu nhận dạng/dịch), hợp lệ với `checkServicePack`, có test. Nút «Tạo gói từ bảng này» ở `PackAutoBoard` gọi `onCreate`; `service-pack-board.tsx` (`createAutoPack`) thêm gói vào danh sách `packs`, CHƯA lưu cho tới khi Chủ bấm «Lưu gói». Gói giữ cố định model lúc tạo.
CHƯA LÀM / CÒN LẠI CỦA TÍNH NĂNG NÀY: (a) chưa bấm thử trên trình duyệt hay điện thoại (chỉ có tsc, eslint, test logic); (b) «Chọn lại» chưa làm (muốn chọn lại thì tạo gói mới từ bảng rồi xóa gói cũ; mức đã dùng chỉ nằm trong ghi chú gói, không có trường riêng); (c) `autoCandidates` lấy MỌI model trong bảng, chưa lọc theo model Chủ đã mở/tick (rent-show, live-show) hay key chạy được: cân nhắc lọc; (d) điểm model ước lượng ở `GRADE_FIX` (model-grade.ts) cần Chủ xem lại; (e) giá so sánh dùng markup 0, ước lượng một phút theo hằng số ở service-pack.ts; (f) chưa có test giao diện cho PackAutoBoard.
VIỆC CHỦ: kiểm thử bảng ở Admin → mục Gói dịch trên điện thoại; xem lại điểm ở GRADE_FIX; sau khi hài lòng thì đẩy `main` (main đang v5.2.3, chưa có tính năng này; work đang cao hơn main các commit «Gói tự động bước 1 đến 4»). Không nâng số phiên bản khách vì đây là việc Admin.
BƯỚC 4 XONG: `buildAutoPack({id, levels, lang, roles})` ở pack-auto.ts dựng gói nháp (tên «Gói tự động · <mức dịch>», ghi chú nêu mức từng việc, hai cửa, enabled=false, model cố định), trả null khi thiếu nhận dạng/dịch; có test với `checkServicePack`. `PackAutoBoard` có prop `onCreate`; `service-pack-board.tsx` → `createAutoPack` thêm gói vào danh sách, Chủ phải bấm «Lưu gói» mới lưu và tự tick «Mở» khi hài lòng.
TOÀN BỘ 4 BƯỚC ĐÃ XONG ở nhánh work. CHƯA LÀM / VIỆC TIẾP THEO (theo thứ tự gợi ý): (a) bấm thử bảng trên trình duyệt/điện thoại thật (chưa ai thử giao diện); (b) Chủ xem lại điểm ước lượng ở `GRADE_FIX` (model-grade.ts); (c) nút «Chọn lại» cho gói tự động (hiện chỉ tạo gói mới, không nhớ mức ngoài dòng ghi chú; cần thêm trường lưu mức nếu muốn, sửa `checkServicePack`/lưu trữ); (d) ĐÃ LÀM: ô «Chỉ dùng model đã mở cho thuê phòng» trong `PackAutoBoard` (prop `rentShow`, hàm `onlyRentOpen` ở pack-auto.ts, mặc định TẮT; ẩn khi Chủ chưa lưu danh sách mở thuê phòng); (e) `main` chưa có phần gói tự động (main đang v5.2.3, work đi trước); đẩy main khi Chủ thử xong. KHÔNG đổi phiên bản khách, không đổi điều khoản.
ĐÃ ĐẨY CHÍNH THỨC (18/11/2026): main = work = 6d3a3c1, gồm bảng dựng gói tự động (bước 1 đến 4) và ô lọc model đã mở thuê phòng. Từ đây main KHÔNG còn thấp hơn work.
LƯU Ý KHI LÀM TIẾP: test chạy theo danh sách trong `package.json` (script "test"), thêm file test mới phải thêm vào danh sách. Kiểm trước khi đẩy: `npx tsc --noEmit`, `npx eslint .`, `npm test` (test mất ~3 phút).

## v5.2.3 (17/11/2026, work): DỌN CODE XONG — mọi việc trong yêu cầu 17/11 đã làm hết
TRẠNG THÁI: [XONG] chữ Deepgram (v5.2.2) · [XONG] thông báo live khi bỏ tick hết model (v5.2.2) · [XONG] c3 chặn giọng Orpheus (v5.2.3, mục dưới) · [XONG] dọn code (mục này).
ĐÃ LÀM DỌN CODE: (1) eslint 0 lỗi (còn 31 cảnh báo, không chặn): bỏ qua `public/vad/**` (thư viện onnxruntime đóng gói sẵn, chiếm 68/78 lỗi cũ) trong `eslint.config.mjs`, sửa tay 10 lỗi thật (prefer-const ở use-pipeline.ts/mp4.ts, ternary dùng như câu lệnh ở studio.tsx, no-empty ở client.server.ts, regex ký tự điều khiển ở glossary-share.ts/support-contact.ts có chú thích disable cố ý, escape thừa ở cast-voice.ts); (2) xóa `src/components/pack-picker.tsx` (không nơi nào import); (3) bỏ trường `markup` khỏi `LiveBook` (`live-cost.ts`, `live-book.ts`, `live-open.ts`, 2 test live); `liveCost` vẫn trả `{cost, base}` nhưng hai số bằng nhau; (4) viết lại `AGENTS.project.md`, làm mới bảng đầu `PROJECT_STATUS.md` (phiên bản v5.2.3 trên work, main còn v5.1.0). Không nâng phiên bản vì không đổi hành vi khách.
CÒN MỞ / KHÔNG LÀM: `markup` vẫn còn ở `RunDesk`, `PriceBook.desk`, `giay-pack-board`/`token-desk` (phần chênh gói Token dịch, khác với chênh Groq/Alibaba) và nhiều test; chỉ `live-cost.ts` được yêu cầu dọn. 31 cảnh báo eslint (react-refresh, exhaustive-deps, unused) chưa sửa. Mục 6 trở đi của PROJECT_STATUS.md là nhật ký cũ, không viết lại.
VIỆC CHỦ (chưa ai làm được từ đây): đẩy `main` khi sẵn sàng (main đang v5.1.0); tự thử điện thoại (key mọi nhà, giá Token dịch, bảng model live, giọng Orpheus bị khóa); tick lại Orpheus ở Admin rồi Lưu (xem mục c3); điều khoản ~dòng 206 «phần chênh» cần quyết; bật `KEY_LIST_TRUSTED` Alibaba/Deepgram sau khi thử key thật; đường `chunked` thật cho dịch trực tiếp bằng Whisper vẫn CHƯA làm.

## v5.2.3 (17/11/2026, work): c3 XONG — chặn thật giọng đọc Orpheus theo ô tick thuê phòng
THỨ TỰ CÒN LẠI: [XONG] c3 (mục này) → [CHƯA] dọn code: (1) lỗi eslint cũ, (2) xóa pack-picker.tsx, (3) bỏ trường markup ở live-cost.ts, (4) làm mới PROJECT_STATUS.md và AGENTS.project.md. Hai mục «chữ Deepgram» và «thông báo live khi bỏ tick hết model» đã XONG ở v5.2.2 (commit 05382a2), không làm lại.
ĐÃ LÀM c3: `rent-rows.ts` thêm loại tts cho Groq (Orpheus en/ar có ô tick; Aura không có vì chỉ trả bằng Token dịch); `rent-show-rule.ts` thêm `orpheusModelId` + `rentVoiceProblem`; `narration.ts` kiểm danh sách (getRentShow, nhớ 60 giây) trước khi gọi Orpheus khi key khác "room", bị khóa thì rơi sang Edge/trình duyệt và gọi `onBlocked` (studio.tsx hiện toast một lần); chữ ở `rent-show-board.tsx`; test ở rent-show.test.ts, rent-rows.test.ts.
CHƯA LÀM / LƯU Ý: danh sách Chủ lưu từ trước chưa có Orpheus nên khách key riêng bị khóa giọng Orpheus tới khi Chủ tick lại và lưu. Chưa thử trên trình duyệt thật.
CỐ Ý KHÔNG LÀM: không đổi luật chặn nhận dạng/dịch, không đụng Aura, không đổi điều khoản.

## v5.2.2 (17/11/2026, work): chữ Deepgram/Alibaba ở trả theo lượt + thông báo live rỗng — XONG. Đang làm tiếp: c3, rồi dọn code (eslint cũ, pack-picker.tsx, markup ở live-cost.ts, PROJECT_STATUS.md, AGENTS.project.md). Xem các mục mới hơn ở trên nếu có.

## BƯỚC (d) XONG: DỊCH TRỰC TIẾP THEO KHẢ NĂNG (17/11/2026, nhánh work, v5.2.1)
THỨ TỰ: [XONG] 1 key mọi nhà (5.2.0) → [XONG] 2 gỡ chênh (5.2.1) → [XONG] 3 d (mục này) → [CHƯA] c3 (giọng đọc Orpheus/Aura bật tắt thuê phòng, cần chặn thật ở narration.ts) → [CHƯA] đường chạy `chunked` thật cho dịch trực tiếp bằng Whisper.
ĐÃ LÀM: `live-show.ts`, `live-show-room.ts`, `live-show-board.tsx`, chặn ở `live-open.ts`, lọc ở `live-screen.tsx`, test. Chi tiết admin-log 5.2.1.
LƯU Ý: nếu Chủ bỏ tick hết model thì ô Model ở màn live rỗng và bấm bắt đầu báo «Chủ chưa mở model này cho dịch trực tiếp». Chưa có câu thông báo riêng ở màn live.
VIỆC CHỦ: tự thử điện thoại (key mọi nhà, giá Token dịch ở trả theo lượt, bảng model live ở Admin). Điều khoản ~dòng 206 (hoa hồng «phần chênh») cần quyết. Bật khóa key Alibaba/Deepgram (`KEY_LIST_TRUSTED`) sau khi thử key thật.

## v5.2.1: GỠ CHÊNH GROQ/ALIBABA (17/11/2026, nhánh work)
THỨ TỰ: [XONG] bước 1 key mọi nhà (v5.2.0) → [XONG] bước 2 a3-2 (mục này) → [CHƯA] bước 3 d dịch trực tiếp theo khả năng → [CHƯA] c3.
ĐÃ LÀM: markup luôn 0 (parseRunDesk), `legacyMarkupOf` cho ước phiếu cũ, bỏ 2 ô chênh ở Admin, giá model khách theo Token dịch (`formatRoomTokens`). Chi tiết ở admin-log 5.2.1.
CẦN CHỦ QUYẾT: điều khoản `terms-document.tsx` ~dòng 206 (hoa hồng tính trên «phần chênh» lượt key phòng) nay không còn chênh; sửa chữ + nâng TERMS_VERSION? Chưa đụng.
CÒN GHI: `live-cost.ts` vẫn có trường markup (nay 0). `pack-picker.tsx` không dùng ở đâu. Chưa bấm thử điện thoại.

## v5.2.0: KEY KHÁCH HIỆN ĐỦ MỌI NHÀ (17/11/2026, nhánh work)
CHỦ ĐÃ CHỐT 17/11/2026: (1) a3-2 GỠ phần trăm chênh Groq/Alibaba, giá theo Token dịch. (2) d: dịch trực tiếp THEO KHẢ NĂNG từng model. (3) Thuê phòng dùng key khách, hiện TẤT CẢ nhà để nhập. (4) Chủ tự thử trên điện thoại. (5) Sửa luôn hướng dẫn/Chỉ tôi, cách lấy key các nhà để chung mục Groq.
THỨ TỰ LÀM: [XONG] bước 1 key mọi nhà + hướng dẫn (mục này) → [CHƯA] bước 2 a3-2 gỡ chênh → [CHƯA] bước 3 d dịch trực tiếp theo khả năng → [CHƯA] c3.
ĐÃ LÀM bước 1: `studio.tsx` hiện ô key Alibaba/Deepgram mọi lúc ở cửa Thuê phòng; hướng dẫn `key-groq` thành «Lấy key (Groq, Alibaba, Deepgram)» sinh từ PROVIDERS; FAQ, tour, bước Bắt đầu sửa. Nâng 5.2.0, CHANGELOG, admin-log. 799 test pass.
CHƯA LÀM: chưa bấm thử điện thoại. `KEY_LIST_TRUSTED` Alibaba/Deepgram vẫn false (chờ key thật).

## c2b: KHUNG KEY KHÁCH GIAO DANH SÁCH MỞ (17/11/2026, nhánh work, v5.1.3)
ĐÃ LÀM: `key-list.ts`, `key-models.ts` (server fn), `keyModels` ở use-pipeline, trạng thái `noKey` ở ô nhận dạng. tsc sạch, test pass.
CHƯA LÀM: bật khóa cho Alibaba/Deepgram (cần thử key thật, xem mục c2b trong kế hoạch), c3, d, a3-2.
CỐ Ý KHÔNG LÀM: không lưu key khách ở máy chủ, không đổi luật chặn máy chủ, không nâng số phiên bản khách.

## c2a: Ô NHẬN DẠNG SINH TỪ DANH MỤC (17/11/2026, nhánh work, v5.1.3)
ĐÃ LÀM: `src/lib/asr-picker.ts` + test; `studio.tsx` dùng vòng lặp thay `<option>` viết tay. tsc sạch, 795 test pass.
CHƯA LÀM: c2b bật khóa cho Alibaba/Deepgram (chờ kiểm key thật), c3, d, a3-2 (chờ Chủ chốt). Chưa bấm thử trình duyệt.
CỐ Ý KHÔNG LÀM: không nâng số phiên bản khách, không đổi luật chặn, không đổi điều khoản.

## ĐẨY CHÍNH THỨC (17/11/2026 02:51)
ĐÃ LÀM: đẩy work rồi main. Bản khách vẫn v5.0.6. Chủ có bảng giá model.
CHƯA LÀM: chưa mở Giá và hạn mức trên điện thoại sau khi site lên.
CỐ Ý KHÔNG LÀM: không nâng số phiên bản khách, không đổi điều khoản.

## GIÁ MODEL (17/11/2026 02:50, nhánh work, vẫn v5.0.6)
ĐÃ LÀM: Mục Giá và hạn mức liệt kê model Groq và Alibaba. Hiện Token dịch. Ô đô la tự lấy, sửa khi bảng sai, để trống thì dùng số tự lấy. Số sửa được dùng khi tính Token dịch.
CHƯA LÀM: chưa mở trên điện thoại sau khi site lên.
CỐ Ý KHÔNG LÀM: không đặt giá bán riêng, không đổi điều khoản, không nâng số phiên bản khách.

## ĐẨY CHÍNH THỨC v5.0.6 (17/11/2026 02:43)
ĐÃ LÀM: đẩy work rồi main. Bản khách là v5.0.6. Cách trả nằm trong Key Sub.
CHƯA LÀM: chưa bấm Key Sub trên điện thoại sau khi site lên. Bảng giá model chưa làm.
CỐ Ý KHÔNG LÀM: không đổi giá bán, không đổi điều khoản.

## CÁCH TRẢ TRONG KEY SUB (17/11/2026 02:45, nhánh work, v5.0.6)
ĐÃ LÀM: Cách trả và danh sách gói nằm trong Key Sub. Bỏ mục Gói dịch ở Nâng cao. Gói dùng thời lượng tệp, cùng nguồn thẻ Token.
CHƯA LÀM: bảng giá model ở trang quản lý (ô đô la tự lấy, sửa được, quy ra Token dịch). Chưa đẩy.
CỐ Ý KHÔNG LÀM: không đổi giá bán, không đổi điều khoản.

## ĐẨY CHÍNH THỨC v5.0.5 (17/11/2026 02:17)
ĐÃ LÀM: đẩy work rồi main. Bản khách là v5.0.5. Mã QR nổi giữa màn hình.
CHƯA LÀM: chưa bấm mã QR trên điện thoại sau khi site lên.
CỐ Ý KHÔNG LÀM: không đổi giá, không đổi điều khoản.

## MÃ QR GIỮA MÀN (17/11/2026 02:20, nhánh work, v5.0.5)
ĐÃ LÀM: PaySlip nổi giữa màn hình. Cảm ơn khi tiền về, xin lỗi khi đơn đóng. Giữ đến khi bấm Xong hoặc Đóng.
CHƯA LÀM: chưa bấm trên điện thoại. Chưa đẩy.
CỐ Ý KHÔNG LÀM: không đổi giá, không đổi điều khoản.

## ĐẨY CHÍNH THỨC v5.0.4 (17/11/2026 02:05)
ĐÃ LÀM: đẩy work rồi main. Bản khách là v5.0.4.
CHƯA LÀM: chưa bấm chữ tiền trên điện thoại sau khi site lên.
CỐ Ý KHÔNG LÀM: không đổi giá, không đổi điều khoản.

## CHỮ TIỀN (17/11/2026 02:05, nhánh work, v5.0.4)
ĐÃ LÀM: đơn paid ghi đúng Token dịch hoặc thuê phòng. Bỏ ô đặt số dư. Gỡ số dư cũ chỉ đưa balance về 0. Nút từ chối đơn khớp câu báo. Chữ trả theo lượt, hướng dẫn và doanh thu không còn nói ví.
CHƯA LÀM: chưa bấm trên điện thoại sau khi đẩy.
CỐ Ý KHÔNG LÀM: không đổi giá, không đổi điều khoản.

## RESET SẠCH (17/11/2026 01:45, nhánh work, v5.0.3)
ĐÃ LÀM: nút reset xóa Token dịch, chuông, đơn, phiếu, sổ, chi phí, hoa hồng thử, chất lượng, yêu cầu, nhật ký thao tác. Gỡ gói thuê, lượt thử về 1. Giữ tài khoản, cấu hình, key.
CHƯA LÀM: chưa bấm nút trên site thật. Chưa đẩy.
CỐ Ý KHÔNG LÀM: không xóa tài khoản, vai trò, cộng tác viên, thuật ngữ, điều khoản.

## ĐẨY CHÍNH THỨC v5.0.2 (17/11/2026 01:18)
ĐÃ LÀM: đẩy work rồi main. Bản khách là v5.0.2. Mở Tài khoản một lần để đơn TZZEKV85 được bù 10.000 Token dịch.
CHƯA LÀM: chưa bấm lại trên điện thoại sau khi site lên.
CỐ Ý KHÔNG LÀM: không hoàn tiền.

## BÙ TOKEN (17/11/2026 01:10, nhánh work, v5.0.2)
ĐÃ LÀM: đơn mua Token dịch đã trả mà chưa có gói thì được bù khi mở Tài khoản, số dư nhầm bị gỡ. Webhook coi detail có tokens là đơn token. Xác nhận tay viết đúng câu.
CHƯA LÀM: chưa bấm lại đơn TZZEKV85 trên điện thoại sau khi đẩy.
CỐ Ý KHÔNG LÀM: không hoàn tiền. Không đổi giá gói.

# HANDOFF — TyZo_Sub_Project

## THÊM DEEPGRAM (kế hoạch, bắt đầu 17/11/2026 09:44, nhánh work)
YÊU CẦU: thêm nhà cung cấp Deepgram, chức năng giống Groq và Alibaba; nhà mới sau này làm cùng cách (xem `PROVIDERS.md`). Làm từng bước, đẩy `work` sau mỗi bước.
GHI CHÚ API (đã tra tài liệu Deepgram): `POST https://api.deepgram.com/v1/listen?model=nova-3&language=..`, header `Authorization: Token KEY`, thân JSON `{"url":..}` hoặc byte âm thanh. Nova-3 có en, ja, ko, zh. Mặc định `language=en` nên luôn phải gửi language. Deepgram KHÔNG có model dịch, dịch vẫn bằng Groq. Giá Nova-3 trả sau, một nguồn ghi 0,0043 đô/phút, cần kiểm lại ở trang giá chính thức trước khi dùng tính tiền.
BƯỚC:
1. [XONG] Bảng chung nhà cung cấp (`provider.ts`), `listModelIds` đọc đúng dạng Deepgram.
2. [XONG] Lõi nhận dạng Deepgram (`src/lib/sub/deepgram.ts`) (dựng yêu cầu, đọc `utterances` ra Seg, bảng ngôn ngữ) + test.
3. [XONG] Máy chủ nhận dạng Deepgram bằng link (`deepgram-asr.server.ts`, `deepgram-asr.ts`, `sub/deepgram-run.ts`), key khách. Gửi file từ máy chưa làm (xem GHI CHÚ).
4. [XONG] Model `deepgram-nova-3` vào `ASR_MODELS`, `asrHouse` (bảng HOUSES, thêm `asrTakesLink`), kiểu `AsrModel`, giá dự phòng, gói trả theo lượt báo chưa chạy Deepgram. Chưa hiện ở ô chọn trên giao diện (bước 5).
5. [XONG] Giao diện khách: ô key Deepgram (lưu trên máy, khóa kho `gdg`), chọn "Deepgram Nova-3", nhánh `start()` và nhánh chạy trong `use-pipeline.ts`. Danh sách thuê phòng (`RentShow`) nay theo `PROVIDER_IDS` nên có cột Deepgram ở Admin. Máy chủ chặn trả theo lượt Deepgram (`run-turn.ts`). Deepgram cần CẢ key Deepgram và key Groq (dịch vẫn Groq). CHƯA bấm thử trên trình duyệt thật.
6. [XONG] Admin: 
   6a. [XONG 17/11/2026] Ô key phòng Deepgram: `src/lib/provider-room.ts` (server fn chung `getProviderKey`/`saveProviderKey`, theo `PROVIDERS[id].settings`), `src/components/provider-key-board.tsx` (`<ProviderKeyBoard provider="deepgram" />`, đặt trong tab Cấu hình ở `admin-desk.tsx`), nhãn nhật ký `key-deepgram`. Nhà mới chỉ thêm một dòng `<ProviderKeyBoard provider="..." />`. CHƯA thử lưu key thật.
   6b. [XONG 17/11/2026] Bảng giá Deepgram trong mục Giá và hạn mức của Chủ: `src/lib/sub/deepgram-catalog.ts` (giá dự phòng `deepgram-nova-3` 0,258 đô/giờ = 0,0043 đô/phút, một ngôn ngữ, file ghi sẵn) + dòng "Deepgram" trong `usd-fix-room.ts`. Chủ sửa số đô la tay được như Groq/Alibaba. Test `deepgram-catalog.test.ts`. Giá chỉ từ trang tổng hợp bên thứ ba, CHƯA đối chiếu deepgram.com/pricing (trang không mở được từ đây). Chưa có bộ kéo giá tự động như Alibaba; Deepgram chưa trừ tiền phòng nên giá này chỉ để Chủ xem và tính.
   6c. [XONG 17/11/2026] Gói dịch chọn được Deepgram làm nhà NHẬN DẠNG: `providersForRole(role)` trong `service-pack.ts` (nhận dạng = mọi nhà có khả năng asr trong PROVIDERS, việc khác vẫn Groq và Alibaba), `service-pack-board.tsx` và `pack-picker.tsx` dùng danh sách đó và có bảng giá Deepgram (`DEEPGRAM_ROWS`). Lưu gói bị chặn khi: Deepgram ở việc ngoài nhận dạng, hoặc gói Deepgram mở cửa Trả theo lượt (chỉ mở cửa Thuê phòng, vì cửa trả theo lượt chưa chạy Deepgram). Test thêm ở `service-pack.test.ts` (file này trước đó KHÔNG nằm trong `npm test`, nay đã thêm). CHƯA bấm thử trên trình duyệt thật. Phần chênh phần trăm riêng cho Deepgram chưa có (đang 0).
7. [XONG TRỪ PHẦN GHI Ở 7d] Đọc thành tiếng Deepgram Aura-2, TRẢ BẰNG TOKEN DỊCH giống Orpheus (chủ yêu cầu 17/11/2026). Cách chạy giống Orpheus: key phòng (`deepgram_key`) đi qua máy chủ, trừ Token dịch theo số ký tự bằng `chargeWith` đường `/audio/speech` ở `run-gate.ts` (giá gốc, quy ra Token dịch theo giá Turbo, đoạn Deepgram lỗi thì không mất tiền).
   7a. [XONG] Lõi thuần `src/lib/sub/aura.ts` (+ test): `auraReady(target)` (chỉ English và Spanish), giọng `AURA_VOICES`, `auraModel`, `auraSpeakUrl` (`/v1/speak?model=aura-2-<giọng>-<ngôn ngữ>&encoding=mp3`), `auraPieces` (cắt câu, trần 2000 ký tự), `auraErrorText`. Dòng giá `aura-2` 30 đô/triệu ký tự (0,030 đô/1.000 ký tự, đọc từ deepgram.com/text-to-speech-api; Aura-1 nửa giá) trong `deepgram-catalog.ts`, có `deepgramRowFor(model)`. Dòng này hiện trong bảng giá của Chủ, sửa tay được (khóa `aura-2` trong usd_fix). KHÔNG hỗ trợ tiếng Việt (Deepgram chưa đọc tiếng Việt), nên giọng này chỉ dùng khi tiếng đích là Anh hoặc Tây Ban Nha. Danh sách giọng cần đối chiếu với `/v1/models` của key trước khi thêm tiếng khác (Aura-2 còn đọc Hà Lan, Pháp, Đức, Ý, Nhật nhưng chưa đưa tên giọng vào).
   7b. [XONG] Máy chủ `src/routes/api/room-deepgram.ts`: nhận `{model, input}` với header `x-deepgram-path: /audio/speech`, đăng nhập, giới hạn tần suất, chặn khi bảo trì, kiểm tra model có trong `deepgram_models`, tính tiền bằng `chargeWith`, trả mp3. Đã sinh lại `routeTree.gen.ts` (chạy `npx vite build`).
   7c. [XONG 17/11/2026] Giao diện khách + nhánh phát: `engine: "aura"` và `auraVoice` trong `NarrationSettings` (`sub/types.ts`), `sub/aura-speak.ts` (client gọi `/api/room-deepgram`), nhánh Aura trong `narration.ts` (trước nhánh Orpheus, lỗi thì rơi về giọng máy như Orpheus), nút "Aura" và ô "Giọng Aura" ở `studio.tsx`, báo khi tiếng đích chưa được Aura đọc. Aura LUÔN trừ Token dịch (không có đường key riêng của khách), không cần bật "key phòng". CHƯA bấm thử trên trình duyệt thật; chưa kiểm khi hết Token dịch (máy chủ trả 402 rồi app rơi về giọng máy, im lặng, giống Orpheus).
   7d. [MỘT PHẦN] Đã sửa câu nhắc ở `turn-pack-list.tsx` ("Orpheus và Aura, nếu bật, trừ Token dịch"). CHƯA làm: cho việc "Thuyết minh" trong gói dịch chọn Deepgram (`providersForRole("narration")` đang chỉ Groq và Alibaba; cần thêm khi muốn báo giá Aura trong gói), điều khoản, Hướng dẫn (gộp vào bước 8).
   Lỗi eslint cũ ở `studio.tsx` (dòng ~2226, 2436, 2506) không phải do Deepgram.
8. [XONG 17/11/2026 10:50, v5.1.0 trên work] Chữ: điều khoản `2026-11-17.2` (Deepgram là nhà nhận dữ liệu, link file và chữ đọc Aura gửi Deepgram, key Deepgram lưu trên máy khách, Aura trừ Token dịch; dấu vân tay thêm ở `entry-gate.test.ts`), Hướng dẫn (`guide-topics.ts`: Aura trừ Token dịch, chỉ Anh và Tây Ban Nha), CHANGELOG khách 5.1.0 (`app-version.ts`), nhật ký nội bộ (`admin-log.server.ts`), `PROJECT_STATUS.md`. Khách phải đồng ý lại điều khoản khi vào. ĐÃ ĐẨY `work` rồi `main` (17/11/2026, theo yêu cầu chủ). Bản khách là v5.1.0.
VIỆC CÒN LẠI SAU DEEPGRAM (cần chủ quyết hoặc kiểm tay): (a) bấm thử thật trên trình duyệt/điện thoại: lưu key Deepgram ở Admin, nhận dạng Nova-3 bằng link, giọng Aura (cả lúc hết Token dịch); (b) đối chiếu giá Nova-3 (0,0043 đô/phút) và Aura-2 (0,030 đô/1.000 ký tự) ở deepgram.com/pricing; (c) xác nhận vùng xử lý của Deepgram để ghi vào điều khoản (hiện ghi "công ty Hoa Kỳ", không nói vùng máy chủ); (d) kiểm hạn chạy hàm Vercel với phim dài (Deepgram chờ tối đa 110 giây); (e) gửi file từ máy lên Deepgram (hiện chỉ link công khai); (f) cho việc Thuyết minh trong gói dịch chọn Deepgram; (g) cửa trả theo lượt nhận dạng bằng key phòng Deepgram (chưa được yêu cầu); (h) [XONG] đã đẩy `main`.
CỐ Ý KHÔNG LÀM: trả theo lượt bằng key phòng cho Deepgram (chưa được yêu cầu); không đổi giá bán; chưa đổi điều khoản ở bước 1.
GHI CHÚ BƯỚC 3: Deepgram trả kết quả ngay trong một yêu cầu (chờ tối đa 110 giây). Chưa kiểm hạn chạy hàm trên Vercel với phim dài, cần thử thật. Chỉ nhận link công khai, giống Alibaba. Gửi file từ máy lên Deepgram chưa làm.
GHI CHÚ BƯỚC 5: đường Alibaba có sẵn không đòi key Groq trước khi chạy (chỉ nhắc khi dịch). Chưa sửa vì ngoài yêu cầu, cần kiểm. `npx eslint` báo 2 lỗi cũ ở `cast-voice.ts`, `mp4.ts` và 1 cảnh báo ở `gap-scan.test.ts`, không phải do Deepgram.
KHÔNG GHI KEY/TOKEN GITHUB VÀO FILE NÀO.


## ĐIỀU KHOẢN (17/11/2026 00:35, nhánh work, v5.0.1)
ĐÃ LÀM: một trang điều khoản và chính sách khớp web. Thêm bản quyền và khiếu nại qua hỗ trợ, Token dịch là đơn vị dùng dịch vụ không phải tiền, dữ liệu gửi Groq (Hoa Kỳ) và Alibaba (Singapore), video xử lý trên máy khách. Điều khoản `2026-11-17.1`.
CHƯA LÀM: chưa bấm cửa đồng ý trên điện thoại. Chưa có tên doanh nghiệp để ghi.
CỐ Ý KHÔNG LÀM: không tách trang chính sách riêng. Không bịa tên công ty, địa chỉ, mã số thuế. Không thêm giao diện khiếu nại mới.

## MUA THẲNG BẰNG QR (16/11/2026 23:55, nhánh work, v5.0.0)
ĐÃ LÀM: bỏ nạp số dư. Mua Token dịch và thuê phòng tạo mã QR đúng giá. Tiền về thì giao gói hoặc mở hạn, không cộng số dư. Số dư test và đơn nạp đang chờ được đưa về 0 / hủy, không hoàn. Orpheus khi dùng key phòng trừ Token dịch theo giá gốc. Neural không trừ. Điều khoản `2026-11-16.4`. Trang giá chỉ xem giá.
CHƯA LÀM: chưa bấm QR, thuê phòng và Orpheus trên điện thoại hay trình duyệt thật.
CỐ Ý KHÔNG LÀM: không đổi giá thuê phòng tay. Không xóa file màn nạp cũ (không còn gắn vào trang). Không đổi tên biến nội bộ `giay`. Không cộng hoa hồng khi mua Token dịch.

## GÓI GIÂY 9 (16/11/2026 22:55, nhánh work, v4.1.1)
ĐÃ LÀM: hướng dẫn, tuyến Chỉ tôi và câu chọn Trả theo lượt khớp gói giây. Kệ gói ghi cả dịch trực tiếp. Điều khoản `2026-11-16.3` (tóm tắt và bảng giá). Không đổi cách tính.
CHƯA LÀM: chưa bấm trên điện thoại thật.
CỐ Ý KHÔNG LÀM: không sửa `pack-picker.tsx` vì không chỗ nào gọi. Không đổi giá thuê phòng.

## GÓI GIÂY 5–8 (16/11/2026 22:12, nhánh work, v4.1.0)
ĐÃ LÀM: dịch trực tiếp tự tính và trừ gói giây, không giữ ví. Thuê phòng giữ 9.000 / 39.000 / 99.000. Bỏ ô giá riêng từng model. Alibaba kéo giá Singapore, chưa kéo được thì dùng giá dự phòng. Điều khoản `2026-11-16.2`.
CHƯA LÀM: chưa bấm dịch trực tiếp trên điện thoại thật.
CỐ Ý KHÔNG LÀM: không đổi giá thuê phòng; thuyết minh vẫn trừ ví đồng.

## GÓI GIÂY 1–4 (16/11/2026 21:50, nhánh work, v4.0.0)
ĐÃ LÀM: công thức giây theo Turbo giá gốc; gói có hạn, giá tự tính (chênh × đệm); mua bằng số dư đồng; lần chạy trừ giây. Ví đồng không quy đổi. Điều khoản `2026-11-16.1`.
CHƯA LÀM lúc 21:50: bước 5 đến 8. Đã làm ở v4.1.0.
CỐ Ý KHÔNG LÀM: không hoàn tiền khi gói hết hạn; không cộng hoa hồng lúc mua gói; hạn mức đồng trong ngày không áp vào phiếu giây.

## CHỖ ĐỂ RIÊNG 8/8 (16/11/2026, nhánh work, v3.47.13)
ĐÃ LÀM: viền huy hiệu vai trò, bóng chữ bảo trì, bóng huy hiệu và màn hướng dẫn theo token. Mức 1 không đổi hình.
TÁM PHẦN YÊU CẦU ĐÃ XONG.
CÒN CỐ Ý: màu phụ đề khách chọn, nút tròn, favicon, 5 màu dự phòng tia lửa.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## XEM TRƯỚC CẢ TRANG 7/8 (16/11/2026, nhánh work, v3.47.12)
ĐÃ LÀM: tab Giao diện phủ bản nháp lên trang ngay. Nút Hoàn tác tối đa 30 bước. Khách vẫn cần Công bố.
CÒN 1 PHẦN: chỗ cố ý để riêng. Favicon chưa làm.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## ICON NHÓM 6/8 (16/11/2026, nhánh work, v3.47.11)
ĐÃ LÀM: bốn nhóm biểu tượng và nét riêng từng nhóm. Mặc định theo nét chung.
CÒN 2 PHẦN: xem trước cả web, chỗ cố ý để riêng. Favicon chưa làm.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## TÁCH TAB 5/8 (16/11/2026, nhánh work, v3.47.10)
ĐÃ LÀM: mục Giao diện chia sáu phần. Xem trước và nút lưu vẫn ở ngoài. Không thêm trường.
CÒN 3 PHẦN: icon theo nhóm, xem trước cả web, chỗ cố ý để riêng. Favicon chưa làm.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## BẢO TRÌ 4/8 (16/11/2026, nhánh work, v3.47.9)
ĐÃ LÀM: chữ biển, màu biển, hiệu ứng mạnh, robot hoặc chỉ biển. Mặc định giữ cảnh cũ.
CÒN 4 PHẦN: tách tab, icon theo nhóm, xem trước cả web, chỗ cố ý để riêng. Favicon chưa làm.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## CHUYỂN ĐỘNG 3/8 (16/11/2026, nhánh work, v3.47.8)
ĐÃ LÀM: bật hoặc tắt hiệu ứng, tốc độ chậm/vừa/nhanh. Mặc định bật và vừa. Máy giảm chuyển động thì luôn tắt.
CÒN 5 PHẦN: trang bảo trì, tách tab, icon theo nhóm, xem trước cả web, chỗ cố ý để riêng.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## BỐ CỤC 2/8 (16/11/2026, nhánh work, v3.47.7)
ĐÃ LÀM: độ rộng các trang rộng và menu trái hoặc phải. Mặc định 120 rem, menu trái.
CÒN 6 PHẦN: chuyển động, trang bảo trì, tách tab, icon theo nhóm, xem trước cả web, chỗ cố ý để riêng.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## CHỮ 1/8 (16/11/2026, nhánh work, v3.47.6)
ĐÃ LÀM: phông tiêu đề, độ đậm tiêu đề, giãn dòng. Mặc định trùng hình cũ. Cỡ chữ chung nay có tác dụng.
CÒN 7 PHẦN: bố cục, chuyển động, trang bảo trì, tách tab, icon theo nhóm, xem trước cả web, chỗ cố ý để riêng.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## NÚT VÀ BỘ MÀU (16/11/2026, nhánh work, v3.47.5)
ĐÃ LÀM: kiểu nút Đặc / Viền / Mờ cho nút đang tô màu nhấn. Tám bộ màu, bộ Vàng là màu cũ.
CHƯA LÀM: viền huy hiệu, bóng chữ, màn tối hướng dẫn, phông tiêu đề riêng, chuyển động.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## VIỀN 1 (16/11/2026, nhánh work, v3.47.4)
ĐÃ LÀM: thanh «Độ dày viền» 1, 2 hoặc 3 px cho thẻ, nút và ô nhập. Mức 1 giống trước.
CHƯA LÀM: kiểu nút (đặc/viền/mờ), bộ màu có sẵn. Viền huy hiệu và viền 2 px giữ nguyên.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## ICON 7 (16/11/2026, nhánh work, v3.47.3)
ĐÃ LÀM: cỡ icon nhỏ/vừa/lớn và màu theo chữ hoặc màu nhấn. Mức vừa và theo chữ giữ hình cũ.
CHƯA LÀM: viền huy hiệu, bóng chữ, màn tối hướng dẫn, độ dày viền, kiểu nút, bộ màu có sẵn.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## ICON 6 (16/11/2026, nhánh work, v3.47.2)
ĐÃ LÀM: trong mục Icon có ô tìm chức năng, bấm tên để xem lưới hình, nút «Đặt lại icon này».
CHƯA LÀM: cỡ icon, màu icon. Viền huy hiệu, bóng chữ, màn tối hướng dẫn.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## ĐỔ BÓNG 2 (16/11/2026, nhánh work, v3.47.1)
ĐÃ LÀM: quầng sáng màu và khung tóm tắt phiên bản theo thanh «Độ đậm bóng». Mức 1 giống trước.
CHƯA LÀM: viền huy hiệu, vòng focus, bóng chữ, màn tối của hướng dẫn.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## ĐỔ BÓNG 1 (16/11/2026, nhánh work, v3.47.0)
ĐÃ LÀM: thanh «Độ đậm bóng» trong giao diện. Hộp thoại, menu và banner nổi theo mức đó. Mức 1 giống trước.
CHƯA LÀM: bóng phát sáng, viền huy hiệu, bóng chữ, màn tối của hướng dẫn.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## ICON 5 (16/11/2026, nhánh work, v3.46.18)
ĐÃ LÀM: hết icon cứng ở 9 file còn lại. Thêm chỗ video, âm thanh, đang chạy, bảo trì, micro, tab, loa, tắt tiếng, dán, tùy chọn, mở thêm, bỏ qua, trợ giúp, xoay, gọn, thoải mái.
CÒN: đổ bóng 38. Màu phụ đề khách chọn và 5 màu dự phòng tia lửa.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## ICON 4 (16/11/2026, nhánh work, v3.46.17)
ĐÃ LÀM: ô chọn tệp và ô dán link ở trang chủ và ô thả dùng chỗ Tải lên và Dán link. Nút khóa của tôi dùng chỗ Khóa API.
CÒN: 9 file lucide (video, âm thanh, vòng xoay, phòng chiếu, bảo trì, sáng/tối). Đổ bóng chưa đụng.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## ICON 3 (16/11/2026, nhánh work, v3.46.16)
ĐÃ LÀM: nút sao chép và đã chép, nút lưu câu, nút hủy, icon trang lỗi theo chỗ Sao chép, Thành công, Đóng và Lỗi.
CÒN: 9 file vẫn gắn icon cứng. Đổ bóng chưa đụng.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## ICON 2 (16/11/2026, nhánh work, v3.46.15)
ĐÃ LÀM: icon ví ở trang chủ, thẻ tiền và dịch trực tiếp theo chỗ Ví.
CÒN: 12 file vẫn gắn icon cứng. Đổ bóng chưa đụng.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## ICON 1 (16/11/2026, nhánh work, v3.46.14)
ĐÃ LÀM: nút xem/ẩn khóa (phòng chiếu, gói, key Alibaba, bàn chạy) theo chỗ Xem và Ẩn trong giao diện.
CÒN: 13 file vẫn gắn icon cứng. Đổ bóng chưa đụng.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## BO GÓC 3 (16/11/2026, nhánh work, v3.46.13)
ĐÃ LÀM: ô nhập, ảnh nhỏ, cột biểu đồ theo mức ô nhập. Ô thả video theo mức thẻ. Các chỗ này tròn hơn một chút so với trước.
CỐ Ý GIỮ: nút tròn, chấm, video toàn màn vuông, góc viên thuốc. Đổ bóng chưa đụng. Kế: icon.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## BO GÓC 2 (16/11/2026, nhánh work, v3.46.12)
ĐÃ LÀM: khung thẻ 1rem và mục menu 0.75rem trong styles.css theo thanh bo góc. Nhìn mặc định không đổi.
CÒN: nút tròn, rounded-md/lg/3xl, góc 999px và 50%, đổ bóng 38. Rồi icon.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## BO GÓC 1 (16/11/2026, nhánh work, v3.46.11)
ĐÃ LÀM: góc cỡ thẻ (1rem) và cỡ ô nhập (0.75rem) theo thanh bo góc. Nhìn mặc định không đổi.
CÒN: nút tròn (176), góc md/lg/3xl (10), đổ bóng 38. Rồi icon.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## ĐỒNG BỘ MÀU 4/4 (16/11/2026, nhánh work, v3.46.10)
ĐÃ LÀM: thư chưa lưu màu riêng lấy nền, mực và nút từ giao diện sáng. Cửa sổ đăng nhập chớp qua lấy nền và chữ phụ từ giao diện tối. Màu thư đã lưu giữ nguyên.
PHẦN NÀY XONG. Còn màu phụ đề (khách chọn) và 5 màu dự phòng của tia lửa. Kế theo thứ tự ít bước: bo góc.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## ĐỒNG BỘ MÀU 3/4 (16/11/2026, nhánh work, v3.46.9)
ĐÃ LÀM: nền trang bảo trì, lời nhắn, nút cuối trang và bóng chữ nhấp theo màu nền, chữ, thông tin và lỗi. styles.css không còn mã hex ngoài mặc định.
CÒN TRONG PHẦN NÀY: thư HTML và cửa sổ đăng nhập.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## ĐỒNG BỘ MÀU 2/4 (16/11/2026, nhánh work, v3.46.8)
ĐÃ LÀM: robot hết mã màu cứng. Thân theo chữ và viền, mắt theo màu thông tin, biển và đèn mũ theo màu lỗi.
CÒN TRONG PHẦN NÀY: nền đêm và nhấp nháy chữ, thư HTML và cửa sổ đăng nhập.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## ĐỒNG BỘ MÀU 1/4 (16/11/2026, nhánh work, v3.46.7)
ĐÃ LÀM: nền logo theo màu thẻ, vạch mật khẩu chưa bật theo màu viền, huy hiệu hỗ trợ / quản lý / chủ theo màu cấp.
CÒN TRONG PHẦN NÀY: robot (kim loại, mắt, biển đỏ), nền đêm và nhấp nháy, thư HTML và cửa sổ đăng nhập.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## PHẦN CHỮ (16/11/2026, nhánh work, v3.46.6)
ĐÃ LÀM: trang lỗi hiện «Đã xảy ra lỗi» và «Không rõ lỗi gì. Hãy tải lại trang.»
CHƯA LÀM: câu tiếng Anh trong lib/app-data/errors.ts và nút Continue with ở gates.tsx (không gắn trang đang chạy). Rồi tới phần đồng bộ màu (4 bước).
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## HẾT MÀU TAILWIND BẢNG (16/11/2026, nhánh work, v3.46.5)
ĐÃ LÀM: nhãn đơn nạp, nút hủy đơn, trang lỗi và nút đăng nhập ngoài dùng màu thành công, chờ, lỗi, nền, chữ, viền. Không còn lớp red/emerald/amber/zinc/neutral.
CHƯA LÀM: dịch câu tiếng Anh trên trang lỗi. Robot, nền đêm, màu phụ đề, thư HTML, icon Lucide, bo góc.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## MÀU TRẠNG THÁI (16/11/2026, nhánh work, v3.46.4)
ĐÃ LÀM: đèn tốt / cần chú ý / kém, thanh độ tin, đường thu và chi, chấm phiếu và chấm cảnh báo lấy màu thành công, chờ, lỗi, chữ phụ, đường viền. Chữ trên đèn dùng màu nền trang để đọc được cả sáng lẫn tối.
CHƯA LÀM: robot (kim loại, mắt, biển đỏ), nền đêm, màu phụ đề, thư HTML, icon Lucide, bo góc.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## MÀU BẢO TRÌ THEO GIAO DIỆN (16/11/2026, nhánh work, v3.46.3)
ĐÃ LÀM: dải, lưới, đèn, tiêu đề, vòng sáng, thanh chạy và tia lửa dùng màu chờ. Áo, sọc, viền biển dùng màu chờ. Mũ dùng màu nhấn. Tên thương hiệu vốn đã đọc từ giao diện.
CHƯA LÀM: nền đêm cố định, kim loại và mắt robot, biển đỏ, hiệu ứng nhấp nháy chữ, màu phụ đề, icon Lucide, bo góc.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## MÀU CHROME THEO TOKEN (16/11/2026, nhánh work, v3.46.2)
ĐÃ LÀM: chỉ `styles.css`. Toast nền thẻ / chữ chính; thông báo lỗi trộn màu lỗi. Dải mất mạng nền lỗi, chữ màu nền trang. Chấm cửa màu thành công / lỗi. Ô thuê dùng màu cộng tác viên. Ô khóa dùng màu chờ. Chữ trên nhãn cấp dùng màu mực. Nút đăng xuất dùng màu lỗi.
CHƯA LÀM: robot và khối `.mt-*`, màu phụ đề, icon Lucide, bo góc, vé cấp, logo plate.
KHÔNG ĐỔI: giá, quyền, điều khoản (`2026-11-15.1`).

## QUÉT THEME BƯỚC 1 (16/11/2026, nhánh work, vẫn v3.46.1)
ĐÃ LÀM: chỉ tài liệu. Quét `src/`: 160 mã hex ngoài `theme.ts`, 32 lớp màu Tailwind bảng, 483 dòng `rounded-*` (58 file), 64 icon Lucide ở 16 file. `ICON_SLOTS` mới chỉ có ở bảng theme và `primitives.tsx`. Chi tiết ở `PROJECT_STATUS.md` mục «Còn mở».
KIỂM: `npx tsc --noEmit` thoát 0. `npm test` 672 pass, 0 fail.
CHƯA LÀM: chuyển màu / icon / bo góc sang token. Không đụng `main`.
KHÔNG ĐỔI: giá, quyền, điều khoản, số phiên bản.

## ĐỒNG BỘ Ô THÔNG BÁO MẶC ĐỊNH VỚI WEB (15/11/2026, nhánh work, v3.45.1)
QUY ƯỚC CỐ ĐỊNH (người dùng đặt «từ đây về sau»): không dùng alert, confirm, prompt mặc định của trình duyệt. Hỏi lại thì `askConfirm({ title, text, confirmLabel, danger })` (lib/confirm.ts; `ConfirmHost` ở components/confirm-dialog.tsx, gắn ở __root.tsx); báo tin thì `pushToast`. `lib/no-native-dialog.test.ts` quét src và fail nếu còn vi phạm.
ĐÃ LÀM: thay 7 chỗ `confirm` (bảng trạng thái dịch vụ, ẩn mọi thuật ngữ, xóa từ, xóa khoản chi phí, đăng xuất, xóa phụ đề làm lại, gửi khoảng trống). Hộp có Esc, bấm ra ngoài, Tab quay vòng, trả tiêu điểm, hàng đợi; việc nguy hiểm: nút đỏ, tiêu điểm ở Hủy. `Button` nhận prop `ref`.
KIỂM: Chrome thật cho hộp bảo trì (Esc, Hủy, ra ngoài, Tab, nút chính), đăng xuất, ẩn thuật ngữ: 0 hộp mặc định bật lên. CHƯA bấm tới được bằng dữ liệu thật: xóa từ, xóa khoản chi phí, xóa phụ đề làm lại, gửi khoảng trống (cùng cách gọi, tsc sạch).
KHÔNG ĐỔI: giá, quyền, luật ví, điều khoản.

## BẢO TRÌ CẢ WEB, ADMIN VẪN VÀO ĐƯỢC (15/11/2026, nhánh work, v3.45.0)
ĐÃ LÀM: mục thứ ba `site` («Toàn web») trong cùng dòng `room_settings.service_status`, đặt ở Admin → Cấu hình (thẻ trên cùng, có hộp xác nhận riêng) và hiện ở dải Tổng quan. Bật thì khách thấy trang bảo trì (lời nhắn, giờ dự kiến theo giờ Việt Nam) ở mọi trang trừ `/admin` và `/login` (luật ở `siteOpenPath`, có test). Máy chủ chặn lượt MỚI của cả hai nhóm (`serviceBlock` cho site thắng nhóm).
CÁCH HOẠT ĐỘNG: root loader đọc trạng thái, nên HTML dựng sẵn đã là trang bảo trì (không nháy). `SiteGate` (site-maintenance.tsx) hỏi lại mỗi phút. Lượt dịch chạy ở trình duyệt khách, nên trang đã vào lúc web còn mở KHÔNG bị gỡ giữa chừng (sẽ cắt lượt đang chạy): chỉ hiện dải báo, trang bảo trì thay vào khi khách tải lại hoặc sang trang khác. Mở lại thì gỡ ngay.
KIỂM: tsc, test (service-status 35 bài), build; Chrome thật: Admin bật và lưu, khách 390 px thấy trang bảo trì ở /, /dich-truc-tiep, /goi, /tai-khoan, /huong-dan; /login và /admin mở; bấm «Dành cho quản trị viên» vào được Admin; ba cổng máy chủ chặn; khách đang ở trang dịch không bị gỡ; mở lại thì về bình thường.
LƯU Ý: bản lưu cũ thiếu `site` đọc là Hoạt động. `cleanServiceStatus` đòi đủ ba mục, màn hình cũ (chưa có Toàn web) lưu sẽ bị từ chối chứ không lỡ mở lại cả web. Chủ cũng không chạy thử dịch được khi cả web bảo trì (cổng máy chủ chặn mọi người); muốn thử thì bật Bảo trì riêng một nhóm thay vì cả web.
CHƯA KIỂM: Safari, điện thoại thật, Vercel, đăng nhập OAuth thật (sau đăng nhập Google khách về «/», Chủ phải bấm «Dành cho quản trị viên» hoặc vào /admin).
CHƯA LÀM: tự mở lại theo giờ hẹn (giờ chỉ để báo khách), chặn `/api/relay-alibaba` (như v3.44), đổi Điều khoản (không có câu nào về bảo trì nên không cần).

## KIỂM LẠI HAI NHÓM DỊCH (15/11/2026, nhánh work, v3.44.1)
ĐÃ LÀM: chạy thật v3.44.0 bằng Chrome + Playwright (dev, đăng nhập tắt, quyền Chủ cấp cho `dev-user` bằng route tạm đã xóa, không vào kho). Admin → Cấu hình: bấm Bảo trì, hộp xác nhận hiện, lưu được. Khách (390 px): thanh chọn hai nhóm có chấm trạng thái, khung báo có lời nhắn và giờ dự kiến theo giờ Việt Nam, nút bắt đầu khóa («Đang bảo trì»), nhóm kia vẫn mở, mở lại thì khung biến mất. Máy chủ: `openLiveTicket` chặn khi live bảo trì; `openRunTicket` và `spendTrial` chặn khi normal bảo trì, trả đúng lời nhắn của Chủ; nhóm còn lại qua cổng. `room-groq` và `room-alibaba` đòi phiếu `x-run-ticket`, phiếu chỉ mở được qua `openRunTicket`, nên đường trả theo lượt đã kín.
SỬA: dòng trạng thái đầu trang vẫn ghi «Sẵn sàng. Chọn video rồi bấm Tải và dịch.» khi Dịch bình thường bảo trì, mâu thuẫn với nút đã khóa. `use-pipeline.ts` xuất `READY_STATUS`; `studio.tsx` đổi chữ hiển thị khi đang bảo trì, chưa chạy và status còn là READY_STATUS (lỗi và kết quả thật giữ nguyên).
CHƯA KIỂM: Safari, điện thoại thật, Vercel; bắt đầu một lượt thật bằng key riêng khi bảo trì (chỉ kiểm nút bị khóa và hàm máy chủ); đăng nhập OAuth thật.
CHƯA LÀM (như bản 3.44.0): bảo trì cả web có hẹn giờ (đụng điều khoản), tự mở lại theo giờ hẹn, cầu nối live tự cắt phiên, chặn `/api/relay-alibaba`. Relay chỉ chuyển key của khách, không có phiếu nên không phân biệt lượt mới với lượt đang chạy; chặn sẽ cắt lượt dở, trái lời hứa «lượt đang chạy chạy nốt».
KHÔNG ĐỔI: giá, hạn mức, luật ví, quyền, điều khoản (`2026-11-15.1`).

## HAI NHÓM DỊCH CÓ TRẠNG THÁI (15/11/2026, nhánh work, v3.44.0)
ĐÃ LÀM: Dịch trực tiếp và Dịch bình thường tách nhóm, mỗi nhóm Hoạt động/Bảo trì, Chủ đặt ở Admin → Cấu hình (lời nhắn tối đa 200 ký tự, giờ dự kiến mở lại chỉ để báo). Máy chủ chặn lượt MỚI ở `openLiveTicket`, `openRunTicket`, `spendTrial`, `runAliFiletrans` (submit); lượt đang chạy chạy nốt. Key riêng chỉ chặn ở giao diện (`use-pipeline.ts` start). Giao diện: `service-notice.tsx`, nhãn menu, bảng `service-status-board.tsx`, dải ở Tổng quan.
KIỂM TRA: `tsc` sạch; `npm test` 656 pass (cộng test mới), `vite build` qua; lint chỉ còn 3 lỗi có sẵn ở studio.tsx.
CHƯA KIỂM: mở bằng trình duyệt thật (có /usr/bin/google-chrome và playwright, chưa chạy): trang chủ, /dich-truc-tiep, tab Cấu hình bằng tài khoản Chủ, điện thoại 390 px, bật/tắt bảo trì rồi thử bắt đầu.
CHƯA LÀM: bảo trì cả web có hẹn giờ (đụng điều khoản), tự mở lại theo giờ hẹn, cầu nối live tự cắt phiên khi bảo trì (hiện để phiên chạy nốt), chặn `/api/relay-alibaba` khi bảo trì.
KHÔNG ĐỔI: giá, hạn mức, luật ví, quyền, điều khoản (`2026-11-15.1`).

## BƯỚC 1 TRONG DANH SÁCH 15/11/2026 (nhánh work, v3.43.2)
ĐÃ LÀM: khung thông báo không tràn mép trên màn hẹp; cửa vào phòng bắt buộc có tài khoản (máy đã đồng ý điều khoản mà chưa đăng nhập thì sang /login), hết phiên giữa chừng thì về /login.
KIỂM TRA: `npx tsc --noEmit` sạch; `npm test` 626 pass, 0 fail.
CHƯA KIỂM: mở bằng trình duyệt thật (điện thoại 360 px, hết phiên giữa chừng).
CHƯA LÀM (các bước sau của danh sách): chia Dịch trực tiếp / Dịch bình thường có trạng thái, bảo trì cả web có hẹn giờ, giao diện nhiều tùy chỉnh và icon, kho dự án dùng chung, admin quản lý dự án.
KHÔNG ĐỔI: giá, hạn mức, luật ví, quyền, điều khoản (`2026-11-15.1`).

## TÊN TỆP TRONG PHIẾU (15/11/2026, nhánh work, v3.43.0)
ĐÃ LÀM: máy chủ che tên tệp trước khi gửi (`ticketOf` trong `admin-room.ts`, `searchTicketsWith` trong `overview-data.ts`); tìm theo tên tệp chỉ Chủ; `revealTicketFileName` (`overview-room.ts`) chỉ Chủ, ghi nhật ký «xem-ten-tep» mỗi lần xem (dòng nhật ký không chứa tên tệp); nút «Hiện tên đầy đủ» / «Ẩn tên» ở Phiếu (`run-desk-board.tsx`), chỉ Chủ thấy. Điều khoản mục 4 thêm đoạn nói rõ; `TERMS_VERSION` 2026-11-15.1, mọi người bị hỏi lại (cố ý, vì đổi cách xử lý dữ liệu). Phiếu cũ vẫn xem được vì tên đầy đủ đã lưu từ trước.
KIỂM TRA: `npx tsc --noEmit` sạch; `npm test` 621 pass, 0 fail (có test che tên và tìm theo tên chỉ Chủ).
CHƯA KIỂM: mở bằng tài khoản Chủ thật (bấm hiện tên, xem dòng nhật ký trong tab Nhật ký thao tác), tài khoản Hỗ trợ/Quản lý (không có nút, tìm tên không ra). Ẩn/hiện chỉ để Chủ quản lý; phòng không lưu video nên vẫn không xem được video.
KHÔNG ĐỔI: giá, hạn mức, luật ví, quyền khác.

## GÓP Ý GIAO DIỆN 15/11/2026 (nhánh work, v3.42.0)
ĐÃ LÀM: (1) bỏ liên kết Điều khoản ở chân trang đăng nhập và cuối Hướng dẫn; còn ô tích, menu trái, Tài khoản. (2) `BackButton` (`components/back-button.tsx`, luật `lib/back-nav.ts`) ở Hướng dẫn, Dịch trực tiếp, Tài khoản, Thuê phòng, Cộng tác viên, Tải video, Điều khoản: có trang trước trong app thì quay lại, không có thì về `/`. Tab cùng trang: Admin nhớ tab vừa rời, mũi tên về đó, hết lịch sử về Tổng quan, đang ở Tổng quan thì rời trang; Số dư trong Studio về màn vừa xem. Người dùng chưa chốt «về tab vừa xem hay về màn chính» nên chọn «về tab vừa xem»; đổi sang «về màn chính» chỉ cần sửa `backFromTab` trong `admin-desk.tsx`.
KIỂM TRA: `npx tsc --noEmit` sạch; `npm test` 617 pass, 0 fail.
CHƯA LÀM: việc 3 (tên tệp đầy đủ trong Phiếu). Đã kiểm: `run_tickets.file_name` lưu tên đầy đủ, máy chủ gửi nguyên tên cho mọi nhân viên, che chỉ ở trình duyệt. Muốn hiện cho Chủ có nhật ký thì phải đổi máy chủ (nhân viên chỉ nhận tên đã che, hàm riêng cho Chủ, `writeAudit`), sửa điều khoản, nâng `TERMS_VERSION`.
CHƯA KIỂM: mở bằng trình duyệt thật (mũi tên ở 390 px, mở thẳng link /huong-dan rồi bấm mũi tên).
KHÔNG ĐỔI: giá, hạn mức, luật ví, quyền, chữ điều khoản (`2026-11-13.4`).

## TRANG HƯỚNG DẪN — phần 3 trong 3 (15/11/2026, nhánh work, v3.41.0)
ĐÃ LÀM: gom điều khoản về một chỗ, chỉ đổi chỗ hiển thị. Chữ điều khoản chuyển nguyên văn sang `components/terms-document.tsx` (đã so dấu vân tay chữ trước và sau, giống hệt; `entry-gate.test.ts` giữ dấu vân tay, đổi chữ mà không nâng `TERMS_VERSION` thì test đỏ). `lib/terms.ts` giữ `TERMS_VERSION` (vẫn `2026-11-13.4`), `TERMS_KEY` (vẫn `gterms`, nên người đã đồng ý không bị hỏi lại), `termsGate`. Đăng ký và Đăng nhập (`routes/login.tsx`) có ô tích «Tôi đồng ý Điều khoản và Chính sách» kèm liên kết mở tab mới (máy đã đồng ý bản này thì hiện sẵn dấu), chưa tích thì không gọi đăng nhập, tích rồi bấm gửi thì lưu `gterms` ngay. Trang `/dieu-khoan` đọc bất cứ lúc nào, không bọc `EntryGate`. Liên kết `TermsLink` ở chân trang đăng nhập, menu trái (dùng chung trang chủ, Dịch trực tiếp, Hướng dẫn), trang Tài khoản và cuối trang Hướng dẫn. `EntryGate`: đã đồng ý thì vào thẳng; chưa đồng ý và chưa có tài khoản thì sang `/login` thay vì hiện màn điều khoản; đã có tài khoản mà `TERMS_VERSION` mới thì chỉ người đó thấy màn hỏi lại (đúng quy tắc «chỉ hỏi lại người đã dùng»). Chế độ đăng nhập tắt (tài khoản dev) vẫn thấy màn hỏi lại rồi vào được.
KIỂM TRA LẠI PHẦN 1 VÀ 2 TRƯỚC KHI LÀM: `npx tsc --noEmit` sạch; `npm test` 590 pass, 0 fail (trước khi thêm test mới). Code phần 1 và 2 đủ theo thiết kế; việc còn lại của chúng là mở bằng tài khoản thật, xem dưới.
CHƯA KIỂM: mở bằng trình duyệt thật. Cần xem: trang đăng nhập có ô tích (đăng ký và đăng nhập, máy mới và máy đã đồng ý), trang `/dieu-khoan` ở 390 px và máy tính, liên kết ở menu trái; các tuyến «Chỉ tôi» nap-tien, mat-khau, dich-truc-tiep (phần 2 chưa kiểm lại sau khi sửa lỗi thẻ hướng dẫn); Safari, điện thoại thật, Vercel.
CHƯA LÀM, chờ người dùng chốt: (a) chữ §2 («bấm đồng ý»), §6 («hiện lại lúc bạn mở phòng»), §7 («bấm không đồng ý») nói theo cửa cũ; đúng ý nhưng sửa cho khớp ô tích thì phải nâng `TERMS_VERSION` và mọi người bị hỏi lại; (b) `/huong-dan` vẫn bọc `EntryGate`, người chưa đồng ý sẽ sang `/login` trước; muốn đọc không cần đồng ý thì bỏ lớp bọc và kiểm giao diện khi chưa đăng nhập.
KHÔNG ĐỔI: giá, hạn mức, luật ví, quyền, chữ điều khoản (`2026-11-13.4`).


## TRANG HƯỚNG DẪN — phần 2 trong 3 (15/11/2026, nhánh work, v3.40.0)
ĐÃ LÀM: `GuidedTour` làm tối nền, chỉ sáng chỗ cần bấm (4 tấm chặn quanh, chỗ sáng vẫn bấm được), đo vị trí mỗi 150 ms nên menu trượt hay đổi giao diện vẫn đúng. Bước có `rail` tự mở menu trái và xổ nhóm (điện thoại), bước có `press` bấm hộ tab khi sang bước sau, bước không `sel` chỉ có thẻ chữ (dùng cho trang Groq của bên khác). 9 tuyến ở `lib/tour-steps.ts`, `TOUR_PAGE` cho biết trang chạy. Mọi mục Hướng dẫn đều có «Chỉ tôi». `TourHost` (`components/tour-host.tsx`) gắn ở trang Dịch trực tiếp; Studio tự nhận tuyến trang «/». `takeTourRequest(page)` chỉ nhận tuyến đúng trang. Nhãn mới: run, cues, sub-style, voice-on, voice-engine, glossary-genre, key-input, balance, topup, change-password, live-*; mục menu Số dư, Thuê phòng, Yêu cầu xem lại có `domId` `tool-tab-…`. Test kiểm nhãn còn trong mã, bước `rail`/`press` hợp lệ.
SỬA LỖI: thẻ hướng dẫn nằm trong khối `data-product="sub"` bị ẩn khi mở Số dư và nạp tiền, nên tuyến nạp tiền và mật khẩu mất thẻ. Đã chuyển `GuidedTour` ra ngoài khối đó (cạnh `StudioPalette`).
ĐÃ CHẠY THẬT bằng Chrome + Playwright (điện thoại 390 px): quick-start, thuyet-minh, thuat-ngu, key-groq, ho-tro đủ bước, ảnh chụp đúng chỗ. phu-de: bước «cues» và «sub-style» hiện thẻ báo «chưa hiện» khi chưa có phụ đề (đúng thiết kế).
CHƯA KIỂM LẠI SAU KHI SỬA LỖI Ở TRÊN: tuyến nap-tien, mat-khau (cần session giả; kịch bản nằm ở scratchpad, không vào kho) và tuyến dich-truc-tiep trên trang /dich-truc-tiep. Cần mở bằng tài khoản thật, cả điện thoại lẫn máy tính. `tsc` và `npm test` chạy đầy đủ ở lần cuối trước khi sửa lỗi trên; chạy lại trước khi làm tiếp.
CHƯA LÀM: phần 3 (ô tích đồng ý điều khoản ở Đăng ký/Đăng nhập, trang `/dieu-khoan`, liên kết ở chân trang và trang Tài khoản, giữ `TERMS_VERSION`, không đổi nội dung). Trang /huong-dan còn bọc `EntryGate`, phần 3 xem lại.
KHÔNG ĐỔI: giá, hạn mức, luật ví, quyền, điều khoản (`2026-11-13.4`).

## TRANG HƯỚNG DẪN — phần 1 trong 3 (15/11/2026, nhánh work, v3.39.0)
ĐÃ LÀM: `/huong-dan` có mục lục, tìm không dấu, 9 mục và 6 câu hỏi thường gặp, «Chỉ tôi» ở mục Bắt đầu nhanh, menu trái và Ctrl+K. Nội dung ở `src/lib/guide-topics.ts`: giá gói, hạn dùng thử, thời gian giữ đơn nạp lấy từ hằng số; tên nút nhắc trong chữ nằm trong bảng `UI`, `guide-topics.test.ts` kiểm từng tên còn trong giao diện; mục mật khẩu đổi theo `getMailFace().resetOn`. Tuyến «Chỉ tôi» ở `lib/tour-steps.ts`, test kiểm nhãn `data-tour` còn tồn tại. Liên hệ hỗ trợ: Chủ nhập ở Admin, tab Cấu hình, ô «Liên hệ hỗ trợ» (email, Zalo, Facebook, ghi chú), lưu `room_settings.support_contact`, ai cũng đọc được, chỉ Chủ lưu, nhật ký thao tác `lien-he` chỉ ghi tên ô đã điền.
ẢNH MINH HỌA: thả tệp vào `public/huong-dan/`. Tên đã giữ chỗ: `groq-tao-key.png` (mục Lấy key Groq, trang console.groq.com là của bên khác), `chia-se-tab.png` (hộp chia sẻ tab của trình duyệt, web không làm sáng lên được). Chưa có tệp thì khung ảnh tự ẩn, không cần sửa code. Muốn thêm ảnh ở bước khác thì điền `image` vào bước đó trong `guide-topics.ts`.
CHƯA LÀM: phần 2 (làm mờ nền, chỉ sáng chỗ cần bấm, nhãn `data-tour` cho các mục còn lại, nút «Chỉ tôi» cho các mục khác ngoài Bắt đầu nhanh) và phần 3 (ô tích đồng ý điều khoản ở Đăng ký/Đăng nhập, trang `/dieu-khoan`, liên kết ở chân trang và trang Tài khoản, giữ `TERMS_VERSION`, không đổi nội dung điều khoản).
CHƯA KIỂM: Safari, điện thoại thật, Vercel; tab Cấu hình bằng tài khoản Chủ thật (mới qua kiểu và test hàm). Trang /huong-dan hiện bọc `EntryGate` như các trang khác, nên người chưa đồng ý điều khoản chưa xem được; phần 3 sẽ xem lại.
KHÔNG ĐỔI: giá, hạn mức, luật ví, quyền, điều khoản (`2026-11-13.4`).


## DỊCH TRỰC TIẾP — lớp tiền, vé, cầu nối (14/11/2026, nhánh work)
ĐÃ LÀM: `live-billing.ts` nối cầu nối vào `openTicketWith`, `chargeTicketWith`, `closeTicketWith` (không viết lại luật tiền). `live-book.ts` đọc tỉ giá từ `run_board`, phần chênh từ `alibaba_desk`, giá live tự kéo và lưu ở `live_board`. `live-upstream.ts` ghép địa chỉ `wss://<WorkspaceId>.ap-southeast-1.maas.aliyuncs.com/...`. `live-open.ts` cấp vé (đăng nhập, tài khoản mở, 10 lần/phút, vé sống 60 giây). `scripts/live-bridge.ts` khởi chạy cầu nối riêng, `scripts/live-try.ts` thử bằng dòng lệnh. Sửa lỗi: một phiên lỗi (vd. DB đứt) không còn làm sập cả cầu nối.
CẦN CHỦ ĐẶT: `LIVE_BRIDGE_SECRET` (giống nhau ở máy chủ chính và cầu nối), `LIVE_BRIDGE_URL` (địa chỉ wss công khai của cầu nối, ở máy chủ chính), `DATABASE_URL` (ở cầu nối), Workspace ID qua `ALIBABA_WORKSPACE_ID` hoặc cài đặt phòng `alibaba_workspace`.
ĐÃ LÀM thêm: Admin, tab Cấu hình, có ô «Dịch trực tiếp: Workspace ID Alibaba» (chỉ Chủ, ghi nhật ký `workspace-live`, lưu ở `room_settings.alibaba_workspace`). Cầu nối đọc ID này nếu không có `ALIBABA_WORKSPACE_ID`.
MÀN HÌNH DỊCH TRỰC TIẾP, làm từng bước nhỏ, xong bước nào test bước đó:
  Bước 1 XONG: `live-audio.ts` (đổi tần số, PCM, mức âm), `live-inbox.ts` (đọc tin cầu nối), có test.
  Bước 2 XONG: `live-frames.ts` (gom khung 100 ms), `live-mic.ts` (thu, nhả micro khi lỗi), `live-mic-errors.ts` (câu lỗi tiếng Việt), `live-mic-browser.ts` (AudioWorklet, dự phòng ScriptProcessor; nhận mọi luồng nên bước 3 dùng lại). CHƯA KIỂM bằng trình duyệt thật (sandbox không tải được Chromium); đã test bằng đồ giả.
  Bước 3 XONG: `live-tab.ts` (nhận biết máy có thu được tab: iPhone, iPad, Android thì không; tắt hình giữ tiếng; báo lỗi khi quên bật chia sẻ âm thanh), có test bằng đồ giả; CHƯA kiểm bằng trình duyệt thật.
  Bước 4 XONG: `live-session.ts` (phiên: nối, đợi ready mới thu, gửi khung, dừng nhẹ, dọn sạch mọi đường kết thúc), `live-playback.ts` (xếp tiếng liền mạch), `live-player-browser.ts` (phát qua loa; phải tạo trong cú bấm của khách). Có test với socket giả và một test nối cầu nối thật + Alibaba giả. CHƯA kiểm trên trình duyệt thật (loa, Safari).
  Bước 5 XONG: `components/live-screen.tsx` hiện chữ gốc và chữ dịch chạy theo thời gian thực (từ `LiveTranscript`, phần chưa chốt hiện mờ, cuộn theo chữ mới trừ khi khách cuộn lên đọc).
  Bước 6 XONG: số dư, «còn khoảng N phút» (`live-view.ts`), cảnh báo sắp hết tiền (dưới 3 phút hoặc cầu nối báo `low`; hết thì báo phiên sẽ tự dừng), nạp nhanh bằng `TopUp`. Ví đã trừ tiền giữ, nên còn lại = số dư tự do + `heldLeft` của cầu nối.
  Bước 7 XONG: tải SRT, VTT, TXT (`live-export.ts`, dùng lại `toSrt`, `toVtt`, `toTxt` của trang phụ đề). Chỉ bật khi đã có chữ.
  Bước 8 XONG: trang `/dich-truc-tiep` (chọn nguồn micro hoặc tab, ngôn ngữ nói, ngôn ngữ đích, model, bật tiếng dịch, nút Bắt đầu/Dừng) và mục «Dịch trực tiếp» trong menu trái và Ctrl+K. Loa và hộp chọn tab được tạo ngay trong cú bấm, trước khi xin vé.
CHƯA LÀM: phần Admin còn lại (giá live, bật/tắt). Chưa có phần gắn ghi chú người nói thành màu riêng.
CHƯA KIỂM: màn hình chưa thử bằng trình duyệt thật (micro, chia sẻ tab, loa, Safari); chưa nối Alibaba thật (chưa có Workspace ID); chưa chạy trên máy chủ ngoài; chưa đặt `LIVE_BRIDGE_URL` và `LIVE_BRIDGE_SECRET` trên Vercel. Đã chạy thật với Postgres: giữ tiền, Alibaba không tới được thì phiếu `loi` và ví trả đủ.
Kiểm tra: `tsc` sạch, `npm test` 0 fail, `vite build` chạy được.

# (cũ) bản 2.19.1 (08/11/2026 19:13 giờ VN)

## BẢN 3.32.0 → 3.36.0 (14/11/2026, nhánh work)
ĐÃ LÀM: mục 1 (trang chủ một ô), 6 (Ctrl+K và dán link tự bắt đầu), 2 (tiến trình liền), 3 (sửa tại dòng, menu tải SRT/VTT/TXT; bấm dòng nhảy video đã có sẵn), 4 (số dư, còn khoảng N phút, ước tính trước khi chạy, nạp nhanh).
ĐÃ LÀM thêm ở v3.35.0: mục 7 (Thuật ngữ và Gói dịch vào nhóm Nâng cao của menu trái).
ĐÃ LÀM thêm ở v3.36.0: mục 5 (khoảng trống, chữ lớn, hiệu ứng kéo thả ở trang chủ).
CHƯA LÀM: không còn mục nào trong bảy mục.
CHƯA KIỂM: chưa mở bằng trình duyệt thật hay điện thoại thật (cổng đăng nhập chặn chạy thử tự động); chưa thử dán link trên Safari iOS; chưa thử ước tính tiền với ví và gói trả theo lượt thật; chưa mở file .vtt trong trình phát thật.
KHÔNG ĐỔI: giá, hạn mức, cách giữ và trừ ví, quyền, điều khoản (`2026-11-13.4`).

Phiếu bàn giao một lần. Không phải bộ luật. Luật hiện tại nằm ở `BANG_DIEU.md`. Đoạn cũ phía dưới chỉ để tra.

Gốc: v2.19.0. Bản này ghi các lỗi còn mở rồi sửa.

## ĐÃ LÀM Ở 2.19.1
X1 giữ video khi sang Tài khoản. X2 ghi `gnarr_v` ngay lần đầu, không ép bật thuyết minh nếu người dùng đã tắt. X3 cửa trả theo lượt chỉ hiện sau khi tải xong; cửa đóng thì tắt trả theo lượt. X4 rời trang thì dừng giọng và trả âm lượng. X5 mũi tên trên tab, nút hoặc hộp thoại không tua video. X6 nút xuất đã hỏi máy chủ từ trước; không giấu phụ đề đang xem. X7 gỡ listener âm lượng và tốc độ. X8 xuất CSV hủy link sau 1 giây. X9 hiện câu lỗi khi gửi yêu cầu. X10 không gọi `screen.orientation` khi không có. X11 làm tròn trước khi tách phút. D1 ngày chi phí và cột nạp theo giờ Việt Nam. D2 câu tìm nói rõ từ khóa hoặc toàn bộ. D3 câu đổi mật khẩu đúng việc phòng chưa gửi thư. D4 đã xong từ 2.18.0, không làm lại. D5 mỗi lần chạy truyền đúng phiếu, lời đọc chỉ bám phiếu của lần đó. S2 migration khóa `pg_advisory_lock`. S4 đã trim từ 2.19.0. S5 CLI so đường thật, không thoát 0 khi gọi qua symlink. S6 từ chối đường ghi nếu symlink nằm trong `public`, và link cài đặt không nhận `//`. S7 trang không chữ và không canvas thì smoke thoát 1. S8 file migration có BEGIN/COMMIT/ROLLBACK thì dừng. T5 thêm trần 20 lần/giờ theo IP khi có `x-forwarded-for` hoặc `x-real-ip`. Không thêm captcha. T14 đã chạy một cửa sổ Silero bằng wasm: đầu vào `x`, `h`, `c`, đầu ra `prob`, `new_h`, `new_c`. Chưa bấm nút lọc trên điện thoại.

## KHÔNG LÀM — đã chốt 2026-11-08 19:21, không mở lại trừ khi user yêu cầu đúng việc
- **T6, khóa lượt thử theo máy thật.** Không làm. Mã máy do trình duyệt tự sinh. Xóa dữ liệu trang hoặc mở ẩn danh là có một máy mới. Bịa fingerprint, cookie hay captcha không khóa được máy thật và dễ chặn nhầm người dùng thật. Khóa được chỉ khi thư đã xác minh, và việc gửi thư chỉ bật khi phòng đã cấu hình nhà cung cấp thư.
- **S9, giải HE-AAC và đọc hết elst.** Không làm. Không viết bộ giải mã riêng trong trang. Hiện chỉ bù mục `elst` đầu, bản 0. AAC-LC vẫn đọc được. HE-AAC để trình duyệt giải, vì tự giải dễ lệch thời gian hơn.
- **Captcha cho yêu cầu công khai.** Không thêm. Đã có trần theo email, trần chung, và trần theo IP khi máy chủ thấy địa chỉ. Captcha giả không chặn được.

## Kiểm tra
`npx tsc --noEmit` sạch. Test smoke, brand, preview, write-atomic, studio-layout, tiền và dịch: 190 pass, 0 fail.

## CHƯA LÀM HẾT
T6, S9 và captcha đã chốt ở mục «KHÔNG LÀM» phía trên. Không ghi lại thành việc còn mở.
- **T14**: tên tensor đã đối chiếu bằng wasm (`x`, `h`, `c` vào; `prob`, `new_h`, `new_c` ra). Chưa bấm nút lọc tiếng người trên điện thoại thật.
- **S6**: đã xóa `src/lib/multiplayer` vì không file nào nhập. Nếu bản sau cần phòng P2P thì phải đưa lại từ khung mẫu.

## ĐÃ LÀM Ở 2.19.0
C5 ghi email người thao tác khi mở gói, đặt số dư, hoàn ví, nhả giữ, từ chối nạp. T1–T4, T7–T13, T15 (T15 đã có từ trước), S1–S5, S7, S8, S10–S12. T2 cảnh báo khi không thấy đoạn có tiếng. Migration: `VERCEL_ENV` khác `production` thì thoát 0; production thiếu `DATABASE_URL` thì thoát 1; URL được trim.

## Kiểm tra
`npx tsc --noEmit` sạch. Test tiền, dịch, từ điển, khoảng trống, điều khoản trong lượt này pass sau khi bỏ test Orpheus vì Node không phân giải alias `@/`.


## Khôi phục khi bị ngắt phiên
Giải nén, `npm install`, rồi `npm run typecheck && npm test`. Mọi thay đổi nằm trong thư mục này. Đọc mục "Đã làm" để biết file nào đổi.
Cần đặt ở môi trường khi triển khai: `ADMIN_EMAIL` (Chủ đầu tiên), `MAIL_FROM` cùng khóa nhà cung cấp thư (xem `src/lib/auth/mailer.ts`). Không đặt thì chưa bật xác minh email.

## Kết quả kiểm tra (cuối bản này)
Xem mục "Kết quả thật" ở cuối file.

## ĐÃ LÀM
| Mục | Làm thế nào | File chính |
|---|---|---|
| Test fail có sẵn (2) | entry-gate đọc dạng số phiên bản thay vì ghim số; studio-layout chỉ kiểm quy tắc CSS của khung video | `src/components/entry-gate.test.ts`, `studio-layout.test.ts` |
| N1 | Xóa `creditTrial` (ai đăng nhập cũng tự cộng tiền được). Không còn nơi dùng | `src/lib/room-account.ts` |
| N5 | `requireOpenAccount()` trả 403 khi status khác `open`; dùng ở createPayOrder, buyRoomPlan, spendTrial, claimTrialDevice, synthesizeEdge, room-groq | `src/lib/guard.ts`, `guard.server.ts`, test `guard.test.ts` |
| N4 | `synthesizeEdge` có authMiddleware + 120 lần/phút/tài khoản (bảng `rate_hits`, migration 0013) | `src/lib/sub/edge-speech.ts` |
| N2 | Cổng Groq trả theo lượt: same-site, đăng nhập, status open, 240 yêu cầu/phút, trần body, model phải nằm trong `run_models`, lỗi JSON, chuyển tiếp retry-after. Tiền: giữ nguyên tử bằng UPDATE có điều kiện `balance >= số giữ`, trừ số thực theo giá Groq cộng chênh, nhả phần thừa, Groq lỗi không tính tiền, phiếu quá 6 giờ tự nhả | `src/routes/api/room-groq.ts`, `run-bill.ts`, `run-gate.ts`, `run-ticket.ts`, `run-turn.ts`, `run-board.server.ts`, `sub/room-ticket.ts` |
| N3 + C4 | Chủ nằm trong `room_staff`, chỉ tính khi `emailVerified`; bỏ email ghi cứng và `.grok/admin.json`; gửi thư xác minh qua HTTP (Resend, SendGrid, Brevo, Mailgun, Postmark, webhook) | `src/lib/auth/server.ts`, `admin-allow.server.ts`, `auth/mailer.ts` |
| C5 (một phần) | Chỉ Chủ xác nhận tay đơn nạp; ghi người xác nhận vào sổ và nhật ký; tối đa 3 đơn chờ mỗi khách; giới hạn tần suất báo đã chuyển | `src/lib/pay-store.ts`, `pay-confirm.ts` |
| Hồi quy tự gây (2) | Tài khoản khóa vẫn xem ví; Quản lý không thấy nút xác nhận tay | `account-panel.tsx`, `pay-settings.tsx`, `admin-desk.tsx` |
| Test luồng nối nhiều phần | Webhook nạp → mua gói → trả theo lượt → hoàn tiền, kèm test đồng thời | `src/lib/money-flow.test.ts`, `pay-flow.ts` |
| Điều khoản | `TERMS_VERSION = 2026-11-08.1`, thêm đoạn trả theo lượt và sửa câu "phòng không thu tiền sử dụng" | `src/components/entry-gate.tsx` |

## CHƯA LÀM
- Nhóm 2 và C5 đã xong ở 2.18.0–2.19.0. Nhóm 3 và 4 đã làm ở 2.19.0, trừ T6 và phần chạy thử T14 (xem đầu file).
- Chạy thử `npm run dev` với trình duyệt thật: xem mục cuối
- Chưa thử gọi Groq thật, chưa thử gửi thư thật, chưa thử Postgres thật nhiều kết nối

## LỖI MỚI PHÁT HIỆN (đã xử lý ở 2.19.1, trừ T6 và S9 ghi ở đầu file)
Định dạng cũ giữ lại để đối chiếu. Không làm lại các mục X và D.

### Đã đối chiếu với mã
- **S1, Nghiêm trọng**, `scripts/migrate.mjs`: đã xử lý ở v2.19.0 cùng T11. Preview (`VERCEL_ENV` khác production) không migrate. Production thiếu `DATABASE_URL` thì thoát 1.
- **S3, Cao**, `scripts/migrate.mjs`: đã xử lý ở v2.19.0. Local không có `DATABASE_URL` vẫn thoát 0.
- **X1, Cao**, `src/components/studio.tsx:583`: chuyển sang tab "Tài khoản" gỡ `<video>` khỏi DOM; quay lại thì video trống vì `video.src` chỉ gán một lần (`use-pipeline.ts:1253`). Đề xuất: luôn mount Stage và ẩn bằng CSS.
- **X8, Nhỏ**, `studio.tsx:263`: `revokeObjectURL` ngay sau `click()` có thể hủy tải ở Safari/Firefox. Đề xuất: `setTimeout(..., 1000)`.
- **X11, Nhỏ**, `studio.tsx:52`: 59,96 giây hiện "0:60.0". Đề xuất: làm tròn trước khi tách.
- **D1, Nhỏ**, `src/components/admin-company.tsx` (MoneyBoard, `day` mặc định): dùng `toISOString()` là giờ UTC, từ 00:00 đến 07:00 giờ VN ghi chi phí vào ngày hôm trước. Đề xuất: dùng ngày theo múi giờ VN.
- **D2, Nhỏ**, `src/components/admin-desk.tsx` cuối file: `foundNotice` có hai nhánh giống nhau (mã chết).
- **D3, Nhỏ**, `account-panel.tsx`: dòng "Quên mật khẩu chưa gửi được thư." đã lỗi thời nếu bật mailer.
- **D4, Trung bình**, `run-desk-board.tsx` + `admin-room.ts getRunDesk`: key Groq phòng trả nguyên văn về trình duyệt của Chủ (đúng là C7).
- **D5, Nhỏ**, `use-pipeline.ts`: biến phiếu `current` dùng chung toàn trình duyệt, hai tác vụ cùng lúc có thể dùng nhầm phiếu của nhau.

### Agent báo, chưa tự kiểm
- **X2, Trung bình**, `studio.tsx:339,346`: lần mở đầu tiên không ghi `gnarr_v`, lần sau migrate ép bật lại thuyết minh và `lead=0`.
- **X3, Trung bình**, `studio.tsx:742-747`: bấm "Trả theo lượt" khi cửa chưa tải xong, rồi cửa là đóng thì `payByRoom` vẫn true và key riêng bị bỏ qua.
- **X4, Trung bình**, `studio.tsx:385`: `createNarrator()` không dọn khi rời trang, giọng đọc vẫn phát và âm lượng video có thể kẹt 0,16.
- **X5, Trung bình**, `studio.tsx:1652`: phím mũi tên vừa đổi tab vừa tua video; modal đang mở vẫn tua.
- **X6, Trung bình (chưa chắc)**, `studio.tsx:618`: chặn xuất file chỉ ở trình duyệt, bản dịch đã nằm sẵn trong bộ nhớ nên người dùng thử vẫn sao chép được.
- **X7, X9, X10, Nhỏ**: listener `volumechange`/`ratechange` không gỡ; báo lỗi yêu cầu nuốt thông báo cụ thể; `screen.orientation` có thể undefined trên iOS cũ.
- **S2, Cao**: `migrate.mjs` không có khóa chống hai build chạy cùng lúc.
- **S4, Trung bình**: `migrate.mjs` không `trim()` `DATABASE_URL` như `db.ts`.
- **S5, Trung bình**: `write-atomic.mjs`, `preview.mjs`, `brand-check.mjs` so sánh main-module không qua `realpath`, có thể thoát 0 mà không làm gì khi đường dẫn có symlink.
- **S6, S7, S8, S9, Nhỏ đến Trung bình, đều chưa chắc**: kiểm tra đường dẫn ghi không resolve symlink; smoke exit 0 khi trang trắng; migration chứa COMMIT làm hỏng tính nguyên tử; `//evil.com` ở trang cài đặt PWA.

## Lỗi có sẵn trước khi sửa (đã ghi ở lượt đầu)
Lint 7 lỗi, 14 cảnh báo (`studio.tsx` 3 lỗi `no-unused-expressions`, `use-pipeline.ts` 2 `prefer-const`, `client.server.ts` `no-empty`, `cast-voice.ts` `no-useless-escape`). 8 test trong `scripts/` fail do thiếu `.grok/` (môi trường).

## Kết quả thật (bản 2.17.1)
- typecheck: sạch
- lint: 7 lỗi, 14 cảnh báo (như gốc, không thêm)
- build: được
- test `src/`: 242 pass, 0 fail, 1 todo (C2 tái hiện race hoàn tiền)
- test `scripts/`: 189 pass, 8 fail (thiếu `.grok/`, lỗi môi trường đã biết)

## Chạy thử `npm run dev` (08/11/2026, PGLite trong bộ nhớ, trình duyệt headless)
**Chạy được và thấy đúng:**
- Trang điều khoản hiện bản `2026-11-08.1`; nút Đồng ý chỉ mở sau khi tick "Tôi đã đọc".
- Đăng ký email + mật khẩu: tạo tài khoản, vào thẳng phòng với "Dùng thử: còn 1 tệp, tối đa 10 phút".
- Đăng nhập sai mật khẩu: 401 "Invalid email or password"; đúng mật khẩu: vào phòng.
- `/api/room-groq`: chưa đăng nhập trả 401 JSON `{error:{message}}`; khác nguồn hoặc thiếu phiếu trả 400 JSON.
- Tab Tài khoản: hiện số dư 0 đ, bảng gói (9.000 / 63.000 / 99.000... theo `ROOM_PLANS`), mua gói khi 0 đ báo "Số dư chưa đủ."; nạp tiền báo "đang bảo trì" vì chưa cấu hình Sepay/Casso.

**Không chạy thử được (lý do):**
- Dùng thử một tệp, xuất file Vietsub, bật VAD, thuyết minh: cần key Groq thật, video thật và mạng ra ngoài; sandbox chỉ cho npm/GitHub. Cần anh tự thử trên máy hoặc Vercel.
- Nạp tiền qua webhook thật, trang Admin, Chủ: cần cấu hình cổng nạp và một tài khoản Chủ đã xác minh email (chưa có nhà cung cấp thư); đã thay bằng test tự động (`money-flow.test.ts`, `pay-confirm.test.ts`).
- Gửi thư xác minh thật: chưa có khóa nhà cung cấp.
- Postgres thật nhiều kết nối: dùng PGLite.

**Quan sát nhỏ trong lúc chạy thử:**
- Thông báo đăng nhập sai bằng tiếng Anh ("Invalid email or password"), nên Việt hóa.
- Form đăng nhập gửi được trước khi trang tải xong JS (dev), khi đó chỉ tải lại `/login?`, không rò mật khẩu vì ô nhập không có thuộc tính `name`.
- Google Fonts và `grok.com/.../extensions.js` bị chặn do mạng sandbox, không phải lỗi mã.

## v3.10.3 — bố cục phòng chiếu (10/11/2026 12:00 giờ VN)
Đã làm: viết lại khung phòng chiếu trong `src/styles.css` thành ba chế độ loại trừ nhau; `src/lib/studio-layout.ts` giữ chuỗi điều kiện tấm trượt dùng chung với `studio.tsx`; `scripts/studio-layout-matrix.mjs` (`npm run check:layout`, cần `CHROMIUM_PATH` nếu Playwright chưa tải trình duyệt) đo 20 cỡ màn hình, bản cũ lỗi 35/40 trường hợp, bản mới 0/40. Tách `PAY_MINUTES` và `sameSecret` khỏi `pay-match.ts` để `node:crypto` không vào gói trình duyệt. Sửa `stripInstallParams` chặn `//host`. Sửa 7 test lỗi.
Kiểm tra thật: `tsc` sạch, `npm test` 454 pass 0 fail 7 bỏ qua (3 test thiếu `.grok/app-env.json` bỏ qua trên kho sạch, cùng 4 test sẵn có), `npm run build` qua, bản dev tải được studio ở 9 cỡ màn hình.
Chưa làm: chưa thử trên điện thoại hoặc máy tính bảng thật, Safari iPhone, Firefox. Ở màn thấp ≤520px, nút «Tài khoản» (nav) vẫn bị ẩn như cũ. Lỗi eslint sẵn có trong `studio.tsx` (3 `no-unused-expressions`) chưa đụng.

## v3.10.4 — email cá nhân làm nhà gửi thư (10/11/2026 16:40 giờ VN)
Đã làm: nhà gửi thư mới «smtp» trong mục Thư của trang Chủ (`mail-desk.tsx`), lưu như các nhà khác. `src/lib/auth/mailer.ts` thêm `smtpTarget` (Gmail, Yahoo tự nhận máy chủ), `smtp.server.ts` gửi bằng nodemailer. Thêm phụ thuộc `nodemailer` và `@types/nodemailer`, nhớ `npm install`. 14 test thư qua.
Chưa làm: chưa gửi thử thật tới Gmail, cần Chủ nhập mật khẩu ứng dụng rồi bấm Gửi thư thử trên bản chạy thật. Outlook và Hotmail không có sẵn máy chủ vì Microsoft hạn chế đăng nhập bằng mật khẩu.

## v3.10.5 — sửa bảng cài đặt phụ đề (10/11/2026 17:10 giờ VN)
Đã làm: `.studio-video` co và cuộn được, `.player-stack > *` không co; trên bản dev mở bảng cài đặt ở 5 cỡ màn hình thì video giữ 16:9 và không đè bản dịch. Lỗi này do v3.10.3 gây ra.
Chưa làm: lỗi trên bản Vercel (ảnh chụp 16:49, 16:50): thẻ QR nạp tiền không hiện, «Truy cập admin» chỉ báo đang truy cập, hạn gói và cổng nạp kẹt ở «Đang xem…». Các dòng đó chỉ kẹt khi lời gọi máy chủ không trả lời hẳn (lỗi thì đã hiện câu lỗi). Trên bản dev local các lời gọi trả 200 nên chưa tái hiện được. Cần nhật ký hàm Vercel và biết bản đang xem là preview hay production, DATABASE_URL có đặt cho môi trường đó không.

## v3.10.6 — Admin và Tài khoản nhiều cột (10/11/2026 18:00 giờ VN)
Đã làm: `.room-wide`, `.admin-grid`, `.account-grid`, `.stat-grid` trong `styles.css`; bọc nhóm «Tài khoản» của tab Việc thành `.admin-wide`; tab Thư xếp hai thẻ cạnh nhau; trang Tài khoản chia thẻ, sổ tiền chiếm cả hàng. `npm run check:layout` đo thêm khung mô phỏng admin và tài khoản ở 20 cỡ màn hình, đúng 1, 2, 3 cột và không tràn ngang.
Chưa làm: chưa xem trang admin có dữ liệu thật (chưa đăng nhập được tài khoản Chủ trên máy chủ thử cục bộ). Các tab Sơ đồ, Doanh thu, Thuật ngữ, Cộng tác, Nhật ký vẫn một khối rộng cả hàng, chưa chia cột bên trong. Trang /goi, /ctv, /yeu-cau, /login giữ khung hẹp.

## v3.10.7 — Sửa layout lệch (2026-11-11 03:28 giờ VN)
Đã làm: ô tick và ô chọn màu không còn bị `width:100%` (tab Thư); `.admin-flow` chia cột cho Sơ đồ, Doanh thu, Thuật ngữ, Cộng tác; Nhật ký xếp lưới; thẻ Trả theo lượt xếp lại hết khoảng trống; `.stat-grid` hàng cuối giãn đầy; nút Lọc cạnh ô lọc; tiêu đề Gmail đúng màu; placeholder SMTP gọn; chữ hướng dẫn dưới nút phát.
Chưa làm: chưa xem trên Vercel thật hay điện thoại thật, mới dựng thử CSS trong Chromium. `tsc --noEmit` và 9 test cần gói cài đặt chưa chạy được ở bản này. Trang Tài khoản còn chia hai cột, cuối cột có thể lệch chiều cao. Nút Lưu trên thẻ Chủ ở Sơ đồ viền nhạt, chưa tìm ra nguyên nhân.
Cố ý không làm: không đổi logic, không đổi điều khoản (chỉ giao diện).


## v5.1.1: giá Deepgram tự cập nhật (việc 1 trong 4 của "tùy biến cao nhất")
XONG: `sub/deepgram-price.ts` (đọc trang giá, bỏ giá gạch, chặn lệch >5 lần, cấu hình auto + chu kỳ giờ), `sub/deepgram-base.ts` (giá dự phòng 0,0048/0,0058/30), `sub/deepgram-board.server.ts` (khóa `dg_board`, `loadDeepgramRows`), nút Lấy lại bảng kéo cả Deepgram, ô cấu hình trong `model-usd-board.tsx`, route Aura dùng `loadDeepgramRows`.
CHƯA: (2) gửi file từ máy lên Deepgram, thử CORS trước; (3) dịch trực tiếp qua Deepgram; (4) bảng ngôn ngữ Nova-3 sửa được (thêm vi) + cổng bảo trì cho /api/room-deepgram; nối dòng `deepgram-nova-3-multi` vào tính tiền khi ngôn ngữ là `multi`. Phía khách (`pack-picker`, `service-pack-board`) còn dùng bảng dự phòng, chưa dùng giá tự lấy. Trang giá có thể đổi dạng: khi đó parser trả rỗng và giữ giá cũ. Chưa thử kéo thật từ máy chủ Vercel.

## v5.1.2: Deepgram mở cả hai cửa
XONG: cửa Trả theo lượt chạy Deepgram bằng key phòng (xem admin-log 5.1.2). Quy tắc từ nay: nhà mới phải đủ cả hai cửa (PROVIDERS.md bước 7, `provider-doors.test.ts`). CHƯA thử chạy thật với key Deepgram. Giá khách ở cửa Trả theo lượt hiện chưa cộng phần trăm chênh Deepgram trong ước tính (giữ tiền tính trên giá gốc như Groq; số trừ thật có cộng). `pack-picker.tsx` đang không được dùng ở đâu.

## KẾ HOẠT TIẾP THEO (ghi 17/11/2026 12:36, chuyển tài khoản). Bản hiện tại v5.1.2, commit 16a23d4, nhánh `work`
Yêu cầu của Chủ (8 ý), ĐÃ CHỐT làm theo từng bước (a) đến (d), mỗi bước: `npx tsc --noEmit` + `npm test` sạch rồi đẩy `work`, nâng version, ghi CHANGELOG (khách, KHÔNG dùng chữ "Token dịch" vì app-version.test chặn), admin-log, HANDOFF.
Việc gửi file từ máy lên Deepgram, dịch trực tiếp qua Deepgram, bảng ngôn ngữ Nova-3 sửa được (thêm vi), cổng bảo trì cho /api/room-deepgram (Aura): TẠM DỪNG đến khi xong (a).

(a) [ĐANG LÀM, chia nhỏ a1 đến a3] Danh mục nhà + model chung.
  - a1 [XONG 17/11/2026, commit 0e6c817]: `PROVIDERS` có trường `intake` (Groq "chunks", Alibaba "link", Deepgram "link"); `asrIntake(id)` và `asrTakesLink(id)` trong `asr-house.ts` đọc từ đó (không còn so tên nhà cứng).
  - a2 [XONG 17/11/2026, v5.1.3]: `src/lib/sub/model-catalog.ts`: `MODEL_CATALOG` DỰNG từ `ASR_MODELS`, `CHAT_MODELS`, giọng Orpheus (`ORPHEUS_MODELS`), giọng Aura, model dịch trực tiếp Alibaba; mỗi dòng: nhà, loại (asr/chat/tts/live/guard), nhãn, intake. Hàm: `catalogModel`, `catalogFor(nhà, loại?)`, `modelKindOf(nhà, id)` (đoán theo nhà và tên cho model lạ; Deepgram lạ thì null vì Deepgram không có model dịch). Test `model-catalog.test.ts` (đã thêm vào `npm test`): nhà khai khả năng nào thì PHẢI có model loại đó trong danh mục (nhà mới quên là test đỏ). Các bảng cũ (`ASR_MODELS`, `CHAT_MODELS`, `ALIBABA_ROWS`, `DEEPGRAM_BASE_ROWS`, bảng live) vẫn là nguồn dữ liệu và vẫn dùng như cũ; danh mục chỉ đọc từ chúng. Chưa có cột "cửa dùng được" (turn/rent/live) và "nhóm" trong danh mục: phần cửa sẽ làm ở (c) và (d) khi cần, vì luật cửa hiện nằm rải ở `turn-pack.ts`, `rent-show-rule.ts`, `service-pack.ts` và chưa đọc hết để gom an toàn. SỬA LỖI kèm theo: `model-role.ts` (`modelRoleOf`) trước đây gán `deepgram-nova-3`, `aura-2-*`, `*livetranslate*` là «Dịch và sửa câu»; nay đúng asr, tts, live (có thêm vai "live"). Ảnh hưởng ghi chú ở Admin chọn gói (`service-pack-board.tsx`) và ô key riêng của khách (`studio.tsx`). Khách thấy: v5.1.3, CHANGELOG «Ghi chú việc của từng model hiện đúng hơn.»
  - a3 Bỏ phần trăm chênh theo nhà. ĐÃ KIỂM bằng code (17/11/2026): phiếu unit "vnd" KHÔNG còn được tạo (`openTicketWith` trong `run-ticket.ts` không ai gọi; phiếu mới đều đi `token-flow.ts` unit "token"; migration `0025_direct_sale.sql` đã nhả phiếu vnd còn giữ). Với phiếu "token", số Token dịch trừ thật luôn tính từ giá GỐC (`bare`, markup 0, qua `giayForBaseCost`) ở `run-gate.ts` và `room-asr.server.ts`; số có chênh (`cost`) chỉ dùng kiểm lớn hơn 0 và cho phiếu vnd cũ. CÂU «số trừ thật có cộng phần trăm chênh Deepgram» ở mục v5.1.2 phía trên là KHÔNG ĐÚNG, đừng làm theo.
    - a3-1 [XONG 17/11/2026, v5.1.3 chưa đổi số, chỉ Admin]: gỡ phần trăm chênh riêng Deepgram: `getProviderMarkup`/`saveProviderMarkup`, ô nhập và `withMarkup`, `deskKey` của `chargeRoomAsr`; sửa ghi chú sai ở `admin-desk.tsx`; `PROVIDERS.md` bước 7. Khóa `deepgram_desk` không còn ai đọc (để nguyên dữ liệu).
    - a3-2 [CHƯA, CHỜ CHỦ CHỐT, vì đổi con số khách thấy] Còn phần trăm chênh của Groq (`run_desk.markup`, ô ở `run-desk-board.tsx`) và Alibaba (`alibaba_desk.markup`, ô ở `service-pack-board.tsx`). Chúng chỉ còn tác dụng ở HIỂN THỊ: `studio.tsx` (`modelFacts`, `roomAsrPrice` qua `formatRoomPrice(row, rate, door.markup)`) cho khách thấy giá đồng đã cộng chênh, và `pack-picker.tsx`, `service-pack-board.tsx` (bảng giá mẫu), `live-book.ts`/`live-cost.ts` (ước tính dịch trực tiếp), `cost-estimate.ts` (ước giá vốn phiếu cũ, cần giữ dữ liệu cũ). Gỡ hẳn thì giá đồng hiển thị cho khách đổi (thấp đi, thành giá gốc) và có thể phải sửa điều khoản + nâng `TERMS_VERSION` (khách đồng ý lại). Cần Chủ quyết: (1) gỡ hẳn và cho khách thấy giá gốc, hay (2) bỏ luôn giá đồng ở cửa Trả theo lượt vì khách thật ra trả bằng Token dịch. Ở `token-desk.ts` markup 50 là chênh của GÓI Token dịch, GIỮ NGUYÊN.
  - Ghi chú gốc của kế hoạch: thêm vào `PROVIDERS` (provider.ts) khai: cách nhận file (`intake`: "chunks" cắt đoạn ở trình duyệt | "link" link công khai | "upload" tải file thẳng | "stream" luồng), thay cờ `asrTakesLink` (asr-house.ts). Deepgram thật ra nhận cả link, file, luồng; app mới dùng link.
  - Danh mục model chung (mỗi model: nhà, khả năng asr/chat/tts/live, intake, cửa dùng được turn/rent/live, nhóm). Hiện model nằm rải: `ASR_MODELS`/`CHAT_MODELS` (sub/models.ts), `ALIBABA_ROWS`, `DEEPGRAM_BASE_ROWS` (sub/deepgram-base.ts), bảng live (live/live-book.ts). `provider-doors.test.ts` đã có bảng `PRICE_ROWS: Record<ProviderId,...>` làm mẫu (tsc lỗi nếu quên nhà mới).
  - Bỏ phần trăm chênh THEO NHÀ, giá model luôn là giá gốc; chênh chỉ nằm ở giá gói Token dịch (`giay-room.ts`, `token-desk.ts` markup 50 mặc định). Khảo sát: với phiếu unit "token" thì trừ theo giá gốc (markup 0) rồi, markup chỉ còn tác dụng ở phiếu unit "vnd" cũ (run-ticket.ts, run-gate.ts) và hiển thị. Chỗ dùng markup: run-desk.ts (RunDesk.markup), run-board.server.ts (loadPriceBook), run-bill.ts (quoteVnd), live/live-book.ts + live-cost.ts, pack-room.ts (Alibaba), provider-room.ts (`getProviderMarkup/saveProviderMarkup` MÌNH VỪA THÊM ở v5.1.2, cần gỡ), provider-key-board.tsx (`withMarkup`), room-asr.server.ts (đọc `deepgram_desk`/`alibaba_desk`), service-pack-board.tsx. Cần xác nhận phiếu "vnd" còn dùng không rồi gỡ an toàn; không phá dữ liệu cũ trong room_settings.
(b) [ĐANG LÀM, chia nhỏ b1 đến b3] Gom giao diện.
  - b1 [XONG 17/11/2026]: sửa BẪY trong `PROVIDERS.groq.settings.key`: ghi `groq_key` nhưng app thật đọc/ghi `run_key`; đã đổi thành `run_key` (test giữ). Thêm nhãn nhật ký `key-groq`. Bỏ `alibabaAsrOnRoomPayProblem` (lỗi thời: Alibaba đã chạy cửa Trả theo lượt bằng key phòng `alibaba_key`, xem `ali-filetrans.server.ts` `input.key === "room"`). Ghi chú cũ ở `alibaba-key-board.tsx` («Cửa trả theo lượt chưa dùng key này») cũng đã sai.
  - b2 [XONG 17/11/2026, v5.1.3 chưa đổi số, chỉ Admin]: tab Cấu hình dùng `<ProviderKeyBoards />` (lặp `PROVIDER_IDS`, `provider-key-board.tsx`), thay thẻ key Groq trong `RunDeskBoard`, `AlibabaKeyBoard` (đã xóa file) và dòng Deepgram viết tay. Ô chung có nút Dán và ghi chú sinh từ `providerKeyNote(id)` (provider.ts). `RunDeskBoard` chỉ còn `part` ops và price. Gỡ `saveRunKey` (hết nơi gọi). Nhãn nhật ký key Groq giờ là `key-groq` (nhật ký cũ vẫn `key-phong`). `service-pack-board.tsx` VẪN giữ ô key Alibaba riêng + `saveAlibabaKey` (chưa gỡ, còn một nơi nhập key Alibaba ở mục Gói dịch). CHƯA bấm thử lưu key thật và nút Dán trên trình duyệt. Test mới `components/provider-admin-board.test.ts`.
  - b3 [XONG 17/11/2026, v5.1.3 chưa đổi số, khách không thấy khác]: `PROVIDERS` thêm `clientStore` (khóa kho: groq `gk`, alibaba `gali`, deepgram `gdg`, giữ tên cũ) và `keyHint`; `clientKeyPlaceholder(id)` cho chữ mẫu. `use-pipeline.ts`: bảng `houseKeys` + `setHouseKey(id, value)` + `houseKeyOf(id)` thay `alibabaKey`/`deepgramKey`. `studio.tsx`: ô key các nhà ngoài Groq vẽ bằng vòng lặp `PROVIDER_IDS`, chỉ hiện ô của nhà đang chọn nhận dạng (`asrHouse`). Ô Groq vẫn RIÊNG (kiểm key, đồng bộ model, Dán, trạng thái), cố ý không gom vì logic khác hẳn. Nhà mới có khả năng nhận dạng chỉ cần khai `clientStore` ở PROVIDERS là có ô key; nhánh chạy nhận dạng của nhà đó ở `start()` vẫn phải viết (mỗi nhà một kiểu gọi). CHƯA bấm thử trên trình duyệt (nhập key, tải lại, key còn). Test thêm ở `provider.test.ts` và `components/provider-admin-board.test.ts`.
  - Ghi chú gốc của kế hoạch (b): Gom giao diện: Admin một mục "Nhà cung cấp" sinh từ PROVIDERS (key, đồng bộ, model, giá, cửa, nhóm) thay `RunDeskBoard`/`AlibabaKeyBoard`/`ProviderKeyBoard` rời nhau (admin-desk.tsx). Phía khách (Thuê phòng): ô nhập key sinh bằng vòng lặp PROVIDERS, nay đang tách `gdg` (Deepgram), `gali` (Alibaba), Groq trong use-pipeline.ts.
(c) [ĐANG LÀM, chia nhỏ c1 đến c3] Model khách dùng được = model key gọi được ∩ Admin cho phép (`rent_show`, rent-show-rule.ts). KHÔNG lưu key khách ở máy chủ, Admin không xem key hay model của từng khách (đã nói với Chủ, chờ Chủ xác nhận nếu muốn khác).
  - c1 [XONG 17/11/2026, v5.1.3 chưa đổi số, chỉ Admin]: bảng Admin «Model khách được chọn khi thuê phòng» dựng bằng `rentRowsFor(nhà, model key phòng)` (`src/lib/rent-rows.ts`, thuần, test `rent-rows.test.ts`) từ danh mục chung (`catalogFor`) cộng model lạ trên key phòng (đọc bằng `getProviderKey`), thay bảng viết tay `HOUSES`. Chỉ liệt kê loại model cửa Thuê phòng chặn được hôm nay (`rentKindsOf`: nhận dạng; dịch và kiểm duyệt chỉ nhà có chat = Groq). Hàng key phòng không thấy có nhãn «(key phòng không thấy)». Luật chặn (`rentUseProblem`, `rentOpen`, `ownKeyAvailable`) KHÔNG đổi. CHƯA bấm thử với key phòng thật.
  - c2a [XONG 17/11/2026, v5.1.3 khách không thấy khác]: ô «Nhận dạng giọng» ở `studio.tsx` sinh bằng `asrPickerRows` (`src/lib/asr-picker.ts`, thuần, test `asr-picker.test.ts` đã vào `npm test`) từ `catalogFor(nhà, "asr")`, thay 4 `<option>` viết tay. Hành vi giữ nguyên: Thuê phòng khóa theo `rentOpen`/«Chủ chưa mở»; Trả theo lượt Groq theo `roomHeld`, nhà khác «chưa có ở cửa trả theo lượt» (ghi chú: Deepgram từ v5.1.2 đã chạy cửa này ở máy chủ nhưng giao diện khách vẫn khóa, chưa sửa vì chưa được yêu cầu). Nhà mới có model asr trong `ASR_MODELS` + `PROVIDERS` tự có hàng. CHƯA bấm thử trên trình duyệt. `eslint` còn 3 lỗi `no-unused-expressions` CŨ ở studio.tsx dòng ~2221, 2431, 2501 (không phải do bước này).
  - c2b [XONG PHẦN KHUNG 17/11/2026, v5.1.3 khách không thấy khác]: `src/lib/sub/key-list.ts` (`KEY_LIST_TRUSTED` kiểu Record theo nhà, `keyListHas`; test `key-list.test.ts`), server fn `listKeyModels` (`src/lib/key-models.ts`, key chỉ đi qua, KHÔNG lưu/ghi nhật ký, địa chỉ cố định theo nhà), `keyModels` ở `use-pipeline.ts` (debounce 0,8 giây, chỉ hỏi nhà có `KEY_LIST_TRUSTED`), `asrPickerRows` nhận `keyModels` và thêm trạng thái `noKey` («key của bạn không có model này»). HIỆN CHỈ GROQ khóa theo key (đúng như trước, qua `app.remoteIds`). Alibaba và Deepgram để `KEY_LIST_TRUSTED=false` VÌ CHƯA KIỂM với key thật (sandbox không gọi được api alibaba/deepgram): Filetrans có thể không nằm trong `/models`, Deepgram trả tên dạng `nova-3-general`. VIỆC CÒN LẠI CỦA C2B: Chủ/phiên sau thử `listKeyModels` với key Alibaba và Deepgram thật, xem model nhận dạng có hiện đúng mã không, rồi đổi `true` ở `key-list.ts` (một dòng mỗi nhà, chỉnh `listedAs` nếu tên lệch). CHƯA bấm thử trình duyệt.
  - c2b (ghi chú gốc) Phần còn lại của c2: model của key KHÁCH cho nhà ngoài Groq giao với danh sách Chủ mở (`ownKeyAvailable`). Việc: (1) thử gọi `listModelIds(key, signal, provider)` trực tiếp từ trình duyệt cho Alibaba/Deepgram (kiểm CORS; nếu bị chặn thì làm server fn chuyển tiếp, KHÔNG lưu key); (2) lưu kết quả theo nhà ở `use-pipeline.ts` (cạnh `houseKeys`), tương tự `remoteIds` của Groq; (3) nạp vào `asrPickerRows` thêm tham số `keyModels` để model không có trên key khách bị khóa «key của bạn không có model này». Chú ý: không đổi luật chặn máy chủ.
  - c2 (ghi chú gốc) Phía khách: danh sách model của key KHÁCH cho nhà ngoài Groq. Hiện chỉ Groq có `app.remoteIds` (đồng bộ key, `ownKeyAvailable(app.remoteIds, groqAllow)` ở studio.tsx ~742). Ô chọn nhận dạng ở studio.tsx ~1169-1180 còn viết tay từng `<option>` (whisper, filetrans, nova-3) chỉ khóa bằng `rentOpen`, chưa giao với key khách. Làm c2: (1) hỏi model của key khách theo nhà qua `listModelIds(key, signal, provider)` (key đi qua máy chủ như `recognizeFileUrl`, KHÔNG lưu), hoặc trực tiếp từ trình duyệt nếu nhà cho CORS (chưa thử, thử trước); (2) `houseKeys` ở use-pipeline.ts (xong ở b3) là chỗ giữ key; (3) ô chọn nhận dạng sinh từ `rentRowsFor`/danh mục thay `<option>` viết tay. Quyết định cần Chủ: nếu key khách gọi được model nhưng Admin chưa mở thì khách KHÔNG dùng được (đúng luật giao), Admin thấy model lạ khi lưu key phòng cùng nhà (c1).
  - c3 [CHƯA, phụ thuộc (d)] Mở rộng bật/tắt cho giọng đọc (Orpheus dùng key khách Groq; Aura chỉ trả Token dịch, KHÔNG có đường key khách nên bật/tắt Thuê phòng vô nghĩa với Aura) và dịch trực tiếp. Cần thêm chỗ CHẶN thật ở `narration.ts`/`live` trước khi cho Admin tick, không thì ô tick chỉ là hình thức. Ghi 17/11/2026 vì vậy c1 cố ý chưa liệt kê hai loại này.
(d) [CHƯA] Dịch trực tiếp: mỗi model tự khai live "thật" / "giả bằng cắt đoạn ngắn" / "không"; Admin chỉ bật cho model làm được. Hai cửa Trả theo lượt và Thuê phòng đã xong cho Deepgram (v5.1.2). Câu hỏi còn mở với Chủ: ép mọi model qua cắt đoạn hay chỉ bật theo khả năng (mình đề nghị theo khả năng).
LUẬT: nhà mới phải đủ cả 3 cửa (Trả theo lượt, Thuê phòng, Dịch trực tiếp) hoặc khai rõ "không hỗ trợ"; `provider-doors.test.ts` kiểm hai cửa đầu.
KHÔNG ghi token GitHub (đã lộ trong chat, Chủ cần thu hồi) vào bất kỳ file nào.
