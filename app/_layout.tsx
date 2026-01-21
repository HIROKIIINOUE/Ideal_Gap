//アプリがリンク付きで開かれたとき、そのURLを解析して「Supabase ログイン状態を作る」「購入画面へ飛ばす」処理を実行

import * as Linking from "expo-linking";
import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import { ensureSignupAwaitSubscription } from "../lib/subscription";
import { supabase } from "../lib/supabaseClient";
import { LanguageProvider } from "../providers/LanguageProvider";
import { FunPlanProvider } from "../providers/FunPlanProvider";
import { RevenueCatProvider } from "../providers/RevenueCatProvider";
import { FocusMusicProvider } from "../providers/FocusMusicProvider";


//　URLの＃以降からトークン(access_tokenとrefresh_token)を抽出するロジック。両方とも揃ってなければnullを返す。
const parseTokensFromUrl = (url: string) => {
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return null;
  const fragment = url.slice(hashIndex + 1);
  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
};

// URLでパスを解析しpurchasesまたはpurchaseで始まっていると「購入関連のパス」と判断しtrueを返す。
const isPurchasePath = (url: string) => {
  const parsed = Linking.parse(url);
  const rawPath = (parsed.path ?? parsed.hostname ?? "").replace(/^\/+/, "");
  return rawPath.startsWith("purchases");
};

//　URLのクエリにsignup+1があれば"?signup+1"を返す。
//　購入画面へリダイレクトする時サインアップ状態のフラグを引き継ぐため
const getSignupQuery = (url: string) => {
  const parsed = Linking.parse(url);
  const signup = parsed.queryParams?.signup;
  return signup ? "?signup=1" : "";
};

//ディープリンクの監視
export default function RootLayout() {
  useEffect(() => {
    let handledInitial = false;

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

    //　バックグランド復帰や外部リンクから戻った際のURLを監視
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
