import { User } from "@supabase/supabase-js";
import { LanguageKey } from "../types/i18n";
import {
  ensureUserProfileForAuthUser,
  getAccessStateForUser,
} from "./subscription";

type AuthEntrySource = "login" | "signup";

type ResolveAuthenticatedEntryDestinationParams = {
  source: AuthEntrySource;
  user: User;
  language?: LanguageKey | null;
};

// Google/Apple認証完了後、紐づくユーザのDB情報を確認し、データの作成and遷移先を決める
// ＜流れ＞Supabase session 確定 → users ensure → access判定 → 遷移
export const resolveAuthenticatedEntryDestination = async ({
  source,
  user,
  language,
}: ResolveAuthenticatedEntryDestinationParams) => {
  // Google/Apple認証完了後にDBに該当ユーザが存在するか確認、しなければ作成する
  await ensureUserProfileForAuthUser(user, language);

  // ユーザのアクセス権限を確認(DB上の該当ユーザに紐づくsubscription.status)
  //   → 支払い済みorトライアルの場合はダッシュボードへ
  const accessState = await getAccessStateForUser(user.id);
  if (accessState.canAccessApp) {
    return "/dashboard" as const;
  }

  return `/purchases?from=${source}` as const;
};
