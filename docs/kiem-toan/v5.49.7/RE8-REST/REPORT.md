# RE8-002 → RE8-006 và phục hồi chứng từ GPU lượt cuối (Medium)

Chỉ làm phần kiểm được miễn phí: đọc mã, dữ liệu đã lưu, tài liệu công khai và test giả lập. **Không gọi API trả phí. Không đổi giá, mức giữ hay chính sách tài chính.**

## Phục hồi chứng từ GPU khi lượt Modal CUỐI bị crash: PASS_LOCAL (mã `1202352`)

**Vấn đề:** ở RE6-009, việc ghi bù chỉ chạy sau một lượt Modal **thành công**. Nếu lượt cuối của ngày bị crash và không có lượt nào sau đó, chứng từ nằm chờ vô hạn. Bản bù cũ còn có rủi ro thứ hai: nó xét mọi lượt chưa `xong`, kể cả lượt **đang chạy** của khách khác đã ghi USD nhưng chưa kịp tự ghi chứng từ. Nếu bên bù ghi trước bằng tỷ giá hoặc model khác, lượt đang chạy sẽ báo «mã chứng từ đã dùng với số khác» và bị coi là không chắc.

**Sửa:**
- `recoverModalSpend` chỉ bù lượt **đã kết thúc** (`mat-phan-hoi`, `can-doi-soat`), hoặc lượt `running` đã quá hạn lease **và** không còn nhịp sống. Lượt quá hạn mà không còn nhịp nghĩa là tiến trình đã chết và chưa ai dọn.
- `recoverModalSpendNow(sql)` lấy tỷ giá của bảng giá hiện tại. Hàm này chạy ở ba chỗ:
  - sau mỗi lượt thành công;
  - quét đêm `/api/risk-sweep`, trả thêm `modalRecovered`;
  - trang Doanh thu của Admin.

  Ở cả ba chỗ, việc bù chạy **trước** `drainSpendJournal`. Lỗi khi bù chỉ ghi cảnh báo, không chặn.
- Khóa chứng từ vẫn là `modal:<attempt>`: ghi lại không cộng hai lần, và không trừ Token của khách.

**Test** (`src/lib/billing/re6-009.test.ts`, 11/11 trên PG 18.7 và PGlite): tạo 5 lượt.

| Lượt | Có được bù |
|---|---|
| Crash, không còn đoạn | Có |
| Crash, nhịp sống cũ | Có |
| Đã kết thúc | Có |
| Đang chạy, còn nhịp | Không |
| Mới tạo | Không |

Kết quả: đúng 3 chứng từ. Chạy lại một lần rồi 5 lần đồng thời vẫn chỉ 3 chứng từ. Khách bị trừ 0. Sau đó lượt đang chạy tự ghi chứng từ bình thường. Có thêm test xác nhận quét đêm và trang Doanh thu gọi bù trước khi cộng sổ.

## RE8-002 · Giá token cache: PARTIAL (cần hóa đơn)

Tài liệu công khai:
- **Groq:** giảm 50% cho token cache trúng, không tính phí tạo cache ([Groq prompt caching](https://console.groq.com/docs/prompt-caching)).
- **Alibaba:** cache tự động tính 20% giá đầu vào (một trang ghi 10%); cache tạo chủ động tính 125% ([Alibaba context cache](https://www.alibabacloud.com/help/en/model-studio/context-cache)).

Hiện trạng: TyZo ghi chi phí nhà cung cấp với **giá đầy đủ** cho mọi token đầu vào, nên sổ «Phải trả nhà cung cấp» có thể **cao hơn** hóa đơn. Phần chênh tối đa là `cached × giá vào × (1 − tỷ lệ)`. Khách không bị ảnh hưởng vì luôn bị trừ ≤ mức giữ.

Dữ liệu RE4-001 không lưu `prompt_tokens_details.cached_tokens`, nên chưa ước lượng được tỷ lệ trúng cache thật.

Đề xuất (chờ Chủ):
- lưu `cached_tokens` vào lệnh, cần migration chỉ thêm cột;
- sau đo A4, quyết định có ghi chi phí theo giá cache hay không.

## RE8-003 · 5 model chưa đo usage thật: BLOCKED

Không có cách miễn phí để đo. Bốn model Groq enterprise chưa có giá, nên cửa trả 422 và không tính sai (có test RE6-008). qwen-turbo đi qua cửa với giá 0,05/0,20. Cần gói A1.

## RE8-004 · Giá bậc qwen-turbo và qwen-max: PARTIAL (`1202352`)

- **qwen-max quốc tế:** bảng giá ghi 1,6/6,4 USD, **không có bậc**, chỉ có chế độ không suy luận. Cửa sổ 131.072 nằm dưới mọi ngưỡng bậc, nên không cần đánh dấu ([Alibaba model pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing)).
- **qwen-turbo quốc tế:** 0,05/0,20 USD. Không tìm thấy bảng bậc; model có thể đã được Qwen-Flash thay thế. Cửa sổ khoảng 1M.
- Thêm `alibaba:qwen-turbo` vào `FLAT_PRICE_INPUT_LIMIT` (256.000) để **chỉ đánh dấu đối soát** khi đầu vào vượt ngưỡng, không đổi giá. Test: 300K đầu vào → `can-doi-soat`.
- Cần Chủ xác nhận trên trang giá chính thức, hoặc đo A3.

## RE8-005 · Token suy luận Groq: BLOCKED

Tài liệu Groq chỉ định nghĩa `max_completion_tokens` là số token sinh ra tối đa, không nói rõ có gồm token suy luận hay không. Có một báo lỗi cộng đồng nói Responses API bỏ sót token suy luận khỏi usage; đây không phải đường chat completions mà TyZo dùng.

Dữ liệu RE4-001 không lưu `completion_tokens_details`. Cổng hiện chặn usage tự mâu thuẫn (`reasoning > completion`, hoặc `total` lệch), nhưng không phát hiện được trường hợp nhà bỏ hẳn token suy luận ra khỏi usage. Cần gói A2.

## RE8-006 · Mức giữ cao khoảng 4 lần usage: ANALYZED (không đổi mức giữ)

Tính trên lô 40 câu (cận vào 7.270, trần ra 4.096, usage tham khảo 1.171 vào và 1.200 ra):

| Model | Phần đầu ra trong mức giữ | Giữ / dùng | Nếu trần ra = 512 + 35 × số câu |
|---|---|---|---|
| gpt-oss-20b / 120b | 69% | 4,0× | 2,5× |
| qwen3.8-27b | 74% | 3,9× | 2,3× |
| qwen-plus | 63% | 4,1× | 2,7× |
| qwen-max / qwen-turbo | 69% | 4,0× | 2,5× |

**Nguyên nhân chính:** trần đầu ra. App đặt `512 + 160 × số câu`, chặn ở 4.096; thực tế khoảng 30 token mỗi câu. Hạ trần ra giảm mức giữ, nhưng có **nguy cơ cắt cụt bản dịch** (JSON dở dang, phải chạy lại và tốn hơn).

**Đề xuất (chờ Chủ, sau đo A1/A6):** đặt trần ra theo phân vị 99 của số token mỗi câu đã đo cho từng model. Không làm trong phiên này.
