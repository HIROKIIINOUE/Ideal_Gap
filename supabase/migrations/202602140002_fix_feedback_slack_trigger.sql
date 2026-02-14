drop trigger if exists on_feedback_insert_notify_slack on public.feedbacks;
drop function if exists public.notify_feedback_insert_to_slack();

create trigger on_feedback_insert_notify_slack
after insert on public.feedbacks
for each row
execute function supabase_functions.http_request(
  'https://igzmrewtjtnynakakaiv.supabase.co/functions/v1/feedback-slack-notifier',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '5000'
);

