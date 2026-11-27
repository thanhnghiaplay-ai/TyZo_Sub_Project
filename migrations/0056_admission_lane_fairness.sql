-- RE4-003: retain the 0055 signature and waiters, but allocate protection only
-- to eligible older waiters and only against resources they can actually use.
create or replace function tyzo_admit(
  p_id text, p_user text, p_provider text, p_model text, p_lane text,
  p_defaults jsonb, p_stale_seconds integer, p_ref text
) returns text language plpgsql as $$
declare
  cfg jsonb; lim jsonb; my_since timestamptz; now_at timestamptz; ahead integer; free integer;
  ahead_lane integer := 0; ahead_nonlive integer := 0; free_nonlive integer;
  n_lane integer; n_own integer; n_provider integer; n_model integer; n_uncertain integer;
  n_batch integer; n_live integer; n_modal integer; n_provider_nonlive integer;
  -- Từ khóa mở thân hàm để cuối dòng: migrate.mjs từ chối dòng mở đầu bằng BEGIN/COMMIT/ROLLBACK.
  c_lane integer; c_user integer; c_provider integer; c_model integer; c_reserve integer; wait_live integer := 6; starve integer := 3; begin
  perform pg_advisory_xact_lock(84201912);
  now_at := clock_timestamp();
  select value::jsonb into cfg from room_settings where key = 'work_admission';
  lim := p_defaults || coalesce(cfg, '{}'::jsonb);
  if not coalesce((lim->>'enabled')::boolean, true) then return 'disabled'; end if;
  c_lane := (lim->>p_lane)::int;
  c_user := (lim->>(case when p_lane = 'modal' then 'perUserModal' else 'perUser' end))::int;
  c_provider := (lim->>'perProvider')::int;
  c_model := (lim->>'perModel')::int;
  c_reserve := greatest(0, coalesce((lim->>'liveReserve')::int, 0));
  if c_lane is null or c_user is null or c_provider is null or c_model is null then
    raise exception 'Cấu hình nhận việc không hợp lệ.';
  end if;
  update work_admissions set status = 'unknown', finished_at = clock_timestamp()
    where status = 'running' and heartbeat_at <= now_at - make_interval(secs => p_stale_seconds);
  with active as (
    select lane, user_id, provider, model, status = 'unknown' as uncertain
    from work_admissions where status in ('running', 'unknown')
    union all
    select 'batch', j.user_id, j.provider, j.model, j.state = 'unknown'
    from run_async_asr_jobs j
    where j.state in ('pending', 'running', 'unknown') and j.deadline_at > now_at
      and not exists (select 1 from work_admissions w where w.ref = j.call_id and w.status in ('running', 'unknown'))
  )
  select
    count(*) filter (where lane = 'batch'),
    count(*) filter (where lane = 'live'),
    count(*) filter (where lane = 'modal'),
    count(*) filter (where provider = p_provider and lane <> 'live'),
    count(*) filter (where lane = p_lane and user_id = p_user),
    count(*) filter (where provider = p_provider),
    count(*) filter (where provider = p_provider and model = p_model),
    count(*) filter (where lane = p_lane and user_id = p_user and provider = p_provider and uncertain)
  into n_batch, n_live, n_modal, n_provider_nonlive, n_own, n_provider, n_model, n_uncertain
  from active;
  n_lane := case p_lane when 'batch' then n_batch when 'live' then n_live when 'modal' then n_modal end;
  if n_uncertain > 0 then return 'uncertain'; end if;
  -- Khách đã dùng đủ suất riêng: chờ chính mình, không xếp hàng chặn người khác.
  if n_own >= c_user then return 'busy'; end if;
  free := least(c_lane - n_lane, c_provider - n_provider, c_model - n_model);
  -- The reserved slice limits admitted non-live work. Live already using its
  -- slice does not consume it again when a batch slot is released.
  free_nonlive := c_provider - c_reserve - n_provider_nonlive;
  if p_lane <> 'live' then free := least(free, free_nonlive); end if;
  if free <= 0 then
    -- Hết suất: chỉ ghi chỗ chờ và tính vị trí (đường bận ngắn nhất dưới khóa).
    insert into work_waiters (user_id, provider, model, lane) values (p_user, p_provider, p_model, p_lane)
      on conflict (provider, model, lane, user_id) do update set seen_at = now_at,
        -- Đã rời hàng (nhận suất rồi, hoặc bỏ đi quá wait_live) thì xếp lại từ cuối.
        since = case when work_waiters.seen_at <= now_at - make_interval(secs => wait_live)
                     then now_at else work_waiters.since end
      returning since into my_since;
    select count(*) into ahead from work_waiters w
      where w.provider = p_provider and w.model = p_model and w.lane = p_lane and w.user_id <> p_user
        and w.seen_at > now_at - make_interval(secs => wait_live)
        and (w.since, w.user_id) < (my_since, p_user);
    return 'busy:' || (ahead + 1);
  end if;
  select since into my_since from work_waiters
    where provider = p_provider and model = p_model and lane = p_lane and user_id = p_user
      and seen_at > now_at - make_interval(secs => wait_live);
  -- Aged customers retain priority for the same provider/model. Clip claims
  -- by the actual lane and non-live capacities before counting shared slots.
  with rivals as (
    select w.user_id, w.lane, w.since,
      case w.lane
        when 'batch' then (lim->>'batch')::int - n_batch
        when 'live' then (lim->>'live')::int - n_live
        when 'modal' then (lim->>'modal')::int - n_modal
        else 0
      end as lane_free,
      (lim->>(case when w.lane = 'modal' then 'perUserModal' else 'perUser' end))::int as user_cap
    from work_waiters w
    where w.provider = p_provider and w.model = p_model and w.user_id <> p_user
      and w.seen_at > now_at - make_interval(secs => wait_live)
      and w.since <= now_at - make_interval(secs => starve)
      and (my_since is null or (w.since, w.user_id) < (my_since, p_user))
      and (w.lane = 'live' or free_nonlive > 0)
  ), eligible as (
    select r.*, row_number() over (partition by r.lane order by r.since, r.user_id) as lane_rank
    from rivals r
    cross join lateral (
      select count(*) as own, coalesce(bool_or(a.uncertain), false) as uncertain
      from (
        select w.status = 'unknown' and w.provider = p_provider as uncertain
        from work_admissions w where w.lane = r.lane and w.user_id = r.user_id
          and w.status in ('running', 'unknown')
        union all
        select j.state = 'unknown' and j.provider = p_provider
        from run_async_asr_jobs j where r.lane = 'batch' and j.user_id = r.user_id
          and j.state in ('pending', 'running', 'unknown') and j.deadline_at > now_at
          and not exists (select 1 from work_admissions w where w.ref = j.call_id and w.status in ('running', 'unknown'))
      ) a
    ) per_user
    where r.lane_free > 0 and per_user.own < r.user_cap and not per_user.uncertain
  ), claims as (
    select lane, count(*) filter (where lane <> 'live') over (
      order by since, user_id, lane rows unbounded preceding
    ) as nonlive_rank
    from eligible where lane_rank <= lane_free
  )
  select count(*), count(*) filter (where lane = p_lane), count(*) filter (where lane <> 'live')
    into ahead, ahead_lane, ahead_nonlive
    from claims where lane = 'live' or nonlive_rank <= free_nonlive;
  if least(c_lane - n_lane - ahead_lane, c_provider - n_provider - ahead, c_model - n_model - ahead) <= 0
    or (p_lane <> 'live' and free_nonlive <= ahead_nonlive) then
    insert into work_waiters (user_id, provider, model, lane) values (p_user, p_provider, p_model, p_lane)
      on conflict (provider, model, lane, user_id) do update set seen_at = now_at,
        -- Đã rời hàng (nhận suất rồi, hoặc bỏ đi quá wait_live) thì xếp lại từ cuối.
        since = case when work_waiters.seen_at <= now_at - make_interval(secs => wait_live)
                     then now_at else work_waiters.since end;
    return 'busy:' || (ahead + 1);
  end if;
  if my_since is not null then
    update work_waiters set seen_at = '-infinity' where provider = p_provider and model = p_model and lane = p_lane and user_id = p_user;
  end if;
  insert into work_admissions (id, user_id, provider, model, lane, ref)
  values (p_id, p_user, p_provider, p_model, p_lane, p_ref);
  return p_id;
end $$;
