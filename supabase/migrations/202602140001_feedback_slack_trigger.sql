create extension if not exists pg_net with schema extensions;

create or replace function public.notify_feedback_insert_to_slack()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  request_id bigint;
begin
  select supabase_functions.http_request(
    url := 'https://igzmrewtjtnynakakaiv.supabase.co/functions/v1/feedback-slack-notifier',
    method := 'POST',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', to_jsonb(new),
      'old_record', null
    ),
    timeout_milliseconds := 5000
  ) into request_id;

  return new;
end;
$$;

drop trigger if exists on_feedback_insert_notify_slack on public.feedbacks;

create trigger on_feedback_insert_notify_slack
after insert on public.feedbacks
for each row
execute function public.notify_feedback_insert_to_slack();

