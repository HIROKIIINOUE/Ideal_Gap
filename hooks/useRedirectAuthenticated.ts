// ログインユーザを強制的にダッシュボードに遷移させるロジック。
//  → ログインユーザは「LP画面・サインアップ画面・ログイン画面・パス変更画面」にはアクセスできない
import { router } from "expo-router";
import { useEffect } from "react";
import { canAccessDashboardWithSubscriptionStatus, getSubscriptionForUser } from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";

export const useRedirectAuthenticated = () => {
  useEffect(() => {
    let active = true;

    const redirectForSession = async (userId: string) => {
      const subscription = await getSubscriptionForUser(userId);
      const destination = canAccessDashboardWithSubscriptionStatus(subscription?.status)
        ? "/dashboard"
        : "/purchases";
      if (active) {
        router.replace(destination);
      }
    };

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (error || !userId) return;
      await redirectForSession(userId);
    };

    checkSession();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id;
      if (userId) {
        redirectForSession(userId).catch((error) => {
          console.warn("Failed to resolve redirect destination", error);
        });
      }
    });

    return () => {
      active = false;
      data?.subscription?.unsubscribe();
    };
  }, []);
};
