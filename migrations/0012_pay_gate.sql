alter table pay_settings add column if not exists sepay_on boolean not null default true;
alter table pay_settings add column if not exists casso_on boolean not null default true;
