create table if not exists public.deleted_accounts (
  normalized_email text primary key,
  original_email text not null,
  had_account_before boolean not null default true,
  deleted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.deleted_accounts enable row level security;

create or replace function public.delete_account_data(
  p_user_id uuid,
  p_email text,
  p_had_account_before boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_email text;
  v_had_account_before boolean;
  v_now timestamptz := timezone('utc', now());
begin
  v_normalized_email := lower(trim(p_email));
  v_had_account_before := coalesce(p_had_account_before, true);

  if v_normalized_email is null or v_normalized_email = '' then
    raise exception 'email is required';
  end if;

  insert into public.deleted_accounts (
    normalized_email,
    original_email,
    had_account_before,
    deleted_at,
    created_at,
    updated_at
  )
  values (
    v_normalized_email,
    trim(p_email),
    v_had_account_before,
    v_now,
    v_now,
    v_now
  )
  on conflict (normalized_email) do update
  set
    original_email = excluded.original_email,
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
