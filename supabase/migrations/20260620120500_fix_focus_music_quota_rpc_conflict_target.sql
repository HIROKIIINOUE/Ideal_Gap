create or replace function public.increment_focus_music_download_quota(
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
  on conflict on constraint focus_music_download_quotas_pkey do update
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
