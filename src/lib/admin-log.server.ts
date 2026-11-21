export type AdminNote = {
  version: string;
  time: string;
  area: "tien" | "quyen" | "ha-tang" | "du-lieu" | "khac";
  text: string;
};

/** Nhật ký nội bộ. Không import từ giao diện khách. */
export const ADMIN_LOG: AdminNote[] = [
  {
    version: "5.28.0",
    time: "16:15 21/11/2026",
    area: "khac",
    text: "v5.28.0, trau chuốt nghe cứng (Chủ chốt bước 3). polish.ts: polishSystem bỏ «return unchanged, character for character» và «improve only what needs improving», thay bằng «Rewrite freely … keep the meaning»; thêm 6 cặp mẫu tiếng Việt cứng → tự nhiên (VI_POLISH_EXAMPLES, chỉ khi đích là tiếng Việt); CTX_BEFORE 8 → 15; PolishOpts.request (cleanPolishRequest, tối đa 300 ký tự) đặt sau ngữ cảnh, TRƯỚC hai luật cố định cuối (không câu từ chối, JSON đúng số câu). groq.ts makePolishCall: POLISH_TEMPERATURE 0.3 (bước dịch vẫn 0). use-polish.ts: request nhớ ở localStorage tyzo_polish_request, gửi qua build() nên ước Token lúc chạy đã tính độ dài; giá hiện ở danh sách model tính trước khi gõ nên có thể thấp hơn chút. polish-panel.tsx: ô Yêu cầu thêm. Bộ kiểm judgePolished giữ nguyên (thuật ngữ, dài bất thường, từ chối). Test polish.test.ts thêm 4 ca. CHƯA so trước/sau với model thật (máy thử không gọi được nhà cung cấp): Admin chạy clip mẫu và xem khung so sánh trước khi coi là xong.",
  },
  {
    version: "5.27.1",
    time: "16:10 21/11/2026",
    area: "khac",
    text: "v5.27.1, đổi chữ hiển thị «Chủ» → «Admin» (Chủ chọn cách (a), 21/11/2026): 57 chỗ trong 25 file (staff-role, audit-note, theme «Cấp Admin», admin-desk, admin-room, các câu «Admin chưa mở…», «Chỉ Admin lưu», «Báo Admin»…). KHÔNG đổi: mã quyền `chu` và nhật ký `bao-chu`, `doi-email-chu` trong dữ liệu; «Chủ tài khoản» (tên chủ tài khoản ngân hàng ở trang chuyển khoản); điều khoản (7 chỗ, gom với lần đổi điều khoản sau để khách không phải đồng ý lại); CHANGELOG cũ; chú thích code; tài liệu dự án cũ.",
  },
  {
    version: "5.27.0",
    time: "16:06 21/11/2026",
    area: "khac",
    text: "v5.27.0, luồng dịch bản nhỏ (Chủ chốt thứ tự 1–5, 21/11/2026). (1) studio.tsx: bước cuối tab (step.last) khi app.reviewHold có nút «Dịch tiếp» (continueAfterReview: đóng tab nếu isStudioSheet rồi approveBible) và nút «Hủy» nhỏ; nút Dịch tiếp đầu trang dùng cùng continueAfterReview. (2) askStop: mọi nút Hủy lượt đang chạy ở bước cuối hỏi lại bằng askConfirm (danger) trước app.cancel; lệnh «Dừng đang chạy» ở Ctrl K giữ như cũ. (3) StepsBar có prop waiting: lúc reviewHold ghi «Đang chờ bạn · …» thay «Đang: Dịch · 0/n câu». (4) customerVisiblePrice(total, hold, running): đang chạy thì ghi đã giữ, TurnPackList nhận running. (5) Hộp Làm lại: trả theo lượt ghi trừ thêm Token dịch cho nhận dạng và dịch, gợi ý Dịch lại bằng model khác; key riêng ghi nhà cung cấp tính phí key. (6) Cài đặt dịch khi đang chạy: dòng báo model mới áp dụng cho lần dịch lại sau (modelSig chốt lúc bấm chạy). studio-layout.test: «một nút Dịch tiếp» đổi thành hai nút cùng một đường. Test mới review-continue.test.ts. CHƯA bấm thử lúc chờ thật (máy thử không gọi được nhà nhận dạng).",
  },
  {
    version: "5.26.0",
    time: "13:52 21/11/2026",
    area: "quyen",
    text: "v5.26.0, Thư — còn lại mục 5: thư «Mật khẩu đã đổi» khi khách tự đổi trong trang tài khoản. auth/server.ts thêm hooks.after (createAuthMiddleware): đường /change-password trả về có user thì sendAuthLetter('changed', email); lỗi (sai mật khẩu cũ: APIError có status/body/statusCode) thì không. Logic ở auth/changed-letter.ts (thuần, có test). Vẫn theo công tắc «Báo khi mật khẩu vừa đổi» (changedOn) và trần gửi lại của mail-runtime; route /api/auth/$ đã chờ thư (flushAuthLetters). Nhãn công tắc ở Admin ghi rõ hai trường hợp. Kiểm trên PGLite: sai mật khẩu cũ → không gửi; đúng → nhận đúng email (dòng nhật ký tạm, đã gỡ). CHƯA nhận thư thật (môi trường thử không có nhà gửi thư). Không sửa điều khoản: điều khoản đã nói email dùng để xác minh và lấy lại mật khẩu, thư này là thông báo bảo mật, tránh bắt khách đồng ý lại ngay sau 2026-11-21.2.",
  },
  {
    version: "5.25.0",
    time: "13:44 21/11/2026",
    area: "du-lieu",
    text: "v5.25.0, đợt 4 bước 2: đếm ẩn danh (Chủ chốt «Cả hai»). (1) Migration 0029 usage_tally (day, topic, answer, n), không có cột tài khoản/mã máy/địa chỉ mạng (test kiểm cột). usage-tally.ts: parseTally chỉ nhận use (phim, lam-phu-de, hoc, khac, skip) và pay (key, turn); tallyWith cộng 1 theo ngày giờ Việt Nam, trần 5000 mỗi ô; usageMixWith ghép số tài khoản lúc này từ room_accounts (gói còn hạn) và token_grants (còn Token, còn hạn): thuê phòng, Token, cả hai, chưa trả gì. (2) recordTally (usage-tally-room.ts) cần đăng nhập nhưng không ghi userId. Máy khách gọi khi trả lời câu hỏi lần đầu (kể cả Bỏ qua) và khi đổi cách trả đã nhớ (chọn lại đúng cách cũ thì không đếm; «Dùng Token lần này» không đếm). Lỗi mạng bỏ qua. (3) Admin → Tổng quan, chỉ Chủ: khối «Khách dùng thế nào» theo khoảng ngày đang xem (Overview.mix). (4) Điều khoản 2026-11-21.2: thêm đoạn ở mục 5. Kiểm: PGLite 5 ca; trình duyệt với tài khoản Chủ thử: chọn Trả theo lượt + Xem phim bộ, khối hiện 1 · 100% mỗi bên. Khách phải đồng ý lại điều khoản một lần. CHƯA chạy trên Neon thật (migration chạy khi build).",
  },
  {
    version: "5.24.0",
    time: "13:37 21/11/2026",
    area: "khac",
    text: "v5.24.0, đợt 4 bước 1: câu hỏi lần đầu. first-ask.ts (thuần, có test): khóa máy tyzo_use (phim, lam-phu-de, hoc, khac, skip); máy chặn đọc thì coi như skip. FirstAskCard ở trang chủ, dưới dòng cách trả; không hiện khi đang chọn cách trả hay đang đọc tài khoản (một câu hỏi một lúc). presetForUse: chỉ «hoc» đổi cài đặt (narration.enabled=false, lưu gnarr như cũ), mọi câu trả lời có toast nói rõ. Chưa gửi câu trả lời lên máy chủ: bước 2 (đếm ẩn danh) làm cùng điều khoản. Kiểm Chromium 412x720 sáng/tối: thẻ hiện, bấm Học ngoại ngữ thì toast, thẻ mất, tải lại không hỏi lại.",
  },
  {
    version: "5.23.0",
    time: "13:28 21/11/2026",
    area: "khac",
    text: "v5.23.0, đợt 3 sắp lại trang khách. (1) home-action.ts (thuần, có test): nút chính trang chủ theo trạng thái. Thứ tự: đang chạy → bảo trì → mất mạng → cách trả (choose: «Chọn cách trả để bắt đầu», cuộn và focus dòng hai lựa chọn; key-none: «Thêm key để dịch», mở Cài đặt dịch; key-expired: «Gia hạn để dịch» và turn-empty: «Mua Token dịch», mở Ví) → chưa có tệp → Tải và dịch. Đang đọc hoặc lỗi đọc tài khoản thì không chặn (máy chủ vẫn kiểm ở cửa giữ tiền). Tắt tiền (money.on false) bỏ qua cách trả. Mỗi trạng thái chưa bấm được có dòng vì sao dưới nút (aria-describedby). studio.tsx tính payState một lần, dùng chung cho PayStatusBar và nút; HomeHero bỏ running/online/blocked/onStart, nhận action/onAction. (2) Thanh dưới trang khách 4 việc: Trang chủ, nút lướt công cụ, Ví, Menu; FloatingDock thêm showLabels (trang khách luôn có chữ, Admin giữ như cũ). Bỏ nút Trực tiếp vì đã có ô Dịch trực tiếp (ServiceSwitch) đầu trang chủ và mục trong Menu. (3) Điện thoại ngang: trang chủ chừa thêm đáy (pb-14) để dòng vì sao không nằm dưới nhãn bánh xe. Kiểm Chromium 412x720, 412x640 sáng/tối, bật/tắt hiệu ứng, 800x400, 768x1024: không tràn ngang, không lỗi trang; bấm Thêm key mở Cài đặt dịch, Mua Token dịch mở Ví. Không đổi dịch vụ, không sửa điều khoản. CHƯA bấm máy thật, CHƯA thử key-ready thật và bảo trì thật.",
  },
  {
    version: "5.22.0",
    time: "21/11/2026",
    area: "khac",
    text: "v5.22.0, đợt 2 sắp lại trang khách. (1) key-ring.tsx thay 6 ô key: danh sách key đã thêm (nhà, việc làm được từ providerDoes, trạng thái: Groq theo keyStatus, nhà khác theo keyModels: đang kiểm/hợp lệ N model/chưa đọc được/quá ngắn), Sửa, Xóa (askConfirm); Thêm key → chọn nhà (PROVIDER_IDS) → dán. Khối thêm giữ chỗ tới khi bấm Xong để gõ không mất con trỏ; hàng đang sửa không biến mất khi ô tạm trống. Mốc tour key-input chuyển lên khung danh sách (luôn hiện). (2) Sửa lỗi sẵn có: key Groq trước chỉ lưu lúc bấm chạy (tải lại trước đó là mất) → storeGroqKey lưu khi đủ 20 ký tự; xóa trắng key nhà khác trước không xóa khỏi kho (tải lại hiện lại) → removeStore. (3) Ví (account-panel.tsx): tài khoản → khối của cách trả đang dùng (tyzo_pay) → khối kia → lịch sử → tên, mật khẩu → Cần giúp; khóa/cấm thì ô gửi yêu cầu vẫn trên cùng. Bỏ chữ lặp (cửa trả theo lượt một dòng, kệ Token dịch không lặp tiêu đề và số dư, dùng thử không nói hai lần). (4) Tour và Hướng dẫn tả cách Thêm key; chữ «Groq cần cho dịch» thay bằng nhà có model dịch (providersWith). Kiểm: thêm/gõ/Xong/tải lại/xóa/tải lại, key Groq còn sau tải lại; Ví hai thứ tự; 12 tổ hợp màn. CHƯA kiểm tài khoản bị khóa thật, gói và Token thật, máy thật.",
  },
  {
    version: "5.21.0",
    time: "21/11/2026",
    area: "khac",
    text: "v5.21.0, đợt 1 sắp lại trang khách (theo cách nghĩ huongdan.txt A–E). (1) pay-status.ts (thuần, có test): trạng thái cách trả theo lựa chọn đã nhớ (localStorage tyzo_pay), gói thuê phòng còn hạn/dùng thử/hết, key khách theo bảng nhà (PROVIDER_IDS), Token còn/hết, cửa trả theo lượt mở/đóng, đọc tài khoản lỗi. PayStatusBar thay thanh số dư và hai chip Key của tôi/Nhập key: chưa chọn thì hai cách ngang hàng; thuê phòng chưa key thì Lấy key (/huong-dan#key-groq), Thêm key, Dùng Token lần này (không đổi lựa chọn đã nhớ), Đổi cách trả; hết hạn thì Gia hạn; hết Token thì Mua Token hoặc Dùng key. Sửa câu «đang dùng key của bạn» hiện cả khi chưa có key. Cửa trả theo lượt bảo trì thì lùi về key và báo (toast). Mọi nút đổi cách trả qua choosePay. useMoney có failed + Thử lại. (2) DisplayToggle thành một nút Hiển thị mở bảng có chữ (Giao diện, Khoảng cách, Cỡ chữ, Hiệu ứng, Màu nhấn); AccentPicker có chế độ inline để không chồng bảng; bảng dừng trên thanh dưới, đóng khi bấm ngoài hoặc Esc. Dùng chung ở phòng dịch, Hướng dẫn, Dịch trực tiếp. (3) dock-scrim cao theo vùng đệm từng hướng màn (đứng 10rem, ngang và máy tính bảng 6rem) để nút cuối không bị che khi cuộn hết (đo 800x400, 412x720, 768x1024). Kiểm 12 tổ hợp (đứng/ngang/máy tính x sáng/tối x bật/tắt hiệu ứng): không tràn ngang, không lỗi console. Không đổi dịch vụ, không sửa điều khoản. CHƯA bấm thử máy thật.",
  },
  {
    version: "5.20.1",
    time: "21/11/2026",
    area: "khac",
    text: "v5.20.1, sửa lệch khung trên điện thoại (ảnh Chủ gửi, giao diện sáng). (1) Hàng nút đầu trang (VersionMark, DisplayToggle, chuông) không co, rộng 442 px trên màn 412 px, đẩy .studio-shell rộng hơn màn và cắt chuông: cho flex-wrap, justify-end. (2) Từ v5.18.2 nội dung cuộn xuống sau dock, thanh trong suốt nên lộ ra quanh và dưới mép dock: thêm .dock-scrim (floating-dock.tsx, z-20, dưới dock z-30 và dưới bảng công cụ z-40), mờ dần 1,75rem rồi đặc màu nền; cao 10rem khi có nhãn bánh xe, 6,5rem khi không. Cuộn hết thì nút cuối (Tải và dịch) vẫn trọn trên lớp mờ (đo 412x720: đáy nút 528, lớp mờ bắt đầu 560). Đã chụp sáng và tối. CHƯA bấm thử máy thật.",
  },
  {
    version: "5.20.0",
    time: "21/11/2026",
    area: "khac",
    text: "v5.20.0, hạn chế rủi ro bản quyền theo mô hình công cụ SaaS AI (Chủ chọn: bỏ «phim mới chiếu», gộp 3 loại người lớn; giữ lưu tên tệp như cũ; xác nhận quyền mỗi tệp; đổi toàn bộ cách gọi). (1) Thể loại: GENRES bỏ series/softcore/sex; adult = «Phim có nhãn 18+», prompt dịch đúng mức bản gốc; currentGenre đổi mã cũ (softcore, sex → adult; series → auto) khi đọc lựa chọn đã lưu, thuật ngữ, prompt, glossaryPair. File thuật ngữ gộp (softcore+sex → adult, series → daily); migration 0027 chuyển glossary_terms/suggestions/packs đã nạp (trùng thì giữ bản ở loại đích; đã thử trên PGlite). (2) rights-consent.ts: hộp xác nhận trước lần xử lý đầu của mỗi tệp/link (trước khi gửi nội dung hay tốn tiền); máy khách nhớ mã băm FNV-1a 64 bit, không nhớ tên tệp; recordRightsConsent + migration 0028 rights_consents (user_id, media_hash, terms_version, confirmed_at) cho cả hai cửa. (3) Chữ: «Phòng chiếu TyZo Sub» → «TyZo Sub · Công cụ phụ đề AI», «file Vietsub» → «file phụ đề», ví dụ link video.mp4, tab Phim → Video, Ghi chú/Phân tích phim → nội dung; /goi và Ví không còn ghi riêng Groq. CHANGELOG cũ giữ nguyên. (4) Điều khoản 2026-11-21.1: mục 1 SaaS, không cung cấp/phát hành/lưu trữ nội dung; mục 2 xác nhận mỗi tệp + bản ghi; mục 3 vai trò công cụ, những việc cấm, thông báo-gỡ (nội dung cần nêu), giải trình, vi phạm lặp lại, cơ quan nhà nước; mục 7 người dùng chịu chi phí khiếu nại của bên thứ ba; mục 10 khóa khi đang xem xét khiếu nại. Hướng dẫn: cách gửi khiếu nại bản quyền. CHƯA có luật sư xem điều khoản.",
  },
  {
    version: "5.19.0",
    time: "20/11/2026",
    area: "khac",
    text: "v5.19.0, dịch bằng nhiều nhà, không viết riêng nhà nào (Chủ yêu cầu: mọi nhà, nhà mới cũng vậy). Gốc: lỗi «Model này không có trong cửa trả theo lượt»: máy chủ chặn theo run_models (danh sách key Groq phòng), còn chế độ Tự động lại chọn theo key khách nên ra minimax/llama phòng không có. Đã làm: (1) bảng nhà khai đường dịch (provider.ts chat), Alibaba có chat + Qwen Plus/Max/Turbo trong CHAT_MODELS; model lạ ảnh/nhúng/âm thanh không bị xem là model dịch. (2) Bảng giá theo nhà price-rows.ts + price-books.server.ts (Record đủ mọi nhà); holdGiay tính giá dịch theo nhà của model dịch. (3) run-turn, polish-room, model-call dùng room-turn.ts (roomUse, dearestRoomChat): nhà của model, key phòng, danh sách phòng, giá; bỏ sáu nhánh viết tay. (4) Một cửa chung /api/model-call (phòng + chuyển key khách), bỏ room-alibaba/relay-alibaba (không ai gọi, cửa phòng quy Token sai vì thiếu bảng Turbo; chargeWith có unitBook). (5) App: chatCall gọi theo nhà của model, chatKeyOf đưa key từng nhà, Tự động chỉ chọn nhà có key/phòng mở, kiểm key trước khi chạy theo nhà; ô chọn model có nhãn nhà. (6) Gói dịch vụ: ROLE_CAP (việc → khả năng); providersForRole theo khả năng (thuyết minh nay là Groq + Deepgram, Alibaba chưa có đường đọc); turnPackProblem bỏ luật «Alibaba chỉ nhận dạng». (7) provider-doors.test.ts thêm phần dịch. (8) Điều khoản 2026-11-20.1 nêu nơi gửi chữ để dịch. Thử thật: /api/model-call chặn đúng (401/400/403) và chuyển key khách tới Alibaba. CHƯA thử: một lượt dịch thật bằng Qwen (cần key Alibaba), cửa phòng trừ Token thật. Chủ cần: lưu key Alibaba phòng ở Admin rồi đồng bộ; mở Qwen ở bảng Thuê phòng nếu muốn khách thuê dùng; gói đã lưu có thuyết minh Alibaba sẽ phải đổi khi lưu lại.",
  },
  {
    version: "5.18.2",
    time: "20/11/2026",
    area: "khac",
    text: "v5.18.2, sửa dải che góc dưới khi tắt hiệu ứng (ảnh Chủ gửi). Bản 5.18.1 rút .studio-shell (điện thoại đứng) thấp hơn màn hình 11rem, nên vùng cuộn dừng giữa chừng và cắt nội dung thành một đường ngang trên dock; bật hiệu ứng thì lưới nền làm khó thấy. Nay khung cao hết màn hình, 11rem chuyển thành padding-bottom (--dock-clear): vùng nội dung vẫn dừng trên dock như cũ nhưng phần cuộn chạy xuống sau dock. Đã thử Chromium 412x760, cả hai chế độ hiệu ứng. CHƯA bấm thử trên điện thoại thật.",
  },
  {
    version: "5.18.1",
    time: "20/11/2026",
    area: "khac",
    text: "v5.18.1, sửa chỗ đè trên điện thoại (ảnh Chủ gửi). 1) Phòng dịch đứng: .studio-shell cao bằng màn hình trừ 11rem cộng tai thỏ, nên dock và nhãn bánh xe (Phim · n/5) không đè Bản dịch, nút Sửa hay thanh tua. 2) Tấm Ví: .account-grid trong .studio-wallet-body xếp một cột, bỏ column-width, để câu điều kiện gói không đè nút Ngày/Tuần/Tháng. 3) Admin: thanh «Tổng quan / Tìm» không còn sticky trong vùng cuộn; chỉ phần nội dung cuộn, thanh đứng trên. Thẻ khách gập thêm Ghi chú, Bảo mật (mật khẩu tạm, khóa, cấm), Quyền. CHƯA bấm thử trên điện thoại thật.",
  },
  {
    version: "5.18.0",
    time: "20/11/2026",
    area: "khac",
    text: "v5.18.0. 1) Đọc file: stage-progress trọng số cắt/nhận dạng/dịch/sửa = 5/15/70/10. Phase read hiện phần trăm ước (readRatio, trần 92%) và số giây, không đứng 0%. use-pipeline bật timer 500ms theo dung lượng rồi xóa ở finally. steps-bar vạch ở 5/20/90. 2) SRC_LANGS thêm auto «Tự động». asrLanguageOf đổi auto thành rỗng khi gọi nhận dạng. normalizeLang('auto') trả rỗng nên không nạp thuật ngữ (trước đây cắt thành mã au và báo lỗi). 3) Khi lần chạy dừng, không còn câu chờ và có ít nhất một bản dịch: khung Trau chuốt / Dịch lại bằng model khác (mở tab key, giữ nhận dạng) / Bỏ qua. Nút Tiếp tục ở đầu trang khi buttonLabel là Tiếp tục. MoneyCard đưa lên trên thanh tiến độ. 4) seg.talk ghép mốc từ, tách khi im hơn 0,45 giây (talkField trong text.ts, nối ở acceptSegment). speechIndex không đọc ngoài các khoảng talk. Giọng cloud lỗi thì bỏ câu và báo một lần (onFail), không rơi xuống giọng máy. Nếu đang đọc thì xếp hàng tối đa 8 câu. 5) Admin, không đổi điều khoản và khách không thấy: Quản lý đặt Token dịch còn hạn (readUserTokens, setUserTokens, setTokenBalanceWith: thêm thì gói mới hạn 365 ngày giá 0, bớt thì gói sắp hết hạn trước), hộp xác nhận của app, nhật ký chinh-token. Sổ tiền và phiếu gập bằng Fold. Điện thoại: admin-bar z-5 nằm dưới header trang z-40; notice-panel z-80; studio đứng chừa chỗ dock và ẩn dòng hạn gói. CHƯA bấm thử trên điện thoại thật.",
  },
  {
    version: "5.17.7",
    time: "20/11/2026",
    area: "khac",
    text: "Admin → Chất lượng có thêm khối «Chấm nhận dạng (dán SRT)» (src/components/asr-score-panel.tsx, logic thuần ở src/lib/sub/asr-score-view.ts, test asr-score-view.test.ts 4 ca). Dán SRT gốc của bất kỳ nhà nhận dạng nào, chọn ngôn ngữ, (tùy chọn) độ dài video và đáp án: ra Đạt / Đạt có cảnh báo / Không đạt cùng chữ mỗi giây, câu thưa, câu bịa, lệch ngôn ngữ, lặp, sai khác so với đáp án. Chạy hoàn toàn trong trình duyệt (scoreAsr), không gọi máy chủ, không lưu. Không đổi hành vi khách nên không nâng phiên bản và không vào CHANGELOG. Ngưỡng là mức chung nên thoại thưa thật có thể bị báo oan. CHƯA bấm thử trên trình duyệt thật.",
  },
  {
    version: "5.17.7",
    time: "20/11/2026",
    area: "khac",
    text: "Cảnh báo khách khi nhận dạng quá thưa: src/lib/sub/sparse-note.ts (sparseSpeechNote, dùng scoreAsr của asr-score.ts) nối một câu nhắc vào dòng «Hoàn tất» ở use-pipeline.ts. Điều kiện: ngôn ngữ nguồn zh/ja/ko/en, tổng đoạn từ 20 giây, và scoreAsr báo «quá thưa» (dưới 1,5 chữ/giây với zh/ja/ko, dưới 6 với en) hoặc có câu dài mà ít chữ. Cố ý KHÔNG báo vì câu bịa hay lệch ngôn ngữ (chưa đo đủ). Chữ đo là chữ thô của Whisper (raw, rồi original). Rủi ro: thoại thật sự thưa (ít lời, nhiều nhạc) có thể bị nhắc oan; chỉnh DEFAULT_THRESHOLDS hoặc SPARSE_MIN_SECONDS nếu thấy nhắc oan nhiều. Test: sparse-note.test.ts 6 ca. CHƯA thấy trên giao diện thật.",
  },
  {
    version: "5.17.6",
    time: "20/11/2026",
    area: "khac",
    text: "Thêm bộ ĐO nhận dạng tự động (chỉ công cụ dòng lệnh + test, không đổi hành vi app, không nâng phiên bản): npm run asr:score -- file.srt --lang zh [--ref ..] chấm một SRT của bất kỳ nhà cung cấp nào (chữ/giây, câu thưa, câu bịa, lệch ngôn ngữ, lặp, CER/WER); GROQ_API_KEY=... npm run asr:bench so các biến thể prompt: default, noprompt, noguard, guard, × model trên clip trong eval/asr/cases.json, thoát mã 1 nếu bản default HỎNG. Prompt chỉ đi qua đường Groq Whisper; các nhà cung cấp khác không dùng prompt nên v5.17.6 không ảnh hưởng. Chưa chạy với Groq thật; đáp án mẫu chưa duyệt tay. Xem eval/asr/README.md.",
  },
  {
    version: "5.17.6",
    time: "20/11/2026",
    area: "khac",
    text: "Sửa lỗi Whisper large-v3 bỏ lời: ASR_GUARD (câu tiếng Anh «Ignore breathing… Only transcribe clear words…») nay chỉ gửi cho thể loại sex/softcore/adult (ASR_GUARD_GENRES ở text.ts); các thể loại khác chỉ gửi tên phim + thuật ngữ. Số đo của Chủ trên clip «Tiểu hòa thượng»: prompt đủ 2 câu; ?asrtest=noprompt 11 câu đúng; ?asrtest=noguard 11 câu, giống hệt noprompt; chunk15 xấu hơn (ảo giác, lặp ở chỗ nối) nên GIỮ CHUNK_SECONDS 60. asrPrompt(title, gloss, genre) nhận thêm thể loại ở cả 4 chỗ gọi trong use-pipeline.ts. CHƯA kiểm: phim 18+ thật vẫn dùng ASR_GUARD nên có thể vẫn bị bỏ lời; cần clip 18+ để thử ?asrtest=noguard. Khách thấy qua CHANGELOG 5.17.6.",
  },
  {
    version: "5.17.5",
    time: "20/11/2026",
    area: "khac",
    text: "Thêm công tắc THỬ ?asrtest=noguard (vẫn gửi tên phim/thuật ngữ, bỏ câu ASR_GUARD tiếng Anh khỏi prompt Whisper), mặc định TẮT, không đổi hành vi, không nâng phiên bản. Lý do: Chủ đã thử clip «Tiểu hòa thượng» với large-v3: prompt đủ chỉ ra 2 câu, ?asrtest=noprompt ra 11 câu đúng, chunk15 ra 6 câu (có ảo giác, mất lời), noprompt+chunk15 ra 13 câu nhưng vụn/lặp. Cần tách xem phần nào của prompt gây bỏ lời trước khi sửa mặc định (ASR_GUARD còn cần cho phim 18+).",
  },
  {
    version: "5.17.5",
    time: "20/11/2026",
    area: "khac",
    text: "Công tắc THỬ nhận dạng, mặc định TẮT (không đổi hành vi, không nâng phiên bản). Mở app với ?asrtest=noprompt (không gửi prompt tên phim/thuật ngữ/ASR_GUARD lên Whisper), ?asrtest=chunk15 (cắt đoạn 15 giây, số từ 8 đến 60), ghép bằng dấu phẩy, ?asrtest=off để tắt; lưu trong trình duyệt, khi bật có dòng báo ở đầu lượt chạy. File mới src/lib/sub/asr-test.ts (+ test 4 ca), text.ts (chunkSeconds(), asrPrompt), chunk-plan.ts. Lý do: clip «Tiểu hòa thượng» chạy Groq large-v3 chỉ ra 2 câu; chạy Whisper cục bộ (sherpa-onnx, scripts/whisper-local-check.py) thì cả turbo và large-v3 chép đủ 30 giây đầu, kể cả sau nén Opus 20 kbps, nên lỗi nằm ở prompt hoặc cách Groq giải mã, chưa kiểm với Groq thật.",
  },
  {
    version: "5.17.5",
    time: "20/11/2026",
    area: "khac",
    text: "Chủ báo sau v5.17.4 video «Tiểu hòa thượng» chạy Groq vẫn chỉ ra 4 câu (trước là 3). Không gọi được Groq/Whisper thật từ đây (mạng chặn), nên chưa thấy JSON thô; suy luận: Whisper trả các segment tiếng Trung khoảng 30 đến 40 chữ chứa 3 đến 5 câu, sát hoặc dưới ngưỡng tách 30 chữ của whisper-split.ts nên đứng yên (Alibaba ra 15 câu vì tách ở mọi dấu câu). SỬA (chỉ CJK, chữ khác giữ nguyên): LONG_AT cjk 30→14, TARGET cjk 24→18, HARD_MAX cjk 40→28 (MIN_SENTENCE 4 giữ). Nghĩa là segment CJK từ 14 chữ có dấu câu đã được tách theo câu, không dấu câu mà > 28 chữ thì chia đều; câu đơn ≤ 14 chữ hoặc ≤ 28 chữ không dấu giữ một dòng. Test thêm 1 ca (2 câu dưới 30 chữ), sửa ca ngưỡng tách cứng. NẾU VẪN ÍT: xuất chẩn đoán (RawAsrPart) để xem Whisper trả bao nhiêu segment, có dấu câu và words không; không dấu câu thì chỉ còn chia đều theo chữ.",
  },
  {
    version: "5.17.4",
    time: "20/11/2026",
    area: "khac",
    text: "Groq (Whisper) chỉ ra 3 câu cho video thoại liền mạch (clip «Tiểu hòa thượng» 34 giây, khoảng 15 đến 17 câu thật, không có quãng lặng ≥ 0,25 giây ở -35 dB). NGUYÊN NHÂN: ingestAsrPart (diagnostics.ts) đưa nguyên từng segment Whisper vào phụ đề; Whisper cắt segment theo quãng lặng/cửa sổ chứ không theo câu nên một segment chứa nhiều câu. Alibaba đã sửa trước bằng splitLongSegment (ali-filetrans.ts) nhưng đường Whisper chưa có. SỬA: src/lib/sub/whisper-split.ts (thuần, test whisper-split.test.ts, 9 ca, đã vào script test) splitLongSegment: chỉ tách khi segment dài (> 30 chữ nhìn thấy với CJK, > 100 với chữ khác); tách theo dấu câu (。！？.!? và …), gộp mảnh ngắn (< 4 chữ CJK / 12 chữ khác) và nhóm mảnh tới khoảng 24 chữ CJK / 70 chữ khác; «.» chỉ tính khi theo sau là khoảng trắng, «,» «:» không tính giữa hai số; không có dấu câu mà > 40 chữ CJK / 140 chữ khác thì chia đều; mốc từng mảnh lấy theo words của Whisper (chữ thứ a đến b rơi vào từ nào lấy mốc từ đó, bỏ qua nếu tổng chữ của words lệch > 25% so với câu) hoặc chia theo số chữ; mảnh không chồng nhau, nằm trong [start, end]. diagnostics.ts ingestAsrPart: segment dài đi qua splitLongSegment rồi MỖI MẢNH qua acceptSegment (cùng bộ lọc ảo giác/độ tin, dùng chung chỉ số Whisper của segment gốc); segment ngắn giữ đường cũ nguyên. Diagnostics thô (RawAsrPart.segments, «N câu Whisper trả về») vẫn là segment gốc. Không đổi giá, quyền, điều khoản.",
  },
  {
    version: "5.17.3",
    time: "20/11/2026",
    area: "khac",
    text: "Giá thuê phòng Chủ chỉnh được (hướng 2: lưu trong cơ sở dữ liệu). Bước 1 room-plan-prices.ts (thuần, test): chỉ giá và giá gạch đổi được, mã gói/tên/số giờ cố định; kiểm nguyên đồng, 1.000 đến 5.000.000, giá gạch > giá bán, gói dài đắt hơn gói ngắn; số tiết kiệm tự tính. Bước 2 room-plans-room.ts: khóa room_settings.room_plans, getRoomPlanPrices (ai cũng đọc), saveRoomPlanPrices/resetRoomPlanPrices (chỉ Chủ, ghi nhật ký hành động doi-gia-goi). room-account.ts orderRoomPlan lấy giá đang lưu LÚC ĐẶT ĐƠN. QUAN TRỌNG pay-flow.ts settleDirect: trước đây từ chối giao gói nếu plan.price !== order.amount (đổi giá sẽ làm khách đang chờ chuyển đúng số cũ không được giao gói); nay chỉ kiểm số tiền nằm trong khoảng cho phép và giao theo order.amount (2 ca PGlite ở money-flow.test.ts). Bước 3 giao diện: use-room-plans.ts (hook, mặc định ngay rồi thay bằng giá đã lưu), goi.tsx, account-panel.tsx, terms-document.tsx, admin-desk.tsx, guide-page.tsx, studio.tsx, guide-topics.ts đọc giá động; room-plans-view.tsx thành bảng sửa giá cho Chủ (hộp xác nhận của app, nút «Về giá mặc định»). entry-gate.test.ts: dấu vân tay điều khoản quy ROOM_PLANS.map về plans.map để đổi cách lấy giá không bị tính là đổi chữ. KHÔNG nâng TERMS_VERSION (2026-11-18.1): điều khoản chỉ liệt kê giá và tự đọc giá động; nếu Chủ muốn khách xác nhận lại mỗi lần đổi giá thì phải hỏi Chủ rồi mới thêm. Đổi giá không đụng giá đơn đã tạo, quyền, cách giữ/trừ Token dịch.",
  },
  {
    version: "5.17.2",
    time: "20/11/2026",
    area: "khac",
    text: "Thuyết minh trễ (mục 3 HANDOFF). Mới src/lib/sub/narration-sync.ts (thuần, có test): đo độ trễ tạo giọng thật từng loại (trung bình trượt, mặc định edge 0,8 / orpheus 1,3 / aura 1,0 / máy 0,1, bù tối đa 1,8 giây), tạo trước 2 câu kế, chờ đúng lúc khi tiếng đã có sẵn, ước thời lượng so với khoảng thoại và tăng tốc tối đa 1,3 lần. narration.ts: bộ nhớ đệm có gộp yêu cầu đang chạy (đọc thật và tạo trước không gọi hai lần cùng một câu, tránh tính tiền đôi Orpheus/Aura), stop() hủy cả tạo trước, giọng máy không tạo trước. studio.tsx: Stage đọc sớm theo effectiveLead(lead tay, độ trễ bù), speakAt gọi tạo trước. Ô lead giữ nguyên. LƯU Ý CHI PHÍ: Orpheus/Aura (có phí) tạo trước 2 câu nên có thể tính tiền cả câu chưa kịp đọc nếu khách tua. Không đổi giá, quyền, điều khoản.",
  },
  {
    version: "5.17.1",
    time: "20/11/2026",
    area: "khac",
    text: "Theo ảnh Chủ gửi trên v5.17.0. studio.tsx: chip «Trả bằng» thành div trạng thái + nút «Đổi» (studio-pay-change) mở tab run; KEY_MODE_TIP bỏ nói riêng Groq. money-card.tsx MoneyEstimate: chỉ hiện khi estimate.enough=false (thiếu số dư), bỏ câu giữ Token theo gói rẻ nhất và câu nhắc chọn tệp. Không đổi giá, quyền, cách giữ/trừ. Sửa studio-layout.test.ts.",
  },
  {
    version: "5.17.0",
    time: "20/11/2026",
    area: "khac",
    text: "Trang khách thành chuỗi bước theo yêu cầu Chủ. studio-steps.ts (+ test): STEP_ORDER key, phim, cast, voice, run; stepInfo. Tab mới `run` «Tải và dịch» (TOOL_NAME.run, TOOL_ICON.run, TOOLS, MENU_TOOL_ORDER nay key, phim, cast, thuatngu, voice, run, check; nút vàng WHEEL_ORDER giữ nguyên 4). studio.tsx: khối `.studio-sticky-head` (thanh tiêu đề tab + thanh `.studio-step-bar` có «Tiếp tục»), dính đầu tab; ở tab run nút đó là nút chạy/dừng (data-tour=run, app.start/cancel, điều kiện khóa như cũ). Cách trả + TurnPackList dời từ tab Cài đặt dịch sang tab run; tab Cài đặt dịch giữ ô key (khi trả theo lượt hiện dòng chỉ xuống bước cuối). Bỏ run-bar dính đáy ở tab Phim và dòng «Tiếp theo:» cuối tab (xóa CSS .studio-next-tool, .studio-run-bar). Tour: TourStep.tab (sự kiện tyzo-tab), bước «Dịch» của quick-start chỉ tab run. Sửa studio-layout.test.ts và tool-wheel.test.ts theo luồng mới.",
  },
  {
    version: "5.16.2",
    time: "20/11/2026",
    area: "khac",
    text: "Hai sửa theo ảnh của Chủ. (1) Câu «Dùng được N model» (use-pipeline.ts refreshModels) trước chỉ đếm model Groq; nay cộng mọi nhà: Groq (danh sách trực tiếp) + nhà khác (key khách: listKeyModels cho mọi nhà đã nhập key, trước chỉ nhà KEY_LIST_TRUSTED; key phòng: server fn mới getRoomModelCounts trong provider-room.ts, đọc số model đã lưu, không trả key hay tên model). Hàm thuần model-total.ts (modelTotal, modelTotalText). Việc khóa model vẫn qua keyListHas nên nhà chưa đáng tin không bị khóa oan. (2) Nhãn «(key phòng không thấy)» ở bảng Thuê phòng và Trả theo lượt: rent-rows.ts dùng so khớp includes nên Deepgram (tên nova-3-general) và Alibaba bị báo oan; nay dùng roomListHas (key-list.ts): nhà chưa đáng tin không khớp thì là null (không nhãn), chỉ Groq mới báo false. Test: model-total.test.ts.",
  },
  {
    version: "5.16.1",
    time: "20/11/2026",
    area: "khac",
    text: "Sửa logic tab công cụ (tấm trượt) trên điện thoại / màn thấp: (1) studio.tsx thêm hiệu ứng đóng tấm trượt (setSheetOpen(false)) khi app.running hoặc app.analyzing chuyển từ tắt sang bật, chỉ khi isStudioSheet(); mở lại do reviewHold vẫn giữ. (2) Hướng dẫn «Chỉ tôi»: TourStep có trường sheet (open|closed), guided-tour.tsx gửi sự kiện tyzo-sheet khi vào bước, studio.tsx nghe và mở/đóng tấm trượt; tuyến quick-start bước 5 và các bước ở khung phát/bản dịch ghi closed, bước trong tab ghi open. Trước đó tab Phim che nút Tải phụ đề ở bước 5 nên khung sáng lệch. Test thêm ở studio-layout.test.ts và guide-topics.test.ts.",
  },
  {
    version: "5.16.0",
    time: "20/11/2026",
    area: "khac",
    text: "Bước 5 sắp xếp lại trang khách: khách tự chọn cỡ chữ 3 mức. theme.ts thêm FONT_KEY (tyzo_font), USER_FONTS (Vừa 1, Lớn 1.125, Rất lớn 1.25), fontValue, pickUserFont, fontScript (chạy đầu trang, đặt --user-font); styles.css: font-size html = 100% × --font-scale (Admin) × --user-font (khách); __root.tsx chèn fontScript; DisplayToggle có nút «Aa» xoay vòng. Bố cục máy tính bảng/máy tính (từ 1024px: video và bản dịch bên trái, công cụ bên phải) đã có từ trước, không đổi. Test fontScript trong theme.test.ts.",
  },
  {
    version: "5.15.0",
    time: "20/11/2026",
    area: "khac",
    text: "Bước 4 sắp xếp lại trang khách: tab «Ngữ cảnh» (id cast, TOOL_NAME.cast) có 3 nhánh theo trạng thái ctxView (cast, terms, note), nhánh ẩn bằng hidden nên ô nhập không mất dữ liệu. Tab tool-thuatngu cũ bỏ; openTool/pickTool đổi «thuatngu» thành cast + ctxView terms; menu dựng từ MENU_TOOL_ORDER (vẫn có lối tắt Thuật ngữ, domId tool-tab-thuatngu cho tour). WHEEL_ORDER còn 4. Ô «Bảng thuật ngữ» (app.gloss) chuyển từ Ghi chú sang nhánh Thuật ngữ. Khi dừng xem bảng nhân vật (reviewHold) tự về nhánh Nhân vật. Sửa tool-wheel.test, studio-layout.test.",
  },
  {
    version: "5.14.0",
    time: "20/11/2026",
    area: "khac",
    text: "Bước 3 sắp xếp lại trang khách: tab Phim (studio.tsx) chỉ còn chip Trả bằng, ngôn ngữ, thể loại, ô Video, link; Âm thanh riêng và hướng dẫn file lớn gập trong details «Tùy chọn thêm: âm thanh riêng, file lớn» (tự mở khi đã chọn âm thanh). Nút Tải và dịch đã dính đáy sẵn (CSS .studio-run-bar). Thêm 1 ca trong studio-layout.test.ts.",
  },
  {
    version: "5.13.0",
    time: "20/11/2026",
    area: "khac",
    text: "Bước 2 sắp xếp lại trang khách: bỏ «key» khỏi WHEEL_ORDER (nút vàng còn 5 công cụ), nextTool nhận string, TOOL_NAME.key đổi thành «Cài đặt dịch» (đổi cả tour-steps, guide qua keyTab), TOOL_ICON nhận thêm «key». Menu Dịch bình thường dựng từ WHEEL_ORDER + key. Tab Cài đặt dịch: Cách trả và ô key hiện sẵn; Cách dịch, model, Nhận dạng giọng, ô tick, Số luồng gập trong «Nâng cao: model và nhận dạng» (details đóng). Chip «Trả bằng» ở tab Phim vẫn mở tab này. Sửa tool-wheel.test.ts và studio-layout.test.ts.",
  },
  {
    version: "5.12.0",
    time: "20/11/2026",
    area: "khac",
    text: "Bước 1 sắp xếp lại trang khách: thành phần dùng chung src/components/info-tip.tsx (nút (i), Popover Radix, chuột rê mở, điện thoại bấm mở). studio.tsx: Select có tham số tip; ghi chú giải thích của Bản dịch, Cách trả, Nhận dạng giọng, hai ô tick nhận dạng, Số luồng, Phân tích phim, Thuyết minh, Đọc theo nhân vật chuyển vào (i). Lỗi và cảnh báo vẫn hiện sẵn. Test info-tip.test.ts.",
  },
  {
    version: "5.11.0",
    time: "20/11/2026",
    area: "du-lieu",
    text: "Thêm nút «Nạp hết bộ còn thiếu» ở Admin → Thuật ngữ. Một lần nạp mọi từ trong file gốc mà phòng chưa có (bộ mới như Kiếm hiệp, Tiên hiệp không còn phải khôi phục từng bộ). Từ đã có không bị ghi đè. Không nâng APP_VERSION.",
  },
  {
    version: "5.11.0",
    time: "19/11/2026",
    area: "du-lieu",
    text: "Chủ không duyệt tay hàng nghìn mục thuật ngữ. Bỏ cờ «chưa duyệt» trong file gốc (mục không ghi cờ thì lúc nạp/khôi phục coi là đã duyệt). Thêm nút «Duyệt hết» ở Admin → Thuật ngữ: một lần đánh dấu đã duyệt mọi mục đang chưa duyệt trong phòng. Không nâng APP_VERSION.",
  },
  {
    version: "5.11.0",
    time: "19/11/2026",
    area: "du-lieu",
    text: "B1.3a bản nháp thuật ngữ 5 thể loại còn thiếu (zh, en): thêm data/glossaries/{zh,en}/{social,war,family,school,documentary}.json (tâm lý xã hội, chiến tranh, gia đình, học đường, tài liệu; 37 đến 53 mục mỗi file), mọi mục có reviewed:false nên khi nạp/khôi phục đều là «chưa duyệt». Bản nháp do Claude soạn, KHÔNG coi là đã đúng: Chủ vào Admin → Thuật ngữ, lọc «chưa duyệt», sửa rồi Duyệt từng mục hoặc cả bộ. Nơi đã chạy seed trước đó thì bấm «Khôi phục» cho từng bộ mới. Test ở glossary.test.ts.",
  },
  {
    version: "5.11.0",
    time: "19/11/2026",
    area: "du-lieu",
    text: "B1.2 bản nháp thuật ngữ thể loại mới: thêm data/glossaries/{zh,en}/{wuxia,xianxia,ngontinh}.json (kiếm hiệp, tiên hiệp, ngôn tình; 28 đến 49 mục mỗi file), mọi mục có reviewed:false nên khi nạp/khôi phục vào CSDL đều là «chưa duyệt». Bản nháp do Claude soạn, KHÔNG coi là đã đúng: Chủ vào Admin → Thuật ngữ, lọc «chưa duyệt», sửa rồi Duyệt từng mục hoặc Duyệt cả bộ. Nơi đã chạy seed trước đó thì bấm «Khôi phục» cho từng bộ (restoreGlossary tạo bộ còn thiếu). Test mới ở glossary.test.ts.",
  },
  {
    version: "5.11.0",
    time: "19/11/2026",
    area: "du-lieu",
    text: "B3 (HANDOFF_NANG_CAP.md): nhãn «đã duyệt / chưa duyệt» cho thuật ngữ. 1) Migration 0026_glossary_review.sql thêm cột glossary_terms.reviewed (mặc định true: mục đang có coi là đã duyệt). 2) src/lib/glossary-review.ts (thuần) + glossary-review.test.ts (6 ca): lọc, thống kê theo ngôn ngữ/thể loại, thể loại còn trống. 3) glossary-room.ts: listGlossary nhận review (all/reviewed/draft) và trả packTotal/packReviewed; setGlossaryReviewed (một mục hoặc cả bộ); glossaryStats; importGlossary nhận draft (nhập làm bản nháp = chưa duyệt); Chủ tự thêm tay hoặc nhận gợi ý của khách thì tự coi đã duyệt. 4) glossary-board.tsx: ô lọc, nhãn từng mục, nút Duyệt/Bỏ duyệt, «Duyệt cả bộ» có hộp xác nhận, ô «đánh dấu chưa duyệt» khi nhập file, mục «Thống kê số mục». Khách không thấy gì mới (không nâng APP_VERSION). Chưa chạy với CSDL thật.",
  },
  {
    version: "5.11.0",
    time: "19/11/2026",
    area: "du-lieu",
    text: "B2 (HANDOFF_NANG_CAP.md): nhập thuật ngữ hàng loạt có xem trước. 1) File mới src/lib/glossary-import.ts (thuần): parseImportText đọc JSON hoặc CSV/TSV/«gốc = dịch» (tối đa 5000 dòng), planImport phân loại từng dòng (mới, đổi cách dịch, hiện lại từ đang ẩn, giống hệt, lặp trong file, bị từ chối kèm số dòng và lý do), importBatches cắt lượt 400 dòng, importSummary cho hộp xác nhận. 2) glossary-room.ts: previewGlossaryImport (chỉ đọc, không ghi). 3) Bảng Admin Thuật ngữ, nút «Nhập file»: đọc, xem trước, hộp xác nhận của app, rồi ghi từng lượt; trước đây ghi thẳng và cắt âm thầm ở 400 dòng. Test glossary-import.test.ts (8 ca). Chưa chạy với CSDL thật. Không hiện cho khách nên không nâng APP_VERSION.",
  },
  {
    version: "5.11.0",
    time: "19/11/2026",
    area: "khac",
    text: "C3 (HANDOFF_NANG_CAP.md): ô «Yêu cầu thêm cho bản dịch» (tối đa 300 ký tự, lưu ở khóa gextra) trong Ngữ cảnh phim. src/lib/sub/text.ts: STYLE_EXTRA_MAX, styleExtraBlock(), filmContext nhận extra và nối khối «USER STYLE REQUEST» ở cuối ngữ cảnh (dùng chung cho dịch ở use-pipeline và trau chuốt ở use-polish). Câu lệnh gốc đòi JSON giữ cố định; khối chỉ nối thêm, bỏ ký tự điều khiển và xuống dòng. Test thêm ở translate-batch.test.ts. Chưa đo tác dụng trên phim thật.",
  },
  {
    version: "5.10.1",
    time: "19/11/2026",
    area: "khac",
    text: "C2 (HANDOFF_NANG_CAP.md): src/lib/sub/text.ts untranslated() không coi câu chỉ gồm tiếng đệm mượn nguyên văn (okay, haha, hehe, hihi, hmm, wow, ooh, aah...) là chưa dịch; câu có thêm chữ khác vẫn bị kiểm như cũ. Test thêm ở translate-batch.test.ts.",
  },
  {
    version: "5.10.0",
    time: "19/11/2026",
    area: "khac",
    text: "A5.4 giao diện trau chuốt bản dịch (HANDOFF_NANG_CAP.md). 1) src/components/polish-panel.tsx: nút «Trau chuốt bản dịch» ở khung «Bản dịch», hộp chọn model kèm giá Token, tiến độ, hủy, màn so sánh. 2) use-polish.ts gắn vào usePipeline (app.polish): giữ Token qua openPolishTicket khi dùng key phòng, đóng phiếu bằng closeRoomTicket ở finally, key riêng của khách thì không trừ Token. 3) Admin phải đặt model trau chuốt (Cấu hình, Gói) và thêm model vào «cửa trả theo lượt» thì khách mới thấy model để chọn. Chưa chạy với model thật và CSDL thật.",
  },
  {
    version: "5.9.1",
    time: "19/11/2026",
    area: "khac",
    text: "Chủ yêu cầu (ảnh chụp điện thoại): ô chọn dùng danh sách gốc của máy, đổi sang hộp web; khu 18+ nổi bật trong hộp Thể loại với thanh Thấp/Vừa/Cao. 1) File mới src/components/picker-select.tsx: PickerSelect (hộp chọn dạng thẻ nổi, portal ra body, Escape/bấm nền để đóng, hàng có vòng tròn chọn). Lấy lựa chọn từ các thẻ <option> con nên Select (studio.tsx, 13 chỗ) và ChipSelect (home-hero.tsx) giữ nguyên cách gọi. 2) Khi danh sách có đủ adult, softcore, sex thì hộp hiện khối «18+» viền màu nhấn ở đầu hộp: Thấp = Phim gắn nhãn 18+, Vừa = Phim cấp 3, Cao = Phim thoại kín; ba thể loại này không lặp trong danh sách thường. Chọn mức vẫn qua pickGenre nên vẫn hỏi xác nhận trên 18 tuổi (ConfirmDialog z-50 nằm trên hộp chọn z-40; hộp chọn đóng trước khi hỏi). 3) home-state.ts: AGE_LEVELS (thứ tự nhẹ đến nặng), AGE_GATE_GENRES lấy từ đó; test mới. CHƯA thử trên điện thoại thật: cần Chủ xem lại hộp trên máy (cuộn, chạm, chế độ tối).",
  },
  {
    version: "5.9.0",
    time: "19/11/2026",
    area: "khac",
    text: "Chủ chốt: «Phim gắn nhãn 18+» (adult) nhẹ hơn, «Phim thoại kín» (sex) là sex; ba bộ 18+ (adult, softcore, sex) đứng riêng và khách phải xác nhận trên 18 tuổi khi chọn. 1) home-state.ts: AGE_GATE_GENRES + needsAgeConfirm. 2) use-pipeline.ts: pickGenre (thể loại 18+ chỉ áp dụng sau khi xác nhận), pendingGenre/confirmGenre/cancelGenre; studio.tsx dùng pickGenre cho chip trang chủ và hai ô chọn Thể loại, hiện ConfirmDialog của app (không dùng hộp thoại trình duyệt). Thể loại 18+ đã lưu KHÔNG tự khôi phục khi mở lại app (về Tự động), phải chọn và xác nhận lại. Xác nhận chỉ lưu trong phiên, không ghi vào tài khoản. 3) glossary.ts NO_BASE_GENRES thêm softcore (cấp 3 đứng riêng, không nối bộ nền auto). 4) Prompt adult (genre-prompts.ts) và dòng thể loại adult ở text.ts viết lại cho nhẹ hơn sex (lời lẽ mạnh, bạo lực, nói bóng gió tình dục, vẫn không kiểm duyệt). Không đổi điều khoản (chưa đổi quyền lợi khách; nếu Chủ muốn ghi thêm quy định 18+ vào điều khoản thì nâng TERMS_VERSION). Test: home-state.test.ts và glossary.test.ts thêm ca.",
  },
  {
    version: "5.8.0",
    time: "19/11/2026",
    area: "khac",
    text: "A1 kho prompt theo thể loại (HANDOFF_NANG_CAP.md). 1) File mới src/lib/sub/genre-prompts.ts: prompt trau chuốt RIÊNG cho 26 thể loại (17 cũ + 9 mới) gồm tên, prompt giọng văn/xưng hô/mức thô tục/độ dài câu, gợi ý ngắn cho bước dịch của thể loại mới, prompt dự phòng cho thể loại lạ, giới hạn 1200 ký tự. CHƯA có chỗ nào gọi prompt trau chuốt (làm ở A2). 2) 9 thể loại mới trong ô chọn (home-state.ts GENRES): wuxia, xianxia, ngontinh, softcore, social, war, family, school, documentary. Trinh thám đã có sẵn dưới khóa mystery nên không thêm. 3) glossary-share.ts nay LẤY danh sách và nhãn thể loại từ home-state.ts (trước đây chép tay ba nơi, dễ lệch); glossaryPair nhận khóa mới. Thể loại mới CHƯA có file thuật ngữ trong data/glossaries nên bộ thuật ngữ rỗng (việc B1). Lưu ý: thể loại mới được nối bộ nền auto như thể loại thường (NO_BASE_GENRES chỉ gồm auto, adult, sex): phim cấp 3 (softcore) CÓ nối bộ nền auto, Chủ xem có muốn thêm softcore vào NO_BASE_GENRES không. 4) text.ts translationMessages: thể loại mới dùng genreHint khi GENRES cũ chưa có (thể loại cũ giữ nguyên chữ). Test mới genre-prompts.test.ts (9 ca) đã thêm vào script test.",
  },
  {
    version: "5.7.0",
    time: "19/11/2026",
    area: "khac",
    text: "Bố cục mới trang khách trên điện thoại đứng (6 bước, Chủ chốt demo). 1) tool-wheel.ts: toán thuần cho nút vàng giữa thanh dưới (kéo ngang lướt qua 6 công cụ theo thứ tự Phim, Nhân vật, Thuật ngữ, Thuyết minh, Kiểm tra, Cách trả, xoay vòng, thả đâu chọn đó, có quán tính). 2) tool-wheel.tsx + FloatingDock/StudioDock nhận nút giữa mới; bấm (không kéo) thì mở tab. 3) Tab công cụ là thẻ kính nổi cao ~80% màn hình, đầu tab có icon + tên + nút đóng (studio.tsx, styles.css khối SHEET_PORTRAIT; ngang thấp giữ như cũ). 4) Mặc định tab Phim; Tải và dịch dính đáy tab Phim; chip «Trả bằng: …» ở đầu tab Phim mở tab Cách trả. 5) Ví mở cùng kiểu tab 80% (lớp product-covered thay hidden); dòng «Tiếp theo: …» cuối mỗi công cụ (nextTool); vòng tiến độ quanh nút vàng khi đang dịch (ringDash, lấy % từ stage-progress). Màn từ 1024 px và ngang thấp KHÔNG đổi. Không đổi giá, quyền, điều khoản, dữ liệu. TERMS_VERSION giữ nguyên. Chưa bấm thử trên điện thoại thật (độ nhạy kéo WHEEL_DRAG_PX, quán tính settleTarget).",
  },
  {
    version: "5.6.0",
    time: "18/11/2026",
    area: "khac",
    text: "Admin → Giao diện: Chủ không tìm thấy mục «Hiệu ứng». Nguyên nhân: mục nằm trong thẻ «Hình khối» với tên dài, và thẻ «Chuyển động» có mục khác cũng tên «Hiệu ứng». Đã chuyển lên ĐẦU thẻ «Màu sắc» (cạnh các bộ màu) với tên «Phong cách giao diện» (Tương lai hoặc Cổ điển, kèm chú thích); mục Bật/Tắt trong thẻ «Chuyển động» đổi tên thành «Chuyển động» và «Tốc độ chuyển động» để không trùng. Không đổi chức năng.",
  },
  {
    version: "5.6.0",
    time: "18/11/2026",
    area: "khac",
    text: "Giao diện Tương lai B7 (Chủ chốt: để mặc định màu vàng, làm chip tô màu): (1) giao diện Tương lai nay là MẶC ĐỊNH (THEME_DEFAULT.look = future), bảng màu mặc định vẫn là Vàng; theme đã lưu mà chưa có trường look cũng nhận Tương lai; Admin vẫn đổi lại Cổ điển ở Admin → Giao diện → Hiệu ứng, khách vẫn có nút tắt hiệu ứng. (2) Bấm bộ màu ở Admin → Giao diện nay chỉ đổi màu, không đổi hiệu ứng (trước đây bộ Tương lai bật Tương lai và bộ khác bật Cổ điển). (3) Giá trị trên chip chọn nhanh (Tiếng gốc, Thể loại, Trả theo lượt, Đã có key) tô màu nhấn trộn 70% với màu chữ để đọc rõ cả khi khách chọn màu nhấn tối (đo: vàng 10,5:1, xanh tối 4,9:1). Không đổi chức năng, giá hay điều khoản.",
  },
  {
    version: "5.6.1",
    time: "ngày 19/11/2026",
    area: "khac",
    text: "Sửa logic trang Doanh thu (Admin), 4 bước, theo yêu cầu Chủ. 1) Lời lỗ tính theo tiền thật: tiền chuyển khoản vào − giá vốn − hoa hồng − chi phí ghi tay (money-profit.ts). Trước đây lời lỗ chỉ cộng phần tiêu số dư ví cũ nên bỏ sót tiền khách trả thẳng bằng QR từ v5.0.0 (thu 12.832 mà lỗ −18.843); ghi chú cũ «Lời lỗ vẫn không cộng tiền nạp» hết đúng. 2) Giá vốn của lượt trừ Token dịch trước đây không vào sổ (phiếu Token lưu số Token, mọi truy vấn lọc unit vnd); nay quy ra đồng bằng Token × giá gốc Turbo hiện hành, vào giá vốn, lời lỗ và giá vốn mỗi phút; thiếu giá Turbo thì báo đỏ và hiện «—». 3) Mỗi tab ghi rõ cộng 14 ngày, 8 tuần, 12 tháng hay 5 năm; tab Ngày có dòng số hôm nay. 4) Rà ARPU, dùng thử → mua, Tổng quan: nhất quán, chỉ đổi chữ. Giá vốn Token là số quy theo giá hiện hành, không phải giá lúc chạy. Chưa đối chiếu với cơ sở dữ liệu thật.",
  },
  {
    version: "5.6.1",
    time: "23:40 ngày 18/11/2026",
    area: "khac",
    text: "Dọn giao diện Cấu hình của Chủ, 5 bước. 1) Ô model của gói chỉ hiện model hợp việc theo luật pack-fit (cùng luật Dựng gói tự động); model đã lưu mà không hợp thì giữ, ghi «không hợp việc này»; Alibaba ở Thuyết minh chưa có giọng thì để trống. 2) Danh sách model chỉ tên ngắn, mã dài một dòng nhỏ dưới ô. 3) Danh sách gói thu gọn, bấm mới sửa, xóa hỏi lại. 4) Giá mỗi nhà một khối cùng kiểu, Lấy lại theo nhà (Groq, Alibaba, Deepgram), Deepgram tự cập nhật nằm trong khối, một nút lưu số đô la. 5) Trang con «Gói và giá» tách thành «Giá» (hạn mức, giá từng nhà, giá thuê phòng chỉ xem) và «Gói» (Token dịch, gói dịch). Không đổi dữ liệu lưu, quyền hay giá bán; khách không thấy khác; không nâng số phiên bản khách.",
  },
  {
    version: "5.6.1",
    time: "22:23 ngày 18/11/2026",
    area: "khac",
    text: "Rút gọn chữ trong phòng dịch, tab Cách trả, dưới ô Nhận dạng giọng. Năm đoạn gần giống nhau (Deepgram, AssemblyAI, Soniox, Speechmatics, Alibaba) gom thành một hàm linkAsrNote. Giữ lời riêng: Speechmatics nhắc key đúng vùng, Soniox nhắc tài khoản đã nạp tiền, Alibaba không nhắc key Groq như câu cũ. Không đổi cách chạy, giá, quyền hay điều khoản.",
  },
  {
    version: "5.6.0",
    time: "18/11/2026",
    area: "khac",
    text: "Giao diện Tương lai, bước B6 (Chủ hỏi vì sao bản thật chưa giống bản mô phỏng): thêm các nét còn thiếu, chỉ khi bật «Tương lai» ở Admin → Giao diện và chưa bấm tắt hiệu ứng: tiêu đề «Dịch phụ đề video» chữ chuyển màu theo màu nhấn, vòng tròn phát sáng có vòng nét đứt quay chậm quanh biểu tượng tải lên ở ô thả video, nút «Tải và dịch» chuyển màu có hào quang, nhãn nhóm menu chữ nhỏ viết hoa cách chữ. Màu đều suy từ màu nhấn nên khách tự chọn RGB vẫn đẹp. Vòng dừng quay khi máy đặt giảm chuyển động. Giao diện Cổ điển và bản đã tắt hiệu ứng không đổi. Không đổi chức năng, giá hay điều khoản.",
  },
  {
    version: "5.6.0",
    time: "18/11/2026",
    area: "khac",
    text: "Phần B giao diện trang khách xong. B1: khách tự chọn màu nhấn (khóa tyzo_accent trong máy, thắng màu Admin). B2: bộ màu thứ chín «Tương lai» ở Admin → Giao diện → Màu sắc. B3: trường Theme.look (Cổ điển hoặc Tương lai, data-look trên html): nền lưới mờ, thẻ kính mờ, hào quang theo màu nhấn, thanh dưới nổi kính mờ; bấm bộ Tương lai tự đặt look, có hàng «Hiệu ứng toàn trang» để đặt riêng. B4: khách tắt được hiệu ứng bằng nút ở đầu trang (khóa tyzo_fx = off, script đầu trang đặt data-fx=off trước khi vẽ), và hệ điều hành bật giảm trong suốt thì thẻ về nền đặc. Không đổi chức năng, giá, quyền, điều khoản. Đã chụp bằng Chromium ở 393, 720, 1280 px: không tràn ngang; chưa xem trang thật có đăng nhập.",
  },
  {
    version: "5.5.0",
    time: "18/11/2026",
    area: "khac",
    text: "Sắp xếp lại giao diện, bước A2: thanh nút dưới nổi bo tròn kiểu có nút giữa nhô lên (Chủ gửi ảnh mẫu, chọn nút giữa trang khách là Tải và dịch, làm luôn cho Admin). Dùng chung một thành phần (components/floating-dock.tsx), chỉ hiện dưới 1024 px. Trang khách: Trang chủ, Trực tiếp, [Tải và dịch], Ví, Menu; nút giữa chưa chọn video thì mở hộp chọn tệp, có video thì bắt đầu dịch, đang chạy/mất mạng/bảo trì hoặc đã có bản dịch thì mờ. Admin: Tổng quan, Việc (chấm đỏ số yêu cầu chờ), [Tìm nhanh], Dịch vụ hoặc Khách, Menu. Mục đang chọn hiện chữ nhỏ; thanh tự ẩn khi đang gõ chữ. Biểu tượng theo chỗ đặt nên Admin đổi được ở mục Giao diện. Thay thanh dưới chữ của bước 4. Không đổi chức năng, giá hay điều khoản.",
  },
  {
    version: "5.5.0",
    time: "18/11/2026",
    area: "khac",
    text: "Sắp xếp lại giao diện trang khách, bước A1 (Chủ duyệt bản mô phỏng 18/11/2026): menu trái đổi tên và nhóm. «Key Sub» thành «Cách trả», «Nghe» thành «Thuyết minh»; bỏ nhóm «Nâng cao» một mục, «Thuật ngữ» chuyển vào nhóm «Dịch bình thường»; nhóm «Tài khoản» tách thành «Ví và gói» (Token dịch, Thuê phòng và gói, Cộng tác viên) và «Trợ giúp» (Hướng dẫn, Yêu cầu xem lại). Áp cho ba trang có menu: trang chủ, Dịch trực tiếp, Hướng dẫn. Tên gom ở lib/customer-menu.ts; hướng dẫn và tour đọc cùng tên. Không đổi id mục, chức năng, giá hay điều khoản; tìm nhanh Ctrl K vẫn gõ được tên cũ. Khách chỉ thấy khi có bản chính thức: cần ghi CHANGELOG khách khi nâng số phiên bản.",
  },
  {
    version: "5.5.0",
    time: "ngày 18/11/2026",
    area: "ha-tang",
    text: "Thêm nhà nhận dạng Soniox (PROVIDERS.md, bước 1 đến 7; bước 8 chưa gồm điều khoản). Lõi sub/soniox.ts (dựng body, đọc token mili giây ra câu, lỗi tiếng Việt), vòng gửi-hỏi-lấy-xóa sub/soniox-poll.ts (luôn DELETE bản phiên âm khi xong để không giữ dữ liệu khách), soniox-asr.server.ts (key khách hoặc key phòng soniox_key), model soniox-stt-async (ASR_MODELS, asrHouse). Giá cố định trong sub/soniox-base.ts (0,10 đô/giờ, lấy từ ghi chú, chưa tra lại trang giá), Chủ sửa tay ở bảng giá qua usd_fix. Cửa Trả theo lượt: run-turn.ts giữ Token dịch, trừ theo số giây thực bằng chargeRoomAsr. Ô key phòng hiện ở Admin (ready: true). CHƯA đối chiếu với key Soniox thật (tài khoản chưa nạp tiền): tên model gửi API (SONIOX_API_MODEL, đang stt-async-v5, Chủ thấy STT v6), hình dạng phản hồi trạng thái và transcript, giá. Điều khoản chưa nhắc ba nhà mới (AssemblyAI, Speechmatics, Soniox): chờ Chủ chốt chữ rồi nâng TERMS_VERSION một lần."
  },
  {
    version: "5.4.0",
    time: "ngày 18/11/2026",
    area: "ha-tang",
    text: "Thêm nhà nhận dạng Speechmatics (PROVIDERS.md, bước 1 đến 7; bước 8 chưa gồm điều khoản). Lõi sub/speechmatics.ts (dựng config job, đọc json-v2 ra câu, lỗi tiếng Việt), vòng gửi-hỏi-lấy-xóa sub/speechmatics-poll.ts (luôn DELETE job khi xong để không giữ dữ liệu khách), speechmatics-asr.server.ts (key khách hoặc key phòng speechmatics_key), hai model speechmatics-standard và speechmatics-enhanced (ASR_MODELS, asrHouse). Giá cố định trong sub/speechmatics-base.ts (0,45 và 0,75 đô/giờ, theo trang giá 18/11/2026), Chủ sửa tay ở bảng giá qua usd_fix. Cửa Trả theo lượt: run-turn.ts giữ Token dịch, trừ theo số giây thực bằng chargeRoomAsr. Ô key phòng hiện ở Admin (ready: true). CHƯA đối chiếu với key Speechmatics thật: vùng máy chủ (đang khai US1, hằng SPEECHMATICS_API ở provider.ts), tên trường chọn model (SPEECHMATICS_MODEL_FIELD, đang operating_point), mã tiếng Trung cmn, cấu trúc json-v2. Điều khoản chưa nhắc Speechmatics: chờ Chủ chốt chữ rồi nâng TERMS_VERSION một lần cho cả ba nhà mới."
  },
  {
    version: "5.3.0",
    time: "ngày 18/11/2026",
    area: "ha-tang",
    text: "Thêm nhà nhận dạng AssemblyAI (PROVIDERS.md, bước 1 đến 7; bước 8 chưa gồm điều khoản). Lõi sub/assemblyai.ts (dựng yêu cầu, đọc từ ra câu, lỗi tiếng Việt), vòng gửi-hỏi-xóa sub/assemblyai-poll.ts (luôn DELETE bản phiên âm khi xong để không giữ dữ liệu khách), assemblyai-asr.server.ts (key khách hoặc key phòng assemblyai_key), hai model assemblyai-universal-3-5-pro và assemblyai-universal-2 (ASR_MODELS, asrHouse). Giá cố định trong sub/assemblyai-base.ts (0,21 và 0,15 đô/giờ), Chủ sửa tay ở bảng giá qua usd_fix; AssemblyAI chưa có trang giá để tự kéo. Cửa Trả theo lượt: run-turn.ts giữ Token dịch, trừ theo số giây thực bằng chargeRoomAsr. Ô key phòng hiện ở Admin (ready: true). CHƯA đối chiếu với key AssemblyAI thật. Điều khoản chưa nhắc AssemblyAI: chờ Chủ chốt chữ rồi nâng TERMS_VERSION một lần cho cả ba nhà mới."
  },
  {
    version: "5.2.3",
    time: "18/11/2026",
    area: "khac",
    text: "Sửa dải hở trên thanh Tổng quan (ba gạch, tên mục, Tìm) của Admin trên điện thoại (Chủ chụp ảnh): khung cuộn có đệm trên 8px nên thanh dính dừng cách mép 8px và nội dung cuộn lộ ra phía trên. Bỏ đệm trên của khung cuộn (admin-desk.tsx, py-2 thành pb-2) và chuyển sang hàng nút Quay lại (pb-2 thành py-2) nên chỗ trống ở đầu trang giữ nguyên. Đã đo trong trình duyệt thử: độ hở 8px về 0. Không đổi chức năng.",
  },
  {
    version: "5.2.3",
    time: "18/11/2026",
    area: "khac",
    text: "Sắp xếp lại giao diện Admin, bước 4 (điện thoại): thêm thanh nút dưới cùng dưới 1024 px gồm Tổng quan, Việc, Dịch vụ (Quản lý/Hỗ trợ thay bằng Khách vì không có Dịch vụ) và nút Menu mở ngăn trượt đầy đủ. Code: lib/admin-bottom-tabs.ts (+ test), components/admin-bottom-bar.tsx, RailControl trong side-rail.tsx; vùng nội dung chừa chỗ dưới cùng. Thanh trên (ba gạch, tên mục, Tìm) giữ nguyên. Không đổi quyền, dữ liệu hay chức năng; không nâng số phiên bản khách.",
  },
  {
    version: "5.2.3",
    time: "18/11/2026",
    area: "khac",
    text: "Sắp xếp lại giao diện Admin, bước 3: tách «Tài khoản khách» ra tab riêng (id mới tai-khoan, mọi vai trò đều thấy như khối cũ), gồm thẻ tìm tài khoản và bảng kiểu thẻ quyền của Chủ. Tab «Phiếu và việc» còn thống kê, phiếu, yêu cầu, lịch sử, Email Chủ và hàng chờ nạp. Mở tài khoản từ nơi khác (bấm email) nay đưa sang tab Tài khoản khách; mở đơn nạp và yêu cầu vẫn về Phiếu và việc. Không đổi quyền, dữ liệu hay chức năng; không nâng số phiên bản khách.",
  },
  {
    version: "5.2.3",
    time: "18/11/2026",
    area: "khac",
    text: "Sắp xếp lại giao diện Admin, bước 2: tab Cấu hình của Chủ tách thành 6 trang con bấm ngang (Trạng thái, Nhà cung cấp, Gói và giá, Thuê phòng, Dịch trực tiếp, Cổng nạp). Code mới: components/admin-config.tsx (ConfigTab), lib/admin-config-pages.ts (+ test). Cùng các khối như trước, trang không chọn chỉ bị ẩn nên không mất dữ liệu đang nhập. Không đổi quyền, dữ liệu, giá hay chức năng; không nâng số phiên bản khách.",
  },
  {
    version: "5.2.3",
    time: "18/11/2026",
    area: "khac",
    text: "Sắp xếp lại giao diện Admin, bước 1 (Chủ chốt bản mô phỏng 18/11/2026): menu trái đổi từ 5 nhóm cũ (Vận hành, Tiền, Con người, Nội dung, Nhật ký) sang 5 nhóm theo việc đang làm: Khách và việc, Dịch vụ, Tiền (thêm Cộng tác), Nội dung, Hệ thống (Sơ đồ, Chất lượng, hai Nhật ký). Tab «Việc» đổi nhãn thành «Phiếu và việc». Không đổi id tab, quyền, dữ liệu hay chức năng. Ghi chú: Chất lượng chuyển từ nhóm Tiền sang Hệ thống. Không nâng số phiên bản khách vì khách không thấy khác.",
  },
  {
    version: "5.2.3",
    time: "17/11/2026",
    area: "ha-tang",
    text: "Bước c3: ô tick giọng đọc Orpheus (Groq) ở bảng «Model khách được chọn khi thuê phòng» nay chặn thật. rent-rows.ts thêm loại tts cho Groq (Aura/Deepgram không có ô vì chỉ trả bằng Token dịch); rent-show-rule.ts thêm rentVoiceProblem + orpheusModelId; narration.ts kiểm danh sách (getRentShow, nhớ 60 giây) trước khi gọi Orpheus khi khách dùng key riêng (key khác \"room\"), bị khóa thì rơi sang giọng Edge/trình duyệt và studio.tsx báo toast một lần. Trả theo lượt (key \"room\") không bị chặn. LƯU Ý: danh sách Chủ đã lưu từ trước chưa có Orpheus nên khách key riêng sẽ bị khóa giọng Orpheus cho tới khi Chủ tick lại và lưu. Chưa lưu danh sách (null) thì không khóa.",
  },
  {
    version: "5.2.2",
    time: "17/11/2026",
    area: "ha-tang",
    text: "Sửa chữ giao diện khách: ô Nhận dạng giọng ở cửa Trả theo lượt không còn khóa và ghi «chưa có ở cửa trả theo lượt» cho Alibaba và Deepgram (máy chủ chạy hai nhà này bằng key phòng từ trước: ali-filetrans.server.ts, deepgram-asr.server.ts, use-pipeline.ts đã truyền key \"room\"). asr-picker.ts bỏ trạng thái noRoom; studio.tsx: roomHeld chỉ áp cho model Groq (danh sách «phòng mở» offered chỉ nói về Groq, máy chủ tự kiểm Alibaba/Deepgram khi chạy); giá hiện Token dịch lấy từ bảng Groq hoặc bảng dự phòng ALIBABA_ROWS, DEEPGRAM_BASE_ROWS (roomPriceRow). live-screen.tsx: Chủ lưu danh sách mà không mở model nào thì báo «Hiện chưa mở model nào…» và khoá nút Bắt đầu. CHƯA thử chạy thật Alibaba/Deepgram ở cửa Trả theo lượt từ giao diện (cần key phòng).",
  },
  {
    version: "5.2.1",
    time: "17/11/2026",
    area: "ha-tang",
    text: "Bước (d), Chủ chốt: dịch trực tiếp THEO KHẢ NĂNG từng model. File mới live/live-show.ts (thuần): liveModeOf(model) suy từ danh mục chung: kind live → real (dịch trực tiếp thật, hiện Qwen3.8 và Qwen3.5 LiveTranslate); nhận dạng nhận đoạn cắt (intake chunks, tức Whisper Groq) → chunked (giả bằng cắt đoạn ngắn, app CHƯA có đường chạy nên chưa bật được); còn lại none (Nova-3 và Filetrans chỉ nhận link, giọng đọc, model dịch). Chỉ real tick được (liveTickable). Admin: bảng «Model dịch trực tiếp khách được dùng» (live-show-board.tsx, tab Cấu hình), lưu dòng room_settings live_show (live-show-room.ts: getLiveShow ai đọc được, saveLiveShow chỉ Chủ, nhãn nhật ký mo-live); chưa lưu thì mở mọi model real (như rent_show null). CHẶN THẬT: openLiveTicket (live-open.ts) từ chối model chưa mở bằng liveOpenProblem; live-screen.tsx lọc ô Model theo danh sách mở. Khách mặc định không thấy khác (chưa lưu = mở hết) nên không nâng số bản. Nhà mới: liveModeOf tự suy từ khai kind/intake trong danh mục, không cần khai thêm. Test live-show.test.ts (vào npm test). CHƯA làm: đường chạy chunked thật (làm dịch trực tiếp bằng Whisper + Groq), nên Whisper hiện liệt kê nhưng khóa. CHƯA bấm thử trên điện thoại.",
  },
  {
    version: "5.2.1",
    time: "17/11/2026",
    area: "tien",
    text: "Bước (a3-2), Chủ chốt GỠ phần trăm chênh Groq và Alibaba, giá theo Token dịch. run-desk.ts: parseRunDesk luôn trả markup 0 nên mọi nơi đọc (run-board.server, live-book, pack-room, room-alibaba, hiển thị) thôi cộng chênh; số cũ đã lưu giữ nguyên trong dữ liệu và chỉ đọc qua legacyMarkupOf cho nút «ước giá vốn phiếu cũ» (admin-room.ts). Lưu cấu hình giá từ nay ghi markup 0 (số cũ mất sau lần lưu đầu, chỉ ảnh hưởng ước phiếu đồng cũ). Admin: bỏ ô «Tăng thêm trên giá gốc» (run-desk-board) và «Phần trăm chênh Alibaba» (service-pack-board), sửa chữ ghi chú. Khách: studio.tsx hiện giá model bằng formatRoomTokens (token-math.ts): 1 Token dịch = giá gốc 1 giây Turbo, nói Token dịch mỗi giờ / mỗi triệu ký tự / vào-ra mỗi triệu token, thay formatRoomPrice (đồng). KHÔNG đổi số Token dịch trừ thật (vốn đã tính từ giá gốc). GÓI Token dịch giữ chênh 50 (token-desk.ts, giay-pack-board). CHƯA SỬA ĐIỀU KHOẢN: terms-document.tsx dòng ~206 nói hoa hồng tính trên «phần chênh của lượt dùng key phòng», nay không còn chênh ở lượt này (chỉ còn chênh ở gói Token dịch); dòng ~122 vẫn đúng. Cần Chủ quyết có sửa chữ và nâng TERMS_VERSION không. Test: token-math.test.ts, live-wire.test.ts sửa theo.",
  },
  {
    version: "5.2.0",
    time: "17/11/2026",
    area: "ha-tang",
    text: "Chủ chốt: khách chọn Thuê phòng thì dùng key của khách và thấy ô key của TẤT CẢ nhà. studio.tsx: ô key các nhà ngoài Groq không còn chỉ hiện cho nhà đang chọn nhận dạng, hiện đủ vòng lặp PROVIDER_IDS khi không ở cửa Trả theo lượt, kèm dòng «Lấy key ở <keyPage>». Hướng dẫn: mục key-groq (giữ mã để Chỉ tôi và test không đổi) thành «Lấy key (Groq, Alibaba, Deepgram)», bước theo nhà sinh từ PROVIDERS (keyPage), Groq giữ ảnh và các bước cũ; FAQ key-groq-loi nói chung các nhà; tour key-groq nói ba nhà; bước 3 của Bắt đầu nhắc Alibaba/Deepgram. Nâng 5.2.0, CHANGELOG khách. CHƯA bấm thử trên điện thoại.",
  },
  {
    version: "5.1.3",
    time: "17/11/2026",
    area: "ha-tang",
    text: "Bước (c1) Admin: bảng «Model khách được chọn khi thuê phòng» dựng từ danh mục chung + model key phòng thay bảng viết tay HOUSES. File mới rent-rows.ts (thuần): rentKindsOf(nhà) cho biết loại model cửa Thuê phòng chặn được hôm nay (nhận dạng nếu nhà có asr; dịch và kiểm duyệt nếu nhà có chat, giống bảng cũ), rentRowsFor(nhà, model key phòng) trả model đã biết rồi model lạ trên key phòng (xếp theo tên; Deepgram không đoán bừa thành model dịch), kèm cờ onKey. rent-show-board.tsx đọc model từng nhà bằng getProviderKey (chỉ Chủ), hàng nào key phòng không thấy thì ghi «(key phòng không thấy)». Nhờ vậy Chủ mở được model mới có trên key phòng (trước đây model lạ không có ô để tick nên khách không dùng được dù key của họ gọi được, vì ownKeyAvailable lấy giao của key khách và danh sách Chủ mở). KHÔNG đổi luật chặn (rentUseProblem, rentOpen, ownKeyAvailable giữ nguyên), không đổi dữ liệu rent_show, không đổi giá, điều khoản hay giao diện khách; không nâng số bản. Giọng đọc (Orpheus, Aura) và dịch trực tiếp CHƯA liệt kê vì cửa Thuê phòng chưa chặn chúng (xem HANDOFF c2, c3). Test mới rent-rows.test.ts (đã thêm vào npm test). CHƯA bấm thử bảng trên trình duyệt thật với key phòng thật.",
  },
  {
    version: "5.1.3",
    time: "17/11/2026",
    area: "ha-tang",
    text: "Bước (b3) phía khách: ô nhập key các nhà ngoài Groq sinh từ PROVIDERS. PROVIDERS thêm clientStore (khóa kho trình duyệt: groq gk, alibaba gali, deepgram gdg, GIỮ đúng tên cũ để khách đã lưu key không mất) và keyHint (đầu key mẫu), kèm hàm clientKeyPlaceholder (chữ mẫu trùng từng chữ với ba ô viết tay cũ). use-pipeline.ts thay hai state alibabaKey/deepgramKey bằng một bảng houseKeys + setHouseKey(id, value) + houseKeyOf(id); khóa kho đọc từ PROVIDERS[id].clientStore. Giữ nguyên quirk cũ: chỉ ghi kho khi ô không rỗng. studio.tsx vẽ ô key bằng vòng lặp PROVIDER_IDS (bỏ groq) và chỉ hiện ô của nhà đang chọn nhận dạng (asrHouse), thay hai ô viết tay ali-key/dg-key. Ô Groq vẫn riêng vì còn kiểm key, đồng bộ model, nút Dán và dòng trạng thái. Khách không thấy khác gì (nhãn, chữ mẫu, khóa kho đều giữ), không nâng số bản. Test: provider.test.ts (khóa kho không trùng, giữ tên cũ, chữ mẫu), provider-admin-board.test.ts (studio dùng vòng lặp, use-pipeline không còn chép tên khóa). CHƯA bấm thử trên trình duyệt: chọn Alibaba/Deepgram, nhập key, tải lại trang xem key còn không.",
  },
  {
    version: "5.1.3",
    time: "17/11/2026",
    area: "ha-tang",
    text: "Bước (b2) Admin gom ô key phòng. Tab Cấu hình vẽ ô key bằng một thành phần ProviderKeyBoards lặp theo PROVIDER_IDS (provider-key-board.tsx), thay thẻ Key Groq nằm trong RunDeskBoard, AlibabaKeyBoard (xóa file) và dòng Deepgram viết tay. Nhà mới thêm vào PROVIDERS thì ô key tự hiện. Ô key chung có thêm nút Dán (lấy từ ô Groq cũ) và ghi chú sinh từ khả năng của nhà (providerKeyNote trong provider.ts; sửa ghi chú sai ở ô Alibaba cũ: «cửa trả theo lượt chưa dùng key này», nay Alibaba đã chạy cửa đó bằng key phòng). Lưu key Groq nay đi saveProviderKey: cùng dòng run_key và run_models như saveRunKey cũ, chỉ khác nhãn nhật ký key-groq thay key-phong (nhật ký cũ vẫn giữ nhãn cũ). RunDeskBoard chỉ còn part ops và price (bỏ config và key); gỡ saveRunKey khỏi admin-room.ts vì hết nơi gọi. service-pack-board.tsx vẫn giữ ô key Alibaba riêng và saveAlibabaKey, chưa gỡ. Không đổi dữ liệu, giá, điều khoản hay giao diện khách; không nâng số bản. Test: provider.test.ts (providerKeyNote), provider-admin-board.test.ts (mới, đã thêm vào npm test). CHƯA bấm thử trên trình duyệt thật: lưu key Groq/Alibaba/Deepgram và nút Dán ở tab Cấu hình.",
  },
  {
    version: "5.1.3",
    time: "17/11/2026",
    area: "ha-tang",
    text: "Bước (b1): sửa bảng PROVIDERS: Groq khai key ở dòng groq_key nhưng cả app (admin-room.ts, room-groq.ts, overview-data.ts) đọc và ghi run_key; đã đổi thành run_key để ô key chung theo PROVIDERS không lưu nhầm chỗ (chưa có chỗ nào dùng groq_key nên không mất dữ liệu). Test provider.test.ts giữ tên này. Thêm nhãn nhật ký key-groq. Bỏ alibabaAsrOnRoomPayProblem (báo «cửa trả theo lượt chưa nhận dạng Alibaba», đã sai từ khi Alibaba chạy key phòng, không còn nơi nào gọi).",
  },
  {
    version: "5.1.3",
    time: "17/11/2026",
    area: "tien",
    text: "Bước (a3-1) gỡ phần trăm chênh riêng của Deepgram (thêm ở v5.1.2): bỏ getProviderMarkup/saveProviderMarkup (provider-room.ts), ô nhập và prop withMarkup (provider-key-board.tsx, admin-desk.tsx), tham số deskKey của chargeRoomAsr (room-asr.server.ts; ali-filetrans.server.ts và deepgram-asr.server.ts gọi không còn deskKey). Không đổi số Token dịch bị trừ: với phiếu token, số trừ vốn đã tính từ giá gốc (markup 0) qua giayForBaseCost; số có chênh trước đây chỉ dùng kiểm lớn hơn 0 và cho phiếu vnd cũ (không còn được tạo từ v5.0.0). Ghi chú ở Admin từng nói «cộng phần trăm chênh» là sai, đã sửa thành «theo giá gốc». Khóa deepgram_desk trong room_settings không còn ai đọc (để nguyên, không xóa dữ liệu).",
  },
  {
    version: "5.1.3",
    time: "17/11/2026",
    area: "ha-tang",
    text: "Bước (a1) và (a2) danh mục nhà + model chung. (a1) PROVIDERS khai intake (chunks, link, upload, stream) cho từng nhà; asrIntake() đọc từ đó, asrTakesLink() chỉ còn là intake === link. (a2) sub/model-catalog.ts dựng MODEL_CATALOG từ ASR_MODELS, CHAT_MODELS, giọng Orpheus, giọng Aura, model dịch trực tiếp Alibaba (không chép dữ liệu lần hai); catalogFor, catalogModel, modelKindOf (đoán theo nhà và tên cho model lạ). Test model-catalog.test.ts: nhà khai khả năng nào thì phải có model loại đó. Sửa lỗi: model-role.ts trước đây gán deepgram-nova-3, aura-2-* và livetranslate là «dịch», nay đúng asr, tts, live (Admin chọn gói và mục key riêng của khách hiện ghi chú đúng). Chưa gỡ phần trăm chênh theo nhà (a3).",
  },
  {
    version: "5.1.2",
    time: "17/11/2026",
    area: "tien",
    text: "Deepgram mở cả cửa Trả theo lượt (key phòng deepgram_key): run-turn.ts giữ Token dịch, deepgram-asr.server.ts nhận key room + phiếu và trừ theo số giây thật bằng room-asr.server.ts (dùng chung với Alibaba, đã refactor), holdGiay/turn-quote dùng bảng giá Deepgram tự cập nhật. Gói Deepgram lưu được cho cả hai cửa. Phần trăm chênh Deepgram nhập ở ô key Deepgram (khóa deepgram_desk, nhật ký gia-deepgram). Thêm provider-doors.test.ts: nhà mới có asr phải đủ hai cửa, quên khai bảng giá thì tsc lỗi. Cửa Trả theo lượt nhận link Deepgram giữ tạm 1800 giây khi chưa biết thời lượng, trừ theo số giây thực.",
  },
  {
    version: "5.1.1",
    time: "17/11/2026",
    area: "tien",
    text: "Giá Deepgram tự cập nhật từ deepgram.com/pricing (sub/deepgram-price.ts, deepgram-board.server.ts, khóa dg_board): đọc cột trả theo dùng, bỏ giá gạch, chặn giá lệch quá 5 lần dự phòng. Chủ chỉnh trong Giá và hạn mức: bật/tắt tự cập nhật, chu kỳ 1 đến 168 giờ (khóa dg_price_cfg), nút Lấy lại bảng kéo ngay; số sửa tay usd_fix vẫn thắng. Dự phòng Nova-3 đổi 0,0043 thành 0,0048 đô/phút (0,288 đô/giờ) theo trang chính thức 17/11/2026; thêm dòng Nova-3 đa ngữ 0,0058 (deepgram-nova-3-multi, mới có giá, chưa nối vào tính tiền nhận dạng). Giọng Aura-2 tính tiền theo giá tự cập nhật.",
  },
  {
    version: "5.1.0",
    time: "10:50 ngày 17/11/2026",
    area: "ha-tang",
    text: "Thêm nhà cung cấp Deepgram (PROVIDERS.md, bước 1 đến 8). Nhận dạng Nova-3 bằng link file trực tiếp với key Deepgram của khách (sub/deepgram.ts, deepgram-asr.server.ts); cửa trả theo lượt CHƯA nhận dạng Deepgram, gói Deepgram chỉ mở cửa Thuê phòng. Admin: ô key phòng Deepgram (provider-room.ts, provider-key-board.tsx, khóa deepgram_key/deepgram_models), bảng giá trong Giá và hạn mức (deepgram-catalog.ts: Nova-3 0,258 đô/giờ, aura-2 30 đô/triệu ký tự, sửa tay qua usd_fix), gói dịch chọn Deepgram làm nhận dạng. Giọng đọc Aura-2 (en, es) qua /api/room-deepgram, trừ Token dịch theo ký tự bằng chargeWith như Orpheus. Điều khoản 2026-11-17.2 thêm Deepgram (nhà nhận dữ liệu, link file, chữ đọc). Giá Deepgram chưa đối chiếu trang chính thức; vùng xử lý của Deepgram ghi là công ty Hoa Kỳ, chưa kiểm vùng máy chủ."
  },
  {
    version: "5.0.6",
    time: "02:50 ngày 17/11/2026",
    area: "tien",
    text: "Chủ ở Giá và hạn mức thấy từng model Groq và Alibaba bằng Token dịch. Ô đô la tự lấy từ bảng niêm yết, để trống thì dùng số đó, gõ số chỉ khi bảng sai. Số sửa lưu room_settings usd_fix và được phủ lên bảng trước khi tính Token dịch. Không đặt giá bán riêng. Không nâng số phiên bản khách.",
  },
  {
    version: "5.0.6",
    time: "02:45 ngày 17/11/2026",
    area: "khac",
    text: "Cách trả và TurnPackList chuyển từ mục Nâng cao về Key Sub. Bỏ mục Gói dịch trên menu khách. Gói lấy thời lượng từ tệp (cùng nguồn thẻ Token), không chỉ từ thẻ video nên không còn ghi Chưa có tệp khi tệp đã có thời lượng. Dòng giá gói ghi Token dịch.",
  },
  {
    version: "5.0.5",
    time: "02:20 ngày 17/11/2026",
    area: "khac",
    text: "PaySlip vẽ bằng cổng ra giữa màn hình, không còn nằm trong cột Tài khoản. Giữ màn cảm ơn hoặc xin lỗi (pay-thanks, pay-bye, pay-ring) cho đến khi bấm Xong hoặc Đóng, rồi mới gọi onDone. Trước đó onDone xóa phiếu ngay nên hiệu ứng không kịp hiện.",
  },
  {
    version: "5.0.4",
    time: "02:05 ngày 17/11/2026",
    area: "tien",
    text: "Chữ tiền khớp cách trả. Đơn paid hiện theo purpose. Bỏ ô đặt số dư; setUserBalance từ chối. Gỡ số dư cũ chỉ đưa balance về 0, không xóa đơn hay Token dịch. Nút từ chối đơn khớp câu thông báo. Trả theo lượt, kệ gói, hướng dẫn và doanh thu không còn nói ví hay nạp tiền.",
  },
  {
    version: "5.0.3",
    time: "01:45 ngày 17/11/2026",
    area: "du-lieu",
    text: "Nút reset số liệu thử (wipeTestData) xóa token_grants, token_slices, đơn, phiếu, sổ, chi phí, chuông, hoa hồng, chất lượng, yêu cầu, nhật ký thao tác, rồi ghi một dòng nhật ký mới. Đưa balance về 0, gỡ plan và plan_until, trial_left về 1. Giữ tài khoản, vai trò, room_settings, key, điều khoản, affiliates và thuật ngữ.",
  },
  {
    version: "5.0.2",
    time: "01:10 ngày 17/11/2026",
    area: "tien",
    text: "Đơn TZZEKV85 tạo đúng purpose token (chuông «Mua 10.000 Token dịch») nhưng webhook ghi «Đã cộng tiền nạp» và không có token_grants. creditHitWith coi detail có tokens là đơn token kể cả purpose nap; settleDirect nhận cả purpose nap rồi ghi purpose token. repairMissedTokens bù gói cho đơn paid thiếu grant và gỡ số dư nhầm, gọi từ readState và getGiayShelf. Xác nhận tay viết đúng câu theo purpose. Mua Token phát tyzo-room-refresh.",
  },
  {
    version: "5.0.1",
    time: "00:35 ngày 17/11/2026",
    area: "quyen",
    text: "Làm lại điều khoản cho khớp web và luật, vẫn một trang. Thêm mục bản quyền và khiếu nại qua hỗ trợ hoặc yêu cầu xem lại, tạm dừng nội dung bị báo, không kết luận thay cơ quan. Token dịch ghi là đơn vị dùng dịch vụ, không phải tiền, không chuyển, QR đúng giá, không giữ số dư. Dữ liệu: video xử lý trên máy khách; tiếng gửi Groq (Hoa Kỳ) hoặc Alibaba (Singapore); Neural gửi chữ qua phòng; Orpheus key phòng trừ Token dịch. Không bịa tên doanh nghiệp. Không thêm trang chính sách riêng. TERMS_VERSION 2026-11-17.1.",
  },
  {
    version: "5.0.0",
    time: "23:55 ngày 16/11/2026",
    area: "tien",
    text: "Bỏ nạp số dư. Mua Token dịch và thuê phòng tạo đơn QR (purpose token hoặc plan). Webhook và xác nhận tay giao đúng món, không cộng balance. Đơn nạp cũ vẫn cộng ví nếu còn. Migration 0025 đưa số dư về 0, hủy đơn nạp đang chờ, nhả phiếu đồng đang giữ mà không hoàn. Orpheus trừ token theo giá gốc. Neural không trừ. Trang /goi chỉ còn bảng giá, không còn ví giả. Điều khoản 2026-11-16.4.",
  },
  {
    version: "4.1.1",
    time: "22:55 ngày 16/11/2026",
    area: "tien",
    text: "Bước 9 gói giây: chữ khách. Hướng dẫn và tuyến Chỉ tôi nói dịch trực tiếp cùng gói giây, hết giây thì dừng, thuyết minh trừ số dư. Kệ gói giây ghi cả hai cửa. Câu Trả theo lượt bỏ giữ ví. Điều khoản 2026-11-16.3: tóm tắt và bảng giá. Không đổi cách tính.",
  },
  {
    version: "4.1.0",
    time: "22:12 ngày 16/11/2026",
    area: "tien",
    text: "Bước 5–8 gói giây. Dịch trực tiếp giữ và trừ giây (unit token), không trừ ví, không áp hạn mức đồng. Cầu nối đổi giá gốc ra giây theo Turbo. Thuê phòng giữ 9000/39000/99000. asrPerSecond và chatPerMillion bỏ giá tay. Ô giá riêng Groq và Alibaba đã gỡ, lần lưu xóa custom. Alibaba kéo bảng Singapore vào room_settings ali_board, chưa kéo được thì giữ ALIBABA_ROWS. Điều khoản 2026-11-16.2.",
  },
  {
    version: "4.0.0",
    time: "21:50 ngày 16/11/2026",
    area: "tien",
    text: "Bước 1–4 gói giây (nội bộ gọi token). 1 giây dịch = 1 giây Turbo giá gốc. Gói bán = giây × giá Turbo × (1+chênh) × đệm, mặc định chênh 50 và đệm 1.2, lưu room_settings token_desk. Ví đồng không quy đổi. Mua gói trừ ví, kind goi-giay, không hoa hồng. Cửa trả theo lượt giữ và trừ giây (run_tickets.unit token), hết hạn không trả. Phiếu đồng, dịch trực tiếp và thuyết minh vẫn trừ ví. Không làm bước 5–8.",
  },
  {
    version: "3.47.13",
    time: "12:20 ngày 16/11/2026",
    area: "khac",
    text: "Phần chỗ để riêng 8/8. Viền role-mark theo --line-w. Bóng ruy-băng, viên thuốc, bóng chữ bảo trì và .tour-scrim theo --shadow-amt. Mức 1 không đổi hình. Không đụng màu phụ đề, nút tròn, favicon, 5 màu dự phòng tia lửa. Không đổi điều khoản."
  },
  {
    version: "3.47.12",
    time: "12:13 ngày 16/11/2026",
    area: "khac",
    text: "Phần xem trước cả trang 7/8. ThemeBoard gắn themeToCss của bản nháp lên style data-theme-live khi đang mở tab Giao diện, gỡ khi rời. Nút Hoàn tác tối đa 30 bước, chỉ trong phiên. Khách vẫn cần Công bố. Không đổi điều khoản."
  },
  {
    version: "3.47.11",
    time: "12:06 ngày 16/11/2026",
    area: "khac",
    text: "Phần icon nhóm 6/8. iconGroups nav/act/st/ui, mặc định same nên vẫn theo iconWeight. Danh sách icon trong tab Biểu tượng chia bốn nhóm. Không đổi điều khoản."
  },
  {
    version: "3.47.10",
    time: "11:59 ngày 16/11/2026",
    area: "khac",
    text: "Phần tách tab 5/8. theme-board có sáu tab: Màu, Chữ, Hình khối, Biểu tượng, Chuyển động, Trang riêng. Xem trước và lịch sử vẫn hiện. Không thêm trường mới. Không đổi điều khoản."
  },
  {
    version: "3.47.9",
    time: "11:51 ngày 16/11/2026",
    area: "khac",
    text: "Phần bảo trì 4/8. mtText tối đa 10 ký tự, rỗng về BẢO TRÌ. mtBoard error/warning/accent/info, mặc định error. mtFx on/off tắt tia lửa, rung và nhấp nháy khi off, robot vẫn đi. mtShow sign ẩn thân robot và bỏ cảnh đi. Không đổi điều khoản."
  },
  {
    version: "3.47.8",
    time: "11:41 ngày 16/11/2026",
    area: "khac",
    text: "Phần chuyển động 3/8. motion on/off mặc định on. motionSpeed slow/mid/fast mặc định mid, không ghi thuộc tính khi mid. CSS data-motion=off cắt thời lượng. prefers-reduced-motion luôn tắt. Cửa vào chờ 400ms khi tắt hoặc máy giảm chuyển động. Không đổi điều khoản."
  },
  {
    version: "3.47.7",
    time: "11:29 ngày 16/11/2026",
    area: "khac",
    text: "Phần bố cục 2/8. pageWidth 40–120 rem, mặc định 120, gắn .room-wide. menuSide left/right, mặc định left. CSS data-menu=right đưa rail sang phải, kể cả lưới ghim. Phòng dịch không bị thu. Không đổi điều khoản."
  },
  {
    version: "3.47.6",
    time: "11:02 ngày 16/11/2026",
    area: "khac",
    text: "Phần chữ 1/8. titleFont, titleWeight keep/500/600/700, leading 1.3–1.8 mặc định 1.5. Cỡ chữ --font-scale nay áp vào html. Tiêu đề h1–h4 lấy --font-title. Độ đậm chỉ khi khác «như hiện tại». Không đổi điều khoản."
  },
  {
    version: "3.47.5",
    time: "10:50 ngày 16/11/2026",
    area: "khac",
    text: "Kiểu nút và bộ màu. Theme.button solid/line/soft, mặc định solid. CSS data-button chỉ đổi nút và liên kết đang có lớp bg-accent. Tám PALETTES, mỗi bộ qua checkTheme. Bấm bộ chép sáng và tối vào nháp. Không đổi điều khoản."
  },
  {
    version: "3.47.4",
    time: "10:41 ngày 16/11/2026",
    area: "khac",
    text: "Hình khối: Theme.line 1–3, mặc định 1. themeToCss ghi --line-w. Lớp .border và 22 khung 1px trong styles.css theo biến. Hai viền huy hiệu giữ 1px. Viền 2px (nét đứt, vòng tour, núm kéo) không đụng. Không đổi điều khoản."
  },
  {
    version: "3.47.3",
    time: "10:32 ngày 16/11/2026",
    area: "khac",
    text: "Icon bước 7. Theme.iconSize sm/md/lg (0.85/1/1.15) và iconTone text/accent. Icon áp zoom khi khác 1, tô màu nhấn khi accent. Mặc định md + text nên không đổi hình. Giá trị lạ về mặc định. Không đổi điều khoản."
  },
  {
    version: "3.47.2",
    time: "10:23 ngày 16/11/2026",
    area: "khac",
    text: "Icon bước 6. theme-board: ô tìm chức năng, bấm tên để mở lưới hình có ô tìm, nút Đặt lại icon này ghi lại icon mặc định qua parseTheme. Xem trước dùng bản nháp, kể cả kiểu nét. Không thêm chỗ mới. Không đổi điều khoản."
  },
  {
    version: "3.47.1",
    time: "10:15 ngày 16/11/2026",
    area: "khac",
    text: "Đổ bóng bước 2. Quầng sáng trong styles.css nhân độ đậm với --shadow-amt. Gồm vòng nhấn, chấm thành công/lỗi, thẻ tổ chức, đèn cảnh báo, khung phiên bản. Không đụng viền huy hiệu (rail, sash, offset), vòng focus, bóng chữ và màn tối hướng dẫn. Mức 1 giữ số cũ. Không đổi điều khoản."
  },
  {
    version: "3.47.0",
    time: "10:08 ngày 16/11/2026",
    area: "khac",
    text: "Đổ bóng bước 1. Theme.shadow 0–1.5, mặc định 1. themeToCss ghi --shadow, --shadow-lg, --shadow-xl nên lớp shadow, shadow-lg, shadow-xl đổi theo. Thanh trong theme-board, ô xem trước có shadow-lg. Không đụng bóng phát sáng, viền huy hiệu, bóng chữ, màn tối của hướng dẫn. Không đổi điều khoản."
  },
  {
    version: "3.46.18",
    time: "09:50 ngày 16/11/2026",
    area: "khac",
    text: "Icon bước 5, hết 9 file lucide. Thêm 16 chỗ: video, audio, busy, repair, mic, tab, speaker, mute, paste, options, more, skip, help, rotate, compact, roomy. studio, live-screen, home-hero, player-drop, steps-bar, export-menu, display-toggle, site-maintenance, service-notice không còn lucide-react. Nút chuông giữ nét vẽ cũ; nút sáng/tối thêm lớp is-glyph để icon tô đặc. Không đổi điều khoản."
  },
  {
    version: "3.46.17",
    time: "09:37 ngày 16/11/2026",
    area: "khac",
    text: "Icon bước 4. home-hero và player-drop: Upload thành act.upload, Link2 thành act.link. home-hero KeyRound thành ui.key. Hai file vẫn còn lucide (video, âm thanh, vòng xoay, thanh trượt). Không thêm slot. Không đụng studio. Không đổi điều khoản."
  },
  {
    version: "3.46.16",
    time: "09:29 ngày 16/11/2026",
    area: "khac",
    text: "Icon bước 3. top-up: Check/Copy thành st.ok và act.copy. cue-editor: Check thành st.ok, X thành act.close. error-component: TriangleAlert thành st.error. Ba file hết lucide. Còn 9 file. Không thêm slot. Không đổi điều khoản."
  },
  {
    version: "3.46.15",
    time: "09:21 ngày 16/11/2026",
    area: "khac",
    text: "Icon bước 2. Wallet lucide ở home-hero, money-card, live-screen đổi thành Icon slot nav.wallet. money-card hết import lucide. Còn 12 file lucide. Không thêm slot mới. Không đổi điều khoản."
  },
  {
    version: "3.46.14",
    time: "08:40 ngày 16/11/2026",
    area: "khac",
    text: "Icon bước 1. Thêm slot ui.hide (EyeSlash) và icon EyeSlash vào registry. Nút xem/ẩn key ở studio, service-pack-board, alibaba-key-board, run-desk-board dùng Icon slot ui.eye / ui.hide thay lucide Eye/EyeOff. Ba file kia hết import lucide. studio vẫn còn icon lucide khác. Không đổi điều khoản."
  },
  {
    version: "3.46.13",
    time: "08:33 ngày 16/11/2026",
    area: "khac",
    text: "Bo góc bước 3. 4 rounded-lg và 5 rounded-md thành --radius-ctl (ô nhập gói, ô link, ảnh tệp, câu phụ đề, cột biểu đồ, nút cổng). 1 rounded-3xl của ô thả video thành --radius-card. Mặc định các chỗ này tròn hơn một chút (0.375rem hoặc 0.5rem lên 0.75rem; ô thả từ 1.5rem về 1rem). rounded-none và nút tròn không đụng. Không đổi điều khoản."
  },
  {
    version: "3.46.12",
    time: "08:26 ngày 16/11/2026",
    area: "khac",
    text: "Bo góc bước 2. styles.css: 8 chỗ border-radius 1rem thành --radius-card (thẻ studio, admin, menu, cổng, tổ chức), 2 chỗ 0.75rem thành --radius-ctl (mục menu và mục rail). Mặc định không đổi hình. Không đụng 999px, 50%, góc md/lg/3xl, đổ bóng. Không đổi điều khoản."
  },
  {
    version: "3.46.11",
    time: "08:18 ngày 16/11/2026",
    area: "khac",
    text: "Phần bo góc, bước 1. 224 lớp rounded-xl thành rounded-[var(--radius-ctl)], 66 lớp rounded-2xl (kể cả rounded-t-2xl) thành radius-card. Mặc định vẫn 0.75rem và 1rem nên nhìn không đổi cho đến khi kéo thanh bo góc. Còn 187 dòng: 176 rounded-full, 5 md, 4 lg, 1 3xl, 1 none. Không đổi điều khoản."
  },
  {
    version: "3.46.10",
    time: "08:11 ngày 16/11/2026",
    area: "khac",
    text: "Đồng bộ màu, bước 4/4. MAIL_POLICY lấy nền, mực và nút từ LIGHT_DEFAULT (thư là trang sáng; màu đã lưu của chủ vẫn giữ). popup.server.ts lấy nền và chữ phụ từ DARK_DEFAULT. Không dịch câu tiếng Anh của cửa sổ này. Không đụng màu phụ đề và màu dự phòng của tia lửa. Không đổi điều khoản."
  },
  {
    version: "3.46.9",
    time: "08:04 ngày 16/11/2026",
    area: "khac",
    text: "Đồng bộ màu, bước 3/4. styles.css hết mã hex ngoài mặc định token. Nền trang bảo trì dùng --color-bg/--color-fg/--color-ink. Lời nhắn và nút quản trị dùng fg/muted. Nhấp chữ dùng --color-info và --color-error. Mặt nạ đèn dùng từ khóa black, không phải màu vẽ. Chưa đụng thư và popup. Không đổi điều khoản."
  },
  {
    version: "3.46.8",
    time: "07:55 ngày 16/11/2026",
    area: "khac",
    text: "Đồng bộ màu, bước 2/4. site-maintenance.tsx hết mã hex: kim loại dùng fg/muted/line, mắt và đèn ngực dùng --color-info, biển và đèn mũ dùng --color-error, chữ trên biển là trắng. styles.css: nhịp tắt đèn mũ trộn --color-error. Nền đêm chưa đổi. Không đổi điều khoản."
  },
  {
    version: "3.46.7",
    time: "07:47 ngày 16/11/2026",
    area: "khac",
    text: "Đồng bộ màu, bước 1/4. styles.css: nền logo (.brand-plate) dùng --color-card; vạch mật khẩu tắt dùng --color-line; dải huy hiệu hỗ trợ dùng --color-info, quản lý dùng --color-accent, chủ dùng --color-accent và --rank-owner. Không đụng nền đêm, robot, thư. Không đổi điều khoản."
  },
  {
    version: "3.46.6",
    time: "07:41 ngày 16/11/2026",
    area: "khac",
    text: "Phần chữ, một bước. error-component.tsx: tiêu đề «Đã xảy ra lỗi», lời dự phòng «Không rõ lỗi gì. Hãy tải lại trang.». Không dịch errors.ts và nút Continue with trong gates.tsx vì không gắn vào trang đang chạy. Không đổi điều khoản."
  },
  {
    version: "3.46.5",
    time: "07:28 ngày 16/11/2026",
    area: "khac",
    text: "Bước 5 theme. Bỏ hết lớp màu Tailwind bảng (red, emerald, amber, zinc, neutral). top-up.tsx: nhãn đơn và nút hủy dùng success/warning/error. error-component.tsx: nền và chữ theo bg/fg/muted/error, bỏ lớp dark:. gates.tsx: nút đăng nhập ngoài dùng line và raised. Không dịch câu tiếng Anh có sẵn trên trang lỗi. Không đụng robot, phụ đề, icon, bo góc. Không đổi điều khoản."
  },
  {
    version: "3.46.4",
    time: "07:21 ngày 16/11/2026",
    area: "khac",
    text: "Bước 4 theme. HEALTH_COLOR và BAND_COLOR trong quality-view.tsx, nền thanh ở quality-board.tsx, đường thu/chi trong revenue-extra.tsx, chấm phiếu trong admin-desk.tsx và chấm cảnh báo trong admin-overview.tsx dùng --color-success, --color-warning, --color-error, --color-muted, --color-line. Chữ trên đèn chất lượng dùng --color-bg để đọc được cả hai chế độ. Không đụng robot, phụ đề, icon, bo góc, thư HTML. Không đổi điều khoản."
  },
  {
    version: "3.46.3",
    time: "07:12 ngày 16/11/2026",
    area: "khac",
    text: "Bước 3 theme. Trang bảo trì: màu cam cảnh báo (dải, lưới, đèn, tiêu đề, vòng, tia lửa, áo và sọc robot, viền biển) lấy --color-warning; mũ lấy --color-accent. Tia lửa đọc màu đã tính từ trang, có màu dự phòng. Nền đêm, kim loại, mắt, biển đỏ và hiệu ứng nhấp nháy chữ giữ nguyên. Không đổi điều khoản."
  },
  {
    version: "3.46.2",
    time: "06:58 ngày 16/11/2026",
    area: "khac",
    text: "Bước 2 theme, chỉ styles.css. Toast dùng --color-card/--color-fg, toast lỗi trộn --color-error. Dải mất mạng: nền --color-error, chữ --color-bg (đủ tương phản cả hai chế độ). Chấm cửa: --color-success/--color-error. Ô thuê dùng --rank-partner (trùng màu ô cộng tác viên). Ô khóa dùng --color-warning (trùng ô chờ). Mực huy hiệu cấp dùng --color-ink. Nút đăng xuất menu dùng --color-error. Không đụng robot, khối .mt-*, màu phụ đề, icon Lucide, bo góc. Không đổi điều khoản."
  },
  {
    version: "3.46.1",
    time: "05:58 ngày 16/11/2026",
    area: "khac",
    text: "Theo yêu cầu người dùng: nút «Xem trước trang bảo trì» ở Admin → Cấu hình → Toàn web. SiteMaintenancePage nhận onClose (có thì phủ z-60, nút Đóng và Esc thay lối vào quản trị) và dùng đúng chữ đang nhập chưa lưu. Không đổi dữ liệu hay điều khoản."
  },
  {
    version: "3.46.0",
    time: "19:56 ngày 15/11/2026",
    area: "khac",
    text: "Theo yêu cầu người dùng: trang bảo trì toàn web có robot vác biển. ServiceEntry thêm title (tối đa 60 ký tự, trống thì dùng SITE_TITLE_DEFAULT; bản lưu cũ thiếu title vẫn đọc được, không migration); siteMaintenanceText lấy chữ hiển thị. Admin → Cấu hình → Toàn web có thêm ô tiêu đề. Cảnh dựng ở lib/maintenance-scene.ts (Web Animations + canvas hạt, dispose được, tôn trọng giảm chuyển động), giao diện ở components/site-maintenance.tsx, CSS tiền tố mt- cuối styles.css. Logo dùng BrandMark và theme.brandName. Không đổi giá, quyền, dữ liệu nên không sửa điều khoản."
  },
  {
    version: "3.45.1",
    time: "18:13 ngày 15/11/2026",
    area: "khac",
    text: "Theo yêu cầu người dùng: đồng bộ các ô thông báo mặc định của trình duyệt với web, từ nay về sau. Thêm lib/confirm.ts: askConfirm({title,text,confirmLabel,cancelLabel,danger}) trả Promise<boolean>, và components/confirm-dialog.tsx: ConfirmHost gắn ở gốc (cạnh ToastHost); hỗ trợ Esc, bấm ra ngoài, Tab quay vòng, trả tiêu điểm, hàng đợi, việc nguy hiểm thì nút đỏ và tiêu điểm đặt ở Hủy; host chưa sẵn sàng thì trả false (chọn phía an toàn). Thay 7 chỗ window.confirm hoặc confirm: bảng trạng thái dịch vụ (Admin), ẩn mọi bộ thuật ngữ, xóa từ, xóa khoản chi phí, đăng xuất ở menu trái, xóa phụ đề làm lại, gửi khoảng trống (use-pipeline). Button nhận prop ref. Chốt chặn: lib/no-native-dialog.test.ts quét src và fail nếu còn alert, confirm, prompt mặc định (đã thử cố ý vi phạm, test bắt đúng). Thông báo thường dùng pushToast. Chạy thật bằng Chrome: hộp hiện đúng giao diện, Esc, Hủy, bấm ra ngoài đều không làm gì, nút chính mới chạy, 0 hộp mặc định bật lên. Chưa kiểm bằng trình duyệt: hộp xóa từ, xóa khoản chi phí, xóa phụ đề làm lại, gửi khoảng trống (cùng một cách gọi, tsc sạch, cần dữ liệu thật mới bấm tới). Không đổi giá, quyền, luật ví, điều khoản.",
  },
  {
    version: "3.45.0",
    time: "17:57 ngày 15/11/2026",
    area: "khac",
    text: "Theo yêu cầu người dùng: bảo trì cả web nhưng vẫn vào được trang Admin. Thêm mục site vào cùng bản ghi room_settings «service_status» (JSON, không migration; bản lưu cũ thiếu site thì Hoạt động). service-status.ts: ServiceScope, siteBlock, siteOpenPath (chỉ /admin và /login cùng đường con và tham số, không mở nhầm /administrator), serviceBlock cho site thắng nhóm nên openLiveTicket, openRunTicket, spendTrial, runAliFiletrans tự chặn cả hai nhóm khi cả web bảo trì. cleanServiceStatus đòi đủ ba mục: màn hình cũ lưu thiếu site bị từ chối, không lỡ mở lại cả web. Giao diện: root loader đọc trạng thái (SSR ra thẳng trang bảo trì, không nháy), SiteGate + SiteMaintenancePage (site-maintenance.tsx), thẻ «Toàn web» ở bảng Admin với hộp xác nhận riêng, dải Tổng quan có Toàn web. Lượt dịch chạy ở trình duyệt khách nên trang đã mở lúc web còn mở KHÔNG bị gỡ giữa chừng: chỉ hiện dải báo, trang bảo trì thay vào khi tải lại hoặc sang trang khác. Mở lại thì gỡ ngay (hỏi lại mỗi phút). Chạy thật bằng Chrome: Admin bật và lưu, khách ở 390 px thấy trang bảo trì ở mọi trang, /login và /admin mở, ba cổng máy chủ chặn, mở lại bình thường. Không đổi giá, quyền, luật ví, điều khoản (không có câu nào về bảo trì). Chưa có: tự mở lại theo giờ hẹn, Chủ chạy thử dịch khi cả web bảo trì (hiện cũng bị chặn), chặn /api/relay-alibaba (như v3.44).",
  },
  {
    version: "3.44.1",
    time: "10:54 ngày 15/11/2026",
    area: "khac",
    text: "Theo yêu cầu người dùng (kiểm lại v3.44.0). Chạy thật bằng Chrome + Playwright (dev, đăng nhập tắt, seed quyền Chủ cho dev-user bằng route tạm đã xóa): bảng Admin → Cấu hình lưu được, hộp xác nhận hiện, khách thấy lời nhắn và giờ dự kiến, nút bắt đầu khóa; máy chủ chặn đúng nhóm ở openLiveTicket (live), openRunTicket và spendTrial (normal), nhóm kia vẫn qua cổng. Đường room-groq và room-alibaba đòi phiếu x-run-ticket nên đã kín nhờ openRunTicket. Lỗi tìm thấy: dòng trạng thái đầu trang vẫn ghi «Sẵn sàng. Chọn video rồi bấm Tải và dịch.» khi Dịch bình thường bảo trì. Sửa: use-pipeline.ts xuất READY_STATUS; studio.tsx đổi chữ hiển thị khi normalDown, chưa chạy và status còn là READY_STATUS (lỗi và kết quả thật giữ nguyên). Không đổi giá, quyền, luật ví, điều khoản. Vẫn chưa chặn /api/relay-alibaba (key riêng của khách): relay không có phiếu nên không phân biệt lượt mới với lượt đang chạy, chặn sẽ cắt lượt dở.",
  },
  {
    version: "3.44.0",
    time: "10:15 ngày 15/11/2026",
    area: "khac",
    text: "Theo yêu cầu người dùng: chia Dịch trực tiếp và Dịch bình thường, mỗi nhóm Hoạt động hoặc Bảo trì, Chủ đặt ở Admin. Lưu ở room_settings khóa service_status (JSON, không cần migration). lib/service-status.ts (hàm thuần, có test), service-status-room.ts (getServiceStatus công khai, saveServiceStatus chỉ Chủ, nhật ký thao tác «bao-tri»), service-status.server.ts (requireServiceOpen). Máy chủ chặn lượt MỚI ở openLiveTicket (live), openRunTicket, spendTrial, runAliFiletrans op submit (normal); lượt đã mở chạy nốt. Khách dùng key riêng: máy chủ không nằm trong đường đi nên chặn ở use-pipeline start (client), chỉ là chặn ở giao diện. Giao diện: ServiceSwitch + MaintenanceNotice (service-notice.tsx), nhãn Bảo trì ở menu trái (RailItem.badge), nút bắt đầu bị khóa, bảng Admin ở tab Cấu hình (service-status-board.tsx), dải trạng thái ở tab Tổng quan. Chưa đổi điều khoản (chưa chặn cả phòng). CHƯA kiểm bằng trình duyệt thật.",
  },
  {
    version: "3.43.2",
    time: "09:10 ng\u00e0y 15/11/2026",
    area: "khac",
    text: "Theo yêu cầu người dùng (hai lỗi đầu trong danh sách mới). (1) Khung thông báo bị lệch: .notice-panel neo right:0 vào chuông nên trên màn hẹp (chuông không sát mép phải, như Admin có thêm nút Về phòng) khung 18rem tràn ra mép trái; thêm @media (max-width: 640px) cho khung neo theo màn hình (position fixed, trái và phải 0.75rem, cách đỉnh theo safe-area). (2) Không có tài khoản vẫn vào được phòng: termsGate (lib/terms.ts) trả enter ngay khi máy đã tích đồng ý điều khoản, không xét đã đăng nhập chưa. Sửa: chờ biết đăng nhập chưa; chưa đăng nhập thì luôn sang /login; đã đăng nhập thì đồng ý rồi vào, chưa đồng ý bản này thì hỏi lại. entry-gate.tsx thêm: đang ở trong phòng mà phiên mất thì đưa về /login. Chữ điều khoản không đổi (đã nói không đồng ý thì không mở được phòng), TERMS_VERSION giữ 2026-11-15.1. Tài khoản dev (đăng nhập tắt) vẫn là user nên vẫn vào được. terms.test.ts viết lại cho luật mới. CHƯA kiểm bằng trình duyệt thật (điện thoại 360 px, hết phiên giữa chừng).",
  },
  {
    version: "3.43.1",
    time: "04:15 ngày 15/11/2026",
    area: "khac",
    text: "Người dùng báo trang Dịch trực tiếp không cuộn được trên điện thoại. Nguyên nhân: html và body đặt overflow hidden (styles.css), mà live-screen, guide-page, ctv và tai-video chỉ dùng min-h-dvh nên không có vùng cuộn. Sửa: khung main của bốn trang đổi sang h-dvh overflow-y-auto. Thêm test chặn lỗi tái diễn trong back-nav.test.ts. Không đổi dịch vụ, giá, quyền hay điều khoản.",
  },
  {
    version: "3.43.0",
    time: "02:40 ngày 15/11/2026",
    area: "du-lieu",
    text: "Theo yêu cầu người dùng (việc 3 của góp ý giao diện, «làm theo đề xuất»). Kiểm thấy run_tickets.file_name lưu tên đầy đủ và trước đây máy chủ gửi nguyên tên cho mọi nhân viên, che chỉ ở trình duyệt. Đổi: ticketOf (admin-room.ts) và searchTicketsWith (overview-data.ts) che tên ở máy chủ; tìm theo tên tệp chỉ Chủ (nhân viên khác không dò được tên bằng cách thử chữ); thêm revealTicketFileName (overview-room.ts, chỉ Chủ, writeAudit «xem-ten-tep» mỗi lần, dòng nhật ký không chứa tên tệp); nút «Hiện tên đầy đủ» ở Phiếu cho Chủ. Điều khoản mục 4 thêm đoạn nói rõ phiếu có tên tệp, nhân viên chỉ thấy bản che, Chủ xem có nhật ký, phòng không lưu video; TERMS_VERSION nâng 2026-11-13.4 sang 2026-11-15.1 nên mọi người đồng ý lại. Không đổi giá, hạn mức, luật ví hay quyền khác. Phiếu cũ vẫn hiện được vì tên đầy đủ đã lưu từ trước.",
  },
  {
    version: "3.42.0",
    time: "02:10 ngày 15/11/2026",
    area: "khac",
    text: "Theo yêu cầu người dùng (hai việc đầu trong ba việc góp ý giao diện). (1) Bỏ liên kết Điều khoản ở chân trang đăng nhập và cuối Hướng dẫn; còn ba chỗ: ô tích đăng ký/đăng nhập, menu trái, trang Tài khoản. (2) Thêm components/back-button.tsx (mũi tên quay lại: có trang trước trong app thì back, không có thì về trang chủ; luật ở lib/back-nav.ts, có test) cho Hướng dẫn, Dịch trực tiếp, Tài khoản, Thuê phòng, Cộng tác viên, Tải video, Điều khoản. Các tab cùng trang: Admin nhớ tab vừa rời, mũi tên về tab đó, hết lịch sử thì về Tổng quan, đang ở Tổng quan thì rời trang; mục Số dư trong Studio về màn vừa xem (người dùng chưa chốt tab nên chọn «về tab vừa xem»). Không đổi chữ điều khoản (TERMS_VERSION giữ 2026-11-13.4), giá, quyền hay luật ví. Việc 3 (hiện lại tên tệp đầy đủ trong Phiếu) chưa làm, chờ người dùng chốt.",
  },
  {
    version: "3.41.0",
    time: "01:35 ngày 15/11/2026",
    area: "khac",
    text: "Theo yêu cầu người dùng, phần 3 trong ba phần (gom điều khoản về một chỗ). Chỉ đổi chỗ hiển thị: không đổi chữ điều khoản, giá, quyền hay luật ví; TERMS_VERSION giữ 2026-11-13.4 nên người đã đồng ý bản này không bị hỏi lại. Chữ điều khoản chuyển nguyên văn từ entry-gate.tsx sang components/terms-document.tsx (đã so dấu vân tay chữ trước và sau, giống hệt); entry-gate.test.ts giữ dấu vân tay đó, đổi chữ mà không nâng TERMS_VERSION thì test đỏ. TERMS_VERSION, TERMS_KEY (vẫn là gterms), hasAcceptedTerms, rememberTermsAccepted và termsGate (quyết vào thẳng, sang /login, hỏi lại hay đợi) nằm ở lib/terms.ts, có terms.test.ts. Cửa vào (entry-gate.tsx): đã đồng ý bản này thì vào thẳng; chưa đồng ý và chưa có tài khoản thì sang /login thay vì hiện màn điều khoản; đã có tài khoản mà TERMS_VERSION mới thì chỉ người đó thấy màn hỏi lại. Chế độ đăng nhập tắt (tài khoản dev) vẫn thấy màn hỏi lại rồi vào được như trước. login.tsx: ô tích «Tôi đồng ý Điều khoản và Chính sách» ở cả Đăng nhập và Đăng ký (máy đã đồng ý bản này thì hiện sẵn dấu), chưa tích thì không gọi đăng nhập, tích rồi bấm gửi thì lưu gterms ngay; bỏ đoạn đá về trang chủ khi chưa đồng ý (sẽ vòng lặp với cửa vào). Trang mới /dieu-khoan (routes/dieu-khoan.tsx) không bọc EntryGate nên đọc được bất cứ lúc nào, không cần đăng nhập. Liên kết components/terms-link.tsx ở chân trang đăng nhập, menu trái (rail-foot, dùng chung trang chủ, Dịch trực tiếp, Hướng dẫn), trang Tài khoản và cuối trang Hướng dẫn. routeTree.gen.ts sinh lại cho route mới. CHƯA đổi: /huong-dan vẫn bọc EntryGate (người chưa đồng ý sẽ sang /login trước). Câu §2, §6, §7 trong điều khoản vẫn nói «bấm đồng ý» và «màn mở phòng»; đúng ý nhưng có thể sửa chữ cho khớp ô tích, việc đó phải nâng TERMS_VERSION và hỏi lại mọi người nên chờ người dùng chốt. CHƯA kiểm bằng trình duyệt thật (Safari, điện thoại thật, Vercel).",
  },
  {
    version: "3.39.0",
    time: "00:23 ngày 15/11/2026",
    area: "khac",
    text: "Theo yêu cầu người dùng, phần 1 trong ba phần (trang Hướng dẫn; phần 2 guided tour làm mờ nền và phần 3 gom điều khoản làm ở các bản sau). Không đổi giá, quyền, luật ví hay điều khoản. Thêm trang /huong-dan (routes/huong-dan.tsx bọc EntryGate, components/guide-page.tsx): mục lục, ô tìm kiếm không dấu, 9 mục + câu hỏi thường gặp, nút «Chỉ tôi» ở mục Bắt đầu nhanh (lưu yêu cầu vào sessionStorage bằng lib/tour-request.ts rồi về trang chủ, studio.tsx đọc một lần bằng ref để StrictMode không làm mất). Nội dung ở lib/guide-topics.ts: giá gói, hạn dùng thử, thời gian giữ đơn nạp lấy từ hằng số (room-plans, pay-minutes); mọi tên nút nhắc trong chữ nằm trong bảng UI và guide-topics.test.ts kiểm từng tên còn xuất hiện trong mã giao diện; mục mật khẩu đổi theo getMailFace().resetOn. Các bước tuyến «Chỉ tôi» tách ra lib/tour-steps.ts (GuidedTour đọc từ đó); test kiểm mỗi nhãn data-tour còn tồn tại. Liên hệ hỗ trợ: Chủ nhập ở tab Cấu hình (components/support-board.tsx), lưu trong room_settings khóa support_contact (JSON), đọc công khai bằng getSupportContact (lib/support-room.ts), lưu chỉ Chủ và ghi nhật ký thao tác «lien-he» chỉ ghi tên các ô đã điền. Mọi ô đi qua lib/support-contact.ts: email, Zalo (số điện thoại hoặc zalo.me), Facebook (https của facebook.com, fb.com, m.me), ghi chú tối đa 200 ký tự; liên kết dựng ra chỉ là mailto: hoặc https:. Ảnh minh họa tùy chọn đặt ở public/huong-dan/ (groq-tao-key.png, chia-se-tab.png), thiếu thì khung ảnh tự ẩn. Menu trái (trang chủ, Dịch trực tiếp) và Ctrl+K có mục Hướng dẫn. Đã chạy tsc, test mới (support-contact, guide-topics), vite build, và mở thật bằng Chrome ở 390 và 1280 px: không tràn ngang, tìm kiếm và «Chỉ tôi» chạy. CHƯA kiểm: Safari, điện thoại thật, trang trên Vercel, trang Admin có tài khoản Chủ thật (ô liên hệ mới chỉ qua kiểu và test hàm).",
  },
  {
    version: "3.38.0",
    time: "23:55 ngày 14/11/2026",
    area: "khac",
    text: "Theo yêu cầu người dùng: làm nốt bước 5 đến 8 của màn hình Dịch trực tiếp (nhánh work). Không đổi giá, luật giữ và trừ ví, quyền hay điều khoản. Thêm trang /dich-truc-tiep (routes/dich-truc-tiep.tsx, bọc EntryGate như trang chủ), components/live-screen.tsx (chọn nguồn micro hoặc tab, ngôn ngữ nói, ngôn ngữ đích, model, bật tiếng dịch; nút Bắt đầu/Dừng; chữ gốc + chữ dịch từ LiveTranscript, phần stash mờ; số dư kèm còn khoảng N phút, cảnh báo sắp hết tiền, nạp nhanh bằng TopUp; menu Tải SRT/VTT/TXT dùng lại ExportMenu), components/use-live.ts (nối LiveSession với micEnv/tabEnv, trình phát và openLiveTicket). Loa và hộp chọn tab được mở ngay trong cú bấm, trước khi xin vé, vì Safari và Chrome chỉ cho trong lúc cú bấm còn hiệu lực; luồng âm thanh đã lấy được đưa vào startCapture khi cầu nối báo ready và được nhả ở mọi đường kết thúc. Số dư: ví đã trừ tiền giữ nên còn lại = số dư tự do (getRoomAccount, làm mới tối đa 15 giây một lần và khi đóng phiên) + heldLeft từ cầu nối. Mới: lib/live/live-view.ts (số phút, mức cảnh báo, nhãn trạng thái, đồng hồ) và live-export.ts (đổi dòng sang Seg rồi dùng toSrt/toVtt/toTxt có sẵn), cùng hai file test. Menu trái và Ctrl+K của trang chủ có mục Dịch trực tiếp. Đã chạy tsc, npm test và vite build. CHƯA kiểm bằng trình duyệt thật (loa, micro, chia sẻ tab, Safari) và CHƯA nối Alibaba thật (chưa có Workspace ID, chưa đặt LIVE_BRIDGE_URL/LIVE_BRIDGE_SECRET).",
  },
  {
    version: "3.37.0",
    time: "23:20 ngày 14/11/2026",
    area: "khac",
    text: "Theo yêu cầu người dùng: chức năng chạy tốt trên từng loại thiết bị nếu hỗ trợ. Không đổi dịch vụ, giá, ví, quyền hay điều khoản. Thêm src/lib/device-caps.ts (hàm thuần detectCaps: chuột/cảm ứng, micro, thu âm thanh tab, khóa hướng, khóa sáng màn hình, đọc bộ nhớ tạm) và use-caps.ts (useCaps, useWakeLock); sẽ dùng lại cho màn hình Dịch trực tiếp. Dùng ngay: trang chủ đổi chữ gợi ý theo máy cảm ứng; giữ màn hình sáng khi đang chạy hoặc phân tích (Wake Lock, xin lại khi quay về tab); toàn màn hình thử API chuẩn rồi tiền tố webkit rồi khung phủ kín (iPhone), có Esc và khóa cuộn nền; nút Xoay chỉ hiện trên Android. Test mới device-caps.test.ts (5 ca: Chrome máy tính, iPhone, Android, iPad giả Mac, trang không HTTPS). CHƯA thử trên thiết bị thật nào; kết quả dựa trên đặc tả và tài liệu, cần thử iPhone Safari, Android Chrome, iPad, Firefox.",
  },
  {
    version: "3.36.0",
    time: "22:40 ngày 14/11/2026",
    area: "khac",
    text: "Làm trên nền v3.35.0, theo yêu cầu người dùng (mục 5, nhánh work). Chỉ đổi giao diện trang chủ (home-hero.tsx), không đổi dịch vụ, giá, ví, quyền hay điều khoản. Khoảng trống: ô thả cao hơn (15rem, 19rem từ màn sm), khoảng cách giữa các khối gap-5/gap-6, đệm trên dưới py-6/py-10. Chữ lớn: tiêu đề ô thả 2xl/3xl, tên tệp lg/xl, ô link và hàng phụ base, nút Tải và dịch cao tối thiểu 3,5rem chữ lg. Kéo thả: lắng nghe dragenter/dragleave/dragover/drop trên window chỉ khi dữ liệu kéo có Files; kéo vào trang thì ô thả nhấp nháy, kéo vào ô thì phóng 1,02 lần, viền sáng, nền nhấn nhạt, chữ đổi; thả ngoài ô vẫn nhận tệp (bỏ qua nếu ô đã xử lý, tránh nhận hai lần). Hiệu ứng tắt khi prefers-reduced-motion. Chế độ gọn/thoải mái không đổi (chỉ tác động gap-1..4, p-2..). Đã chạy tsc (5 lỗi cũ ở watch-run, watch-save, room-alibaba, có từ trước), npm test và vite build. CHƯA kiểm bằng trình duyệt thật hay điện thoại thật; chưa thử kéo thả trên Safari iOS (iOS không có kéo tệp từ ngoài).",
  },
  {
    version: "3.35.0",
    time: "22:10 ngày 14/11/2026",
    area: "khac",
    text: "Làm trên nền v3.34.0, theo yêu cầu người dùng (mục 7, nhánh work). Chỉ dời giao diện, không đổi giá, hạn mức, ví, quyền hay điều khoản. Khối «Cách trả» và TurnPackList chuyển từ tab Key sang mục Gói dịch (tool-goi-dich); khối thuật ngữ (thêm thuật ngữ nền, đếm, GlossaryEditor) chuyển từ tab Phim sang mục Thuật ngữ (tool-thuatngu). Cả hai nằm trong nhóm Nâng cao của menu trái và trong Ctrl+K. Tab Key khi đang trả theo lượt hiện dòng chỉ sang Gói dịch; tab Phim giữ dòng đếm thuật ngữ kèm nút mở mục Thuật ngữ. studio-layout.test.ts sửa theo bố cục mới. CHƯA kiểm bằng trình duyệt thật hay điện thoại thật.",
  },
  {
    version: "3.34.0",
    time: "21:30 ngày 14/11/2026",
    area: "tien",
    text: "Làm trên nền v3.33.0, theo yêu cầu người dùng (mục 4 trong danh sách 7 mục, nhánh work). Không đổi giá, hạn mức, cách giữ và trừ ví, quyền hay điều khoản; chỉ đọc và hiển thị. Thẻ tiền money-card.tsx chỉ hiện khi khách chọn Trả theo lượt, đăng nhập và không phải tài khoản dev. Số liệu: getRoomAccount (số dư, số đang giữ), getServiceMenu rồi quoteTurnPacks hai lần: một lần với 60 giây để ra giá một phút, một lần với thời lượng video đã chọn (từ ảnh xem trước của tệp, link thì chưa biết nên không ước tính). Gói được chọn khớp theo cặp model nhận dạng và dịch đang chọn (turnPackModels); không khớp thì lấy gói rẻ nhất có giá và ghi chú «theo gói rẻ nhất» để khách khỏi hiểu nhầm. «Còn khoảng N phút» = số dư chia giá một phút, làm tròn xuống (wallet-view.ts, minutesLeft); đây là ước tính, giá thật tính theo số thực khi xong. Ước tính trước khi chạy đặt cạnh nút Tải và dịch, so số phòng sẽ giữ với số dư; thiếu thì báo thiếu bao nhiêu, đổi nút Nạp nhanh sang màu nhấn. Không chặn nút bắt đầu: start() và cổng trả theo lượt vẫn là nơi quyết định giữ tiền. Thẻ nạp nhanh dùng lại TopUp chế độ gọn (cùng luồng đơn nạp, cùng giới hạn tối đa 3 đơn chờ); nạp xong phát sự kiện tyzo-room-refresh để số dư tự đọc lại. Khách thấy giá đã cộng phần chênh như cũ, không có giá gốc. Dùng key riêng thì không hiện thẻ (tiền là của Groq). Test mới: wallet-view.test.ts (4 ca, đã vào npm test). CHƯA thử với dữ liệu thật: chưa có gói trả theo lượt thật và ví thật để so ước tính với số trừ thật; chưa thử trên điện thoại thật.",
  },
  {
    version: "3.33.0",
    time: "20:50 ngày 14/11/2026",
    area: "khac",
    text: "Làm trên nền v3.32.0, theo yêu cầu người dùng (mục 2 và 3 trong danh sách 7 mục, nhánh work). Không đổi dịch vụ, giá, quyền, dữ liệu khách hay điều khoản. Đối chiếu code trước khi làm: bấm một dòng bản dịch để nhảy video đã có từ trước (CueRow gọi jump, đặt currentTime rồi phát), và phụ đề đã hiện dần khi nhận dạng xong từng đoạn (dòng chưa dịch hiện «Đang chờ dịch…»), nên hai việc này không đổi logic. (2) steps-bar.tsx: thanh liền cao 2,5 đơn vị, có vạch ngăn ở 10, 50, 90 phần trăm theo trọng số của computeStages (không đổi), phần trăm tổng bên phải, dòng «Đang: bước · số đếm»; bốn cột nhãn giữ nguyên. (3) Sửa tại chỗ: cue-editor.tsx thay hộp trượt từ đáy; Ctrl+Enter hoặc nút Lưu, Esc hoặc nút Hủy, vẫn có ô thuật ngữ áp cho cả phim và vẫn gọi editSeg như cũ. Menu tải: export-menu.tsx (Radix DropdownMenu, đã có trong gói) với SRT, WebVTT, chữ thuần; text.ts thêm toVtt (dòng WEBVTT, dấu chấm trước mili giây) và toTxt (mỗi câu một dòng), cùng bộ nhãn [chưa dịch] và [không dịch được] với SRT; use-pipeline.ts thêm exportSub(format), exportSrt giữ làm bí danh. Quyền xuất vẫn qua exportAllowed như cũ nên gói dùng thử và tài khoản khóa vẫn bị chặn ở cả ba định dạng. Ctrl+K thêm hai lệnh tải VTT và TXT. Test mới: export-format.test.ts (4 ca, đã vào npm test). CHƯA kiểm bằng trình duyệt thật hay điện thoại thật; chưa thử mở file .vtt trong trình phát thật.",
  },
  {
    version: "3.32.0",
    time: "20:20 ngày 14/11/2026",
    area: "khac",
    text: "Làm trên nền v3.31.2, theo yêu cầu người dùng (mục 1 và 6 trong danh sách 7 mục «giao diện nhẹ kiểu tương lai», nhánh work, mỗi mục một bản nhỏ). Không đổi dịch vụ, giá, quyền, dữ liệu khách hay điều khoản. (1) Trang chủ một ô: home-state.ts (showHomeHero, pastedLink, isTypingTarget, GENRES) và home-hero.tsx. Khi chưa có phụ đề, không chạy, không phân tích, không chờ duyệt bảng nhân vật và khách chưa bấm mục nào trong menu trái thì studio.tsx hiện HomeHero (ô thả lớn có ảnh xem trước, ô link, hàng chip Tiếng gốc, Thể loại, Cách trả khi cửa trả theo lượt mở, Key, Tùy chọn khác, nút Tải và dịch) và ẩn khung đầy đủ bằng class hidden (Stage vẫn mount nên videoRef giữ nguyên). Bấm mục công cụ trong menu hoặc chip Key, Tùy chọn khác thì hiện khung đầy đủ (state forced); mục Trang chủ mới ở đầu menu và lệnh Video mới trả về ô thả. Hàng nút xuất file ẩn ở trang chủ. Danh sách thể loại dùng chung một hằng. (6) Phím tắt cho trang khách: studio-palette.tsx và palette-match.ts (matchCommands, không dấu cũng khớp), mở bằng Ctrl+K hoặc Cmd+K, gồm chọn video, dán link và bắt đầu, bắt đầu, dừng, xuất .srt, video mới, mở từng mục công cụ, số dư và nạp tiền, các trang khác, hướng dẫn nhanh, Quản lý khi có quyền. Dán link: một listener paste trên document, bỏ qua khi đang gõ trong ô nhập, khi đang chạy, ở trang tài khoản và khi tài khoản bị khóa hoặc cấm; chỉ nhận khi cả đoạn dán là một link http/https. Ở trang chủ một ô thì tự gọi start() sau khi url đã vào state (nhờ vậy start() không đọc url cũ); ở khung đầy đủ chỉ nhận link và báo bằng toast, không tự chạy. Dán link thì bỏ tệp đang chọn để không chạy nhầm tệp cũ. start() vẫn chạy đủ kiểm key, hạn gói và ví như cũ nên dán link khi chưa có key hoặc hết hạn chỉ hiện câu lỗi, không tốn gì. Test mới: home-state.test.ts, palette-match.test.ts (đã vào npm test). CHƯA kiểm bằng trình duyệt thật hay điện thoại thật (cổng đăng nhập chặn khi chạy thử tự động); chưa thử dán link trên Safari iOS.",
  },
  {
    version: "3.31.2",
    time: "12:20 ngày 14/11/2026",
    area: "khac",
    text: "Làm trên nền v3.31.1, theo ảnh chụp điện thoại của người dùng (các tab dài ngắn không đều, muốn giống tab Tổng quan = ảnh 6; tab key Groq/Alibaba quá dài). Không đổi dịch vụ, giá, quyền, dữ liệu khách hay điều khoản. (1) CSS: .admin-grid/.admin-flow có align-content:start (hết nút bị kéo phồng ở tab Thư), .admin-wide trong .admin-flow chiếm cả hàng, lớp mới .admin-card (khung thẻ chung), .admin-stats hai cột đều nhau, .org-tree > div dùng display:contents để mỗi thẻ sơ đồ là một ô lưới. (2) Cấu hình: RunDeskBoard nhận thêm part key và price (config vẫn là cả hai); thứ tự Key Groq | Key Alibaba, Giá và hạn mức cả hàng, Gói dịch | Model thuê phòng, Cổng nạp cả hàng (Fold nhận wide). (3) Việc, Doanh thu, Thuật ngữ, Cộng tác, Thẻ quyền, Yêu cầu, Lịch sử: thêm admin-card; hàng Đơn nạp chiếm cả hàng. (4) Thư: phần soạn thư (loại thư, tiêu đề, nội dung, bố cục, màu) gập trong <details>; cột trái content-start. Giao diện: danh sách icon theo chức năng gập trong <details>. Kiểm: ảnh chụp và dump cấu trúc bằng Chrome thật ở 390, 980 px, không tràn ngang; tsc còn 5 lỗi có sẵn (đã ghi Còn mở). Chưa kiểm trên điện thoại thật. (5) Cùng bản v3.31.2 (người dùng yêu cầu giữ số bản): menu trái dùng chung SideRail cho Admin và trang khách. SideRail nhận nhóm hai tầng (children), AppShell có pinned (Admin ghim từ 1024 px, trang khách luôn là ngăn trượt), CSS menu thêm cuối styles.css. Admin: 12 tab chia 5 nhóm (Vận hành, Tiền, Con người, Nội dung, Nhật ký) ở admin-nav.tsx, hàng nút cuộn ngang cũ bỏ, điện thoại có thanh nút ba gạch + Tìm. Trang khách: bỏ menu thả xuống và hàng tab công cụ, công cụ Key Sub, Phim, Nhân vật, Nghe, Kiểm tra nằm trong nhóm Phụ đề; nhóm Tài khoản gồm số dư và nạp tiền, thuê phòng, cộng tác viên, yêu cầu. Vùng công cụ đổi role tabpanel thành region. Đăng xuất chuyển xuống cuối menu (hỏi lại một lần), bỏ khỏi thẻ Tài khoản; trạng thái bị cấm vẫn giữ nút riêng. studio-layout.test.ts sửa theo. Kiểm Chrome thật 390 và 1280 px, không tràn ngang.",
  },
  {
    version: "3.31.1",
    time: "11:40 ngày 14/11/2026",
    area: "khac",
    text: "Làm trên nền v3.31.0, theo yêu cầu người dùng (ảnh chụp điện thoại: các tab dài ngắn không đều, muốn bố cục như tab Tổng quan; tab key Groq/Alibaba quá dài). Không đổi dịch vụ, giá, quyền, dữ liệu khách hay điều khoản. (1) CSS: .admin-grid và .admin-flow đổi từ cột kiểu gạch (column-width) sang lưới đều grid auto-fit minmax(min(100%, 22rem), 1fr), thẻ cùng hàng cao bằng nhau, .admin-wide chiếm cả hàng (grid-column 1 / -1), thẻ lẻ giãn hết hàng; thẻ <details> tự cao theo ruột. .account-grid (trang khách) giữ nguyên cột kiểu gạch. studio-layout.test.ts sửa theo luật mới. (2) Tab mới «Cấu hình» (cau-hinh, chỉ Chủ, ADMIN_TABS): Key Groq của phòng, Giá và hạn mức (giá riêng từng model gập trong <details>, model key dùng được xếp trước), Key Alibaba, Gói dịch, Model khách được chọn khi thuê phòng (hai cột Groq/Alibaba), Cổng nạp (Sepay và Casso cạnh nhau). Ba mục sau đặt trong thẻ gập Fold (admin-fold.tsx). Tab Việc chỉ còn bảo trì, phiếu, tài khoản, yêu cầu, đơn nạp. Cảnh báo «chưa lưu key Groq» và «chưa đồng bộ model» ở Tổng quan nhảy sang Cấu hình. (3) RunDeskBoard nhận part ops hoặc config. Mỗi lần lưu bảo trì hoặc giá nay đọc lại cửa mới nhất (getRunDesk) rồi chỉ ghi phần của mình, nên lưu giá ở tab Cấu hình không đè trạng thái bảo trì vừa đổi ở nơi khác và ngược lại. (4) Giao diện: khối màu và xem trước chia hai cột từ 768 px (trước đây từ 1024 px). Thư: nhóm «Chữ trên trang» (5 ô) gập trong <details>. Kiểm: tsc chỉ còn 5 lỗi có sẵn; npm test 191 và 442 pass, 0 fail; vite build qua. CHƯA kiểm bằng trình duyệt thật hay điện thoại thật; bố cục chỉ đối chiếu với ảnh chụp người dùng gửi. Nếu bố cục còn lệch, gửi ảnh mới.",
  },
  {
    version: "3.31.0",
    time: "10:20 ngày 14/11/2026",
    area: "khac",
    text: "Làm trên nền v3.30.0, theo yêu cầu người dùng (gói cải tiến Admin A–F, GIAI ĐOẠN 2; nhánh work). Không đổi dịch vụ, giá, quyền, dữ liệu khách hay điều khoản. (F) Thanh bên trái ở /admin từ 1024 px (AdminNav, cố định khi cuộn); dưới 1024 px vẫn là hàng nút cuộn ngang, nay dính ở đầu khi cuộn, nút cao tối thiểu 44 px, thêm nút Tìm. Danh sách tab nằm một chỗ ở src/lib/admin-tabs.ts (ADMIN_TABS, tabsFor) dùng chung cho thanh bên, hàng nút và Ctrl+K; Quản lý và Hỗ trợ không thấy tab chỉ của Chủ. Ctrl+K (Cmd+K trên Mac) mở hộp tìm nhanh (admin-palette.tsx): gõ tên mục, không dấu cũng khớp, hoặc gõ email để mở khách bằng đường tìm khách có sẵn (sự kiện tyzo-open-user); phím mũi tên, Enter, Esc; trả lại tiêu điểm khi đóng. (C) Trang Doanh thu thêm, chỉ Chủ: biểu đồ đường thu và chi vẽ bằng SVG (không thêm thư viện); ARPU = tiền nạp chia số khách đã nạp trong kỳ; tỷ lệ dùng thử → mua = khách hết lượt thử (room_accounts.trial_left = 0) đã từng nạp hoặc mua gói, tính toàn thời gian vì phòng không ghi ngày dùng thử; giá vốn mỗi phút âm thanh = sum(base_cost) / phút của phiếu đã trừ tiền (da-tru, dung-tien, bỏ tts- và phiếu lỗi), kèm bản cộng chi phí ghi tay; chi phí ghi tay phân loại (hạ tầng, API và model, quảng cáo, nhân sự, khác) bằng cột room_costs.category (migration 0023, khoản cũ về 'khac'), có ô chọn loại khi ghi hoặc sửa. Phần truy vấn nằm ở money-extra-data.ts (moneyExtraWith), phần tính ở money-extra.ts. Chỉ có số tổng, không đọc tên tệp hay chữ phụ đề. KHÔNG làm (cần người dùng chốt, đụng điều khoản hoặc dữ liệu khách): D phần bấm vào lần chạy kém xem câu lỗi và gửi yêu cầu kiểm tra lại (quality_runs cố ý không lưu tài khoản, tên tệp, chữ phụ đề); «Chặn toàn bộ phòng» ở bảo trì; chế độ Chỉ xem cho Hỗ trợ (chưa biết chặn thao tác nào); cảnh báo key hết hạn và rate-limit (app không ghi dữ liệu đó). D thống kê theo model và cảnh báo chủ động đã có từ trước (Theo model Whisper, tab Tổng quan), không làm lại. Test: admin-tabs.test.ts (8 ca), money-extra.test.ts (11 ca), money-extra-data.test.ts (6 ca, PGLite) đã thêm vào npm test. Chưa thử bằng trình duyệt thật, chưa thử trên điện thoại thật và Neon thật; migration 0023 tự chạy khi build.",
  },
  {
    version: "3.30.0",
    time: "10:03 ngày 14/11/2026",
    area: "khac",
    text: "Làm trên nền v3.29.4, theo yêu cầu người dùng (gói cải tiến Admin A–F, GIAI ĐOẠN 1; nhánh work). Không đổi dịch vụ, giá, quyền hay điều khoản. Làm: (A) tab «Tổng quan» là tab mặc định của /admin: doanh thu (tiền nạp, room_ledger kind nap, cùng cách tính với tab Doanh thu) hôm nay/7 ngày/tháng này, lượt chạy và tỷ lệ lỗi theo bộ lọc Hôm nay/7 ngày/30 ngày (bỏ phiếu đọc thuyết minh tts-), số lần chạy chất lượng cần chú ý (health yellow/red trong quality_runs), đơn nạp chờ (pay_orders pending+claimed), cảnh báo, top 5 chi tiêu và top 5 lỗi; mỗi thẻ có nút Xem chi tiết nhảy sang tab. Quyền: Hỗ trợ trở lên xem được, nhưng tiền, top chi tiêu và chất lượng chỉ Chủ (server cắt, không chỉ ẩn ở giao diện). Cảnh báo có: bảo trì đang bật, chưa lưu key Groq phòng, chưa đồng bộ model, tỷ lệ lỗi ≥10% từ 5 lượt, chất lượng thấp tăng ≥10 điểm so với kỳ trước (cần ≥10 lần chạy mỗi kỳ), phiếu giữ quá 6 giờ, đơn nạp chờ ≥30 phút. KHÔNG làm được: cảnh báo key hết hạn và rate-limit, vì app không ghi hạn dùng key và rate_hits không lưu ngưỡng. (B) tab Việc: phiếu lọc theo Đang giữ/Đã trừ (gồm dừng vì hết tiền)/Đã nhả (gồm đã hoàn)/Lỗi, tìm theo email hoặc tên tệp (không phân biệt hoa thường, % và _ không phải ký tự đặc biệt), thêm dòng Model và Thời gian xử lý; migration 0022 thêm asr_model, chat_model, closed_at cho run_tickets, openTicketWith ghi model, closeTicketWith, chargeTicketWith (dừng vì hết tiền) và releaseStaleWith ghi closed_at. Phiếu cũ hiện «—». Lịch sử bật/tắt bảo trì và đổi giá lấy từ room_audit (ai, lúc nào, nội dung cũ → mới, ghi từ v3.29.x). (E) tách Nhật ký thành «Nhật ký thao tác» (audit, có lọc theo hành động và tìm chữ, thêm nhãn tiếng Việt cho 15 hành động còn hiện mã thô) và «Nhật ký hệ thống» (changelog nội bộ như cũ). Test: overview-data.test.ts (9 ca, chạy trên PGLite) thêm vào npm test. CHƯA làm: C (Doanh thu: biểu đồ, ARPU, chuyển đổi, chi phí theo phút, phân loại chi phí), D (Chất lượng), F (Ctrl+K, thanh bên, chế độ Chỉ xem, mobile), và «Chặn toàn bộ phòng» ở bảo trì. Xem PROJECT_STATUS mục «Vấn đề hiện tại / Còn mở» cho lý do. Chưa thử bằng trình duyệt thật và trên Neon thật (chỉ PGLite).",
  },
  {
    version: "3.29.4",
    time: "09:15 ngày 14/11/2026",
    area: "khac",
    text: "Làm trên nền v3.29.3, theo yêu cầu người dùng (6 lỗi báo lỗi và trạng thái, nhánh work). Không đổi dịch vụ, giá, quyền hay điều khoản. (1) login.tsx: chế độ đăng nhập đổi câu «Email không đúng.» (mailProblem) và lỗi sai thông tin từ máy chủ (INVALID_EMAIL_OR_PASSWORD, INVALID_PASSWORD, INVALID_EMAIL, USER_NOT_FOUND hoặc câu tiếng Anh tương ứng) thành «Email hoặc mật khẩu chưa đúng. Kiểm tra lại hoặc bấm “Quên mật khẩu”.»; đăng ký giữ câu cũ. Lỗi chưa xác minh, giới hạn tốc độ vẫn hiện câu riêng. (2) Nút Đăng nhập: submit có chốt busy chống gửi đôi bằng phím Enter, nút disabled + spinner (.btn-spinner) + «Đang đăng nhập… Đừng tắt trang» (đăng ký: «Đang tạo tài khoản… Đừng tắt trang»), nút chuyển chế độ khóa theo. (3) studio.tsx: nút «Xuất file Vietsub» disabled khi app.segs rỗng, bọc span có title và toast «Chưa có phụ đề nào. Hãy chọn video và bấm Tải và dịch trước.» (nút pointer-events none để bấm rơi vào span, chạm điện thoại cũng ra toast). (4) Link: src/lib/link-check.ts (hàm thuần videoLinkProblem, videoLinkBroken) và use-link-check.ts; cảnh báo khi rời ô hoặc dán ở cả hai ô link (player-drop.tsx và tab công cụ). Cảnh báo chỉ nhắc, không chặn: link có đuôi lạ hoặc link ký tên không đuôi vẫn chạy được; start() chỉ chặn link hỏng hẳn (không đọc được hoặc không phải http/https). (5) Mất mạng: use-online.ts (useSyncExternalStore) và offline-banner.tsx đặt ở __root.tsx, banner đỏ cố định, đặt data-offline trên html. Khóa bằng disabled ở Đăng nhập, Quên mật khẩu, gửi lại thư xác minh, Tải và dịch (nút Hủy khi đang chạy vẫn mở), Dịch tiếp, Đồng bộ key, Xuất file Vietsub, Lưu bản Whisper. Chưa khóa các nút còn lại (tab, giao diện, thuyết minh…): không có nút nào ngoài danh sách này gọi mạng thì cần rà thêm. (6) VoiceLanes và ModelPicker: lối hoặc model key chưa mở nay mờ, thang xám, disabled, nhãn «Key chưa mở», bỏ dòng «Key này không dùng được». Test: link-check.test.ts (6 ca) đã thêm vào npm test. Chưa thử trên điện thoại thật và chưa thử bằng trình duyệt thật.",
  },
  {
    version: "3.29.3",
    time: "07:22 ngày 14/11/2026",
    area: "khac",
    text: "Làm trên nền v3.29.2, theo yêu cầu người dùng (mục P3-14: hỗ trợ thêm codec phổ biến, hoặc báo lỗi rõ kèm hướng dẫn convert; nhánh work). Không đổi dịch vụ, giá, quyền hay điều khoản. Chọn đường báo lỗi rõ, không thêm bộ giải mã: AC3, E-AC3, DTS, TrueHD, WMA không có trong decodeAudioData của trình duyệt phổ thông, mang ffmpeg.wasm hoặc bộ giải riêng cần gói ngoài (máy làm việc không cài được node_modules) và trái điều đã chốt «không viết bộ giải mã riêng» (HE-AAC). Làm: src/lib/sub/media-sniff.ts (hàm thuần): nhận gói file theo byte đầu (MP4/MOV, MKV, WebM, AVI, WAV, MP3, AAC thô, AC3 thô, OGG, FLAC, MPEG-TS, FLV, ASF) và loại âm thanh (fourcc trong stsd của MP4, CodecID A_AC3/A_EAC3/A_DTS/A_TRUEHD/A_AAC/A_OPUS/A_VORBIS/A_FLAC trong bảng track MKV, bsid của AC3 thô để tách E-AC3); đọc 2 MB đầu (SNIFF_BYTES). describeDecodeFailure ra câu tiếng Việt: file là gì, vì sao không đọc được (loại không hỗ trợ / gói hiếm / MKV / loại thường đọc được nên nghi file hỏng / không rõ) và lệnh ffmpeg -i \\\"tên file\\\" -vn -ac 1 -ar 16000 -c:a aac -b:a 48k -movflags +faststart am-thanh.m4a, kèm chỗ chọn «Âm thanh riêng». Tên file bỏ dấu nháy và xuống dòng. Nối: decodeTo16k (use-pipeline.ts) gọi describeDecodeFailure thay câu «Hãy dùng mp4, webm, mp3, m4a hoặc wav»; truyền j.streamWhy làm gợi ý vì MP4 có moov ở cuối file thì fourcc không nằm trong 2 MB đầu. mp4.ts: openMp4 ghi danh sách loại mẫu âm thanh đã thấy vào câu lý do thay vì câu cố định «có thể là AC3/DTS/Opus». Test: src/lib/sub/media-sniff.test.ts, 15 ca, đã thêm vào npm test. Nhận diện MKV là tìm chuỗi CodecID trong 2 MB đầu, không phân tích EBML đầy đủ: MKV để bảng track sau 2 MB thì chỉ báo «file MKV» không kèm loại âm thanh, câu hướng dẫn vẫn đúng. Chưa chạy: npx tsc --noEmit toàn dự án và npm test đầy đủ (không cài được node_modules; 10 test lỗi sẵn do thiếu @electric-sql/pglite). Đã tsc riêng media-sniff.ts, mp4.ts, groq.ts: không lỗi. Chưa thử với file MKV/AC3 thật trên trình duyệt.",
  },
  {
    version: "3.29.2",
    time: "07:19 ngày 14/11/2026",
    area: "ha-tang",
    text: "Làm trên nền v3.29.1, theo yêu cầu người dùng (mục P3-13: timeout đọc full response Groq, nhánh work). Không đổi dịch vụ, giá, quyền hay điều khoản. Lỗi: hạn 120 giây trong requestWithRetry chỉ bao tới lúc Groq trả đầu phản hồi (clearTimeout trong finally ngay sau fetch), còn response.json() ở transcribeOnce, translateOnce, analyzeFilm, listModelIds và response.blob() ở speakOrpheus không có hạn nào. Groq gửi header rồi đứng thân thì lần dịch treo vô hạn. Sửa: hàm thuần mới src/lib/sub/http-deadline.ts (withDeadlines, DeadlineError) giữ hai hạn riêng, header 120 giây và body 120 giây, hạn body chỉ dừng khi bước đọc xong. requestWithRetry nhận thêm tham số read và đọc thân nằm trong vòng thử lại: quá hạn header hoặc body thì thử lại như lỗi mạng (tối đa 5 lần, giữ nguyên gate 429 và retry-after); người dùng hủy vẫn ném AbortError; JSON hỏng không thử lại. Danh sách model chờ tối đa 30 giây, Orpheus 120 giây + 120 giây. Phía máy chủ: src/routes/api/room-groq.ts đặt AbortSignal.timeout 100 giây cho yêu cầu gửi Groq (đầu + thân, gồm /models); quá hạn trả 504 và chargeWith chưa tính tiền vì text() ném trước khi trừ phiếu, riêng đọc thuyết minh đã trừ ví trước thì nhánh catch có sẵn hoàn lại. Test: src/lib/sub/http-deadline.test.ts dùng máy chủ HTTP cục bộ cho 7 ca (thân đứng giữa chừng, đầu không về, hủy giữa chừng, hủy từ trước, thân chậm vẫn trong hạn, JSON hỏng); đã thêm vào npm test. Chưa chạy: npx tsc --noEmit và npm test đầy đủ (máy này không cài được node_modules); đã tsc riêng groq.ts và http-deadline.ts, không lỗi; room-groq.ts chưa được tsc vì phụ thuộc TanStack. Chưa thử với Groq thật.",
  },
  {
    version: "3.29.1",
    time: "07:00 ngày 14/11/2026",
    area: "khac",
    text: "Làm trên nền v3.29.0, theo yêu cầu người dùng (mục 11: sáng/tối + gọn/thoải mái, nhánh work). Không đổi dịch vụ, giá, quyền hay điều khoản. (1) Sáng/tối: v3.29.0 coi «Luôn tối/sáng» của Admin là khóa cứng và ẩn nút, mà mặc định Admin là tối nên nút không bao giờ hiện, trái với câu changelog. Nay lựa chọn khách (tyzo_mode) luôn thắng; Admin chỉ là mặc định lúc mở (nhãn đổi thành «Mặc định tối/sáng»); modeScript đọc localStorage ở mọi chế độ; DisplayToggle luôn hiện hai nút và đồng bộ meta theme-color ngay khi mở. (2) Mật độ: khối CSS cuối styles.css nằm ngoài @layer nên đè mọi tiện ích Tailwind, kể cả ở mật độ 1. Đo bằng trình duyệt thật: lớp phủ p-2 sm:p-3 bị ép 8px thay vì 12px, ô tìm kiếm px-3 pl-9 bị ép padding trái 12px thay vì 36px (chữ đè icon). Nay các luật bọc :where() (độ ưu tiên 0, CSS riêng như .card vẫn thắng) và loại phần tử còn lớp khoảng cách cùng loại (pl-*, px-*, gap-x-*, tiền tố sm:/md:). Đã đo 15 màn ở mật độ 1: 0 phần tử bị đổi. (3) Test: theme.test.ts chạy modeScript và densityScript trên DOM giả, và giữ hai quy tắc của khối CSS mật độ.",
  },
  {
    version: "3.28.0",
    time: "05:07 ngày 14/11/2026",
    area: "khac",
    text: "Làm trên nền v3.27.0, theo yêu cầu người dùng (nhánh work). P2 ba mục. (8) Player: khung chọn video lớn đặt trên player khi chưa có video (PlayerDrop): kéo thả, bấm để chọn, ảnh xem trước một khung hình + tên + dung lượng + thời lượng lấy ngay trên máy bằng thẻ video ẩn (file-thumb.ts, không tải lên đâu, trình duyệt không đọc được MKV/HEVC thì chỉ hiện tên). Tệp không phải video/âm thanh bị từ chối kèm câu báo. Thả tệp lên player đang có video thì đổi video. Ô link trực tiếp đã có từ trước nay có thêm ngay trong khung; không thêm đường tải link mới, không xem trước link (không tự gọi máy chủ lạ). Thẻ Video ở tab Phim hiện ảnh nhỏ. (9) Tiến trình theo bước: stage-progress.ts (hàm thuần, có test) tính Cắt / Nhận dạng / Dịch / Sửa lại từ số đếm của job; use-pipeline giữ phaseRef và state stages, cập nhật trong progress() và lúc đổi pha; bước Sửa lại đếm số đoạn gửi lại (giải mã lại, lọc lại, kiểm tra ngôn ngữ) cộng câu còn lỗi, không có thì ghi Không cần. Alibaba bỏ qua bước Cắt. Thanh chữ trạng thái cũ giữ nguyên. (10) Hướng dẫn lần đầu 4 bước (guided-tour.tsx), nhớ trong localStorage tyzo_tour_v1, không chặn thao tác, nút dấu hỏi mở lại. Không đổi điều khoản (chỉ giao diện). Lỗi tsc 10 cái có sẵn trước bản này (routeTree.gen.ts chưa sinh lại cho tai-video/relay-alibaba/room-alibaba, kiểu Seg thiếu stale, room-alibaba contentType), không sửa vì ngoài phạm vi. Chưa thử trên điện thoại thật, chưa chạy trình duyệt thật.",
  },
  {
    version: "3.27.0",
    time: "04:34 ngày 14/11/2026",
    area: "khac",
    text: "Làm trên nền v3.26.0, theo yêu cầu người dùng (Claude sửa, nhánh work). P1 ba mục. (5) Giá vốn: migration 0021 thêm run_tickets.base_est. Phiếu mới vẫn lưu base_cost thật như cũ (run-gate, ali-filetrans, đọc thuyết minh đều truyền base). Phiếu cũ base_cost = 0 nay Chủ bấm «Ước tính giá vốn» ở Admin → Doanh thu: cost-estimate.ts điền charged / (1 + chênh Groq hiện tại) rồi đánh dấu base_est. Không đụng phiếu có giá vốn thật, không đụng phiếu đang giữ, chạy lại không đổi gì. Đây chỉ là ước tính vì chênh giá và bảng giá của lúc đó không còn; tiền Alibaba cũ (nếu có phiếu 0) cũng dùng chênh Groq. Lời lỗ hiện dòng «Trong đó giá vốn ước tính». Không tự chạy migration dữ liệu, Chủ phải bấm. (6) Chất lượng: không tự chỉnh theo số đo vì chưa có số thật trong tay. Thay vào đó Chủ chỉnh được 10 ngưỡng trong Admin → Chất lượng (room_settings quality_thresholds, có kiểm tra khoảng, nút đặt lại mặc định). Khách đọc ngưỡng qua getQualityThresholds khi chạy, lỗi mạng thì dùng mặc định. Ngưỡng mới chỉ áp cho lần chạy sau; đèn tổng ở bảng Admin tính lại theo ngưỡng mới. (7) Thuật ngữ: chọn thể loại khác auto, adult, sex thì tự kèm bộ auto của ngôn ngữ nguồn, thể loại thắng khi trùng từ, khách tắt được bằng ô trong Studio (gbase). Bộ adult và sex vẫn đứng riêng. Không đổi điều khoản. Chưa thử trên điện thoại thật.",
  },
  {
    version: "3.26.0",
    time: "04:25 ngày 14/11/2026",
    area: "khac",
    text: "Làm trên nền v3.25.0, theo yêu cầu người dùng (Claude sửa, nhánh work). P0 bốn mục. (1) login.tsx: ô email type=email, dán nguyên địa chỉ; gợi ý đuôi chỉ còn là lối tắt, bỏ dòng «Đã chọn». mailProblem vẫn chặn email tạm khi gửi. (2) Câu changelog 3.24.1 viết lại cho rõ nghĩa; không tìm thấy câu «không còn dùng» nào trong app-version.ts. (3) Admin: thêm mask-file-name.ts (giữ 2 ký tự đầu và đuôi, che phần giữa), dùng ở TicketCard và nút Hoàn phiếu; không còn tên tệp nguyên văn trong Admin → Việc. Mã phiếu vẫn hiện khi tệp không tên. Quy tắc 23 giữ nguyên. (4) studio.tsx: ghi chú dưới hai nút Key của tôi / Trả theo lượt và tooltip title trên từng nút. Chỉ đổi chữ hiển thị, không đổi giá, không đổi điều khoản. Chưa thử trên điện thoại thật.",
  },
  {
    version: "3.14.0",
    time: "17:21 ngày 12/11/2026",
    area: "khac",
    text: "Giai đoạn 1 dựng lại giao diện, theo yêu cầu người dùng (Claude sửa, nhánh work, nền v3.13.0). Chỉ nền móng, chưa đổi bố cục Studio. Thêm src/lib/theme/theme.ts (token sáng/tối, phông trong danh sách, icon theo chỗ đặt, parseTheme làm sạch, checkTheme chặn tương phản dưới 4.5/3.5, themeToCss, modeScript) và theme.test.ts (11 test). theme-room.ts: getLiveTheme công khai, getThemeAdmin/saveThemeDraft/publishTheme/loadThemeToDraft chỉ Chủ, lưu ở room_settings (theme_live, theme_draft, theme_history tối đa 10), không cần migration. __root.tsx đọc theme ở loader, tiêm CSS biến và chọn sáng/tối trước khi vẽ. styles.css thêm token error/success/warning/info/rank-* và thay màu cứng trùng token bằng biến; giá trị tối giữ nguyên. Thêm src/components/ui (Icon theo slot, Button, Card, Badge, Field, Segmented), icon dùng Phosphor (MIT, 6 độ đậm). Admin có tab «Giao diện» (theme-board.tsx). Mặc định mode=dark nên khách không thấy gì đổi. Còn màu cứng ở quality-view, top-up, admin-desk, studio (ô chọn màu phụ đề), logo SVG: làm ở giai đoạn 2 cùng các màn. Chưa thử tab Giao diện bằng tài khoản Chủ thật. Không đổi điều khoản.",
  },
  {
    version: "3.11.0",
    time: "09:40 ngày 11/11/2026",
    area: "khac",
    text: "Làm trên nền v3.10.11, theo yêu cầu người dùng. Thêm nút «Lưu bản Whisper» cạnh «Xuất file Vietsub». Seg có thêm trường raw (chữ Whisper sau khi cắt lặp, trước applyNameFixes của bước phân tích phim; applyNameFixes sửa original nên không dùng original được). raw ghi ở acceptSegment, lúc nối câu dài hơn, và keepRejectedCue. Bản lưu cũ không có raw thì dùng original. Xuất qua toRawSrt, tên file .whisper.srt. Dùng chung cửa với xuất Vietsub (exportAllowed): dùng thử vẫn không xuất. Không đổi điều khoản. Test: raw-srt.test.ts.",
  },
  {
    version: "3.10.11",
    time: "09:15 ngày 11/11/2026",
    area: "khac",
    text: "Làm trên nền v3.10.10. Lỗi: nút Quản lý và /admin mất sau khi dịch, phải tải lại. Nguyên nhân: getMyPlace chỉ gọi một lần khi mở trang, lỗi tạm thì studio.tsx gán place=null và không đọc lại; admin-desk.tsx cũng chỉ thử một lần. Sửa: thêm src/lib/retry-load.ts (thử lại 1,5 s và 4 s, có test); studio.tsx đọc lại khi quay lại tab và khi dịch xong, lỗi thì giữ quyền cũ; admin-desk.tsx dùng retryLoad. Chưa tái hiện trên Vercel vì không có log máy chủ.",
  },
  {
    version: "3.10.7",
    time: "03:28 ngày 11/11/2026",
    area: "khac",
    text: "Làm trên nền v3.10.6. Chỉ giao diện, không đổi logic. Sửa theo ảnh chụp 10/11 lúc 18:23: (1) styles.css: luật label > input {width:100%} kéo giãn ô tick và làm teo ô màu ở tab Thư; nay loại checkbox, radio, color, range, ô tick 1,15rem, ô màu 2,5rem. (2) Thêm .admin-flow: khối một thẻ tự chia cột theo khối con (Sơ đồ, Doanh thu, Thuật ngữ, Cộng tác); Nhật ký xếp lưới .plan-grid. (3) Thẻ Trả theo lượt bỏ .admin-trio: Bảo trì và Phiếu gần đây chung một cột, Giá biểu một cột, hết khoảng trống; bỏ vùng cuộn lồng trong danh sách model. (4) .stat-grid dùng flex, ô cuối giãn đầy hàng. (5) Thuật ngữ: nút Lọc nằm cạnh ô lọc, có viền như nút khác. (6) mail-desk: tiêu đề hướng dẫn Gmail đổi text-ink thành text-fg (chữ tối trên nền tối), placeholder SMTP rút ngắn cho khỏi bị cắt. (7) studio: câu «Chọn video để phát ở đây» nằm dưới nút phát. Đã kiểm: dựng CSS cũ và mới trong Chromium, ô tick từ 245px còn 18px, ô màu từ 12px lên 40px, khối chia hai cột đúng; cú pháp 7 file TSX; app-version.test và studio-layout.test pass. Chưa chạy tsc và npm test đủ vì gói không có node_modules (9 test cần pglite, jose, nodemailer, react-start, bản gốc cũng lỗi y vậy). Chưa xem trên Vercel thật. Chưa làm: trang Tài khoản vẫn chia hai cột có thể lệch chiều cao cuối cột; nút Lưu trên thẻ Chủ ở Sơ đồ nhạt viền, chưa rõ nguyên nhân.",
  },
  {
    version: "3.10.6",
    time: "18:10 ngày 10/11/2026",
    area: "khac",
    text: "Làm trên nền v3.10.5. Giao diện: .admin-grid và .account-grid dùng cột kiểu gạch (column-width 22rem), .room-wide 120rem, thêm .admin-split, .admin-detail, .admin-pane, .admin-trio, .admin-stats, .plan-grid, .affiliate-list. Khối Trả theo lượt thành 3 ô, thẻ quyền xuống dưới khối Tài khoản. Không đổi logic. Kiểm bằng dữ liệu giả ở 390, 820, 1280, 1920 px. Thư: thư xác minh và đặt lại không tới dù Gửi thư thử chạy; nguyên nhân khả dĩ là sendAuthLetter chạy nền nên trên Vercel hàm bị đóng băng trước khi SMTP xong. Nay route /api/auth/$ gọi flushAuthLetters (tối đa 8 giây) trước khi trả lời, chờ đọc công tắc thư tối đa 4 giây. Chưa thử trên Vercel thật. Nếu vẫn không có thư, xem nhật ký hàm dòng [auth] gửi thư lỗi.",
  },
  {
    version: "3.10.5",
    time: "17:10 ngày 10/11/2026",
    area: "khac",
    text: "Sửa lỗi do v3.10.3: .studio-video bị đặt max-height nên khi mở bảng cài đặt phụ đề, video bị bóp còn khoảng 95px. Nay khung video co được và tự cuộn, phần tử con trong .player-stack không co. Còn lỗi treo ở thẻ nạp, hạn gói và trang admin trên bản Vercel chưa tìm ra nguyên nhân, cần nhật ký hàm của Vercel.",
  },
  {
    version: "3.10.4",
    time: "16:40 ngày 10/11/2026",
    area: "ha-tang",
    text: "Thêm nhà gửi thư «smtp» (email cá nhân) cạnh Resend, Brevo, SendGrid, Mailgun, Postmark. Dùng thư viện nodemailer, nạp động trong src/lib/auth/smtp.server.ts, chạy trên Node của Vercel. Gmail và Yahoo tự nhận máy chủ theo đuôi email, đuôi khác nhập smtp.host:cổng vào ô máy chủ (lưu ở trường domain). Mật khẩu ứng dụng lưu trong room_settings.mail_desk như khóa API khác, bỏ khoảng trắng khi lưu, không trả ra màn hình. Thứ tự ưu tiên: các nhà HTTP trước, SMTP sau, webhook cuối. Gmail giới hạn khoảng 500 thư mỗi ngày. Chưa thử gửi thật tới Gmail.",
  },
  {
    version: "3.10.3",
    time: "12:00 ngày 10/11/2026",
    area: "khac",
    text: "Viết lại khung phòng chiếu trong styles.css thành ba chế độ loại trừ nhau (TALL, SHEET_PORTRAIT, SHEET_LANDSCAPE), mọi mức tối thiểu cộng vào min-height của khung và khung cuộn được. Điều kiện tấm trượt dùng chung với mã qua src/lib/studio-layout.ts. Thêm scripts/studio-layout-matrix.mjs (npm run check:layout) đo 20 cỡ màn hình. Tách PAY_MINUTES sang pay-minutes.ts và sameSecret sang pay-secret.server.ts để node:crypto không vào gói trình duyệt (trang chủ bản dev báo Something went wrong). Sửa stripInstallParams chặn đường dẫn //host. Sửa 7 test lỗi: 3 test thiếu .grok/app-env.json nay bỏ qua trên kho sạch, test migration và 2 test studio-layout viết lại cho đúng thực tế.",
  },
  {
    version: "3.10.2",
    time: "07:56 ngày 10/11/2026",
    area: "khac",
    text: "Bỏ bản v3.10.1 vì làm lệch thêm. Lấy lại mã v3.10.0 rồi làm lại: nút Nạp tiền cùng hàng, dòng chờ một hàng, hết giờ hoặc từ chối thì mờ nội dung và hiện xin lỗi. Không tự bật lại thẻ sau khi khách đóng.",
  },
  {
    version: "3.10.1",
    time: "07:45 ngày 10/11/2026",
    area: "khac",
    text: "Nút Nạp tiền cùng hàng, cùng cỡ với hai nút kia. Dòng chờ không xuống hàng. Hết 15 phút hoặc nhân viên từ chối thì mờ nội dung, hiện xin lỗi, rồi đóng thẻ.",
  },
  {
    version: "3.10.0",
    time: "07:15 ngày 10/11/2026",
    area: "khac",
    text: "Thẻ nạp tách khỏi hàng nút để khỏi tràn ngang trên điện thoại. Khách hủy đơn thì trạng thái void, khác từ chối của nhân viên. Khi cộng tiền, nội dung mờ rồi hiện logo và xin cảm ơn.",
  },
  {
    version: "3.9.0",
    time: "07:00 ngày 10/11/2026",
    area: "khac",
    text: "Thẻ nạp chuyển khoản: sao chép, đếm 15 phút, tự hỏi trạng thái mỗi 5 giây. Quá 15 phút webhook không cộng và đơn thành hết hạn. Đã từ chối vẫn là hủy của nhân viên.",
  },
  {
    version: "3.8.0",
    time: "02:44 ngày 10/11/2026",
    area: "khac",
    text: "Bốn lối dịch thay danh sách model. resolveVoiceLane không nhảy sang lối khác. Câu ngắn ở profile cân bằng không còn ưu tiên model 20B. Auto đã lưu được đưa về một model cho cả phim.",
  },
  {
    version: "3.7.1",
    time: "21:39 ngày 09/11/2026",
    area: "khac",
    text: "Tab Thư: hai ô số xếp dọc, không tràn khung. Xem trước thư ghim phía trên khi kéo form.",
  },
  {
    version: "3.7.0",
    time: "21:10 ngày 09/11/2026",
    area: "khac",
    text: "Làm lại từ v3.5.0. Bản 3.6 đã bỏ vì đăng nhập treo. Công tắc thư mặc định tắt. Đọc mail_policy bằng kết nối riêng tối đa 1,5 giây, không lấy khóa migration. Gửi thư chạy nền, trần gửi nằm trong bộ nhớ.",
  },
  {
    version: "3.5.0",
    time: "20:11 ngày 09/11/2026",
    area: "khac",
    text: "Tab Thư chỉ Chủ. Khóa nằm ở room_settings mail_desk, không trả ra màn hình. Gửi thử dùng khóa đã lưu, không có thì dùng biến môi trường. Chưa bật xác minh email hay quên mật khẩu.",
  },
  {
    version: "3.4.2",
    time: "18:41 ngày 09/11/2026",
    area: "tien",
    text: "Gỡ cổng /api/pay/rieng, pay-own và ô khóa trên tab Doanh thu. Sepay và Casso giữ nguyên. Điều khoản 2026-11-09.4.",
  },
  {
    version: "3.4.1",
    time: "14:42 ngày 09/11/2026",
    area: "quyen",
    text: "Mười kiểu thẻ chuyển sang hàng ngang trong ô. Ruy băng, con dấu, góc gấp, thanh dọc không còn xoay hoặc chiếm cả cạnh. Ô xem thử hiện Chủ và Cộng tác.",
  },
  {
    version: "3.4.0",
    time: "14:34 ngày 09/11/2026",
    area: "quyen",
    text: "Thẻ trên ô tài khoản xếp ngang theo thứ tự Chủ, Quản lý, Hỗ trợ, Cộng tác. Một thẻ thì giữ chỗ cũ. Sơ đồ gộp Cộng tác vào thẻ nhân viên nếu cùng tài khoản, không hiện hai lần.",
  },
  {
    version: "3.3.0",
    time: "14:16 ngày 09/11/2026",
    area: "tien",
    text: "room_costs hiện tối đa 80 dòng trong khoảng đang xem. Chủ sửa hoặc xóa từng dòng. Dùng lại chỉ chép tên và số tiền sang khoản mới.",
  },
  {
    version: "3.2.1",
    time: "14:13 ngày 09/11/2026",
    area: "tien",
    text: "Ô Doanh thu bỏ lọc note Nạp thủ công. Dòng chi tiết đổi thành Tiền nạp đã xác nhận. Lời lỗ vẫn không cộng tiền nạp.",
  },
  {
    version: "3.2.0",
    time: "13:55 ngày 09/11/2026",
    area: "quyen",
    text: "Đếm affiliates riêng, lỗi bảng không làm mất số Phòng. Sơ đồ thêm OrgPartner. Thẻ Cộng tác dùng cùng role-mark, nhãn ngắn Cộng tác cho vừa dải. Không chỉnh lại khung Admin cho mọi máy.",
  },
  {
    version: "3.1.4",
    time: "13:33 ngày 09/11/2026",
    area: "khac",
    text: "Đã bỏ v3.1.2 và v3.1.3 vì làm lệch bố cục. work về fed2419 rồi sửa nhẹ: nút căn giữa, ô mã đăng ký, nhãn tỷ lệ không đè ô nhập, tab Admin cuộn ngang. Không đụng TopUp.",
  },
  {
    version: "3.1.1",
    time: "13:10 ngày 09/11/2026",
    area: "ha-tang",
    text: "Preview cũng chạy migration vì dùng chung Neon. Neon áp file SQL còn thiếu lúc mở kết nối, không chỉ lúc build production.",
  },
  {
    version: "3.1.0",
    time: "12:40 ngày 09/11/2026",
    area: "tien",
    text: "POST /api/pay/rieng khớp đúng mã và đúng số tiền. Khóa nằm ở room_settings pay_own_secret. Lời lỗ trừ commission_events. Thuật ngữ nhập xuất JSON. Gieo thuật ngữ khi mở kết nối cơ sở dữ liệu.",
  },
  {
    version: "3.0.0",
    time: "12:28 ngày 09/11/2026",
    area: "tien",
    text: "run_tickets.base_cost lưu giá vốn Groq. Lời lỗ = gói + lượt − giá vốn − chi phí ghi tay. Cộng tác viên: tỷ lệ Chủ sửa, cả đời khi windowDays = 0, trần 50% lãi lượt, chờ 14 ngày, rút tối thiểu 200.000. Cổng nạp riêng chưa làm.",
  },
  {
    version: "2.23.0",
    time: "12:19 ngày 09/11/2026",
    area: "du-lieu",
    text: "Danh sách thuật ngữ phân trang 50. Ẩn hoặc mở mọi bộ. Khôi phục từ thiếu không ghi đè từ đã sửa. Lỗi tải không còn bị nuốt thành bộ trống.",
  },
  {
    version: "2.22.0",
    time: "11:46 ngày 09/11/2026",
    area: "du-lieu",
    text: "Thuật ngữ chuyển vào database. Chỉ Chủ thêm, xóa, ẩn. Khách gửi bản sao thì vào hàng chờ, chưa áp cho người khác. Điều khoản 2026-11-09.1.",
  },
  {
    version: "2.21.0",
    time: "09:33 ngày 09/11/2026",
    area: "khac",
    text: "Nhật ký khách tách khỏi nhật ký nội bộ. Thanh chỉnh chỉ đổi khi kéo núm. Độ trễ đọc có thể âm để đọc trước.",
  },
  {
    version: "2.20.0",
    time: "06:40 ngày 09/11/2026",
    area: "quyen",
    text: "Giá biểu, doanh thu và mở gói chỉ Chủ thấy. Yêu cầu quá hạn tự chuyển cấp: Hỗ trợ 30 phút, Quản lý 90 phút, rồi tới Chủ. Máy chủ đặt ở Singapore.",
  },
  {
    version: "2.19.2",
    time: "20:28 ngày 08/11/2026",
    area: "quyen",
    text: "Tài khoản Chủ vào lại được trang quản trị khi phòng chưa cấu hình gửi thư.",
  },
  {
    version: "2.19.1",
    time: "19:13 ngày 08/11/2026",
    area: "tien",
    text: "Ngày ghi chi phí và cột doanh thu theo giờ Việt Nam. Cửa trả theo lượt chỉ bật sau khi cửa đã mở. Yêu cầu công khai thêm trần theo địa chỉ mạng khi máy chủ thấy địa chỉ.",
  },
  {
    version: "2.19.0",
    time: "18:52 ngày 08/11/2026",
    area: "ha-tang",
    text: "Bản dựng thử không chạy migration lên database thật. Bản chính thiếu địa chỉ database thì dừng. Điều khoản 2026-11-08.3.",
  },
  {
    version: "2.18.0",
    time: "18:15 ngày 08/11/2026",
    area: "quyen",
    text: "Key phòng không hiện lại trên trang quản trị, chỉ còn 4 ký tự cuối. Điều khoản 2026-11-08.2.",
  },
  {
    version: "2.17.0",
    time: "08:16 ngày 08/11/2026",
    area: "quyen",
    text: "Quyền Chủ nằm trong cơ sở dữ liệu và chỉ tính khi email đã xác minh. Chỉ Chủ được xác nhận tay đơn nạp. Điều khoản 2026-11-08.1.",
  },
  {
    version: "2.16.1",
    time: "01:35 ngày 08/11/2026",
    area: "quyen",
    text: "Đã gỡ chức năng cộng tiền thử mà ai đăng nhập cũng gọi được.",
  },
  {
    version: "2.9.0",
    time: "22:22 ngày 06/11/2026",
    area: "quyen",
    text: "Trang quản trị có ô nhập key để đồng bộ model. Key không gửi lên máy chủ.",
  },
  {
    version: "2.0.0",
    time: "23:18 ngày 05/11/2026",
    area: "quyen",
    text: "Bốn cấp: Người dùng, Hỗ trợ, Quản lý và Chủ. Có sơ đồ cấp và trang doanh thu.",
  },
];
