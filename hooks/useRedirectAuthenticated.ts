// ログインユーザを強制的にダッシュボードに遷移させるロジック。
//  → ログインユーザは「LP画面・サインアップ画面・ログイン画面・パス変更画面」にはアクセスできない
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { addSentryBreadcrumb } from "../lib/sentry";
import { getAccessStateForUser } from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";
import { loadPersistedTaskTimerSession } from "../lib/taskTimerSession";

type RedirectSource = "focus_check" | "auth_event";
type RedirectDestination = "/dashboard" | "/purchases" | "/task-timer";

const shouldRedirectForAuthEvent = (event: AuthChangeEvent) => {
  return event === "SIGNED_IN";
};

export const useRedirectAuthenticated = () => {
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const redirectForSession = async (
        userId: string,
        source: RedirectSource,
        event?: AuthChangeEvent,
      ) => {
        // ユーザのアプリへのアクセス権(課金、無料アクセス権の有無)を取得
        const accessState = await getAccessStateForUser(userId);
        let hasPersistedTaskTimer = false;
        let destination: RedirectDestination = "/purchases";

        // アプリ起動時にタスクタイマーが作動中ならタスクタイマーへ遷移する
        if (accessState.canAccessApp) {
          const persistedTaskTimer = await loadPersistedTaskTimerSession();
          hasPersistedTaskTimer = Boolean(persistedTaskTimer);
          destination = hasPersistedTaskTimer ? "/task-timer" : "/dashboard";
        }

        addSentryBreadcrumb("navigation.auth_redirect", "redirect_resolved", {
          accessMode: accessState.accessMode,
          destination,
          event: event ?? null,
          hasPersistedTaskTimer,
          source,
          userId,
        });

        if (active) {
          router.replace(destination);
        }
      };

      // supabaseからユーザ情報を取得
      const checkSession = async () => {
        const { data, error } = await supabase.auth.getSession();
        const userId = data.session?.user?.id;
        if (error || !userId) return;
        await redirectForSession(userId, "focus_check");
      };

      checkSession().catch((error) => {
        console.warn("Failed to check authenticated session", error);
      });

      // ログインが確定した瞬間(ログイン状態が変化した時)に、redirectForSessionを発火するための監視
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (!shouldRedirectForAuthEvent(event)) {
          addSentryBreadcrumb(
            "navigation.auth_redirect",
            "auth_event_skipped",
            {
              event,
            },
          );
          return;
        }

        const userId = session?.user?.id;
        if (userId) {
          redirectForSession(userId, "auth_event", event).catch((error) => {
            console.warn("Failed to resolve redirect destination", error);
          });
        }
      });

      return () => {
        active = false;
        data?.subscription?.unsubscribe();
      };
    }, []),
  );
};
