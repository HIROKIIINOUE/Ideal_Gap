import { buildFeedbackSlackPayload, categoryToLabel } from "../supabase/functions/feedback-slack-notifier/feedbackSlack";

describe("feedback slack payload", () => {
  test("maps category labels", () => {
    expect(categoryToLabel("bug")).toBe("Bug");
    expect(categoryToLabel("request")).toBe("Feature Request");
    expect(categoryToLabel("feedback")).toBe("Feedback");
    expect(categoryToLabel("other")).toBe("Other");
    expect(categoryToLabel(null)).toBe("Unknown");
  });

  test("builds Slack payload text with fallback values", () => {
    const payload = buildFeedbackSlackPayload({
      id: "fb-1",
      user_id: null,
      user_name: "Alice",
      user_email: "alice@example.com",
      message: "ホーム画面で表示崩れを見つけました",
      category: "bug",
      is_login_user: false,
      app_version: "1.0.0",
      platform: "ios",
      created_at: "2026-02-13T10:20:30.000Z",
    });

    expect(payload.text).toContain("カテゴリー: bug");
    expect(payload.text).toContain("ログイン済みかどうか: false");
    expect(payload.text).toContain("メールアドレス: alice@example.com");
    expect(payload.text).toContain("メッセージ: ホーム画面で表示崩れを見つけました");
  });

  test("uses unknown fallbacks when optional values are missing", () => {
    const payload = buildFeedbackSlackPayload({
      id: "fb-2",
      user_id: "user-1",
      user_name: null,
      user_email: null,
      message: "Need dark mode",
      category: null,
      is_login_user: true,
      app_version: null,
      platform: null,
      created_at: null,
    });

    expect(payload.text).toContain("カテゴリー: Unknown");
    expect(payload.text).toContain("ログイン済みかどうか: true");
    expect(payload.text).toContain("メールアドレス: Unknown");
    expect(payload.text).toContain("メッセージ: Need dark mode");
  });
});
