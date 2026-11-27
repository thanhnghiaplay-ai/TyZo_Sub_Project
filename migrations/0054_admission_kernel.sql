-- RE3-004/005/006: cửa nhận việc. Chỉ thêm cột, chỉ mục và hàm; không đổi dữ liệu cũ, không đổi giới hạn đang lưu.
-- ref: bằng chứng gắn suất với việc thật (mã lệnh gọi nhà, phiên live, đoạn Modal) để không đếm đôi job async
-- và để đối soát unknown theo bằng chứng (không giải phóng chỉ vì hết hạn).
alter table work_admissions add column if not exists ref text;
create index if not exists work_admissions_ref_idx on work_admissions (ref) where ref is not null and status in ('running', 'unknown');
create index if not exists work_admissions_stale_idx on work_admissions (heartbeat_at) where status = 'running';
create index if not exists work_admissions_unknown_idx on work_admissions (created_at, id) where status = 'unknown';

-- Một lần gọi = một câu lệnh tự commit: khóa toàn cục (pg_advisory_xact_lock) chỉ giữ trong lúc hàm chạy, không qua
-- nhiều lượt khứ hồi mạng. Bất biến giữ nguyên: đọc cấu hình + quét lease cũ + đếm + chèn nguyên tử trên mọi máy.
-- Giới hạn: room_settings.work_admission (Admin lưu, đã kiểm), thiếu khóa nào thì lấy mặc định của ứng dụng (p_defaults).
-- Trả mã suất mới, 'busy' (đủ suất), 'disabled' (Chủ tắt nhận việc) hoặc 'uncertain' (việc chưa rõ cùng nhà, cùng lane).
create or replace function tyzo_admit(
  p_id text, p_user text, p_provider text, p_model text, p_lane text,
  p_defaults jsonb, p_stale_seconds integer, p_ref text
) returns text language plpgsql as $$
declare
  cfg jsonb; lim jsonb;
  n_lane integer; n_own integer; n_provider integer; n_model integer; n_uncertain integer;
  c_lane integer; c_user integer; c_provider integer; c_model integer; c_reserve integer;
begin
  perform pg_advisory_xact_lock(84201912);
  select value::jsonb into cfg from room_settings where key = 'work_admission';
  lim := p_defaults || coalesce(cfg, '{}'::jsonb);
  if not coalesce((lim->>'enabled')::boolean, true) then return 'disabled'; end if;
  c_lane := (lim->>p_lane)::int;
  c_user := (lim->>(case when p_lane = 'modal' then 'perUserModal' else 'perUser' end))::int;
  c_provider := (lim->>'perProvider')::int;
  c_model := (lim->>'perModel')::int;
  c_reserve := coalesce((lim->>'liveReserve')::int, 0);
  if c_lane is null or c_user is null or c_provider is null or c_model is null then
    raise exception 'Cấu hình nhận việc không hợp lệ.';
  end if;
  update work_admissions set status = 'unknown', finished_at = clock_timestamp()
    where status = 'running' and heartbeat_at <= clock_timestamp() - make_interval(secs => p_stale_seconds);
  with active as (
    select lane, user_id, provider, model, status = 'unknown' as uncertain
    from work_admissions where status in ('running', 'unknown')
    union all
    -- Job async đã có suất đang giữ cùng mã lệnh (đang gửi) thì không đếm lần hai.
    select 'batch', j.user_id, j.provider, j.model, j.state = 'unknown'
    from run_async_asr_jobs j
    where j.state in ('pending', 'running', 'unknown') and j.deadline_at > clock_timestamp()
      and not exists (select 1 from work_admissions w where w.ref = j.call_id and w.status in ('running', 'unknown'))
  )
  select
    count(*) filter (where lane = p_lane),
    count(*) filter (where lane = p_lane and user_id = p_user),
    count(*) filter (where provider = p_provider),
    count(*) filter (where provider = p_provider and model = p_model),
    count(*) filter (where lane = p_lane and user_id = p_user and provider = p_provider and uncertain)
  into n_lane, n_own, n_provider, n_model, n_uncertain
  from active;
  if n_uncertain > 0 then return 'uncertain'; end if;
  if n_lane >= c_lane or n_own >= c_user or n_provider >= c_provider or n_model >= c_model
     or (p_lane <> 'live' and n_provider >= c_provider - greatest(0, c_reserve)) then
    return 'busy';
  end if;
  insert into work_admissions (id, user_id, provider, model, lane, ref)
  values (p_id, p_user, p_provider, p_model, p_lane, p_ref);
  return p_id;
end $$;
