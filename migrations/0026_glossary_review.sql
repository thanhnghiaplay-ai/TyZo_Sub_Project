-- B3: nhãn «đã duyệt / chưa duyệt» cho từng mục thuật ngữ.
-- Mục đang có coi là đã duyệt (Chủ đã dùng); bản nháp mới nhập sẽ ghi reviewed = false.
alter table glossary_terms add column if not exists reviewed boolean not null default true;
create index if not exists glossary_terms_review on glossary_terms (lang, genre, reviewed);
