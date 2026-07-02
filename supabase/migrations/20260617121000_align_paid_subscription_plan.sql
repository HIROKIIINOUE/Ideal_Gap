comment on column public.subscriptions.plan is
  'Paid product identifier only. Free users are represented without a subscription row.';

update public.subscriptions
set
  plan = 'pro_monthly',
  updated_at = timezone('utc', now())
where plan = 'standard';
