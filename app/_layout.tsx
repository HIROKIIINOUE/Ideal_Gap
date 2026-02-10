//アプリがリンク付きで開かれたとき、そのURLを解析して「Supabase ログイン状態を作る」「購入画面へ飛ばす」処理を実行

import { setAudioModeAsync } from "expo-audio";
import * as Linking from "expo-linking";
import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import { parseAuthTokensFromUrl } from "../lib/deepLink";
import { ensureSignupAwaitSubscription } from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";
import { FocusMusicProvider } from "../providers/FocusMusicProvider";
import { FunPlanProvider } from "../providers/FunPlanProvider";
import { LanguageProvider } from "../providers/LanguageProvider";
import { RevenueCatProvider } from "../providers/RevenueCatProvider";


//　URLの＃以降からトークン(access_tokenとrefresh_token)を抽出するロジック。両方とも揃ってなければnullを返す。
// access_token: 認証済みユーザであることを示すJWT(APIアクセス時に使う)
// refresh_token: access_token が切れたときに 新しいセッション/トークンを再取得するためのトークン
// どちらのトークンもサイン後のマジックリンク(メール内のURL)クリック時に生成される。
const parseTokensFromUrl = (url: string) =>
  parseAuthTokensFromUrl(url, { disallowTypes: ["recovery"] });

// URLでパスを解析しpurchasesまたはpurchaseで始まっていると「購入関連のパス」と判断しtrueを返す。
const isPurchasePath = (url: string) => {
  const parsed = Linking.parse(url);
  const rawPath = (parsed.path ?? parsed.hostname ?? "").replace(/^\/+/, "");
  return rawPath.startsWith("purchases");
};

//　URLのクエリに「signup」があれば"?signup+1"を返す。
//　「サインアップ直後の購入フロー」かどうかを判定し、購入画面へリダイレクトする時サインアップ状態のフラグを引き継ぐため
const getSignupQuery = (url: string) => {
  const parsed = Linking.parse(url);
  const signup = parsed.queryParams?.signup;
  return signup ? "?signup=1" : "";
};

export default function RootLayout() {
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
    });
  }, []);

  useEffect(() => {
    let handledInitial = false;


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
      }
    };

    // アプリ起動直後の初期URLを取得
    const processInitial = async () => {
      if (handledInitial) return;
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handledInitial = true;
        await handleUrl(initialUrl);
      }
    };

    processInitial();

    //　「アプリが起動中に新しいURLが渡ってきた」タイミングで発火。今回は「アプリ起動後に入ってきたディープリンク」を拾う役割
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url).catch((error) => {
        console.warn("Failed to handle deep link", error);
      });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <FunPlanProvider>
          <FocusMusicProvider>
            <RevenueCatProvider>
              <Stack />
            </RevenueCatProvider>
          </FocusMusicProvider>
        </FunPlanProvider>
      </LanguageProvider>
    </I18nextProvider>
  );
}
