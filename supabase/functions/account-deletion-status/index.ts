// サインアップ時にユーザが既にアカウント削除済みかどうか(以前アカウントを持っていたかどうか)を確認するedge function
// deleted_accountsテーブルにデータがある場合は再サインアップと判断し、userテーブル作成時にuser.had_account_before=trueで作成するために{had_account_before: true}を返す。『データがない場合はhad_account_before=false}を返す
// これは無料トライアルの再利用を防ぐため

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

  const email = authData.user.email?.trim();
  if (!email) {
    return new Response("email is required", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const emailHash = await createAccountEmailHash(email, hashSecret);
  const { data, error } = await supabaseAdmin
    .from("deleted_accounts")
    .select("had_account_before")
    .eq("email_hash", emailHash)
    .maybeSingle();

  if (error) {
    console.error("failed to fetch deleted account status", error.message);
    return new Response("failed to fetch deleted account status", {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(
    JSON.stringify({
      hadAccountBefore: data?.had_account_before ?? false,
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
