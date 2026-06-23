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
  addSentryBreadcrumb,
  captureExpoAudioError,
  initSentry,
  SentryErrorBoundary,
} from "../lib/sentry";
import {
  getAccessStateForUser,
} from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";
import { loadPersistedTaskTimerSession } from "../lib/taskTimerSession";
import { FocusMusicProvider } from "../providers/FocusMusicProvider";
import { FunPlanProvider } from "../providers/FunPlanProvider";
import { LanguageProvider } from "../providers/LanguageProvider";
import { OfflineProvider } from "../providers/OfflineProvider";
import { RevenueCatProvider } from "../providers/RevenueCatProvider";
import { TimerAlarmPreferenceProvider } from "../providers/TimerAlarmPreferenceProvider";

SplashScreen.preventAutoHideAsync();
initSentry();

//【JWT】メールリンク/ディープリンク経由でアプリに帰ってきた時、
// URLの＃以降からトークン(access_tokenとrefresh_token)を抽出するロジック。両方とも揃ってなければnullを返す。
// どちらのトークンもメール内リンククリック時に生成される。
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

const MIN_SPLASH_DURATION_MS = 600;  // スプラッシュ画面の最短表示時間を調整

type RestoredSession = Awaited<ReturnType<typeof restoreSession>>["session"];


// ====↓初回起動時の画面遷移が処理済みかどうかを記録する↓====
//  handled: true の場合は初回遷移済みの状態
type InitialNavigationState =
  | {
    handled: false;
  }
  | {
    handled: true;
    source: "initial_url" | "session_route" | "no_route";
    destination: string | null;
  };

// 「初回遷移を処理済みなら、あとから別ルートへ router.replace() しない」ための記録
let initialNavigationState: InitialNavigationState = { handled: false };

export const resetRootLayoutInitialNavigationStateForTests = () => {
  initialNavigationState = { handled: false };
};
// ====↑ここまで記録↑====



export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  // 音楽再生についてのルール設定
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false, // 音楽再生時のみ再生処理の関数内でtrueに置き換えている
      interruptionMode: "doNotMix",
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    }).catch((error) => {
      console.warn("Failed to set audio mode", error);
      captureExpoAudioError(error, "set_audio_mode");
    });
  }, []);

  useEffect(() => {
    let active = true;
    const waitForNextFrame = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    //　スプラッシュ画面表示時間の操作
    const finishBootstrap = (remaining: number) => {
      setTimeout(() => {
        if (!active) return;
        setShowSplash(false);
        SplashScreen.hideAsync().catch(() => { });
      }, remaining);
    };

    // 既にユーザ端末にあるセッションとSupabase情報を見て起動直後の遷移先を決める処理
    const resolveInitialRouteForSession = async (restoredSession?: RestoredSession) => {
      // ・サインアップ時はSupabase client がsessionをAsyncStorage(ローカル端末)に保存 → 同ファイルの supabase.auth.setSession()
      // ・ログイン時はlib/auth.ts内のsignInWithEmailPassword()によってSupabase client がsessionをAsyncStorage(端末)に保存
      // ・そしてここでSupabase client がAsyncStorage(ローカル端末)から保存済み session を復元する、sessionが切れていればリフレッシュする → await supabase.auth.getSession()。 (lib/supabaseClient.tsに書いてあるが本PJはsupabase.auth.getSessionではローカル端末のセッション情報を取得する設定となっている)
      const sessionResult = restoredSession
        ? { data: { session: restoredSession }, error: null }
        : await supabase.auth.getSession();
      const userId = sessionResult.data.session?.user?.id;
      if (sessionResult.error && !userId) {
        addSentryBreadcrumb("navigation.bootstrap", "initial_route_skipped", {
          hasError: true,
          reason: "session_error",
        });
        return;
      }
      if (!userId) {
        initialNavigationState = {
          handled: true,
          source: "no_route",
          destination: null,
        };
        addSentryBreadcrumb("navigation.bootstrap", "initial_route_skipped", {
          hasError: false,
          reason: "missing_user",
        });
        return;
      }


      // Supabase DB に反映済みのアクセス権情報を取得(RevenueCat経由ではないので注意)
      const accessState = await getAccessStateForUser(userId);
      // アプリ復帰時にタスクタイマーが正常に起動中ならタスクタイマーへ遷移させる
      const persistedTaskTimer = accessState.canAccessApp
        ? await loadPersistedTaskTimerSession()
        : null;
      const destination =
        !accessState.canAccessApp
          ? "/purchases"
          : persistedTaskTimer
            ? "/task-timer"
            : "/dashboard";
      addSentryBreadcrumb("navigation.bootstrap", "initial_route_resolved", {
        canAccessApp: accessState.canAccessApp,
        destination,
        hasPersistedTaskTimer: Boolean(persistedTaskTimer),
        resolution: accessState.resolution,
        userId,
      });
      initialNavigationState = {
        handled: true,
        source: "session_route",
        destination,
      };
      router.replace(destination);
      // router.replaceの反映を1フレーム待ってからスプラッシュを隠す
      await waitForNextFrame();
    };

    // 「ディープリンクでアプリが開かれたときの初期処理全体」
    // サインアップリンク：Supabaseによって発行されたトークンをユーザ端末のAsyncStorageにローカル保存する処理
    // 　　　　　　　　　　またサインアップ時のsubscriptionデータも確実に作成する
    // 購入リンク　　　　：購入画面へ遷移させる
    // アドレス変更リンク：該当の画面へ遷移
    const handleUrl = async (url: string): Promise<boolean> => {
      const tokens = parseTokensFromUrl(url);
      if (tokens) {
        const { error } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });
        if (error) {
          console.warn("Failed to set Supabase session from deep link", error.message);
          return false;
        }
      }

      // URLを解析し必要に応じて’購入画面(purchases.tsx)へ遷移させる
      if (isPurchasePath(url)) {
        const signupQuery = getSignupQuery(url);
        initialNavigationState = {
          handled: true,
          source: "initial_url",
          destination: `/purchases${signupQuery}`,
        };
        router.replace(`/purchases${signupQuery}`);
        return true;
      }

      // メールアドレス変更ページかどうかを確認
      const authCallbackTarget = resolveAuthCallbackTarget(url);
      if (authCallbackTarget) {
        initialNavigationState = {
          handled: true,
          source: "initial_url",
          destination: authCallbackTarget,
        };
        router.replace(authCallbackTarget);
        return true;
      }
      return false;
    };

    const bootstrap = async () => {
      const start = Date.now();
      // アプリ起動時にディープリンクが渡されているかどうかを確認するためのinitialUrl
      const initialUrl = await Linking.getInitialURL();
      let isRoutedByInitialUrl = false;
      if (initialUrl) {
        // ここでディープリンク解析
        isRoutedByInitialUrl = await handleUrl(initialUrl);
      }
      // 「端末に保存済み session があれば読んで使える状態にしておく」
      const restored = await restoreSession();
      // URLで遷移先が決まっていなければ、session ベースで初期画面を決める
      // 遷移先の例 「課金アクセス不可→/purchases」「タイマー作動中→/task-timer」「通常ログイン済み→/dashboard」
      if (!isRoutedByInitialUrl && !initialNavigationState.handled) {
        await resolveInitialRouteForSession(restored.session);
      } else if (initialNavigationState.handled) {
        // 既に別ルートで初回遷移が決まっている場合はrouter.replace()をさせない、ログだけ残す形
        // → そうすることで非同期処理が起因の「 /purchases に飛ばしたのに、その直後に /dashboard へ上書き遷移する」のような事故を防ぐ
        addSentryBreadcrumb("navigation.bootstrap", "initial_route_replace_skipped", {
          destination: initialNavigationState.destination,
          source: initialNavigationState.source,
        });
      }
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_SPLASH_DURATION_MS - elapsed);
      finishBootstrap(remaining);
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
              <TimerAlarmPreferenceProvider>
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
              </TimerAlarmPreferenceProvider>
            </FunPlanProvider>
          </OfflineProvider>
        </LanguageProvider>
      </I18nextProvider>
    </SentryErrorBoundary>
  );
}
