// supabaseのAuth 関連の処理をまとめたユーティリティ
// サインアップ、ログイン、パスワードリセット、環境(本番or開発)に応じたリダイレクトURL生成
// メールアドレスの変更はapp/profile-update.tsxで直接supabase.auth.updateUserを呼んでいるためここには切り出されていない。

import { AuthError } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { LanguageKey } from "../types/i18n";
import { captureSupabaseAuthUnexpectedError } from "./sentry";
import { supabase, supabaseRecovery } from "./supabaseClient";

type SignUpParams = {
  email: string;
  password: string;
  username: string;
  language: LanguageKey;
};

type SignUpResult =
  | { ok: true }
  | {
      ok: false;
      reason: "email_exists" | "email_unconfirmed" | "unknown";
      message: string;
    };

type SignInParams = {
  email: string;
  password: string;
};

type SignInResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "user_not_found"
        | "invalid_password"
        | "email_unconfirmed"
        | "unknown";
      message: string;
    };

type ResetPasswordRequestResult =
  | { ok: true }
  | {
      ok: false;
      reason: "user_not_found" | "rate_limited" | "unknown";
      message: string;
    };

type CompletePasswordResetResult =
  | { ok: true }
  | {
      ok: false;
      reason: "missing_session" | "rate_limited" | "unknown";
      message: string;
    };

// redirectTo/emailRedirectTo に使うアプリURLスキームを、環境(本番or開発)に応じて決める関数
const getAppScheme = () => {
  const configuredScheme = Constants.expoConfig?.scheme; //app.config.tsから本番・開発環境のスキーマを取得
  const schemes = Array.isArray(configuredScheme)
    ? configuredScheme
    : configuredScheme
      ? [configuredScheme]
      : [];
  const appEnv = Constants.expoConfig?.extra?.appEnv;
  const preferredScheme = appEnv === "prod" ? "idealgap" : "ideal-gap-dev";

  if (schemes.includes(preferredScheme)) return preferredScheme;
  return schemes[0] ?? preferredScheme;
};

// 本番環境か開発環境かを判断し、それに応じてリダイレクト先を決定する機能
const buildRedirect = (path: string) => {
  const scheme = getAppScheme();
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  if (scheme) return `${scheme}://${normalized}`;
  // Fallback: Expo Goなどでschemeが取れないときはLinkingに任せる
  return Linking.createURL(path);
};

// 外部からも使えるように公開
export const buildRedirectUrl = (path: string) => buildRedirect(path);

const isExistingEmailError = (error: AuthError) => {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.status === 400 &&
    (message.includes("already") ||
      message.includes("registered") ||
      message.includes("exists"))
  );
};

// 本人確認が未完了が原因のエラーかどうかを判定
const isEmailNotConfirmedError = (error: AuthError) => {
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("email not confirmed");
};

// 本人確認メールの再送信
const resendSignupConfirmationEmail = async (email: string) => {
  const emailRedirectTo = buildRedirect("/purchases?signup=1");
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const };
};

// サインアップで登録しようとしたアドレスが既にSupabase上にある場合に、以下の関数が呼び起こされる。
// サインアップ時に使用されたアドレスでログインを試み、問題なくログインができれば「ユーザは既に存在している」という結果を返し、ログインが失敗すれば「本人確認が未完了のユーザが存在している」という結果を返し、本人確認メール再送信の処理を実行する
const tryResendConfirmationForExistingUnconfirmedUser = async (
  email: string,
  password: string,
): Promise<SignUpResult | null> => {
  // 本人確認が未完了の場合はsignInWithPasswordでその旨を含んだerrorが返ってくる
  const { error } = await supabaseRecovery.auth.signInWithPassword({
    email,
    password,
  });

  if (!error) {
    await supabaseRecovery.auth.signOut();
    return {
      ok: false,
      reason: "email_exists",
      message: "Email is already registered",
    };
  }

  if (!isEmailNotConfirmedError(error)) {
    return null;
  }

  const resendResult = await resendSignupConfirmationEmail(email);
  if (!resendResult.ok) {
    return {
      ok: false,
      reason: "unknown",
      message: resendResult.message,
    };
  }

  // 本人確認メールの再送信後にユーザへ状況を説明するためのデータを返す
  return {
    ok: false,
    reason: "email_unconfirmed",
    message: "Email verification resent",
  };
};

// サインアップロジック
export const signUpWithEmailConfirmation = async ({
  email,
  password,
  username,
  language,
}: SignUpParams): Promise<SignUpResult> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: username,
          language,
        },
        // emailRedirectToはメール内リンククリック時の遷移先指定。Supabase側の Redirect URL 設定に含まれている必要あり
        emailRedirectTo: buildRedirect("/purchases?signup=1"),
      },
    });

    // ユーザがすでに存在している場合auth.signUp()はerrorを返す(その他が原因の場合はSentryに送られ。理由はunknownを返す)
    if (error) {
      if (isExistingEmailError(error)) {
        // 本人確認がまだかどうかを判断、まだの場合はtryResendConfirmationForExistingUnconfirmedUser内でメール再送信処理をし、
        // その状況をユーザに知らせるためのデータをunconfirmedResultに保持させる
        const unconfirmedResult =
          await tryResendConfirmationForExistingUnconfirmedUser(
            email,
            password,
          );
        if (unconfirmedResult) return unconfirmedResult;
        return { ok: false, reason: "email_exists", message: error.message };
      }
      captureSupabaseAuthUnexpectedError(error, "sign_up");
      return { ok: false, reason: "unknown", message: error.message };
    }

    // ユーザーが既に存在してもSupabaseの設定次第でauth.signUp()後にerrorではなくdata.userが返ることがある。
    //　→ user.identitiesが存在するかどうかで既存ユーザかどうかをチェック
    //    既存ユーザであれば上記の「ユーザがすでに存在している場合」と同様のステップで、
    //    サインアップ時に登録しようとしたメアドのユーザがすでに存在してるかどうかを確認
    // ※identitiesはユーザーに紐づいている認証プロバイダの一覧(email, twitter認証など)。本アプリにおいて通常であればemailが存在するためlength===0はおかしい
    if ((data?.user?.identities?.length ?? 0) === 0) {
      const unconfirmedResult =
        await tryResendConfirmationForExistingUnconfirmedUser(email, password);
      if (unconfirmedResult) return unconfirmedResult;
      return {
        ok: false,
        reason: "email_exists",
        message: "Email is already registered",
      };
    }

    return { ok: true };
  } catch (error) {
    captureSupabaseAuthUnexpectedError(error, "sign_up");
    const message = error instanceof Error ? error.message : "Unexpected error";
    return { ok: false, reason: "unknown", message };
  }
};

// パスワードリセットメール送信
export const requestPasswordResetEmail = async (
  email: string,
): Promise<ResetPasswordRequestResult> => {
  try {
    const userExistsResult = await checkUserExists(email);
    if (!userExistsResult.ok) {
      captureSupabaseAuthUnexpectedError(
        new Error(userExistsResult.message),
        "request_password_reset",
      );
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
      const message = error.message ?? "";
      if (error.status === 429 || message.toLowerCase().includes("rate")) {
        return { ok: false, reason: "rate_limited", message };
      }
      captureSupabaseAuthUnexpectedError(error, "request_password_reset");
      return { ok: false, reason: "unknown", message: error.message };
    }

    return { ok: true };
  } catch (error) {
    captureSupabaseAuthUnexpectedError(error, "request_password_reset");
    const message = error instanceof Error ? error.message : "Unexpected error";
    return { ok: false, reason: "unknown", message };
  }
};

// supabaseが生成したリカバリートークンを解析
// → type="recovery"を検知し「パスワード再設定リンク」と判断できたら、accessToken, refreshTokenを取り出す
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

// アプリ側(ローカル端末ストレージ)にトークン(ユーザのアプリ入場証)をセット
// セットが完了したらtrueを返し、パスワードリセット(reset-password.tsx)でパスワード変更状態がreadyになる
export const setSessionFromRecoveryLink = async (url?: string | null) => {
  const tokens = parseRecoveryTokens(url);
  if (!tokens) return false;

  // クライアント側(端末ストレージ)にaccess_tokenとrefresh_tokenを保存(復元)する操作。
  //  → supabaseRecoveryでgetSession()やupdateUser()が使える状態になる
  const { error } = await supabaseRecovery.auth.setSession({
    access_token: tokens.accessToken, //短命JWT、ユーザとしてAPIを叩くための身分証
    refresh_token: tokens.refreshToken, //access_tokenを再発行するための長命トークン
  });

  return !error;
};

// セッションが復元されている前提でパスワードを更新
export const completePasswordReset = async (
  newPassword: string,
): Promise<CompletePasswordResetResult> => {
  try {
    const { data, error } = await supabaseRecovery.auth.getSession();
    if (error) {
      captureSupabaseAuthUnexpectedError(error, "complete_password_reset");
      return { ok: false, reason: "unknown", message: error.message };
    }
    if (!data.session) {
      return {
        ok: false,
        reason: "missing_session",
        message: "Session not ready",
      };
    }

    const { error: updateError } = await supabaseRecovery.auth.updateUser({
      password: newPassword,
    });
    if (updateError) {
      const message = updateError.message ?? "";
      if (
        updateError.status === 429 ||
        message.toLowerCase().includes("rate")
      ) {
        return { ok: false, reason: "rate_limited", message };
      }
      captureSupabaseAuthUnexpectedError(
        updateError,
        "complete_password_reset",
      );
      return { ok: false, reason: "unknown", message: updateError.message };
    }

    await supabaseRecovery.auth.signOut();
    return { ok: true };
  } catch (error) {
    captureSupabaseAuthUnexpectedError(error, "complete_password_reset");
    const message = error instanceof Error ? error.message : "Unexpected error";
    return { ok: false, reason: "unknown", message };
  }
};

// ユーザが存在しないエラーメッセージを小文字で返す
const isUserNotFoundError = (error: AuthError) => {
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("not found") || message.includes("no user");
};

// ユーザー存在チェック (RLS 対応: RPC 経由)
// rpc() は DB 内の Postgres function を実行する仕組み
// → セキュリティ上サーバ側で実行するため(全ユーザのメアドを漏洩させないため)
const checkUserExists = async (email: string) => {
  const { data, error } = await supabase.rpc("check_user_exists", {
    p_email: email,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const, exists: Boolean(data) };
};

// サインインロジック
export const signInWithEmailPassword = async ({
  email,
  password,
}: SignInParams): Promise<SignInResult> => {
  try {
    const userExistsResult = await checkUserExists(email);
    if (!userExistsResult.ok) {
      captureSupabaseAuthUnexpectedError(
        new Error(userExistsResult.message),
        "sign_in",
      );
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
      if (isEmailNotConfirmedError(error)) {
        const resendResult = await resendSignupConfirmationEmail(email);
        if (!resendResult.ok) {
          return {
            ok: false,
            reason: "unknown",
            message: resendResult.message,
          };
        }
        return {
          ok: false,
          reason: "email_unconfirmed",
          message: "Email verification resent",
        };
      }
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
      captureSupabaseAuthUnexpectedError(error, "sign_in");
      return { ok: false, reason: "unknown", message: error.message };
    }

    return { ok: true };
  } catch (error) {
    captureSupabaseAuthUnexpectedError(error, "sign_in");
    const message = error instanceof Error ? error.message : "Unexpected error";
    return { ok: false, reason: "unknown", message };
  }
};
