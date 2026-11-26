alter table run_tickets add column if not exists modal_price text;
alter table run_tickets add column if not exists modal_seconds numeric not null default 0;
-- Token phải thu theo số thực nhưng phiếu không còn giữ đủ (ghi để Chủ đối soát, không trừ thêm của khách).
alter table run_tickets add column if not exists modal_short integer not null default 0;

-- Mỗi đoạn âm thanh gửi TyZo Modal trong một phiếu: chống trừ hai lần khi trình duyệt gửi lại cùng đoạn.
create table if not exists run_modal_parts (
  ticket_id text not null references run_tickets(id) on delete cascade,
  part_hash text not null,
  seconds numeric not null,
  status text not null default 'dang-chay',
  tokens integer not null default 0,
  segments text,
  created_at timestamptz not null default now(),
  primary key (ticket_id, part_hash)
);
