# TYZO --- BÀN GIAO SỬA TRIỆT ĐỂ VÀ NÂNG CẤP

Baseline: `93bee64682593867dbd00e0312522a11918261e6` (ZIP main). SHA-256 ZIP: `c38d819c526500dc5562eefa4479c95129e5ea6e062ec115e8da2a4621d524b1`.

Đây là chỉ thị thực hiện cho Claude Code, không phải chứng nhận đã sửa. Báo cáo KET_QUA.json là tự báo cáo của Claude; chưa chạy lại test độc lập trong lần tạo hồ sơ này.

## 1. Chỉ thị bắt buộc

-   Tạo nhánh riêng từ baseline; nếu HEAD khác, đối chiếu diff và cập nhật bằng chứng. Không tự merge, push/deploy production hoặc thao tác phá hủy dữ liệu.
-   Tự thực hiện tuần tự đến khi đạt gate; chỉ hỏi khi thiếu quyền, dữ liệu mơ hồ hoặc cần quyết định ngoài phạm vi. Không dừng để hỏi sau mỗi task nhỏ.
-   Giữ 1 Token = chi phí gốc 1 giây Whisper Turbo; chỉ Groq, Alibaba, TyZo; TyZo theo lượt; giữ giá, quyền lợi, phụ đề sửa tay, lịch sử tài chính. Không hồi sinh provider đã loại bỏ.
-   Mỗi task: tái hiện trước sửa, nguyên nhân gốc, patch tối thiểu, kiểm thử sau sửa, diff, commit, log, rollback. Không dùng test mock để tuyên bố đã nghiệm thu production. Không sửa test để che lỗi.
-   Dùng Playwright, Filesystem, PostgreSQL test, GitHub, Context7, Sequential Thinking, Graphify, Semgrep, Gitleaks, dependency-cruiser khi phù hợp. Không đưa secrets hoặc dữ liệu khách vào log. Không chạy DB production.

## 2. Quyết định triển khai theo đề xuất

1.  Reserve Groq/Alibaba trước upstream, không đổi đơn giá. R3-001/MAIN-041.
2.  Giá chat: thiếu một chiều thì chặn model, giá 0 chỉ khi khai báo miễn phí rõ ràng; kiểm tra tương thích model đang dùng. R3-003.
3.  Giữ sổ provider_spend production; reset test chỉ trên DB test, đồng bộ dữ liệu test và giữ audit. R4-003.
4.  Hoa hồng theo số tiền thực thu hợp lệ của đơn mới, giữ tỷ lệ hiện hành; không tính lại giao dịch lịch sử; xác minh quy tắc giảm giá, hoàn tiền, overpayment trước áp dụng. R5-005.
5.  Tiêu Token theo hạn sớm nhất, tie-break ID; snapshot thứ tự khi reserve, kiểm tra grant hết hạn khi hoàn. MAIN-038.
6.  Preview DB riêng, credential riêng, không migration production từ preview; production migration có backup và gate. R8-003.

Nếu phát hiện quy tắc nghiệp vụ mâu thuẫn hoặc cần sửa dữ liệu lịch sử, dừng riêng task đó và báo Chủ; tiếp tục task độc lập.

## 3. Sáu phát hiện tái kiểm toán --- bắt buộc xử lý

### RE-001 --- P0 --- Đóng phiếu GPU quá sớm

Dẫn chứng: [src/lib/billing/token-flow.ts:147--186](https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/93bee64682593867dbd00e0312522a11918261e6/src/lib/billing/token-flow.ts#L147-L186).

``` text
147: /** Một đoạn TyZo Modal tính là «đang chạy» trong 15 phút kể từ lúc gửi; quá thời gian thì coi như đã chết. */
148: export const MODAL_PART_LIVE = "15 minutes";
149: 
150: /**
151:  * Đóng phiếu giây: phần giữ chưa trừ trả về gói còn hạn. Gói đã hết hạn thì mất.
152:  * Không cộng ví đồng, không tính hoa hồng.
153:  *
154:  * Còn đoạn TyZo Modal đang chạy (kiểm toán MAIN-036): không đóng ngay mà ghi «muốn đóng» (close_wanted), trả null;
155:  * đoạn cuối quyết toán xong sẽ đóng (tyzo-modal-charge.ts). Nhờ vậy đoạn đã gửi GPU vẫn được trừ đúng như điều khoản
156:  * nói («khách bấm hủy thì đoạn đã gửi vẫn chạy xong, được tính và lưu lại»). `force` (Admin nhả tay, phiếu treo
157:  * quá 6 giờ) đóng luôn như trước.
158:  */
159: export async function closeTokenWith(sql: Sql, id: string, userId: string, failed: boolean, opts: { force?: boolean } = {}) {
160:   const force = Boolean(opts.force);
161:   for (let attempt = 0; attempt < 3; attempt += 1) {
162:     const closed = await closeTokenNow(sql, id, userId, failed, force);
163:     if (closed || force) return closed;
164:     const deferred = await sql`
165:       update run_tickets set close_wanted = true, close_failed = close_failed or ${failed}::boolean
166:       where id = ${id} and user_id = ${userId} and status = 'dang-giu' and unit = 'token'
167:         and exists (
168:           select 1 from run_modal_parts p
169:           where p.ticket_id = run_tickets.id and p.status <> 'xong' and p.created_at > now() - ${MODAL_PART_LIVE}::interval
170:         )
171:       returning 1`;
172:     if (deferred.length) return null;
173:     const still = await sql`select 1 from run_tickets where id = ${id} and user_id = ${userId} and status = 'dang-giu' and unit = 'token'`;
174:     if (!still.length) return null;
175:   }
176:   return null;
177: }
178: 
179: async function closeTokenNow(sql: Sql, id: string, userId: string, failed: boolean, force: boolean) {
180:   const rows = await sql<{ freed: number; charged: number; status: string }>`
181:     with o as (
182:       select id, held from run_tickets
183:       where id = ${id} and user_id = ${userId} and status = 'dang-giu' and unit = 'token'
184:         and (${force}::boolean or not exists (
185:           select 1 from run_modal_parts p
186:           where p.ticket_id = run_tickets.id and p.status <> 'xong' and p.created_at > now() - ${MODAL_PART_LIVE}::interval
```

**Nguyên nhân/rủi ro:** Lease cố định 15 phút không phản ánh GPU còn sống; timeout gọi Modal 30 phút cần đối chiếu cấu hình.

**Sửa và kết quả kỳ vọng:** Dùng trạng thái durable, lease heartbeat và fencing; không hoàn hold khi tác vụ còn khả năng quyết toán. Reconcile tác vụ mất phản hồi; force close phải có chính sách và audit.

**Nghiệm thu:** Giả lập tác vụ 16--30 phút, close đồng thời, crash, heartbeat mất, retry; không thu hai lần, không hoàn trước quyết toán.

**Rollback:** revert patch trên nhánh test; migration dùng forward fix hoặc restore staging đã kiểm chứng, không xóa ledger. **Kết quả thực tế:** OPEN, Claude điền log.

### RE-002 --- P0 --- Reserve Groq/Alibaba

Dẫn chứng: [src/lib/billing/run-gate.ts:105--151](https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/93bee64682593867dbd00e0312522a11918261e6/src/lib/billing/run-gate.ts#L105-L151).

``` text
105:   const priced = path === "/audio/transcriptions" ? asrPerSecond(book, model) != null : chatPerMillion(book, model) != null;
106:   if (!priced) return { kind: "reject", status: 422, message: "Model này chưa có giá niêm yết." };
107:   if (!/^[a-f0-9]{24}$/.test(input.ticketId)) return { kind: "reject", status: 402, message: "Thiếu phiếu giữ chỗ. Hãy bấm chạy lại để giữ chỗ." };
108:   if (!(await ticketLive(sql, input.ticketId, userId))) {
109:     return { kind: "reject", status: 402, message: "Phần đã giữ cho lần chạy này đã hết hoặc phiếu đã đóng. Phần đã dịch vẫn còn." };
110:   }
111:   const response = await input.send();
112:   if (!response.ok) return { kind: "pass", response };
113: 
114:   const text = await response.text();
115:   let cost: number | null = null;
116:   let base = 0;
117:   const bare = { ...book, desk: { markup: 0, custom: {} } };
118:   try {
119:     const data = JSON.parse(text) as {
120:       duration?: unknown;
121:       segments?: Array<{ end?: unknown }>;
122:       usage?: { prompt_tokens?: number; completion_tokens?: number };
123:     };
124:     if (path === "/audio/transcriptions") {
125:       const seconds = billedSecondsOf(data);
126:       cost = asrCost(book, model, seconds);
127:       base = asrCost(bare, model, seconds) ?? 0;
128:     } else {
129:       const prompt = Number(data.usage?.prompt_tokens);
130:       const completion = Number(data.usage?.completion_tokens);
131:       const inn = Number.isFinite(prompt) ? prompt : Math.ceil(input.body.byteLength / 3);
132:       const out = Number.isFinite(completion) ? completion : MAX_COMPLETION_TOKENS;
133:       cost = chatCost(book, model, inn, out);
134:       base = chatCost(bare, model, inn, out) ?? 0;
135:     }
136:   } catch {
137:     cost = path === "/audio/transcriptions" ? asrCost(book, model, 0) : chatCost(book, model, Math.ceil(input.body.byteLength / 3), MAX_COMPLETION_TOKENS);
138:     base = path === "/audio/transcriptions" ? asrCost(bare, model, 0) ?? 0 : chatCost(bare, model, Math.ceil(input.body.byteLength / 3), MAX_COMPLETION_TOKENS) ?? 0;
139:   }
140:   // Tiền phải trả nhà cung cấp: giá gốc thật của lần gọi thành công, kể cả khi phiếu đã hết phần giữ.
141:   if (base > 0) await recordSpendWith(sql, { provider: input.provider ?? "groq", model, baseVnd: base, rate: book.rate });
142:   if (cost && cost > 0) {
143:     const unit = await sql<{ unit: string }>`select unit from run_tickets where id = ${input.ticketId} and user_id = ${userId}`;
144:     if (unit[0]?.unit === "token") {
145:       const { giayForBaseCost } = await import("./token-math.ts");
146:       const giay = giayForBaseCost(input.unitBook ?? book, base);
147:       if (giay && giay > 0) {
148:         const { chargeTokenWith } = await import("./token-flow.ts");
149:         await chargeTokenWith(sql, input.ticketId, userId, giay);
150:       }
151:     } else await chargeTicketWith(sql, input.ticketId, userId, cost, base);
```

**Nguyên nhân/rủi ro:** Gọi upstream trước khi charge; nhiều request dùng chung hold.

**Sửa và kết quả kỳ vọng:** Reserve nguyên tử từng request theo giá snapshot và giới hạn input/output; idempotency, settle/release, reconcile usage không rõ; không đổi giá Token.

**Nghiệm thu:** PostgreSQL nhiều kết nối, tổng reserve không vượt hold; retry, timeout, cancel, close, crash, response mất; đối soát ledger.

**Rollback:** revert patch trên nhánh test; migration dùng forward fix hoặc restore staging đã kiểm chứng, không xóa ledger. **Kết quả thực tế:** OPEN, Claude điền log.

### RE-003 --- P0 --- Restore fail closed

Dẫn chứng: [deploy/vps/tyzo.sh:694--713](https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/93bee64682593867dbd00e0312522a11918261e6/deploy/vps/tyzo.sh#L694-L713).

``` text
694:   chay_cho "Nạp dữ liệu vào CSDL tạm" /tmp/tyzo-restore.err bash -c 'docker exec -i tyzo-db pg_restore -U tyzo -d tyzo_moi --no-owner --no-privileges < "$1"' _ "$f" || ma=$?
695:   co="$(docker exec tyzo-db psql -U tyzo -d tyzo_moi -tAc "select count(*) from pg_tables where schemaname='public'" 2>/dev/null | tr -d '[:space:]')"
696:   if [ "${co:-0}" != "$can" ]; then
697:     do_ "✘ Nạp thiếu bảng (${co:-0}/$can). Dữ liệu đang chạy KHÔNG bị đụng."; tail -5 /tmp/tyzo-restore.err | sed 's/^/   /'
698:     pg_sys "drop database if exists tyzo_moi" >/dev/null; return 1
699:   fi
700:   if [ "$ma" != 0 ]; then
701:     vang "Đã đủ $co bảng nhưng công cụ nạp báo lỗi (mã $ma):"; grep -i 'error' /tmp/tyzo-restore.err | tail -5 | sed 's/^/   /'
702:     read -rp "Gõ dong-y để dùng bản vừa nạp, Enter để hủy (dữ liệu đang chạy giữ nguyên): " a
703:     [ "$a" = "dong-y" ] || { pg_sys "drop database if exists tyzo_moi" >/dev/null; echo "Đã hủy."; return 1; }
704:   fi
705:   dc stop web bridge >/dev/null 2>&1 || true
706:   cu="tyzo_cu_$(date '+%Y%m%d_%H%M%S')"
707:   pg_sys "select pg_terminate_backend(pid) from pg_stat_activity where datname in ('tyzo','tyzo_moi') and pid <> pg_backend_pid()" >/dev/null || true
708:   if ! pg_sys "alter database tyzo rename to $cu" >/dev/null; then
709:     do_ "✘ Không đổi chỗ được (còn kết nối vào CSDL?). Dữ liệu đang chạy giữ nguyên."; pg_sys "drop database if exists tyzo_moi" >/dev/null; return 1
710:   fi
711:   if ! pg_sys "alter database tyzo_moi rename to tyzo" >/dev/null; then
712:     pg_sys "alter database $cu rename to tyzo" >/dev/null; do_ "✘ Đổi chỗ lỗi, đã trả CSDL cũ về."; return 1
713:   fi
```

**Nguyên nhân/rủi ro:** Cho phép dong-y dù pg_restore lỗi nếu đủ bảng.

**Sửa và kết quả kỳ vọng:** Bỏ override trong đường restore chuẩn; restore staging với exit-on-error và single-transaction khi tương thích; đối soát schema, constraints, counts, ledger, backup; khóa writers khi cutover, rollback có kiểm chứng.

**Nghiệm thu:** Dump hỏng, lỗi index/FK, thiếu rows, disk full, rename fail, writers concurrent: DB cũ nguyên vẹn, không báo thành công sai.

**Rollback:** revert patch trên nhánh test; migration dùng forward fix hoặc restore staging đã kiểm chứng, không xóa ledger. **Kết quả thực tế:** OPEN, Claude điền log.

### RE-004 --- P0 --- Reset production

Dẫn chứng: [src/lib/admin/admin-money.ts:304--329](https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/93bee64682593867dbd00e0312522a11918261e6/src/lib/admin/admin-money.ts#L304-L329).

``` text
304: /** Cấp mã xác nhận reset (máy chủ giữ, 5 phút, một lần). */
305: export const startTestReset = createServerFn({ method: "POST" })
306:   .middleware([authMiddleware])
307:   .handler(async ({ context }) => {
308:     await requireRole(context.userId, "chu");
309:     const { getSql } = await import("@/lib/db");
310:     const { issueResetCodeWith } = await import("@/lib/payment/pay-flow");
311:     return { code: await issueResetCodeWith(await getSql(), context.userId) };
312:   });
313: 
314: export const resetTestMoney = createServerFn({ method: "POST" })
315:   .middleware([authMiddleware])
316:   .validator((code: string) => {
317:     const value = code?.trim().toUpperCase() ?? "";
318:     if (!/^[A-Z2-9]{6}$/.test(value)) throw new Error("Hãy nhập đúng mã xác nhận 6 ký tự.");
319:     return value;
320:   })
321:   .handler(async ({ context, data }) => {
322:     await requireRole(context.userId, "chu");
323:     const { getSql } = await import("@/lib/db");
324:     const { wipeTestData, consumeResetCodeWith } = await import("@/lib/payment/pay-flow");
325:     const sql = await getSql();
326:     if (!(await consumeResetCodeWith(sql, context.userId, data))) throw new Error("Mã xác nhận sai hoặc đã hết hạn. Bấm Reset về sạch để lấy mã mới.");
327:     await wipeTestData(sql);
328:     await writeAudit(context.userId, "reset-tien-test", null, "Xóa số liệu thử: Token dịch, đơn, phiếu, chuông, nhật ký, gói thuê. Giữ tài khoản.");
329:     return { ok: true as const };
```

**Nguyên nhân/rủi ro:** Có role và mã xác nhận nhưng không thấy guard môi trường tại endpoint.

**Sửa và kết quả kỳ vọng:** Khóa cả cấp mã và thực thi reset trên production; chỉ bật explicit test environment + DB allowlist, fail closed; audit ngoài dữ liệu reset. Không thử production.

**Nghiệm thu:** Owner production vẫn bị từ chối, mã hết hạn/replay sai; reset test atomic, giữ tài khoản và audit theo chính sách.

**Rollback:** revert patch trên nhánh test; migration dùng forward fix hoặc restore staging đã kiểm chứng, không xóa ledger. **Kết quả thực tế:** OPEN, Claude điền log.

### RE-005 --- P1 --- Bắt buộc giới hạn LLM

Dẫn chứng: [src/lib/billing/run-gate.ts:32--41](https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/93bee64682593867dbd00e0312522a11918261e6/src/lib/billing/run-gate.ts#L32-L41).

``` text
32:     if (json.stream === true) return { model, chars: 0, problem: "Cửa trả theo lượt chưa hỗ trợ stream." };
33:     // Kiểm toán R3-002: có ghi giới hạn thì phải là số nguyên 1–8192 (trước đây «abc», -1, 1.5 đều lọt).
34:     // Không ghi thì vẫn nhận như cũ (mọi lệnh của app đều ghi; khi nhà không trả usage, phần trừ tính theo mức trần 8192).
35:     const rawCap = json.max_completion_tokens ?? json.max_tokens;
36:     if (rawCap !== undefined && rawCap !== null) {
37:       const cap = Number(rawCap);
38:       if (typeof rawCap !== "number" || !Number.isInteger(cap) || cap < 1) return { model, chars: 0, problem: "Số token trả lời tối đa không hợp lệ." };
39:       if (cap > MAX_COMPLETION_TOKENS) return { model, chars: 0, problem: "Số token trả lời tối đa quá lớn." };
40:     }
41:     return { model, chars: 0, problem: null };
```

**Nguyên nhân/rủi ro:** Cap vắng/null vẫn được nhận; chưa đảm bảo body gửi upstream có cap.

**Sửa và kết quả kỳ vọng:** Chuẩn hóa body theo provider; default cap hữu hạn, kiểm tra cả hai trường và xung đột; dùng cùng cap cho reserve; giới hạn input.

**Nghiệm thu:** Missing/null/âm/chuỗi/thập phân/8193/conflict; mock upstream xác nhận cap thật, không chỉ validator.

**Rollback:** revert patch trên nhánh test; migration dùng forward fix hoặc restore staging đã kiểm chứng, không xóa ledger. **Kết quả thực tế:** OPEN, Claude điền log.

### RE-006 --- P1 --- Hoa hồng lịch sử

Dẫn chứng: [src/lib/affiliate-payout.ts:50--74](https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/93bee64682593867dbd00e0312522a11918261e6/src/lib/affiliate-payout.ts#L50-L74).

``` text
50: /** Admin xác nhận đã chuyển tiền. Lệnh không còn chờ chuyển (đã hủy, đã chi) thì báo lỗi, không đụng khoản nào. */
51: export async function markPayoutWith(sql: Sql, id: number, ref: string) {
52:   return inTransaction(sql, async (tx) => {
53:     const done = await tx<{ affiliate_id: string }>`
54:       update affiliate_payouts set status = 'da-chi', paid_ref = ${ref}, paid_at = now()
55:       where id = ${id} and status = 'cho-chi' returning affiliate_id`;
56:     if (!done.length) throw new Error("Lệnh rút này không còn chờ chuyển (đã chi hoặc đã hủy).");
57:     await tx`
58:       update commission_events set status = 'da-chi'
59:       where status = 'cho-rut' and (payout_id = ${id} or (payout_id is null and affiliate_id = ${done[0].affiliate_id}))`;
60:     return { ok: true as const };
61:   });
62: }
63: 
64: /** Admin từ chối lệnh rút: trả đúng các khoản của lệnh đó về «Rút được». */
65: export async function cancelPayoutWith(sql: Sql, id: number, note: string) {
66:   return inTransaction(sql, async (tx) => {
67:     const rows = await tx<{ affiliate_id: string }>`
68:       update affiliate_payouts set status = 'huy', note = ${note}
69:       where id = ${id} and status = 'cho-chi' returning affiliate_id`;
70:     if (rows.length) {
71:       await tx`
72:         update commission_events set status = 'da-duyet', payout_id = null
73:         where status = 'cho-rut' and (payout_id = ${id} or (payout_id is null and affiliate_id = ${rows[0].affiliate_id}))`;
74:     }
```

**Nguyên nhân/rủi ro:** Fallback payout_id null theo affiliate có thể đụng khoản không thuộc lệnh.

**Sửa và kết quả kỳ vọng:** Đối soát read-only, backfill chỉ mapping chắc chắn, cách ly mơ hồ để Chủ duyệt; bỏ fallback rộng sau migration; kiểm tra tổng khoản đúng số tiền lệnh.

**Nghiệm thu:** Fixture nhiều lệnh cũ, null, hủy/chi đồng thời; không thay đổi lịch sử đã chi; tổng trước/sau khớp.

**Rollback:** revert patch trên nhánh test; migration dùng forward fix hoặc restore staging đã kiểm chứng, không xóa ledger. **Kết quả thực tế:** OPEN, Claude điền log.

## 4. Xử lý toàn bộ mục chưa đóng và tái nghiệm thu

23 mục chưa giải quyết theo báo cáo nguồn. Không coi BLOCKED/DEFERRED là hoàn thành. BY_DESIGN vẫn cần xác nhận giới hạn chi phí và UX; không thay đổi chủ đích nếu không có lý do. 54 mục FIXED\_\* phải chạy lại, ưu tiên FIXED_CODE (23 mục thiếu test riêng). 3 mục còn lại kiểm chứng lý do đóng.

-   **MAIN-038 --- P1 --- Thứ tự tiêu Token** (NEEDS_OWNER). Nguồn cũ: `src/lib/billing/token-flow.ts`. Nguyên nhân: Sắp xếp grant_id thay vì hạn. Hậu quả: Token sắp hết hạn bị bỏ lại. Hướng sửa/nghiệm thu: Thực hiện quyết định tương ứng tại mục 2, kiểm thử trước/sau và đối soát dữ liệu.

-   **AZ-002 --- P1 --- Lịch sử Android lẫn tài khoản** (BLOCKED). Nguồn cũ: `android/app/src/main/java/vn/tyzo/sub/Session.kt`. Nguyên nhân: File phiên không có owner; unlink không clear; sync dùng token hiện tại. Hậu quả: Phiên chưa sync của A có thể gửi vào B. Hướng sửa/nghiệm thu: Namespace lịch sử Android theo user; logout cách ly hàng đợi; test A/B offline.

-   **AZ-003 --- P1 --- Race lưu và sync Android** (BLOCKED). Nguồn cũ: `android/app/src/main/java/vn/tyzo/sub/Session.kt`. Nguyên nhân: Đọc JSON rồi đọc file lần nữa; ghi lại JSON cũ sau network. Hậu quả: Ghi đè phiên mới hoặc ghép ID cũ với cue mới. Hướng sửa/nghiệm thu: Serialize sync hoặc optimistic version; test lưu mới trong khi sync cũ.

-   **AZ-004 --- P1 --- Báo sync dù server không lưu** (BLOCKED). Nguồn cũ: `android/app/src/main/java/vn/tyzo/sub/Api.kt`. Nguyên nhân: Không kiểm saved trong response 200; server có saved:false. Hậu quả: Lịch sử không lên server nhưng local đánh synced. Hướng sửa/nghiệm thu: Chỉ ack khi saved=true; retry có idempotency.

-   **AZ-006 --- P1 --- HMAC quét đêm không gắn body** (DEFERRED). Nguồn cũ: `src/lib/sweep-sign.ts`. Nguyên nhân: Chỉ ký timestamp, không nonce/body. Hậu quả: Chữ ký bị thu được có thể replay hoặc đổi cursor trong cửa sổ. Hướng sửa/nghiệm thu: HMAC gắn method/path/body hash/timestamp/nonce; chống replay.

-   **AZ-008 --- P2 --- Gỡ thiết bị báo thành công khi offline** (BLOCKED). Nguồn cũ: `android/app/src/main/java/vn/tyzo/sub/MainActivity.kt`. Nguyên nhân: Api.unlink nuốt lỗi; UI xóa token ngay. Hậu quả: Khóa máy server vẫn hiệu lực tới khi revoke/expiry. Hướng sửa/nghiệm thu: Offline unlink phải pending, không báo thành công giả.

-   **DEEP-003 --- P1 --- Chi phí streaming suy ra từ Token thực thu** (DEFERRED). Nguồn cũ: `src/lib/live/live-billing.ts`. Nguyên nhân: Bỏ qua base của charge; close quy đổi charged bằng giá Turbo hiện tại.. Hậu quả: Thiếu chi phí khi thu thiếu hoặc giá thay đổi; làm tròn sai số.. Hướng sửa/nghiệm thu: Ghi usage upstream độc lập Token thu, reconcile theo request ID.

-   **R3-001 --- P0 --- Groq/Alibaba gọi trước khi reserve riêng** (NEEDS_OWNER). Nguồn cũ: `src/lib/billing/run-gate.ts`. Nguyên nhân: ticketLive chỉ kiểm held \> 0; send trước charge, không claim ngân sách. Hậu quả: Nhiều request đồng thời có thể vượt hold và vẫn trả kết quả. Hướng sửa/nghiệm thu: Thực hiện quyết định tương ứng tại mục 2, kiểm thử trước/sau và đối soát dữ liệu.

-   **R3-003 --- P1 --- Giá chat thiếu một chiều vẫn được mở** (NEEDS_OWNER). Nguồn cũ: `src/lib/billing/run-bill.ts`. Nguyên nhân: Thiếu giá và giá miễn phí bị quy về 0 giống nhau. Hậu quả: Có thể ghi thiếu chi phí nếu bảng giá thiếu input hoặc output. Hướng sửa/nghiệm thu: Thực hiện quyết định tương ứng tại mục 2, kiểm thử trước/sau và đối soát dữ liệu.

-   **R3-006 --- P2 --- Android updater có race đăng ký receiver** (BLOCKED). Nguồn cũ: `android/app/src/main/java/vn/tyzo/sub/Updater.kt`. Nguyên nhân: enqueue trước registerReceiver; trạng thái chỉ trong RAM. Hậu quả: Có thể bỏ lỡ thông báo hoàn thành hoặc mất trạng thái sau process death. Hướng sửa/nghiệm thu: Đăng ký receiver trước download, kiểm tra trạng thái khi resume.

-   **R3-008 --- P1 --- Gateway tin IP header nếu proxy không chuẩn hóa** (BLOCKED). Nguồn cũ: `src/lib/app-link.server.ts`. Nguyên nhân: Lấy phần tử đầu x-forwarded-for do request cung cấp. Hậu quả: Rate theo IP và bằng chứng rủi ro có thể sai nếu ingress không ghi đè header. Hướng sửa/nghiệm thu: Xác minh trusted proxy, bỏ header giả từ client; test staging.

-   **R3-009 --- P1 --- Giá ASR fallback theo kết quả thiếu duration** (DEFERRED). Nguồn cũ: `src/lib/billing/run-gate.ts`. Nguyên nhân: Duration/segment end từ response, fallback 0 khi thiếu; không đối chiếu audio thực. Hậu quả: Có thể ghi thiếu chi phí khi response thành công nhưng thiếu metadata. Hướng sửa/nghiệm thu: Duration audio xác thực phía server; usage thiếu phải reconcile, không mặc định 0.

-   **R4-003 --- P1 --- Reset không đồng bộ sổ chi phí provider** (NEEDS_OWNER). Nguồn cũ: `src/lib/payment/pay-flow.ts`. Nguyên nhân: wipeTestData không xóa provider_spend (migration 0030), nhưng xóa doanh thu. Hậu quả: Báo cáo staging sau reset có thể còn chi phí cũ. Hướng sửa/nghiệm thu: Thực hiện quyết định tương ứng tại mục 2, kiểm thử trước/sau và đối soát dữ liệu.

-   **R5-005 --- P1 --- Hoa hồng gói dùng giá mặc định thay vì giá đơn** (NEEDS_OWNER). Nguồn cũ: `src/lib/payment/pay-flow.ts`. Nguyên nhân: Ledger dùng order.amount nhưng accruePlan dùng plan.price. Hậu quả: Hoa hồng sai khi Chủ chỉnh giá hoặc đơn giữ giá cũ. Hướng sửa/nghiệm thu: Thực hiện quyết định tương ứng tại mục 2, kiểm thử trước/sau và đối soát dữ liệu.

-   **R5-006 --- P1 --- Hoa hồng lỗi sau thanh toán không có retry tại luồng này** (DEFERRED). Nguồn cũ: `src/lib/payment/pay-flow.ts`. Nguyên nhân: Đơn đã paid trước accrue; catch bỏ lỗi; replay đơn paid không chạy lại nhánh này. Hậu quả: CTV có thể mất hoa hồng nếu lỗi tạm thời. Hướng sửa/nghiệm thu: Outbox hoa hồng atomic với thanh toán, retry idempotent.

-   **R5-008 --- P1 --- Bản lưu phụ đề không có namespace tài khoản** (DEFERRED). Nguồn cũ: `src/lib/saved-runs.ts`. Nguyên nhân: SavedRun và lookup chỉ có key/source, không có account; cần kiểm logout và caller. Hậu quả: Thiết bị dùng chung có nguy cơ khôi phục phụ đề tài khoản khác. Hướng sửa/nghiệm thu: Namespace IndexedDB theo account, migration không gán nhầm dữ liệu cũ.

-   **R6-006 --- P1 --- Không dọn key R2 khi PUT thất bại** (DEFERRED). Nguồn cũ: `src/lib/sub/r2-upload-run.ts`. Nguyên nhân: Key chỉ trả về sau PUT thành công; caller không biết key nếu response mất. Hậu quả: Object đã ghi có thể tồn tại đến lifecycle; lifecycle chưa xác minh. Hướng sửa/nghiệm thu: Cleanup key R2 kể cả PUT lỗi/mất phản hồi; TTL orphan.

-   **R7-001 --- P1 --- Trau chuốt chấp nhận đảo nghĩa và số** (NEEDS_DESIGN). Nguồn cũ: `src/lib/sub/polish.ts`. Nguyên nhân: Judge chỉ kiểm rỗng, refusal, placeholder và độ dài. Hậu quả: thay đổi dữ kiện mà vẫn báo changed. Hướng sửa/nghiệm thu: Bảo toàn số, phủ định, tên, glossary; fallback bản gốc nếu không chắc; corpus đa ngôn ngữ.

-   **R7-003 --- P2 --- Glossary lỗi không báo tại worker** (DEFERRED). Nguồn cũ: `src/lib/pipeline/translate.ts`. Nguyên nhân: Không kiểm pack.error; catch fallback im lặng. Hậu quả: dịch thiếu thuật ngữ mà khách không biết. Hướng sửa/nghiệm thu: Thông báo glossary lỗi và retry có giới hạn.

-   **R7-006 --- P1 --- Dừng TTS không quyết toán promise phát** (NEEDS_BROWSER_VERIFY). Nguồn cũ: `src/lib/sub/narration.ts`. Nguyên nhân: stop pause và xóa src nhưng playUrl chỉ resolve onended hoặc reject onerror. Hậu quả: promise có thể treo khi dừng hoặc handler bị thay thế. Hướng sửa/nghiệm thu: Resolve/reject promise khi stop, abort TTS, test browser.

-   **R8-003 --- P1 --- Preview build chạy migration trên DB chung** (NEEDS_OWNER). Nguồn cũ: `scripts/migrate.mjs`. Nguyên nhân: Build gắn migration; comment xác nhận preview dùng DB chung. Hậu quả: preview có thể thay đổi schema production nếu cùng URL. Hướng sửa/nghiệm thu: Thực hiện quyết định tương ứng tại mục 2, kiểm thử trước/sau và đối soát dữ liệu.

-   **R8-004 --- P2 --- Tự reload khi đang chạy tác vụ** (DEFERRED). Nguồn cũ: `src/components/stale-build-guard.tsx`. Nguyên nhân: Reload không kiểm active job tại handler. Hậu quả: mất tiến độ chưa checkpoint nếu chunk lỗi khi dịch. Hướng sửa/nghiệm thu: Hoãn reload khi job active hoặc checkpoint an toàn.

-   **R8-005 --- P2 --- Workflow Android cấp quyền ghi cho cả job** (DEFERRED). Nguồn cũ: `.github/workflows/android-thu.yml`. Nguyên nhân: contents write ở workflow; actions dùng tag. Hậu quả: tăng phạm vi ảnh hưởng nếu dependency CI bị xâm phạm. Hướng sửa/nghiệm thu: Quyền workflow tối thiểu theo job; tách publish.

## 5. Thứ tự thực hiện và release gate

  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Giai đoạn               Công việc                                                                   Gate
  ----------------------- --------------------------------------------------------------------------- -----------------------------------------------------------------------------------------------------------
  0                       Pin commit, cài dependency lockfile, inventory, chạy baseline               Log đầy đủ, không secrets

  1                       RE-001--004, tất cả P0 cũ, transaction và idempotency                       PostgreSQL thật đa kết nối, fault injection, restore drill

  2                       RE-005--006, 23 mục mở, bảo mật và Android                                  Test account isolation, auth, webhook, migration, Android SDK/device

  3                       ASR/LLM/TTS, RAM, streaming, UX, recovery                                   Corpus chất lượng, p50/p95/p99, cost, peak RAM; mục tiêu phụ đề dưới 1 giây phải đo, không hứa

  4                       Tái kiểm 80 mục, audit từng file còn thiếu, dependency, secrets, Graphify   Build/typecheck/lint/test đầy đủ, Graphify đúng HEAD, không P0/P1 chưa xử lý hoặc chưa được Chủ chấp nhận

  5                       Bàn giao                                                                    Diff, commit, log trước/sau, rollback, danh sách blocker, không deploy tự động
  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

### Kiểm thử bắt buộc

-   PostgreSQL: migration từ snapshot schema cũ và DB trống, rollback drill, multi-connection, crash giữa reserve/upstream/settle, payment webhook trùng và lệch thứ tự, payout và owner transfer đồng thời, expiry và ledger reconciliation. Dùng dữ liệu giả.
-   Web: Playwright desktop/mobile, đăng nhập/đăng xuất, đổi account, Studio hủy A chạy B, reload, mạng chậm, R2 lỗi, live WS backpressure và close; không mất phụ đề sửa tay.
-   Android: build/lint/unit/instrumentation, offline sync A/B, unlink, updater, revoke session; thiếu SDK ghi BLOCKED.
-   GPU: staging có giới hạn ngân sách được Chủ duyệt; mock trước, đo end-to-end từ audio tới subtitle, ASR/LLM riêng, cold/warm, concurrent, cost, retry, cancel. Không gọi GPU trả phí không giới hạn.
-   Security: RBAC, CSRF, session revoke, webhook signature/replay, body limit trước allocation, secret scan, trusted proxy, dependency cycles. Scan tool exit code phải phản ánh lỗi.
-   Maintenance: cập nhật docs, backup/restore, metrics, cảnh báo spend/short, job treo, queue; không log PII/secrets; Graphify regenerate theo commit mới, xuất 3 file.

### Mẫu báo cáo bắt buộc cho mỗi task

ID; priority; status OPEN/REPRODUCED/FIXED_CODE/FIXED_TESTED/VERIFIED/BLOCKED/BY_DESIGN; baseline commit; path:line; evidence trước; nguyên nhân; lý do; patch; ảnh hưởng; test command; expected; actual trước/sau; log path; commit; rollback; blocker; người duyệt. Không ghi VERIFIED nếu thiếu bằng chứng. Nếu test không tái hiện, ghi rõ điều kiện và lý do, không xóa hồ sơ.

## 6. Phụ lục --- 80 hồ sơ nguồn nguyên trạng

Dữ liệu dưới đây được trích nguyên từ docs/kiem-toan/v5.49/KET_QUA.json của ZIP hiện tại. Các trạng thái là báo cáo của Claude, không phải xác nhận độc lập. Link baseline cũ được giữ để so sánh. Các RE có thể trùng nguyên nhân với ID cũ: liên kết thay vì đếm thành lỗi độc lập.

``` json
[
  {
    "id": "MAIN-023",
    "priority": "P0",
    "title": "Giữ ngân sách riêng từng đoạn",
    "path": "src/lib/billing/tyzo-modal-charge.ts",
    "line": 45,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/billing/tyzo-modal-charge.ts#L43-L48",
    "root_cause": "Chỉ so held, không trừ phần đang đặt chỗ",
    "impact": "Tổng dự toán nhiều GPU vượt hold",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "3622bcc",
    "result_fix": "Giữ riêng ước tính từng đoạn: run_tickets.modal_reserved; đoạn mới chỉ gọi GPU khi held − modal_reserved ≥ ước tính (một câu lệnh).",
    "result_test": "src/lib/billing/tyzo-modal-race.test.ts (Postgres 16 thật, 12 kết nối)",
    "result_before": "9/9 đoạn được gọi GPU khi hold chỉ đủ 3 (docs/kiem-toan/v5.49/bang-chung/modal-before.log)",
    "result_after": "≤3 đoạn, modal_reserved về 0 sau cùng (docs/kiem-toan/v5.49/bang-chung/modal-after-pg.log)",
    "result_note": ""
  },
  {
    "id": "MAIN-024",
    "priority": "P0",
    "title": "Quyết toán và lưu kết quả",
    "path": "src/lib/billing/tyzo-modal-charge.ts",
    "line": 62,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/billing/tyzo-modal-charge.ts#L60-L65",
    "root_cause": "Charge, short, lưu kết quả là các SQL riêng",
    "impact": "Crash gây pending hoặc trừ tiền nhưng mất kết quả",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "3622bcc",
    "result_fix": "Trừ Token + ghi modal_short + nhả phần giữ + lưu chữ trong MỘT giao dịch (inTransaction); lỗi thì bỏ đoạn, trả thời lượng.",
    "result_test": "tyzo-modal-race.test.ts: trigger giả lập lỗi lưu kết quả",
    "result_before": "held 88, charged 12 dù lưu chữ lỗi",
    "result_after": "held 100, charged 0, đoạn bị bỏ để gửi lại",
    "result_note": ""
  },
  {
    "id": "MAIN-036",
    "priority": "P0",
    "title": "Đóng phiếu đang chạy",
    "path": "src/lib/billing/token-flow.ts",
    "line": 151,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/billing/token-flow.ts#L149-L154",
    "root_cause": "Close hoàn hold không phối hợp trạng thái part",
    "impact": "GPU chạy xong nhưng không thu đủ",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "3622bcc",
    "result_fix": "closeTokenWith: còn đoạn Modal đang chạy (≤15 phút) thì ghi close_wanted, đoạn cuối quyết toán xong mới đóng; force cho Admin/phiếu treo 6 giờ.",
    "result_test": "tyzo-modal-race.test.ts",
    "result_before": "đóng phiếu giữa chừng: tokens 0, short 12 (GPU chạy không thu)",
    "result_after": "tokens 12, short 0; phiếu đóng sau đoạn cuối, dư trả về gói",
    "result_note": ""
  },
  {
    "id": "SPLIT-008",
    "priority": "P0",
    "title": "Worker dịch trùng",
    "path": "src/lib/pipeline/translate.ts",
    "line": 126,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/pipeline/translate.ts#L124-L129",
    "root_cause": "Claim busy sau await",
    "impact": "Gọi AI trùng, ghi đè kết quả",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "2ce19fd",
    "result_fix": "Đánh dấu busy ngay sau khi lấy lô, trước await ensureChatTicket (finally gỡ busy). R7-004: câu khách sửa tay không cộng vào thống kê model.",
    "result_test": "src/lib/pipeline/translate-claim.test.ts (mock module groq)",
    "result_before": "6 câu gửi dịch 4 lần (docs/kiem-toan/v5.49/bang-chung/split008-before.log)",
    "result_after": "mỗi câu gửi 1 lần (docs/kiem-toan/v5.49/bang-chung/split008-after.log)",
    "result_note": ""
  },
  {
    "id": "REF-013",
    "priority": "P0",
    "title": "Restore bỏ qua lỗi",
    "path": "deploy/vps/tyzo.sh",
    "line": 691,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/deploy/vps/tyzo.sh#L689-L694",
    "root_cause": "|| true che mã lỗi restore",
    "impact": "Mất dữ liệu hoặc báo thành công sai",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "17f3351",
    "result_fix": "nap_dump: kiểm mục lục tệp, nạp vào CSDL tạm tyzo_moi, đủ bảng mới đổi tên; lỗi pg_restore thì hỏi; CSDL cũ giữ tyzo_cu_<giờ>. chep_tu_neon đọc Neon xong mới đụng VPS; khoi_phuc, khoi_phuc_vps dùng nap_dump; chep_len_neon kiểm đủ bảng.",
    "result_test": "Diễn tập trên Postgres 16 cục bộ với docker giả (docs/kiem-toan/v5.49/bang-chung/restore-drill.log, restore-drill-harness.sh)",
    "result_before": "Tệp hỏng: 7 bảng → 0 bảng (mất dữ liệu)",
    "result_after": "Tệp hỏng/trống/cụt: dữ liệu giữ nguyên; tệp tốt: 8 bảng, bản cũ còn, quay về được",
    "result_note": ""
  },
  {
    "id": "AZ-001",
    "priority": "P0",
    "title": "Restore gói chuyển máy cũng bỏ qua lỗi",
    "path": "deploy/vps/tyzo.sh",
    "line": 884,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/deploy/vps/tyzo.sh#L882-L887",
    "root_cause": "Xóa schema rồi restore || true; kiểm tra số bảng",
    "impact": "Mất dữ liệu khi chuyển máy",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "17f3351",
    "result_fix": "nap_dump: kiểm mục lục tệp, nạp vào CSDL tạm tyzo_moi, đủ bảng mới đổi tên; lỗi pg_restore thì hỏi; CSDL cũ giữ tyzo_cu_<giờ>. chep_tu_neon đọc Neon xong mới đụng VPS; khoi_phuc, khoi_phuc_vps dùng nap_dump; chep_len_neon kiểm đủ bảng.",
    "result_test": "Diễn tập trên Postgres 16 cục bộ với docker giả (docs/kiem-toan/v5.49/bang-chung/restore-drill.log, restore-drill-harness.sh)",
    "result_before": "Tệp hỏng: 7 bảng → 0 bảng (mất dữ liệu)",
    "result_after": "Tệp hỏng/trống/cụt: dữ liệu giữ nguyên; tệp tốt: 8 bảng, bản cũ còn, quay về được",
    "result_note": ""
  },
  {
    "id": "MAIN-042",
    "priority": "P0",
    "title": "Chuyển Chủ không nguyên tử",
    "path": "src/lib/admin/admin-allow.server.ts",
    "line": 97,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/admin/admin-allow.server.ts#L95-L100",
    "root_cause": "Cấp Chủ mới và hạ Chủ cũ bằng SQL riêng",
    "impact": "Nhiều Chủ hoặc trạng thái nửa chừng",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_TESTED",
    "result_commit": "ee37429",
    "result_fix": "Một câu lệnh CTE: chỉ chạy khi người chuyển còn là Chủ (khóa dòng), cấp mới và hạ cũ cùng lúc.",
    "result_test": "src/lib/admin/admin-allow.test.ts (+2 test)",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "MAIN-038",
    "priority": "P1",
    "title": "Thứ tự tiêu Token",
    "path": "src/lib/billing/token-flow.ts",
    "line": 116,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/billing/token-flow.ts#L114-L119",
    "root_cause": "Sắp xếp grant_id thay vì hạn",
    "impact": "Token sắp hết hạn bị bỏ lại",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "NEEDS_OWNER",
    "result_commit": "",
    "result_fix": "Trừ phiếu theo grant_id; đề xuất theo hạn gần nhất (có lợi cho khách). Là quy tắc Token.",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Cần Chủ quyết (đụng nghiệp vụ hoặc có thể chặn khách hợp lệ)"
  },
  {
    "id": "MAIN-039",
    "priority": "P1",
    "title": "Chỉnh số dư đồng thời",
    "path": "src/lib/billing/token-flow.ts",
    "line": 209,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/billing/token-flow.ts#L207-L212",
    "root_cause": "Đọc số dư rồi tính delta",
    "impact": "Hai admin có thể chỉnh sai số dư",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "ae2048d",
    "result_fix": "setTokenBalanceWith: giao dịch + khóa advisory theo khách + khóa các gói.",
    "result_test": "src/lib/billing/token-balance-race.test.ts (Postgres thật)",
    "result_before": "3 lần đặt 100 cùng lúc → 220 ở 18/20 lượt (docs/kiem-toan/v5.49/bang-chung/main039-before.log)",
    "result_after": "luôn 100 (docs/kiem-toan/v5.49/bang-chung/main039-after.log)",
    "result_note": ""
  },
  {
    "id": "MAIN-040",
    "priority": "P1",
    "title": "Ghi chi phí GPU đã bổ sung",
    "path": "src/lib/tyzo-modal-call.ts",
    "line": 55,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/tyzo-modal-call.ts#L53-L58",
    "root_cause": "Trước đây thiếu ghi spend; nay có gọi hàm",
    "impact": "Còn cần đối soát retry và lỗi ghi",
    "audit_status": "FIXED_CODE",
    "result_status": "VERIFIED_ALREADY_FIXED",
    "result_commit": "48b6a19",
    "result_fix": "tyzo-modal-call.ts gọi recordSpendWith cho mỗi đoạn chạy mới.",
    "result_test": "đọc mã",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "NEW-001",
    "priority": "P1",
    "title": "Script tổng hợp mất exit code",
    "path": "scripts/tools/cong-cu.sh",
    "line": 59,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/scripts/tools/cong-cu.sh#L57-L61",
    "root_cause": "Lệnh cuối quyết định exit",
    "impact": "Quét lỗi nhưng pipeline báo thành công",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_TESTED",
    "result_commit": "ae2048d",
    "result_fix": "cong-cu.sh: tat-ca giữ mã lỗi đầu tiên; semgrep --error và trả mã thật; luật phải đúng commit ghim.",
    "result_test": "chạy thật: bao-mat trả exit 1 khi có phát hiện (docs/kiem-toan/v5.49/bang-chung/../TOOLS.md)",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "NEW-002",
    "priority": "P1",
    "title": "Semgrep không gate đúng",
    "path": "scripts/tools/cong-cu.sh",
    "line": 42,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/scripts/tools/cong-cu.sh#L40-L45",
    "root_cause": "Không --error; echo cuối che lỗi thực thi",
    "impact": "Bỏ qua phát hiện hoặc lỗi scanner",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_TESTED",
    "result_commit": "ae2048d",
    "result_fix": "cong-cu.sh: tat-ca giữ mã lỗi đầu tiên; semgrep --error và trả mã thật; luật phải đúng commit ghim.",
    "result_test": "chạy thật: bao-mat trả exit 1 khi có phát hiện (docs/kiem-toan/v5.49/bang-chung/../TOOLS.md)",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "NEW-004",
    "priority": "P1",
    "title": "Allowlist rộng",
    "path": ".gitleaks.toml",
    "line": 12,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/.gitleaks.toml#L10-L12",
    "root_cause": "Regex toàn dòng không giới hạn test",
    "impact": "Bí mật thật bị bỏ qua",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_TESTED",
    "result_commit": "ae2048d 29e6c06",
    "result_fix": "Allowlist gitleaks chỉ đúng chuỗi giả trong đúng tệp test; thêm .output (bản dựng, không trong kho).",
    "result_test": "gitleaks dir: no leaks; gitleaks git: no leaks",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "NEW-007",
    "priority": "P2",
    "title": "Rules không đúng commit",
    "path": "scripts/tools/cong-cu.sh",
    "line": 41,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/scripts/tools/cong-cu.sh#L39-L44",
    "root_cause": "Checkout lỗi bị bỏ qua",
    "impact": "Quét không tái lập",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_TESTED",
    "result_commit": "ae2048d",
    "result_fix": "cong-cu.sh: tat-ca giữ mã lỗi đầu tiên; semgrep --error và trả mã thật; luật phải đúng commit ghim.",
    "result_test": "chạy thật: bao-mat trả exit 1 khi có phát hiện (docs/kiem-toan/v5.49/bang-chung/../TOOLS.md)",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "NEW-008",
    "priority": "P1",
    "title": "CSS deploy chưa được nghiệm thu",
    "path": "scripts/fix-css-ref.mjs",
    "line": 16,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/scripts/fix-css-ref.mjs#L14-L19",
    "root_cause": "Bỏ qua nếu số CSS không đúng 1",
    "impact": "Trang có thể thiếu stylesheet",
    "audit_status": "RISK",
    "result_status": "FIXED_TESTED",
    "result_commit": "6a768a3",
    "result_fix": "fix-css-ref: kiểm lại sau sửa; còn chỗ trỏ tới CSS không có thì exit 1 (VPS giữ bản cũ).",
    "result_test": "2 ca thử: 1 tệp CSS → sửa đúng, exit 0; 2 tệp + trỏ sai → exit 1; bản dựng node-server thật exit 0",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "AZ-002",
    "priority": "P1",
    "title": "Lịch sử Android lẫn tài khoản",
    "path": "android/app/src/main/java/vn/tyzo/sub/Session.kt",
    "line": 35,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/android/app/src/main/java/vn/tyzo/sub/Session.kt#L33-L38",
    "root_cause": "File phiên không có owner; unlink không clear; sync dùng token hiện tại",
    "impact": "Phiên chưa sync của A có thể gửi vào B",
    "audit_status": "RISK",
    "result_status": "BLOCKED",
    "result_commit": "",
    "result_fix": "",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Bị chặn: môi trường không có Android SDK/thiết bị để dựng và chạy ứng dụng"
  },
  {
    "id": "AZ-003",
    "priority": "P1",
    "title": "Race lưu và sync Android",
    "path": "android/app/src/main/java/vn/tyzo/sub/Session.kt",
    "line": 39,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/android/app/src/main/java/vn/tyzo/sub/Session.kt#L37-L42",
    "root_cause": "Đọc JSON rồi đọc file lần nữa; ghi lại JSON cũ sau network",
    "impact": "Ghi đè phiên mới hoặc ghép ID cũ với cue mới",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "BLOCKED",
    "result_commit": "",
    "result_fix": "",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Bị chặn: môi trường không có Android SDK/thiết bị để dựng và chạy ứng dụng"
  },
  {
    "id": "AZ-004",
    "priority": "P1",
    "title": "Báo sync dù server không lưu",
    "path": "android/app/src/main/java/vn/tyzo/sub/Api.kt",
    "line": 95,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/android/app/src/main/java/vn/tyzo/sub/Api.kt#L93-L98",
    "root_cause": "Không kiểm saved trong response 200; server có saved:false",
    "impact": "Lịch sử không lên server nhưng local đánh synced",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "BLOCKED",
    "result_commit": "",
    "result_fix": "",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Bị chặn: môi trường không có Android SDK/thiết bị để dựng và chạy ứng dụng"
  },
  {
    "id": "AZ-005",
    "priority": "P1",
    "title": "Giới hạn body sau khi đọc",
    "path": "src/lib/app-api.server.ts",
    "line": 26,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/app-api.server.ts#L24-L29",
    "root_cause": "Content-Length tùy chọn; đọc toàn bộ trước kiểm",
    "impact": "Request lớn có thể gây RAM cao nếu proxy không chặn",
    "audit_status": "RISK",
    "result_status": "FIXED_CODE",
    "result_commit": "b692474",
    "result_fix": "readJson đọc luồng có trần (readCapped), dừng khi vượt.",
    "result_test": "tsc, lint, npm test",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "AZ-006",
    "priority": "P1",
    "title": "HMAC quét đêm không gắn body",
    "path": "src/lib/sweep-sign.ts",
    "line": 8,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/sweep-sign.ts#L6-L11",
    "root_cause": "Chỉ ký timestamp, không nonce/body",
    "impact": "Chữ ký bị thu được có thể replay hoặc đổi cursor trong cửa sổ",
    "audit_status": "RISK",
    "result_status": "DEFERRED",
    "result_commit": "",
    "result_fix": "Ký thêm thân và nonce cần sửa cả script trên VPS; phát lại chỉ chạy lại quét đêm (đã ghi nhận quét idempotent trong 5 phút).",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Hoãn (P1/P2, cần thiết kế hoặc thử ngoài môi trường này)"
  },
  {
    "id": "AZ-007",
    "priority": "P2",
    "title": "Đổi mã thiết bị không nguyên tử",
    "path": "src/lib/app-link.server.ts",
    "line": 37,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/app-link.server.ts#L35-L40",
    "root_cause": "Xóa mã trước insert thiết bị",
    "impact": "Lỗi insert làm mất mã dù chưa link",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_CODE",
    "result_commit": "b692474",
    "result_fix": "createLinkCode: giao dịch + khóa advisory theo tài khoản; redeem: dùng mã + ghi máy trong một giao dịch.",
    "result_test": "tsc, npm test (app-link.test.ts)",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "AZ-008",
    "priority": "P2",
    "title": "Gỡ thiết bị báo thành công khi offline",
    "path": "android/app/src/main/java/vn/tyzo/sub/MainActivity.kt",
    "line": 321,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/android/app/src/main/java/vn/tyzo/sub/MainActivity.kt#L319-L324",
    "root_cause": "Api.unlink nuốt lỗi; UI xóa token ngay",
    "impact": "Khóa máy server vẫn hiệu lực tới khi revoke/expiry",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "BLOCKED",
    "result_commit": "",
    "result_fix": "",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Bị chặn: môi trường không có Android SDK/thiết bị để dựng và chạy ứng dụng"
  },
  {
    "id": "AZ-009",
    "priority": "P2",
    "title": "Lỗi nội bộ trả ra client",
    "path": "src/lib/app-api.server.ts",
    "line": 17,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/app-api.server.ts#L15-L20",
    "root_cause": "Trả error.message trực tiếp và mặc định 400",
    "impact": "Có thể lộ chi tiết nội bộ, sai phân loại lỗi",
    "audit_status": "RISK",
    "result_status": "FIXED_CODE",
    "result_commit": "b692474 29e6c06",
    "result_fix": "failFrom: chỉ trả nguyên câu cho lỗi có mã HTTP hoặc câu tiếng Việt; lỗi nội bộ → câu chung, 500.",
    "result_test": "tsc, lint",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "AZ-010",
    "priority": "P2",
    "title": "Test hiện hữu không nằm trong npm test",
    "path": "package.json",
    "line": 22,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/package.json#L20-L25",
    "root_cause": "Danh sách test thủ công bỏ 5 file",
    "impact": "Regression không được chạy mặc định",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_TESTED",
    "result_commit": "ae2048d",
    "result_fix": "Thêm 5 tệp test bị sót vào npm test; scripts/test-list.test.mjs chặn sót về sau.",
    "result_test": "npm test",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "DEEP-001",
    "priority": "P0",
    "title": "Streaming đóng phiếu trước khi quyết toán xong",
    "path": "src/lib/live/live-bridge.ts",
    "line": 185,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/live/live-bridge.ts#L185-L203",
    "root_cause": "finalize không chờ các handler usage bất đồng bộ (224–245, 268).",
    "impact": "Có thể trả lại hold trước khi trừ usage; chi phí thực không thu đủ.",
    "audit_status": "RISK_CODE",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "8a3de38",
    "result_fix": "Đóng phiếu chờ các lần trừ đang chạy và lần giữ thêm; bỏ khung khi exposure ≤ 0; không nối lại sau khi đóng (giữ handle hẹn giờ); không xin giữ thêm sau khi đóng; khách rời lúc setup thì không giữ hoặc nhả ngay.",
    "result_test": "src/lib/live/live-bridge-audit.test.ts (Alibaba giả, sổ tiền giả có độ trễ)",
    "result_before": "5/5 hỏng (docs/kiem-toan/v5.49/bang-chung/live-before.log): trừ sau đóng; gửi 6 giây khi giữ 2 giây; phiếu thứ 2 không nhả; nối lại sau đóng; phiếu không nhả khi khách rời",
    "result_after": "5/5 đạt (docs/kiem-toan/v5.49/bang-chung/live-after.log)",
    "result_note": "Cần cập nhật cầu nối trên VPS (tyzo → 2)"
  },
  {
    "id": "DEEP-002",
    "priority": "P0",
    "title": "Streaming vượt ngân sách trong lúc top-up",
    "path": "src/lib/live/live-meter.ts",
    "line": 43,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/live/live-meter.ts#L43-L55",
    "root_cause": "mustStop chỉ true nếu denied; top-up pending chưa denied.",
    "impact": "Âm thanh tiếp tục gửi khi exposure âm; độ vượt phụ thuộc độ trễ DB và tốc độ gửi.",
    "audit_status": "REPRODUCED_PURE_LOGIC",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "8a3de38",
    "result_fix": "Đóng phiếu chờ các lần trừ đang chạy và lần giữ thêm; bỏ khung khi exposure ≤ 0; không nối lại sau khi đóng (giữ handle hẹn giờ); không xin giữ thêm sau khi đóng; khách rời lúc setup thì không giữ hoặc nhả ngay.",
    "result_test": "src/lib/live/live-bridge-audit.test.ts (Alibaba giả, sổ tiền giả có độ trễ)",
    "result_before": "5/5 hỏng (docs/kiem-toan/v5.49/bang-chung/live-before.log): trừ sau đóng; gửi 6 giây khi giữ 2 giây; phiếu thứ 2 không nhả; nối lại sau đóng; phiếu không nhả khi khách rời",
    "result_after": "5/5 đạt (docs/kiem-toan/v5.49/bang-chung/live-after.log)",
    "result_note": "Cần cập nhật cầu nối trên VPS (tyzo → 2)"
  },
  {
    "id": "DEEP-003",
    "priority": "P1",
    "title": "Chi phí streaming suy ra từ Token thực thu",
    "path": "src/lib/live/live-billing.ts",
    "line": 38,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/live/live-billing.ts#L38-L55",
    "root_cause": "Bỏ qua base của charge; close quy đổi charged bằng giá Turbo hiện tại.",
    "impact": "Thiếu chi phí khi thu thiếu hoặc giá thay đổi; làm tròn sai số.",
    "audit_status": "RISK_CODE",
    "result_status": "DEFERRED",
    "result_commit": "",
    "result_fix": "",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Hoãn (P1/P2, cần thiết kế hoặc thử ngoài môi trường này)"
  },
  {
    "id": "DEEP-004",
    "priority": "P1",
    "title": "Reconnect sau khi phiên đã đóng",
    "path": "src/lib/live/live-bridge.ts",
    "line": 264,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/live/live-bridge.ts#L264-L285",
    "root_cause": "setTimeout không giữ handle; connectUpstream không kiểm closed/finishing.",
    "impact": "Có thể mở upstream không còn client và hold.",
    "audit_status": "RISK_CODE",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "8a3de38",
    "result_fix": "Đóng phiếu chờ các lần trừ đang chạy và lần giữ thêm; bỏ khung khi exposure ≤ 0; không nối lại sau khi đóng (giữ handle hẹn giờ); không xin giữ thêm sau khi đóng; khách rời lúc setup thì không giữ hoặc nhả ngay.",
    "result_test": "src/lib/live/live-bridge-audit.test.ts (Alibaba giả, sổ tiền giả có độ trễ)",
    "result_before": "5/5 hỏng (docs/kiem-toan/v5.49/bang-chung/live-before.log): trừ sau đóng; gửi 6 giây khi giữ 2 giây; phiếu thứ 2 không nhả; nối lại sau đóng; phiếu không nhả khi khách rời",
    "result_after": "5/5 đạt (docs/kiem-toan/v5.49/bang-chung/live-after.log)",
    "result_note": "Cần cập nhật cầu nối trên VPS (tyzo → 2)"
  },
  {
    "id": "DEEP-005",
    "priority": "P1",
    "title": "Top-up hoàn thành sau finalize",
    "path": "src/lib/live/live-bridge.ts",
    "line": 123,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/live/live-bridge.ts#L123-L145",
    "root_cause": "opening không được await trong finalize 185–203.",
    "impact": "Phiếu mới có thể được thêm sau vòng đóng phiếu; giữ Token đến cleanup.",
    "audit_status": "RISK_CODE",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "8a3de38",
    "result_fix": "Đóng phiếu chờ các lần trừ đang chạy và lần giữ thêm; bỏ khung khi exposure ≤ 0; không nối lại sau khi đóng (giữ handle hẹn giờ); không xin giữ thêm sau khi đóng; khách rời lúc setup thì không giữ hoặc nhả ngay.",
    "result_test": "src/lib/live/live-bridge-audit.test.ts (Alibaba giả, sổ tiền giả có độ trễ)",
    "result_before": "5/5 hỏng (docs/kiem-toan/v5.49/bang-chung/live-before.log): trừ sau đóng; gửi 6 giây khi giữ 2 giây; phiếu thứ 2 không nhả; nối lại sau đóng; phiếu không nhả khi khách rời",
    "result_after": "5/5 đạt (docs/kiem-toan/v5.49/bang-chung/live-after.log)",
    "result_note": "Cần cập nhật cầu nối trên VPS (tyzo → 2)"
  },
  {
    "id": "DEEP-006",
    "priority": "P1",
    "title": "Client rời trước khi gắn close handler",
    "path": "src/lib/live/live-bridge.ts",
    "line": 108,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/live/live-bridge.ts#L108-L156",
    "root_cause": "Nhiều await trước khi gắn client.on close ở 324.",
    "impact": "Client ngắt trong lúc mở hold có thể để phiên upstream/hold tồn tại.",
    "audit_status": "RISK_CODE",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "8a3de38",
    "result_fix": "Đóng phiếu chờ các lần trừ đang chạy và lần giữ thêm; bỏ khung khi exposure ≤ 0; không nối lại sau khi đóng (giữ handle hẹn giờ); không xin giữ thêm sau khi đóng; khách rời lúc setup thì không giữ hoặc nhả ngay.",
    "result_test": "src/lib/live/live-bridge-audit.test.ts (Alibaba giả, sổ tiền giả có độ trễ)",
    "result_before": "5/5 hỏng (docs/kiem-toan/v5.49/bang-chung/live-before.log): trừ sau đóng; gửi 6 giây khi giữ 2 giây; phiếu thứ 2 không nhả; nối lại sau đóng; phiếu không nhả khi khách rời",
    "result_after": "5/5 đạt (docs/kiem-toan/v5.49/bang-chung/live-after.log)",
    "result_note": "Cần cập nhật cầu nối trên VPS (tyzo → 2)"
  },
  {
    "id": "DEEP-007",
    "priority": "P2",
    "title": "Timestamp lịch sử vượt integer DB",
    "path": "src/lib/live/live-history.ts",
    "line": 20,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/live/live-history.ts#L20-L44",
    "root_cause": "num không giới hạn trên; duration_ms là integer trong migration 0036.",
    "impact": "Dữ liệu hợp lệ theo validator có thể làm insert lỗi; duration lấy cue cuối cũng sai nếu không sắp xếp.",
    "audit_status": "REPRODUCED_PURE_LOGIC",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "b692474",
    "result_fix": "Kẹp giây ≤ 2 ngày trong cleanHistory.",
    "result_test": "live-history.test.ts (+1)",
    "result_before": "repro_live.mjs: durationMs 3.000.000.000 (tràn integer)",
    "result_after": "e = 172800 giây, lưu được",
    "result_note": ""
  },
  {
    "id": "DEEP-008",
    "priority": "P1",
    "title": "Thiếu backpressure phía bridge",
    "path": "src/lib/live/live-bridge.ts",
    "line": 308,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/live/live-bridge.ts#L308-L322",
    "root_cause": "Gửi upstream không kiểm bufferedAmount hoặc tốc độ audio theo thời gian thực.",
    "impact": "Queue có thể tăng RAM hoặc chi phí khi upstream chậm; maxPayload chỉ giới hạn từng frame.",
    "audit_status": "RISK_CODE",
    "result_status": "FIXED_CODE",
    "result_commit": "b692474",
    "result_fix": "Bỏ khung khi upstream.bufferedAmount > 1 MB, ghi nhật ký một lần.",
    "result_test": "live tests đạt; chưa đo trên mạng thật",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "DEEP-009",
    "priority": "P1",
    "title": "Vé live có thể đi qua ws không mã hóa",
    "path": "src/lib/live/live-open-rules.ts",
    "line": 24,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/live/live-open-rules.ts#L24-L35",
    "root_cause": "bridgeBase chấp nhận ws và wss; vé nằm trong query URL.",
    "impact": "Nếu production cấu hình ws hoặc log query, bearer ticket có thể lộ; chưa xác minh config thực.",
    "audit_status": "RISK_CODE",
    "result_status": "FIXED_TESTED",
    "result_commit": "b692474",
    "result_fix": "bridgeBase chỉ nhận wss; ws chỉ cho localhost/127.0.0.1/::1.",
    "result_test": "live-wire.test.ts (+2)",
    "result_before": "",
    "result_after": "",
    "result_note": "Chủ kiểm LIVE_BRIDGE_URL trên Vercel bắt đầu bằng wss://"
  },
  {
    "id": "DEEP-010",
    "priority": "P1",
    "title": "Webhook nhận JSON không giới hạn tại handler",
    "path": "src/lib/payment/pay-store.ts",
    "line": 517,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/payment/pay-store.ts#L517-L541",
    "root_cause": "request.json không có giới hạn kích thước tại đây; kiểm secret trước parse là điểm tốt.",
    "impact": "Nếu proxy không có trần phù hợp, request đã xác thực lớn gây áp lực RAM; chưa chứng minh production.",
    "audit_status": "RISK_CODE",
    "result_status": "FIXED_CODE",
    "result_commit": "b692474",
    "result_fix": "Webhook SePay/Casso đọc thân tối đa 256 KB sau khi kiểm khóa.",
    "result_test": "tsc, pay tests",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R3-001",
    "priority": "P0",
    "title": "Groq/Alibaba gọi trước khi reserve riêng",
    "path": "src/lib/billing/run-gate.ts",
    "line": 105,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/billing/run-gate.ts#L103-L109",
    "root_cause": "ticketLive chỉ kiểm held > 0; send trước charge, không claim ngân sách",
    "impact": "Nhiều request đồng thời có thể vượt hold và vẫn trả kết quả",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "NEEDS_OWNER",
    "result_commit": "",
    "result_fix": "Đề xuất: giữ ước tính từng yêu cầu ở cửa Groq/Alibaba như TyZo (cột reserved), chặn khi held − reserved < ước tính. Rủi ro: ước tính theo mức trần 8192 token có thể chặn khách hợp lệ khi phiếu nhỏ; cần số đo thật trước khi bật.",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Cần Chủ quyết (đụng nghiệp vụ hoặc có thể chặn khách hợp lệ). Gộp MAIN-041 (lịch sử)."
  },
  {
    "id": "R3-002",
    "priority": "P1",
    "title": "Giới hạn output token chưa fail closed",
    "path": "src/lib/billing/run-gate.ts",
    "line": 33,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/billing/run-gate.ts#L31-L37",
    "root_cause": "Chỉ so >8192; thiếu, NaN, âm, phân số đều qua",
    "impact": "Không đảm bảo giới hạn chi phí tại gateway; upstream có thể tự chặn",
    "audit_status": "REPRODUCED_LOGIC",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "b692474",
    "result_fix": "Giới hạn token trả lời có ghi thì phải là số nguyên 1–8192; không ghi thì như cũ (mọi lệnh của app đều ghi).",
    "result_test": "run-gate.test.ts; audit_tools/repro_cap.mjs",
    "result_before": "-1, abc, 1.5 qua (problem=null)",
    "result_after": "bị chặn; 8192 qua",
    "result_note": "Thiếu trường vẫn nhận: giữ tương thích"
  },
  {
    "id": "R3-003",
    "priority": "P1",
    "title": "Giá chat thiếu một chiều vẫn được mở",
    "path": "src/lib/billing/run-bill.ts",
    "line": 34,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/billing/run-bill.ts#L32-L38",
    "root_cause": "Thiếu giá và giá miễn phí bị quy về 0 giống nhau",
    "impact": "Có thể ghi thiếu chi phí nếu bảng giá thiếu input hoặc output",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "NEEDS_OWNER",
    "result_commit": "",
    "result_fix": "Đề xuất: model thiếu giá vào hoặc ra thì coi như chưa có giá (422). Cần Chủ xem bảng giá đang lưu có model nào chỉ ghi một chiều không, vì sửa sẽ chặn model đó.",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Cần Chủ quyết (đụng nghiệp vụ hoặc có thể chặn khách hợp lệ)"
  },
  {
    "id": "R3-004",
    "priority": "P1",
    "title": "Thu hồi thiết bị khi đổi mật khẩu có thể thất bại im lặng",
    "path": "src/lib/auth/server.ts",
    "line": 270,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/auth/server.ts#L268-L274",
    "root_cause": "Hook nuốt lỗi DB khi revoke thiết bị",
    "impact": "Khóa Android cũ có thể còn hiệu lực sau reset mật khẩu",
    "audit_status": "RISK",
    "result_status": "FIXED_CODE",
    "result_commit": "b692474",
    "result_fix": "Mật khẩu tạm: xóa session, gỡ máy Android, ghi nhật ký. Đặt lại mật khẩu: gỡ máy thử lại 1 lần và ghi nhật ký.",
    "result_test": "tsc",
    "result_before": "",
    "result_after": "",
    "result_note": "Đổi hành vi: khách bị đăng xuất khi Admin đặt mật khẩu tạm — Chủ xem có cần ghi điều khoản"
  },
  {
    "id": "R3-005",
    "priority": "P1",
    "title": "Mã liên kết mới không serialize theo tài khoản",
    "path": "src/lib/app-link.server.ts",
    "line": 22,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/app-link.server.ts#L20-L26",
    "root_cause": "Delete và insert riêng; index user_id không unique",
    "impact": "Hai yêu cầu tạo mã đồng thời có thể để lại nhiều mã chưa dùng",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_CODE",
    "result_commit": "b692474",
    "result_fix": "createLinkCode: giao dịch + khóa advisory theo tài khoản; redeem: dùng mã + ghi máy trong một giao dịch.",
    "result_test": "tsc, npm test (app-link.test.ts)",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R3-006",
    "priority": "P2",
    "title": "Android updater có race đăng ký receiver",
    "path": "android/app/src/main/java/vn/tyzo/sub/Updater.kt",
    "line": 50,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/android/app/src/main/java/vn/tyzo/sub/Updater.kt#L48-L54",
    "root_cause": "enqueue trước registerReceiver; trạng thái chỉ trong RAM",
    "impact": "Có thể bỏ lỡ thông báo hoàn thành hoặc mất trạng thái sau process death",
    "audit_status": "RISK",
    "result_status": "BLOCKED",
    "result_commit": "",
    "result_fix": "",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Bị chặn: môi trường không có Android SDK/thiết bị để dựng và chạy ứng dụng"
  },
  {
    "id": "R3-007",
    "priority": "P1",
    "title": "Polish endpoint thiếu auth middleware trực tiếp",
    "path": "src/lib/polish/polish-room.ts",
    "line": 43,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/polish/polish-room.ts#L41-L47",
    "root_cause": "GET prompts/models và POST quote không gắn auth như comment yêu cầu",
    "impact": "Nếu không có guard toàn cục, người chưa đăng nhập có thể đọc cấu hình hoặc tạo tải DB",
    "audit_status": "RISK",
    "result_status": "FIXED_CODE",
    "result_commit": "6a768a3",
    "result_fix": "getPolishModels, getPolishPrompts, quotePolishChoices cần đăng nhập.",
    "result_test": "tsc; Playwright: phòng dịch và Admin không lỗi console",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R3-008",
    "priority": "P1",
    "title": "Gateway tin IP header nếu proxy không chuẩn hóa",
    "path": "src/lib/app-link.server.ts",
    "line": 95,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/app-link.server.ts#L93-L99",
    "root_cause": "Lấy phần tử đầu x-forwarded-for do request cung cấp",
    "impact": "Rate theo IP và bằng chứng rủi ro có thể sai nếu ingress không ghi đè header",
    "audit_status": "RISK",
    "result_status": "BLOCKED",
    "result_commit": "",
    "result_fix": "",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Cần xác minh proxy trước (Vercel/Caddy) chuẩn hóa x-forwarded-for; không xem được hạ tầng thật"
  },
  {
    "id": "R3-009",
    "priority": "P1",
    "title": "Giá ASR fallback theo kết quả thiếu duration",
    "path": "src/lib/billing/run-gate.ts",
    "line": 119,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/billing/run-gate.ts#L117-L123",
    "root_cause": "Duration/segment end từ response, fallback 0 khi thiếu; không đối chiếu audio thực",
    "impact": "Có thể ghi thiếu chi phí khi response thành công nhưng thiếu metadata",
    "audit_status": "RISK",
    "result_status": "DEFERRED",
    "result_commit": "",
    "result_fix": "",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Hoãn (P1/P2, cần thiết kế hoặc thử ngoài môi trường này)"
  },
  {
    "id": "R4-001",
    "priority": "P0",
    "title": "Reset dữ liệu thử thiếu rào chắn môi trường và xác nhận server",
    "path": "src/lib/admin/admin-money.ts",
    "line": 308,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/admin/admin-money.ts#L305-L316",
    "root_cause": "Validator chỉ kiểm tra định dạng; handler bỏ data; quyền Chủ là rào chắn duy nhất thấy trong handler",
    "impact": "Chủ có thể vô tình xóa dữ liệu thật; không phải bypass quyền Chủ",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_TESTED",
    "result_commit": "ee37429",
    "result_fix": "Mã xác nhận do máy chủ cấp (startTestReset), 5 phút, một lần, gắn đúng tài khoản Chủ.",
    "result_test": "money-flow.test.ts + Playwright thật dev và bản dựng node-server trên Postgres (Reset đạt, mã máy chủ)",
    "result_before": "máy chủ chỉ kiểm định dạng 6 ký tự",
    "result_after": "mã sai/hết hạn/người khác bị từ chối",
    "result_note": "Chưa thêm rào môi trường production: cần Chủ quyết"
  },
  {
    "id": "R4-002",
    "priority": "P0",
    "title": "Reset nhiều bảng không nguyên tử",
    "path": "src/lib/payment/pay-flow.ts",
    "line": 316,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/payment/pay-flow.ts#L313-L324",
    "root_cause": "Chuỗi await delete riêng; Sql interface không có transaction tại đây",
    "impact": "Lỗi giữa chừng để lại dữ liệu tài chính mất một phần",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_TESTED",
    "result_commit": "ee37429",
    "result_fix": "wipeTestData trong một giao dịch.",
    "result_test": "money-flow.test.ts: trigger chặn xóa room_audit → Token và đơn còn nguyên",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R4-003",
    "priority": "P1",
    "title": "Reset không đồng bộ sổ chi phí provider",
    "path": "src/lib/payment/pay-flow.ts",
    "line": 323,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/payment/pay-flow.ts#L320-L331",
    "root_cause": "wipeTestData không xóa provider_spend (migration 0030), nhưng xóa doanh thu",
    "impact": "Báo cáo staging sau reset có thể còn chi phí cũ",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "NEEDS_OWNER",
    "result_commit": "",
    "result_fix": "Reset có nên xóa provider_spend (sổ phải trả nhà) cho khớp doanh thu? Xóa thêm là xóa thêm số liệu tài chính.",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Cần Chủ quyết (đụng nghiệp vụ hoặc có thể chặn khách hợp lệ)"
  },
  {
    "id": "R4-004",
    "priority": "P1",
    "title": "Xóa tài khoản không thu hồi khóa Android tại luồng xóa",
    "path": "src/lib/admin/admin-users.ts",
    "line": 343,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/admin/admin-users.ts#L340-L351",
    "root_cause": "app_devices không FK user (0031); deviceUserId chỉ kiểm token_hash, revoked_at, idle; xóa user không revoke trong handler",
    "impact": "Khóa máy của tài khoản đã xóa có thể vẫn xác thực, đọc/ghi lịch sử hoặc dùng quyền còn lại tùy endpoint",
    "audit_status": "RISK",
    "result_status": "FIXED_CODE",
    "result_commit": "b692474",
    "result_fix": "Xóa tài khoản: một giao dịch, không nuốt lỗi, gỡ app_devices và app_link_codes; deviceUserId yêu cầu tài khoản còn tồn tại.",
    "result_test": "tsc, npm test",
    "result_before": "",
    "result_after": "",
    "result_note": "Chưa có test tích hợp cho cửa máy chủ deleteUser"
  },
  {
    "id": "R4-005",
    "priority": "P1",
    "title": "Xóa tài khoản có nhiều bước bỏ qua lỗi",
    "path": "src/lib/admin/admin-users.ts",
    "line": 303,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/admin/admin-users.ts#L300-L311",
    "root_cause": "Lỗi đọc/nhả hold và xóa lịch sử bị nuốt; nhiều thao tác riêng",
    "impact": "Xóa dở dang, giữ phiếu treo hoặc lịch sử không xóa như cam kết",
    "audit_status": "RISK",
    "result_status": "FIXED_CODE",
    "result_commit": "b692474",
    "result_fix": "Xóa tài khoản: một giao dịch, không nuốt lỗi, gỡ app_devices và app_link_codes; deviceUserId yêu cầu tài khoản còn tồn tại.",
    "result_test": "tsc, npm test",
    "result_before": "",
    "result_after": "",
    "result_note": "Chưa có test tích hợp cho cửa máy chủ deleteUser"
  },
  {
    "id": "R4-006",
    "priority": "P1",
    "title": "Tổng doanh thu ép int32",
    "path": "src/lib/admin/admin-money.ts",
    "line": 127,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/admin/admin-money.ts#L124-L135",
    "root_cause": "SUM bigint bị ép integer 32 bit trong báo cáo nhiều năm",
    "impact": "Tổng vượt 2147483647 VND có thể làm truy vấn lỗi",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_CODE",
    "result_commit": "b692474",
    "result_fix": "SUM ::bigint ở trang Doanh thu.",
    "result_test": "tsc, npm test",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R4-007",
    "priority": "P2",
    "title": "API Android xóa lịch sử không có rate limit tại handler",
    "path": "src/routes/api/app-history.ts",
    "line": 51,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/routes/api/app-history.ts#L48-L59",
    "root_cause": "GET/POST có takeRate nhưng DELETE không có; xác thực device vẫn có",
    "impact": "Có thể tạo tải DB lặp lại bằng thiết bị hợp lệ",
    "audit_status": "RISK",
    "result_status": "FIXED_CODE",
    "result_commit": "b692474",
    "result_fix": "DELETE /api/app-history có takeRate 30/phút.",
    "result_test": "tsc",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R4-008",
    "priority": "P1",
    "title": "Mật khẩu tạm cập nhật trực tiếp credential",
    "path": "src/lib/admin/admin-users.ts",
    "line": 173,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/admin/admin-users.ts#L170-L181",
    "root_cause": "SQL trực tiếp không đi qua hook reset auth; không thấy revoke session/device trong handler",
    "impact": "Phiên cũ có thể còn hiệu lực sau đặt mật khẩu tạm",
    "audit_status": "RISK",
    "result_status": "FIXED_CODE",
    "result_commit": "b692474",
    "result_fix": "Mật khẩu tạm: xóa session, gỡ máy Android, ghi nhật ký. Đặt lại mật khẩu: gỡ máy thử lại 1 lần và ghi nhật ký.",
    "result_test": "tsc",
    "result_before": "",
    "result_after": "",
    "result_note": "Đổi hành vi: khách bị đăng xuất khi Admin đặt mật khẩu tạm — Chủ xem có cần ghi điều khoản"
  },
  {
    "id": "R5-001",
    "priority": "P0",
    "title": "Hai lệnh rút có thể dùng cùng số dư",
    "path": "src/lib/affiliate-room.ts",
    "line": 299,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/affiliate-room.ts#L296-L307",
    "root_cause": "Đọc SUM, kiểm tra lệnh mở, update và insert tách rời; migration 0018/0032 không có unique lệnh mở",
    "impact": "Hai lệnh rút có thể cùng ghi số tiền hoặc hoa hồng bị treo nếu insert lỗi",
    "audit_status": "RISK",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "ee37429",
    "result_fix": "requestPayoutWith: một giao dịch, khóa dòng affiliates FOR UPDATE; số lệnh = đúng tổng khoản vừa gắn; migration 0039 chỉ mục một-lệnh-mở (bỏ qua nếu dữ liệu cũ trùng).",
    "result_test": "src/lib/affiliate-payout.test.ts (Postgres thật)",
    "result_before": "cách cũ, 20 lượt × 5 lần bấm: tổng lệnh 300.000 đ trên số dư 60.000 đ",
    "result_after": "1 lệnh 60.000 đ (docs/kiem-toan/v5.49/bang-chung/payout-pg.log)",
    "result_note": ""
  },
  {
    "id": "R5-002",
    "priority": "P0",
    "title": "Xác nhận chi tiền không gắn đúng lệnh rút",
    "path": "src/lib/affiliate-room.ts",
    "line": 130,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/affiliate-room.ts#L127-L138",
    "root_cause": "Update payout có điều kiện nhưng không kiểm returning; update event theo affiliate_id và trạng thái chung",
    "impact": "Replay lệnh cũ có thể đánh dấu event của lệnh mới đã chi; báo thành công dù không đổi payout",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_TESTED",
    "result_commit": "ee37429",
    "result_fix": "commission_events.payout_id; xác nhận/hủy chỉ đụng khoản của đúng lệnh, chỉ khi lệnh còn cho-chi; khoản cũ chưa gắn vẫn xử lý theo CTV.",
    "result_test": "affiliate-payout.test.ts",
    "result_before": "(đọc mã) xác nhận lệnh đã hủy vẫn đánh dấu khoản của lệnh mới là da-chi",
    "result_after": "báo lỗi, khoản lệnh mới giữ cho-rut",
    "result_note": ""
  },
  {
    "id": "R5-003",
    "priority": "P1",
    "title": "Hủy lệnh rút không nguyên tử",
    "path": "src/lib/affiliate-room.ts",
    "line": 153,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/affiliate-room.ts#L150-L161",
    "root_cause": "Update payout và trả event về da-duyet tách rời; event không gắn payout",
    "impact": "Lỗi giữa bước khiến hoa hồng treo hoặc trả nhầm event",
    "audit_status": "RISK",
    "result_status": "FIXED_TESTED",
    "result_commit": "ee37429",
    "result_fix": "commission_events.payout_id; xác nhận/hủy chỉ đụng khoản của đúng lệnh, chỉ khi lệnh còn cho-chi; khoản cũ chưa gắn vẫn xử lý theo CTV.",
    "result_test": "affiliate-payout.test.ts",
    "result_before": "(đọc mã) xác nhận lệnh đã hủy vẫn đánh dấu khoản của lệnh mới là da-chi",
    "result_after": "báo lỗi, khoản lệnh mới giữ cho-rut",
    "result_note": ""
  },
  {
    "id": "R5-004",
    "priority": "P1",
    "title": "Kiểm tra cờ rủi ro rút tiền fail-open",
    "path": "src/lib/affiliate-room.ts",
    "line": 315,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/affiliate-room.ts#L312-L321",
    "root_cause": "Lỗi truy vấn risk_flags được đổi thành danh sách rỗng",
    "impact": "Lệnh rút có thể được tạo khi không xác minh được cờ rủi ro",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_TESTED",
    "result_commit": "ee37429",
    "result_fix": "Bỏ .catch(() => []) khi đọc risk_flags: lỗi thì không cho rút.",
    "result_test": "affiliate-payout.test.ts (cờ mở → chặn)",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R5-005",
    "priority": "P1",
    "title": "Hoa hồng gói dùng giá mặc định thay vì giá đơn",
    "path": "src/lib/payment/pay-flow.ts",
    "line": 115,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/payment/pay-flow.ts#L112-L123",
    "root_cause": "Ledger dùng order.amount nhưng accruePlan dùng plan.price",
    "impact": "Hoa hồng sai khi Chủ chỉnh giá hoặc đơn giữ giá cũ",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "NEEDS_OWNER",
    "result_commit": "",
    "result_fix": "Hoa hồng gói tính trên plan.price hay order.amount: đổi là đổi cách tính hoa hồng.",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Cần Chủ quyết (đụng nghiệp vụ hoặc có thể chặn khách hợp lệ)"
  },
  {
    "id": "R5-006",
    "priority": "P1",
    "title": "Hoa hồng lỗi sau thanh toán không có retry tại luồng này",
    "path": "src/lib/payment/pay-flow.ts",
    "line": 72,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/payment/pay-flow.ts#L69-L80",
    "root_cause": "Đơn đã paid trước accrue; catch bỏ lỗi; replay đơn paid không chạy lại nhánh này",
    "impact": "CTV có thể mất hoa hồng nếu lỗi tạm thời",
    "audit_status": "RISK",
    "result_status": "DEFERRED",
    "result_commit": "",
    "result_fix": "",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Hoãn (P1/P2, cần thiết kế hoặc thử ngoài môi trường này)"
  },
  {
    "id": "R5-007",
    "priority": "P2",
    "title": "Gắn mã giới thiệu trả thành công dù không ghi",
    "path": "src/lib/affiliate-room.ts",
    "line": 174,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/affiliate-room.ts#L171-L182",
    "root_cause": "Không kiểm returning sau insert referrals",
    "impact": "UI có thể báo gắn mã mới dù mã cũ được giữ",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_CODE",
    "result_commit": "ae2048d",
    "result_fix": "attachReferral kiểm returning; đã gắn mã khác thì ok=false.",
    "result_test": "tsc",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R5-008",
    "priority": "P1",
    "title": "Bản lưu phụ đề không có namespace tài khoản",
    "path": "src/lib/saved-runs.ts",
    "line": 36,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/saved-runs.ts#L33-L44",
    "root_cause": "SavedRun và lookup chỉ có key/source, không có account; cần kiểm logout và caller",
    "impact": "Thiết bị dùng chung có nguy cơ khôi phục phụ đề tài khoản khác",
    "audit_status": "RISK",
    "result_status": "DEFERRED",
    "result_commit": "",
    "result_fix": "",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Hoãn (P1/P2, cần thiết kế hoặc thử ngoài môi trường này)"
  },
  {
    "id": "R5-009",
    "priority": "P2",
    "title": "Lưu IndexedDB báo hoàn tất trước transaction commit",
    "path": "src/lib/saved-runs.ts",
    "line": 53,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/saved-runs.ts#L50-L61",
    "root_cause": "Promise resolve theo request success, không theo transaction complete; lỗi bị nuốt",
    "impact": "Có thể hiểu nhầm bản lưu đã bền vững khi transaction abort",
    "audit_status": "RISK",
    "result_status": "FIXED_CODE",
    "result_commit": "ae2048d",
    "result_fix": "IndexedDB ghi xong khi transaction oncomplete.",
    "result_test": "tsc, saved-runs.test.ts",
    "result_before": "",
    "result_after": "",
    "result_note": "Chưa thử trên trình duyệt"
  },
  {
    "id": "R6-001",
    "priority": "P1",
    "title": "Giải mã cũ có thể ghi PCM vào lần chạy mới",
    "path": "src/components/use-pipeline.ts",
    "line": 1154,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/components/use-pipeline.ts#L1151-L1162",
    "root_cause": "Gán vào Job dùng chung trước khi kiểm runId",
    "impact": "PCM lần A có thể ghi đè lần B khi A giải mã xong muộn",
    "audit_status": "RISK",
    "result_status": "FIXED_CODE",
    "result_commit": "6a768a3",
    "result_fix": "PCM giải mã gán sau khi kiểm runId; checkLanguage kiểm runId sau await.",
    "result_test": "tsc, npm test",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R6-002",
    "priority": "P1",
    "title": "Chờ metadata không có timeout hoặc hủy",
    "path": "src/components/pipeline-media.ts",
    "line": 52,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/components/pipeline-media.ts#L49-L60",
    "root_cause": "Promise chỉ kết thúc khi loadedmetadata hoặc error",
    "impact": "Tác vụ có thể treo khi media không phát sự kiện",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_CODE",
    "result_commit": "ae2048d",
    "result_fix": "waitForMetadata có hạn 30 giây.",
    "result_test": "tsc",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R6-003",
    "priority": "P1",
    "title": "MP4 cấp phát theo sample count chưa kiểm tra",
    "path": "src/lib/sub/mp4.ts",
    "line": 160,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/sub/mp4.ts#L157-L168",
    "root_cause": "Sample count lấy từ metadata không kiểm giới hạn hoặc độ dài bảng trước cấp phát",
    "impact": "Tệp MP4 lỗi có thể gây cấp phát RAM lớn hoặc treo trình duyệt",
    "audit_status": "RISK",
    "result_status": "FIXED_CODE",
    "result_commit": "6a768a3",
    "result_fix": "MP4: trần 20 triệu mẫu, bảng stsz/stsc/stco nằm trong hộp; Range phải đủ byte. Lỗi → app đọc theo cách cũ.",
    "result_test": "tsc, npm test",
    "result_before": "",
    "result_after": "",
    "result_note": "Chưa thử tệp MP4 hỏng thật"
  },
  {
    "id": "R6-004",
    "priority": "P1",
    "title": "HTTP Range không xác minh kích thước hoặc Content-Range",
    "path": "src/lib/sub/mp4.ts",
    "line": 279,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/sub/mp4.ts#L276-L287",
    "root_cause": "Chỉ kiểm HTTP 206 rồi đọc toàn bộ body",
    "impact": "Server trả đoạn sai hoặc quá lớn có thể làm lệch âm thanh hoặc tăng RAM",
    "audit_status": "RISK",
    "result_status": "FIXED_CODE",
    "result_commit": "6a768a3",
    "result_fix": "MP4: trần 20 triệu mẫu, bảng stsz/stsc/stco nằm trong hộp; Range phải đủ byte. Lỗi → app đọc theo cách cũ.",
    "result_test": "tsc, npm test",
    "result_before": "",
    "result_after": "",
    "result_note": "Chưa thử tệp MP4 hỏng thật"
  },
  {
    "id": "R6-005",
    "priority": "P1",
    "title": "PUT R2 không có timeout",
    "path": "src/lib/sub/r2-put.ts",
    "line": 48,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/sub/r2-put.ts#L45-L56",
    "root_cause": "Không đặt xhr.timeout hoặc ontimeout",
    "impact": "Kết nối treo có thể giữ tác vụ vô thời hạn",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_CODE",
    "result_commit": "ae2048d",
    "result_fix": "PUT R2: hủy khi 60 giây không nhích byte, coi là lỗi tạm để thử lại; khách hủy vẫn báo hủy.",
    "result_test": "r2-put.test.ts, tsc",
    "result_before": "",
    "result_after": "",
    "result_note": "Chưa thử với R2 thật"
  },
  {
    "id": "R6-006",
    "priority": "P1",
    "title": "Không dọn key R2 khi PUT thất bại",
    "path": "src/lib/sub/r2-upload-run.ts",
    "line": 13,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/sub/r2-upload-run.ts#L10-L21",
    "root_cause": "Key chỉ trả về sau PUT thành công; caller không biết key nếu response mất",
    "impact": "Object đã ghi có thể tồn tại đến lifecycle; lifecycle chưa xác minh",
    "audit_status": "RISK",
    "result_status": "DEFERRED",
    "result_commit": "",
    "result_fix": "",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Hoãn (P1/P2, cần thiết kế hoặc thử ngoài môi trường này)"
  },
  {
    "id": "R6-007",
    "priority": "P2",
    "title": "WAV reader thiếu kiểm tra tham số hữu hạn",
    "path": "src/lib/sub/wav-stream.ts",
    "line": 74,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/sub/wav-stream.ts#L71-L82",
    "root_cause": "Infinity được chấp nhận; span không kiểm dương hữu hạn",
    "impact": "Có thể lặp vô hạn nếu caller truyền tham số sai",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_TESTED",
    "result_commit": "ae2048d",
    "result_fix": "packWavFromReader kiểm duration và span là số dương hữu hạn.",
    "result_test": "wav-stream.test.ts (+1)",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R6-008",
    "priority": "P1",
    "title": "ASR kiểm ngôn ngữ ghi trạng thái sau await không kiểm runId",
    "path": "src/lib/pipeline/recognize.ts",
    "line": 81,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/pipeline/recognize.ts#L78-L89",
    "root_cause": "checkLanguage cập nhật chi phí và sự kiện sau ensureTrial không kiểm runId",
    "impact": "Lần chạy cũ có thể làm sai thống kê lần mới",
    "audit_status": "RISK",
    "result_status": "FIXED_CODE",
    "result_commit": "6a768a3",
    "result_fix": "PCM giải mã gán sau khi kiểm runId; checkLanguage kiểm runId sau await.",
    "result_test": "tsc, npm test",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R6-009",
    "priority": "P2",
    "title": "FileReader TyZo không hỗ trợ hủy",
    "path": "src/lib/providers/tyzo.ts",
    "line": 16,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/providers/tyzo.ts#L13-L24",
    "root_cause": "Không truyền signal vào FileReader; không có onabort",
    "impact": "Tiếp tục mã hóa audio sau hủy, giữ RAM không cần thiết",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_CODE",
    "result_commit": "ae2048d",
    "result_fix": "toBase64 nhận AbortSignal, FileReader.abort.",
    "result_test": "tsc",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R7-001",
    "priority": "P1",
    "title": "Trau chuốt chấp nhận đảo nghĩa và số",
    "path": "src/lib/sub/polish.ts",
    "line": 152,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/sub/polish.ts#L152-L165",
    "root_cause": "Judge chỉ kiểm rỗng, refusal, placeholder và độ dài",
    "impact": "thay đổi dữ kiện mà vẫn báo changed",
    "audit_status": "REPRODUCED_PURE_LOGIC",
    "result_status": "NEEDS_DESIGN",
    "result_commit": "",
    "result_fix": "Cần bộ đo chất lượng (câu đảo nghĩa, số) trước khi đổi bộ chấm trau chuốt.",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Hoãn (P1/P2, cần thiết kế hoặc thử ngoài môi trường này)"
  },
  {
    "id": "R7-002",
    "priority": "P1",
    "title": "Chia lô trau chuốt làm tăng số lần gọi",
    "path": "src/lib/sub/polish.ts",
    "line": 195,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/sub/polish.ts#L195-L213",
    "root_cause": "Chia đôi đệ quy khi phản hồi lỗi, không có ngân sách chung trong hàm",
    "impact": "47 lần gọi giả lập cho 24 câu lỗi định dạng; chi phí thật chưa đo",
    "audit_status": "REPRODUCED_PURE_LOGIC",
    "result_status": "BY_DESIGN",
    "result_commit": "",
    "result_fix": "Chia đôi tối đa 2n−1 lần gọi cho n câu, mỗi lần trừ theo usage thật trong phần đã giữ: có trần.",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R7-003",
    "priority": "P2",
    "title": "Glossary lỗi không báo tại worker",
    "path": "src/lib/pipeline/translate.ts",
    "line": 140,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/pipeline/translate.ts#L140-L149",
    "root_cause": "Không kiểm pack.error; catch fallback im lặng",
    "impact": "dịch thiếu thuật ngữ mà khách không biết",
    "audit_status": "RISK",
    "result_status": "DEFERRED",
    "result_commit": "",
    "result_fix": "",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Hoãn (P1/P2, cần thiết kế hoặc thử ngoài môi trường này)"
  },
  {
    "id": "R7-004",
    "priority": "P2",
    "title": "Thống kê model tính cả câu sửa tay trong lúc dịch",
    "path": "src/lib/pipeline/translate.ts",
    "line": 238,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/pipeline/translate.ts#L238-L261",
    "root_cause": "Bỏ qua câu edited nhưng không trừ khỏi j.uses",
    "impact": "thống kê số câu theo model sai; không kết luận sai billing",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "2ce19fd",
    "result_fix": "Đánh dấu busy ngay sau khi lấy lô, trước await ensureChatTicket (finally gỡ busy). R7-004: câu khách sửa tay không cộng vào thống kê model.",
    "result_test": "src/lib/pipeline/translate-claim.test.ts (mock module groq)",
    "result_before": "6 câu gửi dịch 4 lần (docs/kiem-toan/v5.49/bang-chung/split008-before.log)",
    "result_after": "mỗi câu gửi 1 lần (docs/kiem-toan/v5.49/bang-chung/split008-after.log)",
    "result_note": ""
  },
  {
    "id": "R7-005",
    "priority": "P2",
    "title": "Hàng đợi TTS bỏ câu cũ im lặng",
    "path": "src/lib/sub/narration.ts",
    "line": 185,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/sub/narration.ts#L185-L192",
    "root_cause": "queue.shift khi vượt 8 không thông báo",
    "impact": "mất lời đọc khi phát nhanh",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "BY_DESIGN",
    "result_commit": "",
    "result_fix": "Bỏ câu cũ khi hàng chờ đọc quá 8 để lời đọc không trễ so với phim.",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R7-006",
    "priority": "P1",
    "title": "Dừng TTS không quyết toán promise phát",
    "path": "src/lib/sub/narration.ts",
    "line": 132,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/lib/sub/narration.ts#L132-L147",
    "root_cause": "stop pause và xóa src nhưng playUrl chỉ resolve onended hoặc reject onerror",
    "impact": "promise có thể treo khi dừng hoặc handler bị thay thế",
    "audit_status": "RISK",
    "result_status": "NEEDS_BROWSER_VERIFY",
    "result_commit": "",
    "result_fix": "stop() đặt src rỗng làm trình duyệt báo lỗi/hủy play(), promise thường kết thúc; cần thử trên trình duyệt có tiếng.",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R8-001",
    "priority": "P0",
    "title": "Xóa schema VPS trước khi dump Neon thành công",
    "path": "deploy/vps/tyzo.sh",
    "line": 678,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/deploy/vps/tyzo.sh#L678-L694",
    "root_cause": "Thứ tự drop trước dump; không thấy backup đích tại hàm",
    "impact": "mất dữ liệu VPS nếu dump lỗi",
    "audit_status": "CONFIRMED_CODE",
    "result_status": "FIXED_VERIFIED",
    "result_commit": "17f3351",
    "result_fix": "nap_dump: kiểm mục lục tệp, nạp vào CSDL tạm tyzo_moi, đủ bảng mới đổi tên; lỗi pg_restore thì hỏi; CSDL cũ giữ tyzo_cu_<giờ>. chep_tu_neon đọc Neon xong mới đụng VPS; khoi_phuc, khoi_phuc_vps dùng nap_dump; chep_len_neon kiểm đủ bảng.",
    "result_test": "Diễn tập trên Postgres 16 cục bộ với docker giả (docs/kiem-toan/v5.49/bang-chung/restore-drill.log, restore-drill-harness.sh)",
    "result_before": "Tệp hỏng: 7 bảng → 0 bảng (mất dữ liệu)",
    "result_after": "Tệp hỏng/trống/cụt: dữ liệu giữ nguyên; tệp tốt: 8 bảng, bản cũ còn, quay về được",
    "result_note": ""
  },
  {
    "id": "R8-002",
    "priority": "P1",
    "title": "Migration bỏ qua thư mục không đọc được",
    "path": "scripts/migrate.mjs",
    "line": 37,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/scripts/migrate.mjs#L37-L48",
    "root_cause": "Catch mọi lỗi readdir như không có thư mục",
    "impact": "deploy có thể báo thành công dù migration không đọc được",
    "audit_status": "RISK",
    "result_status": "FIXED_CODE",
    "result_commit": "ae2048d",
    "result_fix": "migrate.mjs chỉ bỏ qua ENOENT.",
    "result_test": "node --check; build đạt",
    "result_before": "",
    "result_after": "",
    "result_note": ""
  },
  {
    "id": "R8-003",
    "priority": "P1",
    "title": "Preview build chạy migration trên DB chung",
    "path": "scripts/migrate.mjs",
    "line": 5,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/scripts/migrate.mjs#L5-L14",
    "root_cause": "Build gắn migration; comment xác nhận preview dùng DB chung",
    "impact": "preview có thể thay đổi schema production nếu cùng URL",
    "audit_status": "RISK",
    "result_status": "NEEDS_OWNER",
    "result_commit": "",
    "result_fix": "Bản xem trước (preview) chạy migration trên CSDL thật dùng chung. Đề xuất: tắt dựng nhánh phụ trên Vercel hoặc dùng CSDL riêng cho preview.",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Cần Chủ quyết (đụng nghiệp vụ hoặc có thể chặn khách hợp lệ). LƯU Ý: đẩy nhánh này sẽ chạy migration 0038/0039 lên CSDL thật qua bản xem trước."
  },
  {
    "id": "R8-004",
    "priority": "P2",
    "title": "Tự reload khi đang chạy tác vụ",
    "path": "src/components/stale-build-guard.tsx",
    "line": 8,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/src/components/stale-build-guard.tsx#L8-L16",
    "root_cause": "Reload không kiểm active job tại handler",
    "impact": "mất tiến độ chưa checkpoint nếu chunk lỗi khi dịch",
    "audit_status": "RISK",
    "result_status": "DEFERRED",
    "result_commit": "",
    "result_fix": "",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Hoãn (P1/P2, cần thiết kế hoặc thử ngoài môi trường này)"
  },
  {
    "id": "R8-005",
    "priority": "P2",
    "title": "Workflow Android cấp quyền ghi cho cả job",
    "path": ".github/workflows/android-thu.yml",
    "line": 19,
    "url": "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/blob/48b6a19b882fc2b7e908fce8cd0c61ad358db838/.github/workflows/android-thu.yml#L19-L34",
    "root_cause": "contents write ở workflow; actions dùng tag",
    "impact": "tăng phạm vi ảnh hưởng nếu dependency CI bị xâm phạm",
    "audit_status": "RISK",
    "result_status": "DEFERRED",
    "result_commit": "",
    "result_fix": "",
    "result_test": "",
    "result_before": "",
    "result_after": "",
    "result_note": "Hoãn (P1/P2, cần thiết kế hoặc thử ngoài môi trường này)"
  }
]
```

## 7. Kết thúc

Chỉ báo hoàn thành khi có ma trận coverage từng tệp, kết quả thực tế và gate đạt. Nếu còn blocker, xuất báo cáo PARTIAL với danh sách chính xác. Không tự ý deploy. Hồ sơ này không chứa mã nguồn, Graphify mới hoặc log runtime; dùng repo baseline để thực hiện.
