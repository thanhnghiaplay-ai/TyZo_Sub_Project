# R08 — Ghi bền chi phí upstream và chờ ghi trước khi đóng live

Ưu tiên P1 về tính đúng sổ chi phí và vòng đời phiên; phát hiện liên module sau R07, không thay giá bán, công thức trừ Token hoặc điều khoản.

Trước sửa: `r08-live-spend-before-valid` giữ promise ghi chi phí chưa xong nhưng live đã đóng phiếu (`closedEarly:true`). `r08-required-spend-before` tạo trigger SQL từ chối ghi provider_spend, adapter live vẫn trả thành công và không lưu hồ sơ chi phí chờ xử lý. `r08-spend-precision-before` dùng TTS22USD/triệu ký tự,1ký tự: sổ USD ghi40micro thay vì22 vì suy từ giá vốn đã làm tròn lên1đ. Các harness dùng mã thật, dữ liệu tổng hợp/loopback, không gọi nhà cung cấp.

Nguyên nhân: live gọi spend bằng void, không nằm trong tập công việc finalize phải chờ; hai lớp catch nuốt lỗi ghi chi phí; USD dùng giá vốn khách đã làm tròn thay cho giá niêm yết và usage thô. Modal cũng dùng logger best effort trước quyết toán.

Sửa:

- Migration0052 thêm journal quan sát chi phí chỉ chứa mã, nhà/model và số tiền. Giữ toàn bộ giá trị cũ, mở rộng provider_spend.base_vnd từ bigint sang numeric để không mất phần lẻ trong chi phí. Không đổi cột khoản trừ của khách.
- Lưu quan sát trước; sau đó ghi bảng tổng hợp và đánh dấu posted trong một giao dịch. Lỗi tổng hợp giữ pending, tăng tries/lưu mã SQL, phát log; báo cáo cộng pending cùng phần posted trong một câu SQL nên số phải trả không bị thấp giả hoặc đếm hai lần. Admin thấy số khoản đang chờ. Nếu không lưu được quan sát, báo lỗi thay vì fallback im lặng.
- Replay journal hữu hạn, khóa từng receipt và idempotent, chỉ ghi sổ lại, tuyệt đối không gọi GPU/provider. Đọc Doanh thu của Chủ thử tối đa5 khoản; lượt quét đêm đã xác thực thử tối đa25. Không thêm hàng đợi dịch vụ ngoài hoặc polling dày.
- Live chờ cả ghi chi phí và khoản trừ trước khi nhả phiếu/admission; đóng WebSocket có hạn chót, chưa xác minh upstream đã kết thúc thì giữ unknown. Nếu quan sát không lưu được, dừng tiếng mới, báo cần đối soát, ghi log và giữ unknown. Có response ID thì receipt chống ghi chi phí/trừ lại khi provider phát trùng.
- Modal gắn journal theo attempt. Lỗi lưu quan sát phải giữ trạng thái cần đối soát, không tự gửi lại GPU. Sandbox reset xóa journal cùng sổ tổng hợp trong giao dịch hiện hữu, giữ audit; không có reset tự động hoặc reset production.
- Tách supplierBaseCost/liveSupplierCost trước làm tròn khỏi asrCost/chatCost/speechCost/liveCost dùng tính Token. Giá quy đổi, đơn giá, cách giữ và trừ của khách giữ nguyên. ASR Groq giữ minimum10giây theo giá nhà; Alibaba dùng duration upstream. Thiếu usage vẫn đánh dấu đối soát và dùng dự toán như trước.

Bằng chứng: provider-spend-journal.test.ts dùng PostgreSQL thật,20 request cạnh tranh cùng ID chỉ1 receipt/1 aggregate; trigger lỗi tổng hợp giữ pending và báo cáo đủ;10 worker replay chỉ post1lần; lỗi đánh dấu posted rollback cả aggregate; lỗi lưu quan sát được ném; xung đột ID không ghi thêm; giới hạn replay fail closed. upstream-outcome.test.ts kiểm USD thô và khoản Token giữ nguyên; live-bridge-audit.test.ts kiểm chờ ghi, dừng sau lỗi, duplicate ID; money-flow.test.ts kiểm reset không để pending sống lại. Các JSON/log có fingerprint chỉ ra lần chạy trước/sau; không dùng kết quả trước thay cho cổng đầy đủ cuối.

Giới hạn: R09 mới phát hiện hợp đồng usage live là cộng dồn, chưa được sửa trong R08; không tuyên bố DEEP-003 hoặc live đã nghiệm thu toàn phần. Provider/GPU thực, mất kết nối thực, hóa đơn, thiết bị và migration từ dữ liệu khách ẩn danh vẫn chưa kiểm chứng. Không tự động ghi lại khoản chi phí lịch sử đã mất; cần đối chiếu hóa đơn và receipt để tránh đếm trùng.

Rollback: dừng nhận mới/drain, kiểm tra và post hết pending trước khi quay lại ứng dụng cũ; ứng dụng cũ không cộng journal pending vào báo cáo. Giữ bảng journal và cột numeric, tuyệt đối không ép lại bigint vì có thể mất phần lẻ. Nếu còn pending hoặc chưa đối soát thì ưu tiên forward-fix, không xóa receipt để làm báo cáo xanh. Migration có ALTER TYPE cần kiểm tra khóa/thời gian trên staging và backup ẩn danh trước production; chưa có quyền deploy.

Cổng R08 trên fingerprint `419be0abe85bae713611b3d092b14ea9ba7090debfa52a94bd4b2d7c517e0aba`: r08-full/typecheck/lint/build exit0; r08-billing-load exit0 (1/5/25/50/100/200/300, batch và live-billing-simulation-no-audio, mixed; zero sai ledger, số quan sát=số lượt ghi chi phí). Đây chưa phải bài WebSocket/audio/GPU. Migration0046→0052 và fault0053 trên fixture giữ nguyên dữ liệu cũ; không thay cho backup khách ẩn danh. r08-precision-numeric-after cho22microUSD đúng ở1ký tựTTS; Token vẫn4.
