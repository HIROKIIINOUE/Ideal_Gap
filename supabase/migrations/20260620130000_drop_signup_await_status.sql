delete from public.subscriptions
where status = 'signupAwait';

alter type public.status rename to status_old;

create type public.status as enum (
  'trial',
  'active',
  'canceled',
  'expired'
);

alter table public.subscriptions
  alter column status
  type public.status
  using (
    case
      when status is null then null
      else status::text::public.status
    end
  );

drop type public.status_old;
