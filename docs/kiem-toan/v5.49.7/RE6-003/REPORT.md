# RE6-003 · Xác minh Vercel có cấu trúc

Baseline `c0bcf6f` (RE6-002). Bản sửa chưa push của Codex không truy cập được nên làm lại từ đầu. Mọi phép thử dùng CLI Vercel giả và REST API giả trên loopback. Không gọi Vercel, Neon hay VPS thật. Không cần PostgreSQL cho mục này.

## Lỗi trước sửa

`vercel inspect | grep -qi ready` coi «Not Ready» là Ready. Không kiểm ID deployment, project, target, mã phiên bản hay env đã ghi, và các lệnh CLI không có giới hạn thời gian. Xem [before.txt](before.txt).

## Thay đổi (`deploy/vps/tyzo.sh`)

- **Env:** sau khi `env add --force`, đọc lại qua `GET /v10/projects/{id}/env` (và `/v1/.../env/{id}` khi cần). So băm SHA-256 với giá trị mong muốn. Mỗi khóa phải có đúng một bản production. Bản thiếu, trùng, `sensitive` (không đọc lại được) hoặc lệch giá trị sẽ dừng trước deploy (`env-do-dang`). Chỉ in tên khóa.
- **Danh tính deployment:** deploy gắn `--meta tyzo_run=<lượt>` và `--meta tyzo_sha=<HEAD>`. `GET /v13/deployments/{url}` phải trả đúng URL, `projectId` từ `.vercel/project.json`, `target=production`, đúng lượt và SHA. Sau đó chờ `readyState=READY` và `aliasAssigned=true`. `ERROR`, `CANCELED`, `aliasError` hoặc hết `T_READY` đều fail closed.
- **Promote:** mỗi alias production qua `GET /v4/aliases/{alias}` phải có `deploymentId` trùng ID vừa dựng. Health check là trang production trả mã dưới 400.
- **Mốc:** `BUOC deploy-id`, `deploy-xong <url> <id>`, `kiem-xong <id> <sha>`. `buoc_vercel` chỉ trả `xong` khi có `kiem-xong`. Trạng thái mới `kiem-chua-dat` nghĩa là Ready và nhận tên miền nhưng trang không trả lời, nên web mới có thể đã ghi Neon.
- **Timeout:** `T_CLI`=180 s cho từng lệnh CLI và `T_DEPLOY`=1500 s. `TYZO_VERCEL_TIMEOUT`=3600 s cho cả lượt `docker run`. Bị cắt thì thiếu mốc và được coi là chưa rõ.
- **Phục hồi:** khi deploy lỗi hoặc chưa rõ, tra `GET /v6/deployments` theo `tyzo_run` và in `TIM <id> <state> <url>`. Nhật ký chuyển nguồn ghi `loi-<bước> <project> <deployment-id> <sha>`. Nguồn VPS vẫn khóa ở mọi trạng thái khác `xong` theo RE6-002. Token chỉ ở header API và không có giá trị env nào trong đầu ra, nhật ký hay dòng lệnh.

## Kiểm thử

`node --test scripts/re6-003-vercel.test.mjs scripts/re5-004-vercel.test.mjs`: 24/24 đạt. Các ca gồm not-ready, ERROR, sai project, target, SHA hoặc URL, alias trỏ bản cũ, API sập sau deploy, mất kết nối khi deploy (tìm lại `dpl_1`), deploy treo, env bị bỏ qua, sensitive, trùng, lệnh env treo, thiếu ID project, API sập trước deploy và trang không trả lời. Mọi ca đều kiểm không lộ bí mật. Xem [test-summary.txt](test-summary.txt). Harness dùng chung nằm ở `scripts/vercel-fake-harness.mjs`.

## Còn lại

Chưa nghiệm thu Vercel thật. Cần token và project staging do Chủ duyệt để xác nhận tên trường API v13/v10/v4/v6 và hành vi `decrypt` trên CLI 65.14.0. Biến loại `sensitive` sẽ luôn chặn deploy theo hướng fail closed. Nếu team bắt buộc sensitive, cần Chủ quyết cách kiểm khác. Thêm tên miền riêng vẫn không chặn kết quả.

[Vercel REST API · deployments](https://vercel.com/docs/rest-api/reference/endpoints/deployments/get-a-deployment-by-id-or-url)
