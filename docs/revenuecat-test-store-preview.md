# RevenueCat Test Store / Preview 設定メモ

要件 2-2-3（バック決済ロジック）とデータ構造に沿って、RevenueCat の Test Store と Preview で課金フローを検証するための設定手順をまとめる。

## キー管理と環境変数

- クライアント（Expo アプリ）側で使うのは **Public SDK Key のみ**。RC の Secret API Key はアプリに同梱しない。
- `.env` には以下のようにクライアント用の公開鍵を持たせる。`APP_ENV` で dev/preview/prod を出し分け、`app.config.ts` から読み出す想定。
  - `EXPO_PUBLIC_REVENUECAT_API_KEY_DEV`（Test Store 用 / 開発ビルド・Preview ビルド）
  - `EXPO_PUBLIC_REVENUECAT_API_KEY_PROD`（本番ビルド）
- Webhook 用の `REVENUECAT_WEBHOOK_SECRET` と Supabase service key は **Supabase Edge Functions の環境変数（または EAS secrets）にのみ配置**し、モバイルの .env には置かない。

## RevenueCat ダッシュボード設定（Test Store + Preview）

1. **プロジェクト/アプリ登録**  
   - iOS: `bundleIdentifier` は app.config.ts の `com.hirokiiinoue.appIdealGap`（prod）/`.dev`（dev）に合わせる。  
   - Android: `package` も同様に一致させる。
2. **Entitlement**  
   - `standard`（有料機能一式）。今は単一プランなので 1 つで OK。
3. **Offering（標準月額 30 日サイクル）**  
   - Offering ID 例: `standard_monthly`（default offering に設定）。  
   - Package: `monthly`。Test Store の仮想プロダクトを紐づけ、価格は本番想定の CAD/月に合わせる。Intro offer で「初月無料」を設定。  
   - 再サインアップ時の「初月無料なし」は後述の Webhook で `users.had_account_before = true` の場合に trial を無効化して吸収する。
4. **Test Store の有効化**  
   - `App Settings > Test Store` で ON。上記 Offering を Test Store 用に公開し、Sandbox/Preview ビルドの QA 端末で購入テスト可能にする。
5. **Preview（Paywall/Offerings の確認）**  
   - Offering を Preview 配信に設定し、RC の Preview URL で価格・トライアル表記を確認。  
   - Paywall UI を使う場合は `standard_monthly` に紐づく Paywall を作成し、Preview で表示崩れをチェックする。

## クライアント（Expo）側の SDK 設定

- Dev/Preview ビルドでは `EXPO_PUBLIC_REVENUECAT_API_KEY_DEV` を使って `Purchases.configure` する。`appUserID` は **Supabase Auth UID** を渡し、subscriptions.user_id と一致させる。
- ログレベルは dev/preview では `DEBUG`、prod では `ERROR` などに絞る。
- Offerings 取得: `standard_monthly` を取得し、`package.monthly` の価格・trial 情報を UI に表示（「初月無料・次月以降 ◯ CAD/30 日」表記をここから生成）。
- 解約/支払い方法変更は要件 2-5-3, 2-5-4 の通りストア管理画面へのディープリンクを使用（RC SDK のメソッドではなく、App Store / Google Play へ遷移）。

## Webhook と Supabase 反映（Test Store/Preview 共通）

1. RevenueCat → Supabase Edge Function（例: `/functions/v1/revenuecat-webhook`）へ Webhook を設定。HMAC 署名は `REVENUECAT_WEBHOOK_SECRET` で検証（要件 2-2-4）。  
2. Payload の `app_user_id` を Supabase UID とみなし、`subscriptions.user_id` に紐づけて upsert。`plan` は `standard` 固定。  
3. イベント処理の目安（データ構造の status/trial_ends_at/current_period_end/cancel_at_period_end を更新）:
   - `INITIAL_PURCHASE` / `RENEWAL`: status=`trial`（trial_ends_at が未来）または `active`。`current_period_end` を更新し、`cancel_at_period_end=false`。初回は `users.had_account_before` を true に更新。
   - `CANCELLATION`: `cancel_at_period_end=true` にし、有効期限までは status=`active` を維持。
   - `EXPIRATION` / `BILLING_ISSUE`: `status=expired`（有効期限超過後）。復帰イベントを受けたら `status=active` に戻す。
   - `PRODUCT_CHANGE` / `TRANSFER`: `plan` の変更を反映。
4. `users.is_canceled` は解約時に true、再アクティブ化時に false。`had_account_before` が true の場合は trial を付与せず、Webhook 側で `trial_ends_at` を購入日時に上書きして実質 0 日にする（再サインアップ無料禁止）。

## QA シナリオ（Test Store で確認）

- 新規ユーザ（had_account_before=false）: 購入後 status=`trial`、`trial_ends_at` が 30 日後。  
- 再サインアップ（had_account_before=true）: 購入直後から status=`active`、trial なし。  
- 解約予約: ストア側でキャンセル → `cancel_at_period_end=true`、期限後に `status=canceled/expired` へ遷移。  
- 課金失敗: `BILLING_ISSUE` 受信時に警告ログ、期限経過後に `expired`。復旧イベントで `active` に戻る。

## 運用メモ

- 本番リリース時は Test Store を無効にし、`EXPO_PUBLIC_REVENUECAT_API_KEY_PROD` に切り替えるだけで SDK 側は同一コードを再利用できる。
- 秘密鍵管理をより厳密にする場合は、モバイル向け .env には公開鍵のみを残し、Webhook/Edge Functions 用の鍵は Supabase の環境変数か EAS Secret に集約するのがベター。
- Edge Function では `REVENUECAT_WEBHOOK_SECRET` と `SUPABASE_SERVICE_ROLE_KEY` を Supabase 側の環境変数にのみ配置し、クライアントの .env には置かない。
