// スプラッシュ画面のため
// ユーザ情報が取得でき次第スプラッシュ画面を消すためにここでセッション取得を実行

import { supabase } from "./supabaseClient";

export const restoreSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session ?? null, error };
};
