-- DB trigger (トリガー)作成。public.feedbacks への INSERT を検知して、その関数URLを叩く仕組み。
-- supabaseベースSQLエディタではなく、マイグレーション運用で履歴を残すと今後「どの変更が原因か特定しやすくなる」

create extension if not exists pg_net with schema extensions;

drop trigger if exists on_feedback_insert_notify_slack on public.feedbacks;
drop function if exists public.notify_feedback_insert_to_slack();

create or replace function public.notify_feedback_insert_to_slack()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, supabase_functions
as $$
begin
  begin
    perform supabase_functions.http_request(
      'https://igzmrewtjtnynakakaiv.supabase.co/functions/v1/feedback-slack-notifier',
      'POST',
      '{"Content-Type":"application/json"}'::jsonb,
      jsonb_build_object(
        'type', tg_op,
        'table', tg_table_name,
        'schema', tg_table_schema,
        'record', to_jsonb(new)
      ),
      5000
    );
  exception
    when others then
      raise warning 'feedback slack notify failed: %', sqlerrm;
  end;

  return new;
end;
$$;

create trigger on_feedback_insert_notify_slack
after insert on public.feedbacks
for each row
execute function public.notify_feedback_insert_to_slack();

