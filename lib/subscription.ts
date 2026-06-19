// Supabaseのsubscriptions/usersテーブルを操作し、ユーザーのサブスク状態を取得・初期化・更新するヘルパー集。
// RevenueCatの「購読状態」をSupabase DBに反映する役目やユーザのアプリアクセス権情報をDBから取得し共有する役目。

//=== アプリアクセス権(有料or無料ユーザ)のチェックは以下の順に行われる===
// １、DB上のsubscription.statusがtrial / active / canceledである (通常課金ユーザ)
// ２、RevenueCatの最新キャッシュで有料権限が確認できる
// ３、access_override.access_typeが"friend_free" かつ is_active=trueである(友人用の無料ユーザ)
// ４、それ以外のログイン済みユーザは無料ユーザとして扱う

import { User } from "@supabase/supabase-js";
import { Database } from "../types/database";
import { LanguageKey } from "../types/i18n";
import {
  readLastKnownAccessState,
  writeLastKnownAccessState,
} from "./accessStateCache";
import { getRevenueCatEntitlementAccessState } from "./revenuecatOfferings";
import { supabase } from "./supabaseClient";

export type SubscriptionStatus = Database["public"]["Enums"]["status"];

export type SubscriptionRow =
  Database["public"]["Tables"]["subscriptions"]["Row"] & {
    status: SubscriptionStatus | null;
  };
export type AccessOverrideRow =
  Database["public"]["Tables"]["access_overrides"]["Row"];
export type AccessMode = "paid" | "free" | "friend_free" | "none";
export type AccessResolution = "entitled" | "not_entitled" | "unknown";
export type AccessSource =
  | "subscription"
  | "revenuecat"
  | "access_override"
  | "last_known_cache"
  | "none";
export type AccessUnknownReason =
  | "subscription_fetch_failed"
  | "access_override_fetch_failed";
export type AccessState = {
  canAccessApp: boolean;
  accessMode: AccessMode;
  resolution: AccessResolution;
  source: AccessSource;
  unknownReason: AccessUnknownReason | null;
  subscription: SubscriptionRow | null;
  accessOverride: AccessOverrideRow | null;
};

export const PAID_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "trial",
  "active",
  "canceled",
];

export const canAccessDashboardWithSubscriptionStatus = (
  status: SubscriptionStatus | null | undefined,
): boolean => Boolean(status && PAID_SUBSCRIPTION_STATUSES.includes(status));

type UserRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "had_account_before"
>;
type UserProfileRow = Database["public"]["Tables"]["users"]["Row"];
type AuthUserProfileInput = Pick<
  User,
  "id" | "email" | "user_metadata" | "app_metadata"
>;
const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ["trial", "active"];

const nowIso = () => new Date().toISOString();

type QueryResult<T> = {
  data: T | null;
  error: { message?: string } | null;
};

// メタデータ解析ヘルパー  (後日復習対象)
const getMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  keys: string[],
) => {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

// メタデータ解析ヘルパー  (後日復習対象)
const getPrimaryProvider = (authUser: AuthUserProfileInput) => {
  const provider = authUser.app_metadata?.provider;
  return typeof provider === "string" ? provider : null;
};
// メタデータ解析ヘルパー  (後日復習対象)
const buildFallbackEmail = (userId: string) =>
  `no-reply+${userId}@idealgap.app`;

// OAuth認証後にgoogle/appleより返されるメタデータをアプリDBのユーザメールアドレス用に解析
const resolveUserEmail = (authUser: AuthUserProfileInput) =>
  authUser.email?.trim() || buildFallbackEmail(authUser.id);

// supabase上のEdge functionでDB内のdeleted_accountsテーブルを確認し既にアカウントを削除ずみか(以前アカウントを保持していたことがあるか)どうかを判定。（再サインアップ時の無料トライアル防止）
const fetchDeletedAccountHadAccountBefore = async () => {
  const { data, error } = await supabase.functions.invoke(
    "account-deletion-status",
    { method: "POST" },
  );

  if (error) {
    throw error;
  }

  return (
    (data as { hadAccountBefore?: boolean } | null)?.hadAccountBefore ?? false
  );
};

// OAuth認証後にgoogle/appleより返されるメタデータをアプリDBのユーザ名用に解析
const resolveUserName = (authUser: AuthUserProfileInput, email: string) => {
  const metadataName = getMetadataString(authUser.user_metadata, [
    "name",
    "full_name",
    "display_name",
    "user_name",
  ]);
  if (metadataName) return metadataName;

  const provider = getPrimaryProvider(authUser);
  if (provider === "apple") return "Apple User";
  if (provider === "google") return "Google User";

  const [localPart] = email.split("@");
  if (localPart && !localPart.startsWith("no-reply+")) return localPart;
  return `User-${authUser.id.slice(0, 8)}`;
};

// ユーザ情報をsupabase Authから取得
const getCurrentAuthUserForId = async (
  userId: string,
): Promise<AuthUserProfileInput | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id !== userId) {
    return null;
  }
  return data.user;
};

// Google/Apple認証完了後にDBに該当ユーザが存在するか確認、しなければ作成する
export const ensureUserProfileForAuthUser = async (
  authUser: AuthUserProfileInput,
  language?: LanguageKey | null,
): Promise<UserProfileRow> => {
  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }
  // DBに該当のユーザデータが既に存在していたらそのユーザを返す
  if (existing) {
    return existing as UserProfileRow;
  }

  const timestamp = nowIso();
  // google/appleより返されるメタデータをアプリのユーザメールアドレス用に解析
  const email = resolveUserEmail(authUser);
  // google/appleより返されるメタデータをアプリのユーザ名用に解析
  const name = resolveUserName(authUser, email);
  const hadAccountBefore = await fetchDeletedAccountHadAccountBefore();

  // 解析済みのgoogle/appleからのメタデータをDBのユーザテーブルに保存する
  const { data, error } = await supabase
    .from("users")
    .insert({
      id: authUser.id,
      email,
      name,
      language: language ?? null,
      had_account_before: hadAccountBefore,
      is_canceled: false,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select("*")
    .single();

  if (error?.code === "23505") {
    const { data: fallback, error: fallbackError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();
    if (fallbackError) throw new Error(fallbackError.message);
    if (fallback) return fallback as UserProfileRow;
  }

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to ensure user profile");
  }

  return data as UserProfileRow;
};

// Subscriptionsテーブルから該当のユーザの情報を取得し、通信失敗と未作成を分離する。
const fetchSubscriptionForUser = async (
  userId: string,
): Promise<QueryResult<SubscriptionRow>> => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle(); //0件ならnull、2件以上ならエラーを返すメソッド

  if (error) {
    console.warn("Failed to fetch subscription", error.message);
    return { data: null, error };
  }

  return { data: data as SubscriptionRow | null, error: null };
};

// Subscriptionsテーブルから該当のユーザの情報を取得
export const getSubscriptionForUser = async (
  userId: string,
): Promise<SubscriptionRow | null> => {
  const result = await fetchSubscriptionForUser(userId);
  return result.data;
};

type WaitForActiveSubscriptionOptions = {
  attempts?: number;
  intervalMs?: number;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

// DB上で該当ユーザ(友人無料アカウント)のaccess_overrideデータが「access_type=friend_free / is_active = true」 であり、
// 今日がstarts_atデータ(開始日)とends_at(終了日)の間にある場合は課金ユーザと同等のアクセス権を与える(trueを返す)
const isAccessOverrideActiveAt = (
  accessOverride: AccessOverrideRow,
  now = new Date(),
) => {
  if (
    accessOverride.access_type !== "friend_free" ||
    !accessOverride.is_active
  ) {
    return false;
  }

  const startsAt = new Date(accessOverride.starts_at);
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() > now.getTime()) {
    return false;
  }

  // accessOverride.ends_atデータがDB上でnullの場合はアクセス権を付与
  if (!accessOverride.ends_at) {
    return true;
  }

  const endsAt = new Date(accessOverride.ends_at);
  if (Number.isNaN(endsAt.getTime())) {
    return false;
  }

  return endsAt.getTime() > now.getTime();
};

// ユーザに紐づくaccess_overrideデータを取得し、通信失敗と未設定を分離する。
const fetchActiveAccessOverrideForUser = async (
  userId: string,
): Promise<QueryResult<AccessOverrideRow>> => {
  const { data, error } = await supabase
    .from("access_overrides")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Failed to fetch access override", error.message);
    return { data: null, error };
  }

  const accessOverride = data as AccessOverrideRow | null;
  return {
    data:
      accessOverride && isAccessOverrideActiveAt(accessOverride)
        ? accessOverride
        : null,
    error: null,
  };
};

// ユーザに紐づくaccess_overrideデータを取得する。
// access_overrideデータが取得できない場合(友人無料枠じゃない場合)はnullを返す(ほとんどの場合は{data: null})
export const getActiveAccessOverrideForUser = async (
  userId: string,
): Promise<AccessOverrideRow | null> => {
  const result = await fetchActiveAccessOverrideForUser(userId);
  return result.data;
};

export const canAccessDashboardWithAccessOverride = (
  accessOverride: AccessOverrideRow | null | undefined,
) => Boolean(accessOverride && isAccessOverrideActiveAt(accessOverride));

// 通常ユーザのアクセス権限情報を取得。
// 各ページでimport実行され、以下の流れでアクセス権限情報を取得する。
// １、subscription.statusがtrial / active / canceled ならpaidとして返す
// ２、RevenueCatキャッシュに有料権限があればpaidとして返す
// ３、access_overrideが有効ならfriend_freeとして返す
// ４、それ以外はfreeとして返す
export const getAccessStateForUser = async (
  userId: string,
): Promise<AccessState> => {
  const subscriptionResult = await fetchSubscriptionForUser(userId);
  const subscription = subscriptionResult.data;

  // paidサブスクが有効(trial, active, canceled)の場合
  if (canAccessDashboardWithSubscriptionStatus(subscription?.status)) {
    await writeLastKnownAccessState(userId, "paid"); // ローカルに最新のaccess status としてキャッシュ保存
    return {
      canAccessApp: true,
      accessMode: "paid",
      resolution: "entitled",
      source: "subscription",
      unknownReason: null,
      subscription,
      accessOverride: null,
    };
  }

  // RevenueCat SDK は CustomerInfo を内部キャッシュするため、通信断時の即時 access 判定に使う。
  // つまりアプリがオフライン時にローカル端末に保存された「直近の支払い状況データ」そ取得してアプリの遷移先の材料にしている
  const revenueCatAccess = await getRevenueCatEntitlementAccessState();
  // ローカル端末に保存された直近のRevenueCat購買情報が「権限あり」の場合
  if (revenueCatAccess.state === "entitled") {
    await writeLastKnownAccessState(userId, "paid"); // ローカルに最新のaccess status としてキャッシュ保存
    return {
      canAccessApp: true,
      accessMode: "paid",
      resolution: "entitled",
      source: "revenuecat",
      unknownReason: null,
      subscription,
      accessOverride: null,
    };
  }

  // supabase DBからsubscriptionテーブル取得に失敗した場合
  if (subscriptionResult.error) {
    const lastKnownAccessState = await readLastKnownAccessState(userId); // ローカルに最新のaccess status としてキャッシュ保存
    return {
      canAccessApp: true,
      accessMode: lastKnownAccessState?.accessMode ?? "free",
      resolution: "unknown",
      source: lastKnownAccessState ? "last_known_cache" : "none",
      unknownReason: "subscription_fetch_failed",
      subscription: null,
      accessOverride: null,
    };
  }

  const accessOverrideResult = await fetchActiveAccessOverrideForUser(userId);
  const accessOverride = accessOverrideResult.data;
  const canAccessWithOverride =
    canAccessDashboardWithAccessOverride(accessOverride);

  // access_overrideが有効(友人無料枠)の場合
  if (canAccessWithOverride) {
    await writeLastKnownAccessState(userId, "friend_free"); // ローカルに最新のaccess status としてキャッシュ保存
    return {
      canAccessApp: true,
      accessMode: "friend_free",
      resolution: "entitled",
      source: "access_override",
      unknownReason: null,
      subscription,
      accessOverride,
    };
  }

  // supabase DBからaccess_overrideテーブル取得に失敗した場合
  if (accessOverrideResult.error) {
    const lastKnownAccessState = await readLastKnownAccessState(userId);
    return {
      canAccessApp: true,
      accessMode: lastKnownAccessState?.accessMode ?? "free",
      resolution: "unknown",
      source: lastKnownAccessState ? "last_known_cache" : "none",
      unknownReason: "access_override_fetch_failed",
      subscription,
      accessOverride: null,
    };
  }

  // paid権限が無いログイン済みユーザは無料ユーザとして扱う
  await writeLastKnownAccessState(userId, "free");
  return {
    canAccessApp: true,
    accessMode: "free",
    resolution: "entitled",
    source: "none",
    unknownReason: null,
    subscription,
    accessOverride: null,
  };
};

// RevenueCat WebhookがDB反映するまで待機し、trial/activeになったら返す
export const waitForActiveSubscription = async (
  userId: string,
  options?: WaitForActiveSubscriptionOptions,
): Promise<SubscriptionRow | null> => {
  const attempts = options?.attempts ?? 8;
  const intervalMs = options?.intervalMs ?? 1000;

  for (let i = 0; i < attempts; i += 1) {
    const subscription = await getSubscriptionForUser(userId);
    if (
      subscription?.status &&
      ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status)
    ) {
      return subscription;
    }
    if (i < attempts - 1) {
      await sleep(intervalMs);
    }
  }

  return null;
};

// 購入処理後にサブスクstatusをactiveに更新・挿入
// 成功後、初回ユーザーなら users.had_account_before をtrueに更新
export const updateSubscriptionAfterPurchase = async (
  userId: string,
  hadAccountBefore: boolean,
): Promise<SubscriptionRow> => {
  const timestamp = nowIso();
  const status: SubscriptionStatus = "active";

  const existing = await getSubscriptionForUser(userId);

  // Subscriptionsテーブルを更新・挿入する
  const mutation = existing
    ? supabase
        .from("subscriptions")
        .update({
          status,
          plan: "pro_monthly",
          updated_at: timestamp,
        })
        .eq("user_id", userId)
    : supabase.from("subscriptions").insert({
        user_id: userId,
        status,
        plan: "pro_monthly",
        created_at: timestamp,
        updated_at: timestamp,
      });

  const { data, error } = await mutation.select("*").maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update subscription");
  }

  // Usersテーブルのhad_account_beforeをtrueへ更新する
  if (!hadAccountBefore) {
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ had_account_before: true, updated_at: timestamp })
      .eq("id", userId);

    if (userUpdateError) {
      console.warn(
        "Failed to mark had_account_before",
        userUpdateError.message,
      );
    }
  }

  return data as SubscriptionRow;
};

// Usersテーブルからid, had_account_beforeだけを取得
export const getUserProfile = async (
  userId: string,
): Promise<UserRow | null> => {
  const { data, error } = await supabase
    .from("users")
    .select("id, had_account_before")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Failed to fetch user profile", error.message);
    return null;
  }

  return data as UserRow | null;
};
