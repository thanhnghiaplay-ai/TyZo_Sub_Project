# PROJECT_STATUS — NHẬT KÝ VÀ KẾ HOẠCH CŨ (lưu trữ nguyên văn, chuyển ngày 20/11/2026)

> CHỈ ĐỂ TRA CỨU, KHÔNG PHẢI LỆNH. Phần còn hiệu lực (mục 1–5, 7, 8, 13, 14, 15) vẫn ở `PROJECT_STATUS.md`. Số mục giữ nguyên để các tham chiếu «mục 13.2», «mục 14», «mục 15» vẫn đúng.

---

## 6. Lịch sử thay đổi / Tiến độ

> Từ 2026-11-08 20:03, mục này là nhật ký. Không làm theo các dòng cũ. Lệnh hiện tại nằm ở `BANG_DIEU.md`.

- 2026-11-18 22:23 — v5.6.1 trên work. Rút gọn năm đoạn dưới ô Nhận dạng giọng thành một đoạn (`linkAsrNote`). Không đổi cách chạy, giá, quyền, điều khoản. `tsc` sạch, eslint 0 lỗi (31 cảnh báo cũ), `npm test` 198 (191 pass, 7 bỏ qua) + 1018 pass.

- 2026-11-17 00:35 — v5.0.1 trên work. Làm lại điều khoản cho khớp web và luật, vẫn một trang. Thêm bản quyền và khiếu nại, Token dịch không phải tiền, dữ liệu gửi Groq và Alibaba. Điều khoản 2026-11-17.1. Không bịa tên doanh nghiệp. Không thêm trang riêng.
- 2026-11-16 23:55 — v5.0.0 trên work. Mua Token dịch và thuê phòng bằng mã QR, không giữ số dư. Orpheus trừ Token dịch. Số dư test về 0, không hoàn. Điều khoản 2026-11-16.4. Trước: `tsc` sạch, `npm test` 692 pass (2 fail vì SQL `grant` và hướng dẫn còn chỉ chỗ nạp). Sau: `tsc` sạch, `npm test` scripts 191 pass (7 skip) và src 692 pass, 0 fail.
- 2026-11-16 22:12 — v4.1.0 trên work. Dịch trực tiếp trừ gói giây. Thuê phòng giữ giá tay. Bỏ giá riêng từng model. Alibaba kéo giá Singapore. Điều khoản 2026-11-16.2. Trước: `tsc` sạch, `npm test` 687 pass. Sau: `tsc` sạch, `npm test` 690 pass, 0 fail.
- 2026-11-16 21:50 — v4.0.0 trên work. Cửa trả theo lượt giữ và trừ gói giây, không giữ ví. Số dư đồng không quy đổi. Điều khoản 2026-11-16.1. Trước: `tsc` sạch, `npm test` 677 pass. Sau: `tsc` sạch, `npm test` 687 pass (thêm 10 test), 0 fail.
- 2026-11-16 12:20 — v3.47.13 trên work. Phần chỗ để riêng 8/8: viền huy hiệu, bóng chữ, màn hướng dẫn. Mức 1 không đổi hình. Trước: `tsc` sạch, `npm test` 676 pass. Sau: `tsc` sạch, `npm test` 677 pass (thêm 1 test nguồn), 0 fail. Không đổi điều khoản.
- 2026-11-16 12:13 — v3.47.12 trên work. Phần xem trước cả trang 7/8: trang đổi ngay khi chỉnh, nút Hoàn tác. Khách vẫn cần Công bố. Trước: `tsc` sạch, `npm test` 675 pass. Sau: `tsc` sạch, `npm test` 676 pass (thêm 1 test nguồn), 0 fail. Không đổi điều khoản.
- 2026-11-16 12:06 — v3.47.11 trên work. Phần icon nhóm 6/8: bốn nhóm, nét riêng mặc định theo nét chung. Trước: `tsc` sạch, `npm test` 674 pass. Sau: `tsc` sạch, `npm test` 675 pass (thêm 1 test nhóm), 0 fail. Không đổi điều khoản.
- 2026-11-16 11:59 — v3.47.10 trên work. Phần tách tab 5/8: sáu phần trong mục Giao diện. Không đổi giá trị mặc định. Trước và sau: `tsc` sạch, `npm test` 674 pass, 0 fail. Không đổi điều khoản.
- 2026-11-16 11:51 — v3.47.9 trên work. Phần bảo trì 4/8: chữ biển, màu, hiệu ứng mạnh, robot hoặc chỉ biển. Mặc định không đổi hình. Trước: `tsc` sạch, `npm test` 673 pass. Sau: `tsc` sạch, `npm test` 674 pass (thêm 1 test chữ biển), 0 fail. Không đổi điều khoản.
- 2026-11-16 11:41 — v3.47.8 trên work. Phần chuyển động 3/8: bật tắt và tốc độ. Mặc định không đổi hình. Trước và sau: `tsc` sạch, `npm test` 673 pass, 0 fail. Không đổi điều khoản.
- 2026-11-16 11:29 — v3.47.7 trên work. Phần bố cục 2/8: độ rộng trang và vị trí menu. Mặc định không đổi hình. Trước và sau: `tsc` sạch, `npm test` 673 pass, 0 fail. Không đổi điều khoản.
- 2026-11-16 11:02 — v3.47.6 trên work. Phần chữ 1/8: phông tiêu đề, độ đậm, giãn dòng. Mặc định không đổi hình. Trước và sau: `tsc` sạch, `npm test` 673 pass, 0 fail. Không đổi điều khoản.
- 2026-11-16 10:50 — v3.47.5 trên work. Kiểu nút đặc/viền/mờ và tám bộ màu. Đặc và bộ Vàng không đổi hình. Trước: `tsc` sạch, `npm test` 672 pass. Sau: `tsc` sạch, `npm test` 673 pass (thêm 1 test bộ màu), 0 fail. Không đổi điều khoản.
- 2026-11-16 10:41 — v3.47.4 trên work. Độ dày viền khung 1–3 px. Mức 1 không đổi hình. Viền huy hiệu giữ nguyên. Trước và sau: `tsc` sạch, `npm test` 672 pass, 0 fail. Không đổi điều khoản.
- 2026-11-16 10:32 — v3.47.3 trên work. Icon bước 7: cỡ nhỏ/vừa/lớn và màu theo chữ hoặc màu nhấn. Mặc định không đổi hình. Trước và sau: `tsc` sạch, `npm test` 672 pass, 0 fail. Không đổi điều khoản.
- 2026-11-16 10:23 — v3.47.2 trên work. Icon bước 6: tìm chức năng, xem trước hình, đặt lại từng chỗ. Hình sẵn không đổi. Trước và sau: `tsc` sạch, `npm test` 672 pass, 0 fail. Không đổi điều khoản.
- 2026-11-16 10:15 — v3.47.1 trên work. Đổ bóng bước 2: quầng sáng và khung phiên bản theo mức bóng. Mức 1 không đổi hình. Trước và sau: `tsc` sạch, `npm test` 672 pass, 0 fail. Không đổi điều khoản.
- 2026-11-16 10:08 — v3.47.0 trên work. Đổ bóng bước 1: thanh độ đậm bóng cho hộp thoại, menu và banner. Mức 1 không đổi hình. Trước và sau: `tsc` sạch, `npm test` 672 pass, 0 fail. Không đổi điều khoản.
- 2026-11-16 09:50 — v3.46.18 trên work. Icon bước 5: 9 file còn lucide chuyển hết sang chỗ icon. Trước và sau: `tsc` sạch, `npm test` 672 pass, 0 fail. Không đổi điều khoản.
- 2026-11-16 05:58 — v3.46.1 trên work (theo yêu cầu người dùng: nút xem trước trang bảo trì ở Admin; không đổi điều khoản).
- 2026-11-15 19:56 — v3.46.0 trên work (theo yêu cầu người dùng: trang bảo trì toàn web có robot công nhân cắm biển dưới logo; tiêu đề và lời nhắn sửa được ở Admin → Cấu hình → Toàn web; không đổi điều khoản).
- 2026-11-15 18:13 — v3.45.1 trên work (theo yêu cầu người dùng: đồng bộ ô thông báo mặc định của trình duyệt với web, áp dụng từ nay về sau). `askConfirm` + `ConfirmHost`, thay 7 chỗ `confirm`, test chặn `no-native-dialog.test.ts`.
- 2026-11-15 17:57 — v3.45.0 trên work (theo yêu cầu người dùng: bảo trì cả web nhưng vẫn vào được Admin). Mục `site` trong `service_status`, `SiteGate` ở gốc, trang khách đã mở không bị gỡ giữa chừng. Chạy thật bằng Chrome ở 390 và 1280 px. Điều khoản không đổi.
- 2026-11-15 10:54 — v3.44.1 trên work (theo yêu cầu người dùng: kiểm lại phần hai nhóm dịch). Chạy thật bằng Chrome ở 1280 và 390 px: bảng Admin lưu được, khách thấy bảo trì, máy chủ chặn đúng nhóm. Sửa dòng trạng thái đầu trang vẫn ghi «Sẵn sàng» khi Dịch bình thường bảo trì (`use-pipeline.ts`, `studio.tsx`). tsc sạch.
- 2026-11-15 09:17 — v3.43.3 trên work (theo yêu cầu người dùng). Sửa khung tóm tắt cập nhật vx.x.x bị lệch: VersionMark tính vị trí theo màn hình thật (lật lên khi thiếu chỗ, kẹp mép), test version-mark.test.ts. tsc sạch.
- 2026-11-15 09:10 — v3.43.2 trên work (theo yêu cầu người dùng). Sửa khung thông báo lệch (CSS màn hẹp trong `styles.css`) và cửa vào phòng (`termsGate` ở `lib/terms.ts`, `entry-gate.tsx`): bắt buộc đăng nhập, hết phiên thì về /login. tsc sạch; npm test 626 pass, 0 fail. Chưa kiểm trình duyệt thật.
- 2026-11-15 01:40 — v3.41.0 trên work (theo yêu cầu: ba phần Hướng dẫn, làm từng bước; đây là phần 3). Làm: tách chữ điều khoản nguyên văn sang `components/terms-document.tsx`, `lib/terms.ts` (`TERMS_VERSION`, `TERMS_KEY`, `hasAcceptedTerms`, `rememberTermsAccepted`, `termsGate`), trang `routes/dieu-khoan.tsx`, `components/terms-link.tsx`; sửa `entry-gate.tsx` (chưa đồng ý và chưa có tài khoản thì sang `/login`, đã có tài khoản mà điều khoản đổi thì hỏi lại), `routes/login.tsx` (ô tích, bỏ đoạn đá về trang chủ), liên kết ở `side-rail.tsx`, `routes/tai-khoan.tsx`, `guide-page.tsx`; `routeTree.gen.ts` sinh lại. Chỉ đổi chỗ hiển thị, không đổi giá, quyền, luật ví, chữ điều khoản; `TERMS_VERSION` giữ `2026-11-13.4`. Kiểm: `tsc` sạch, test mới `terms.test.ts` và `entry-gate.test.ts` qua, `vite build` qua, toàn bộ `npm test` qua (số liệu cuối nằm ở HANDOFF). Chưa kiểm: trình duyệt thật (Safari, điện thoại thật, Vercel).
- 2026-11-15 00:23 — v3.40.0 trên work (theo yêu cầu: ba phần Hướng dẫn, làm từng bước; đây là phần 1). Làm: trang `/huong-dan` (`routes/huong-dan.tsx`, `components/guide-page.tsx`), nội dung `lib/guide-topics.ts`, tuyến «Chỉ tôi» tách ra `lib/tour-steps.ts` và `lib/tour-request.ts`, liên hệ hỗ trợ `lib/support-contact.ts`, `lib/support-room.ts`, `components/support-board.tsx` (tab Cấu hình, chỉ Chủ). Menu trái ở trang chủ và Dịch trực tiếp, Ctrl+K có mục Hướng dẫn. Không đổi giá, quyền, luật ví, điều khoản (`2026-11-13.4`). Kiểm: `tsc` sạch, test mới `support-contact` và `guide-topics` qua, `vite build` qua, Chrome thật ở 390 và 1280 px không tràn ngang, tìm kiếm và «Chỉ tôi» chạy. Chưa kiểm: Safari, điện thoại thật, Vercel, tab Cấu hình bằng tài khoản Chủ thật.
- 2026-11-14 10:03 — v3.30.0 trên work (theo yêu cầu: gói cải tiến Admin A–F, giai đoạn 1). Làm: A (tab Tổng quan mặc định, bộ lọc Hôm nay/7/30 ngày, doanh thu, lượt chạy và tỷ lệ lỗi, chất lượng cần chú ý, đơn nạp chờ, cảnh báo, top 5 chi tiêu và lỗi, nút Xem chi tiết), B (phiếu lọc theo trạng thái, tìm email/tên tệp, cột Model và Thời gian xử lý nhờ migration 0022, lịch sử bảo trì từ audit), E (tách Nhật ký thao tác khỏi Nhật ký hệ thống, nhãn tiếng Việt cho các hành động). Test mới `overview-data.test.ts` (9 ca, PGLite); `npm test` 416 pass, 0 fail; `npx tsc --noEmit` còn đúng 5 lỗi có sẵn. Không đổi điều khoản. Chưa làm: C, D, F, «chặn toàn bộ phòng»; D đụng thiết kế riêng tư của quality_runs (không lưu tài khoản và chữ phụ đề). Cảnh báo key hết hạn và rate-limit chưa làm được vì không có dữ liệu. Chưa thử trình duyệt thật và Neon thật (chỉ PGLite); migration 0022 sẽ tự chạy khi build.
- 2026-11-14 09:15 — v3.29.4 trên work (theo yêu cầu: 6 lỗi báo lỗi và trạng thái). Làm: (1) đăng nhập sai báo «Email hoặc mật khẩu chưa đúng…»; (2) nút Đăng nhập disabled + spinner + «Đang đăng nhập… Đừng tắt trang», chốt chống gửi đôi; (3) «Xuất file Vietsub» khóa khi chưa có phụ đề, bấm vào ra toast; (4) cảnh báo link khi rời ô hoặc dán, chỉ nhắc, không chặn (start() chỉ chặn link hỏng hẳn); (5) banner đỏ mất mạng ở __root, khóa các nút gọi mạng; (6) lối và model key chưa mở mờ, nhãn «Key chưa mở», không chọn được. Test `link-check.test.ts` (6 ca) thêm vào `npm test`; `npm test` 407 pass, 0 fail; `npx tsc --noEmit` còn đúng 5 lỗi có sẵn (watch-run, watch-save, room-alibaba); eslint còn 3 lỗi có sẵn ở studio.tsx. Không đổi điều khoản. Chưa thử bằng trình duyệt thật và điện thoại thật. Chưa khóa hết mọi nút khi mất mạng, chỉ các nút gọi mạng chính.
- 2026-11-14 07:22 — v3.29.3 trên work (theo yêu cầu: P3 mục 14, thêm codec hoặc báo lỗi rõ kèm hướng dẫn convert). Chọn báo lỗi rõ, không thêm bộ giải mã (AC3/DTS/TrueHD/WMA trình duyệt không đọc; không mang ffmpeg.wasm, trái mục «Không làm» về bộ giải mã riêng). `src/lib/sub/media-sniff.ts`: nhận gói file và loại âm thanh từ 2 MB đầu (MP4 theo fourcc, MKV theo CodecID, AC3 thô theo bsid...), `describeDecodeFailure` ra câu tiếng Việt kèm lệnh `ffmpeg -i "tên file" ... am-thanh.m4a`. `decodeTo16k` dùng câu này thay câu chung chung; `mp4.ts` ghi loại mẫu âm thanh đã thấy. Test mới `media-sniff.test.ts` (15 ca), đã thêm vào `npm test`. Giới hạn: MKV có bảng track sau 2 MB thì chỉ báo tên gói. Không đổi điều khoản. Chưa chạy `npx tsc --noEmit` và `npm test` đầy đủ (không cài được node_modules); tsc riêng các file đụng tới không lỗi. Chưa thử với file MKV/AC3 thật.
- 2026-11-14 07:19 — v3.29.2 trên work (theo yêu cầu: P3 mục 13, timeout đọc full response Groq). Lỗi: hạn 120 giây chỉ bao tới lúc có đầu phản hồi, `response.json()` / `blob()` không có hạn, nên Groq gửi đầu rồi đứng thân thì lần dịch treo mãi. Sửa: `src/lib/sub/http-deadline.ts` (hai hạn riêng, đầu và thân), `requestWithRetry` đọc thân trong vòng thử lại (quá hạn thì thử lại, hủy vẫn là AbortError), `listModelIds` 30 giây, `speakOrpheus` có hạn, `room-groq.ts` đặt 100 giây cho yêu cầu gửi Groq và trả 504 khi quá hạn. Test mới `http-deadline.test.ts` (7 ca, máy chủ HTTP cục bộ), đã thêm vào `npm test`. Không đổi điều khoản. Chưa chạy `npx tsc --noEmit` và `npm test` đầy đủ (không cài được node_modules); tsc riêng `groq.ts` và `http-deadline.ts` không lỗi. Chưa thử với Groq thật.
- 2026-11-14 07:00 — v3.29.1 trên work (theo yêu cầu: sửa mục 11, sáng/tối + gọn/thoải mái). (a) `modeScript` đọc lựa chọn khách ở mọi chế độ Admin, `DisplayToggle` luôn hiện hai nút và đồng bộ `theme-color` lúc mở; nhãn Admin «Luôn tối/sáng» đổi thành «Mặc định tối/sáng». Trước đó nút sáng/tối ẩn khi Admin để tối, mà mặc định là tối. (b) Khối CSS mật độ ở cuối `styles.css` đè Tailwind vì nằm ngoài `@layer`: lớp phủ `p-2 sm:p-3` ép 8px thay 12px, ô tìm kiếm `px-3 pl-9` mất padding icon. Nay bọc `:where()` và loại phần tử có lớp cùng loại. Đo bằng Chrome thật: 15 màn ở mật độ 1, 0 phần tử bị đổi; chế độ Gọn co gap 8px còn 6,8px, không tràn ngang. Test `theme.test.ts` (18 ca). Ngoài phạm vi, chưa sửa: 5 lỗi `tsc` có sẵn (`watch-run.ts`, `watch-save.ts`, `room-alibaba.ts`) (`routeTree.gen.ts` đã sinh lại, commit kèm); ghi ở `BANG_DIEU.md` mục «Còn mở». Không đổi điều khoản.
- 2026-11-14 05:46 — v3.29.0 trên work (theo yêu cầu). P3: (11) nút sáng/tối và nút Gọn/Thoải mái ở đầu trang (`display-toggle.tsx`), lưu `tyzo_mode` và `tyzo_density`; Admin đặt «Luôn sáng/tối» thì nút sáng/tối ẩn; `--density` giờ có tác dụng thật lên gap và padding (không đổi chiều cao nút, giữ vùng chạm 44px). (12) Dán key Groq thì 0,8 giây sau tự gọi danh sách model, báo dưới ô key: key sai, bị giới hạn 429, thiếu model nhận dạng hoặc dịch. `start` kiểm lại trước khi giữ tiền hay trừ lượt thử, mất mạng hoặc Groq 5xx thì không chặn. Groq không có lệnh hỏi số dư hạn mức nên chỉ hiện số còn lại khi Groq gửi kèm. Không đổi điều khoản. Chưa thử trên trình duyệt thật (không vào được phòng chiếu vì cần đăng nhập).
- 2026-11-14 05:07 — v3.28.0 trên work (theo yêu cầu). P2: (8) khung chọn video lớn trên player, kéo thả, ảnh xem trước lấy trên máy; (9) thanh tiến trình Cắt / Nhận dạng / Dịch / Sửa lại; (10) hướng dẫn lần đầu 4 bước, nút dấu hỏi mở lại. Không đổi điều khoản. Chưa thử trình duyệt thật.
- 2026-11-14 04:34 — v3.27.0 trên work (Claude sửa theo yêu cầu). P1: (5) migration 0021 `base_est`, nút Chủ «Ước tính giá vốn» cho phiếu cũ, Lời lỗ ghi rõ phần ước tính. (6) Chủ chỉnh 10 ngưỡng chất lượng trong Admin, chưa chỉnh theo số đo thật vì chưa có số. (7) Thể loại thường tự kèm bộ `auto` của ngôn ngữ nguồn, khách tắt được; adult, sex và auto đứng riêng. Chỉ đổi chữ và hành vi mặc định, không đổi điều khoản. Chưa thử trên điện thoại thật.
- 2026-11-14 04:25 — v3.26.0 trên work (Claude sửa theo yêu cầu). P0: ô email đăng nhập type=email, dán nguyên địa chỉ; viết lại câu changelog 3.24.1; che tên tệp trong Admin → Việc và nút Hoàn phiếu (`mask-file-name.ts`); ghi chú và tooltip cho Key của tôi / Trả theo lượt. Chỉ đổi chữ, không đổi điều khoản. `tsc` còn 10 lỗi cũ ở watch-run, watch-save, relay-alibaba, room-alibaba, tai-video, tai-khoan (không thuộc các file đã sửa, chưa xử lý). Test liên quan 22/22 xanh. Chưa thử trên điện thoại thật.
- 2026-11-13 01:38 — v3.25.0 trên work. Trả theo lượt nhận dạng Alibaba bằng key phòng, cần link file trực tiếp. Việc Alibaba ngoài nhận dạng vẫn chặn. Điều khoản 2026-11-13.4.
- 2026-11-13 00:49 — v3.24.1 trên work. Sau bản mới: không giữ khóa migration khi không có file mới, bảng giá không chờ tải dài, trang quản lý tự thử lại và không hiện sai quyền khi đang khởi động.
- 2026-11-13 00:25 — v3.24.0 trên work, bước 6 và 7. `quoteTurnPacks` trả ước tính và khoản giữ, không trả giá gốc. Chủ sửa phần trăm Alibaba trên khung gói. Phần trăm Groq vẫn ở bàn Việc. Điều khoản 2026-11-13.3.
- 2026-11-13 00:20 — v3.23.0 trên work, bước 5. Cửa trả theo lượt hiện gói đã bật. Khách chọn gói thì model nhận dạng và dịch theo gói, chạy bằng key của phòng. Gói có việc Alibaba bị chặn, chưa gọi. Chưa có gói thì vẫn Whisper. Không hiện giá gốc. Điều khoản 2026-11-13.2.
- 2026-11-13 00:10 — v3.22.0 trên work, bước 4. Chủ lưu `rent_show`. Khách thuê phòng chỉ chọn model trong danh sách, dùng key của mình. Whisper khóa theo Groq, Filetrans khóa theo Alibaba. Dịch Alibaba chưa nối. Điều khoản 2026-11-13.1. Cửa trả theo lượt không đổi.
- 2026-11-13 00:01 — v3.21.0 trên work, bước 3. Tab Việc của Chủ hiện khung gói (`ServicePackBoard` chỉ phần gói). Mỗi việc chọn Groq hoặc Alibaba và một model. Lưu bằng `saveServicePacks`. Khách chưa chọn gói. Không đổi điều khoản.
- 2026-11-12 23:55 — v3.20.0 trên work, bước 2. Tab Việc của Chủ có ô key Alibaba (`alibaba-key-board.tsx`), lưu `alibaba_key`, không đè key Groq. `listModelIds` gọi đúng máy Alibaba khi đồng bộ. Không đổi điều khoản. Cửa trả theo lượt chưa dùng key này.
- 2026-11-12 23:44 — v3.19.0 trên work, bước 1 tách nhà nhận dạng. Danh sách model Groq không còn khóa Alibaba. Key của khách chọn Alibaba Filetrans được. Cửa trả theo lượt không nhận dạng Alibaba và báo rõ. Bàn giá Groq bỏ dòng Alibaba. Điều khoản 2026-11-12.4. Chưa làm quản lý key từng nhà, gói tùy chọn, giá chênh Alibaba cho cửa trả theo lượt.
- 2026-11-12 17:21 — v3.18.0 trên work (lệnh «Claude sửa», giai đoạn 1 dựng lại giao diện). Nền móng, chưa đổi bố cục Studio: `src/lib/theme/theme.ts` (token sáng/tối, phông, icon theo chỗ đặt, làm sạch, chặn tương phản), `src/lib/theme-room.ts` (lưu ở `room_settings`, nháp/công bố/lịch sử 10 bản, chỉ Chủ), `src/components/ui/*` (Icon Phosphor, Button, Card, Badge, Field, Segmented), tab Admin «Giao diện» (`theme-board.tsx`), `__root.tsx` tiêm theme lúc tải. Mặc định tối nên khách không thấy đổi. Test mới `theme.test.ts` 11 ca. Kiểm tra: `tsc --noEmit` sạch; `npm test` 191 + 321 pass, 0 fail; mở `/` trên điện thoại và máy tính, ép chế độ sáng, dựng thử khung xem trước hai chế độ. Chưa thử tab Giao diện bằng tài khoản Chủ thật (đăng nhập đi qua dịch vụ ngoài), chưa thử trên Vercel, chưa chạy `npm run build`. Không đổi điều khoản. Sao lưu bản trước: thư mục v3.13.0 ngoài gói.
- 2026-11-12.38:18 — v3.12.1 và v3.13.0 trên work (lệnh «Claude sửa», Chủ duyệt: báo cả key riêng lẫn key phòng, hiện riêng từng loại và tổng, chỉ Chủ xem, không xem video và key). v3.12.1: `src/lib/sub/quality.ts` (độ tin từ `avg_logprob`: cao từ -0,5, thấp dưới -0,8 hoặc nén trên 2,4; đèn xanh/vàng/đỏ theo ngưỡng ước lượng đặt thành hằng số), khối «Chất lượng» và «Kiểm tra ngôn ngữ» trong tab Kiểm tra, thêm vào Xuất JSON, `components/quality-view.tsx`. v3.13.0: bảng `quality_runs` (migration 0019, chỉ số, không có mã tài khoản, tên tệp, chữ, key), `src/lib/quality-room.ts` (`reportQuality` kiểm tra và giới hạn 30 lần/giờ/tài khoản, `getQualityBoard` chỉ Chủ), `src/lib/quality-board.ts` (kiểm tra bản báo, gộp số, gợi ý chỉnh), tab Admin «Chất lượng» (`quality-board.tsx`), `use-pipeline.ts` gửi một bản sau khi nhận dạng xong mọi đoạn (một lần mỗi lần chạy, lỗi thì bỏ qua). Điều khoản nâng `2026-11-12.3`, thêm hai đoạn ở mục 4. Đã chạy: `tsc` sạch, `npm test` 191 + 310 đạt, `npm run build` được, truy vấn SQL thử trên PGLite, kết xuất thử HealthPill và BandBar. Chưa thử: đăng nhập thật, gửi từ trình duyệt thật, hiển thị tab Chất lượng, Postgres thật. Số do trình duyệt khách báo nên không kiểm chứng được; ngưỡng đèn chưa chỉnh theo số đo.
- 2026-11-12.32:16 — v3.12.0 trên work (Claude sửa theo lệnh «Claude sửa», sau khi thẩm định đề xuất ChatGPT về backend Python/GPU và quyết định không làm đường đó): thêm ô «Kiểm tra ngôn ngữ từng đoạn», mặc định tắt, nhớ trên máy (`glang`). Mới: `src/lib/sub/lang-check.ts` (đếm chữ Hán/Kana/Hangul/Latin, `needsLangCheck`, `chooseBetter`, ngân sách 120 giây) và `lang-check.test.ts` (12 test, đã thêm vào `npm test`). `use-pipeline.ts`: sau lần nhận dạng đầu của một đoạn, nếu chữ lệch ngôn ngữ đã chọn hoặc trung bình `avg_logprob` dưới -0,8 thì gửi lại đúng đoạn đó một lần, không ép ngôn ngữ, không prompt; chỉ đổi khi ngôn ngữ đoán thuộc Trung/Hàn/Nhật/Anh, khác ngôn ngữ đã chọn, và chữ khớp lại hoặc độ tin cao hơn từ 0,2. Lỗi gửi lại thì giữ kết quả cũ. Không đổi Whisper Turbo, không đổi điều khoản (tính năng tùy chọn, mặc định tắt, không đổi lời hứa dịch vụ). Giới hạn đã biết: Whisper bị ép ngôn ngữ thường dịch/phiên âm sang đúng chữ viết đã ép nên dấu hiệu chữ viết không bắt được ca đó, chỉ độ tin thấp bắt được; câu đổi ngôn ngữ vẫn được dịch với `sourceLang` chung của phim. Đã chạy `npx tsc --noEmit` sạch và `npm test` (191 pass, 7 bỏ qua; 291 pass). Chưa gọi Groq thật, chưa thử trên điện thoại, chưa có số đo CER/WER trước và sau.
- 2026-11-11 05:20 — v3.10.10 trên work (Claude sửa theo ảnh chụp user): trang Tài khoản trên điện thoại mất đầu trang, trống giữa, cụt đáy. Nguyên nhân: `.account-grid` dùng `column-width` (cột kiểu báo) nhưng cùng phần tử bị ép `flex-1 overflow-y-auto`, nên trình duyệt xếp nội dung theo chiều cao khung rồi đẩy phần dư sang cột ẩn bên phải (lỗi có từ v3.10.6). Sửa `account-panel.tsx`: khung cuộn ở ngoài, `.account-grid` ở trong với chiều cao tự nhiên. Chưa thử trên điện thoại thật.
- 2026-11-11 04:58 — v3.10.9 trên work (Claude sửa theo lệnh user, kiểm tra toàn bộ): (1) `studio.tsx`: danh sách bản dịch tách thành `CueRow` có memo và `content-visibility`, ô sửa nhớ câu theo nội dung chứ không theo số thứ tự. (2) `use-pipeline.ts`: bản dịch máy không ghi đè câu người dùng vừa sửa tay; đặt cờ `data-tyzo-busy` khi đang chạy. (3) `idle-sign-out.tsx`: không đăng xuất khi đang phát video hoặc đang chạy. (4) `pay-match.ts`, `pay-store.ts`: mã đơn nạp lấy trọn byte ngẫu nhiên (32^6 mã thay vì khoảng 16 triệu). Chưa chạy `tsc` đầy đủ và 9 file test cần pglite, jose, nodemailer, tanstack vì thiếu node_modules và không có mạng. Chi tiết: `BAO_CAO_KIEM_TRA.md`.
- 2026-11-11 04:19 — v3.10.8 trên work (Claude sửa theo lệnh user): lỗi đứng máy. (1) `use-pipeline.ts`: nhận dạng và dịch dùng chung một tín hiệu hủy, một bên lỗi thì bên kia dừng; trước đó `inner` tạo ra mà không luồng nào dùng, nên dịch chờ nhận dạng mãi. (2) `groq.ts`, `mp4.ts`: fetch Groq chờ tối đa 120 giây, tải Range 60 giây, quá hạn thì thử lại hoặc báo. (3) `update-banner.tsx`: bỏ tự `reload` khi quay lại tab sau 5 phút. Chưa chạy `tsc` và `npm test` vì gói không có node_modules và không có mạng. Chưa làm: giải mã quá 25 giây vẫn tính đoạn lỗi; kết quả nhận dạng vẫn hiện theo thứ tự đoạn.
- 2026-11-11 03:28 — v3.10.7 trên work: sửa layout lệch theo ảnh chụp. Ô tick và ô màu tab Thư, chữ đè nút phát, tiêu đề Gmail vô hình, khoảng trống thẻ Trả theo lượt, nửa phải trống ở Sơ đồ, Doanh thu, Thuật ngữ, Cộng tác, Nhật ký, nút Lọc, ô thống kê lẻ. Dựng thử CSS trong Chromium. `tsc` và `npm test` đủ chưa chạy được (thiếu node_modules); test chạy được pass như bản gốc.
- 2026-11-10 07:56 — v3.10.2 trên work: bỏ v3.10.1, lấy lại mã v3.10.0 rồi làm lại nút nạp, dòng chờ và lời xin lỗi. `tsc` sạch.
- 2026-11-10 07:45 — v3.10.1 trên work: nút nạp thẳng hàng, dòng chờ một hàng. Bản này bị lệch thêm, không dùng.
- 2026-11-10 07:15 — v3.10.0 trên work: thẻ nạp vừa khung điện thoại, khách hủy được đơn, cộng tiền thì hiện lời cảm ơn. `tsc` sạch.
- 2026-11-10 07:00 — v3.9.0 trên work: thẻ chuyển khoản có sao chép, đếm 15 phút, tự kiểm tra và lịch sử theo màu. Đơn quá 15 phút không được webhook cộng. `tsc` sạch.
- 2026-11-10 02:44 — v3.8.0 trên work: bốn lối dịch. Một lần dịch một model. `tsc` sạch.
- 2026-11-10 01:35 — Chỉ tài liệu. Ghi 5 mục thư còn lại vào `BANG_DIEU.md`. Xong mục nào thì xóa mục đó.
- 2026-11-09 21:39 — v3.7.1 trên work: ô số trong tab Thư xếp dọc, xem trước thư ghim phía trên. `tsc` sạch.
- 2026-11-08 18:52 — v2.19.0: Nhóm 3 và 4. Ngưỡng năng lượng theo đỉnh file; khoảng trống chọn theo giây tính tiền. Dịch nửa lô không nuốt 401/403/429. Xóa tài khoản giữ sổ, hủy đơn chờ, nhả giữ, dọn thiết bị/chuông/hiện diện. Yêu cầu công khai có trần chung; chỉ email đã xác minh đọc được trả lời của người khác. Webhook so số tài khoản khi payload có số; so khóa bằng hash. Casso 1 lần / 15 giây. Câu sửa tay không bị dịch đè. Tên riêng tối đa 4 từ không bị coi là chưa dịch. Migration bỏ qua khi `VERCEL_ENV` khác production, thiếu `DATABASE_URL` trên production thì thoát 1. Orpheus cắt 180 ký tự và rơi về giọng máy. Đã chép `ort-wasm-simd-threaded.mjs`, chưa chạy thử VAD. Từ điển không dấu cách nhận 1 ký tự. Đoán giới tính theo ranh giới từ. Hạ tần số lấy trung bình cửa sổ. Phân tích phim tối đa khoảng 40.000 ký tự. `known()` chỉ nhận model trong danh mục. Xóa mã P2P không được gọi. Phụ đề kẹp thời gian không đè câu sau. Khóa giọng theo thời điểm. MP4 bù elst bản 0; HE-AAC trả về đường giải mã của trình duyệt. VietQR khi nhận ra BIN; điều khoản `2026-11-08.3` và ghi `terms_version`. Test phụ thuộc `.grok/skills` được bỏ qua nếu thư mục không có. Chưa làm T6 (không bịa khóa thiết bị). `tsc` sạch. Test nhóm vừa sửa: 1 fail do test Orpheus nhập alias `@/` rồi đã bỏ file đó; các test còn lại trong lượt đó pass.
- 2026-11-08 17:20 — v2.17.1: `claimTrialDevice` bị chặn 403 với tài khoản khóa nên ví không hiện: `account-panel.tsx` rơi về `getRoomAccount()`. `PayQueue` nhận `owner`, chỉ Chủ thấy nút «Xác nhận đã nhận tiền». SQL webhook nạp, mua gói, hoàn tiền tách thành `src/lib/pay-flow.ts` (`creditHitWith`, `buyPlanWith`, `refundRunWith`), logic giữ nguyên, để test được (`money-flow.test.ts`). Test đồng thời hoàn tiền đang đánh dấu todo vì tái hiện lỗi C2.
- 2026-11-08 18:15 — v2.18.0: C1 trừ lượt thử sau lần nhận dạng gọi được máy dịch, Tiếp tục cùng tệp không bị chặn. C2 `refundRunWith` và `releaseHoldWith` một câu SQL có điều kiện. C6 `parseTranslations` bắt đúng số câu. C7 `getRunDesk` chỉ trả 4 ký tự cuối key. Điều khoản `2026-11-08.2`. `tsc` sạch. Test tiền và dịch 44/44.
- 2026-11-08 08:16 — v2.17.0: **N2** `/api/room-groq` kiểm tra same-site, đăng nhập, status='open', tần suất 240/phút, trần body (25 MB nhận dạng, 512 KB dịch, 20 KB đọc), model phải nằm trong `run_models`, trả lỗi JSON `{error:{message}}` và chuyển tiếp `retry-after`. Tiền: `openRunTicket` giữ nguyên tử (UPDATE có điều kiện balance >= số giữ, `run-ticket.ts`), mỗi yêu cầu gắn `x-run-ticket`, `chargeWith` (`run-gate.ts`) trừ số thực theo giá Groq cộng chênh (`run-bill.ts`: nhận dạng theo giây âm thanh, tối thiểu 10 giây; dịch theo token; đọc theo ký tự), `closeRunTicket` nhả phần thừa; Groq lỗi không tính tiền; phiếu giữ quá 6 giờ tự nhả. Bảng giá lấy từ trang Groq và tỷ giá, lưu `room_settings.run_board`. **N3/C4** quyền Chủ ở bảng `room_staff` role='chu' và chỉ tính khi `user.emailVerified`; bỏ email ghi cứng và file `.grok/admin.json`; biến `ADMIN_EMAIL` chỉ khởi tạo Chủ đầu tiên khi chưa có Chủ đã xác minh. Gửi thư qua HTTP (`auth/mailer.ts`): Resend, SendGrid, Brevo, Mailgun, Postmark hoặc webhook, cần `MAIL_FROM` và một khóa; có thì bật `requireEmailVerification`, chưa có thì không bật (nếu không không ai đăng nhập được). Chưa có SMTP trực tiếp. **C5 (một phần)** `confirmPayOrder` chỉ Chủ, ghi người xác nhận vào sổ và nhật ký, tối đa 3 đơn chờ mỗi khách, giới hạn tần suất báo đã chuyển. Điều khoản đổi sang `2026-11-08.1` vì cửa trả theo lượt có thu tiền. Sửa 2 test cũ (entry-gate, studio-layout).
- 2026-11-08 01:35 — v2.16.1: N1 xóa `creditTrial` (ai đăng nhập cũng tự cộng tiền được). N5 thêm `requireOpenAccount()` ở `src/lib/guard.server.ts` (logic ở `guard.ts`, có test) dùng trong createPayOrder, buyRoomPlan, spendTrial, claimTrialDevice, synthesizeEdge và room-groq; trả 403 khi status khác 'open'. N4 `synthesizeEdge` có authMiddleware và giới hạn 120 lần/phút/tài khoản bằng bảng `rate_hits` (migration 0013, `takeRate()`). Còn chờ: N2 (chốt cách tính tiền), N3 (chốt nhà cung cấp email).
- 2026-11-07 23:44 — v2.16.0: chuông Admin chỉ yêu cầu hỗ trợ, chuyển cấp và khách báo đã chuyển; số mới và chấm đỏ từng dòng; hộp hủy đơn và xóa tài khoản đồng bộ giao diện; giá biểu trả theo lượt ẩn hiện được.


- 2026-11-07 22:12 — v2.15.0: hộp xác nhận mã 6 ký tự đồng bộ giao diện; ô nhập tiền có dấu chấm nghìn; chuông dẫn đúng đơn nạp/yêu cầu; khung giá biểu gói trên Admin có ẩn hiện.

- 2026-11-07 21:05 — v2.14.0: lời lỗ màu xanh/đỏ; mã 6 ký tự khi reset; chỉnh số dư từng TK; chuông nạp/cộng/từ chối; lịch sử Nạp/Mua gói 9 dòng, từ chối đỏ; hạn gói cập nhật ngay sau mua/nạp.

- 2026-11-07 19:37 — v2.13.0: gói hiện giá gạch ngang + tiết kiệm nổi bật; QR nạp ghi demo; hủy xác nhận đơn nạp; reset tiền test (toàn cục + từng user).

- 2026-11-07 18:50 — v2.12.0: bỏ tab dính đè; QR nạp vẽ trên trang; đơn nạp và xác nhận tay; bật/tắt/xóa cổng có chấm; gói hiện số tiết kiệm.

- 2026-11-07 18:14 — v2.11.0: chấm xanh/đỏ cửa (phòng + Admin); canh thẻ quyền; nạp tiền trong khung tài khoản (10k–1tr); idle đăng xuất 30 phút; doanh thu tách nạp/gói/lượt/hoàn/chi; gợi ý email; tìm tên không dấu.

| Thời điểm | AI / Người | Việc đã làm | Ghi chú |
|-----------|------------|-------------|---------|
| Trước 2026-11-03 | Nhiều model | Xây dựng core: upload, ASR Groq, dịch, player, bible, style phụ đề, TTS | Bản React + HTML |
| 2026-11-03 | User | Báo cáo 4 nhóm lỗi (ASR rác, dịch sai gender, gesture chết, thiếu preview) | |
| 2026-11-03 | Grok | Tạo `PROJECT_STATUS.md` | Chưa sửa code |
| 2026-11-03 | Grok | Hợp nhất zip `phudedep` vào workspace. Vá gesture (kể cả không fullscreen), độ sáng, HUD, box mẫu. Lọc A/Ah/thở/rên. Siết prompt gender (`self`/`addressed` + lock từng batch). HTML vá cùng logic. | User cần xác nhận trên phim thật |
| 2026-11-03 | Dola | Ghi yêu cầu + phương án **glossary thuật ngữ theo thể loại phim (genre × ngôn ngữ)** vào PROJECT_STATUS (mục 3.5 + mục 9). Chưa sửa code. | User muốn nhiều model AI cùng phân tích & triển khai |
| 2026-11-03 | User + Dola | User báo 4 yêu cầu mới: box mẫu phụ đề kiểu floating, đổi mặc định style (nền 0% / cỡ chữ 50% / đáy 3%), tách phân tích phim (analyzeFilm) ra ngoài, nâng cấp TTS giọng đọc tự nhiên hơn (ưu tiên free). Dola ghi vào PROJECT_STATUS (mục 3.6–3.8 + mục 4) + khảo sát lựa chọn TTS. | Chưa sửa code lúc đó |
| 2026-11-03 | Grok | Làm 4 yêu cầu: mẫu phụ đề ghim (không cuộn mất), mặc định nền 0% / cỡ 50% / đáy 3% (giữ style đã chỉnh), khối Phân tích phim có sửa bible và nút Dịch tiếp, giọng neural Edge miễn phí + fallback giọng máy. | Glossary mục 9 vẫn chưa code. Không có file HTML trong zip |
| 2026-11-03 | Grok | **Glossary cốt lõi (mục 9)**: `src/lib/sub/glossary.ts` (load + longest-match + protect/restore placeholder). File mẫu `public/glossaries/{global,ja,ko,zh,en}/…`. Tích hợp vào `use-pipeline.ts` trước `translateWithRepair`. Mở rộng GENRES + UI chọn thể loại (psychological, historical, mystery, sports). Chưa UI quản lý term / import CSV / kuromoji. | User cần test trên phim thật (đặc biệt tiếng Nhật / Hàn) |
| 2026-11-03 | Grok | Glossary tiếp: UI chỉ báo số term + panel xem thuật ngữ đang nạp; thêm file ja (psychological/crime/horror), ko/action, zh/costume, en/action. Đóng gói zip bàn giao. | Còn import CSV / sửa term trong app |
| 2026-11-03 | Grok | **Thuật ngữ người dùng:** thêm/xóa trong panel, nhập CSV, xuất CSV. Lưu localStorage theo source×genre (`guser_…`). `overlayUserTerms` ghi đè file pack trước khi protect. | Chưa kuromoji |
| 2026-11-03 | Grok | **Bước 1 — thuật ngữ độc lập.** Bỏ trộn `common.json` và `global.json`. Xóa hai file dùng chung. Viết 60 file riêng (15 thể loại × ja/ko/zh/en), thêm thể loại **Hằng ngày** (`daily`) với tiếng đời 2020s. `loadGenreGlossary` chỉ đọc đúng một file. UI nói rõ không trộn thể loại. | Chưa làm bước 2–5 |
| 2026-11-03 | Claude | **Bước 2 — bảng nhân vật.** `studio.tsx`: đổi `key` hàng nhân vật thành `character-${index}` (không còn chứa tên → hết lỗi mất focus sau một chữ). Thêm tiêu đề «Nhân vật N» và nhãn hiện cho 4 ô (Tên nhân vật / Nam / nữ / Tự xưng / Được gọi), thêm placeholder cho ô tên. Không đổi `patchCharacter`, `analyzeFilm`, phần Tóm tắt, Thuật ngữ. | Mới kiểm tra cú pháp TSX (không có node_modules, không chạy app). User cần thử gõ tên nhân vật liên tục trên điện thoại |
| 2026-11-03 | Claude | **Bước 3 — panel phụ đề.** `studio.tsx`: gom panel thành `panelNode`; `full` thì render trong khung video (giữ nguyên), không `full` thì render ngay dưới khung video (không còn `absolute` trong `aspect-video` + `overflow-hidden` nên hết bị cắt). Thêm `panelBoxRef` + `scrollIntoView` khi mở panel ngoài toàn màn hình. Không đổi nội dung panel (ô mẫu, thanh kéo, `SUB_DEF`, `cueStyle`), cử chỉ, ASR, prompt dịch, glossary. | Mới kiểm tra cú pháp TSX bằng TypeScript transpile (0 lỗi). Không có node_modules, không chạy app. User cần thử: mở ⚙ khi chưa toàn màn hình, kéo thanh, rồi bật/tắt toàn màn hình khi panel đang mở |
| 2026-11-03 | Grok | **Bước 4 — thuyết minh theo bảng, không đọc trước câu.** `cast-voice.ts`: đổi giọng khi câu có «Tên:» hoặc cách tự xưng đứng đầu câu (tự xưng trùng nhiều người thì bỏ). Câu không khớp giữ giọng Nữ/Nam/Bất kỳ. `studio.tsx`: bỏ `currentTime + lead`; chỉ đọc đúng câu đang hiện, có thể chờ thêm. Thanh «Đọc sớm hơn hình» đổi thành «Chờ sau khi câu hiện». `gnarr_v=3` xóa giá trị đọc sớm đã lưu. | Không đụng ASR, glossary, cử chỉ, panel phụ đề. Chưa tách giọng khi một câu có hai người nói. User cần nghe trên phim đã phân tích |
| 2026-11-04 | Grok | **Sửa hai lỗi đã chạy test.** (A) `restoreTerms` không nuốt khoảng trắng; nhận `{{G0}}` `{{ G0 }}` `{{g0}}` `{G0}` `[[G0]]`; không nhầm G1/G10. Prompt giữ token. Câu mất/sót placeholder dịch lại một lần không protect rồi xóa token. (B) Tự xưng bị bỏ nếu trùng `addressed` của nhân vật khác — «Anh ơi» không còn thành giọng nam. Test: `glossary.test.ts`, `cast-voice.test.ts`. `npm run typecheck` và `npm test` pass. | Không làm bước 5. Không đổi `findMatches`. Không có HTML trong gói nên không sửa HTML. |
| 2026-11-04 | Claude | **Dọn gói giao, chỉ sửa tài liệu/cấu hình, không đổi code `src/`.** `AGENTS.project.md` viết lại (trỏ tới `PROJECT_STATUS.md` + `huongdan.txt`, bỏ HTML/`attachments/` và đường dẫn `/workspace/`). `huongdan.txt` mục 13 khớp thực tế (`attachments/` rỗng). Khôi phục `.prettierrc`. `PROJECT_STATUS.md`: bảng mục 2 xếp lại 1–24, gộp hai khối «Chưa làm» ở mục 4, mục 3.5 ghi trạng thái, mục 9.2 sửa vị trí tích hợp glossary, bỏ câu «HTML giữ để đối chiếu». | Không làm bước 5. Zip đặt tên `phudedep-2026-11-04.zip`, không kèm `node_modules`, `.vercel`, `.grok`. |
| 2026-11-04 08:15 | Claude | **Đổi tên dự án thành `TyZo_Sub_Project`** (tiêu đề `PROJECT_STATUS.md`, `AGENTS.project.md`, `huongdan.txt`; tên zip `TyZo_Sub_Project-YYYY-MM-DD-HHMM.zip`). Thêm quy tắc 17 trong `huongdan.txt`: ghi thời điểm dạng `YYYY-MM-DD HH:MM (UTC+7)`, lấy bằng lệnh `date`, không đoán giờ. Không đổi code `src/`, không đổi `name` trong `package.json`. | Các dòng lịch sử cũ chỉ có ngày, không rõ giờ (không suy đoán). Tên `phudedep` trong dòng cũ giữ nguyên làm lịch sử. |
| 2026-11-04 13:25 | Grok | **Bước 5 Pha 0 — chẩn đoán.** `acceptSegment` vẫn loại đúng các câu cũ nhưng trả lý do. `ingestAsrPart` lưu raw Groq (kể cả segment không có text) rồi mới lọc. Phân biệt: Whisper không trả câu / app lọc / im lặng không gửi Whisper / không giải mã. UI tóm tắt theo lý do và ngôn ngữ, xem danh sách, xuất JSON. Test `diagnostics.test.ts`. Không siết filter, không đụng dịch, TTS, glossary, cử chỉ. | Chưa chạy một phim thật nên chưa biết lý do mất câu trên file của user. |
| 2026-11-04 13:33 | Grok | **Bước 5 Pha 1d — batch dịch.** Model trả ít câu hơn không còn làm hỏng cả nhóm. Câu đã có giữ nguyên; chỉ câu trống / không phải chuỗi được dịch lại, vẫn kèm ctx và addressLock/bible. UI ghi «Không dịch được» và nút «Dịch lại các câu lỗi». Test `translate-batch.test.ts`. `npm run typecheck` và `npm test` pass. | Chưa thử trên phim thật. Không làm Pha 1a. |
| 2026-11-04 13:40 | Grok | **Bước 5 Pha 1a — thử lại đoạn lỗi.** Sau lượt nhận dạng, chỉ đoạn không giải mã (`decode_fail`) được thử lại đúng một lần. Ngân sách 180 giây, không cắt đoạn. Im lặng, Whisper trống và câu bị lọc không gửi lại. Bảng chẩn đoán và dòng trạng thái ghi đoạn còn thiếu (chỉ số + thời gian) và số giây đã dùng. Test `asr-retry.test.ts`. | Chưa thử trên phim thật. Không làm Pha 1c. |
| 2026-11-04 13:45 | Grok | **Bước 5 Pha 1c — biên đoạn.** `acceptSegment` so điểm giữa câu với mốc `chunkStart + 1 giây`, không so mốc bắt đầu. Câu nửa đầu vùng chồng vẫn bỏ. Câu bắt đầu sớm nhưng điểm giữa ở đoạn sau thì giữ. Câu trùng không thêm lần nữa; câu dài hơn thì nối vào câu bị cắt và xóa bản dịch cũ để dịch lại. Test `overlap.test.ts`. Không đổi RMS, ảo giác, A/Ah. | Chưa thử trên phim thật. Không làm Pha 1b. |
| 2026-11-04 16:58 | Grok | **Bước 5 Pha 1b — im lặng theo cửa sổ.** User bảo tiếp tục dù chưa có log phim thật. Ngưỡng `0.005` giữ nguyên. `isSilentChunk` bỏ đoạn chỉ khi mọi cửa sổ 1 giây đều dưới ngưỡng. Test: đoạn 60 giây chỉ có 1 giây tiếng thì RMS cả đoạn dưới ngưỡng (cũ sẽ bỏ) nhưng cửa sổ giữ lại. A/Ah vẫn loại. | Chưa có số liệu trước/sau trên phim thật. Không làm Pha 2. |
| 2026-11-04 17:08 | Grok | **Bước 5 Pha 2 — khoảng trống.** `planSpeechGaps` tìm chỗ có tiếng ≥ 2 giây mà không có câu. Dò không gọi Groq. UI hiện số giây và ước tính $, rồi hỏi lại trước khi gửi. Trần 120 giây, khoảng không vừa thì để nguyên. Câu mới bấm Tiếp tục mới được dịch. Test `gap-scan.test.ts`. | Chưa thử trên phim thật. Không làm Pha 3. |
| 2026-11-04 17:11 | Grok | **Bước 5 Pha 3 — đo Silero, không gắn.** Tải model: int8 212860 byte (gzip 148120), v5 2313101 byte (gzip 1942942). `onnxruntime-web@1.31.1` WASM `ort-wasm-simd-threaded.wasm` 14848852 byte (gzip 3792479). Cả cụm gzip khoảng 4.0 MB, app hiện gzip khoảng 0.19 MB. RMS 10 phút: 25.1 ms. Quyết định không đưa vào bundle. `isNonSpeech` giữ nguyên. | Chưa có ví dụ thán từ ja/ko/zh từ phim thật. |
| 2026-11-04 20:13 | Grok | **Bước 6.1 — xếp lại thẻ thiết lập.** Key, hai ngôn ngữ, thể loại, file và nút chạy lên trên. Trạng thái ngay dưới nút. «Tốc độ và chi phí» (model, Whisper, số luồng) và «Thuật ngữ thể loại» đóng mặc định. Không đổi pipeline. | Chưa làm 6.2. Chưa user thử trên điện thoại. |
| 2026-11-04 20:38 | Grok | **Bước 6.2 — khung Phụ đề.** Thanh trên chỉ có Phụ đề. Video và bảng câu đứng trên tab, một player. Trạng thái và Xuất SRT nằm trên khung xem. Năm tab cuộn tới phần tương ứng, chưa giấu phần khác. Mũi tên trái/phải đổi tab. Cuộn mượt tắt khi máy xin giảm chuyển động. | Chưa làm 6.3. Chưa ghim video khi cuộn. |
| 2026-11-04 20:41 | Grok | **Bước 6.3 — mỗi tab một phần.** Phim, Chất lượng, Nhân vật, Nghe, Kiểm tra ẩn lẫn nhau nhưng không gỡ khỏi cây, nên ô đang gõ không mất. Một nút Dịch tiếp trên khung xem. Dò khoảng trống, câu lỗi và chẩn đoán nằm ở Kiểm tra. Đổi tab không cuộn trang. | Chưa ghim video. Chưa animation tab. |
| 2026-11-04 20:48 | Grok | **Bước 6.4 — ba cỡ màn hình.** Khung cao đúng một màn hình, không cuộn mất video. Điện thoại: video tối đa một phần ba, tab mở từ dưới và có nút Đóng. Máy tính bảng: video ghim trên. Màn rộng: video và bảng câu cạnh nhau, công cụ ở dưới. Chừa vùng tai thỏ. | Chưa thử Safari iPhone. Chưa animation tab. |
| 2026-11-04 20:55 | Grok | **Bước 6.5 — chuyển tab.** Panel trượt 180ms, nút đổi màu 160ms. Máy xin giảm chuyển động thì đứng yên. Thêm Home và End cạnh mũi tên trái/phải. Không đổi pipeline. | Chưa đối chiếu Safari iPhone và Firefox. |
| 2026-11-04 20:58 | Grok | **Bước 6.6 — trình duyệt.** Thêm đường lùi `vh` trước `dvh` và `0px` cho vùng tai thỏ. Không thêm tiền tố một hãng. Câu lỗi âm thanh không còn bắt dùng Chrome. Ghi bảng máy đã chạy: chỉ Chromium trong sandbox. | Firefox và Safari iPhone chưa chạy. |
| 2026-11-04 21:48 | Grok | **Bước 7.1 — hết chồng khung.** Bỏ lớp nổi của video và bỏ tấm tab phủ lên bảng câu. Màn thấp hơn 520px không dùng bố cục máy tính: video là dải nhỏ, tab ở dưới và tự cuộn. Chromium đo 390×844, 844×390, 980×500, 768×1024, 1280×800: không chồng, không tràn ngang. | Chưa thử lại trên điện thoại thật. Chưa xếp lại tab (7.2). |
| 2026-11-04 21:53 | Grok | **Bước 7.2 — xếp tab.** Key Sub đứng đầu: key, Đồng bộ key, model, Whisper, số luồng. Phim: hai ngôn ngữ, thể loại, thuật ngữ thể loại, file và nút chạy. Nhân vật: ngữ cảnh đóng sẵn rồi tới phân tích. Bỏ tab Chất lượng. Ba ô tên phim, tóm tắt, thuật ngữ tay vẫn lưu và vẫn gửi khi dịch. | Chưa user thử thứ tự mới trên điện thoại. |
| 2026-11-04 22:43 | Grok | **Bước 7.3 — không giật khung.** Khóa trang để hộp chọn file không kéo mất đầu hoặc cuối form. Nút đóng điện thoại đổi thành dấu X. Dòng trạng thái luôn hai hàng; câu dài bấm để xem, không đẩy phần dưới. | Chưa user thử lại trên điện thoại lúc đang nhận dạng. |
| 2026-11-04 23:01 | Grok | **Bước 7.4 — số nổi, nút X trong khung.** Số thuật ngữ dùng viên vàng chữ đen, đọc được trên nền tối lẫn sáng. Nút X chuyển vào trong khung tab. Không sửa giọng nam/nữ. | Giọng đọc để thảo luận sau. Chưa thử điện thoại thật. |
| 2026-11-04 23:12 | Grok | **Bước 7.5 — giọng theo cao độ.** Mỗi câu được đo lúc nhận dạng. Thấp rõ thì Nam Minh, cao rõ thì Hoài My. Không chắc thì giọng dự phòng. Không dùng bảng nhân vật, không tốn key. | Mới thử trên tiếng sin và tiếng xung. Chưa nghe trên phim thật. Phải nhận dạng lại thì câu cũ mới có số đo. |
| 2026-11-04 23:25 | Grok | **Bước 7.6 — so giọng trong cùng video.** Không còn mốc 160/190 Hz. Các câu được so với nhau: nhóm thấp nam, nhóm cao nữ. Một nhóm hoặc câu nằm giữa thì không đổi. Bỏ 0,1 giây hai đầu mỗi câu. | Chưa nghe trên phim thật. Phải nhận dạng lại. |
| 2026-11-04 23:42 | Grok | **Thuật ngữ tiếng Trung.** Nạp file mở rộng, 713 mục, 17 thể loại. Thể loại Tự động có file riêng. Sex là mục riêng, không gộp vào Người lớn. Dịch sang Việt, Hàn, Nhật, Anh thì dùng cột tương ứng. | File kia là tập con, không thêm mục riêng. Thuật ngữ chung không trộn vào thể loại khác. |
| 2026-11-05 07:38 | Grok | **Thu gọn ngôn ngữ.** Ô đích đổi tên thành «Dịch sang tiếng», chỉ còn tiếng Việt. Ô nguồn đổi tên thành «Nhận diện ngôn ngữ», chỉ còn Trung, Hàn, Nhật, Anh. Máy đã lưu ngôn ngữ khác thì về Trung và tiếng Việt. | Không còn tự nhận dạng. |
| 2026-11-05 07:48 | Grok | **Sex cho Anh, Hàn, Nhật.** Thêm thể loại Sex, từ gốc là tiếng trong phim, bản dịch là tiếng Việt. Anh 98 mục, Nhật 92, Hàn 91. | Từ Hàn một âm «빼» không đưa vào vì dễ khớp nhầm. Hai từ trùng một cách viết thì giữ một bản dịch và ghi cách khác. |
| 2026-11-05 10:30 | Grok | **Sửa lỗi đã rà.** Câu gốc ngắn không còn bị coi là dịch xong. Dịch lại vẫn khóa thuật ngữ, không xóa bản đã có khi lần sau trống. Giọng nam/nữ tách theo khoảng trống cao độ, kể cả khi một bên nói ít. Thuyết minh và SRT không lấy câu gốc khi chưa dịch, và đọc lại khi bản Việt vừa về. Câu Trung bị cắt được gộp. Câu lặp sau khoảng lặng được giữ. Nhóm dịch là các câu liền nhau. Nửa lô đã dịch không bị mất khi nửa kia lỗi. Thử nhận dạng lại chỉ trừ giờ khi có kết quả. Ghi chú thuật ngữ đi vào ngữ cảnh. Tự động có file cho Anh, Hàn, Nhật. Từ một chữ không được tính. Neural không còn nút Bất kỳ. | Câu ngắn hơn nửa giây vẫn không đo được cao độ. |
| 2026-11-05 10:40 | Grok | **Kiểm tra lại.** Câu giống nhau ở đoạn sau không còn làm mất câu giống ở đoạn trước khi hai đoạn nhận dạng xong không theo thứ tự. Câu thuật ngữ lỗi không liền nhau được dịch lại theo từng cụm, vẫn khóa từ. | Chưa chạy một phim thật qua Groq trong lần này. |
| 2026-11-05 10:59 | Grok | **Gộp thuật ngữ.** 15 thể loại Anh, Hàn, Nhật nhận thêm từ trong file gốc. Từ cũ giữ nguyên cách dịch. Cách dịch mới khác thì chỉ ghi vào chú thích. Sex và Tự động không đổi. | Từ một chữ vẫn không thêm. |
| 2026-11-05 12:04 | Grok | **Chỉ tài liệu.** Thêm mục 12, đề xuất ASR thiếu câu và chọn giọng. Đối chiếu code rồi mới ghi. Sửa hàng 7 và 23 vì đường đọc giọng không còn gọi bảng nhân vật. Không sửa `src/`. | Chưa được duyệt để làm. |
| 2026-11-05 12:10 | Grok | **Mục 12 bước 1.** Đọc: bảng nhân vật thắng, không khớp thì cao độ. Câu ngắn một chữ hoặc dưới 0,8 giây được giữ khi `avg_logprob` từ −0,6 trở lên; «A» vẫn loại. Tab Kiểm tra thêm Nghe, Giữ, Bỏ. Không gắn Silero. | Chưa nghe trên phim thật. Bước 2–4 chưa làm. |
| 2026-11-05 12:21 | Grok | **Mục 12 bước 2.** Ô «Chỉ gửi đoạn có tiếng người», tắt mặc định. Bật thì tải Silero int8 và WASM lúc chạy, cắt đầu/cuối không phải lời, mỗi đoạn vẫn một lần gửi. Không tải được thì dùng RMS. | Chưa chạy trên phim thật. Bước 3–4 chưa làm. |
| 2026-11-05 12:28 | Grok | **Mục 12 bước 3.** Cắt theo khoảng ngừng 1,5 giây, trần vẫn 60 giây. Đường xem file dò năng lượng riêng, không chỉ sửa `splitAudio`. Bật lọc thì dùng vùng Silero khi có PCM. Thử lại câu không chắc và Whisper trống, ngân sách 120 giây riêng, không gửi câu đã bấm Bỏ. | Chưa chạy trên phim thật. Bước 4 chưa làm. |
| 2026-11-05 12:34 | Grok | **Mục 12 bước 4.** Cao độ lệch quá 35 Hz trong một câu thì bỏ. Câu dưới 0,5 giây vẫn không đo. Nút Đổi giọng khóa nam/nữ từng câu. Giới nhân vật được lưu và thắng cao độ. | Chưa nghe trên phim thật. |
| 2026-11-05 12:45 | Grok | **Tự mở tab Nhân vật.** Khi trạng thái là «Đã phân tích xong… bấm Dịch tiếp», app chuyển sang tab Nhân vật và mở khung tab. | Chỉ khi đang chờ Dịch tiếp. |
| 2026-11-05 13:03 | Grok | **Đổi chữ trên trang.** Dòng nhỏ trên cùng là «Phòng chiếu TyZo Sub». Nút tải phụ đề là «Xuất file Vietsub». File tải về vẫn là `.srt`. | Không đổi cách xuất file. |
| 2026-11-05 13:42 | Grok | **Chỉ tài liệu.** Thêm mục 13, ghi thảo luận kinh doanh. Không sửa `src/`. | Chưa được yêu cầu làm. Sửa webapp vẫn ưu tiên trước. |
| 2026-11-05 13:50 | Grok | **Cửa vào.** Màn chờ logo, rồi điều khoản phiên bản 2026-11-05.1. Phải tick và bấm Đồng ý mới vào phòng. Không đồng ý thì dừng. | Chưa viết điều khoản của phần kinh doanh. |
| 2026-11-05 14:05 | Grok | **Giá Groq bằng đồng.** Đọc bảng trên console.groq.com/docs/models và tỷ giá đô. Hiện giá, cửa sổ token, hạn mức bằng tiếng Việt. | Hạn mức đúng của từng key vẫn chỉ có trong tài khoản Groq. |
| 2026-11-05 14:20 | Grok | **Sửa đơ khi vào phòng.** Lệnh lấy giá không được đặt trong file `.server.ts` vì bản xem trước chặn file đó và làm kẹt trang. | Đã bấm được tab sau khi đồng ý điều khoản. |
| 2026-11-05 14:33 | Grok | **Chỉ tài liệu.** User nêu hướng thuê webapp theo ngày. Key Groq khách tự đăng ký hoặc tự mua. Ghi mục 13.5. Không sửa `src/`. | Chưa chốt giá, chưa chọn cổng nạp, chưa code. |
| 2026-11-05 14:36 | Grok | **Chỉ tài liệu.** Đề xuất giá thuê: 39.000 đ / 24 giờ, 129.000 đ / 7 ngày, 299.000 đ / 30 ngày. Khách vẫn tự trả Groq. | Chưa chốt. Chưa code. |
| 2026-11-05 14:47 | Grok | **Chỉ tài liệu.** Hạ giá đề xuất còn 19.000 / 59.000 / 149.000 vì khách chỉ tò mò hoặc ngồi 1–2 giờ, còn chờ hạn mức Groq. Thêm lượt xem thử miễn phí. | Mức 39.000 / 129.000 / 299.000 bỏ. Chưa code. |
| 2026-11-05 15:23 | Grok | **Chỉ tài liệu.** Tài khoản và hạn gói để trên Postgres Neon. Key Groq và video không lưu trên máy chủ. Bản xem thử PGLite không dùng cho khách thật. | Chưa code. |
| 2026-11-05 15:25 | Grok | **Chỉ tài liệu.** Không thuê VPS cho hướng thuê phòng. Web trên Vercel, dữ liệu trên Neon. VPS chỉ khi sau này tải video về máy chủ. | Chưa code. |
| 2026-11-05 15:27 | Grok | **Chỉ tài liệu.** Dời web khỏi Vercel: đổi kiểu chạy sang máy Node, giữ Neon thì không phải chuyển dữ liệu khách. | Chưa code. |
| 2026-11-05 15:34 | Grok | **Trang xem thử giá.** Thêm `/goi`. Bấm chọn gói, đăng ký và nạp chỉ trên trang đó, không lưu, không thu tiền. Trang chủ vẫn là cửa vào và phòng dịch. | Không phải cửa trả tiền thật. |
| 2026-11-05 17:25 | Grok | **Chỉ tài liệu.** Tài khoản thu tiền chưa có. Đăng nhập Google có sẵn đi qua môi giới của Grok, không dùng cho web Vercel tự kinh doanh. Email và ví phải làm riêng. | Chưa code. |
| 2026-11-05 17:28 | Grok | **Chỉ tài liệu.** Không có API MoMo hay VNPay miễn phí cho tiền thật. Bản đầu nên chuyển khoản qua SePay. Đăng ký email không cần Google, làm được. | Chưa code. Chưa chọn cổng. |
| 2026-11-05 17:37 | Grok | **Thử tài khoản.** Bật đăng ký email. Trang `/login` và `/tai-khoan`. Ví và hạn gói nằm trên cơ sở dữ liệu. Nút cộng tiền chỉ là tiền thử. Phòng dịch không bắt đăng nhập. | Chưa nối SePay, MoMo, VNPay. |
| 2026-11-05 17:40 | Grok | **Hạn gói trong phòng.** Đăng nhập thì phòng hiện còn hạn hay đã hết. Không khóa người chưa mua. Trang tài khoản đổi được tên và có nút Đăng xuất. | Ngân hàng và SePay chưa làm. Quên mật khẩu chưa gửi thư. |
| 2026-11-05 17:46 | Grok | **Chỉ tài liệu.** User chốt: chưa đụng webapp chính. Chỉ hoàn thiện demo kinh doanh. Demo xong và được duyệt thì mới đưa vào code phòng dịch. | Ngân hàng và SePay vẫn để sau. |
| 2026-11-05 17:53 | Grok | **Giới hạn gói trên demo.** Đăng ký chưa nạp: 1 tệp, 15 phút, không xuất file. Gói đang hạn: không giới hạn số tệp. Hết lượt thì phải mua. Chưa chặn tệp trong phòng dịch. | Ngân hàng vẫn để sau. |
| 2026-11-05 17:59 | Grok | **Chỉ tài liệu.** User đề xuất dùng thử 1 tệp, 10 phút, 50 MB, đủ chức năng, không xuất file. Chưa chốt. Gợi ý đo theo phút, không đưa key Groq của chủ web vào bản thử. | Chưa sửa code. |
| 2026-11-05 18:01 | Grok | **Chỉ tài liệu.** User xác nhận lại: chỉ cho thuê webapp. Key Groq là của khách. Chủ web không chịu cước Groq. | Chưa sửa code. |
| 2026-11-05 18:03 | Grok | **Dùng thử đã chặn.** Phải đăng nhập. 1 tệp, 10 phút, không quá 100 MB, không link, không xuất file, không dịch lại, không dò khoảng trống. Cùng trình duyệt không được lượt mới. Không xác minh email vì mail 10 phút. | Gói đang hạn thì không giới hạn số tệp. |
| 2026-11-05 18:15 | Grok | **Lưu bản gốc.** File `artifacts/TyZo_Sub_goc.zip` là phòng dịch trước đăng ký và gói thuê. Bản đang chạy giữ các tính năng đó. | Zip đã qua `tsc`. |
| 2026-11-05 18:24 | Grok | **Lối vào.** Điều khoản phiên bản `2026-11-05.2` có bảng giá. Đồng ý rồi mới tới đăng ký. Nút Tài khoản đứng cạnh Phụ đề và luôn ở cuối. | Chức năng lớn sau này đặt trước Tài khoản. |
| 2026-11-05 18:36 | Grok | **Chỉ tài liệu.** User nói phần xuất file đã khá tốt. Nút vẫn hiện. Dùng thử hoặc hết hạn thì báo không xuất. Còn hạn thì xuất. | Không sửa thêm. |
| 2026-11-05 18:52 | Grok | **Chỉ tài liệu.** Cần trang Admin khi có người dùng thật. Chỉ xem tài khoản, hạn gói, và mở hạn tay khi nhận tiền ngoài. Không xem key Groq, không xem video. | Chưa code. |
| 2026-11-05 18:53 | Grok | **Chỉ tài liệu.** Gợi ý thêm cho Admin: tìm email, sổ tiền, ghi chú, đặt lại mật khẩu, khóa, nhật ký thao tác. Chưa cần biểu đồ, không xem key, không vào thay người dùng. | Chưa code. |
| 2026-11-05 18:55 | Grok | **Chỉ tài liệu.** Ba mức quyền: Hỗ trợ, Quản lý, Chủ. Hết hạn không phải khóa. Người bị khóa hoặc bị cấm vẫn gửi được yêu cầu xem lại. Chỉ Chủ được cấm. | Chưa code. |
| 2026-11-05 18:57 | Grok | **Điều khoản.** Phiên bản `2026-11-05.3` thêm mục khóa và cấm. Hết hạn, hết lượt, dịch sai không bị khóa. Chia sẻ tài khoản và lấy lượt thử thì có thể khóa. Nội dung trẻ em, tấn công, giấy thanh toán giả, bán lại phòng thì có thể cấm. | Trang Admin vẫn chưa làm. |
| 2026-11-05 19:05 | Grok | **Trang Admin.** Nút Admin đứng trước Tài khoản khi đã có quyền hoặc chưa có Chủ. Hỗ trợ xem, ghi chú, mật khẩu tạm. Quản lý khóa, mở hạn, trả lời yêu cầu. Chủ cấm, xóa, chỉ định quyền. Người bị cấm gửi yêu cầu ở `/yeu-cau`. | Người đầu tiên bấm Nhận quyền Chủ. |
| 2026-11-05 19:07 | Grok | **Sửa quyền Chủ.** Bỏ nút nhận quyền và bỏ Admin khỏi phòng người dùng. Chỉ email trong `ADMIN_EMAIL` hoặc `.grok/admin.json` mới là Chủ. Trang riêng là `/admin`. | Chưa ghi email Chủ. |
| 2026-11-05 19:12 | Grok | **Đã ghi email Chủ** vào file máy chủ. Chủ đổi email ngay trên trang Admin. Mật khẩu người dùng gửi trong chat không lưu vào web. | Đăng nhập bằng email đó rồi mở `/admin`. |
| 2026-11-05 19:21 | Grok | **Điều khoản `2026-11-05.4`.** Mục 8 tách dòng Khóa và Cấm. Câu không bị phạt và câu giữ lịch sử màu vàng. Việc bị cấm màu đỏ. | Người dùng phải đồng ý lại. |
| 2026-11-05 21:04 | Grok | **Đưa phòng, đăng nhập và Admin lên kho.** | Giờ lấy từ git. |
| 2026-11-05 21:21 | Grok | **Nút về phòng, logo điều khoản, sổ tiền Admin.** | |
| 2026-11-05 21:56 | Grok | **v1.1.0.** Nút về phòng thẳng hàng. Logo chạy liên tục. Có số phiên bản. | |
| 2026-11-05 22:14 | Grok | **v1.2.0.** Mặc định form đăng nhập. Admin có số người online và tổng đăng ký. Khách gửi được yêu cầu. | |
| 2026-11-05 22:33 | Grok | **v1.3.0.** Logo đỡ chói. Thông báo nổi và chuông. Số phiên bản chỉ còn Vx.x.x. | |
| 2026-11-05 23:18 | Grok | **v2.0.0.** Bốn cấp. Báo cấp trên sau 2 giờ. Sơ đồ và doanh thu. | |
| 2026-11-05 23:46 | Grok | **v2.1.0.** Ô số có màu. Trả lời hoặc từ chối thì đóng yêu cầu. Từ chối bắt buộc có lý do. | |
| 2026-11-06 00:03 | Grok | **v2.2.0.** Mười kiểu thẻ quyền. Chủ chọn trong Admin. | |
| 2026-11-06 00:26 | Grok | **v2.3.0.** Video giữ 16:9. Đăng ký nhập lại mật khẩu và thanh mạnh yếu. Thẻ quyền thu gọn. | |
| 2026-11-06 00:52 | Grok | **v2.4.0.** Nút Quản lý cạnh Tài khoản khi có quyền. Lịch sử Admin ngắn. Đăng nhập nhớ email. Nghe mặc định bật. | |
| 2026-11-06 00:54 | Grok | **v2.4.1.** Giá đã chốt: 9.000 đ / 24 giờ, 39.000 đ / 7 ngày, 99.000 đ / 30 ngày. Điều khoản `2026-11-06.1`. | |
| 2026-11-06 01:01 | Grok | **Chỉ tài liệu.** Viết lại `huongdan.txt` và đối chiếu mục 2, mục 7, mục 13.5 với app đang chạy. Không đổi `src/`. | |
| 2026-11-06 01:09 | Grok | **v2.4.2.** Chữ Quản lý căn giữa, cùng hàng với Phụ đề và Tài khoản. | |
| 2026-11-06 10:02 | Grok | **v2.5.0.** Bấm hoặc rê chuột vào số phiên bản thì thấy tóm tắt cập nhật. Có bản chưa xem thì số sáng nhẹ. Quy tắc ghi thêm câu vào `CHANGELOG` mỗi lần nâng số. | |
| 2026-11-06 13:04 | Grok | **Chỉ tài liệu.** Chốt mục 10c trong `huongdan.txt`: từ mốc này, mọi dòng cập nhật phải nêu đủ phần nâng cấp, chỉnh sửa, thay đổi và bổ sung, viết câu chuyên môn, kèm mốc thời gian. Không đổi `src/`. Câu trên màn hình vẫn là v2.5.0. | |
| 2026-11-06 13:09 | Grok | **Chỉ tài liệu.** Chốt mục 12b trong `huongdan.txt`: từ mốc này, nâng cấp, cập nhật, bổ sung, chỉnh sửa hoặc chức năng nào làm đổi dịch vụ thì phải sửa bảng Tóm tắt, bảng giá hoặc mục điều khoản liên quan trong cùng lần đó, rồi nâng `TERMS_VERSION`. Không đổi `src/`. | |
| 2026-11-06 13:12 | Grok | **v2.5.1.** Viết lại các dòng trong hộp cập nhật cho đủ ý, thêm mốc thời gian phát hành. Không đổi điều khoản vì không đổi dịch vụ. | |
| 2026-11-06 18:40 | Grok | **Chỉ tài liệu.** Ghi mục 14: kế hoạch nâng cấp nhận dạng và dịch để làm sau. Không đổi `src/`. App vẫn **v2.5.1**. | |
| 2026-11-06 20:10 | Grok | **Chỉ tài liệu.** Ghi mục 15: cửa trả theo lượt, phiếu tiền, và quyền hỗ trợ. Không đổi `src/`. App vẫn **v2.5.1**. | |
| 2026-11-06 20:54 | Grok | **v2.5.2.** Nút ba gạch thay hàng Phụ đề, Tài khoản, Quản lý. Tên mục đang mở hiện cạnh nút. Khung Trả theo lượt hiện ở tab Key, Tài khoản và trang quản trị, ghi sẽ cập nhật sau. Chưa trừ tiền. Không đổi điều khoản. | |
| 2026-11-06 21:04 | Grok | **v2.6.0.** Bàn quản lý trả theo lượt: đơn giá, hạn mức, câu đóng cửa, số trong ngày, phiếu theo tài khoản, nhả giữ và hoàn ví. Hỗ trợ có câu trả lời sẵn. Khách chưa chạy cửa này. Không đổi điều khoản. | |
| 2026-11-06 21:11 | Grok | **v2.6.1.** Đóng thì trang khách chỉ thấy câu tạm ngưng. Mở thì khung Key của tôi hoặc Trả theo lượt hiện lại. Chưa trừ ví. Không đổi điều khoản. | |
| 2026-11-06 21:47 | Grok | **v2.7.0.** Cửa mặc định mở. Bảo trì bằng nội dung đã lưu. Giá biểu cập nhật riêng, tăng phần trăm hoặc giá riêng, khung model đồng bộ. Key của khách không hiện giá. Chưa trừ ví. Không đổi điều khoản. | |
| 2026-11-06 22:04 | Grok | **v2.8.0.** Giá gốc và model key admin chỉ ở trang quản trị. Khách chỉ thấy «Chưa cập nhật» nếu model chưa đưa ra. Bảng phiên bản còn 8 lần. Có báo bản mới. Không đổi điều khoản. | |
| 2026-11-06 22:22 | Grok | **v2.9.0.** Ô key ngay trên trang quản trị. Trả theo lượt không cần đồng bộ key. Đổi tên hiển thị hai thể loại, mã và thuật ngữ giữ. Thông báo nổi khi lưu ở quản trị. Không đổi điều khoản. | |
| 2026-11-06 22:43 | Grok | **v2.10.0.** Key phòng lưu trên máy chủ, tải lại không mất. Khách chọn trả theo lượt thì dùng key đó. Phiếu hiện giờ và trạng thái. Doanh thu đọc được cột ngày. Chưa trừ ví. Không đổi điều khoản. | |
| 2026-11-07 07:41 | Grok | **v2.10.1.** Tab Việc, Sơ đồ, Doanh thu tách riêng. Câu hạn gói đổi khi chọn trả theo lượt. Thẻ quyền có hiệu ứng. Sổ gần đây thu gọn. Không đổi điều khoản. | |
| 2026-11-08 18:15 | Grok | **v2.18.0.** Lượt thử trừ sau khi nhận dạng gọi được máy dịch. Hoàn tiền và nhả giữ không cộng hai lần. Dịch thiếu hoặc thừa câu thì dịch lại. Key phòng chỉ hiện 4 ký tự cuối. Điều khoản `2026-11-08.2`. | |
| 2026-11-08 19:13 | Grok | **v2.19.1.** Video không mất khi sang Tài khoản. Mốc thời gian không còn 0:60. Chi phí và doanh thu theo giờ Việt Nam. Cửa trả theo lượt chờ cửa mở. Thuyết minh không bị ép bật lại. Hai lần chạy không dùng nhầm phiếu. Điều khoản không đổi. | |
| 2026-11-08 18:52 | Grok | **v2.19.0.** Sửa nhóm 3 và 4 của báo cáo lỗi. Điều khoản `2026-11-08.3` vì mã nạp có thể là VietQR và lần đồng ý được ghi theo tài khoản. T6 chưa làm. T14 chưa chạy thử trên trình duyệt. | |

---


---

## 9. Glossary thuật ngữ theo thể loại phim (genre × ngôn ngữ)
> **Trạng thái 2026-11-04:** Vòng độc lập xong. Chọn thể loại thì chỉ nạp `public/glossaries/{lang}/{genre}.json`. Không còn `common.json` hay `global.json`. Chọn thể loại «Tự động» thì không nạp file thể loại. **Chọn ngôn ngữ lời nói «Tự nhận dạng» (mã rỗng) thì không nạp thuật ngữ**, kể cả khi đã chọn thể loại — `loadGenreGlossary` cần mã ngôn ngữ. CSV người dùng vẫn ghi đè theo đúng cặp ngôn ngữ × thể loại, nên cũng không áp khi lời nói đang «Tự nhận dạng». Khớp đuôi tiếng Nhật bằng luật giữ nguyên. Đích trong file JSON là tiếng Việt và được **ghi đè cứng** sau khi dịch, nên chọn ngôn ngữ đích khác tiếng Việt vẫn ra từ tiếng Việt.

### 9.1 Yêu cầu (nguyên gốc của user)
- Webapp dịch phim có bộ chọn **thể loại** (cần bổ sung thêm nhiều thể loại nữa).
- Có **1 thư mục lưu file thuật ngữ riêng cho từng thể loại phim**.
- Khi chọn thể loại → dùng file thuật ngữ riêng của thể loại đó; nếu câu/từ khớp với thuật ngữ trong file → **ưu tiên dùng bản dịch trong file**, thay vì dịch máy bình thường.
- File thuật ngữ **tách biệt theo từng ngôn ngữ nhận dạng**. Ví dụ: ngôn ngữ = tiếng Nhật, thể loại = phim tâm lý → dùng file thuật ngữ `tiếng Nhật × thể loại tâm lý`.

### 9.2 Phương pháp đề xuất (đã tư vấn cho user)
- **Cơ chế cốt lõi:** Custom glossary override (chuẩn CAT tool). Thực hiện 2 pha:
  - **Pre-edit:** quét câu nguồn tìm term khớp → thay bằng placeholder (vd `{{TERM_01}}`) + gửi kèm danh sách `source → target` vào prompt dịch để LLM giữ nguyên.
  - **Post-check:** sau khi có bản dịch, thay placeholder bằng target cứng (tránh LLM bỏ qua thuật ngữ).
- **Thứ tự ưu tiên khớp term (đã đổi ở bước 1):** chỉ file của **đúng thể loại đang chọn**. Không còn lớp «ngôn ngữ chung» hay «global». Không có mục `現場` đứng riêng. Dữ liệu tiếng Nhật chỉ có cụm riêng, ví dụ `撮影現場` → phim trường (file series) và `犯行現場` → hiện trường (file crime). Hai file không trộn nên không ghi đè nhau.
- **Cấu trúc thư mục** (`public/glossaries/`, fetch khi dịch):
  ```
  glossaries/
    ja/action.json … ja/daily.json
    ko/ …  zh/ …  en/ …
  ```
  15 thể loại: action, adventure, crime, scifi, horror, romance, psychological, comedy, costume, historical, mystery, sports, adult, series, daily.
- Đích cứng của file có sẵn là **tiếng Việt**. `restoreTerms` ghi đè bằng đúng chuỗi `target` đó. **Nếu người dùng chọn ngôn ngữ đích khác tiếng Việt, chỗ khớp thuật ngữ vẫn bị ép thành tiếng Việt.** Chưa có bản glossary theo ngôn ngữ đích. Đây là hạn chế còn lại, không sửa trong lượt 2026-11-04.
- **Định dạng 1 term (JSON/CSV):** `{ source, target, whole_word, case_sensitive, note }` — có thể mở rộng `regex, enabled, priority`.
- **Matching cho tiếng Nhật:** tiếng Nhật không có dấu cách → **KHÔNG** được `split(" ")`. Đề xuất dùng **kuromoji.js** (WASM, chạy được trên client) hoặc thuật toán **longest-match / Aho-Corasick trên trie**. Khi các term chồng lấn → **cụm dài hơn thắng**.
- **Điểm tích hợp với code hiện tại:** (đề xuất ban đầu, thực tế đã làm khác) bước quét term chạy **trước** `translateWithRepair` trong `src/components/use-pipeline.ts`; hàm quét/khôi phục term nằm trong `src/lib/sub/glossary.ts` (không phải `groq.ts`/`text.ts`). Có thể nhét glossary vào prompt dịch y như cách `addressLock()` đang làm (không cần thêm lượt LLM). Cân nhắc hợp nhất với "bible" nhân vật (`analyzeFilm`) để không có 2 hệ thống song song.
- **Tính năng phụ nên có:** trang test thử 1 câu (hiện term nào khớp + bản dịch cuối), import/export CSV/Excel, cache glossary trong RAM (không fetch lại mỗi lần dịch), log ghi lại các lần override để debug.

### 9.3 Việc cần các AI model tiếp theo phân tích & giải quyết
1. **Chốt cách triển khai** phù hợp stack React + Groq hiện tại: matching client-side trước khi gọi LLM, hay chỉ nhét glossary vào prompt (nhẹ hơn nhưng không chắc LLM tuân thủ 100%).
2. **Thiết kế thuật toán matching tối ưu cho tiếng Nhật:** xử lý biến dạng ngữ pháp (động từ đuôi ます/た/ない), kính ngữ, và các cụm từ mang nét văn hóa.
3. **Cơ chế fallback & xử lý xung đột:** nhiều term khớp chồng lấn, term nằm trong tên riêng/dialogue, glossary bị lỗi cú pháp.
4. **UI quản lý glossary:** thêm/sửa/xóa term, import hàng loạt, chọn/bổ sung thể loại.
5. **Liệt kê danh sách thể loại phim cần bổ sung** (user nói bộ thể loại hiện tại còn thiếu).
6. **Đề xuất cơ chế đóng góp cộng đồng** (nếu có): user gợi ý thuật ngữ mới → duyệt → merge vào glossary chung.

### 9.4 Ràng buộc cho AI tiếp nhận
- Giao tiếp với user bằng **Tiếng Việt**.
- Ưu tiên làm phần cốt lõi (quét term + override) trước, **không mở rộng quá xa** yêu cầu gốc.
- Nếu đụng vào prompt dịch: sửa bản React. File HTML không có trong gói giao.
- Mục tiêu cuối: chất lượng dịch **đúng nghĩa theo ngữ cảnh thể loại phim**, không chỉ đúng từ điển.

---

## 10. Hàng đợi từ báo cáo bản v4 (2026-11-03)

> **2026-11-06 01:01:** Các bước 1–7 dưới đây là lịch sử. Không làm lại. Việc mới chỉ bắt đầu khi user yêu cầu trong lượt chat đó. Quy tắc phiên bản và cách đẩy code nằm ở `huongdan.txt`.

Làm **từng bước**. Sau mỗi bước: cập nhật file này, đóng gói zip, liệt kê bước còn lại, hỏi trước khi làm tiếp. Quy tắc cùng nội dung nằm trong `huongdan.txt`.

### 3.9. Báo cáo mới của user (giữ nguyên ý, chưa xóa)

1. **Thuật ngữ:** không dùng chung giữa các thể loại. Cần bộ độc lập, càng nhiều và càng đúng càng tốt. Thêm thể loại **Hằng ngày**, từ theo cách nói hiện đại.
2. **Phân tích phim:** bảng nhân vật có 4 ô theo thứ tự «ô trống — nam/nữ — tự xưng — được gọi». Ô trống là gì? Sửa chữ trong ô thì gõ một ký tự là bàn phím ảo tắt, rất khó sửa. Phần tóm tắt và phân tích thì ổn, giữ nguyên.
3. **Phát video:** tùy chỉnh phụ đề chỉ dùng được lúc vào toàn màn hình. Thoát toàn màn hình thì chỉ còn một phần ô mẫu nổi.
4. **Thuyết minh:** đã có bảng nhân vật thì đọc theo giọng nam/nữ dựa trên bảng được không? Một số đoạn hình chưa tới câu đó mà thuyết minh đã đọc trước.
5. **Nhận dạng / câu nói / bản dịch:** một số đoạn bị thiếu, không dịch được.

### Nguyên nhân đã xác định (để bước sau không đoán lại)

- **Ô trống:** ô đầu là **tên nhân vật**. Chỉ có `aria-label`, không có nhãn hay placeholder nên nhìn như ô rỗng. Ba ô sau là giới, tự xưng, được gọi.
- **Bàn phím ảo thoát:** hàng nhân vật dùng `key` gồm cả tên (`${name}-${index}` trong `studio.tsx`). Gõ một chữ vào tên là key đổi, React dựng lại ô, focus mất, bàn phím tắt.
- **Panel phụ đề:** panel nằm `absolute` trong khung video `aspect-video` + `overflow-hidden`. Thoát toàn màn hình thì khung thấp, `max-h: 75%` cắt mất gần hết, chỉ lộ một phần ô mẫu. Trong toàn màn hình khung cao nên thấy đủ.
- **Đọc trước câu:** thuyết minh lấy câu bằng `findCueIndex(currentTime - offset + lead)`. Thanh «Đọc sớm hơn hình» (`lead`, mặc định 0) cố tình đọc sớm. Nếu mốc ASR sớm hơn lời thật trên hình, máy vẫn đọc theo mốc đó. **Đã xử lý ở bước 4:** không còn nhìn vào câu phía sau; `lead` giờ là số giây chờ sau khi câu hiện.
- **Thiếu đoạn:** bộ lọc `isNonSpeech` không được siết thêm (dễ nuốt «Ừ», «Em»). Nguyên nhân thiếu nhiều khả năng nằm ở cắt đoạn / model / câu trả về rỗng, chưa đo trên file của user.

### Đã xử lý bước 2 (2026-11-03)

- Hàng nhân vật dùng `key={`character-${index}`}`. Danh sách chỉ được sửa tại chỗ (không có nút thêm/xóa nhân vật), nên key theo vị trí là ổn định. Nếu sau này thêm nút thêm/xóa nhân vật thì phải đổi sang id riêng cho mỗi nhân vật.
- Mỗi hàng có tiêu đề «Nhân vật N» và nhãn hiện cho cả 4 ô. Ô đầu là tên nhân vật.
- Phần Tóm tắt và Thuật ngữ trong phim giữ nguyên.

### Đã xử lý bước 3 (2026-11-03)

- Panel không còn bị kẹt trong khung video khi không toàn màn hình. Toàn màn hình giữ nguyên dạng phủ đáy video (`max-h: 75%`), vì khung lúc đó cao đủ.
- Ngoài toàn màn hình, panel nằm ngay dưới video nên người dùng vừa kéo thanh vừa thấy phụ đề thật trên video (video vẫn hiện câu «Đây là phụ đề xem thử» khi chưa có câu thoại) và ô mẫu nổi ở đầu panel.
- Bật/tắt toàn màn hình khi panel đang mở: panel được dựng lại ở vị trí mới, giá trị chỉnh vẫn giữ vì nằm trong state `sub`. Đang kéo dở một thanh mà đổi toàn màn hình thì thao tác kéo đó bị ngắt (chấp nhận được).
- Chưa làm: HTML standalone (không có trong zip), nên không cần vá lần này.

### Đã xử lý bước 4 (2026-11-03)

- Nguyên nhân đọc trước câu: `findCueIndex(currentTime - offset + lead)`. `lead` (thanh «Đọc sớm hơn hình») nhìn vào tương lai, nên máy đọc câu sau trong khi hình vẫn đang ở câu trước. ASR sớm hơn miệng nhân vật vẫn có thể lệch nhẹ; không sửa bằng cách nuốt câu.
- Cách làm: chỉ đọc câu **đang hiện** trên hình. `lead` đổi nghĩa thành số giây **chờ sau** khi câu hiện (0–1,2). Mặc định 0. Người đã lưu số «đọc sớm» được đưa về 0, không bị hiểu thành chờ lâu.
- Giọng: bật sẵn «Đọc theo nam/nữ trong bảng nhân vật». Bằng chứng mạnh là tiền tố `Tên:` / `Tên：` (kể cả `variants`). Tự xưng đứng đầu câu chỉ dùng khi **đúng một người** tự xưng từ đó và **không nhân vật nào khác** dùng từ đó ở ô «được gọi». Ví dụ Minh tự xưng «anh», Lan được gọi «anh»: câu «Anh ơi…» **không** đổi giọng nam. Hai người cùng tự xưng «tôi» thì không đoán. Tắt ô này thì luôn dùng nút Nữ / Nam / Bất kỳ. Vá này nằm ở 2026-11-04 (`cast-voice.test.ts`).
- Giọng neural tiếng Việt: Hoài My / Nam Minh. Orpheus và giọng máy đi cùng giới khi đã khớp. Câu không khớp không ghi đè giọng người dùng đã chọn.
- Không làm trong bước này: diarization thật (Whisper không trả người nói), một câu hai giọng, bước 5 (đoạn thiếu).

### Đã sửa ngoài hàng đợi (2026-11-04) — không phải bước 5

- **Thuật ngữ dính chữ:** regex cũ bọc `\s*` hai bên `{{G0}}` nên «Anh ra {{G0}} ngay» thành «Anh rahiện trườngngay». `restoreTerms` giờ chỉ thay đúng token. Nhận thêm `{{ G0 }}`, `{{g0}}`, `{G0}`, `[[G0]]`. Số khớp hết chữ số, G1 không ăn G10.
- Prompt dịch (`translationMessages`) dặn giữ nguyên `{{G<số>}}`.
- Sau dịch, `settleGlossaryLines`: câu nguồn có placeholder mà bản dịch thiếu, hoặc còn token chưa restore, thì `use-pipeline.ts` dịch lại **đúng các câu đó một lần** bằng câu gốc (không protect). Lỗi lần hai thì `stripLeftoverPlaceholders` xóa token, không để `{{G` ra phụ đề.
- Không đổi định dạng file thuật ngữ, không đổi `findMatches`.

### Còn tồn tại / việc tiếp theo

- **Bước 5 Pha 0:** đã có log + UI + test. User cần chạy một phim thật rồi mở «Chẩn đoán câu bị loại» (hoặc xuất JSON). Chưa có số liệu đó thì không được siết/nới filter (Pha 1b, Pha 3).
- **Bước 5 Pha 1d:** đã có test. Câu dịch lỗi hiện «Không dịch được» và nút «Dịch lại các câu lỗi». Chưa user thử trên phim thật.
- **Bước 5 Pha 1a:** đã có test. Đoạn không giải mã được thử lại một lần, ngân sách 180 giây. Chưa user thử trên phim thật.
- **Bước 5 Pha 1c:** đã có test. Câu vùng chồng gán theo điểm giữa. Chưa user thử trên phim thật.
- **Bước 5 Pha 1b:** đã có test trên tín hiệu giả. Chưa có log phim thật để so số câu trước/sau. Ngưỡng không hạ.
- **Bước 5 Pha 2:** đã có test. Dò khoảng trống không tự gửi. Ngân sách 120 giây. Chưa user thử trên phim thật.
- **Bước 5 Pha 3:** đã đo. Không gắn Silero. Không nới bộ lọc thán từ.
- Việc còn lại không phải thêm pha nhận dạng: user chạy một phim thật, mở «Chẩn đoán câu bị loại» hoặc xuất JSON, rồi mới xét lại im lặng / thán từ nếu số liệu chỉ ra.
- **Bước 6 — màn hình theo luồng dùng.** 6.1–6.6 đã có test trên Chromium. Firefox và Safari iPhone chưa chạy.
- **Bước 7 — hết chồng, xếp tab, hết giật, số nổi, giọng so trong video.** 7.1–7.6 đã có test trên Chromium. Giọng chưa nghe trên phim thật. Chưa thử điện thoại thật.
- **Đề xuất ASR thiếu câu và chọn giọng:** mục 12. Bước 1 đến 4 đã có test. Chưa nghe trên phim thật.

### Máy đã chạy / máy cần thử (Bước 6.6)

| Máy | Đã làm | Còn lại |
|-----|--------|---------|
| Chromium trong sandbox | Đã mở 1280×800 và 390×844. Không tràn ngang, không lỗi console. Lúc 6.4 còn đo 768×1024, 1024×800 và ngang 844×390. | Không thay cho điện thoại thật |
| Firefox | Chưa chạy | User thử tab, video, dán key |
| Safari máy tính | Chưa chạy | User thử |
| Safari iPhone | Chưa chạy | User thử tai thỏ, bàn phím ảo, toàn màn hình |
- Thuật ngữ file sẵn **ép tiếng Việt** dù ngôn ngữ đích khác. «Tự nhận dạng» ở ngôn ngữ lời nói thì không nạp glossary.
- Thuyết minh vẫn không tách hai người trong một câu. Câu anh/em mơ hồ thì dùng giọng dự phòng (cố ý, không đoán).
- Mốc ASR sớm hơn miệng vẫn có thể làm thuyết minh lệch nhẹ; người dùng kéo «Chờ sau khi câu hiện». Không đọc câu phía sau.
- Bước 2 và 3 chờ user thử trên điện thoại. Bước 4 chờ nghe trên phim thật.

### Trạng thái hàng đợi

| Bước | Việc | Trạng thái |
|------|------|------------|
| 1 | 14 bộ thuật ngữ độc lập + thể loại Hằng ngày (hiện đại) | ✅ Xong 2026-11-03 |
| 2 | Bảng nhân vật: ghi rõ ô tên, sửa lỗi bàn phím ảo thoát sau một chữ | ✅ Xong 2026-11-03 (chờ user thử) |
| 3 | Tùy chỉnh phụ đề + ô mẫu dùng được cả khi không toàn màn hình | ✅ Xong 2026-11-03 (chờ user thử) |
| 4 | Thuyết minh giọng nam/nữ theo bảng nhân vật, không đọc trước câu | ✅ Xong 2026-11-03; vá anh/em 2026-11-04 (chờ user nghe) |
| **5** | **Giảm mất câu & lỗi dịch** (chi tiết mục 11) | ✅ Pha 0–3 đã có test. Pha 3 không gắn Silero. Chưa chạy phim thật |
| 5.0 | Pha 0 — Chẩn đoán (log reject + raw + UI) | 🟡 Đã có test 2026-11-04 13:25. Chưa chạy phim thật |
| 5.1d | Pha 1d — Xử lý batch dịch (parse thiếu câu, đánh dấu lỗi) | 🟡 Đã có test 2026-11-04 13:33. Chưa chạy phim thật |
| 5.1a | Pha 1a — Thử lại đoạn lỗi (retry có kiểm soát ngân sách) | 🟡 Đã có test 2026-11-04 13:40. Chưa chạy phim thật |
| 5.1c | Pha 1c — Xử lý biên đoạn (midpoint + rà soát keepFrom/dedup) | 🟡 Đã có test 2026-11-04 13:45. Chưa chạy phim thật |
| 5.1b | Pha 1b — Cải thiện phát hiện im lặng (RMS cửa sổ) | 🟡 Đã có test 2026-11-04 16:58. Chưa có số liệu phim thật |
| 5.2 | Pha 2 — Dò khoảng trống đáng nghi (có báo chi phí + xác nhận user) | 🟡 Đã có test 2026-11-04 17:08. Chưa chạy phim thật |
| 5.3 | Pha 3 — Tùy chọn nâng cao (VAD Silero, nới isNonSpeech khi có ví dụ thật) | ✅ Đã đo 2026-11-04 17:11. Không gắn. Không nới lọc |
| **6** | **Khung Phụ đề: video và bảng câu đứng yên, tab công cụ ngang** | 🟡 6.1–6.6 đã có test. Firefox và Safari iPhone chưa chạy |
| 6.1 | Đưa key, ngôn ngữ, file và nút chạy lên trên. Đóng thuật ngữ. Thu model vào «Tốc độ và chi phí» | 🟡 Đã có test 2026-11-04 20:13 |
| 6.2 | Thanh sản phẩm chỉ hiện Phụ đề. Video và bảng câu gắn một lần, không nằm trong tab | 🟡 Đã có test 2026-11-04 20:38 |
| 6.3 | Năm tab chỉ hiện một phần: Phim, Chất lượng, Nhân vật, Nghe, Kiểm tra. Một nút Dịch tiếp | 🟡 Đã có test 2026-11-04 20:41 |
| 6.4 | Ba cỡ màn hình. Video không bị cuộn mất. Điện thoại: tab không che kín video. Safe area, ô chữ ≥ 16px, nút ≥ 44px | 🟡 Đã có test 2026-11-04 20:48. Chưa Safari iPhone |
| 6.5 | Chuyển tab có animation ngắn. prefers-reduced-motion thì đứng yên. Chọn tab bằng bàn phím | 🟡 Đã có test 2026-11-04 20:55 |
| 6.6 | Không API chỉ một trình duyệt. Ghi máy đã chạy và máy cần user thử | 🟡 Đã có test 2026-11-04 20:58. Firefox và Safari iPhone chưa chạy |
| **7** | **Hết chồng khung, xếp tab, hết giật, số nổi, giọng so trong video** | 🟡 7.1–7.6 đã có test. Giọng chưa nghe trên phim thật. Không làm lại nếu user không yêu cầu |
| 7.1 | Video không đè tab. Bảng câu không bị tab phủ. Màn thấp không dùng lưới máy tính | 🟡 Đã có test 2026-11-04 21:48. Chưa điện thoại thật |
| 7.2 | Tab: Key Sub, Phim, Nhân vật, Nghe, Kiểm tra. Ba ô ngữ cảnh sang Nhân vật, không xóa | 🟡 Đã có test 2026-11-04 21:53 |
| 7.3 | Chọn file không kéo trang. Nút đóng là dấu X. Trạng thái khóa hai hàng | 🟡 Đã có test 2026-11-04 22:43 |
| 7.4 | Số thuật ngữ viên vàng chữ đen. Nút X nằm trong khung tab | 🟡 Đã có test 2026-11-04 23:01 |
| 7.5 | Đo cao độ lúc nhận dạng. Mốc cố định 160/190 Hz | 🟡 Đã có test 2026-11-04 23:12. Thay bằng 7.6 |
| 7.6 | So các câu trong cùng video. Một nhóm hoặc câu nằm giữa thì không đổi | 🟡 Đã có test 2026-11-04 23:25. Chưa phim thật |

---

## 11. Kế hoạch chi tiết Bước 5 — Giảm mất câu & không dịch được

> **Bắt buộc cho mọi AI:** Đọc kỹ mục này trước khi sửa bất kỳ dòng nào liên quan đến ASR / filter / dịch batch.  
> **Chỉ làm đúng một pha mỗi lần.** Sau khi hoàn thành một pha: cập nhật cột trạng thái ở bảng hàng đợi + ghi lịch sử, đóng gói, hỏi user trước khi chuyển pha tiếp.  
> Không siết hoặc nới bộ lọc khi chưa có dữ liệu từ Pha 0. Không đổi nhà cung cấp ASR (giữ Groq Whisper).

### Mục tiêu chung
- Giảm tình trạng mất câu và không dịch được.
- Không đổi nhà cung cấp ASR (giữ Groq Whisper).
- Ưu tiên chi phí thấp, rủi ro thấp, có thể đo lường được.
- Mỗi bước có tiêu chí hoàn thành rõ ràng trước khi chuyển bước tiếp theo.

### Nguyên tắc xuyên suốt
- Mỗi bước chỉ làm một việc, có test tái hiện được.
- Ưu tiên miễn phí / tiết kiệm hạn mức giây Groq.
- Không siết hoặc nới bộ lọc khi chưa có dữ liệu.
- Giữ nguyên các chức năng không liên quan (cử chỉ, panel phụ đề, TTS, glossary, bible…).

### File code chính cần đụng
- `src/lib/sub/text.ts` — `acceptSegment`, `isNonSpeech`, `parseTranslations`, `rms`, `SILENCE_RMS`, `OVERLAP_SECONDS`, `keepFrom`
- `src/components/use-pipeline.ts` — `applyReady`, `asrBuf`, `failedParts`, `translateRemaining`, worker ASR
- `src/lib/sub/groq.ts` — `translateOnce` / `translateWithRepair` (gọi parse)
- `src/lib/sub/types.ts` — type `Seg` (có thể thêm field optional)

---

### Pha 0 — Chẩn đoán (Ưu tiên cao nhất) — Bước 5.0

**Việc cần làm:**
- Ghi log đầy đủ mọi câu bị loại ở `acceptSegment` (lý do, thời điểm, văn bản, `no_speech_prob`, `avg_logprob`, `compression_ratio`, chỉ số đoạn).
- Lưu kết quả thô từ Groq trước khi qua bộ lọc `acceptSegment`.
- Thống kê theo lý do và theo ngôn ngữ.
- Hiển thị trong UI: tóm tắt số câu bị bỏ theo từng lý do + nút xem/xuất danh sách chi tiết.

**Tiêu chí hoàn thành:**
- Chạy được một phim thật và nhìn thấy danh sách câu bị loại kèm lý do. **Chưa đạt — chờ user.**
- Phân biệt được trường hợp “Whisper không nhận ra” với “App lọc bỏ”. **Đã tách trong code và test.**
- Không thay đổi kết quả phụ đề so với hiện tại. **Đã khóa bằng test** (`diagnostics.test.ts`: lời ngắn tự tin vẫn giữ, A/Ah vẫn bỏ, trùng/biên chồng vẫn bỏ).

**Đã làm (2026-11-04 13:25), trạng thái: đã có test, chưa user thử phim thật:**
- `acceptSegment` trả `{ accepted, reason, start, end, text }`. Nhánh loại và câu được giữ giống logic cũ.
- `ingestAsrPart` (`src/lib/sub/diagnostics.ts`) copy segment thô (text, start, end, no_speech_prob, avg_logprob, compression_ratio, ngôn ngữ Whisper báo nếu có) rồi mới lọc. `asrBuf` vẫn xóa sau khi áp dụng; bản raw nằm ở `rawParts` đến khi làm lại hoặc đổi file.
- Bốn nhóm: `whisper_empty` (đã gọi Whisper, không có text), reject của app (câu Whisper có text nhưng bị lọc), `silence` (RMS, không gửi Whisper), `decode_fail` (trình duyệt không giải mã).
- Thống kê theo lý do và theo ngôn ngữ. Ngôn ngữ: Whisper báo trước, không thì ngôn ngữ lời nói đã chọn, không thì «(tự nhận dạng)».
- UI ngay dưới dòng trạng thái: tóm tắt, danh sách, nút xuất JSON. Không hiện khi chưa chạy nhận dạng.
- Không đổi ngưỡng lọc, không đổi `parseTranslations`, không thử lại đoạn lỗi.

---

### Pha 1d — Xử lý batch dịch — Bước 5.1d

**Việc cần làm:**
- Sửa `parseTranslations` chấp nhận số lượng câu trả về ít hơn số câu gửi.
- Chỉ dịch lại những câu bị thiếu / lỗi, không dịch lại cả batch.
- Khi chia nhỏ batch vẫn truyền đủ ngữ cảnh (`ctx`, `addressLock`, bible…).
- Đánh dấu rõ câu lỗi dịch (`translationFailed`) và hiển thị trong UI (không lặng lẽ hiện câu gốc).
- Thêm nút «Dịch lại các câu lỗi».

**Tiêu chí hoàn thành:**
- Có unit test cho trường hợp LLM trả về thiếu câu. **Đạt** (`translate-batch.test.ts`).
- Batch lỗi không còn kéo theo cả 8 câu phải dịch lại. **Đạt trong test:** 6 câu đã có không bị ghi đè, chỉ 2 câu trống được chọn dịch lại.
- Người dùng nhìn thấy được câu nào dịch thất bại. **Có trong UI** («Không dịch được» + nút). Chưa user thử trên phim thật.

**Đã làm (2026-11-04 13:33), trạng thái: đã có test, chưa user thử phim thật:**
- `parseTranslations` không còn throw khi mảng ngắn hơn hoặc có ô không phải chuỗi. Câu thiếu thành chuỗi rỗng đúng vị trí. JSON hỏng hoặc không có mảng `t` vẫn lỗi cả lần gọi, rồi mới chia đôi (không gửi lại cùng một batch 8 câu).
- `translateWithRepair` chỉ gọi lại các vị trí trống hoặc chưa dịch, theo cụm liền nhau. `optsForRange` thêm câu trước/sau vào ctx và giữ nguyên `context` (addressLock + bible).
- Câu vẫn trống sau lần gọi lại được gắn `translationFailed`. Danh sách và phụ đề trên video hiện «Không dịch được», không lấy câu gốc làm bản dịch. Thuyết minh bỏ qua câu đó. SRT ghi `[không dịch được]`.
- Nút «Dịch lại các câu lỗi» chỉ đưa những câu đó vào hàng dịch.
- Không đụng ASR, filter, Pha 1a.

**Ghi chú kỹ thuật cũ (trước khi sửa):** `parseTranslations` từng throw nếu `arr.length !== count`, nên cả group trong `translateRemaining` fail.

---

### Pha 1a — Thử lại đoạn lỗi — Bước 5.1a

**Việc cần làm:**
- Tự động thử lại các đoạn `"fail"` tối đa 1 lần (có kiểm soát ngân sách giây).
- Báo rõ chỉ số đoạn + khoảng thời gian chưa nhận dạng được.
- Hiển thị số giây đã dùng cho việc thử lại.

**Tiêu chí hoàn thành:**
- Đoạn lỗi được thử lại có kiểm soát. **Đạt trong test:** mỗi đoạn một lần; 180 giây chỉ nhận 3 đoạn 60 giây; đoạn dài hơn phần còn lại không bị cắt.
- Người dùng biết chính xác đoạn nào còn thiếu. **Có trong UI** (chỉ số + khoảng thời gian, và số giây đã dùng). Chưa user thử trên phim thật.

**Đã làm (2026-11-04 13:40), trạng thái: đã có test, chưa user thử phim thật:**
- Chỉ thử lại `decode_fail` (trình duyệt không ra mẫu âm thanh). Không thử lại im lặng, Whisper trống, hay câu app đã lọc.
- Ngân sách 180 giây cho cả lần chạy. Đoạn không vừa phần còn lại được giữ nguyên và ghi «chưa thử lại vì hết ngân sách».
- Lần thử thành công thì nhận dạng như đoạn bình thường (cùng bộ lọc). Lần thử vẫn lỗi thì giữ trong danh sách thiếu.
- Bảng «Chẩn đoán câu bị loại» và dòng trạng thái ghi đoạn còn thiếu cùng số giây đã dùng.
- Không đổi RMS, overlap, filter. Không làm Pha 1c.

**Ghi chú kỹ thuật cũ (trước khi sửa):** `failedParts` chỉ ghi nhận `"fail"`. Pha 0 đã tách decode fail / Whisper trống / app lọc. Pha 1a chỉ đụng nhóm decode fail.

---

### Pha 1c — Xử lý biên đoạn — Bước 5.1c

**Việc cần làm:**
- Gán câu cho đoạn theo điểm giữa của câu thay vì bỏ 1 giây đầu đoạn sau (`keepFrom = chunkStart + OVERLAP_SECONDS * 0.5`).
- Rà soát lại logic `keepFrom` và bộ lọc trùng để tránh mất câu hợp lệ hoặc tăng trùng.

**Tiêu chí hoàn thành:**
- Có test tổng hợp kiểm tra câu nằm ở vùng overlap. **Đạt** (`overlap.test.ts`).
- Không làm tăng số câu bị loại oan. **Đạt trong test:** câu nửa đầu vùng chồng vẫn bị bỏ như cũ; câu điểm giữa ở đoạn sau thì được giữ; lời ngắn tự tin không bị siết. Chưa user thử trên phim thật.

**Đã làm (2026-11-04 13:45), trạng thái: đã có test, chưa user thử phim thật:**
- Mốc không đổi: `chunkStart + OVERLAP_SECONDS * 0.5` (1 giây). So **điểm giữa** câu với mốc đó, không so thời điểm bắt đầu.
- Câu đã có ở đoạn trước không được thêm lần nữa. Nếu đoạn sau nhận ra câu dài hơn và câu đó đang không bận dịch, nối chữ vào câu cũ rồi dịch lại.
- Không đổi ngưỡng im lặng, ảo giác, A/Ah. Không làm Pha 1b.

**Ghi chú kỹ thuật cũ (trước khi sửa):** `absStart < keepFrom` bỏ mọi câu bắt đầu trong 1 giây đầu đoạn sau, kể cả câu có phần lớn nằm ở đoạn sau.

---

### Pha 1b — Cải thiện phát hiện im lặng — Bước 5.1b

**Việc cần làm:**
- **Chỉ thực hiện khi Pha 0 chứng minh RMS đang là nguyên nhân mất câu.**
- Tính RMS theo cửa sổ nhỏ (ví dụ 1 giây), không chuẩn hóa toàn đoạn.
- Chỉ bỏ đoạn khi mọi cửa sổ (hoặc cửa sổ cao nhất) đều dưới ngưỡng.

**Tiêu chí hoàn thành:**
- Có số liệu so sánh trước/sau từ Pha 0. **Chưa có phim thật.** Test giả lập: RMS cả đoạn 60 giây có 1 giây tiếng thì dưới `0.005` (cách cũ bỏ), cửa sổ 1 giây thì giữ.
- Không làm tăng ảo giác. **Ngưỡng không hạ.** A/Ah vẫn bị loại. Chưa đo số câu ảo trên phim thật.

**Đã làm (2026-11-04 16:58), trạng thái: đã có test, chưa so trên phim thật:**
- `isSilentChunk` tính RMS từng cửa sổ 1 giây. Không lấy trung bình cả đoạn, không khuếch đại cửa sổ im.
- Chỉ bỏ đoạn khi mọi cửa sổ đều dưới `0.005`. Dùng ở lúc nhận dạng, lúc thử lại đoạn lỗi, và lúc kiểm tra file không có tiếng.
- Không đổi `acceptSegment` ngoài việc đã làm ở Pha 1c. Không làm Pha 2.

**Ghi chú:** Làm theo yêu cầu «tiếp tục» dù chưa có log Pha 0 trên phim của user. Nếu phim thật ra nhiều câu ảo hơn, có thể trả lại cách RMS cả đoạn.

---

### Pha 2 — Dò khoảng trống đáng nghi — Bước 5.2

**Việc cần làm:**
- Sau khi hoàn thành các bước trên, tìm các khoảng dài không có câu nhưng có năng lượng giọng nói.
- Chỉ nhận dạng lại các đoạn ngắn đó (có giới hạn tổng giây và yêu cầu người dùng xác nhận trước).

**Tiêu chí hoàn thành:**
- Có cơ chế báo chi phí trước khi chạy. **Đạt:** nút dò không gọi Groq; bảng hiện số giây và ước tính $; hộp thoại hỏi lại trước khi gửi.
- Không tự động tốn hạn mức vô kiểm soát. **Đạt trong test:** ngân sách 120 giây, khoảng dài hơn phần còn lại không bị cắt, khoảng im hoặc đã có câu không được đề xuất. Chưa user thử trên phim thật.

**Đã làm (2026-11-04 17:08), trạng thái: đã có test, chưa user thử phim thật:**
- Khoảng đáng nghi: ít nhất 2 giây liên tục có RMS ≥ `0.005`, và không nằm trong câu đã có.
- Chỉ gửi đúng các khoảng đó, không gửi lại cả phim. Trần 120 giây cho cả lần chạy (trừ phần đã gửi).
- Câu thêm ra chưa dịch. Bấm Tiếp tục để dịch, không nhận dạng lại.
- Không hạ ngưỡng im lặng, không nới A/Ah. Không làm Pha 3.

---

### Pha 3 — Tùy chọn nâng cao — Bước 5.3

**Việc cần làm:**
- Đánh giá VAD Silero (kích thước, hiệu năng trên trình duyệt).
- Chỉ nới `isNonSpeech` hoặc thêm hỗ trợ thán từ ja/ko/zh khi có ví dụ thật từ Pha 0.

**Tiêu chí hoàn thành:**
- Có đo đạc thực tế trước khi quyết định tích hợp. **Đạt.** Đo file thật, không ước lượng. Quyết định: **không gắn.**

**Đã đo (2026-11-04 17:11):**

| Thứ | Byte | Gzip |
|-----|------|------|
| `silero_vad.int8.onnx` (k2-fsa, 16 kHz) | 212860 | 148120 |
| `silero_vad.onnx` v5 (snakers4) | 2313101 | 1942942 |
| `onnxruntime-web@1.31.1` `ort-wasm-simd-threaded.wasm` | 14848852 | 3792479 |
| `ort.wasm.min.js` | 53796 | 17103 |
| App hiện tại (JS + CSS bản build) | 606582 | 189397 |

- Cụm nhỏ nhất để chạy Silero trên trình duyệt (model int8 + WASM + glue) gzip khoảng **4.0 MB**, khoảng **21 lần** app hiện tại.
- RMS cửa sổ đang dùng: 10 phút âm thanh (9.6 triệu mẫu) hết **25.1 ms** trong Node. Không cần mạng nơ-ron cho bước này.
- Không tải model vào repo, không thêm dependency.

**Không làm:**
- Không nới `isNonSpeech`. Chưa có câu ví dụ ja/ko/zh từ log Pha 0. «A» / «Ah» vẫn bị loại. «Ừ» và «うん» khi model tự tin vẫn được giữ.
- Không gắn VAD. Nếu sau này phim thật cho thấy RMS bỏ nhầm tiếng người (không phải im), hãy xét lại bằng model int8, và chỉ tải WASM khi người dùng bật, không nhét vào lần mở app.

---

### Quy tắc bắt buộc khi làm Bước 5
1. Làm **đúng một pha** mỗi lần chuyển giao / mỗi phiên.
2. Sau mỗi pha: cập nhật bảng trạng thái hàng đợi + ghi vào lịch sử thay đổi trong file này.
3. Không nhảy pha, không làm song song nhiều pha.
4. Không thay đổi hành vi filter / RMS / overlap khi chưa có dữ liệu Pha 0.
5. Mọi thay đổi phải có tiêu chí hoàn thành kiểm chứng được (test hoặc chạy phim thật).
6. Giữ nguyên mọi chức năng không liên quan.

---

## 12. Đề xuất khắc phục triệt để – ASR thiếu câu & Chọn giọng nam/nữ

> **Trạng thái 2026-11-05 12:34:** Bước 1 đến 4 đã có test. Chưa nghe trên phim thật.

### 12.1 Vấn đề hiện tại

Giữ nguyên ý user đã báo:

- Nhận dạng câu chưa hoàn chỉnh: dễ thiếu câu, sai câu, cắt giữa câu, câu ngắn bị lọc mất.
- Nhận nam/nữ chưa đủ để máy tự chọn giọng thuyết minh. Câu ngắn hoặc tiếng ồn dễ không gán được, hoặc gán lệch. Phim một người nói thì cả video giữ giọng dự phòng.

Chưa có log một phim thật để biết lý do nào đang nuốt câu nhiều nhất. Không được siết lọc thêm trước khi có số liệu đó (quy tắc mục 7 và mục 11).

### 12.2 Nguyên nhân đang có trong code

Đối chiếu ngày 2026-11-05. Một số câu trong bản đề xuất gửi kèm không còn đúng với code.

**Cắt đoạn**

- File đã giải mã thành PCM đi qua `splitAudio` (`text.ts`). Đoạn mục tiêu 60 giây, chồng 2 giây, đoạn tối thiểu 10 giây. Nếu chưa hết file, app tìm cửa sổ 0,2 giây có năng lượng thấp nhất trong **5 giây cuối** của đoạn rồi cắt ở giữa cửa sổ đó. Vẫn có thể cắt giữa câu nếu chỗ nhỏ năng lượng không phải chỗ ngừng lời.
- File xem theo dòng (`j.pcm` không có) đi qua `streamParts`. Cách này **chỉ cắt theo thời gian**, không dò năng lượng. Chồng 2 giây, đoạn cuối ngắn hơn 10 giây thì nhập vào đoạn trước.
- Chỗ gọi: `use-pipeline.ts`, `j.parts = j.pcm ? splitAudio(j.pcm) : streamParts(...)`.

**Im lặng**

- `isSilentChunk` không còn lấy một RMS cho cả đoạn. Nó tính RMS từng cửa sổ 1 giây, ngưỡng `0.005`. Chỉ bỏ đoạn khi **mọi** cửa sổ đều dưới ngưỡng (`text.ts`, Pha 1b).
- Đây vẫn là năng lượng, không phân biệt tiếng người với nhạc hay tiếng ồn. Một giây có tiếng là cả đoạn 60 giây được gửi Whisper.

**Lọc câu**

- `isNonSpeech` bỏ câu chỉ toàn A/Ah/thở/rên, kể cả khi model tự tin. «Ừ», «うん» khi model tự tin thì giữ. Hàm này chưa có file test riêng; `vad-eval.test.ts` chỉ khóa vài ví dụ.
- `acceptSegment` không có mốc «dưới 1,5 giây thì bỏ». Câu ngắn chỉ rơi khi:
  - còn 1 chữ và `no_speech_prob` > 0,6 (`short_uncertain`);
  - không quá 4 chữ, dài dưới 0,8 giây, và `no_speech_prob` > 0,85 (`brief_uncertain`);
  - hoặc dính ảo giác, nén cao, độ tin thấp (`low_confidence`: `no_speech_prob` > 0,8 và `avg_logprob` < −0,8).
- Câu ở nửa đầu vùng chồng 2 giây vẫn bị bỏ nếu điểm giữa nằm trước mốc 1 giây (Pha 1c).

**Giọng nam/nữ**

- `hearVoice` (`text.ts`) chỉ đo khi lát cắt của câu dài ít nhất 0,5 giây. Ngắn hơn thì không có `pitchHz`.
- `measurePitch` (`pitch-voice.ts`) là tự tương quan. Bỏ 0,1 giây hai đầu. Thân câu sau khi bỏ hai đầu phải còn khoảng 0,3 giây. Khung 30 ms, bước 15 ms. Cần ít nhất 8 khung, 6 khung có chu kỳ, và ít nhất 40% khung có tiếng. Cao độ lấy trung vị, dải 70–400 Hz.
- `assignVoices` xóa `voice` rồi gán lại. Tìm **khoảng trống lớn nhất** giữa các câu đã đo. Khoảng trống và khoảng cách hai tâm đều phải từ 40 Hz trở lên. Câu gần cả hai tâm (lệch dưới 15 Hz so với một bên) thì không gán. Một nhóm, hoặc chưa đủ hai câu đo được, thì không gán. Gọi từ `ingestAsrPart` (`diagnostics.ts`) sau mỗi lần thêm câu.
- `voiceGenderForLine` (`cast-voice.ts`) vẫn chọn nam/nữ khi câu có «Tên:» hoặc tự xưng đứng đầu, và vẫn chặn anh/em mơ hồ. **Không file nào trong `src/` gọi hàm này** ngoài `cast-voice.test.ts`. `speakAt` trong `studio.tsx` chỉ dùng `seg.voice` khi ô đọc theo video đang bật. Không có `seg.voice` thì dùng giọng dự phòng (Neural: Nữ hoặc Nam; không còn «Bất kỳ»).
- Vì vậy bảng nhân vật đang ảnh hưởng bản dịch (`addressLock`), không ảnh hưởng giọng đọc.

**Việc đã có, đừng làm như chưa có**

- Tab Kiểm tra có «Chẩn đoán câu bị loại»: lý do, thời điểm, xuất JSON, và từ 2026-11-05 12:10 có Nghe / Giữ / Bỏ từng câu. Giữ không gửi lại cả phim.
- Thử lại tự động (Pha 1a) chỉ dành cho `decode_fail`, mỗi đoạn một lần, ngân sách 180 giây. Không thử lại `low_confidence`, `short_uncertain`, `brief_uncertain`, hay Whisper trống.
- Dò khoảng trống (Pha 2) là đường khác: chỗ có tiếng ≥ 2 giây mà không có câu, ngân sách 120 giây, phải bấm và xác nhận. Không phải retry theo lý do lọc.
- Pha 3 đã đo Silero. Từ 2026-11-05 12:21 có ô bật: model int8 và WASM chỉ tải khi bật, không nằm trong JS lúc mở trang. Tắt thì vẫn chỉ dùng RMS.

### 12.3 Phương án đề xuất, theo thứ tự

Bước 1 đến 4 đã làm. Không siết `isNonSpeech`.

**Bước 1 — đã có test 2026-11-05 12:10.** Chưa nghe trên phim thật.

- Khi đọc, `narrationChoice` dùng `voiceGenderForLine` trước. Chỉ khi hàm trả `null` mới dùng `seg.voice`. Tắt ô thì giữ giọng dự phòng. Anh/em mơ hồ vẫn không đoán.
- Không thêm cổng «dưới 1,5 giây thì bỏ». `short_uncertain` và `brief_uncertain` được giữ khi `avg_logprob` là số và ≥ −0,6. Thiếu số thì vẫn loại như cũ. `isNonSpeech` chạy trước, nên «A» / «Ah» vẫn loại dù logprob cao.
- Tab Kiểm tra: mỗi câu lọc có Nghe (đúng lát tiếng), Giữ (đưa vào phụ đề, không gửi lại cả phim), Bỏ (đánh dấu, không đưa vào phụ đề).

**Bước 2 — đã có test 2026-11-05 12:21.** Chưa chạy trên phim thật.

- Ô «Chỉ gửi đoạn có tiếng người» trong tab Key Sub. Tắt mặc định, nên lần mở app không tải WASM.
- Bật thì `gateChunk` gọi Silero int8 (`public/models/silero_vad.int8.onnx`, 212860 byte) qua `onnxruntime-web`, WASM ở `public/vad/` (15 MB, một luồng). Cắt phần không phải lời ở đầu và cuối mỗi đoạn. Không tách thành nhiều request.
- Không có lời thì không gửi Whisper. Lỗi tải model hoặc WASM thì dùng `isSilentChunk` như khi tắt ô.

**Bước 3 — đã có test 2026-11-05 12:28.** Chưa chạy trên phim thật.

- `chunksFromSpans` gộp chỗ ngừng dưới 1,5 giây và cắt chỗ ngừng dài hơn. Đoạn liền quá 60 giây vẫn cắt, có 2 giây chồng. Đoạn không chồng thì không bỏ câu ở đầu đoạn sau.
- File đã giải mã dùng năng lượng từng giây. Bật lọc tiếng người và có PCM thì dùng vùng Silero. File xem theo dòng dò năng lượng từng khúc 30 giây, không chỉ sửa `splitAudio`.
- Sau retry lỗi giải mã, `planFilterRetries` gửi lại `low_confidence`, `short_uncertain`, `brief_uncertain` và Whisper trống. Ngân sách 120 giây, không cộng vào 180 giây của lỗi giải mã. Câu đã bấm Bỏ không gửi lại.

**Bước 4 — đã có test 2026-11-05 12:34.** Chưa nghe trên phim thật.

- `measurePitch` bỏ câu có cao độ lệch quá 35 Hz. `hearVoice` vẫn chỉ đo câu từ 0,5 giây.
- Nút Đổi giọng trên mỗi câu: tự động → nam → nữ → tự động. Khóa lưu theo tên phim, lần gán sau không đè.
- Giới trong bảng nhân vật được lưu. Phân tích lại không xóa giới đã chọn. Lúc đọc, khóa từng câu thắng bảng nhân vật, bảng thắng cao độ.

### 12.4 Ghi chú

- Lượt 2026-11-05 12:04 chỉ ghi đề xuất. Lượt 12:10 làm bước 1. Lượt 12:21 làm bước 2, ô tắt mặc định. Lượt 12:28 làm bước 3. Lượt 12:34 làm bước 4.
- Hàng 23: bảng nhân vật đã được gọi lúc đọc, và thắng cao độ khi khớp.
- «Im lặng chỉ là một RMS đơn giản cho cả đoạn» là mô tả cũ. Code hiện tại là RMS cửa sổ 1 giây.

---


---

## Ghi chú sửa nhận dạng (2026-11-11, Claude)
- `groq.ts`: xin thêm mốc từng từ (`timestamp_granularities[]` word + segment). Groq trả 400 thì tự gửi lại không có mốc từ, rồi mới thử WAV.
- `word-time.ts` + `diagnostics.ts`: giờ câu lấy theo từ đầu tiên/cuối cùng, chỉ dịch vào trong câu. Sửa lỗi câu đầu đoạn sớm 0,7–1,2 giây.
- `text.ts`: câu «cảm ơn đã xem» kéo dài từ 6 giây bị loại; thoại lặp thật vẫn giữ. Prompt dịch có dòng cảnh báo lỗi đồng âm.
- `scripts/asr-eval.mjs`: đo CER/WER và lệch giờ theo bảng đáp án `doi-chieu.txt`.
- Chưa chạy trên Groq thật. Chữ nhận sai ZH/JA là lỗi của Whisper, chưa sửa bằng mã.
- 2026-11-14 10:20 — v3.31.0 trên work (theo yêu cầu: gói cải tiến Admin A–F, giai đoạn 2). Làm: F giao diện (thanh bên trái từ 1024 px, Ctrl+K tìm mục và khách, hàng nút điện thoại dính khi cuộn), C phần mới (biểu đồ đường thu/chi, ARPU, tỷ lệ dùng thử → mua, giá vốn mỗi phút âm thanh, chi phí ghi tay theo loại, migration 0023). Không đổi điều khoản, không đụng dữ liệu khách. Chưa làm, chờ người dùng chốt: D xem câu lỗi và gửi kiểm tra lại, chặn toàn bộ phòng khi bảo trì, chế độ Chỉ xem. Chưa thử trình duyệt thật và Neon thật.
- 2026-11-14 19:30 — v3.31.2 trên work (giữ số bản theo yêu cầu): SideRail dùng chung có nhóm hai tầng, Admin 5 nhóm, trang khách bỏ hàng tab công cụ và menu thả xuống, Đăng xuất xuống cuối menu; chụp Chrome 390 và 1280 px.
- 2026-11-14 20:20 — v3.32.0 trên work (mục 1 và 6 của bảy mục «giao diện nhẹ»): home-state.ts, home-hero.tsx, studio-palette.tsx, palette-match.ts. Trang chủ một ô thả lớn + hàng chip + nút Tải và dịch khi chưa có phụ đề; dán link ở bất cứ đâu tự bắt đầu ở trang chủ; Ctrl+K cho trang khách; mục Trang chủ trong menu trái. Test mới home-state, palette-match.
- 2026-11-14 20:50 — v3.33.0 trên work (mục 2 và 3): steps-bar.tsx thanh liền có vạch ngăn; cue-editor.tsx sửa câu tại dòng thay hộp trượt từ đáy; export-menu.tsx menu tải SRT/WebVTT/TXT, text.ts thêm toVtt và toTxt. Bấm dòng nhảy video và phụ đề hiện dần đã có từ trước, không đổi. Test mới export-format.
- 2026-11-14 21:30 — v3.34.0 trên work (mục 4): money-card.tsx, wallet-view.ts. Số dư, «còn khoảng N phút», ước tính cho video đang chọn, báo thiếu tiền, nạp nhanh bằng TopUp chế độ gọn; chỉ hiện khi chọn Trả theo lượt; không đổi giá, giữ ví hay điều khoản. Test mới wallet-view. Chưa thử với ví và gói thật.
- 2026-11-14 12:20 — v3.31.2 trên work: thêm .admin-card, align-content:start, Cấu hình tách part key/price, gập soạn thư và icon; đã chụp Chrome thật 390 và 980 px, không tràn ngang.
- 2026-11-14 11:40 — v3.31.1 trên work (theo ảnh chụp người dùng). Làm: .admin-grid và .admin-flow thành lưới đều, tab Cấu hình (key Groq, giá, key Alibaba, gói dịch, model thuê phòng, cổng nạp), thẻ gập cho phần dài, lưu bảo trì và giá đọc lại cửa mới nhất trước khi ghi. Không đổi điều khoản. Chưa kiểm trình duyệt thật.

---

# Chuyển từ PROJECT_STATUS.md ngày 23/11/2026 (nguyên văn, không phải lệnh)

## 4. Hướng xử lý đã chọn (khác đề xuất cũ ở chỗ ghi rõ)

### Nguyên nhân gốc (không chỉ là `full === true`)
1. `onPointerMove` return sớm khi `!full`. Bản HTML cũng chặn bằng `isFull()`. User kéo trên player thường (chưa phóng to) nên cử chỉ “chết”.
2. `#stage` / player dùng `touch-action` cho phép trình duyệt nuốt vuốt dọc thành scroll. Đã đặt `touch-action: none` trên khung hình và `setPointerCapture`.
3. Không có nhánh brightness trong React (HTML thì có, nhưng cũng chỉ khi fullscreen).
4. Preview “Đây là phụ đề xem thử” đã nằm trên video khi mở panel, nhưng panel `max-h: 75%` che phụ đề. Cần một sân khấu mẫu **bên trong** panel.

### Đã làm
- Cử chỉ: ngang = tua, dọc phải = âm lượng, dọc trái = độ sáng. HUD chữ (không emoji). Phím mũi tên / `[` `]` / `F` / `M` / Space.
- Không bắt đầu cử chỉ khi chạm `button, input, select, textarea, label` hoặc `[data-nogesture]` (panel + box mẫu).
- `isNonSpeech()` trong `src/lib/sub/text.ts` (và bản JS tương đương trong HTML). Whisper hay gán logprob khá cao cho chữ “A”, nên **không** chờ `no_speech_prob`.
- Giữ lời ngắn thật: “Ừ”, “Em”, “Anh”, “Có”, “Dạ”, “OK”, “I”, “No”.
- Prompt Whisper: glossary/tên phim đứng trước, câu “Ignore breathing…” đứng cuối và bị cắt 420 ký tự. API Groq **không** có `no_speech_threshold` (chỉ có file, model, language, prompt, temperature, response_format). Không gửi tham số tưởng tượng.
- Nếu prompt bị Whisper đọc thành câu, `isNonSpeech` bỏ các dòng chứa “Ignore breathing” / “non-speech”.
- `analyzeFilm` trả thêm `self` và `addressed`. `addressLock()` nhét vào từng batch dịch. Không thêm lượt LLM consistency (nhân đôi phí) — ghi là việc còn lại nếu user vẫn thấy lẫn xưng hô.
- Lúc đó hai nguồn (React + HTML) được kéo cùng logic; HTML nay không còn trong gói giao. App người dùng mở là React.

### Yêu cầu mới 2026-11-03 — đã làm
- **Box mẫu (#16):** panel phụ đề là cột flex. Ô mẫu `shrink-0` nằm trên vùng `overflow-auto` của các thanh. `sampleBottom()` kẹp vị trí chữ trong ô (8–62%) để không bị cắt; video dùng `sub.pos` thật.
- **Mặc định style (#17):** `SUB_DEF` = `{ op: 0, size: 50, pos: 3 }`. Khóa `gset_v=2`. Bản lưu đúng bộ cũ được đổi sang mặc định mới. Bản đã sửa từng thông số thì giữ.
- **Phân tích phim (#18):** khối riêng trong `studio.tsx`. `use-pipeline.ts` chờ ASR xong, gọi `analyzeFilm`, nếu `reviewBefore` thì đặt `reviewHold` và không dịch cho đến khi `approveBible()`. Sửa bible ghi thẳng vào `job.bible` nên batch dịch sau đó dùng bản đã sửa. Logic `analyzeFilm` / `addressLock` không đổi.
- **TTS (#19):** `src/lib/sub/edge-speech.ts` (server function) + `edge-voice.ts` + nhánh `engine: "edge"` trong `narration.ts`. Người chưa từng đổi giọng được chuyển sang Neural (`gnarr_v=2`). Người đã chỉnh tốc độ/giọng thì giữ lựa chọn cũ.
- **Thuyết minh bước 4 (#23):** `src/lib/sub/cast-voice.ts` chọn nam/nữ khi câu có «Tên:» hoặc tự xưng duy nhất đứng đầu câu **và không trùng cách gọi (`addressed`) của nhân vật khác**. `studio.tsx` chỉ đọc câu đang hiện trên hình; `lead` là số giây chờ sau khi câu hiện, không còn đọc sớm. `gnarr_v=3` đưa `lead` đã lưu về 0.

### Chưa làm / không làm (gộp các lượt)
- VAD riêng trước Whisper (nặng, cần WASM; silence RMS đã có).
- Đo lại chất lượng ASR trên file phim của user (không có file mẫu trong workspace).
- Lượt “consistency pass” sau khi dịch xong.
- Glossary: không nhúng kuromoji. Đuôi nói thường gặp xử lý bằng luật (`jaVerbSurfaces` + đuôi danh từ). Biến thể kính ngữ hiếm vẫn có thể trượt.
- Piper-WASM.
- File HTML không có trong gói giao. Không tạo lại HTML. Prompt dịch lần 2026-11-04 chỉ sửa trong React (`text.ts`).
- **T6, đã chốt 2026-11-08 19:21, không làm:** không khóa lượt thử theo máy thật. Mã máy do trình duyệt tự sinh. Xóa dữ liệu trang hoặc ẩn danh là máy mới. Không bịa fingerprint, cookie hay captcha. Khóa thật chỉ có khi thư đã xác minh, và gửi thư chỉ bật khi phòng đã cấu hình nhà cung cấp thư.
- **S9, đã chốt 2026-11-08 19:21, không làm:** không viết bộ giải HE-AAC, không đọc hết mọi bản `elst`. Chỉ bù mục đầu, bản 0. AAC-LC vẫn đọc. HE-AAC để trình duyệt giải.
- **Captcha yêu cầu công khai, không làm.** Đã có trần email, trần chung và trần IP khi máy chủ thấy địa chỉ.

---

## 15. Trả theo lượt — khung đã dựng, chưa dùng được

User chốt ngày 2026-11-06, buổi tối. Đây là lát cắt đầu của mục 13.2, không thay mục 13.2. Dán link, đơn giá link, và đăng nhập Google vẫn để sau.

Từ **v2.10.0**, Chủ bấm Lưu key thì key nằm trong `room_settings`, không đưa ra trang khách. Khách còn hạn, chọn trả theo lượt, thì trình duyệt gọi đường của phòng và máy chủ gắn key đó khi nói chuyện với Groq. Tải lại trang quản trị thì Chủ thấy lại key. Chưa trừ ví.

Phần dưới là việc sẽ làm khi user yêu cầu đúng mục này. Không coi khung là cửa đã mở.

Không làm cổng cho thuê API. Điều khoản Groq, sửa ngày 22/06/2026, cho gắn Groq vào ứng dụng của phòng cho người dùng cuối, và cấm bán lại hoặc cho thuê tài khoản Groq nếu chưa có chấp thuận bằng văn bản. Khách không nhận key. Không có khóa cho lập trình viên.

### 15.1. Hai cửa

Một lần chạy chỉ một cửa. Không cộng gói ngày và ví vào cùng một lần.

| | Cửa 1, đang chạy | Cửa 2, trả theo lượt |
|---|---|---|
| Key | Của khách, trên trình duyệt | Của chủ, chỉ ở máy chủ |
| Tiền phòng | 9.000 / 39.000 / 99.000 đ | Không bán gói ngày cho lần này |
| Tiền Groq | Groq tính khách | Khách trả phòng, bằng đồng |
| Tệp | Chọn trên máy khách | Vẫn chọn trên máy khách |

Dùng thử không đi qua cửa 2. Cửa 2 chỉ mở khi SePay hoặc Casso đã cộng tiền thật. Hết hạn mức Groq thì Chủ đóng cửa 2. Cửa 1 vẫn chạy.

Khách thấy một đơn giá mỗi phút tiếng, đã gồm nhận dạng, dịch và phần chênh. Không hiện hóa đơn gốc của Groq. Turbo và Large có hai ô giá, vì cước Groq khác nhau. Nội bộ vẫn ghi giờ tiếng và token để đối soát. Phim dài thì tiền dịch có thể lớn hơn tiền nhận dạng, nên đơn giá phải có đệm. Đổi đơn giá không sửa phiếu cũ.

Trước khi gửi Groq, hiện thời lượng, đơn giá, số giữ chỗ và số dư còn lại. Khách bấm giữ chỗ thì mới chạy. Hết số đã giữ thì dừng ở đoạn kế. Phần đã dịch trên máy khách không xóa. Đoạn Groq lỗi không tính tiền. Xong thì trừ số thực, nhả phần giữ thừa. Khách xuất được file của đúng lần đã trả, kể cả khi không có gói ngày.

### 15.2. Chỗ trên màn hình

Tab Key Sub có hai lựa chọn: **Key của tôi** và **Trả theo lượt**. Cửa 2 thì ẩn ô key, hiện số dư, đơn giá của model đang chọn, và nút nạp tiền.

Trong Tài khoản thêm số dư, đơn giá đang áp, và sổ phiếu. Có nút xem thêm. Không thêm trang mới.

### 15.3. Phiếu

Mỗi lần chạy một phiếu. Ghi giờ, tên tệp, cửa đã chọn, phút tiếng, đơn giá lúc chạy, số giữ, số trừ, số nhả. Không ghi lời thoại, không ghi video, không ghi key.

Trạng thái chỉ dùng: Đang giữ, Đã trừ, Đã nhả, Dừng vì hết tiền, Lỗi nhận dạng, Đã hoàn vào ví.

Nút **Hỏi về lần này** tạo yêu cầu kèm mã phiếu. Phòng không giữ tệp, nên không chạy lại giúp. Khách muốn chạy tiếp thì chọn lại tệp trên máy.

### 15.4. Quyền trên sổ lượt

Hỗ trợ, khi tìm email, thấy sổ lượt của người đó. Được trả lời và ghi chú. Không khóa, không hoàn tiền, không đổi giá. Không thấy key, phụ đề, hay video. Việc hỏi về tiền chuyển thẳng cho Quản lý, không chờ hai giờ.

Câu trả lời sẵn: lần này trừ đúng số phút đã chạy, đơn giá là giá lúc bấm chạy. Phần giữ thừa đã về số dư. Đoạn lỗi không tính tiền. Tệp không còn trên phòng. Cửa trả theo lượt đang đóng thì key của khách vẫn dùng được.

Quản lý, trên một phiếu, được nhả khoản đang giữ nếu phiếu kẹt, và được hoàn vào ví một phần hoặc toàn bộ số đã trừ của đúng phiếu đó. Bắt buộc có lý do. Không hoàn quá số đã trừ. Không hoàn ra ngân hàng ở bản này. Khóa, mở hạn và mật khẩu tạm giữ như hiện tại. Quản lý không xem sổ của Chủ.

Chủ sửa hai đơn giá, đóng hoặc mở cửa 2, và viết câu khách thấy khi cửa đóng. Đặt hạn mức đồng mỗi khách mỗi ngày. Đủ hạn thì chỉ khách đó dừng. Ba số trong ngày: tổng đang giữ, tổng đã trừ, số phiếu lỗi. Không có nội dung phim. Trang Quản lý không hiện key của phòng. Key chỉ là biến môi trường của máy chủ, không bắt đầu bằng `VITE_`.

Nhân viên không chấm phụ đề đúng hay sai. Phòng không giữ lời thoại. Chất lượng nằm ở mục 14.3.

### 15.5. Điều khoản khi bật

Phải nâng `TERMS_VERSION`. Viết rõ tiếng và chữ đi qua máy chủ rồi tới Groq, chỉ giữ lúc xử lý rồi xóa. Giá là ước tính, số trừ là số thực. Khách đồng ý bản mới trước lần trả tiền đầu của cửa 2. Không hứa dịch đúng hết.

### 15.6. Chưa làm trong lát cắt này

Không nhận link video. Không có khóa API cho lập trình viên. Không hiện hóa đơn Groq. Không cộng tiền gói ngày vào lần trả theo lượt. Không hoàn ra ngân hàng.

---
