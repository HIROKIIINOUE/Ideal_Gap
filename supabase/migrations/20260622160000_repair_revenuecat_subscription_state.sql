update public.subscriptions
set
  plan = 'pro_monthly',
  updated_at = timezone('utc', now())
where plan = 'standard';

update public.subscriptions
set
  status = 'expired',
  updated_at = timezone('utc', now())
where status = 'canceled'
  and cancel_at_period_end = true
  and current_period_end is not null
  and current_period_end < timezone('utc', now());
