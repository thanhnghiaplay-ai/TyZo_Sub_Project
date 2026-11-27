-- Unknown outcomes remain capacity claims. Keep counting them independent of
-- the growing completed-work history; no financial/audit record is deleted.
create index if not exists work_admissions_active_idx
  on work_admissions (lane, user_id, provider, model)
  where status in ('running', 'unknown');
