# データ設計・構造

## 1. ストレージ構成の概要

### 外部 DB: Supabase (PostgreSQL)

- ユーザー情報
- サブスク状態
- 理想 / 年間 / 月間 / 週間タスク
- タスクログ（work_sessions）
- ミュージック情報、楽しい予定

### ローカル DB: SQLite

- 理想/年間/⽉間/週間タスクのコピー
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
    language language
    time_zone varchar  //サインアップ時のもの(手動変更可能)
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
    plan varchar  // 現段階ではスタンダードプランのみ
    status status
    trial_ends_at timestamptz
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
    "signupAwait"
  }

  Table user_settings {
    user_id uuid [pk, ref: > users.id]
    show_fun_plan_on_dashboard boolean //実装の有無検討中
    break_notification_enabled boolean
    default_focus_music_id uuid [ref: > focus_musics.id]
    created_at timestamptz
    updated_at timestamptz
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

  Table yearly_goals {
    id uuid [pk]
    user_id uuid [not null, ref: > users.id]
    description varchar [not null]
    year_goal_color varchar [not null]
    "order" int // ソート用
    accumulated_time_year int // 円グラフ計算用
    created_at timestamptz
    updated_at timestamptz

    Indexes {
       (user_id, "order")
    }
  }

  Table monthly_goals {
    yearly_goal_id uuid [not null, ref: > yearly_goals.id]
    id uuid [pk]
    user_id uuid [not null, ref: > users.id]
    month int [not null]
    description varchar [not null]
    estimated_time_month int  //月間ゴール目標時間
    accumulated_time_month int // 紐づく週間タスクから積み上げられる
    "order" int // ソート用
    created_at timestamptz
    updated_at timestamptz

    Indexes {
      (user_id, month)
      (yearly_goal_id)
    }
  }


  Table weekly_tasks {
    id uuid [pk]
    user_id uuid [not null, ref: > users.id]
    monthly_goal_id uuid [ref: > monthly_goals.id]
    description varchar [not null]
    estimated_time_week int // 各週間タスクの目標作業時間
    accumulated_time_week int // 作業タイマーの実績
    "order" int
    created_at timestamptz
    updated_at timestamptz

    Indexes {
      (user_id, bucket)
      (monthly_goal_id)
    }
  }

  // 作業タイマーデータ

  Table work_sessions {
    id uuid [pk]
    user_id uuid [not null, ref: > users.id]
    weekly_task_id uuid [not null, ref: > weekly_tasks.id]
    started_at timestamptz [not null]
    ended_at timestamptz [not null]
    duration_minutes int [not null]  //分に換算 年間月間週間全てのaccumulatedの積上げに利用
    created_at timestamptz
    updated_at timestamptz

    Indexes {
      (weekly_task_id)
      (user_id, started_at)
    }
  }

  // 作業集中用ミュージック
  Table focus_musics {
    id uuid [pk]
    title varchar [not null]
    duration_seconds int
    file_url text
    created_at  timestamptz
    updated_at  timestamptz
  }

  Table user_musics {
    id uuid [pk]
    user_id uuid [not null, ref: > users.id]
    focus_music_id uuid [not null, ref: > focus_musics.id]
    is_downloaded boolean
    created_at timestamptz
    updated_at timestamptz

    Indexes {
      (user_id)
      (focus_music_id)
    }
  }

  // 次回の楽しい予定データ(実装は検討段階)
  Table fun_plans {
    id uuid [pk]
    user_id uuid [not null, ref: > users.id]
    description varchar [not null]
    scheduled_at timestamptz [not null]
    created_at   timestamptz
    updated_at   timestamptz

    Indexes {
      (user_id, scheduled_at)
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
