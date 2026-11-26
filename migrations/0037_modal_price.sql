alter table run_tickets add column if not exists modal_price text;
alter table run_tickets add column if not exists modal_seconds numeric not null default 0;
