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

export type AppEnvironment = z.infer<typeof appEnvSchema>;
export type AppEnv = z.infer<ReturnType<typeof createEnvSchema>>;

// 開発環境か本番環境かをジャッジ
const resolveAppEnv = (): AppEnvironment => {
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

// 本番or開発を引数で受け取り、それに応じてRevenueCatの環境変数名を返す
const getRevenueCatEnvKeyName = (appEnv: AppEnvironment) =>
  appEnv === "prod"
    ? "EXPO_PUBLIC_REVENUECAT_API_KEY_PROD"
    : "EXPO_PUBLIC_REVENUECAT_API_KEY_DEV";

export const getValidatedEnv = (): AppEnv => {
  const appEnv = resolveAppEnv();
  const revenueCatKeyName = getRevenueCatEnvKeyName(appEnv);

  const envSchema = createEnvSchema(revenueCatKeyName);
  const envVarNameByField = {
    supabaseUrl: "EXPO_PUBLIC_SUPABASE_URL",
    supabaseAnonKey: "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    revenueCatApiKey: revenueCatKeyName,
  } as const;

  const parsed = envSchema.safeParse({
    appEnv,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    revenueCatApiKey: process.env[revenueCatKeyName],
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
        })
      )
    ).join(", ");
    throw new Error(`Missing environment variables: ${missing}`);
  }

  return parsed.data;
};

export const env = getValidatedEnv();
