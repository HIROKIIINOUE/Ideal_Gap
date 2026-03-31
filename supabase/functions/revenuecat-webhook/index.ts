/// <reference path="../deno-stubs.d.ts" />
/* eslint-env deno */
/* eslint-disable import/no-unresolved */
// RevenueCat Webhook → Supabase subscriptions/users 更新
// 要件 2-2-3, 2-2-4 に基づき、署名検証後にサブスク状態を upsert する
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { z } from "https://esm.sh/zod@4.1.13";

// RevenueCat から飛んでくる JSON のうち、使う部分だけ型定義 + バリデーション
// v4 では unknown keys を許容する場合は looseObject を使う
const revenueCatEventSchema = z.looseObject({
  type: z.string(),
  app_user_id: z.string().nullable().optional(),
  original_app_user_id: z.string().nullable().optional(),
  expiration_at_ms: z.number().nullable().optional(),
  cancellation_reason: z.string().nullable().optional(),
  period_type: z.string().nullable().optional(), // TRIAL / NORMAL / INTRO
});

// 以下のlooseObject()を指定することで、上記のキーのみ型チェックし、その他のキーは自動で通過してparsed.dataに入る
const revenueCatPayloadSchema = z.looseObject({
  event: revenueCatEventSchema.optional(),
});

type RevenueCatPayload = z.infer<typeof revenueCatPayloadSchema>;
type RevenueCatEvent = z.infer<typeof revenueCatEventSchema>;

const REVENUECAT_SIGNATURE_HEADER = "x-revenuecat-signature";
const AUTHORIZATION_HEADER = "authorization";

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

// 旧方式互換: REVENUECAT_WEBHOOK_SECRET をもとに HMAC-SHA256 を計算し、x-revenuecat-signature と一致するかチェック。
const verifyLegacySignature = async (
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

// 現行方式: RevenueCatのAuthorizationヘッダー値（または Bearer 形式）を検証する
const verifyAuthorization = (authorization: string | null): boolean => {
  if (!authorization) return false;
  const normalized = authorization.trim();
  return (
    normalized === webhookSecret || normalized === `Bearer ${webhookSecret}`
  );
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
  const authorization = req.headers.get(AUTHORIZATION_HEADER);
  const signature = req.headers.get(REVENUECAT_SIGNATURE_HEADER);

  const valid =
    verifyAuthorization(authorization) ||
    (await verifyLegacySignature(bodyText, signature));
  if (!valid) {
    return new Response("unauthorized webhook", { status: 401 });
  }

  let payload: RevenueCatPayload | null = null;
  try {
    const parsed = revenueCatPayloadSchema.safeParse(JSON.parse(bodyText));
    if (!parsed.success) {
      return new Response("invalid json", { status: 400 });
    }
    payload = parsed.data;
  } catch (error) {
    return new Response("invalid json", { status: 400 });
  }

  const event = payload.event;
  if (!event) {
    return new Response("missing app_user_id", { status: 400 });
  }
  if (event.type === "TEST") {
    return new Response("ok", { status: 200 });
  }
  const appUserId = event.app_user_id ?? event.original_app_user_id;
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
  const subscriptionState = mapStatus(event, hadAccountBefore);
  if (subscriptionState.status === "unsupported") {
    console.warn("unsupported revenuecat event type", event.type);
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
    event.type === "CANCELLATION" || event.type === "EXPIRATION";

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
