// signed URL の生成
// 特定のタスク集中音楽のIDを受け取りEdge Functionを発火、該当の音楽をインストールする用のチケット「signed URL」をurlとして返す。

import { supabase } from "../supabaseClient";
import { FOCUS_MUSIC_SIGNED_URL_FUNCTION } from "./constants";

export const createFocusMusicSignedUrl = async (
  trackId: string,
): Promise<string> => {
  // アプリからSupabaseにデプロイされたEdge Functionを呼ぶ
  const { data, error } = await supabase.functions.invoke(
    FOCUS_MUSIC_SIGNED_URL_FUNCTION,
    {
      body: { trackId },
    },
  );

  if (error) {
    throw error;
  }

  const url = (data as { url?: string } | null)?.url;
  if (!url) {
    throw new Error("Missing signed url");
  }

  return url; // signed URL
};
