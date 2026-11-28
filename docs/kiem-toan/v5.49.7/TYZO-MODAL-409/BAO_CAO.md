# Kiểm toán lượt dịch TyZo Modal trên Android

Ngày 28/11/2026. Sự cố trên v5.49.7. Ứng viên sửa v5.49.8 tại workspace. Video được báo cáo là MP4 135 MB, 178 giây, Nhật → Việt, Trả theo lượt, nhận dạng TyZo Modal và dịch Groq. Thiết bị dừng ở 5%, 0/6 đoạn, với thông báo “Có công việc đang gửi hoặc cần đối soát”. Kết quả dưới đây ghi nhận lúc kiểm toán cục bộ. Việc nghiệm thu trên VPS web và Modal cần theo dõi theo commit đã triển khai.

## Nguyên nhân và bằng chứng

- **Điểm phát sinh trạng thái 409 đã xác định.** `acquireWorkInfo` trong `src/lib/billing/work-admission.ts` ném `AdmissionUncertain` khi `tyzo_admit` trả `uncertain`. Migration 0057 tra trạng thái chưa rõ kết quả theo **cùng tài khoản, luồng và nhà cung cấp**. Với ASR TyZo, khóa tra là `(user, modal, tyzo-modal)`. Một suất cũ có thể chặn cả phiếu mới trước khi giữ cho đoạn và trước khi gửi sang Modal. Cửa dịch Groq cũng có nhánh 409 riêng trên luồng `batch`. Khi UI dừng tại 0/6, cần phiếu và log cùng thời điểm để quy lỗi cho đúng cửa. 409 là thuộc tính của lỗi nghiệp vụ; chưa có bản ghi mã HTTP thực trên đường truyền server function của lượt sự cố.
- **Nguyên nhân tạo suất chưa rõ trên production còn thiếu bằng chứng.** Có hai đường trong mã là heartbeat quá 150 giây hoặc tiến trình kết thúc với kết quả nhà cung cấp chưa xác minh được. 401 của G7 khi gọi thiếu khóa là một từ chối riêng; 401 ở POST ban đầu của web được phân loại là từ chối dứt khoát. Không có lượt LLM không chứng minh ASR chưa chạy, vì luồng nhận dạng có thể kết thúc trước bước gọi máy chữ. Phiếu đã xem trước đó cho video 4.451 giây và ba phiếu Qwen không đủ để kết luận cho video 178 giây.
- **Lỗi nhận suất đã tái hiện local.** Frontend v5.49.7 cho tối đa 9 đoạn Modal chạy song song. Trần mặc định mỗi người ở backend là 3. Hết suất trả 429 trước khi gửi upstream, nhưng frontend coi là lỗi cả lượt và hủy các lời gọi còn lại. Đây là một đường hỏng độc lập với 409 cần đối soát.
- **Lỗi retry sau 303 đã tái hiện bằng HTTP giả.** Sau khi POST được Modal trả 303, các 401/404/429 ở GET lấy kết quả chỉ mô tả GET. Mã cũ phân loại chúng như từ chối POST. Đặc biệt 429 làm `modalPartWork` có thể gửi POST lần thứ hai. Bản sửa giữ trạng thái chưa rõ và không phát lại POST.
- **Hai đường giữ trạng thái cũ đã xác định từ CSDL.** Nếu yêu cầu đóng phiếu đến sau khi ghi đoạn nhưng trước khi giữ ngân sách đoạn, cửa giữ từ chối và xóa đoạn. Mã cũ không kiểm lại yêu cầu đóng lúc xóa, nên phần giữ có thể chờ tới lần dọn phiếu quá hạn. Bản sửa đóng theo yêu cầu ngay khi không còn đoạn hoạt động. Khi một suất đã quyết toán nhưng bản kết quả tạm đã bị dọn, quét đối soát nay dùng bản quyết toán bền có `xong` và thời điểm xác nhận. Phiếu chưa rõ vẫn giữ khóa.
- **Lỗi giao diện và trạng thái.** Dòng Studio dùng `line-clamp-2` cho cả lỗi. Phần trăm dịch cũng có thể tiến quá xa nếu toàn bộ số câu *đã thấy* được dịch trong khi mới nhận dạng một phần. Hai lần bấm nhanh cùng tab còn có thể đi qua các bước bất đồng bộ trước khi `running` được bật.

## Vòng đời một lượt

1. `use-pipeline.ts` mở phiếu Trả theo lượt, đọc MP4, lập các khoảng âm thanh và tạo các worker. Media được giải mã trên máy khách. `recognize.ts` cắt, lọc tiếng, chuẩn bị đoạn, rồi `providers/tyzo.ts` gửi WAV mono 16 kHz cùng tài khoản và phiếu.
2. `tyzo-modal-call.ts` xác thực tài khoản, kiểm tra WAV và giá, lấy SHA-256 của WAV. `tyzo-modal-charge.ts` lấy suất Modal, giữ riêng ngân sách đoạn và ghi một attempt có fencing token. Khóa `(ticket_id, part_hash)` chống gửi và trừ lại trong cùng phiếu. Một đoạn đã có kết quả được trả từ CSDL.
3. `tyzo-modal.server.ts` gửi POST đến `Asr.run` với thông tin xác thực proxy phía máy chủ và mã ứng dụng trong payload. Nếu trả 303, server lấy kết quả qua GET và gửi lại header xác thực. Thời hạn HTTP chung là 30 phút. Modal kiểm mã ứng dụng và ngôn ngữ trước khi xử lý audio, và luồng «kỹ» có thể gọi máy chữ. Bài thử không khóa trước đây cho thấy hai endpoint trả 401 và không ghi lượt gọi tương ứng. Lượt có khóa của video báo lỗi chưa được truy vết tới Modal.
4. Sau khi nhận kết quả, hệ thống ghi chi phí nhà cung cấp và trong một giao dịch lưu phụ đề đoạn, cập nhật quyết toán và trừ số thực trong giới hạn đã giữ. Phiếu chờ đóng khi còn đoạn sống. Sau khi xong hoặc khi lỗi dứt khoát, phần giữ còn lại được trả về gói còn hạn. Lỗi không rõ giữ nguyên cơ chế đối soát suất. Số dư báo cáo 228.530 → 236.764 chênh 8.234, phù hợp với việc nhả phần giữ, cần ledger để kết luận cho đúng phiếu.
5. Các đoạn về lệch thứ tự nằm trong đệm, được ghép theo chỉ số. Trình dịch lấy các câu chưa dịch, mở phiếu riêng khi cấu hình yêu cầu, rồi gửi qua Groq. Bản sửa dừng giao thêm đoạn Modal khi lỗi, chờ các đoạn đã gửi để giữ lại phần đã nhận và cho tiếp tục.
6. PWA trong kho có manifest và mã chèn metadata, không thấy đăng ký Service Worker trong mã chạy của web. Tệp đóng gói có tên theo nội dung và cache dài. Sự kiện Vite preload được dùng cho thông báo bản mới; chỉ thông báo đó không xác nhận một lần reload. Guard nay bảo vệ cả lượt đang tạm dừng có thể tiếp tục và để lỗi import tới nơi xử lý. Studio lưu chữ, các khoảng thời gian và kết quả đang đệm vào IndexedDB cho đúng tài khoản, tệp, ngôn ngữ nguồn và model Modal; không lưu audio. Sau khi tải lại cần chọn lại tệp gốc. Các bản lưu cũ vẫn được đọc.

## Thay đổi và kiểm thử

| Nhóm | Tệp | Kiểm tra |
| --- | --- | --- |
| Nhận suất, idempotency và giữ tiền | `billing/tyzo-modal-charge.ts`, `billing/work-admission.ts`, `tyzo-modal-call.ts`, `providers/tyzo.ts`, `sub/tyzo-modal.ts`, `sub/poll-loop.ts` dưới `src/lib` | PostgreSQL 18.7, PGlite và GPU giả. Sáu đoạn qua 429; trần fixture hai suất; mỗi đoạn gọi đúng một lần. Giữ 100, trừ 42, nhả 58, số dư cuối 958 từ 1.000. Không còn suất chạy. 409 không retry, đoạn hoàn tất trong cùng phiếu đọc được mà không trừ. Chờ tối đa 30 lần, cách nhau ít nhất 2 giây. Hủy chờ và hết giới hạn dừng gửi. Kiểm bù phần giữ khi đóng phiếu trước lúc giữ đoạn và giải phóng suất dựa trên quyết toán bền. |
| Phân loại HTTP | `src/lib/sub/tyzo-modal.server.ts` | HTTP giả. 401 POST là từ chối; 429 POST là trường hợp có thể thử lại; 401/404/429 sau 303 giữ trạng thái chưa rõ, chỉ có một POST. Có ca header ở POST và các GET. |
| Tiếp tục, khôi phục và tiến độ | `src/components/use-pipeline.ts`, `src/lib/pipeline/job.ts`, `src/lib/pipeline/recognize.ts`, `src/lib/saved-runs.ts`, `src/lib/sub/stage-progress.ts` | Worker giả với 409, giữ đoạn đang gửi và tiếp tục tới 6/6 không gửi lại đoạn đã về. Clone bản lưu và khôi phục cả đoạn trong đệm với đúng model. Chromium đã ghi và nạp lại checkpoint 2/6 qua tải lại, giữ chữ về lệch thứ tự và kiểm đúng phạm vi tài khoản. Hai lần bấm chỉ mở một lượt. Ca 0/6 ở 5% và 6/6 với dịch hoàn tất ở 100%. |
| Hiển thị và cập nhật | `src/components/studio.tsx`, `src/components/stale-build-guard.tsx` | Kiểm tra markup lỗi và bảo vệ tự reload. Chromium đo đoạn cảnh báo với CSS đã build ở 320, 390 và 430 px, toàn bộ câu hiện trong khung và có xuống dòng. |
| Phiên bản | `src/lib/app-version.ts`, `src/lib/admin/admin-log.server.ts`, `docs/lich-su/CHANGELOG-cu.md` | Bộ kiểm tra cấu trúc và giới hạn changelog. |

`PASS_LOCAL` áp dụng cho các ca hành vi đã chạy với fixture. Các fixture dịch một phần kiểm từng câu được gửi đúng một lần và phụ đề được điền bằng Groq giả. Chưa có E2E ghép rút audio từ đúng video Android, Modal/Groq thật, ví production và nhánh cập nhật phiên bản. Trạng thái E2E **chưa đạt PASS_PRODUCTION**. G7 401 không khóa của lần triển khai trước là kiểm tra riêng.

- Build local thành công, không có DATABASE_URL production. Typecheck đạt và lint toàn kho có 0 lỗi, 24 cảnh báo.
- 77/77 ca nhóm Modal, cửa nhận việc, HTTP và cổng dịch liên quan đạt trên PostgreSQL 18.7 với dịch vụ ngoài giả. 65/65 ca nhóm job, tiến độ, bản cập nhật, lưu tiến độ và bố cục chạy đạt. Chromium đạt ở ba chiều rộng với fixture hiển thị và ca IndexedDB qua reload.
- Lần chạy `npm test` ban đầu với PGlite mặc định ghi nhận 1.718 đạt, 87 bỏ qua, 2 lỗi ở bộ RE6-001 `gate-reserve.test.ts` trong hai giai đoạn đã chạy; giai đoạn sau chưa chạy vì chuỗi npm dừng ở lỗi. Hai fixture nạp nhiều câu SQL trong một prepared statement, PGlite trả 42601. Hai lỗi tái hiện trên bản gốc 75510a3. Khi chạy riêng bộ giữ Token, đối soát dịch và hồi quy async trên PostgreSQL 18.7, 55/55 ca đạt, gồm cả hai ca này. Ứng viên phát hành cập nhật bộ thử PGlite để chạy SQL fixture nhiều câu bằng chế độ SQL không tham số.

- Cổng phát hành của ứng viên trên nền `main` có G7 đạt build, typecheck và lint. `npm test` đầy đủ đạt 1.791 ca, bỏ qua 138 ca theo điều kiện môi trường, 0 lỗi.

## Bằng chứng cần thu ở production

Trên VPS web, dùng quyền chỉ đọc. Xác định phiếu của video 178 giây bằng giờ chạy hoặc ID chính xác; không dùng bốn phiếu mới nhất nếu đã có lượt khác. Ví dụ dưới đây dành cho psql, thay giá trị của `ticket` bằng ID đã xác nhận.

```sql
\set ticket 'THAY_BANG_ID_PHIEU_178_GIAY'
BEGIN READ ONLY;
SELECT id, scope, seconds, asr_model, chat_model, status, created_at, closed_at,
       held + charged + released AS giu_ban_dau, held, charged, released,
       modal_reserved, modal_seconds
FROM run_tickets WHERE id = :'ticket';

SELECT w.id, w.lane, w.provider, w.model, w.status, w.created_at,
       w.heartbeat_at, w.finished_at, w.ref,
       s.status AS settlement_status, s.observed_at, s.charged_tokens
FROM work_admissions w
JOIN run_tickets t ON t.user_id = w.user_id
LEFT JOIN run_modal_settlements s
  ON w.ref = 'modal:' || s.ticket_id || ':' || s.part_hash || ':' || s.attempt
WHERE t.id = :'ticket'
  AND (w.lane = 'modal' OR (w.lane = 'batch' AND w.provider = 'groq'))
  AND (w.status = 'unknown' OR w.created_at BETWEEN
       t.created_at - interval '10 minutes' AND coalesce(t.closed_at, now()) + interval '1 minute')
ORDER BY w.created_at DESC LIMIT 30;

SELECT p.status, count(*) AS doan, sum(p.tokens) AS token
FROM run_modal_parts p WHERE p.ticket_id = :'ticket' GROUP BY p.status;
SELECT provider, model, status, count(*) AS lenh
FROM run_gate_calls WHERE ticket_id = :'ticket' GROUP BY provider, model, status;
ROLLBACK;
```

Đối chiếu giờ UTC với log web (mã máy chủ và nhánh 409) và Function Calls của `Asr.*`, `Llm.*`. Dùng mã `ref` và trạng thái quyết toán để xác định suất cũ bị chặn. Với suất chưa xác minh được kết quả, cần bằng chứng từ nhà cung cấp trước khi mở khóa. Không xóa hàng đối soát.

## Rủi ro còn lại

- Lượt gửi có thể hoàn tất trên máy chủ sau khi trình duyệt mất mạng trước lúc nhận phản hồi. Bản lưu phía trình duyệt chỉ giữ kết quả đã nhận. Sau khi phiếu cũ bị đóng, bản này chưa tự nối lại phản hồi GPU bị mất vào phiếu mới. Khóa cùng phiếu được kiểm thử; chưa có chứng nhận chống gọi lại xuyên phiếu trong trường hợp ấy.
- Chưa đối chiếu khoản giữ với 6 WAV thật. Tổng thời lượng audio gửi có thể khác thời lượng video do biên chồng và lọc im lặng. Giữ nguyên trần ngân sách và thời lượng trong lần sửa này.
- Cần kiểm trên Android thật, dùng đúng MP4 và gói báo lỗi, sau đó đối chiếu 6/6, câu dịch, số dư trước/sau, Function Calls và số lượt trong ledger. Để kiểm khôi phục, ngắt mạng hoặc tải lại sau khi đã có ít nhất một đoạn về, chọn lại cùng tệp và tiếp tục.

## Kiểm lại trên production sau v5.49.8

- Truy vấn VPS quanh 15:20 ngày 28/11 (GMT+7) cho thấy ba phiếu 179 giây cùng bị chặn bởi một suất Modal cũ có nhịp cuối 14:12:06, trạng thái `unknown`, quyết toán `mat-phan-hoi` và không có `observed_at`. Mỗi phiếu mới trừ 0 và nhả 8.234 Token. Modal lúc 15:23 hiển thị không còn lượt ASR chạy. Sau xử lý suất cũ, ảnh 15:26 ghi nhận 4/6 đoạn, 45 câu tiếng Nhật, dừng do thời gian câu trả về.
- Tái hiện lỗi thời gian ở local với phản hồi tương ứng đầu ra của bộ căn lời. Modal trừ 150 ms khỏi mốc chữ đầu, có thể tạo thời điểm bắt đầu âm ở đầu đoạn. Web v5.49.8 từ chối cả đoạn nếu gặp trường hợp đó. Bản v5.49.9 cục bộ chuẩn hóa phần đệm này về 0 trước khi cộng mốc video và giữ kiểm tra các trường hợp thời gian sai khác. Ca hồi quy lỗi trước sửa, đạt sau sửa với HTTP giả. Payload thật của hai đoạn còn thiếu và lượt dịch 6/6 trên production vẫn chưa được xác minh.

## Kiểm lại trên production sau v5.49.9

- Ảnh 15:38 và 15:39 ngày 28/11 (GMT+7) xác nhận nhận dạng 6/6 đoạn và nâng phần dịch từ 16/51 lên 32/51 câu. Hai điểm dừng khác nhau: từ chối phiếu dịch, rồi công việc cần đối soát. Câu báo lỗi phiếu ở v5.49.9 dùng chung cho phiếu không còn hoạt động và phiếu không đủ mức giữ dự toán cho lệnh tiếp theo. Chưa có bản ghi CSDL của lần dịch này để phân biệt.
- V5.49.10 cục bộ xử lý trường hợp một luồng dịch trả theo lượt lỗi trong lúc luồng anh em đã gọi nhà cung cấp. Trước đó Promise.all báo lỗi ngay, pipeline hủy tín hiệu chung; điều này có thể làm mất phản hồi của lô đã gửi và phát sinh đối soát. Khi một lô lỗi, bản sửa ngừng giao lô mới và đợi kết quả các lô đã gửi trước khi đóng phiếu. Với 402/409 hoặc phản hồi có thể đã tính phí, bước tự động dừng đổi model. Ca hồi quy mô phỏng giữ lại kết quả lô đang gửi và kiểm cửa HTTP không gửi lại. Số Token giữ và cách quyết toán giữ nguyên. Bản này chưa lên production.
- VPS đã xác nhận suất Groq `ecba58ee2d6bd6da9860ada8` ở trạng thái `unknown`, trỏ đến lệnh `9c238abbd8258cd9ae90184d` (`mat-phan-hoi`, chưa có `observed_at`, nghĩa vụ đối soát `pending`). Bốn phiếu thử lại đã nhả 394 Token mỗi phiếu và không trừ Token. Log quanh 15:39 ghi `AbortError` của H3 khi kết nối phản hồi web đóng. Mã v5.49.9 truyền cùng tín hiệu hủy của yêu cầu web sang Groq. Log này xác nhận web bị ngắt trước khi xác minh được kết quả. Chưa có bằng chứng rằng Groq đã dừng, hoàn thành hay ghi nhận chi phí cho đúng lệnh.
- Chủ báo mục Admin chỉ hiện Groq và Alibaba. Ô key trong Admin dành cho nhà lưu khóa trong ứng dụng; TyZo dùng cấu hình máy chủ. Bộ lọc gói tự động cũ dựa trên đuôi key lưu trong CSDL nên loại TyZo ngay cả khi máy chủ đã cấu hình. v5.49.10 hiển thị thẻ Nhận dạng TyZo ở Nhà cung cấp, dùng chỉ báo cấu hình không chứa bí mật và tạo gói TyZo ở cửa Trả theo lượt. Thuê phòng vẫn dùng key riêng của khách theo quy tắc gói hiện hành.
