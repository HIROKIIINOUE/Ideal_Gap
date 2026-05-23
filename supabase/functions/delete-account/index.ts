// アカウント完全削除のedge function

// アカウント削除処理はsupabase上のedge function (関数名delete-account)で行う。
// 理由:DBアクセスをセキュアに守るため、処理がサーバで完結するため(中途半端な処理で止まりにくい)
// 1, 削除するアカウントをDBのdeleted_accountsテーブルに追加(既存なら更新)→無料トライアル再利用の予防
//    → ユーザのメアドを(Supabase上のSecretKeyで)ハッシュ化して保存するためプライバシーポリシーは大丈夫
// 2, DBより該当のuser,subscriptionその他全ての紐づくデータを削除
// 3, Supabase Authより該当のユーザ情報を削除

/// <reference path="../deno-stubs.d.ts" />
/* eslint-env deno */
/* eslint-disable import/no-unresolved */
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createAccountEmailHash } from "../_shared/accountHash.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const hashSecret = Deno.env.get("ACCOUNT_DELETION_HASH_SECRET");

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

if (!hashSecret) {
  throw new Error("Missing ACCOUNT_DELETION_HASH_SECRET");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const getBearerToken = (req: Request) => {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  return header.replace("Bearer ", "");
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const token = getBearerToken(req);
  if (!token) {
    return new Response("unauthorized", { status: 401, headers: corsHeaders });
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return new Response("unauthorized", { status: 401, headers: corsHeaders });
  }

  const userId = authData.user.id;
  const fallbackEmail = authData.user.email?.trim() ?? "";
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("email, had_account_before")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("failed to load user profile", profileError.message);
    return new Response("failed to load profile", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const email = (profile?.email ?? fallbackEmail).trim();
  if (!email) {
    return new Response("email is required", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const emailHash = await createAccountEmailHash(email, hashSecret);
  const { error: deleteDataError } = await supabaseAdmin.rpc(
    "delete_account_data",
    {
      p_user_id: userId,
      p_email_hash: emailHash,
      p_had_account_before: profile?.had_account_before ?? true,
    },
  );

  if (deleteDataError) {
    console.error("failed to delete account data", deleteDataError.message);
    return new Response("failed to delete account data", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const { error: deleteAuthError } =
    await supabaseAdmin.auth.admin.deleteUser(userId);

  if (deleteAuthError) {
    console.error("failed to delete auth user", deleteAuthError.message);
    return new Response("failed to delete auth user", {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(
    JSON.stringify({
      deletedAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
});
