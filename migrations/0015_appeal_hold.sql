create index if not exists room_appeals_hold_idx on room_appeals (hold_role, touched_at) where status = 'cho';
