# Báo cáo kiểm toán và sửa lỗi TyZo v5.49 → v5.49.1

- **Hồ sơ đầu vào:** `TyZo_v5.49.0_Claude_Handoff_FINAL.zip`. Gốc `48b6a19b882fc2b7e908fce8cd0c61ad358db838`, khớp HEAD lúc bắt đầu (chỉ thêm 2 commit tài liệu).
- **Nhánh:** `ccr-9f1afcc8-iv7067`. Commit mã cuối là `29e6c06`, Graphify ở `324eec3`. Chưa gộp `main`, chưa deploy, chưa đụng CSDL thật.
- **Người làm:** Claude, vai Thẩm định. Chủ yêu cầu sửa trực tiếp nên được sửa mã.
- **Bảng kết quả từng mục:** `KET_QUA.json` (đủ 80 mục). Bằng chứng nằm ở `bang-chung/`, kết quả công cụ ở `TOOLS.md`.

## 1. Tóm tắt

| Trạng thái | Số mục | Nghĩa |
|---|---|---|
| FIXED_VERIFIED | 17 | Có test tái hiện lỗi TRƯỚC khi sửa (hỏng) và SAU khi sửa (đạt) |
| FIXED_TESTED | 14 | Đã sửa, có test hoặc chạy thử sau sửa. Kết quả trước sửa lấy từ đọc mã |
| FIXED_CODE | 23 | Đã sửa, tsc/lint/npm test đạt, chưa có test riêng cho đúng tình huống |
| VERIFIED_ALREADY_FIXED | 1 | MAIN-040 đã có sẵn trong mã |
| NEEDS_OWNER | 6 | Đụng giá, hoa hồng, quy tắc Token hoặc có thể chặn khách: chờ Chủ quyết |
| BLOCKED | 6 | Android (không có SDK) và R3-008 (cần xem proxy thật) |
| DEFERRED / NEEDS_DESIGN / NEEDS_BROWSER_VERIFY | 11 | P1/P2 cần thiết kế hoặc thử ngoài môi trường này |
| BY_DESIGN | 2 | R7-002, R7-005: hành vi chủ đích, có trần |

**P0 (15 mục):** 14 mục đã sửa và có test, trong đó 10 mục có test tái hiện trước/sau. Còn **R3-001** chờ Chủ quyết (xem mục 4).

## 2. Các lỗi P0 đã sửa

Với mỗi lỗi ghi: dẫn chứng, nguyên nhân, lý do sửa, cách sửa, trước/sau, test, cách quay về. Cách quay về chung: revert commit của nhóm đó. Migration 0038/0039 chỉ thêm cột/chỉ mục có giá trị mặc định nên KHÔNG cần gỡ khi quay về; mã cũ đã chạy đạt 101/101 test trên schema mới (`bang-chung/rollback-compat.log`).

### 2.1 MAIN-023: đoạn TyZo gọi GPU vượt phần đã giữ (commit `3622bcc`)
- **Dẫn chứng:** `src/lib/billing/tyzo-modal-charge.ts:45` (bản gốc). Điều kiện chỉ là `held >= need`, không trừ phần của các đoạn đang chạy.
- **Nguyên nhân:** chạy 9 đoạn song song thì mỗi đoạn đều thấy `held` còn nguyên.
- **Hậu quả:** GPU chạy nhiều hơn số Token đã giữ. Phần vượt ghi `modal_short`, phòng chịu lỗ.
- **Sửa:** thêm cột `run_tickets.modal_reserved` và `run_modal_parts.reserved`. Một câu lệnh vừa giữ riêng ước tính của đoạn vừa kiểm `held − modal_reserved ≥ ước tính`. Ước tính không làm tròn từng đoạn, để tổng các đoạn không vượt phần giữ cả phim chỉ vì làm tròn. Đoạn lỗi thì nhả phần giữ trong một câu lệnh.
- **Trước:** 9/9 đoạn được gọi GPU khi phần giữ chỉ đủ 3 đoạn (`bang-chung/modal-before.log`, Postgres 16 thật).
- **Sau:** tối đa 3 đoạn; `modal_reserved` về 0; `held ≥ 0` (`modal-after-pg.log`, `billing-after-pglite.log`: 59/59).
- **Không đổi:** cách tính giá, giữ và trừ Token (vẫn trừ theo số GPU thật).

### 2.2 MAIN-024: trừ Token mà không lưu được chữ (`3622bcc`)
- **Dẫn chứng:** `tyzo-modal-charge.ts:61-66`. Trừ tiền, ghi phần thiếu và lưu chữ là 3 lệnh SQL rời nhau.
- **Sửa:** thêm `Sql.begin` cho cả Postgres và PGLite (`src/lib/db.ts`) và hàm `inTransaction` (`src/lib/db-tx.ts`). Bốn việc chạy trong một giao dịch; lỗi thì bỏ đoạn để gửi lại.
- **Trước:** dùng trigger giả lập lỗi khi lưu chữ: `held 88, charged 12`, khách mất 12 Token mà không có chữ.
- **Sau:** `held 100, charged 0`, đoạn bị bỏ để gửi lại.

### 2.3 MAIN-036: đóng phiếu khi đoạn TyZo đang chạy (`3622bcc`)
- **Dẫn chứng:** `token-flow.ts:151`. `closeTokenWith` trả hết phần giữ mà không xem đoạn nào đang chạy.
- **Sửa:** còn đoạn Modal đang chạy (dưới 15 phút) thì ghi `close_wanted` và trả `null`; đoạn cuối quyết toán xong thì đóng phiếu. Đoạn mới không được nhận khi phiếu đang chờ đóng. Admin nhả tay và phiếu treo 6 giờ dùng `force`, đóng như cũ. Máy khách không đọc kết quả đóng (`closeRoomTicket`), nên giao diện không đổi.
- **Trước:** `tokens 0, short 12`: GPU chạy mà không thu được tiền.
- **Sau:** `tokens 12, short 0`; phiếu đóng sau đoạn cuối, phần dư về gói (`giayBalance = 988`).
- **Khớp điều khoản:** «khách bấm hủy hay mất mạng thì đoạn đã gửi vẫn chạy xong, được tính và lưu lại».

### 2.4 SPLIT-008: bốn luồng dịch cùng một lô (`2ce19fd`)
- **Dẫn chứng:** `src/lib/pipeline/translate.ts:125-130`. Lô được lấy, rồi mới `await ensureChatTicket()`, rồi mới đánh dấu `busy`.
- **Sửa:** đánh dấu `busy` ngay sau khi lấy lô, trước mọi `await`. Khối `finally` gỡ `busy` như cũ.
- **Trước:** 6 câu bị gửi đi dịch 4 lần, tức trả tiền 4 lần (`split008-before.log`).
- **Sau:** mỗi câu gửi 1 lần (`split008-after.log`). Test `translate-claim.test.ts` dùng mock module, đã có trong `npm test`.

### 2.5 R8-001, REF-013, AZ-001: khôi phục Postgres trên VPS làm mất dữ liệu (`17f3351`)
- **Dẫn chứng:** `deploy/vps/tyzo.sh:678, 691, 884` và `khoi_phuc`. Có 3 lỗi:
  - Lệnh `drop schema` chạy TRƯỚC khi đọc Neon.
  - `pg_restore … || true` che mất mã lỗi.
  - Chỉ kiểm «trên 5 bảng».
- **Sửa:** thêm hàm `nap_dump`:
  1. Kiểm mục lục tệp.
  2. Nạp vào CSDL tạm `tyzo_moi`.
  3. Đếm đủ bảng theo mục lục; `pg_restore` báo lỗi thì hỏi `dong-y`.
  4. Đạt mới đổi tên. CSDL cũ giữ nguyên dưới tên `tyzo_cu_<giờ>`.

  Ngoài ra `chep_tu_neon` đọc Neon xong mới đụng VPS, và `chep_len_neon` kiểm đủ bảng.
- **Trước** (diễn tập trên Postgres 16): tệp hỏng làm 7 bảng còn 0 bảng.
- **Sau:**
  - Tệp hỏng, tệp trống, tệp cụt giữa dữ liệu: dữ liệu giữ nguyên.
  - Tệp tốt: nạp đủ 8 bảng, bản cũ còn và quay về được.
  - Bằng chứng: `restore-drill.log`, kịch bản `restore-drill-harness.sh`.
- **Lưu ý:** ổ đĩa VPS cần chỗ cho 2 bản CSDL trong lúc nạp. Script in sẵn lệnh xóa bản cũ khi Chủ chắc chắn.

### 2.6 R5-001, R5-002, R5-003, R5-004: lệnh rút hoa hồng (`ee37429`)
- **Dẫn chứng:** `src/lib/affiliate-room.ts:299` (đọc tổng, kiểm, cập nhật, thêm lệnh là các lệnh rời nhau) và `:130` (`markPayout` không kiểm `returning`, cập nhật khoản theo CTV thay vì theo lệnh).
- **Sửa:**
  - Thêm `src/lib/affiliate-payout.ts`. Tạo lệnh trong một giao dịch, khóa dòng CTV.
  - Mỗi khoản hoa hồng gắn đúng lệnh qua `commission_events.payout_id`. Khoản cũ chưa gắn vẫn xử lý theo CTV.
  - Xác nhận hoặc hủy chỉ đụng khoản của đúng lệnh, và chỉ khi lệnh còn `cho-chi`.
  - Không đọc được cờ rủi ro thì không cho rút.
  - Migration 0039 thêm chỉ mục «một lệnh mở mỗi CTV». Nếu dữ liệu cũ đã trùng thì bỏ qua chỉ mục, không làm hỏng lần dựng.
- **Trước:** cách cũ, 20 lượt × 5 lần bấm cùng lúc: tổng lệnh rút **300.000 đ trên số dư 60.000 đ**.
- **Sau:** đúng 1 lệnh 60.000 đ (`payout-pg.log` trên Postgres thật, `payout-pglite.log`).
- **Không đổi:** tỷ lệ hoa hồng, mức rút tối thiểu, thứ tự kiểm và câu báo.

### 2.7 MAIN-042: chuyển quyền Chủ không nguyên tử (`ee37429`)
- **Dẫn chứng:** `admin-allow.server.ts:97`. Cấp Chủ mới và hạ Chủ cũ là 2 lệnh rời nhau.
- **Sửa:** gộp thành một câu lệnh. Chỉ chạy khi người chuyển còn là Chủ lúc chạy lệnh.
- **Test:** `admin-allow.test.ts` đạt 10/10; thêm ca người không còn là Chủ và ca chuyển cho chính mình.

### 2.8 R4-001, R4-002: Reset số liệu thử (`ee37429`)
- **Dẫn chứng:**
  - `admin-money.ts:308`: máy chủ chỉ kiểm định dạng mã, mã do trình duyệt tự sinh.
  - `pay-flow.ts:316`: 16 lệnh xóa rời nhau.
- **Sửa:**
  - Thêm hàm máy chủ `startTestReset` cấp mã: 5 phút, dùng một lần, gắn đúng tài khoản Chủ.
  - `wipeTestData` chạy trong một giao dịch.
- **Test:**
  - `money-flow.test.ts`: trigger chặn giữa chừng thì Token và đơn còn nguyên. Mã sai, mã của người khác, mã quá hạn, dùng lại mã đều bị từ chối.
  - **Playwright thật** trên bản dev và bản dựng node-server với Postgres: nút Reset → mã do máy chủ cấp → xác nhận → «Đã xóa số liệu thử». Không lỗi console.
- **Còn lại:** rào chặn riêng cho production (vd. không cho reset khi đã có đơn thật) cần Chủ quyết.

### 2.9 DEEP-001, DEEP-002, DEEP-004, DEEP-005, DEEP-006: cầu nối Dịch trực tiếp (`8a3de38`)
- **Dẫn chứng:** `src/lib/live/live-bridge.ts`:
  - 185–203: `finalize` không chờ các lần trừ tiền và lần giữ thêm đang chạy.
  - `live-meter.ts:43`: `mustStop` chỉ đúng khi đã bị từ chối.
  - 285: hẹn giờ nối lại không giữ handle.
  - 102–154: khách rời trong lúc chờ thì không ai đóng phiên.
- **Sửa:**
  - `finalize` chờ các lần trừ tiền và lần giữ thêm đang chạy.
  - Hết phần giữ mà lần giữ thêm chưa về thì bỏ khung tiếng.
  - Không nối lại Alibaba sau khi phiên đóng.
  - Không xin giữ thêm sau khi đóng.
  - Khách rời lúc đang đọc giá thì không giữ tiền; rời sau khi đã giữ thì nhả ngay.
- **Trước:** 5/5 test hỏng (`live-before.log`):
  - trừ tiền sau khi phiếu đã đóng;
  - gửi 6 giây tiếng khi chỉ giữ đủ 2 giây;
  - phiếu thứ 2 không được nhả;
  - nối lại Alibaba sau khi phiên đóng;
  - phiếu giữ tiền không được nhả khi khách rời.
- **Sau:** 5/5 đạt (`live-after.log`). Các test live cũ vẫn đạt.
- **Cần làm:** cập nhật cầu nối trên VPS (`tyzo` → 2).

## 3. Các lỗi P1/P2 đã sửa (ngắn)

Chi tiết từng mục (dẫn chứng, cách sửa, test) có trong `KET_QUA.json`. Tóm tắt:

- **MAIN-039:** Admin đặt số Token khóa theo khách. Trước: 3 lần đặt 100 cùng lúc ra 220 ở 18/20 lượt. Sau: luôn 100.
- **DEEP-007:** giây trong lịch sử Dịch trực tiếp bị kẹp ở mức 2 ngày, không làm tràn cột.
- **R3-002:** giới hạn token trả lời phải là số nguyên từ 1 đến 8192. Trước: `-1`, `abc`, `1.5` đều lọt. Không ghi trường này thì vẫn nhận như cũ.
- **API ứng dụng Android:**
  - AZ-005: đọc thân yêu cầu có trần.
  - AZ-009: lỗi nội bộ không lộ ra khách.
  - R3-005, AZ-007: tạo mã liên kết và đổi mã lấy khóa máy trong giao dịch.
  - R4-007: giới hạn tần suất xóa lịch sử.
- **Tài khoản:**
  - R4-004, R4-005: xóa tài khoản trong một giao dịch, gỡ máy Android, không nuốt lỗi.
  - R4-008: mật khẩu tạm đăng xuất mọi phiên và gỡ máy Android.
  - R3-004: gỡ máy sau khi đặt lại mật khẩu được thử lại và ghi nhật ký.
  - R3-007: các hàm trau chuốt cần đăng nhập.
- **Tiền và webhook:**
  - R4-006: tổng doanh thu tính bằng `bigint`.
  - DEEP-010: thân webhook tối đa 256 KB.
  - R5-007: gắn mã giới thiệu báo đúng.
- **Cầu nối:**
  - DEEP-008: hàng chờ gửi Alibaba quá 1 MB thì bỏ khung.
  - DEEP-009: cầu nối chỉ dùng `wss`.
- **Phía trình duyệt:**
  - R5-009: IndexedDB tính là đã lưu khi giao dịch xong.
  - R6-001, R6-008: không ghi vào lần chạy mới.
  - R6-002: chờ thông tin video tối đa 30 giây.
  - R6-003, R6-004: kiểm bảng mẫu MP4 và đoạn Range.
  - R6-005: tải lên R2 treo 60 giây thì thử lại.
  - R6-007: thời lượng âm thanh phải là số hữu hạn.
  - R6-009: hủy được lúc đọc tệp TyZo.
  - R7-004: câu khách sửa tay không tính cho model.
- **Công cụ:**
  - NEW-001, NEW-002, NEW-007: script công cụ giữ mã lỗi thật.
  - NEW-004: danh sách bỏ qua của gitleaks thu hẹp đúng chỗ.
  - NEW-008: VPS dừng dựng khi CSS trỏ sai.
  - R8-002: migration không bỏ qua lỗi đọc thư mục.
  - AZ-010: thêm 5 tệp test bị sót và một test chặn sót về sau.

## 4. Chờ Chủ quyết (không tự sửa vì đụng nghiệp vụ)

| Mã | Vấn đề | Đề xuất | Vì sao cần Chủ |
|---|---|---|---|
| **R3-001** (P0), gộp MAIN-041 cũ | Cửa Groq/Alibaba: phiếu chỉ cần `held > 0`; nhiều yêu cầu song song vượt phần giữ, phòng chịu | Giữ ước tính từng yêu cầu như TyZo | Ước tính theo mức trần 8192 token có thể chặn khách hợp lệ khi phiếu nhỏ; cần số đo yêu cầu thật trước |
| R3-003 | Model có giá vào mà thiếu giá ra (hoặc ngược lại) bị coi như miễn phí chiều thiếu | Thiếu một chiều thì coi như chưa có giá | Model đó sẽ bị chặn ở cửa trả theo lượt |
| R4-003 | Reset không xóa sổ phải trả nhà cung cấp | Xóa thêm, hoặc giữ và ghi chú | Là xóa thêm số liệu tài chính |
| R5-005 | Hoa hồng gói tính theo `plan.price`, không theo số tiền đơn thật | Tính theo số tiền đơn | Đổi cách tính hoa hồng |
| MAIN-038 | Trừ trên phiếu theo `grant_id`, không theo gói sắp hết hạn | Trừ gói sắp hết hạn trước (có lợi cho khách) | Quy tắc Token |
| **R8-003** | Bản xem trước của nhánh phụ chạy migration trên CSDL thật dùng chung | Tắt dựng nhánh phụ trên Vercel, hoặc dùng CSDL riêng | **Đẩy nhánh này lên GitHub sẽ chạy migration 0038/0039 lên CSDL thật qua bản xem trước** (chỉ thêm cột, an toàn với mã cũ, nhưng vẫn là sửa CSDL thật) |

## 5. Bị chặn, hoãn, chủ đích

- **BLOCKED:**
  - AZ-002, AZ-003, AZ-004, AZ-008, R3-006 (Kotlin): môi trường không có Android SDK và thiết bị, nên không dựng và không thử được. Không sửa mù.
  - R3-008: cần xem proxy thật (Vercel/Caddy) có chuẩn hóa `x-forwarded-for` không.
- **DEFERRED:**
  - AZ-006: chữ ký cần sửa cả script trên VPS. Phát lại chỉ chạy lại lần quét đêm.
  - R3-009, DEEP-003, R5-006, R5-008, R6-006, R7-003, R8-004.
  - R8-005: chưa sửa workflow GitHub Actions vì không chạy thử được ở đây.
- **NEEDS_DESIGN:** R7-001: cần bộ đo chất lượng (câu đảo nghĩa, câu có số) trước khi đổi cách chấm trau chuốt.
- **NEEDS_BROWSER_VERIFY:** R7-006: cần thử trên trình duyệt có tiếng.
- **BY_DESIGN:**
  - R7-002: chia đôi có trần 2n−1 lần gọi, trừ theo `usage` thật trong phần đã giữ.
  - R7-005: bỏ câu cũ trong hàng chờ để lời đọc không trễ so với phim.

## 6. Đối chiếu mã lịch sử (legacy)

Bản lịch sử `TyZo_v5.48.0_AI_Handoff_FULL.zip` có 3 phần: 44 mã MAIN, 30 nhóm TYZO (gom 91 mã cũ, **không có nguyên văn từng mã**) và ghi chú «173 mã».

- **MAIN-019 … MAIN-042 trùng với backlog hiện tại:** gộp, lấy theo mã mới.
  - MAIN-041 gộp vào R3-001.
  - MAIN-019 (chi phí vượt giữ) được MAIN-023 xử lý.
  - MAIN-020 (gọi lại GPU trùng) đã có chống trùng theo băm âm thanh, cộng MAIN-024.
- **Nhóm TYZO đã có lời giải trong đợt này:**
  - TYZO-02, TYZO-12 → MAIN-023, MAIN-039; còn R3-001.
  - TYZO-05 → MAIN-042.
  - TYZO-15 → R4-008.
  - TYZO-20 → MAIN-036.
  - TYZO-11 → R5-005 (chờ Chủ).
  - TYZO-06 → R8-003 (chờ Chủ).
  - TYZO-14 → R5-008 (hoãn).
  - TYZO-03 → R3-002 (đã sửa), R3-003 (chờ Chủ).
  - TYZO-01: điều kiện «email đã xác minh» khi đã gửi được thư đã có test (`admin-allow.test.ts`).
- **Chưa kiểm lại từng mã:**
  - Các nhóm TYZO còn lại: 04, 07–10, 13, 16–19, 21–30.
  - MAIN-001…018 và MAIN-025…044 không thuộc backlog hiện tại. Phần lớn nằm ở `eval/asr` (máy Modal) hoặc là tài liệu và hạ tầng.
  - Lý do: hồ sơ không có nguyên văn, và không chạy được GPU, Android hay hạ tầng thật ở đây.
  - **Không coi các mã này là lỗi, cũng không coi là đã đóng.**

## 7. Độ phủ kiểm toán logic (trung thực)

- **Đọc logic thật:** mọi tệp đã sửa, cộng tệp gọi và test liên quan; khoảng 60 tệp nghiệp vụ trong `billing/`, `live/`, `payment/`, `admin/`, `affiliate*`, `app-*`, `pipeline/`, `sub/` (mp4, r2, wav, polish, narration), `deploy/vps/tyzo.sh`, `scripts/`.
- **Chưa đọc logic từng tệp:** khoảng 1.100 tệp còn lại của danh sách 1.293 tệp. Đây là các tệp giao diện, tài liệu, sơ đồ sinh tự động, ảnh, và phần `eval/asr`.
- **Vì sao:** khối lượng vượt một phiên làm việc. **Kiểm toán từng tệp CHƯA hoàn tất.** Nên làm tiếp theo nhóm `eval/asr/luong-ky/modal` (MAIN-005…008) và `src/components`.

## 8. Việc Chủ cần làm

1. Đọc mục 4 rồi quyết 6 mục. R8-003 cần quyết **trước khi** đẩy nhánh lên GitHub.
2. Nếu đồng ý đẩy: đẩy nhánh, xem bản xem trước, rồi «đẩy chính thức» khi muốn.
3. Sau khi `main` có bản này: trên VPS chạy `tyzo` → 2 để cập nhật cầu nối.
4. Kiểm `LIVE_BRIDGE_URL` trên Vercel bắt đầu bằng `wss://`. Nếu là `ws://`, Dịch trực tiếp sẽ báo chưa cấu hình.
5. R4-008 (đặt mật khẩu tạm đăng xuất khách): Chủ xem có cần thêm một câu vào điều khoản không. Đợt này chưa đổi điều khoản.
