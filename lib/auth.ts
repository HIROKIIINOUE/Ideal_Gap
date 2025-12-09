// supabaseのサインアップ・サインインロジック・パスワード変更

import { AuthError } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as Localization from "expo-localization";
import { LanguageKey } from "../types/i18n";
import { supabase } from "./supabaseClient";

type SignUpParams = {
  email: string;
  password: string;
  username: string;
  language: LanguageKey;
};

type SignUpResult =
  | { ok: true }
  | { ok: false; reason: "email_exists" | "unknown"; message: string };

type SignInParams = {
  email: string;
  password: string;
};

type SignInResult =
  | { ok: true }
  | {
      ok: false;
      reason: "user_not_found" | "invalid_password" | "unknown";
      message: string;
    };

type ResetPasswordRequestResult =
  | { ok: true }
  | {
      ok: false;
      reason: "user_not_found" | "unknown";
      message: string;
    };

type CompletePasswordResetResult =
  | { ok: true }
  | {
      ok: false;
      reason: "missing_session" | "unknown";
      message: string;
    };

const resolveTimeZone = () =>
  Localization.getCalendars?.()[0]?.timeZone ?? "UTC";

const getAppScheme = () => {
  const scheme = Constants.expoConfig?.scheme; //app.config.tsから本番・開発環境のスキーマを取得
  if (!scheme) return undefined;
  return Array.isArray(scheme) ? scheme[0] : scheme;
};

// 本番環境か開発環境かを判断し、それに応じてリダイレクト先を決定する機能
const buildRedirect = (path: string) => {
  const scheme = getAppScheme();
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  if (scheme) return `${scheme}://${normalized}`;
  // Fallback: Expo Goなどでschemeが取れないときはLinkingに任せる
  return Linking.createURL(path);
};

const isExistingEmailError = (error: AuthError) => {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.status === 400 &&
    (message.includes("already") ||
      message.includes("registered") ||
      message.includes("exists"))
  );
};

// サインアップロジック
export const signUpWithEmailConfirmation = async ({
  email,
  password,
  username,
  language,
}: SignUpParams): Promise<SignUpResult> => {
  try {
    // Eメールのサインアップリンククリック時の遷移先指定
    const emailRedirectTo = buildRedirect("/purchases?signup=1");
    // ユーザサインアップ時のユーザの端末からタイムゾーンを取得
    const timeZone = resolveTimeZone();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: username,
          language,
          time_zone: timeZone,
        },
        emailRedirectTo,
      },
    });

    if (error) {
      if (isExistingEmailError(error)) {
        return { ok: false, reason: "email_exists", message: error.message };
      }
      return { ok: false, reason: "unknown", message: error.message };
    }

    if ((data?.user?.identities?.length ?? 0) === 0) {
      return {
        ok: false,
        reason: "email_exists",
        message: "Email is already registered",
      };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return { ok: false, reason: "unknown", message };
  }
};

// パスワードリセットメール送信
export const requestPasswordResetEmail = async (
  email: string
): Promise<ResetPasswordRequestResult> => {
  try {
    const userExistsResult = await checkUserExists(email);
    if (!userExistsResult.ok) {
      return {
        ok: false,
        reason: "unknown",
        message: userExistsResult.message,
      };
    }
    if (!userExistsResult.exists) {
      return { ok: false, reason: "user_not_found", message: "User not found" };
    }

    const redirectTo = buildRedirect("/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return { ok: false, reason: "unknown", message: error.message };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return { ok: false, reason: "unknown", message };
  }
};

// supabaseが生成したリカバリートークンを解析
const parseRecoveryTokens = (url?: string | null) => {
  if (!url) return null;
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return null;
  const params = new URLSearchParams(url.slice(hashIndex + 1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = params.get("type");
  if (!accessToken || !refreshToken || type !== "recovery") {
    return null;
  }
  return { accessToken, refreshToken };
};

// リカバリメールリンクが有効かどうかbooleanで返す
export const setSessionFromRecoveryLink = async (url?: string | null) => {
  const tokens = parseRecoveryTokens(url);
  if (!tokens) return false;

  const { error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  return !error;
};

// セッションが復元されている前提でパスワードを更新
export const completePasswordReset = async (
  newPassword: string
): Promise<CompletePasswordResetResult> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { ok: false, reason: "unknown", message: error.message };
    }
    if (!data.session) {
      return {
        ok: false,
        reason: "missing_session",
        message: "Session not ready",
      };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) {
      return { ok: false, reason: "unknown", message: updateError.message };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return { ok: false, reason: "unknown", message };
  }
};

// ユーザが存在しないエラーメッセージを小文字で返す
const isUserNotFoundError = (error: AuthError) => {
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("not found") || message.includes("no user");
};

// ユーザー存在チェック
const checkUserExists = async (email: string) => {
  // 以下のクエリ文は行データを返さずHTTPヘッダーで件数のみ取得しcountにより条件に合致する件数を返している。idはダミーで実際にデータは返されていない。eqの条件に合ったデータの件数のみが拾える。(最小限の送信量にできる)
  const { count, error } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("email", email);

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const, exists: (count ?? 0) > 0 };
};

// サインインロジック
export const signInWithEmailPassword = async ({
  email,
  password,
}: SignInParams): Promise<SignInResult> => {
  try {
    const userExistsResult = await checkUserExists(email);
    if (!userExistsResult.ok) {
      return {
        ok: false,
        reason: "unknown",
        message: userExistsResult.message,
      };
    }
    if (!userExistsResult.exists) {
      return { ok: false, reason: "user_not_found", message: "User not found" };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (isUserNotFoundError(error)) {
        return { ok: false, reason: "user_not_found", message: error.message };
      }
      if (error.status === 400) {
        return {
          ok: false,
          reason: "invalid_password",
          message: error.message,
        };
      }
      return { ok: false, reason: "unknown", message: error.message };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return { ok: false, reason: "unknown", message };
  }
};
