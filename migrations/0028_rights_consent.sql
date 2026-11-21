-- v5.20.0: bằng chứng khách tự xác nhận quyền với nội dung, mỗi tệp một lần.
-- Chỉ lưu mã băm của dấu tệp (không lưu tên tệp hay nội dung), bản điều khoản lúc xác nhận và thời điểm.
create table if not exists rights_consents (
  user_id text not null,
  media_hash text not null,
  terms_version text not null,
  confirmed_at timestamptz not null default now(),
  primary key (user_id, media_hash)
);
