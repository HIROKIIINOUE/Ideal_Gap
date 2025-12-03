// supabaseのサインアップ・サインインロジック

import { AuthError } from "@supabase/supabase-js";
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

const resolveTimeZone = () =>
  Localization.getCalendars?.()[0]?.timeZone ?? "UTC";

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
    const emailRedirectTo = Linking.createURL("/auth/callback");
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

const isUserNotFoundError = (error: AuthError) => {
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("not found") || message.includes("no user");
};

const checkUserExists = async (email: string) => {
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
