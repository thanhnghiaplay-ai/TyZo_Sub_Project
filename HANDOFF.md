# HANDOFF — TyZo_Sub_Project (phụ đề video)

Cập nhật 22/11/2026. **v5.41.0 trên `work` và `main`** (đẩy chính thức 22/11/2026). Điều khoản `2026-11-22.6`. Ứng dụng Android 0.5. Cầu nối Dịch trực tiếp trên VPS.
File này ngắn có chủ ý: chỉ ghi việc đang làm, việc còn lại và cách tiếp tục. Nhật ký cũ đã chuyển sang `docs/lich-su/` (xem mục 7).

## 1. Bắt đầu nhanh (người hoặc AI tiếp theo)
1. Đọc theo thứ tự: `BANG_DIEU.md` → `huongdan.txt` → file này → bảng đầu `PROJECT_STATUS.md`. Đối chiếu với code; tài liệu sai thì sửa tài liệu.
2. Lấy code: clone nhánh `work` của `thanhnghiaplay-ai/TyZo_Sub_Project`. Mọi việc làm trên `work`.
3. Kiểm nền: `npm ci`, `npm run typecheck`, `npm run lint` (0 lỗi; 31 cảnh báo có sẵn), `npm test`, `npm run build`.
4. Mỗi bước: sửa → typecheck → lint → test → (nếu đổi hành vi khách: nâng `APP_VERSION`, thêm `CHANGELOG` mỗi dòng ≤ 100 ký tự và không có từ nội bộ, thêm `ADMIN_LOG`) → commit → đẩy `work` → ghi một dòng ở mục 3.
5. Chỉ đẩy `main` khi Chủ nói đúng câu «đẩy chính thức» (kéo thẳng `main` = `work`, chạy typecheck, lint, test và build trước). Lần gần nhất: `main` = `work` = v5.41.0 (đẩy chính thức 22/11/2026).
6. KHÔNG ghi token hay mật khẩu vào file, commit hay remote; truyền token ở dòng lệnh rồi bỏ. Token GitHub từng dán trong chat phải được Chủ thu hồi.
7. Lưu ý môi trường Claude: không gọi được `api.groq.com`, Alibaba, Deepgram (nên không tự kiểm với nhà thật); `github.com` thì được. Trong shell, `cut -c`/`head -c` cắt hỏng chữ tiếng Việt, dùng Python.
8. `AGENTS.md` là mẫu chung của một công cụ khác, không phải quy tắc dự án. Quy tắc dự án: `AGENTS.project.md`, `BANG_DIEU.md`, `huongdan.txt`.

## 2. Việc còn lại (theo thứ tự nên làm)
Không còn mục mở. Chủ xác nhận ngày 20/11/2026 đã làm xong sáu mục từng nằm ở đây. Phiên này không có số đo, ảnh, hay yêu cầu sửa code. Trong repo không thêm clip, không đổi `ASR_GUARD`, `DEFAULT_THRESHOLDS`, `SPARSE_MIN_SECONDS`, `KEY_LIST_TRUSTED`. Đừng xếp lại thành việc còn lại. Chỉ mở lại khi Chủ nói lệch.

Sáu mục Chủ xác nhận đã xong:
1. Phim 18+: đo `ASR_GUARD` (default / noguard / guard). Không sửa `src/lib/sub/text.ts`.
2. Bộ đo với Groq thật: bench, duyệt đáp án, clip thêm. Không có báo cáo trong repo (`eval/asr/out/` không vào git).
3. Lịch chạy `asr:bench` và theo dõi dòng «sót lời». Không chỉnh ngưỡng.
4. Kiểm bằng tay trên máy thật (điện thoại, máy tính bảng, máy tính, giọng đọc, key và cơ sở dữ liệu thật). Không sửa `styles.css`.
5. Việc nhỏ: `needsLangCheck`, xưng hô, «后天». Không sửa code.
6. Việc của Chủ: Khôi phục thuật ngữ, thu hồi token GitHub đã dán trong chat, thử key Alibaba và Deepgram. `KEY_LIST_TRUSTED` trong repo giữ nguyên.
Đã xong, đừng làm lại: `HANDOFF_NANG_CAP.md` (A, B, C đều xong); thuật ngữ zh (mỗi bộ 55–104 mục); sáu mục trên.

## 3. Tiến độ phiên gần nhất (15 dòng mới nhất; dòng cũ hơn ở docs/lich-su/HANDOFF_2026-11.md)
- **Kiểm toán v5.49 → v5.49.1 (27/11/2026 01:59, Claude, nhánh `ccr-9f1afcc8-iv7067`, ĐÃ ĐẨY CHÍNH THỨC 27/11/2026 02:20 lên `main` và `work`)**: theo hồ sơ TyZo_v5.49.0_Claude_Handoff_FINAL.zip, 80 mục. Đã sửa 54 mục (14/15 P0), có test tái hiện trước/sau cho 17 mục (Postgres 16 thật cho tranh chấp). Còn 6 mục chờ Chủ quyết (R3-001 P0, R3-003, R4-003, R5-005, MAIN-038, R8-003), 6 bị chặn (Android không có SDK; R3-008 cần xem proxy), 11 hoãn. Migration 0038/0039 chỉ thêm cột. tsc, lint sạch; npm test 192+7 bỏ qua / 1353 / 1 đạt; build Vercel và VPS đạt; Playwright Admin + Reset đạt. Báo cáo: docs/kiem-toan/v5.49/BAO_CAO.md. Chủ tắt dựng nhánh phụ trên Vercel rồi nói «Đẩy chính thức». Còn: VPS `tyzo` → 2, kiểm LIVE_BRIDGE_URL là wss://.
- **Đẩy chính thức v5.46.0** (25/11/2026): Chủ gửi landing (tyzo-landing.html), nhờ nối nút, logo thật, chữ đúng điều khoản, rồi «đẩy chính thức». Trang giới thiệu: src/components/landing/ (landing-page.tsx, landing.css, remember-referral.ts), route /gioi-thieu, «/» cho khách chưa đăng nhập (routes/index.tsx). Giá lấy từ useRoomPlans; nút tải ứng dụng dùng ANDROID_APK_LATEST. Điều khoản không đổi. tsc sạch, eslint 0 lỗi, test 1496 pass, build xong, HTML phía máy chủ đã kiểm. CHƯA xem bằng trình duyệt thật (chụp điện thoại sáng/tối, hoạt hình, nút dính). Chủ cần thu hồi token GitHub đã dán trong chat.
- **Đẩy chính thức v5.45.0 + ứng dụng 0.11** (23/11/2026): Chủ nói «Ok làm ngay, sau đó đẩy chính thức». «Lọc cho giọng nói» (voice-filter.ts, VoiceFilter.kt, xem ADMIN_LOG 5.45.0). tsc sạch, test 191 + 1496 pass, build xong, Kotlin 4/4; Chromium: ô hiện ở nguồn tab, nhớ lựa chọn, tiếng 0,02 qua LiveFramer từ đỉnh 655 lên 4519. Không đổi cầu nối, không đổi điều khoản.
- **Đẩy chính thức v5.44.0 + ứng dụng 0.10** (23/11/2026): Chủ nói «Làm 2 điều này sau khi làm xong đẩy chính thức». Lịch sử Dịch trực tiếp chung web và ứng dụng (bảng live_history, migration 0036, /api/app-history, LiveHistoryPanel, mục Lịch sử trong ứng dụng). Điều khoản 2026-11-23.3 sửa câu lệnh xóa bản nhận dạng cho đúng code. tsc sạch, test 191 + 1493 pass, build xong; thử Chromium: web lưu, hiện, tải SRT; ứng dụng gửi qua /api/app-history (khóa máy thật), gửi lại không trùng, web thấy, xóa hết. Không đổi cầu nối.
- **Đẩy chính thức v5.43.0 + ứng dụng 0.9** (23/11/2026): Chủ nói «Đẩy chính thức». `main` kéo thẳng bằng `work`. Khách đồng ý lại điều khoản 2026-11-23.2. Trên VPS: `tyzo` → 2.
- **v5.43.0 + ứng dụng 0.9 (23/11/2026, Claude, `work`)**: 5 việc Dịch trực tiếp web (xem ADMIN_LOG 5.43.0). tsc sạch, test 191 + 1490 pass, build xong; thử bằng Chromium với cầu nối giả và vé giả (tạm dừng, nối lại, chữ lớn bài hát). CHƯA thử với Alibaba thật. Chưa đẩy chính thức; sau đó tyzo → 2.
- **Thử Dịch trực tiếp thật trong máy Claude (23/11/2026): KHÔNG làm được.** Key Alibaba (workspace ws-3cg8k1b2dzc84cbl, Singapore) đúng: HTTPS /compatible-mode/v1/models trả 200, 104 model. Nhưng proxy của môi trường Claude không cho nâng cấp WebSocket (tài liệu proxy ghi rõ «not supported»), mọi kết nối wss tới Alibaba ra 500 SystemError. Dịch trực tiếp chỉ thử được trên web thật/VPS. Key Alibaba và key Groq vẫn lưu ở môi trường; Chủ có thể xóa.
- **Thử luồng dịch thật sau dọn mã (23/11/2026, Claude, máy thử, key Groq của Chủ qua biểu mẫu bảo mật)**: video 10 giây tiếng Trung (giọng đọc máy), «Dùng key AI của tôi»: kiểm key (11 model), xác nhận quyền, tải và giải mã, Whisper, phân tích ngữ cảnh (tóm tắt, thuật ngữ 城市 → thành phố), dừng chờ «Dịch tiếp», dịch GPT-OSS 120B, «Hoàn tất: 4 câu» sau ~4 giây; khung video phát và hiện phụ đề đúng. Mọi lần gọi Groq trả 200, không lỗi trình duyệt. Không thử trên web thật.
- **Đẩy chính thức dọn mã đợt 1–4** (23/11/2026): Chủ nói «Đẩy chính thức». `main` kéo thẳng bằng `work`. Cầu nối không đổi (không cần tyzo → 2). Admin đang mở thì tải lại trang.
- **Dọn mã đợt 2 và 3 (23/11/2026, Claude, `work`)**: chia admin-room.ts (5 tệp), studio.tsx (7 tệp), tách hàm phụ use-pipeline.ts; hoạt hình bảo trì tải khi cần. Test đọc mã phòng dịch dùng studioSource() (đọc cả nhóm studio*.tsx). Sửa khóa trùng ở «Nhật ký nội bộ». tsc sạch, test 191 + 1478 pass, build xong; đã bấm thử Admin (mọi tab đã đụng), phòng dịch 412/1280 px, nạp video, xem trước trang bảo trì. Chưa thử: khung video lúc đang dịch, luồng dịch thật (cần key). Không nâng số phiên bản (khách không thấy đổi). Còn: chia sâu hook usePipeline khi có thể chạy thử với key thật.
- **Dọn mã đợt 1 và 4 (23/11/2026, Claude, `work`)**: gỡ mã chết, 36 thư viện, export thừa, CHANGELOG cũ, tài liệu cũ sang docs/lich-su. Không đổi gì khách thấy, không nâng số phiên bản. tsc sạch, test 191 + 1478 pass, build xong, 8 trang mở bằng Chromium không lỗi. Tiếp: đợt 2 (chia use-pipeline.ts, studio.tsx, admin-room.ts), đợt 3 (tách gói JS).
- **Đẩy chính thức v5.42.7 + ứng dụng 0.8** (23/11/2026): Chủ nói «Đẩy chính thức». `main` kéo thẳng bằng `work`. Trên VPS: `tyzo` → 2, rồi `tyzo` → 5 đặt độ nhạy 0.5 nếu muốn.
- **v5.42.7 + ứng dụng 0.8 (23/11/2026, Claude, `work`)**: đợt A (phụ đề nổi) và B (độ nhạy Qwen 3.5), xem ADMIN_LOG 5.42.7. tsc sạch, test 191 + 1477 pass, CaptionLayout 11/11 bằng Kotlin JVM. Chưa thử trên điện thoại. Chưa đẩy chính thức.
- **Đẩy chính thức v5.42.6 + ứng dụng 0.7** (23/11/2026): Chủ nói «Đẩy chính thức». `main` kéo thẳng bằng `work`. Khách đồng ý lại điều khoản 2026-11-23.1. Trên VPS: `tyzo` → 2.
- **v5.42.6 + ứng dụng 0.7 (23/11/2026, Claude)**: tối ưu theo phản hồi thử 0.6 (xem ADMIN_LOG 5.42.6). tsc sạch, test 191 + 1476 pass. Kotlin kiểm bằng GitHub Actions. Chưa thử trên điện thoại (5G, Tạm dừng, lùi về phim).
- **Đẩy chính thức v5.42.5 + ứng dụng 0.6**: Chủ nói «Đẩy chính thức». `main` kéo thẳng bằng `work`. GitHub Actions đăng bản phát hành android-v0.6 (khóa ký). Trên VPS: `tyzo` → 2. Chưa thử 0.6 trên điện thoại.
- **v5.42.5 + ứng dụng 0.6 (22/11/2026 23:20, Claude)**: tự nối lại khi mất mạng, khung nổi chỉ hiện phần cuối, cầu nối chờ êm khi Alibaba cắt vì im, nhật ký mã khi khách rời. tsc sạch, test 191 + 1474 pass. Kotlin kiểm bằng GitHub Actions (máy Claude không có Android SDK). Chưa thử trên điện thoại. Chưa đẩy chính thức; sau đó tyzo → 2, ứng dụng báo «Có bản mới».
- **Đẩy chính thức v5.42.4**: Chủ nói «Đẩy chính thức». `main` kéo thẳng bằng `work`. tsc sạch, test 191 + 1473 pass. Khách đồng ý lại điều khoản 2026-11-22.9. Trên VPS: `tyzo` → 2.
- **v5.42.4 (22/11/2026 22:45, Claude, `work`)**: Chủ báo chậm, nhận dạng không đủ, mất kết nối, bảo quay về. Mã Dịch trực tiếp, cầu nối, tyzo.sh về đúng 32253ee; giữ sửa menu và chống sập cầu nối. Điều khoản 2026-11-22.9 (= .6). tsc sạch, test 191 + 1473 pass, build xong, cầu nối chạy thử khi cơ sở dữ liệu lỗi vẫn trả ok. Chưa đẩy chính thức; sau đó tyzo → 2.
- **Đẩy chính thức v5.42.3**: Chủ nói «Đẩy chính thức». `main` kéo thẳng bằng `work`. tsc sạch, test 191 + 1482 pass. Trên VPS: `tyzo` → 2.
- **v5.42.3 (22/11/2026 22:33, Claude, `work`)**: Alibaba cắt vì im lặng («Response stream timeout») không còn hiện cho khách và không tính vào lần nối lại hỏng; cầu nối ngủ tới khi có tiếng. Chưa đẩy chính thức.
- **Đẩy chính thức v5.42.2**: Chủ nói «Đẩy chính thức». `main` kéo thẳng bằng `work`. tsc sạch, test 191 + 1481 pass. Trên VPS: `tyzo` → 2, rồi thử lại ứng dụng.
- **v5.42.2 (22/11/2026 22:21, Claude, `work`)**: cầu nối sập khi đọc giá gặp ECONNRESET (Chủ gửi nhật ký); refreshTurbo bắt lỗi, lưới unhandledRejection, thử lại lỗi kết nối, giữ kết nối 50 giây. tsc sạch, test 191 + 1481 pass, chạy thử cầu nối với cơ sở dữ liệu không tới được: vẫn chạy, /health ok. Chưa đẩy chính thức; sau đó tyzo → 2.
- **Đẩy chính thức v5.42.1**: Chủ nói «Đẩy chính thức». `main` kéo thẳng bằng `work`. tsc sạch, test 191 + 1479 pass, build xong. Khách đồng ý lại điều khoản 2026-11-22.8. Migration 0035 chạy khi Vercel build. Trên VPS: `tyzo` → 2.
- **v5.42.1 (22/11/2026 22:06, Claude, `work`)**: menu điện thoại đóng đúng khi bấm ra ngoài (nền mờ 45 > khung Ví 41); cách tra phiên ứng dụng không ra chữ (via=app, events, dòng nhật ký «phiên xong», migration 0035, cột Admin). Điều khoản 2026-11-22.8. tsc sạch, test 191 + 1479 pass, build xong, thử menu bằng Chromium 412 px. Chưa làm: tìm ra lỗi ứng dụng không dịch (cần dữ kiện từ máy), đồng bộ lịch sử (chờ Chủ chốt). Chưa đẩy chính thức.
- **Đẩy chính thức v5.42.0**: Chủ nói «hợp vào work rồi đẩy chính thức». `work` và `main` kéo thẳng bằng nhánh `ccr-c3c6821f-hbpt1y`. tsc sạch, test 191 + 1478 pass, build xong. Khách đồng ý lại điều khoản 2026-11-22.7. Migration 0034 chạy khi Vercel build. Trên VPS: `tyzo` → 2.

## 4. Dữ kiện đo nhận dạng cần nhớ (clip «Tiểu hòa thượng», 34 giây, thoại có nhạc nền, Groq large-v3)
- Thủ phạm bỏ lời là câu `ASR_GUARD` tiếng Anh («Ignore breathing… Only transcribe clear words…»), không phải tên phim/thuật ngữ, không phải nén Opus, không phải độ dài. Bỏ nó (`?asrtest=noguard`) ra 11 câu giống hệt không prompt.
- Cắt đoạn 15 giây (`?asrtest=chunk15`) XẤU HƠN: ảo giác «请不吝点赞…», lặp ở chỗ nối. Giữ `CHUNK_SECONDS = 60`.
- `prompt` chỉ đi qua đường Groq Whisper (`transcribe`/`transcribeOnce` trong `groq.ts`, 4 chỗ gọi `asrPrompt` ở `use-pipeline.ts`). Deepgram, AssemblyAI, Speechmatics, Soniox, Alibaba không dùng prompt/từ khóa tăng cường (soát bằng grep, chưa đọc từng lời gọi API).
- Công tắc thử `?asrtest=noprompt | chunkN | noguard | off` (`src/lib/sub/asr-test.ts`), mặc định TẮT, lưu trong trình duyệt.
- Ngưỡng chữ/giây là mức chung nên có thể chấm oan clip thưa lời. Chấm trên câu thô của Whisper, chưa qua bộ lọc `appFiltered` của app.

## 5. Đã lên `work`, Chủ đã bấm thử (v5.18.1)
Đọc file có phần trăm; ô «Tự động»; khung sau khi dịch; thuyết minh bỏ khoảng im; Admin chỉnh Token dịch; dock không đè Bản dịch; Ví không đè nút gói; thanh Admin không đè tiêu đề; thẻ khách gập đủ sáu mục. Test đã xanh trước khi đẩy. Chủ xác nhận đã bấm thử trên máy thật. Bản chính thức khách đang dùng là v5.18.1 trên `main`.

## 6. Bản đồ file tài liệu
| File | Dùng để |
|---|---|
| `BANG_DIEU.md` | Thứ tự ưu tiên, bảng «Đang chạy», ba vai, ý Chủ đã nêu. Đọc đầu tiên |
| `huongdan.txt` | Quy tắc làm việc, quy ước kỹ thuật (không hộp thoại mặc định, nút quay lại, điều khoản…) |
| `HANDOFF.md` (file này) | Việc đang làm và việc còn lại |
| `PROJECT_STATUS.md` | Hồ sơ: bảng chức năng, cấu trúc code, quy tắc bắt buộc, kế hoạch kinh doanh (13), mục chưa được code (14, 15) |
| `PROVIDERS.md` | Cách thêm một nhà nhận dạng |
| `HANDOFF_NANG_CAP.md` | Kế hoạch trau chuốt bản dịch + thuật ngữ. ĐÃ XONG, chỉ tra cứu (code còn trỏ tới tên file này) |
| `eval/asr/README.md` | Cách dùng bộ đo nhận dạng |
| `docs/lich-su/` | Nhật ký và báo cáo cũ (mục 7) |

## 7. Lưu trữ (`docs/lich-su/`, nguyên văn, không phải lệnh)
- `HANDOFF_2026-11.md`: toàn bộ HANDOFF cũ (từ phiên 1 đến v5.17.6). Mỗi mục `## BÀN GIAO (ngày, nhánh) — tiêu đề`, mới nhất trên cùng. Tìm bằng `grep -n`.
- `PROJECT_STATUS_nhat-ky.md`: lịch sử thay đổi (mục 6 cũ), glossary thể loại cũ (9), hàng đợi báo cáo v4 (10), kế hoạch Bước 5 (11), đề xuất ASR/giọng (12), ghi chú sửa nhận dạng 11/11.
- `BAO_CAO_KIEM_TRA_v3.10.9.md`: báo cáo kiểm tra 11/11/2026.
- `DONG_TRANG_THAI_DA_THAY.md`: các dòng trạng thái cũ đã được thay trong `BANG_DIEU.md`, `huongdan.txt`, `PROJECT_STATUS.md`.
