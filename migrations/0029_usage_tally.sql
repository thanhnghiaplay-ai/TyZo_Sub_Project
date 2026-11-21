-- v5.25.0: đếm ẩn danh (đợt 4 sắp lại trang khách). Mỗi dòng chỉ là số lần một lựa chọn được chọn trong một ngày.
-- KHÔNG có tài khoản, email, mã máy hay địa chỉ mạng: không lần ngược được ai đã chọn gì.
create table if not exists usage_tally (
  day date not null,
  topic text not null,
  answer text not null,
  n integer not null default 0,
  primary key (day, topic, answer)
);
