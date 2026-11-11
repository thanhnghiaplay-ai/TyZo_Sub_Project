alter table run_tickets add column if not exists scope text not null default 'full';
