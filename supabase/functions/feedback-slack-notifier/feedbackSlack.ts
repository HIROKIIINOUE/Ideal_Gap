// データベースへinsertされたデータを受け取り、データを整えてslackへの文章を生成する

export type FeedbackCategory = "bug" | "request" | "feedback" | "other" | null;
export type FeedbackPlatform = "ios" | "android" | null;

export type FeedbackRecord = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  message: string;
  category: FeedbackCategory;
  user_plan: "paid" | "free" | null;
  is_login_user: boolean;
  app_version: string | null;
  platform: FeedbackPlatform;
  created_at: string | null;
};

const fallback = "Unknown";

const CATEGORY_LABELS: Record<Exclude<FeedbackCategory, null>, string> = {
  bug: "Bug",
  request: "Feature Request",
  feedback: "Feedback",
  other: "Other",
};

// 余分な余白を削除、値が空文字や正しくない時はフォールバックする
const normalize = (value: string | null | undefined): string => {
  if (!value) return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

export const categoryToLabel = (value: FeedbackCategory): string => {
  if (!value) return fallback;
  return CATEGORY_LABELS[value] ?? fallback;
};

// slackに送信されるメッセージの雛形、ここでフォーマットを変えられる
export const buildFeedbackSlackPayload = (record: FeedbackRecord) => {
  const lines = [
    "===========================",
    `カテゴリー: ${normalize(record.category)}`,
    `プラン: ${normalize(record.user_plan === "paid" ? "Pro Plan 会員" : record.user_plan === "free" ? "無料ユーザ" : "ゲスト")}`,
    `ログイン済みかどうか: ${record.is_login_user ? "true" : "false"}`,
    `メールアドレス: ${normalize(record.user_email)}`,
    `メッセージ: ${normalize(record.message)}`,
  ];

  return { text: lines.join("\n") }; // 各ラインを改行した一つの文字列にする
};
