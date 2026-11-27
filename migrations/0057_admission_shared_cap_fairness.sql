-- RE5-003 (v5.49.6): 0056 chỉ bảo vệ khách chờ cùng provider+model, nhưng trần provider và trần lane dùng chung.
-- Khách mới model khác (cùng nhà) hoặc nhà khác (cùng lane) chen được suất khách chờ đang cần.
-- Bản này giữ chữ ký, bảng và mọi trần của 0055/0056; chỉ đổi cách tính chỗ phải nhường:
--   * khách chờ được xét nếu còn hiện diện (≤ 6 s), đã chờ ≥ 3 s, đến trước, và dùng chung ÍT NHẤT một tài nguyên
--     có trần với khách mới (cùng lane, hoặc cùng provider — trần provider và phần không-live tính theo provider);
--   * duyệt theo thứ tự đến; khách chờ chỉ giữ chỗ khi CHÍNH họ nhận được suất trên mọi tài nguyên của họ
--     (lane, provider, provider+model, phần không-live, suất riêng, không có lượt «không chắc») — bài học RE4-003;
--   * giữ chỗ thì trừ phần còn trống của từng tài nguyên; khách mới được nhận khi mọi tài nguyên của mình còn chỗ.
create or replace function tyzo_admit(
  p_id text, p_user text, p_provider text, p_model text, p_lane text,
  p_defaults jsonb, p_stale_seconds integer, p_ref text
) returns text language plpgsql as $$
declare
  cfg jsonb; lim jsonb; my_since timestamptz; now_at timestamptz; ahead integer := 0; free integer;
  n_lane integer; n_own integer; n_provider integer; n_model integer; n_uncertain integer; n_provider_nonlive integer;
  c_lane integer; c_user integer; c_provider integer; c_model integer; c_reserve integer;
  m_lane jsonb; m_prov jsonb; m_model jsonb; m_nonlive jsonb; m_own jsonb; m_unc jsonb;
  r record; k_lane text; k_prov text; k_model text; k_own text; r_lane_cap integer; r_user_cap integer;
  wait_live integer := 6; starve integer := 3;
  -- Từ khóa mở thân hàm để cuối dòng: migrate.mjs từ chối dòng mở đầu bằng BEGIN/COMMIT/ROLLBACK.
  claimed boolean; begin
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
  -- Mức đang dùng, một lần, thành các bảng tra (khóa là mảng JSON để không lẫn ký tự phân cách).
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
    coalesce((select jsonb_object_agg(k, n) from (select lane as k, count(*) n from active group by lane) x), '{}'),
    coalesce((select jsonb_object_agg(k, n) from (select provider as k, count(*) n from active group by provider) x), '{}'),
    coalesce((select jsonb_object_agg(k, n) from (select jsonb_build_array(provider, model)::text as k, count(*) n from active group by provider, model) x), '{}'),
    coalesce((select jsonb_object_agg(k, n) from (select provider as k, count(*) n from active where lane <> 'live' group by provider) x), '{}'),
    coalesce((select jsonb_object_agg(k, n) from (select jsonb_build_array(user_id, lane)::text as k, count(*) n from active group by user_id, lane) x), '{}'),
    coalesce((select jsonb_object_agg(k, true) from (select distinct jsonb_build_array(user_id, lane, provider)::text as k from active where uncertain) x), '{}')
  into m_lane, m_prov, m_model, m_nonlive, m_own, m_unc;
  n_lane := coalesce((m_lane->>p_lane)::int, 0);
  n_provider := coalesce((m_prov->>p_provider)::int, 0);
  n_model := coalesce((m_model->>jsonb_build_array(p_provider, p_model)::text)::int, 0);
  n_provider_nonlive := coalesce((m_nonlive->>p_provider)::int, 0);
  n_own := coalesce((m_own->>jsonb_build_array(p_user, p_lane)::text)::int, 0);
  n_uncertain := case when m_unc ? jsonb_build_array(p_user, p_lane, p_provider)::text then 1 else 0 end;
  if n_uncertain > 0 then return 'uncertain'; end if;
  -- Khách đã dùng đủ suất riêng: chờ chính mình, không xếp hàng chặn người khác.
  if n_own >= c_user then return 'busy'; end if;
  free := least(c_lane - n_lane, c_provider - n_provider, c_model - n_model);
  -- Phần dành riêng cho live giới hạn việc không-live đã nhận; live đang dùng phần đó không tính lại.
  if p_lane <> 'live' then free := least(free, c_provider - c_reserve - n_provider_nonlive); end if;
  if free <= 0 then
    -- Hết suất: chỉ ghi chỗ chờ và tính vị trí (đường bận ngắn nhất dưới khóa).
    insert into work_waiters (user_id, provider, model, lane) values (p_user, p_provider, p_model, p_lane)
      on conflict (provider, model, lane, user_id) do update set seen_at = now_at,
        -- Đã rời hàng (nhận suất rồi, hoặc bỏ đi quá wait_live) thì xếp lại từ cuối.
        since = case when work_waiters.seen_at <= now_at - make_interval(secs => wait_live)
                     then now_at else work_waiters.since end
      returning since into my_since;
    select count(*) into ahead from work_waiters w
      where (w.lane = p_lane or w.provider = p_provider) and w.user_id <> p_user
        and w.seen_at > now_at - make_interval(secs => wait_live)
        and (w.since, w.user_id) < (my_since, p_user);
    return 'busy:' || (ahead + 1);
  end if;
  select min(since) into my_since from work_waiters
    where provider = p_provider and model = p_model and lane = p_lane and user_id = p_user
      and seen_at > now_at - make_interval(secs => wait_live);
  -- Nhường theo thứ tự đến cho khách chờ đủ điều kiện, trừ dần phần còn trống của từng tài nguyên.
  for r in
    select w.user_id, w.provider, w.model, w.lane from work_waiters w
    where w.user_id <> p_user
      and (w.lane = p_lane or w.provider = p_provider)
      and w.seen_at > now_at - make_interval(secs => wait_live)
      and w.since <= now_at - make_interval(secs => starve)
      and (my_since is null or (w.since, w.user_id) < (my_since, p_user))
    order by w.since, w.user_id, w.provider, w.model, w.lane
  loop
    k_lane := r.lane; k_prov := r.provider; k_model := jsonb_build_array(r.provider, r.model)::text;
    k_own := jsonb_build_array(r.user_id, r.lane)::text;
    r_lane_cap := (lim->>r.lane)::int;
    r_user_cap := (lim->>(case when r.lane = 'modal' then 'perUserModal' else 'perUser' end))::int;
    claimed := r_lane_cap is not null
      and not (m_unc ? jsonb_build_array(r.user_id, r.lane, r.provider)::text)
      and coalesce((m_own->>k_own)::int, 0) < r_user_cap
      and coalesce((m_lane->>k_lane)::int, 0) < r_lane_cap
      and coalesce((m_prov->>k_prov)::int, 0) < c_provider
      and coalesce((m_model->>k_model)::int, 0) < c_model
      and (r.lane = 'live' or coalesce((m_nonlive->>k_prov)::int, 0) < c_provider - c_reserve);
    if claimed then
      m_lane := jsonb_set(m_lane, array[k_lane], to_jsonb(coalesce((m_lane->>k_lane)::int, 0) + 1));
      m_prov := jsonb_set(m_prov, array[k_prov], to_jsonb(coalesce((m_prov->>k_prov)::int, 0) + 1));
      m_model := jsonb_set(m_model, array[k_model], to_jsonb(coalesce((m_model->>k_model)::int, 0) + 1));
      m_own := jsonb_set(m_own, array[k_own], to_jsonb(coalesce((m_own->>k_own)::int, 0) + 1));
      if r.lane <> 'live' then
        m_nonlive := jsonb_set(m_nonlive, array[k_prov], to_jsonb(coalesce((m_nonlive->>k_prov)::int, 0) + 1));
      end if;
      ahead := ahead + 1;
    end if;
  end loop;
  if coalesce((m_lane->>p_lane)::int, 0) >= c_lane
    or coalesce((m_prov->>p_provider)::int, 0) >= c_provider
    or coalesce((m_model->>jsonb_build_array(p_provider, p_model)::text)::int, 0) >= c_model
    or (p_lane <> 'live' and coalesce((m_nonlive->>p_provider)::int, 0) >= c_provider - c_reserve) then
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
