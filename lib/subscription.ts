// Supabaseのsubscriptions/usersテーブルを操作し、ユーザーのサブスク状態を取得・初期化・更新するヘルパー集。
// RevenueCatの「購読状態」をSupabase DBに反映する役目。

import { Database } from "../types/database";
import { supabase } from "./supabaseClient";

// 【ここチェック】自分で修正した、多分問題ないとは思う
export type SubscriptionStatus = Database["public"]["Enums"]["status"];

export type SubscriptionRow =
  Database["public"]["Tables"]["subscriptions"]["Row"] & {
    status: SubscriptionStatus | null;
  };

type UserRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "had_account_before"
>;

const nowIso = () => new Date().toISOString();
// 同じuserIdで複数回同時にensureSignupAwaitSubscription が呼ばれたとき、DBに重複行を挿入しないためのデータ構造。進行中のプロミス処理も一つにまとめてくれる。
const ensureInFlight = new Map<string, Promise<SubscriptionRow>>();

// Subscriptionsテーブルから該当のユーザの情報を取得
export const getSubscriptionForUser = async (
  userId: string
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

export const ensureSignupAwaitSubscription = async (
  userId: string
): Promise<SubscriptionRow> => {
  // 既に同じuserIdの非同期処理が進行中ならそれに相乗りする新しい処理を発生させないためのロジック。複数非同期処理の制御
  const inFlight = ensureInFlight.get(userId);
  if (inFlight) return inFlight;

  // ユーザ情報の取得、取得できた場合は新規作成はさせないためのロジック。複数データ生成の制御。
  const existing = await getSubscriptionForUser(userId);
  if (existing) return existing;

  const promise = (async () => {
    const timestamp = nowIso();
    // 新規作成時は had_account_before を明示的に false に初期化する
    // 【ここ疑問】毎回falseにしてしまっては再入会時のフリートライアル判定がおかしくなる？
    await supabase
      .from("users")
      .update({ had_account_before: false, updated_at: timestamp })
      .eq("id", userId);

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
        error?.message ?? "Failed to ensure signupAwait subscription"
      );
    }

    return data as SubscriptionRow;
  })();

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
  hadAccountBefore: boolean
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
        userUpdateError.message
      );
    }
  }

  return data as SubscriptionRow;
};

// Usersテーブルからid, had_account_beforeだけを取得
export const getUserProfile = async (
  userId: string
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
