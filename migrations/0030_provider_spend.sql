-- v5.32.0: tiền phải trả từng nhà cung cấp, ghi lúc gọi model thành công bằng key của phòng.
-- Gộp theo ngày (giờ Việt Nam) × nhà × model. Không có tài khoản khách: chỉ để Admin đối chiếu hóa đơn từng nhà.
create table if not exists provider_spend (
  day date not null,
  provider text not null,
  model text not null,
  calls integer not null default 0,
  base_vnd bigint not null default 0,
  usd_micro bigint not null default 0,
  primary key (day, provider, model)
);
