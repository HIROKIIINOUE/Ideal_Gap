import { User } from "@supabase/supabase-js";

export type ExternalAuthProvider = "apple" | "google";

const EXTERNAL_AUTH_PROVIDERS: ExternalAuthProvider[] = ["apple", "google"];

export const getUserAuthProviders = (
  user: Pick<User, "app_metadata" | "identities">,
) => {
  const metadataProviders = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers
    : [];
  const identityProviders = Array.isArray(user.identities)
    ? user.identities.map((identity) => identity.provider)
    : [];

  return Array.from(
    new Set([...metadataProviders, ...identityProviders]),
  ).filter((provider): provider is string => typeof provider === "string");
};

// ログイン中ユーザーの Auth 情報から、Apple / Google 認証ユーザーかどうかを判定する
export const hasAppleOrGoogleProvider = (
  user: Pick<User, "app_metadata" | "identities">,
) =>
  getUserAuthProviders(user).some((provider) =>
    EXTERNAL_AUTH_PROVIDERS.includes(provider as ExternalAuthProvider),
  );

// ログイン中ユーザーの Auth 情報から、Apple / Google どっちのユーザか判定しその文言を返す
export const getPreferredExternalAuthProvider = (
  user: Pick<User, "app_metadata" | "identities">,
): ExternalAuthProvider | null => {
  const providers = getUserAuthProviders(user);

  if (providers.includes("apple")) return "apple";
  if (providers.includes("google")) return "google";

  return null;
};
