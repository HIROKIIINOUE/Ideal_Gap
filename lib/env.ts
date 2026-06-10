// 本番環境or開発環境を判定し、それに応じて環境変数を仕分け処理をするファイル

import Constants from "expo-constants";
import { z } from "zod";

const appEnvSchema = z.enum(["dev", "preview", "prod"]);
const requiredString = (envKey: string) => z.string().min(1, envKey);

// ExpoのEXPO_PUBLIC_*置換は静的参照(process.env.FOO)が前提。
// 動的参照(process.env[key])だと本番バンドルで未解決になる場合があるため、
// 必要キーはここで明示的に読み取る。
const publicEnv = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  fieldEncryptionKey: process.env.EXPO_PUBLIC_FIELD_ENCRYPTION_KEY,
  revenueCatDevIos: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_DEV_IOS,
  revenueCatDevAndroid: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_DEV_ANDROID,
  revenueCatDevLegacy: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_DEV,
  revenueCatProdIos: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_PROD_IOS,
  revenueCatProdAndroid: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_PROD_ANDROID,
  revenueCatProdLegacy: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_PROD,
} as const;

const createEnvSchema = (revenueCatKeyName: string) =>
  z.object({
    appEnv: appEnvSchema,
    supabaseUrl: requiredString("EXPO_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: requiredString("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
    fieldEncryptionKey: z
      .string()
      .min(32, "EXPO_PUBLIC_FIELD_ENCRYPTION_KEY must be at least 32 characters"),
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

// appEnv と platform から優先キー（iOS/Android）とフォールバックキー（legacy）を順に評価する。
export const resolveRevenueCatApiKey = (
  appEnv: AppEnvironment,
  platform: AppPlatform,
) =>
  (appEnv === "prod"
    ? (platform === "ios"
        ? [publicEnv.revenueCatProdIos, publicEnv.revenueCatProdLegacy]
        : [publicEnv.revenueCatProdAndroid, publicEnv.revenueCatProdLegacy])
    : (platform === "ios"
        ? [publicEnv.revenueCatDevIos, publicEnv.revenueCatDevLegacy]
        : [publicEnv.revenueCatDevAndroid, publicEnv.revenueCatDevLegacy])
  ).find((value): value is string => typeof value === "string" && value.length > 0);

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
    fieldEncryptionKey: "EXPO_PUBLIC_FIELD_ENCRYPTION_KEY",
    revenueCatApiKey: revenueCatKeyLabel,
  } as const;

  const parsed = envSchema.safeParse({
    appEnv,
    supabaseUrl: publicEnv.supabaseUrl,
    supabaseAnonKey: publicEnv.supabaseAnonKey,
    fieldEncryptionKey: publicEnv.fieldEncryptionKey,
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
