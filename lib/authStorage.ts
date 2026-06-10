// 端末ローカルに残ってしまった Supabase の認証セッション関連データを強制的に消す処理をまとめたファイル(フォールバック用)
import AsyncStorage from "@react-native-async-storage/async-storage";

//  AsyncStorage に保存されているはずのキー名を計算する「削除対象キー名の解決関数」
const resolveAuthStorageKey = () => {
  try {
    const { env } = require("./env") as typeof import("./env");
    const hostname = new URL(env.supabaseUrl).hostname;
    return `sb-${hostname.split(".")[0]}-auth-token`;
  } catch {
    return null;
  }
};

// ユーザ端末ローカルに保存されたSupabase Auth セッション関連情報を削除する
export const clearPersistedAuthSession = async () => {
  const storageKey = resolveAuthStorageKey();
  const keys = new Set([
    "supabase.auth.token",
    "supabase.auth.token-code-verifier",
    "supabase.auth.token-user",
  ]);

  if (storageKey) {
    keys.add(storageKey);
    keys.add(`${storageKey}-code-verifier`);
    keys.add(`${storageKey}-user`);
  }

  await AsyncStorage.multiRemove([...keys]);
};
