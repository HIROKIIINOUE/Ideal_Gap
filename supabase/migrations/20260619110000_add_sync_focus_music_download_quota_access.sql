create function public.sync_focus_music_download_quota_access(
  p_user_id uuid,
  p_plan_snapshot text,
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
  v_should_reset_on_upgrade boolean;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_plan_snapshot not in ('free', 'paid', 'friend_free') then
    raise exception 'invalid plan_snapshot: %', p_plan_snapshot;
  end if;

  if p_reset_interval_days is null or p_reset_interval_days <= 0 then
    raise exception 'reset interval must be greater than zero days';
  end if;

  v_next_reset_at := v_now + make_interval(days => p_reset_interval_days);

  return query
  update public.focus_music_download_quotas as quotas
  set
    download_count = case
      when quotas.reset_at <= v_now then 0
      when quotas.plan_snapshot = 'free'
        and p_plan_snapshot in ('paid', 'friend_free') then 0
      else quotas.download_count
    end,
    plan_snapshot = p_plan_snapshot,
    window_started_at = case
      when quotas.reset_at <= v_now then v_now
      when quotas.plan_snapshot = 'free'
        and p_plan_snapshot in ('paid', 'friend_free') then v_now
      else quotas.window_started_at
    end,
    reset_at = case
      when quotas.reset_at <= v_now then v_next_reset_at
      when quotas.plan_snapshot = 'free'
        and p_plan_snapshot in ('paid', 'friend_free') then v_next_reset_at
      else quotas.reset_at
    end,
    updated_at = v_now
  where
    quotas.user_id = p_user_id
    and quotas.plan_snapshot is distinct from p_plan_snapshot
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

  return query
  select
    quotas.user_id,
    quotas.download_count,
    quotas.plan_snapshot,
    quotas.window_started_at,
    quotas.reset_at,
    quotas.created_at,
    quotas.updated_at
  from public.focus_music_download_quotas as quotas
  where quotas.user_id = p_user_id;
end;
$$;

revoke all on function public.sync_focus_music_download_quota_access(
  uuid,
  text,
  integer
) from public;

grant execute on function public.sync_focus_music_download_quota_access(
  uuid,
  text,
  integer
) to authenticated;

grant execute on function public.sync_focus_music_download_quota_access(
  uuid,
  text,
  integer
) to service_role;
