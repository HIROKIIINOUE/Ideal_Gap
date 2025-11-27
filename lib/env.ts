export type AppEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

const requiredEnvKeys: Array<keyof AppEnv> = ["supabaseUrl", "supabaseAnonKey"];

const toKey = (key: keyof AppEnv) =>
  key === "supabaseUrl" ? "EXPO_PUBLIC_SUPABASE_URL" : "EXPO_PUBLIC_SUPABASE_ANON_KEY";

export const getValidatedEnv = (): AppEnv => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const config: Partial<AppEnv> = { supabaseUrl, supabaseAnonKey };

  const missing = requiredEnvKeys.filter((key) => !config[key]);
  if (missing.length > 0) {
    const missingNames = missing.map((key) => toKey(key)).join(", ");
    throw new Error(`Missing environment variables: ${missingNames}`);
  }

  return {
    supabaseUrl: supabaseUrl!,
    supabaseAnonKey: supabaseAnonKey!,
  };
};

export const env = getValidatedEnv();
