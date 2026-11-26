# Bàn giao cho phiên sau — sửa triệt để v5.49.1 (đang dở)

- **Chỉ thị gốc:** tệp `TyZo_v5.49.1_Claude_Handoff_Triet_De.md` Chủ gửi ngày 27/11/2026. Tệp này không có trong kho; xin Chủ gửi lại cho phiên sau.
- **Sáu quyết định của Chủ (mục 2 của chỉ thị):** đã duyệt hết.
- **Gốc:** `93bee64` (= `main`). Nhánh làm việc: `ccr-9f1afcc8-iv7067`. **Chưa gộp `main`, chưa deploy.** Chủ đã tắt dựng nhánh phụ trên Vercel.
- **Câu mở đầu cho phiên sau:** «Đọc `BANG_DIEU.md` và `docs/kiem-toan/v5.49.1/BAN_GIAO_PHIEN_SAU.md`, làm tiếp phần còn dở.»

## Môi trường thử (mỗi phiên mới phải dựng lại)

```bash
npm ci
pg_ctlcluster 16 main start
su postgres -c "psql -c \"create role tyzo login superuser password 'thu'\" -c 'create database tyzo_thu owner tyzo'"
# Test tranh chấp trên Postgres thật (CSDL thử, không phải dữ liệu thật):
TYZO_TEST_PG_URL=postgres://tyzo:thu@127.0.0.1:5432/tyzo_thu node --experimental-strip-types --test \
  src/lib/billing/tyzo-modal-race.test.ts src/lib/billing/gate-reserve.test.ts \
  src/lib/billing/token-balance-race.test.ts src/lib/affiliate-payout.test.ts
```

- **Bằng chứng trước/sau:** `docs/kiem-toan/v5.49.1/bang-chung/`.
- **Diễn tập khôi phục:** `re003-run.sh` cùng `re003-harness.sh`.
- **Diễn tập migration:** `mig-drill-final.log`. Kịch bản gốc nằm trong `docs/kiem-toan/v5.49/bang-chung/mig-0037-drill.sh`.

## Đã xong trong phiên này

Mỗi mục là một commit riêng, có test, và đều đạt.

| Mục | Commit | Tóm tắt | Bằng chứng trước → sau |
|---|---|---|---|
| RE-001 (P0) | `ace090d` | Đoạn TyZo «đang chạy» tính theo nhịp sống (30 giây, quá 150 giây coi là chết) và mã lượt chạy; đóng ép thì ghi nhật ký thao tác. Migration 0040 | Đoạn gửi 20 phút trước vẫn chạy: phiếu bị đóng, trả hết 100 Token, không trừ được 0 → nay phiếu chờ, trừ đúng 12 |
| RE-002 (P0) + RE-005 | `c00b163` | Cửa Groq/Alibaba giữ trước phần tiền của từng lệnh (`gate-reserve.ts`, bảng `run_gate_calls`, migration 0041). Phiếu bận thì máy chủ chờ tối đa 20 giây rồi trả 429. Trần token bắt buộc: thiếu thì đặt 4096, thân gửi nhà cung cấp được chuẩn hóa | 8 lệnh cùng lúc: nhà gọi 8 lần ≈ 264 Token, khách trừ 100 → nay 4 lần ≈ 132, tổng phần giữ không vượt `held` |
| RE-003 (P0) | `b766c1c` | Khôi phục dữ liệu VPS: `--exit-on-error --single-transaction`, kiểm đủ bảng, khóa ngoại, ràng buộc, chỉ mục, ổ đĩa; bỏ đường «dong-y» | Gõ «dong-y» nhận bản thiếu khóa ngoại → nay mọi ca lỗi đều dừng, dữ liệu cũ nguyên |
| RE-004 (P0) + R4-003 | `b7eaf62` | Reset chỉ chạy khi có `TYZO_TEST_RESET=1`, tên CSDL nằm trong `TYZO_TEST_RESET_DB`, và không phải production. Giữ `room_audit`, xóa `provider_spend` | Test 29/29 đạt |
| RE-006 | `450fe73` | Gắn khoản hoa hồng cũ vào lệnh rút chỉ khi chắc chắn (migration 0042); bỏ cách đoán theo CTV; đối soát chỉ đọc ở trang Cộng tác | Lệnh 50.000 đ đánh dấu 60.000 đ là đã chi → nay báo lỗi |
| R5-005 + R5-006 | `e1aac22` | Hoa hồng tính trên `order.amount`; hàng đợi `commission_outbox` ghi cùng câu lệnh với thanh toán (migration 0043) | Tính trên 9.000 thay vì 12.000 → nay 12.000; lỗi khi ghi hoa hồng không còn bị nuốt |
| MAIN-038 | `9a3a178` | Trừ Token ở gói hết hạn sớm nhất trước; hạn chụp lúc giữ (`token_slices.expires_at`, migration 0044) | Còn A 50 / Z 70 → nay A 100 / Z 20 |
| R3-003 | `f82ecb0` | Giá dịch thiếu một chiều thì chặn model | Model thiếu giá ra vẫn mở → nay chặn |
| R8-003 | `e7366b3` | `scripts/migration-gate.mjs`: bản xem trước chỉ chạy migration khi có `TYZO_PREVIEW_DB=rieng`; migration phá dữ liệu cần `TYZO_ALLOW_DESTRUCTIVE=<tệp>`; CSDL mới tinh không bị chặn | Diễn tập 4 ca đều đạt |
| AZ-006 | `00f5127` | Chữ ký quét đêm v2 gắn nonce, phương thức, đường dẫn và sha256 của thân; chống gửi lại (`sweep_nonces`, migration 0045); script VPS ký giống hệt | So bằng `openssl` + `sha256sum` |
| DEEP-003 | `f15eb73` | Chi phí Dịch trực tiếp ghi theo usage thật từng lượt (`billing.spend`) | Test thu thiếu vẫn ghi đúng giá gốc |

`npm test` gần nhất: 196 + 1372 + 1 đạt, 0 lỗi. `tsc` và `eslint` sạch.

## Còn dở, theo thứ tự nên làm

1. **R3-008 (đang làm dở lúc dừng): lấy IP khách đáng tin.** Đang dùng `x-forwarded-for` phần tử đầu, ở `app-link.server.ts:107` và `risk-log.server.ts:10`.
   - Context7 xác nhận: Caddy mặc định **bỏ** giá trị X-Forwarded-For khách tự gửi và tự đặt lại. Vercel cũng tự đặt.
   - Riêng chế độ Cloudflare Tunnel thì Caddy không đứng trước, nên khách có thể giả header.
   - Đề xuất: thêm biến `TRUSTED_IP_HEADER` (mặc định `x-forwarded-for`; chế độ tunnel đặt `cf-connecting-ip`, `tyzo.sh` tự đặt theo `EDGE`). Gom vào một hàm dùng chung, kèm test.
2. **R3-009:** ASR thiếu `duration` thì tính 0. Sửa: dùng số giây ước từ thân (`audioSecondsEstimate` trong `run-gate.ts`) làm sàn và ghi cờ đối soát.
3. **R5-008:** bản lưu phụ đề trong IndexedDB chưa gắn theo tài khoản. Cần id tài khoản phía máy khách. Không sửa các tệp nền tảng `auth/client.ts` và `scripts/sign-out-plan.mjs`.
4. **R6-006:** dọn key R2 khi PUT lỗi hoặc mất trả lời (`r2-upload-run.ts`).
5. **R7-001:** bộ chấm trau chuốt phải giữ nguyên số và phủ định. Không chắc thì giữ bản gốc. Cần test.
6. **R7-003:** thuật ngữ nạp lỗi thì báo một lần (`translate.ts`, khối `catch` quanh `loadRunGlossary`).
7. **R7-006:** dừng giọng đọc thì kết thúc promise của `playUrl` (`narration.ts`). Cần thử trên trình duyệt.
8. **R8-004:** hoãn tự tải lại trang khi đang có việc chạy (`stale-build-guard.tsx`).
9. **R8-005:** workflow Android tách quyền theo job, job đăng bản phát hành riêng.
10. **Android** (AZ-002/003/004/008, R3-006): máy không có Android SDK nên ghi BLOCKED, trừ khi phiên sau có SDK.
11. **Tái nghiệm thu 23 mục FIXED_CODE** của đợt v5.49 (danh sách ở `docs/kiem-toan/v5.49/KET_QUA.json`, `result_status = FIXED_CODE`): thêm test riêng cho từng mục.
12. **Cổng cuối:**
    - `npx tsc --noEmit`, `npx eslint src --quiet`, `npm test`.
    - `env -u DATABASE_URL npm run build`, và dựng thêm bản `NITRO_PRESET=node-server` chạy trên Postgres thử.
    - Playwright: Admin → Doanh thu, nút Reset phải bị khóa khi không đặt `TYZO_TEST_RESET`; trang Cộng tác có khung đối soát.
    - Gọi thử `/api/risk-sweep` hai lần cùng nonce: lần hai phải bị 401.
    - `bash scripts/tools/cong-cu.sh bi-mat | bao-mat | phu-thuoc`, `graphify update . --force`.
    - Viết báo cáo `docs/kiem-toan/v5.49.1/BAO_CAO.md` theo mẫu mục 5 của chỉ thị.
    - Đóng gói hồ sơ cho ChatGPT kiểm toán độc lập.
    - Cập nhật `BANG_DIEU.md`, `PROJECT_STATUS.md`, `HANDOFF.md`.
    - Nâng phiên bản (`APP_VERSION`, `CHANGELOG`, `ADMIN_LOG`).

## Lưu ý khi gộp (Chủ quyết)

- Migration mới: 0040–0045. Tất cả chỉ thêm bảng, cột, chỉ mục; riêng 0042 có cập nhật dữ liệu khi chắc chắn. Không có lệnh phá dữ liệu.
- Chưa thử trên Neon và VPS thật.
- Sau khi gộp:
  - VPS chạy `tyzo` → 2 để có cầu nối mới và chữ ký quét đêm v2. Web và VPS phải lên cùng lúc, nếu không lần quét đêm đó báo 401.
  - Muốn bật Reset trên máy chủ thử: đặt `TYZO_TEST_RESET=1` và `TYZO_TEST_RESET_DB=<tên CSDL thử>`.
  - Bản xem trước dùng CSDL riêng: đặt `TYZO_PREVIEW_DB=rieng` cùng `DATABASE_URL` riêng ở mục Preview trên Vercel.
- Đổi hành vi cần biết:
  - Cửa trả theo lượt có thể chờ tối đa 20 giây hoặc trả 429 khi phần giữ đang thuộc các lệnh khác.
  - Model thiếu giá một chiều bị chặn: xem trang Giá trên CSDL thật.
