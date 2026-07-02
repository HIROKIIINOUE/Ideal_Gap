alter table if exists public.focus_music_download_quotas
  add column if not exists window_started_at timestamptz,
  add column if not exists reset_at timestamptz;

do $$
declare
  v_has_month_key boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'focus_music_download_quotas'
      and column_name = 'month_key'
  ) into v_has_month_key;

  if v_has_month_key then
    execute $sql$
      update public.focus_music_download_quotas
      set
        window_started_at = coalesce(
          window_started_at,
          case
            when month_key ~ '^\d{4}-\d{2}$'
              then to_date(month_key || '-01', 'YYYY-MM-DD')::timestamp at time zone 'utc'
            else timezone('utc', now())
          end
        ),
        reset_at = coalesce(
          reset_at,
          case
            when month_key ~ '^\d{4}-\d{2}$'
              then (
                to_date(month_key || '-01', 'YYYY-MM-DD')::timestamp
                + interval '1 month'
              ) at time zone 'utc'
            else timezone('utc', now()) + interval '30 days'
          end
        )
    $sql$;
  else
    update public.focus_music_download_quotas
    set
      window_started_at = coalesce(window_started_at, timezone('utc', now())),
      reset_at = coalesce(reset_at, timezone('utc', now()) + interval '30 days');
  end if;
end
$$;

alter table if exists public.focus_music_download_quotas
  alter column window_started_at set default timezone('utc', now()),
  alter column window_started_at set not null,
  alter column reset_at set not null;

alter table if exists public.focus_music_download_quotas
  drop constraint if exists focus_music_download_quotas_month_key_format_check,
  drop constraint if exists focus_music_download_quotas_month_key_check,
  drop constraint if exists focus_music_download_quotas_plan_snapshot_check,
  drop constraint if exists focus_music_download_quotas_reset_window_check;

alter table if exists public.focus_music_download_quotas
  add constraint focus_music_download_quotas_plan_snapshot_check
    check (plan_snapshot in ('free', 'paid', 'friend_free')),
  add constraint focus_music_download_quotas_reset_window_check
    check (reset_at > window_started_at);

drop index if exists public.focus_music_download_quotas_month_key_idx;
create index if not exists focus_music_download_quotas_reset_at_idx
  on public.focus_music_download_quotas (reset_at);

alter table if exists public.focus_music_download_quotas
  drop column if exists month_key;

comment on table public.focus_music_download_quotas is
  'Current focus music download quota window per user.';

comment on column public.focus_music_download_quotas.window_started_at is
  'UTC timestamp when the current download quota window started.';

comment on column public.focus_music_download_quotas.reset_at is
  'UTC timestamp when the current download quota window resets.';

comment on column public.focus_music_download_quotas.plan_snapshot is
  'Access mode at the time the current quota row was last updated.';

alter table if exists public.focus_music_download_quotas enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'focus_music_download_quotas'
      and policyname = 'Users can read own focus music download quotas'
  ) then
    create policy "Users can read own focus music download quotas"
    on public.focus_music_download_quotas
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;
end
$$;

drop function if exists public.increment_focus_music_download_quota(
  uuid,
  text,
  integer,
  integer,
  integer
);

create function public.increment_focus_music_download_quota(
  p_user_id uuid,
  p_plan_snapshot text,
  p_increment integer default 1,
  p_max_downloads integer default null,
  p_reset_interval_days integer default 30
)
returns table (
  user_id uuid,
  download_count integer,
  plan_snapshot text,
  window_started_at timestamptz,
  reset_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_next_reset_at timestamptz;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_plan_snapshot not in ('free', 'paid', 'friend_free') then
    raise exception 'invalid plan_snapshot: %', p_plan_snapshot;
  end if;

  if p_increment is null or p_increment <= 0 then
    raise exception 'increment must be greater than zero';
  end if;

  if p_reset_interval_days is null or p_reset_interval_days <= 0 then
    raise exception 'reset interval must be greater than zero days';
  end if;

  if p_max_downloads is not null and p_max_downloads < p_increment then
    raise exception 'monthly download limit reached';
  end if;

  v_next_reset_at := v_now + make_interval(days => p_reset_interval_days);

  return query
  insert into public.focus_music_download_quotas as quotas (
    user_id,
    download_count,
    plan_snapshot,
    window_started_at,
    reset_at,
    created_at,
    updated_at
  )
  values (
    p_user_id,
    p_increment,
    p_plan_snapshot,
    v_now,
    v_next_reset_at,
    v_now,
    v_now
  )
  on conflict (user_id) do update
  set
    download_count = case
      when quotas.reset_at <= v_now then excluded.download_count
      else quotas.download_count + excluded.download_count
    end,
    plan_snapshot = excluded.plan_snapshot,
    window_started_at = case
      when quotas.reset_at <= v_now then v_now
      else quotas.window_started_at
    end,
    reset_at = case
      when quotas.reset_at <= v_now then v_next_reset_at
      else quotas.reset_at
    end,
    updated_at = v_now
  where
    p_max_downloads is null
    or (
      case
        when quotas.reset_at <= v_now then excluded.download_count
        else quotas.download_count + excluded.download_count
      end
    ) <= p_max_downloads
  returning
    quotas.user_id,
    quotas.download_count,
    quotas.plan_snapshot,
    quotas.window_started_at,
    quotas.reset_at,
    quotas.created_at,
    quotas.updated_at;

  if found then
    return;
  end if;

  raise exception 'monthly download limit reached';
end;
$$;

revoke all on function public.increment_focus_music_download_quota(
  uuid,
  text,
  integer,
  integer,
  integer
) from public;

grant execute on function public.increment_focus_music_download_quota(
  uuid,
  text,
  integer,
  integer,
  integer
) to authenticated;

grant execute on function public.increment_focus_music_download_quota(
  uuid,
  text,
  integer,
  integer,
  integer
) to service_role;
