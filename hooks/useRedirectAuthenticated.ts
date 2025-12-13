// ログインユーザを強制的にダッシュボードに遷移させるロジック。
//  → ログインユーザは「ホーム画面・サインアップ画面・ログイン画面・パス変更画面・決済画面」にはアクセスできない
import { router } from "expo-router";
import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export const useRedirectAuthenticated = () => {
  useEffect(() => {
    let active = true;

    const redirectToDashboard = () => {
      if (active) {
        router.replace("/dashboard");
      }
    };

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) return;
      redirectToDashboard();
    };

    checkSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        redirectToDashboard();
      }
    });

    return () => {
      active = false;
      data?.subscription?.unsubscribe();
    };
  }, []);
};
