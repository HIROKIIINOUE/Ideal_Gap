# データ設計・構造

## 1. ストレージ構成の概要

### 外部 DB: Supabase (PostgreSQL)

- ユーザー情報
- サブスク状態
- 理想 /　年間ゴール / 週間タスク
- タスクログ（work_sessions）
- ミュージック情報、楽しい予定

### ローカル DB: SQLite

- 理想/年間/週間タスクのコピー
  <!-- アプリ起動時にSupabaseから「上記のユーザー最新データ」を取得 → SQLiteに保存 -->
  <!-- オフライン時も起動時に取得したデータを表示、オンライン復帰時にSupabaseに同期 -->

### ローカル key-value: Async Storage

- ログイン状態
- チュートリアルフラグ
- ユーザ設定
- 直前ページ情報
- 休憩終了通知機能
<!-- Supabase = 本番DB / SQLite = ローカルキャッシュ / AsyncStorage = 小さなメモ -->

## 2. RDB スキーマ（論理モデル）

このセクションの DBML は「理想的な論理スキーマ」を表す。

```dbml
  Table users {
    id uuid [pk]
    email varchar [not null, unique]
    name varchar [not null]
    current_point varchar  // DB上では当面残す(旧版アプリ使用中のテスター用)
    language language
    created_at timestamptz
    updated_at timestamptz
    had_account_before boolean
    is_canceled boolean
  }

  enum language {
    "ja"
    "en"
    "fr"
  }

  Table subscriptions {
    id uuid [pk]
    user_id uuid [not null, ref: > users.id]
    plan varchar  // 有料商品IDのみを保持。free判定は subscriptions行なし または status=expired で行う
    status status
    trial_ends_at timestamptz  // 将来の機能別トライアル用に保持
    current_period_end timestamptz
    cancel_at_period_end boolean
    created_at timestamptz
    updated_at timestamptz
    Indexes {
      (user_id)
    }
  }

  enum status {
    "trial"
    "active"
    "canceled"
    "expired"
  }

  Table user_ideal {
    id uuid [pk]
    user_id uuid [not null, ref: > users.id]
    description text [not null]
    "order" int // ソート用
    created_at timestamptz
    updated_at timestamptz

    Indexes {
        (user_id, "order")
    }
  }

  <!-- 現在削除(今後の復活可能性を含めてスキーマのみDBに残す) -->
  Table long_term_goals {
    id uuid [pk]
    user_id uuid [not null, ref: > users.id]
    until_when varchar [not null]
    description varchar [not null]
    is_done boolean
    "order" int // ソート用
    created_at timestamptz
    updated_at timestamptz
      Indexes {
         (user_id, "order")
      }
}

  Table yearly_goals {
    id uuid [pk]
    user_id uuid [not null, ref: > users.id]
    description varchar [not null]
    year_goal_color varchar [not null]
    yearly_goal_detail varchar
    is_done boolean
    "order" int // ソート用
    accumulated_time_year int // 円グラフ計算用
    created_at timestamptz
    updated_at timestamptz

    Indexes {
       (user_id, "order")
    }
  }

  <!-- 現在削除(今後の復活可能性を含めてスキーマのみDBに残す) -->
  Table monthly_goals {
    yearly_goal_id uuid [not null, ref: > yearly_goals.id]
    id uuid [pk]
    user_id uuid [not null, ref: > users.id]
    month int [not null]
    description varchar [not null]
    estimated_time_month int
    accumulated_time_month int
    "order" int // ソート用
    created_at timestamptz
    updated_at timestamptz

    Indexes {
      (user_id, month)
      (yearly_goal_id)
    }
  }

  <!-- 新仕様でスキーマ変更 -->
  Table weekly_tasks {
    id uuid [pk]
    user_id uuid [not null, ref: > users.id]
    yearly_goal_id uuid [ref: > yearly_goals.id]
    description varchar [not null]
    next_start_point varchar
    accumulated_time_week int // 作業タイマーの実績
    is_done boolean
    "order" int
    created_at timestamptz
    updated_at timestamptz

    Indexes {
      (yearly_goal_id)
    }
  }

  // 次回の楽しい予定データ
  Table fun_plans {
    id uuid [pk]
    user_id uuid [not null, ref: > users.id]
    description varchar [not null]
    "order" int
    created_at   timestamptz
    updated_at   timestamptz

    Indexes {
      (user_id)
    }
  }

  Table focus_music_tracks {
    id uuid [pk]
    title varchar
    bucket varchar
    storage_path varchar
    music_category varchar[]
    duration int
    created_at  timestamptz
    updated_at  timestamptz
  }

  Table focus_music_download_quotas {
    user_id uuid [pk, not null, ref: > users.id]
    download_count int [not null, default: 0]
    plan_snapshot varchar [not null] // "free" | "paid" | "friend_free"
    window_started_at timestamptz [not null] // 現在のDLカウント窓の開始時刻(UTC)
    reset_at timestamptz [not null] // 現在のDLカウント窓のリセット時刻(UTC)
    created_at timestamptz
    updated_at timestamptz

    Indexes {
      (reset_at)
    }
  }

  Table feedbacks {
    id uuid [pk]
    user_id uuid [ref: > users.id] // ログイン済みユーザの場合のみ紐づく（未ログインなら null）
    user_name varchar
    user_email varchar  // 返信用アドレス
    message text [not null]
    category category
    is_login_user boolean  // ログインユーザからの送信なら true
    app_version varchar
    platform os_type
    created_at timestamptz

    Indexes {
      (user_id)
    }
  }

  enum category {
    "bug"
    "request"
    "feedback"
    "other"
  }
  enum os_type {
    "ios"
    "android"
  }

```

## 3. マネタイズ仕様変更後のアクセス判定

- `guest`
  - 未ログイン
- `free`
  - ログイン済み
  - `subscriptions` 行がない、または `status` が `expired`
- `paid`
  - ログイン済み
  - `subscriptions.status` が `trial` または `active` または `canceled`
- `friend_free`
  - `access_overrides.access_type = 'friend_free'` かつ `is_active = true`
  - アプリ内では paid 相当として扱う

## 4. 補足方針

- 無料ユーザーを表現するための RevenueCat 商品や `subscriptions` 行は作成しない
- `subscriptions` 行が存在していても、`status` が `expired` の場合は free として扱う
- `subscriptions.status = 'canceled'` は「解約予約済みだが利用期限内」として paid 扱いにする
- `subscriptions.plan` は有料商品のみを保持し、値は `pro_monthly` を基準に統一する
- `trial_ends_at` は将来の機能別トライアル再導入に備えて保持する
- 既存の `signupAwait` は旧課金導線向けの暫定状態として扱い、新仕様実装時に廃止する
- 機能ごとの作成上限や月間DL上限は、この後の追加テーブル設計で管理する

## 5. 音楽DL数の管理方針

- `focus_music_download_quotas` は「ユーザーごとの現在のDLカウント窓」を保持する
- 1ユーザーにつき常に1行のみ保持する
- `window_started_at` と `reset_at` により、ユーザーごとに異なる30日窓を表現する
- `plan_snapshot` は、その行の最終更新時点で `free` / `paid` / `friend_free` のどれだったかを保持する
- `free -> paid` または `free -> friend_free` に切り替わった時は、新しい30日窓を開始して `download_count = 0` にリセットする
- `paid|friend_free -> free` に切り替わった時は、現在の `download_count` と `reset_at` を維持したまま `plan_snapshot` だけ free へ更新する
- 無料ユーザーの月間上限は 5 件、有料ユーザーの月間上限は 30 件を想定する
- 上限判定と加算はクライアントの read -> write で行わず、DB関数(RPC)で原子的に処理する

## 6. DB関数(RPC)方針

- `increment_focus_music_download_quota(...)` を追加し、音楽DL成功直前に呼び出す
- `sync_focus_music_download_quota_access(...)` を追加し、プラン変更時に `plan_snapshot` と必要なDL窓リセットを同期する
- この関数は以下を1回で実行する
  - 行がなければ新しいDL窓を作成
  - `reset_at` を過ぎていたら `download_count` をリセットし、新しい窓を開始する
  - 窓の有効期間中なら `download_count` を加算する
  - `plan_snapshot` と `updated_at` を更新する
  - 上限超過時は更新せずエラーにする
- 月間DL制限のような改ざん耐性が必要な値は、今後もこのようなRPC経由で更新する
