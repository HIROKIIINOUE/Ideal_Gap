// Supabaseのsubscriptions/usersテーブルを操作し、ユーザーのサブスク状態を取得・初期化・更新するヘルパー集。
// RevenueCatの「購読状態」をSupabase DBに反映する役目やユーザのアプリアクセス権情報をDBから取得し共有する役目。

//=== アプリアクセス権のチェックは以下の順に行われる===
// １、DB上のsubscription.statusがactive / trialである (通常課金ユーザ)
// ２、DB上のaccess_override.access_typeが"friend_free" かつ is_active=trueである(友人用の無料ユーザ)
// ３、アクセス権なし

import { User } from "@supabase/supabase-js";
import { Database } from "../types/database";
import { LanguageKey } from "../types/i18n";
import { supabase } from "./supabaseClient";

export type SubscriptionStatus = Database["public"]["Enums"]["status"];

export type SubscriptionRow =
  Database["public"]["Tables"]["subscriptions"]["Row"] & {
    status: SubscriptionStatus | null;
  };
export type AccessOverrideRow =
  Database["public"]["Tables"]["access_overrides"]["Row"];
export type AccessMode = "paid" | "friend_free" | "none";
export type AccessState = {
  canAccessApp: boolean;
  accessMode: AccessMode;
  subscription: SubscriptionRow | null;
  accessOverride: AccessOverrideRow | null;
};

export const DASHBOARD_ACCESSIBLE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] =
  ["trial", "active"];

export const canAccessDashboardWithSubscriptionStatus = (
  status: SubscriptionStatus | null | undefined,
): boolean =>
  Boolean(
    status && DASHBOARD_ACCESSIBLE_SUBSCRIPTION_STATUSES.includes(status),
  );

type UserRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "had_account_before"
>;
type UserProfileRow = Database["public"]["Tables"]["users"]["Row"];
type AuthUserProfileInput = Pick<
  User,
  "id" | "email" | "user_metadata" | "app_metadata"
>;
type EnsureSignupAwaitSubscriptionOptions = {
  authUser?: AuthUserProfileInput | null;
  language?: LanguageKey | null;
};
const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] =
  DASHBOARD_ACCESSIBLE_SUBSCRIPTION_STATUSES;

const nowIso = () => new Date().toISOString();
// 同じuserIdで複数回同時にensureSignupAwaitSubscription が呼ばれたとき、DBに重複行を挿入しないためのデータ構造。進行中のプロミス処理も一つにまとめてくれる。
const ensureInFlight = new Map<string, Promise<SubscriptionRow>>();

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

// Subscriptionsテーブルから該当のユーザの情報を取得
export const getSubscriptionForUser = async (
  userId: string,
): Promise<SubscriptionRow | null> => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle(); //0件ならnull、2件以上ならエラーを返すメソッド

  if (error) {
    console.warn("Failed to fetch subscription", error.message);
    return null;
  }

  return data as SubscriptionRow | null;
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

// ユーザに紐づくaccess_overrideデータを取得する。
// access_overrideデータが取得できない場合(友人無料枠じゃない場合)はnullを返す(ほとんどの場合はnull)
export const getActiveAccessOverrideForUser = async (
  userId: string,
): Promise<AccessOverrideRow | null> => {
  const { data, error } = await supabase
    .from("access_overrides")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Failed to fetch access override", error.message);
    return null;
  }

  const accessOverride = data as AccessOverrideRow | null;
  return accessOverride && isAccessOverrideActiveAt(accessOverride)
    ? accessOverride
    : null;
};

export const canAccessDashboardWithAccessOverride = (
  accessOverride: AccessOverrideRow | null | undefined,
) => Boolean(accessOverride && isAccessOverrideActiveAt(accessOverride));

// 通常ユーザのアクセス権限情報を取得。
// 各ページでimport実行され、以下の流れでアクセス権限情報を取得する。
// １、subscription.statusがactive / trial ならsubscriptionデータを返す
// ２、subscription.statusがactive / trial 以外ならaccess_overrideデータを取得しにいく
// ３、正常なaccess_overrideデータを保持していればそのデータを返す
export const getAccessStateForUser = async (
  userId: string,
): Promise<AccessState> => {
  const subscription = await getSubscriptionForUser(userId);

  if (canAccessDashboardWithSubscriptionStatus(subscription?.status)) {
    return {
      canAccessApp: true,
      accessMode: "paid",
      subscription,
      accessOverride: null,
    };
  }

  const accessOverride = await getActiveAccessOverrideForUser(userId);
  const canAccessWithOverride =
    canAccessDashboardWithAccessOverride(accessOverride);

  return {
    canAccessApp: canAccessWithOverride,
    accessMode: canAccessWithOverride ? "friend_free" : "none",
    subscription,
    accessOverride,
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

// ユーザのサブスクリプションデータが存在していなかった場合、ユーザに紐づくサブスクリプションデータを新規作成するロジック
export const ensureSignupAwaitSubscription = async (
  userId: string,
  options?: EnsureSignupAwaitSubscriptionOptions,
): Promise<SubscriptionRow> => {
  // 既に同じuserIdの非同期処理が進行中ならそれに相乗りする新しい処理を発生させないためのロジック。複数非同期処理の制御
  const inFlight = ensureInFlight.get(userId);
  if (inFlight) return inFlight;

  // ユーザ情報からそのユーザのサブスクリプション情報を取得、取得できた場合は新規作成はさせないためのロジック。
  // １ユーザにつき複数サブスクリプションデータが生成されるのを防止。
  const existing = await getSubscriptionForUser(userId);
  if (existing) return existing;

  const promise = (async () => {
    // ユーザ情報がDBに存在するか確認し、なければsubscriptionデータ処理の前に作成
    const authUser =
      options?.authUser ?? (await getCurrentAuthUserForId(userId));
    if (authUser) {
      await ensureUserProfileForAuthUser(authUser, options?.language);
    }
    const timestamp = nowIso();

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        status: "signupAwait",
        plan: "standard",
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select("*")
      .single();

    // Supabase側から一意制約エラーが返ってきたら、userIdで既存のデータを再取得しにいく
    if (error?.code === "23505") {
      const fallback = await getSubscriptionForUser(userId);
      if (fallback) return fallback;
    }

    if (error || !data) {
      throw new Error(
        error?.message ?? "Failed to ensure signupAwait subscription",
      );
    }

    return data as SubscriptionRow;
  })();

  // 非同期処理promise()を走らせる前にensureFlightに値をセットすることでisFlightがtrueになり、現行のensureSignupAwaitSubscriptionが走り切るまで重複したensureSignupAwaitSubscriptionが走ることのないように制御。
  ensureInFlight.set(userId, promise);

  // 非同期処理が終わったら成功・失敗関係なく非同期処理制御を停止する
  // これがないと一度終わった前回の非同期処理がMapに残り続けて次回以降の呼び出しをブロックしてしまう
  const result = await promise.finally(() => ensureInFlight.delete(userId));
  return result;
};

// 購入処理後にサブスクstatusをtrialもしくはactiveに更新・挿入
// 成功後、初回ユーザーなら users.had_account_before をtrueに更新
export const updateSubscriptionAfterPurchase = async (
  userId: string,
  hadAccountBefore: boolean,
): Promise<SubscriptionRow> => {
  const timestamp = nowIso();
  // ここで初期ユーザか再サインアップかを判定
  const status: SubscriptionStatus = hadAccountBefore ? "active" : "trial";

  const existing = await getSubscriptionForUser(userId);

  // Subscriptionsテーブルを更新・挿入する
  const mutation = existing
    ? supabase
        .from("subscriptions")
        .update({
          status,
          plan: "standard",
          updated_at: timestamp,
        })
        .eq("user_id", userId)
    : supabase.from("subscriptions").insert({
        user_id: userId,
        status,
        plan: "standard",
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
