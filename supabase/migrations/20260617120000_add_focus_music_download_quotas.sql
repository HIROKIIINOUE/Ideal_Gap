create table if not exists public.focus_music_download_quotas (
  user_id uuid primary key references public.users (id) on delete cascade,
  download_count integer not null default 0,
  plan_snapshot text not null,
  window_started_at timestamptz not null default timezone('utc', now()),
  reset_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint focus_music_download_quotas_download_count_check
    check (download_count >= 0),
  constraint focus_music_download_quotas_plan_snapshot_check
    check (plan_snapshot in ('free', 'paid', 'friend_free')),
  constraint focus_music_download_quotas_reset_window_check
    check (reset_at > window_started_at)
);

comment on table public.focus_music_download_quotas is
  'Current focus music download quota window per user.';

comment on column public.focus_music_download_quotas.window_started_at is
  'UTC timestamp when the current download quota window started.';

comment on column public.focus_music_download_quotas.reset_at is
  'UTC timestamp when the current download quota window resets.';

comment on column public.focus_music_download_quotas.plan_snapshot is
  'Access mode at the time the current quota row was last updated.';

create index if not exists focus_music_download_quotas_reset_at_idx
  on public.focus_music_download_quotas (reset_at);

alter table public.focus_music_download_quotas enable row level security;

create policy "Users can read own focus music download quotas"
on public.focus_music_download_quotas
for select
to authenticated
using (auth.uid() = user_id);
