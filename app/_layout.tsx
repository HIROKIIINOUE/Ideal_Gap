//アプリの根幹となるページ。各条件を並べ条件ごとにどのページへ遷移させるかを操作している。
//アプリがリンク付きで開かれたとき、そのURLを解析して「Supabase ログイン状態を作る」「購入画面へ飛ばす」などの処理を実行

import { setAudioModeAsync } from "expo-audio";
import * as Linking from "expo-linking";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { Platform } from "react-native";
import OfflineBanner from "../components/OfflineBanner";
import SplashOverlay from "../components/SplashOverlay";
import { colors } from "../constants/theme";
import i18n from "../i18n";
import { restoreSession } from "../lib/authBootstrap";
import { getNormalizedLinkPath, resolveAuthCallbackTarget } from "../lib/authCallbackRouting";
import { parseAuthTokensFromUrl } from "../lib/deepLink";
import {
  captureExpoAudioError,
  initSentry,
  SentryErrorBoundary,
} from "../lib/sentry";
import { ensureSignupAwaitSubscription } from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";
import { FocusMusicProvider } from "../providers/FocusMusicProvider";
import { FunPlanProvider } from "../providers/FunPlanProvider";
import { LanguageProvider } from "../providers/LanguageProvider";
import { OfflineProvider } from "../providers/OfflineProvider";
import { RevenueCatProvider } from "../providers/RevenueCatProvider";

SplashScreen.preventAutoHideAsync();
initSentry();

//　URLの＃以降からトークン(access_tokenとrefresh_token)を抽出するロジック。両方とも揃ってなければnullを返す。
// access_token: 認証済みユーザであることを示すJWT(APIアクセス時に使う)
// refresh_token: access_token が切れたときに 新しいセッション/トークンを再取得するためのトークン
// どちらのトークンもサイン後のマジックリンク(メール内のURL)クリック時に生成される。
const parseTokensFromUrl = (url: string) =>
  parseAuthTokensFromUrl(url, { disallowTypes: ["recovery"] });

// URLでパスを解析しpurchasesまたはpurchaseで始まっていると「購入関連のパス」と判断しtrueを返す。
const isPurchasePath = (url: string) => {
  return getNormalizedLinkPath(url).startsWith("purchases");
};

//　URLのクエリに「signup」があれば"?signup+1"を返す。
//　「サインアップ直後の購入フロー」かどうかを判定し、購入画面へリダイレクトする時サインアップ状態のフラグを引き継ぐため
const getSignupQuery = (url: string) => {
  const parsed = Linking.parse(url);
  const signup = parsed.queryParams?.signup;
  return signup ? "?signup=1" : "";
};

const MIN_SPLASH_DURATION_MS = 1500;  // スプラッシュ画面の最短表示時間を調整

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  // 音楽再生についてのルール設定
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    }).catch((error) => {
      console.warn("Failed to set audio mode", error);
      captureExpoAudioError(error, "set_audio_mode");
    });
  }, []);

  useEffect(() => {
    let active = true;
    // Supabaseによって発行されたトークンをユーザ端末のAsyncStorageにローカル保存する処理
    // また同時にsubscription行も確実に作成する
    const handleUrl = async (url: string) => {
      const tokens = parseTokensFromUrl(url);
      if (tokens) {
        const { error } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });
        if (error) {
          console.warn("Failed to set Supabase session from deep link", error.message);
          return;
        }
        // ディープリンク経由でのサインアップ完了時に subscription行を確実に作成
        const session = await supabase.auth.getSession();
        const uid = session.data.session?.user?.id;
        if (uid) {
          try {
            await ensureSignupAwaitSubscription(uid);
          } catch (err) {
            console.warn("Failed to ensure subscription after deep link", err);
          }
        }
      }

      // URLを解析し必要に応じて’購入画面(purchases.tsx)へ遷移させる
      if (isPurchasePath(url)) {
        const signupQuery = getSignupQuery(url);
        router.replace(`/purchases${signupQuery}`);
        return;
      }

      // メールアドレス変更ページかどうかを確認
      const authCallbackTarget = resolveAuthCallbackTarget(url);
      if (authCallbackTarget) {
        router.replace(authCallbackTarget);
      }
    };

    const bootstrap = async () => {
      const start = Date.now();
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleUrl(initialUrl);
      }
      await restoreSession();
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_SPLASH_DURATION_MS - elapsed);
      setTimeout(() => {
        if (!active) return;
        setShowSplash(false);
        SplashScreen.hideAsync().catch(() => { });
      }, remaining);
    };

    bootstrap().catch((error) => {
      console.warn("Failed to bootstrap app", error);
      setShowSplash(false);
      SplashScreen.hideAsync().catch(() => { });
    });

    //　「アプリが起動中に新しいURLが渡ってきた」タイミングで発火。今回は「アプリ起動後に入ってきたディープリンク」を拾う役割
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url).catch((error) => {
        console.warn("Failed to handle deep link", error);
      });
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return (
    <SentryErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <OfflineProvider>
            <FunPlanProvider>
              <FocusMusicProvider>
                <RevenueCatProvider>
                  {/* ここで共通ヘッダー(safe area)を指定できる */}
                  <Stack
                    screenOptions={{
                      contentStyle: { backgroundColor: colors.surface },
                      headerStyle: { backgroundColor: colors.surface },
                      headerTintColor: colors.textPrimary,
                      headerTitleStyle: {
                        color: colors.textPrimary,
                        fontSize: 18,
                        fontFamily: Platform.select({
                          ios: "Georgia-Italic",
                          android: "serif",
                          default: undefined,
                        }),
                      },
                      headerShadowVisible: false,
                    }}
                  />
                  <OfflineBanner />
                  <SplashOverlay visible={showSplash} />
                </RevenueCatProvider>
              </FocusMusicProvider>
            </FunPlanProvider>
          </OfflineProvider>
        </LanguageProvider>
      </I18nextProvider>
    </SentryErrorBoundary>
  );
}
