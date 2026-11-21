-- v5.20.0: gộp thể loại. «Phim cấp 3» (softcore) và «Phim thoại kín» (sex) vào «Phim có nhãn 18+» (adult);
-- bỏ «Phim bộ / phim mới chiếu» (series), thuật ngữ của nó vào «Hằng ngày» (daily).
-- Trùng từ (cùng ngôn ngữ, cùng từ gốc không phân biệt hoa thường) thì giữ bản đang có ở loại đích.

insert into glossary_packs (lang, genre)
select distinct lang, 'adult' from glossary_packs where genre in ('softcore', 'sex')
on conflict (lang, genre) do nothing;

insert into glossary_packs (lang, genre)
select distinct lang, 'daily' from glossary_packs where genre = 'series'
on conflict (lang, genre) do nothing;

-- Thuật ngữ: chuyển lần lượt từng loại cũ để hai loại cũ trùng từ không đụng nhau trong cùng một lệnh.
update glossary_terms t set genre = 'adult', updated_at = now()
where t.genre = 'softcore'
  and not exists (select 1 from glossary_terms a where a.lang = t.lang and a.genre = 'adult' and lower(a.source) = lower(t.source));

update glossary_terms t set genre = 'adult', updated_at = now()
where t.genre = 'sex'
  and not exists (select 1 from glossary_terms a where a.lang = t.lang and a.genre = 'adult' and lower(a.source) = lower(t.source));

update glossary_terms t set genre = 'daily', updated_at = now()
where t.genre = 'series'
  and not exists (select 1 from glossary_terms a where a.lang = t.lang and a.genre = 'daily' and lower(a.source) = lower(t.source));

delete from glossary_terms where genre in ('softcore', 'sex', 'series');

-- Gợi ý của khách: cùng cách, khóa riêng là (user_id, lang, genre, source).
update glossary_suggestions s set genre = 'adult'
where s.genre = 'softcore'
  and not exists (select 1 from glossary_suggestions a where a.user_id = s.user_id and a.lang = s.lang and a.genre = 'adult' and a.source = s.source);

update glossary_suggestions s set genre = 'adult'
where s.genre = 'sex'
  and not exists (select 1 from glossary_suggestions a where a.user_id = s.user_id and a.lang = s.lang and a.genre = 'adult' and a.source = s.source);

update glossary_suggestions s set genre = 'daily'
where s.genre = 'series'
  and not exists (select 1 from glossary_suggestions a where a.user_id = s.user_id and a.lang = s.lang and a.genre = 'daily' and a.source = s.source);

delete from glossary_suggestions where genre in ('softcore', 'sex', 'series');

delete from glossary_packs where genre in ('softcore', 'sex', 'series');
