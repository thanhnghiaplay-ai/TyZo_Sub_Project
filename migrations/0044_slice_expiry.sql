-- Hồ sơ sửa triệt để v5.49.1, MAIN-038 (Chủ duyệt): trừ Token trên phiếu theo gói hết hạn SỚM NHẤT trước (hòa thì theo
-- mã gói). Hạn được chụp vào phần giữ lúc giữ (snapshot), nên thứ tự không đổi giữa chừng. Chỉ THÊM cột và điền hạn
-- cho phần giữ cũ từ gói của nó; không đổi số Token nào.
alter table token_slices add column if not exists expires_at timestamptz;
update token_slices s set expires_at = g.expires_at from token_grants g where g.id = s.grant_id and s.expires_at is null;
