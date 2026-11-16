alter table pay_orders add column if not exists purpose text not null default 'nap';
alter table pay_orders add column if not exists ref text not null default '';
alter table pay_orders add column if not exists detail text not null default '';

update run_tickets
set released = released + held,
    held = 0,
    status = 'da-nha',
    closed_at = coalesce(closed_at, now())
where status = 'dang-giu' and unit = 'vnd' and held > 0;

update room_accounts set balance = 0 where balance <> 0;

update pay_orders
set status = 'void', provider_ref = coalesce(provider_ref, 'bo-vi')
where status in ('pending', 'claimed') and purpose = 'nap';
