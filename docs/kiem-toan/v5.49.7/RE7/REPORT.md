# RE7 · Bổ sung sau kiểm toán ChatGPT (Medium)

Baseline `085fe16`, nối tiếp `88c7e47`. Mọi phép thử dùng máy chủ giả trên loopback. Không gọi Modal, Alibaba hay cầu nối thật. Kết quả test nằm ở [test-summary.txt](test-summary.txt).

## RE7-001 · Hạn chót tổng và giới hạn phản hồi (`deploy/vps/do-modal/do-modal.py`, `_once` và `_request`): PASS_LOCAL

**Lỗi xác nhận:** `urlopen(timeout=left)` chỉ đặt timeout cho từng lần đọc socket. Máy chủ trả từng byte một vẫn kịp mỗi lần đọc, nên tổng thời gian vượt hạn chót. Đo được 8,25 s với hạn chót 0,5 s, trước khi sửa phần giữ socket. `r.read()` cũng không giới hạn kích thước.

**Sửa:**
- Dùng `http.client` với một bộ hẹn giờ ở hạn chót tổng. Tới hạn thì `shutdown` socket. Socket được giữ riêng vì `getresponse()` có thể đặt `conn.sock = None`.
- Mỗi lệnh có một hạn chót tổng, áp cho kết nối, tiêu đề, thân và cả chuỗi chuyển hướng.
- Thân phản hồi tối đa `MAX_RESPONSE_BYTES`, mặc định 16 MiB. Kiểm cả `Content-Length` lẫn số byte đọc thực tế.
- Hết giờ thì ghi `cost_status=het-gio` và tính đủ phần giữ chỗ vào chi phí không rõ.

**Test:**
- Thân nhỏ giọt và tiêu đề nhỏ giọt, mỗi byte cách 0,05 s, hạn chót 0,5 s: cắt dưới 1,5 s.
- 64 MiB khai báo và luồng không có độ dài: bị từ chối.

## RE7-002 · Chi phí model bằng 0 khác thiếu dữ liệu (`cost_of`): PASS_LOCAL

Trước sửa, `st.get("tien_model_chu_usd", 0)` coi việc thiếu khóa là 0 USD. Backend (`eval/asr/luong-ky/modal/backend.py`) luôn trả khóa này, và app (`modalCostUsd`) bắt buộc phải có. Giờ `cost_of` trả về `(usd, trạng thái)`:

| Trạng thái | Ý nghĩa |
|---|---|
| `du` | đủ dữ liệu |
| `model-0` | có tiền model, bằng 0 |
| `thieu-tien-model` | thiếu tiền model |
| `tien-model-khong-hop-le` | tiền model không hợp lệ |
| `thieu-giay` | thiếu số giây xử lý |
| `giay-khong-hop-le` | số giây không hợp lệ |
| `thieu-stats` | thiếu stats |
| `khong-co-ket-qua` | không có kết quả |
| `het-gio` | hết giờ |
| `loi` | lỗi khác |

Chỉ `du` và `model-0` được tính là chi phí đã biết. Test bao gồm stats rỗng, stats là danh sách, thiếu từng khóa, giá trị `null` và NaN.

## RE7-003 · Chỉ tính phụ đề có nội dung (`deploy/vps/do-live/live-measure.ts`): PASS_LOCAL

`useful` yêu cầu có ít nhất một chữ cái hoặc chữ số (`\p{L}\p{N}`). Rỗng, chỉ khoảng trắng hoặc chỉ dấu câu (`。`, `…`) thì không tính. `hasContent` xét theo loại sự kiện:
- **delta:** `delta` phải có nội dung.
- **câu tạm:** `text + stash` phải có nội dung.
- **câu chốt:** chính `text` phải có nội dung. Phần chờ có chữ không làm câu chốt rỗng được tính.

Sự kiện bị bỏ được đếm vào `emptyEvents`. Lượt chỉ có sự kiện rỗng sẽ bị đếm vào `failed.thieu-chu-goc`. Test cũng xác nhận mốc đầu là sự kiện có chữ đầu tiên, không phải sự kiện rỗng trước nó.

## RE7-004 · Tên riêng CJK: Chủ duyệt hướng A + D + bảng thuật ngữ (28/11/2026)

Đã sửa mã (`386660a`). Phần bảo toàn nội dung đạt **PASS_LOCAL**. Phần chất lượng prompt thực tế là **BLOCKED**.

### A · Không lọc làm mất nội dung

- `src/lib/live/leftover-script.ts`: bỏ `dropLeftoverScript` và thay bằng `tidyLiveText`. Hàm mới **không xóa ký tự nào**, dù chữ Hán, kana hay Hangul đứng riêng hay dính liền chữ đích.
- Với đích không dùng chữ CJK, hàm chỉ đổi dấu câu toàn khổ sang dấu thường. Với câu đầy đủ, hàm gộp khoảng trắng thừa. Đích Trung, Nhật, Hàn và Quảng Đông giữ nguyên.
- `live-bridge.ts` dùng `tidyLiveText` cho `translation` (text và stash) và `translation-delta`.
- Phương án B cũ (`leftover-policy.ts`) đã bị xóa vì Chủ không chọn.
- Khách sẽ thấy khác ở hai chỗ:
  - «Bạn phải luôn如一» và «Tôi gặp 王小明» giờ hiện đầy đủ.
  - Chữ gốc model chưa dịch cũng sẽ hiện, đây là đánh đổi Chủ đã chấp nhận.
- Cầu nối trên VPS/Fly cần cập nhật thì thay đổi mới có hiệu lực. Phiên này không deploy.

### Bảng thuật ngữ

- Đường hiện có được giữ: «Từ cần giữ đúng» → vé `words` → `translation.corpus.phrases`.
- `namePolicyPrompt` đặt bảng thuật ngữ **đầu tiên và bắt buộc**, bỏ dòng trùng hoặc rỗng, tối đa 30 dòng như `cleanHotwords`.
- Không mở rộng hệ thống thuật ngữ.

### D · Hướng dẫn tên riêng (`src/lib/live/name-policy.ts`)

- Có đủ 20 cặp dịch có hướng giữa Anh, Trung, Nhật, Hàn và Việt, mỗi cặp một quy ước chuẩn. Ví dụ:
  - Trung → Việt: dùng Hán-Việt khi chắc chắn.
  - Nhật → Anh/Việt: dùng Hepburn.
  - Hàn → Anh/Việt: dùng Revised Romanization.
  - Trung → Nhật: giữ nguyên chữ Hán.
  - Nhật → Hàn: phiên âm Hangul chuẩn.
- Mọi cặp đều có quy tắc: **không chắc thì giữ nguyên tên gốc**, không bỏ, không rút gọn, không dịch nghĩa tên.
- **Chưa gửi lên Qwen.** Tài liệu phiên realtime mới xác nhận `translation.language` và `translation.corpus.phrases`, chưa có trường hướng dẫn tự do. Gửi trường chưa xác nhận có thể làm hỏng phiên. Test bảo đảm `buildSessionUpdate` không có `instructions`.
- Không thêm lượt gọi AI trên đường streaming. `tidyLiveText` là hàm thuần, chạy đồng bộ.

### Test với dữ liệu giả lập

`src/lib/live/name-policy.test.ts` (6 ca), `leftover-script.test.ts` (6 ca) và `scripts/re6-005-live-measure.test.mjs` (10 ca) đều đạt.

- **Dữ liệu:** 5 đích, gồm tên nhân vật (孫悟空, 王小明, 아이유), địa danh (北京, 부산, 東京, Hà Nội), thuật ngữ (機械学習, PlayStation 6, ChatGPT) và chữ dính liền («luôn如一»).
- **Câu chốt và phần chờ:** chữ và số giữ nguyên.
- **Delta:** mỗi câu được cắt thành mẩu 3 ký tự, kể cả cắt ngay giữa tên. Ghép lại không mất chữ và khớp câu chốt.
- **Prompt:** đủ 20 cặp, mỗi cặp một quy ước, bảng thuật ngữ đứng đầu.

### BLOCKED · cần Chủ duyệt chi phí

- Chưa biết Qwen LiveTranslate có nhận hướng dẫn tự do hay không, và có tôn trọng `corpus.phrases` không. Ghi chú v5.49.x cũng nói «chưa thử Qwen có nhận corpus.phrases không».
- Chưa đo chất lượng phiên âm của 20 cặp.
- Cần chạy phiên thật trên Alibaba, có phí, với bộ câu mẫu trên.

## R8-002 bằng user thường: PASS

Chạy với uid 30033 (user `tester`, chủ sở hữu bản sao `scripts/`, `migrations/` và `package.json`): 1/1 đạt. Lỗi trong lần hồi quy trước là do chạy bằng root, nên bỏ qua quyền tệp.

## Admission 0057

Giữ nguyên. Không có bằng chứng mới, kết luận RE6-007 không đổi.
