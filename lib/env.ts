// 本番環境or開発環境を判定し、それに応じて環境変数を仕分け処理をするファイル

import Constants from "expo-constants";

export type AppEnvironment = "dev" | "preview" | "prod";

export type AppEnv = {
  appEnv: AppEnvironment;
  supabaseUrl: string;
  supabaseAnonKey: string;
  revenueCatApiKey: string;
};

// 開発環境か本番環境かをジャッジ
const resolveAppEnv = (): AppEnvironment => {
  const extraEnv = (
    Constants.expoConfig?.extra as { appEnv?: string } | undefined
  )?.appEnv;
  const raw =
    extraEnv ?? process.env.EXPO_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? "dev";

  const normalized = raw.toString().toLowerCase();
  if (normalized === "prod") return "prod";
  if (normalized === "preview") return "preview";
  return "dev";
};

// 本番or開発を引数で受け取り、それに応じてRevenueCatの環境変数を返す
const getRevenueCatApiKey = (appEnv: AppEnvironment) => {
  const devKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_DEV;
  const prodKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_PROD;
  const selectedKey = appEnv === "prod" ? prodKey : devKey;

  if (!selectedKey) {
    const missing =
      appEnv === "prod"
        ? "EXPO_PUBLIC_REVENUECAT_API_KEY_PROD"
        : "EXPO_PUBLIC_REVENUECAT_API_KEY_DEV";
    throw new Error(`Missing environment variables: ${missing}`);
  }

  return selectedKey;
};

export const getValidatedEnv = (): AppEnv => {
  const appEnv = resolveAppEnv();
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const revenueCatApiKey = getRevenueCatApiKey(appEnv);

  if (!supabaseUrl) {
    throw new Error("Missing environment variables: EXPO_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "Missing environment variables: EXPO_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return {
    appEnv,
    supabaseUrl,
    supabaseAnonKey,
    revenueCatApiKey,
  };
};

export const env = getValidatedEnv();
