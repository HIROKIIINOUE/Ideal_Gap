// アプリ起動時にRevenueCat SDKを初期化しSupabase AuthのユーザとRevenueCatのApp Userを同期するためのプロバイダ

import { Session } from "@supabase/supabase-js";
import { ReactNode, useEffect } from "react";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { env } from "../lib/env";
import { supabase } from "../lib/supabaseClient";

type Props = {
  children: ReactNode;
};

// Supabaseセッションからuser.idを取り出しRevenueCatのappUserIdと異なる場合はログイン/ログアウトを実行
const syncAppUser = async (session: Session | null, currentAppUserId: string | null) => {
  const nextAppUserId = session?.user?.id ?? null;
  if (nextAppUserId === currentAppUserId) return currentAppUserId;

  if (nextAppUserId) {
    await Purchases.logIn(nextAppUserId);
  } else {
    await Purchases.logOut();
  }

  return nextAppUserId;
};

export const RevenueCatProvider = ({ children }: Props) => {
  useEffect(() => {
    let mounted = true;
    let appUserId: string | null = null;
    let configured = false;

    // Supabase Authサインイン時に開発or本番環境に応じてRevenueCatの設定を初期化
    const configurePurchases = async (initialAppUserId: string | null) => {
      if (configured) return;
      Purchases.setLogLevel(env.appEnv === "prod" ? LOG_LEVEL.ERROR : LOG_LEVEL.DEBUG);
      await Purchases.configure({
        apiKey: env.revenueCatApiKey,
        ...(initialAppUserId ? { appUserID: initialAppUserId } : {}),
      });
      configured = true;
    };

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn("Failed to fetch session for RevenueCat", error.message);
        return;
      }
      if (!mounted) return;
      const initialAppUserId = data.session?.user?.id ?? null;
      await configurePurchases(initialAppUserId);
      appUserId = await syncAppUser(data.session ?? null, appUserId);
    };

    initialize().catch((error) => {
      console.warn("Failed to initialize RevenueCat", error);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextAppUserId = session?.user?.id ?? null;
      configurePurchases(nextAppUserId)
        .then(() => syncAppUser(session ?? null, appUserId))
        .then((updatedId) => {
          appUserId = updatedId;
        })
        .catch((error) => {
          console.warn("Failed to sync RevenueCat user", error);
        });
    });

    return () => {
      mounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
};

export default RevenueCatProvider;
