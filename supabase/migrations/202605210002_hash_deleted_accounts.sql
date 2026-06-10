alter table public.deleted_accounts
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists email_hash text;

delete from public.deleted_accounts
where email_hash is null;

alter table public.deleted_accounts
  alter column id set not null,
  alter column email_hash set not null;

alter table public.deleted_accounts
  drop constraint if exists deleted_accounts_pkey;

alter table public.deleted_accounts
  add constraint deleted_accounts_pkey primary key (id);

create unique index if not exists deleted_accounts_email_hash_key
  on public.deleted_accounts (email_hash);

alter table public.deleted_accounts
  drop column if exists normalized_email,
  drop column if exists original_email;

drop function if exists public.delete_account_data(uuid, text, boolean);

create or replace function public.delete_account_data(
  p_user_id uuid,
  p_email_hash text,
  p_had_account_before boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_hash text;
  v_had_account_before boolean;
  v_now timestamptz := timezone('utc', now());
begin
  v_email_hash := trim(p_email_hash);
  v_had_account_before := coalesce(p_had_account_before, true);

  if v_email_hash is null or v_email_hash = '' then
    raise exception 'email_hash is required';
  end if;

  insert into public.deleted_accounts (
    email_hash,
    had_account_before,
    deleted_at,
    created_at,
    updated_at
  )
  values (
    v_email_hash,
    v_had_account_before,
    v_now,
    v_now,
    v_now
  )
  on conflict (email_hash) do update
  set
    had_account_before = public.deleted_accounts.had_account_before or excluded.had_account_before,
    deleted_at = excluded.deleted_at,
    updated_at = excluded.updated_at;

  delete from public.access_overrides where user_id = p_user_id;
  delete from public.feedbacks where user_id = p_user_id;
  delete from public.user_ideal where user_id = p_user_id;
  delete from public.long_term_goals where user_id = p_user_id;
  delete from public.monthly_goals where user_id = p_user_id;
  delete from public.weekly_tasks where user_id = p_user_id;
  delete from public.yearly_goals where user_id = p_user_id;
  delete from public.fun_plans where user_id = p_user_id;
  delete from public.subscriptions where user_id = p_user_id;
  delete from public.users where id = p_user_id;
end;
$$;

revoke all on function public.delete_account_data(uuid, text, boolean) from public;
grant execute on function public.delete_account_data(uuid, text, boolean) to service_role;
