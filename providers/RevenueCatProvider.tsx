// アプリ起動時にRevenueCat SDKを初期化しSupabase AuthのユーザとRevenueCatのApp Userを同期するためのプロバイダ

import { Session } from "@supabase/supabase-js";
import { ReactNode, useEffect } from "react";
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { AppPlatform, env, resolveRevenueCatApiKey } from "../lib/env";
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

  // ユーザが端末でアプリを起動した時に、Platform.OSで「端末がiosかAndroidか」をジャッジし、端末のOSに対応した環境変数へ導く
  useEffect(() => {
    const runtimePlatform =
      Platform.OS === "ios" || Platform.OS === "android"
        ? (Platform.OS as AppPlatform)
        : null;
    if (!runtimePlatform) {
      console.warn(`[RevenueCat] unsupported platform: ${Platform.OS}`);
      return;
    }

    let mounted = true;
    let appUserId: string | null = null;
    let configured = false;

    // Supabase Authサインイン時に開発or本番環境に応じてRevenueCatの設定を初期化
    const configurePurchases = async (
      initialAppUserId: string | null
    ): Promise<boolean> => {
      if (configured) return true;
      const rawKey = resolveRevenueCatApiKey(env.appEnv, runtimePlatform);
      if (!rawKey) {
        const keyPrefix =
          env.appEnv === "prod"
            ? "EXPO_PUBLIC_REVENUECAT_API_KEY_PROD"
            : "EXPO_PUBLIC_REVENUECAT_API_KEY_DEV";
        console.warn(
          `[RevenueCat] missing api key for ${runtimePlatform}. Set ${keyPrefix}_${runtimePlatform.toUpperCase()} or ${keyPrefix}.`
        );
        return false;
      }
      const maskedKey =
        rawKey.length > 10
          ? `${rawKey.slice(0, 6)}...${rawKey.slice(-4)}`
          : "***";
      console.log(
        `[RevenueCat] configure appEnv=${env.appEnv} platform=${runtimePlatform} key=${maskedKey} appUserId=${initialAppUserId ?? "anonymous"}`
      );
      Purchases.setLogLevel(env.appEnv === "prod" ? LOG_LEVEL.ERROR : LOG_LEVEL.DEBUG);
      await Purchases.configure({
        apiKey: rawKey,
        ...(initialAppUserId ? { appUserID: initialAppUserId } : {}),
      });
      configured = true;
      return true;
    };

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn("Failed to fetch session for RevenueCat", error.message);
        return;
      }
      if (!mounted) return;
      const initialAppUserId = data.session?.user?.id ?? null;
      const isReady = await configurePurchases(initialAppUserId);
      if (!isReady) return;
      appUserId = await syncAppUser(data.session ?? null, appUserId);
    };

    initialize().catch((error) => {
      console.warn("Failed to initialize RevenueCat", error);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextAppUserId = session?.user?.id ?? null;
      configurePurchases(nextAppUserId)
        .then((isReady) => {
          if (!isReady) return appUserId;
          return syncAppUser(session ?? null, appUserId);
        })
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
