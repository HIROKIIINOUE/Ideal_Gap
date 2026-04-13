# データ設計・構造

## 1. ストレージ構成の概要

### 外部 DB: Supabase (PostgreSQL)

- ユーザー情報
- サブスク状態
- 理想 / 長期目標　/　年間ゴール / 週間タスク
- タスクログ（work_sessions）
- ミュージック情報、楽しい予定

### ローカル DB: SQLite

- 理想/長期目標/年間/週間タスクのコピー
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
    current_point varchar
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
