# feedbacks -> Slack 通知（Supabase Edge Functions）

## 追加した内容

- `supabase/functions/feedback-slack-notifier/index.ts`
  - DB Webhook(INSERT)のpayloadを受け取り、`SLACK_WEBHOOK_URL` へ通知を送信
- `supabase/functions/feedback-slack-notifier/feedbackSlack.ts`
  - Slack通知文面の共通生成ロジック
- `supabase/migrations/202602140001_feedback_slack_trigger.sql`
  - `feedbacks` テーブルの `AFTER INSERT` トリガー
  - `supabase_functions.http_request` で Edge Function を呼び出し
- `supabase/migrations/202602140002_fix_feedback_slack_trigger.sql`
  - INSERT失敗を回避するため、トリガー定義を `supabase_functions.http_request(...)` 直接実行に修正
- `supabase/migrations/202602140003_harden_feedback_slack_trigger.sql`
  - 通知処理失敗時でも `feedbacks` INSERT 自体は失敗しないように例外ハンドリングを追加

## 適用手順

1. Edge Function をJWT検証なしでデプロイ

```bash
npx supabase functions deploy feedback-slack-notifier --no-verify-jwt
```

2. DB migration を適用

```bash
npx supabase db push
```

## 動作確認（例）

```sql
insert into public.feedbacks (
  user_id,
  user_name,
  user_email,
  message,
  category,
  is_login_user,
  app_version,
  platform
) values (
  null,
  'Test User',
  'test@example.com',
  'Slack通知テスト',
  'feedback',
  false,
  '1.0.0',
  'ios'
);
```

INSERT後にSlack通知が届けば設定完了です。
