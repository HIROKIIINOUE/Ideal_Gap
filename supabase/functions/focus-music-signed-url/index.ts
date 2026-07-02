// Edge Function本体のファイル
//「npx supabase functions deploy focus-music-signed-url」コマンドを実行することで
// supabase上で edge function が作成/実行される。（関数名は本ディレクトリ名のfocus-music-signed-url）

// ★★★このファイルの役目★★★ (理解度△)
// →→アプリ側での呼び出し時に渡す trackId を使ってサーバー側で該当する音源のパスを特定し、そのパスの signed URL を生成して返している」

/// <reference path="../deno-stubs.d.ts" />
/* eslint-env deno */
/* eslint-disable import/no-unresolved */
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { z } from "zod";
import { createR2PresignedGetUrl } from "../_shared/r2Presign.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  trackId: z.string().min(1),
});

type RequestPayload = z.infer<typeof requestSchema>;

//　下記のenvファイルはSupabaseのPJ内に設定された環境変数から読み込む。(edge functionsとしてSupbase上で呼び出されて時)
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const defaultBucket = Deno.env.get("FOCUS_MUSIC_BUCKET") ?? "focus_music";
const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
const r2AccountId = Deno.env.get("R2_ACCOUNT_ID");
const r2AccountEndpoint =
  Deno.env.get("R2_S3_ENDPOINT") ??
  (r2AccountId
    ? `https://${r2AccountId}.r2.cloudflarestorage.com`
    : undefined);

if (
  !supabaseUrl ||
  !supabaseServiceRoleKey ||
  !r2AccessKeyId ||
  !r2SecretAccessKey ||
  !r2AccountEndpoint
) {
  throw new Error(
    "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, or R2_ACCOUNT_ID/R2_S3_ENDPOINT",
  );
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const normalizeStoragePath = (value: string) =>
  value.replace(/^(\.\/|\/)+/, "");

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
  if (authError || !authData?.user) {
    return new Response("unauthorized", { status: 401, headers: corsHeaders });
  }

  // アプリ側でedge functionを呼び出しているsignedUrl内でbodyとして飛ばした引数をココで読み取る
  let payload: RequestPayload;
  try {
    payload = requestSchema.parse(await req.json());
  } catch (error) {
    return new Response("invalid payload", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { data: track } = await supabaseAdmin
    .from("focus_music_tracks")
    .select("bucket, storage_path")
    .eq("id", payload.trackId)
    .maybeSingle();

  if (!track?.storage_path) {
    return new Response("not found", { status: 404, headers: corsHeaders });
  }

  const bucket = track.bucket ?? defaultBucket;
  const storagePath = normalizeStoragePath(track.storage_path);
  if (!storagePath) {
    return new Response("not found", { status: 404, headers: corsHeaders });
  }

  let signedUrl: string;
  try {
    signedUrl = await createR2PresignedGetUrl({
      accountEndpoint: r2AccountEndpoint,
      bucket,
      objectKey: storagePath,
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
      expiresInSeconds: 60 * 30,
    });
  } catch (_error) {
    return new Response("failed to sign url", {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(
    JSON.stringify({ url: signedUrl, expiresIn: 60 * 30 }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    },
  );
});
