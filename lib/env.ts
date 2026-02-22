// 本番環境or開発環境を判定し、それに応じて環境変数を仕分け処理をするファイル

import Constants from "expo-constants";
import { z } from "zod";

const appEnvSchema = z.enum(["dev", "preview", "prod"]);
const requiredString = (envKey: string) => z.string().min(1, envKey);

const createEnvSchema = (revenueCatKeyName: string) =>
  z.object({
    appEnv: appEnvSchema,
    supabaseUrl: requiredString("EXPO_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: requiredString("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
    revenueCatApiKey: requiredString(revenueCatKeyName),
  });

const appPlatformSchema = z.enum(["ios", "android"]);

export type AppEnvironment = z.infer<typeof appEnvSchema>;
export type AppPlatform = z.infer<typeof appPlatformSchema>;
export type AppEnv = z.infer<ReturnType<typeof createEnvSchema>>;

// 開発環境か本番環境かをジャッジ
const resolveAppEnv = (): AppEnvironment => {
  // Expo設定 (app.config.ts) の extra.appEnv を読む、なければundefined
  const extraEnv = (
    Constants.expoConfig?.extra as { appEnv?: string } | undefined
  )?.appEnv;

  const raw =
    extraEnv ?? process.env.EXPO_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? "dev";

  const normalized = raw.toString().toLowerCase();
  const parsed = appEnvSchema.safeParse(normalized);
  if (parsed.success) return parsed.data;
  return "dev";
};

// 「本番 or 開発」「iOS or Android」で条件分岐し、結果に応じて .envで参照するRevenue Cat環境変数のキー名を配列で返す
// 配列の２番目はプラットフォームが取得できなかった時用のフォールバック
export const getRevenueCatEnvKeyCandidates = (
  appEnv: AppEnvironment,
  platform: AppPlatform,
) => {
  const platformSuffix = platform === "ios" ? "IOS" : "ANDROID";

  if (appEnv === "prod") {
    return [
      `EXPO_PUBLIC_REVENUECAT_API_KEY_PROD_${platformSuffix}`,
      "EXPO_PUBLIC_REVENUECAT_API_KEY_PROD",
    ];
  }

  return [
    `EXPO_PUBLIC_REVENUECAT_API_KEY_DEV_${platformSuffix}`,
    "EXPO_PUBLIC_REVENUECAT_API_KEY_DEV",
  ];
};

// getRevenueCatEnvKeyCandidatesから返された環境変数キーの配列に対して、
// １番目(本命)が正しい時はresolveRevenueCatApiKeyにそれを格納、正しくない時は2番目(フォールバック)を格納
export const resolveRevenueCatApiKey = (
  appEnv: AppEnvironment,
  platform: AppPlatform,
) =>
  getRevenueCatEnvKeyCandidates(appEnv, platform)
    .map((keyName) => process.env[keyName])
    .find(
      (value): value is string => typeof value === "string" && value.length > 0,
    );

// 「本番 or 開発」「iOS or Android」で条件分岐し、結果に応じて環境変数をオブジェクト形式で返す。
// Supabaseはどの環境でも同じ値、RevenueCatのみ状況に応じて値が変わる
export const getValidatedEnv = (): AppEnv => {
  const appEnv = resolveAppEnv();
  const iosRevenueCatApiKey = resolveRevenueCatApiKey(appEnv, "ios");
  const androidRevenueCatApiKey = resolveRevenueCatApiKey(appEnv, "android");
  const resolvedRevenueCatApiKey =
    iosRevenueCatApiKey ?? androidRevenueCatApiKey;
  const revenueCatKeyLabel =
    appEnv === "prod"
      ? "EXPO_PUBLIC_REVENUECAT_API_KEY_PROD_IOS or EXPO_PUBLIC_REVENUECAT_API_KEY_PROD_ANDROID or EXPO_PUBLIC_REVENUECAT_API_KEY_PROD"
      : "EXPO_PUBLIC_REVENUECAT_API_KEY_DEV_IOS or EXPO_PUBLIC_REVENUECAT_API_KEY_DEV_ANDROID or EXPO_PUBLIC_REVENUECAT_API_KEY_DEV";

  const envSchema = createEnvSchema(revenueCatKeyLabel);
  const envVarNameByField = {
    supabaseUrl: "EXPO_PUBLIC_SUPABASE_URL",
    supabaseAnonKey: "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    revenueCatApiKey: revenueCatKeyLabel,
  } as const;

  const parsed = envSchema.safeParse({
    appEnv,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    revenueCatApiKey: resolvedRevenueCatApiKey,
  });

  if (!parsed.success) {
    const missing = Array.from(
      new Set(
        parsed.error.issues.map((issue) => {
          const field = issue.path[0];
          if (typeof field === "string" && field in envVarNameByField) {
            return envVarNameByField[field as keyof typeof envVarNameByField];
          }
          return issue.message;
        }),
      ),
    ).join(", ");
    throw new Error(`Missing environment variables: ${missing}`);
  }

  return parsed.data;
};

export const env = getValidatedEnv();
