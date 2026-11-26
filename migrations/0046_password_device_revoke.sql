-- R3-004: revoke Android credentials in the SAME transaction as a credential
-- password change, including Better Auth updates and Admin SQL updates.
-- Application after-hooks alone cannot guarantee this if their retries fail.
create or replace function tyzo_revoke_devices_on_password_change()
-- BEGIN below belongs to the function body, not a migration transaction.
returns trigger language plpgsql as $$begin
  update app_devices set revoked_at = now()
    where user_id = new."userId" and revoked_at is null;
  update app_link_codes set expires_at = least(expires_at, now())
    where user_id = new."userId";
  return new;
end;
$$;

create or replace trigger tyzo_password_device_revoke
  after update of "password" on "account"
  for each row
  when (new."providerId" = 'credential' and new."password" is distinct from old."password")
  execute function tyzo_revoke_devices_on_password_change();
