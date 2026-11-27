-- RE2-004: hàng đợi công bằng cho cửa nhận việc. Chỉ thêm bảng và thay thân hàm tyzo_admit (chữ ký giữ nguyên).
-- Chống đói có ngưỡng, không bỏ trống suất: bình thường ai tới cũng lấy được suất trống (như cũ). Chỉ người đã chờ
-- quá `starve` giây mới được giữ suất, theo thứ tự xếp trước, cho tới khi nhận được. «Còn đang chờ» = vừa thử lại
-- trong `wait_live` giây; người đã bỏ đi không giữ suất.
-- Không chứa dữ liệu khách ngoài mã người dùng; dòng cũ hơn 60 giây tự dọn trong chính hàm.
create table if not exists work_waiters (
  user_id text not null,
  provider text not null,
  model text not null,
  lane text not null,
  since timestamptz not null default clock_timestamp(),
  seen_at timestamptz not null default clock_timestamp(),
  primary key (provider, model, lane, user_id)
);
create index if not exists work_waiters_order_idx on work_waiters (provider, model, since, user_id);
create index if not exists work_waiters_seen_idx on work_waiters (seen_at);

create or replace function tyzo_admit(
  p_id text, p_user text, p_provider text, p_model text, p_lane text,
  p_defaults jsonb, p_stale_seconds integer, p_ref text
) returns text language plpgsql as $$
declare
  cfg jsonb; lim jsonb; my_since timestamptz; ahead integer; free integer;
  n_lane integer; n_own integer; n_provider integer; n_model integer; n_uncertain integer;
  -- Từ khóa mở thân hàm để cuối dòng: migrate.mjs từ chối dòng mở đầu bằng BEGIN/COMMIT/ROLLBACK.
  c_lane integer; c_user integer; c_provider integer; c_model integer; c_reserve integer; wait_live integer := 6; starve integer := 3; begin
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
  -- Khách đã dùng đủ suất riêng: chờ chính mình, không xếp hàng chặn người khác.
  if n_own >= c_user then return 'busy'; end if;
  free := least(c_lane - n_lane, c_provider - n_provider, c_model - n_model);
  if p_lane <> 'live' then free := least(free, c_provider - greatest(0, c_reserve) - n_provider); end if;
  if free <= 0 then
    -- Hết suất: chỉ ghi chỗ chờ và tính vị trí (đường bận ngắn nhất dưới khóa).
    insert into work_waiters (user_id, provider, model, lane) values (p_user, p_provider, p_model, p_lane)
      on conflict (provider, model, lane, user_id) do update set seen_at = clock_timestamp()
      returning since into my_since;
    select count(*) into ahead from work_waiters w
      where w.provider = p_provider and w.model = p_model and w.user_id <> p_user
        and w.seen_at > clock_timestamp() - make_interval(secs => wait_live)
        and (w.since, w.user_id) < (my_since, p_user);
    -- Dọn chỗ chờ bỏ đi đã lâu, thỉnh thoảng (không mỗi lần).
    if random() < 0.02 then
      delete from work_waiters where ctid in (
        select ctid from work_waiters where seen_at < clock_timestamp() - interval '60 seconds' limit 200);
    end if;
    return 'busy:' || (ahead + 1);
  end if;
  select since into my_since from work_waiters
    where provider = p_provider and model = p_model and lane = p_lane and user_id = p_user;
  -- Còn suất: chỉ người chờ lâu (quá `starve` giây), còn đang thử lại và xếp trước mình mới được giữ suất trước mình.
  select count(*) into ahead from work_waiters w
    where w.provider = p_provider and w.model = p_model and w.user_id <> p_user
      and w.seen_at > clock_timestamp() - make_interval(secs => wait_live)
      and w.since <= clock_timestamp() - make_interval(secs => starve)
      and (my_since is null or (w.since, w.user_id) < (my_since, p_user));
  if ahead >= free then
    insert into work_waiters (user_id, provider, model, lane) values (p_user, p_provider, p_model, p_lane)
      on conflict (provider, model, lane, user_id) do update set seen_at = clock_timestamp();
    return 'busy:' || (ahead + 1);
  end if;
  if my_since is not null then
    delete from work_waiters where provider = p_provider and model = p_model and lane = p_lane and user_id = p_user;
  end if;
  insert into work_admissions (id, user_id, provider, model, lane, ref)
  values (p_id, p_user, p_provider, p_model, p_lane, p_ref);
  return p_id;
end $$;
