/// <reference path="../deno-stubs.d.ts" />
/* eslint-env deno */
/* eslint-disable import/no-unresolved */
// RevenueCat Webhook → Supabase subscriptions/users 更新
// 要件 2-2-3, 2-2-4 に基づき、署名検証後にサブスク状態を upsert する
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

//RevenueCat から飛んでくる JSON のうち、使う部分だけ型定義。
type RevenueCatEvent = {
  type: string;
  app_user_id?: string | null;
  original_app_user_id?: string | null;
  expiration_at_ms?: number | null;
  cancellation_reason?: string | null;
  period_type?: string | null; // TRIAL / NORMAL / INTRO
};

type RevenueCatPayload = {
  event: RevenueCatEvent;
};

const REVENUECAT_SIGNATURE_HEADER = "x-revenuecat-signature";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

if (!webhookSecret) {
  throw new Error("Missing REVENUECAT_WEBHOOK_SECRET");
}

// Edge Function から DB を直接読み書きするための「管理用クライアント」。
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// REVENUECAT_WEBHOOK_SECRET をもとに HMAC-SHA256 キーを作り、crypto.subtle.sign("HMAC", key, body) で HMAC を計算。リクエストヘッダーの x-revenuecat-signature と一致するかチェック。
const verifySignature = async (
  body: string,
  signature: string | null
): Promise<boolean> => {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return signature === computed;
};

const nowIso = () => new Date().toISOString();

// Supabase側のデータに変換した時の型
type SubscriptionState =
  | {
      status: "trial" | "active" | "canceled" | "expired";
      trialEndsAt: string | null;
      cancelAtPeriodEnd: boolean;
      currentPeriodEnd: string | null;
    }
  | { status: "unsupported" };

// RevenueCatから送られてきた各イベントごとのロジック
const mapStatus = (
  event: RevenueCatEvent,
  hadAccountBefore: boolean
): SubscriptionState => {
  const expiration = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null;
  const isTrialPeriod = event.period_type === "TRIAL" && !hadAccountBefore;

  switch (event.type) {
    case "INITIAL_PURCHASE":
      return {
        status: isTrialPeriod ? "trial" : "active",
        trialEndsAt: isTrialPeriod ? expiration : null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: expiration,
      };
    case "RENEWAL":
      return {
        status: "active",
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: expiration,
      };
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
      return {
        status: "active",
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: expiration,
      };
    case "CANCELLATION":
      return {
        status: "active",
        trialEndsAt: null,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: expiration,
      };
    case "EXPIRATION":
      return {
        status: "canceled",
        trialEndsAt: null,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: expiration,
      };
    case "BILLING_ISSUE":
      return {
        status: "active",
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: expiration,
      };
    default:
      return { status: "unsupported" };
  }
};

// メインハンドラー
serve(async (req: Request) => {
  const bodyText = await req.text();
  const signature = req.headers.get(REVENUECAT_SIGNATURE_HEADER);

  const valid = await verifySignature(bodyText, signature);
  if (!valid) {
    return new Response("invalid signature", { status: 401 });
  }

  let payload: RevenueCatPayload | null = null;
  try {
    payload = JSON.parse(bodyText) as RevenueCatPayload;
  } catch (error) {
    return new Response("invalid json", { status: 400 });
  }

  const appUserId =
    payload?.event?.app_user_id ?? payload?.event?.original_app_user_id;
  if (!appUserId) {
    return new Response("missing app_user_id", { status: 400 });
  }

  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("had_account_before")
    .eq("id", appUserId)
    .maybeSingle();

  const { data: existingSubscription } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", appUserId)
    .maybeSingle();

  const hadAccountBefore = existingUser?.had_account_before ?? false;
  const subscriptionState = mapStatus(payload.event, hadAccountBefore);
  if (subscriptionState.status === "unsupported") {
    console.warn("unsupported revenuecat event type", payload.event.type);
    return new Response("unsupported event type", { status: 422 });
  }

  const currentPeriodEnd = subscriptionState.currentPeriodEnd ?? null;
  const subscriptionId = existingSubscription?.id ?? crypto.randomUUID();

  const upsertResult = await supabaseAdmin.from("subscriptions").upsert(
    {
      id: subscriptionId,
      user_id: appUserId,
      plan: "standard",
      status: subscriptionState.status as
        | "trial"
        | "active"
        | "canceled"
        | "expired",
      trial_ends_at: subscriptionState.trialEndsAt,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: subscriptionState.cancelAtPeriodEnd,
      updated_at: nowIso(),
    },
    { onConflict: "user_id" }
  );

  if (upsertResult.error) {
    console.error("subscriptions upsert error", upsertResult.error.message);
    return new Response("failed to upsert subscription", { status: 500 });
  }

  // had_account_before を true にして再サインアップ無料を無効化
  // is_canceled は CANCELLATION/EXPIRATION で true, それ以外は false
  const shouldMarkCanceled =
    payload.event.type === "CANCELLATION" ||
    payload.event.type === "EXPIRATION";

  const userUpdate = await supabaseAdmin
    .from("users")
    .update({
      had_account_before: true,
      is_canceled: shouldMarkCanceled ? true : false,
      updated_at: nowIso(),
    })
    .eq("id", appUserId)
    .select("id");

  if (userUpdate.error || !userUpdate.data?.length) {
    console.error(
      "users update error",
      userUpdate.error?.message ?? "no rows updated"
    );
    return new Response("failed to update user flags", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
