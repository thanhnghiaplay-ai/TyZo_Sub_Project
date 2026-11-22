-- v5.42.1: tách số đo theo nơi mở phiên (web hay ứng dụng Android) và đếm sự kiện chữ, để tra phiên không ra chữ.
alter table live_latency add column if not exists via text not null default 'web';
alter table live_latency add column if not exists events integer;
