// supabaseのサインアップロジック

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
